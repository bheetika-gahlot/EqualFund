// backend/routes/chat.js
// FIX: works even when walletAddress is not linked — uses userId + walletAddress fallback
const express     = require('express');
const router      = express.Router();
const mongoose    = require('mongoose');
const { protect } = require('../middleware/auth');
const User        = require('../models/User');
const Notification = require('../models/Notification');

// ── Message Schema ────────────────────────────────────────
const msgSchema = new mongoose.Schema({
  loanId:    { type: Number, required: true, index: true },
  from:      { type: String, required: true, lowercase: true },
  to:        { type: String, required: true, lowercase: true },
  text:      { type: String, required: true },
  read:      { type: Boolean, default: false },
  type:      { type: String, default: 'text', enum: ['text', 'vc_invite', 'system'] },
  createdAt: { type: Date, default: Date.now },
});
msgSchema.index({ loanId: 1 });
const Message = mongoose.models.Message || mongoose.model('Message', msgSchema);

// ── Helper: get address from user (wallet OR userId string) ──
function getMyAddr(req) {
  // Primary: use linked wallet address
  if (req.user?.walletAddress) return req.user.walletAddress.toLowerCase();
  // Fallback: use user _id as identifier (for testing without wallet)
  if (req.user?._id) return `user_${req.user._id.toString().toLowerCase()}`;
  return null;
}

// ── GET messages between two users for a loan ─────────────
router.get('/:loanId/:otherAddress', protect, async (req, res) => {
  try {
    const myAddr    = getMyAddr(req);
    const otherAddr = req.params.otherAddress?.toLowerCase();
    const loanId    = parseInt(req.params.loanId);

    // !! FIX: return empty array instead of error if no wallet
    if (!myAddr) {
      return res.json({ success: true, messages: [] });
    }

    const messages = await Message.find({
      loanId,
      $or: [
        { from: myAddr, to: otherAddr },
        { from: otherAddr, to: myAddr },
      ],
    }).sort({ createdAt: 1 }).limit(200);

    // Mark as read (don't await — non-blocking)
    Message.updateMany(
      { loanId, from: otherAddr, to: myAddr, read: false },
      { $set: { read: true } }
    ).catch(() => {});

    res.json({ success: true, messages });
  } catch (e) {
    console.error('Chat GET error:', e.message);
    res.json({ success: true, messages: [] }); // never fail
  }
});

// ── SEND message ──────────────────────────────────────────
router.post('/:loanId', protect, async (req, res) => {
  try {
    const myAddr = getMyAddr(req);
    const { to, text, loanId: bodyLoanId } = req.body;
    const loanId = parseInt(req.params.loanId || bodyLoanId);

    if (!myAddr)       return res.status(400).json({ success: false, message: 'Please link your wallet first (Profile page)' });
    if (!text?.trim()) return res.status(400).json({ success: false, message: 'Message cannot be empty' });
    if (!to)           return res.status(400).json({ success: false, message: 'Recipient address required' });

    const toAddr  = to.toLowerCase();
    const isVC    = text.startsWith('__VC__:');
    const isLegacyVC = text.startsWith('📹 VIDEO_CALL_INVITE:');

    const msg = await Message.create({
      loanId,
      from: myAddr,
      to:   toAddr,
      text: text.trim(),
      type: (isVC || isLegacyVC) ? 'vc_invite' : 'text',
    });

    // Send notification to recipient (non-blocking)
    const senderName = req.user?.name || myAddr.slice(0, 8) + '...';
    User.findOne({ walletAddress: toAddr }).then(recipient => {
      if (!recipient) return;
      const isVcMsg = isVC || isLegacyVC;
      Notification.create({
        userId:  recipient._id,
        title:   isVcMsg ? `📹 ${senderName} is calling you!` : `💬 New message from ${senderName}`,
        message: isVcMsg
          ? `${senderName} started a video call for Loan #${loanId}. Open chat to join!`
          : `${senderName}: "${text.trim().slice(0, 80)}${text.length > 80 ? '...' : ''}"`,
        type: isVcMsg ? 'video_call' : 'chat_message',
      }).catch(() => {});
    }).catch(() => {});

    res.status(201).json({ success: true, message: msg });
  } catch (e) {
    console.error('Chat POST error:', e.message);
    res.status(500).json({ success: false, message: e.message });
  }
});

// ── VC notify ─────────────────────────────────────────────
router.post('/vc-notify', protect, async (req, res) => {
  try {
    const { to, loanId, room, callerName } = req.body;
    const toAddr = to?.toLowerCase();
    User.findOne({ walletAddress: toAddr }).then(recipient => {
      if (!recipient) return;
      Notification.create({
        userId:  recipient._id,
        title:   '📹 Incoming Video Call!',
        message: `${callerName || 'Someone'} is calling about Loan #${loanId}. Open chat to join!`,
        type:    'video_call',
      }).catch(() => {});
    }).catch(() => {});
    res.json({ success: true });
  } catch (e) {
    res.json({ success: true }); // never fail
  }
});

