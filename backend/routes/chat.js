// backend/routes/chat.js
const express = require('express');
const router  = express.Router();
const mongoose = require('mongoose');
const { protect } = require('../middleware/auth');

// Simple chat message schema
const msgSchema = new mongoose.Schema({
  loanId:    Number,
  from:      String,
  to:        String,
  text:      String,
  read:      { type: Boolean, default: false },
  createdAt: { type: Date, default: Date.now },
});
const Message = mongoose.models.Message || mongoose.model('Message', msgSchema);

// ── GET messages for a loan between two addresses ─────────
router.get('/:loanId/:otherAddress', protect, async (req, res) => {
  try {
    const myAddress    = req.user.walletAddress?.toLowerCase();
    const otherAddress = req.params.otherAddress?.toLowerCase();
    const loanId       = parseInt(req.params.loanId);

    const messages = await Message.find({
      loanId,
      $or: [
        { from: myAddress, to: otherAddress },
        { from: otherAddress, to: myAddress },
      ],
    }).sort({ createdAt: 1 }).limit(100);

    // Mark messages from other as read
    await Message.updateMany(
      { loanId, from: otherAddress, to: myAddress, read: false },
      { $set: { read: true } }
    );

    res.json({ success: true, messages });
  } catch (e) {
    res.status(500).json({ success: false, message: e.message });
  }
});

// ── SEND message ──────────────────────────────────────────
router.post('/:loanId', protect, async (req, res) => {
  try {
    const myAddress = req.user.walletAddress?.toLowerCase();
    const { to, text } = req.body;

    if (!text?.trim()) return res.status(400).json({ success: false, message: 'Message cannot be empty' });
    if (!to)           return res.status(400).json({ success: false, message: 'Recipient required' });

    const msg = await Message.create({
      loanId: parseInt(req.params.loanId),
      from:   myAddress,
      to:     to.toLowerCase(),
      text:   text.trim(),
    });

    res.status(201).json({ success: true, message: msg });
  } catch (e) {
    res.status(500).json({ success: false, message: e.message });
  }
});

// ── GET unread count ──────────────────────────────────────
router.get('/unread/count', protect, async (req, res) => {
  try {
    const myAddress = req.user.walletAddress?.toLowerCase();
    const count     = await Message.countDocuments({ to: myAddress, read: false });
    res.json({ success: true, count });
  } catch (e) {
    res.status(500).json({ success: false, count: 0 });
  }
});

module.exports = router;
