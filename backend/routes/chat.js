// backend/routes/chat.js — robust notifications on every message + VC
const express      = require('express');
const router       = express.Router();
const mongoose     = require('mongoose');
const { protect }  = require('../middleware/auth');
const User         = require('../models/User');
const Notification = require('../models/Notification');

// ── Message model ─────────────────────────────────────────
const msgSchema = new mongoose.Schema({
  loanId:    { type: Number, required: true, index: true },
  from:      { type: String, required: true, lowercase: true },
  to:        { type: String, required: true, lowercase: true },
  text:      { type: String, required: true },
  read:      { type: Boolean, default: false },
  type:      { type: String, default: 'text', enum: ['text', 'vc_invite', 'system'] },
  createdAt: { type: Date, default: Date.now },
});
msgSchema.index({ loanId: 1, from: 1, to: 1, createdAt: 1 });
const Message = mongoose.models.Message || mongoose.model('Message', msgSchema);

// ── Helper: sender identifier ─────────────────────────────
function getAddr(req) {
  if (req.user?.walletAddress) return req.user.walletAddress.toLowerCase();
  if (req.user?._id) return `user_${req.user._id}`;
  return null;
}

// ── GET messages ──────────────────────────────────────────
router.get('/:loanId/:otherAddress', protect, async (req, res) => {
  try {
    const myAddr    = getAddr(req);
    const otherAddr = req.params.otherAddress?.toLowerCase();
    const loanId    = parseInt(req.params.loanId);

    if (!myAddr) return res.json({ success: true, messages: [] });

    const messages = await Message.find({
      loanId,
      $or: [
        { from: myAddr, to: otherAddr },
        { from: otherAddr, to: myAddr },
      ],
    }).sort({ createdAt: 1 }).limit(200);

    // Mark received messages as read (fire and forget)
    Message.updateMany(
      { loanId, from: otherAddr, to: myAddr, read: false },
      { $set: { read: true } }
    ).catch(() => {});

    res.json({ success: true, messages });
  } catch (e) {
    console.error('Chat GET:', e.message);
    res.json({ success: true, messages: [] });
  }
});

// ── SEND message — always sends notification ───────────────
router.post('/:loanId', protect, async (req, res) => {
  try {
    const myAddr = getAddr(req);
    const { to, text, loanId: bodyLoanId } = req.body;
    const loanId = parseInt(req.params.loanId || bodyLoanId);

    if (!myAddr) return res.status(400).json({ success: false, message: 'Link your wallet first' });
    if (!text?.trim()) return res.status(400).json({ success: false, message: 'Empty message' });
    if (!to) return res.status(400).json({ success: false, message: 'Recipient required' });

    const toAddr = to.toLowerCase();
    const isVC   = text.startsWith('__VC__:');

    const msg = await Message.create({
      loanId, from: myAddr, to: toAddr,
      text: text.trim(),
      type: isVC ? 'vc_invite' : 'text',
    });

    // ── Send notification (always, for every message) ──────
    const senderName = req.user?.name || myAddr.slice(0, 8) + '...';
    sendNotification(toAddr, {
      title:   isVC
        ? `📹 ${senderName} is calling you!`
        : `💬 New message from ${senderName}`,
      message: isVC
        ? `${senderName} started a video call on Loan #${loanId}. Open your chat to join!`
        : `${senderName}: "${text.trim().slice(0, 100)}${text.length > 100 ? '...' : ''}"`,
      type: isVC ? 'video_call' : 'chat_message',
    });

    res.status(201).json({ success: true, message: msg });
  } catch (e) {
    console.error('Chat POST:', e.message);
    res.status(500).json({ success: false, message: e.message });
  }
});

// ── VC notify endpoint ────────────────────────────────────
router.post('/vc-notify', protect, async (req, res) => {
  try {
    const { to, loanId, room, callerName } = req.body;
    const senderName = req.user?.name || callerName || 'Someone';
    await sendNotification(to?.toLowerCase(), {
      title:   `📹 Incoming Video Call from ${senderName}!`,
      message: `${senderName} wants to video call about Loan #${loanId}. Open your chat to join the call!`,
      type:    'video_call',
    });
    res.json({ success: true });
  } catch (e) {
    res.json({ success: true }); // never fail
  }
});