// ── AI chatbot endpoint ───────────────────────────────────
router.post('/ai', async (req, res) => {
  const { message } = req.body;
  if (!message?.trim()) return res.status(400).json({ success: false, message: 'Empty message' });

  const q = message.toLowerCase();
  const faq = [
    { keys: ['how does equalfund work', 'what is equalfund', 'explain'],         reply: 'EqualFund is a decentralized P2P lending platform on Ethereum. Borrowers request loans and lenders fund them directly via smart contracts — no banks. Platform fee is 0.5% vs 18–36% from banks.' },
    { keys: ['free eth', 'faucet', 'get eth', 'test eth', 'sepolia eth'],        reply: 'When you link your MetaMask wallet, EqualFund auto-sends 0.01 Sepolia ETH for free! You can also get more from sepoliafaucet.com.' },
    { keys: ['credit score', 'score', 'cibil'],                                  reply: 'Your on-chain credit score ranges from 300–850. It increases by +15 for every loan you repay on time. KYC adds +50, account age adds up to +50.' },
    { keys: ['create loan', 'apply loan', 'borrow', 'new loan'],                  reply: 'Go to Borrow → New Loan. Fill loan details (amount, rate, purpose), choose collateral (optional), review and submit. Your loan appears on the marketplace instantly.' },
    { keys: ['fund loan', 'invest', 'lend'],                                      reply: 'Go to Marketplace, browse loans, click Fund. Enter the ETH amount. When repaid, your principal + interest returns automatically via smart contract.' },
    { keys: ['collateral', 'secured', 'eth collateral'],                          reply: 'ETH collateral means locking 150% of the loan amount. For a 1 ETH loan, you lock 1.5 ETH. This protects lenders — if the borrower defaults, the collateral is liquidated to repay them.' },
    { keys: ['kyc', 'verify', 'identity', 'document'],                            reply: 'KYC is one-time identity verification. Upload your ID — stored permanently on IPFS. KYC adds +50 to your credit score and is required to create loan requests.' },
    { keys: ['default', 'not pay', 'miss payment', 'overdue'],                    reply: 'If you miss a repayment: credit score drops, account gets restricted from new loans, and ETH collateral (if any) is liquidated to lenders.' },
    { keys: ['upi', 'inr', 'rupee', 'pay'],                                       reply: 'You can pay in INR via Card/Netbanking through Razorpay (demo mode). Test card: 4111 1111 1111 1111, Expiry 12/28, CVV 123. No real money charged.' },
    { keys: ['chat', 'message', 'video', 'call'],                                 reply: 'Click 💬 Chat on any loan card to message the other party. Click 📹 Video Call inside chat for an embedded video call — stays on EqualFund, no redirect.' },
    { keys: ['register', 'signup', 'create account'],                             reply: 'Click Login/Register, choose Borrower or Lender, enter your details. Link your MetaMask wallet and get 0.01 free Sepolia ETH!' },
    { keys: ['metamask', 'wallet', 'connect'],                                    reply: 'Install MetaMask, create a wallet, switch to Sepolia testnet. Click Connect Wallet on EqualFund — we auto-switch you to Sepolia.' },
    { keys: ['fraud', 'risk', 'safe'],                                             reply: 'EqualFund has AI fraud detection. Each borrower gets a risk level: 🟢 Low, 🟡 Medium, 🔴 High Risk — based on account age, credit score, and previous defaults.' },
    { keys: ['interest', 'return', 'earn'],                                        reply: 'Borrowers set interest rates (typically 1–15%). As a lender, you receive principal + interest when repaid. Smart contract auto-splits among all lenders.' },
  ];

  for (const item of faq) {
    if (item.keys.some(k => q.includes(k))) return res.json({ success: true, reply: item.reply });
  }

  res.json({ success: true, reply: "I'm not sure about that. For loans: go to Marketplace. For account issues: check Profile. For KYC: go to the KYC page. Need more help? Check the Home page for guides! 😊" });
});

// ── GET unread count ──────────────────────────────────────
router.get('/unread/count', protect, async (req, res) => {
  try {
    const myAddr = getMyAddr(req);
    if (!myAddr) return res.json({ success: true, count: 0 });
    const count = await Message.countDocuments({ to: myAddr, read: false });
    res.json({ success: true, count });
  } catch {
    res.json({ success: true, count: 0 });
  }
});

module.exports = router;
