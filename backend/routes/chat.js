// backend/routes/chat.js
const express    = require('express');
const router     = express.Router();
const mongoose   = require('mongoose');
const { protect } = require('../middleware/auth');
const User        = require('../models/User');
const Notification = require('../models/Notification');

// ── Message Schema ────────────────────────────────────────
const msgSchema = new mongoose.Schema({
  loanId:    { type: Number, required: true },
  from:      { type: String, required: true, lowercase: true },
  to:        { type: String, required: true, lowercase: true },
  text:      { type: String, required: true },
  read:      { type: Boolean, default: false },
  type:      { type: String, default: 'text', enum: ['text', 'vc_invite', 'system'] },
  createdAt: { type: Date, default: Date.now },
});
msgSchema.index({ loanId: 1, from: 1, to: 1 });
const Message = mongoose.models.Message || mongoose.model('Message', msgSchema);

// ── GET messages between two users for a loan ─────────────
router.get('/:loanId/:otherAddress', protect, async (req, res) => {
  try {
    const myAddr    = req.user.walletAddress?.toLowerCase();
    const otherAddr = req.params.otherAddress?.toLowerCase();
    const loanId    = parseInt(req.params.loanId);

    if (!myAddr) return res.status(400).json({ success: false, message: 'Wallet not linked to account' });

    const messages = await Message.find({
      loanId,
      $or: [
        { from: myAddr, to: otherAddr },
        { from: otherAddr, to: myAddr },
      ],
    }).sort({ createdAt: 1 }).limit(100);

    // Mark unread as read
    await Message.updateMany(
      { loanId, from: otherAddr, to: myAddr, read: false },
      { $set: { read: true } }
    );

    res.json({ success: true, messages });
  } catch (e) {
    res.status(500).json({ success: false, message: e.message });
  }
});

// ── SEND message + notify other user ─────────────────────
router.post('/:loanId', protect, async (req, res) => {
  try {
    const myAddr = req.user.walletAddress?.toLowerCase();
    const { to, text, loanId: bodyLoanId } = req.body;
    const loanId = parseInt(req.params.loanId || bodyLoanId);

    if (!myAddr) return res.status(400).json({ success: false, message: 'Wallet not linked' });
    if (!text?.trim()) return res.status(400).json({ success: false, message: 'Empty message' });
    if (!to) return res.status(400).json({ success: false, message: 'Recipient required' });

    const toAddr = to.toLowerCase();
    const isVcMsg = text.startsWith('📹 VIDEO_CALL_INVITE:');

    const msg = await Message.create({
      loanId,
      from: myAddr,
      to:   toAddr,
      text: text.trim(),
      type: isVcMsg ? 'vc_invite' : 'text',
    });

    // ── Send notification to recipient ─────────────────
    const recipient = await User.findOne({ walletAddress: toAddr });
    if (recipient) {
      const senderName = req.user.name || `${myAddr.slice(0, 8)}...`;
      await Notification.create({
        userId:  recipient._id,
        title:   isVcMsg ? `📹 ${senderName} is calling you!` : `💬 New message from ${senderName}`,
        message: isVcMsg
          ? `${senderName} started a video call for Loan #${loanId}. Open your chat to join!`
          : `${senderName} sent: "${text.trim().slice(0, 60)}${text.length > 60 ? '...' : ''}"`,
        type: isVcMsg ? 'video_call' : 'chat_message',
      });
    }

    res.status(201).json({ success: true, message: msg });
  } catch (e) {
    res.status(500).json({ success: false, message: e.message });
  }
});

// ── VC notify (separate endpoint for video call) ──────────
router.post('/vc-notify', protect, async (req, res) => {
  try {
    const { to, loanId, room, callerName } = req.body;
    const toAddr   = to?.toLowerCase();
    const recipient = await User.findOne({ walletAddress: toAddr });

    if (recipient) {
      await Notification.create({
        userId:  recipient._id,
        title:   `📹 Incoming Video Call!`,
        message: `${callerName || 'Lender'} is calling you about Loan #${loanId}. Open the chat to join!`,
        type:    'video_call',
      });
    }
    res.json({ success: true });
  } catch (e) {
    res.status(500).json({ success: false, message: e.message });
  }
});

// ── GET unread count ──────────────────────────────────────
router.get('/unread/count', protect, async (req, res) => {
  try {
    const myAddr = req.user.walletAddress?.toLowerCase();
    if (!myAddr) return res.json({ success: true, count: 0 });
    const count = await Message.countDocuments({ to: myAddr, read: false });
    res.json({ success: true, count });
  } catch {
    res.json({ success: true, count: 0 });
  }
});

module.exports = router;