// ── AI chatbot ────────────────────────────────────────────
router.post('/ai', async (req, res) => {
  const { message } = req.body;
  if (!message?.trim()) return res.status(400).json({ success: false });
  const q = message.toLowerCase();
  const faq = [
    { k: ['how does equalfund work','what is equalfund','explain'], r: 'EqualFund is a decentralized P2P lending platform on Ethereum. Borrowers request loans and lenders fund them via smart contracts — no banks. Fee is 0.5% vs 18–36% from banks.' },
    { k: ['free eth','faucet','get eth'], r: 'Link your MetaMask wallet and EqualFund auto-sends 0.01 Sepolia ETH! More at sepoliafaucet.com.' },
    { k: ['credit score','score'], r: 'Score ranges 300–850. Increases +15 per repayment, +50 for KYC, +50 for account age.' },
    { k: ['create loan','apply','borrow'], r: 'Borrow → New Loan. Fill details, choose collateral (optional ETH), submit. Loan goes live on marketplace.' },
    { k: ['fund','invest','lend'], r: 'Marketplace → Fund any loan. Pay with ETH or INR. Your principal + interest returns when borrower repays.' },
    { k: ['collateral'], r: 'ETH collateral = lock 150% of loan amount. Protects lenders. Released on repayment, liquidated on default.' },
    { k: ['kyc','verify'], r: 'Upload ID — stored on IPFS permanently. Required to create loans. Adds +50 to credit score.' },
    { k: ['default','miss payment'], r: 'Default: credit score drops, account restricted, ETH collateral liquidated to lenders.' },
    { k: ['upi','inr','payment'], r: 'Pay in INR via Card/UPI/Netbanking in the Fund modal. Test card: 4111 1111 1111 1111 · 12/28 · 123.' },
    { k: ['chat','message'], r: 'Click Chat on any loan card to open a chat window with the other party. You can also start a video call from inside the chat.' },
    { k: ['video','call','vc'], r: 'Click Video Call inside the chat window. It opens Jitsi Meet embedded — no redirect, stays on EqualFund.' },
    { k: ['register','signup'], r: 'Login/Register → choose Borrower or Lender → enter details → connect MetaMask → get 0.01 ETH free!' },
    { k: ['metamask','wallet'], r: 'Install MetaMask, create wallet, switch to Sepolia testnet. EqualFund auto-switches you.' },
    { k: ['fraud','risk'], r: 'Each borrower gets a risk level: 🟢 Low / 🟡 Medium / 🔴 High. Based on account age, credit score, defaults.' },
  ];
  for (const item of faq) {
    if (item.k.some(k => q.includes(k))) return res.json({ success: true, reply: item.r });
  }
  res.json({ success: true, reply: "I'm not sure about that. Try checking the Marketplace, Profile, or KYC pages. For more help, contact support@equalfund.com 😊" });
});

// ── Unread count ──────────────────────────────────────────
router.get('/unread/count', protect, async (req, res) => {
  try {
    const myAddr = getAddr(req);
    if (!myAddr) return res.json({ success: true, count: 0 });
    const count = await Message.countDocuments({ to: myAddr, read: false });
    res.json({ success: true, count });
  } catch { res.json({ success: true, count: 0 }); }
});

// ── Helper: send notification by wallet address ───────────
async function sendNotification(walletAddress, { title, message, type }) {
  if (!walletAddress) return;
  try {
    // Try by walletAddress first
    let user = await User.findOne({ walletAddress: walletAddress.toLowerCase() });
    if (!user && walletAddress.startsWith('user_')) {
      user = await User.findById(walletAddress.replace('user_', ''));
    }
    if (!user) return;
    await Notification.create({ userId: user._id, title, message, type });
  } catch (e) {
    console.error('Notification error:', e.message);
  }
}

module.exports = router;
