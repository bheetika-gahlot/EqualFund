// backend/routes/users.js — add credit score update endpoint
const express = require('express');
const router  = express.Router();
const User    = require('../models/User');
const { protect } = require('../middleware/auth');

// ── GET ALL USERS ─────────────────────────────────────────
router.get('/', async (req, res) => {
  try {
    const { page = 1, role, kycStatus } = req.query;
    const query = {};
    if (role)      query.role = role;
    if (kycStatus) query.kycStatus = kycStatus;

    const users = await User.find(query)
      .sort({ createdAt: -1 })
      .limit(100)
      .skip((parseInt(page) - 1) * 100)
      .select('-password');

    res.json({ success: true, users });
  } catch (e) {
    res.status(500).json({ success: false, message: e.message });
  }
});

// ── GET BY WALLET ─────────────────────────────────────────
router.get('/wallet/:address', async (req, res) => {
  try {
    const user = await User.findOne({
      walletAddress: req.params.address.toLowerCase()
    }).select('-password');

    if (!user) return res.status(404).json({ success: false, message: 'User not found' });
    res.json({ success: true, user });
  } catch (e) {
    res.status(500).json({ success: false, message: e.message });
  }
});

// ── UPDATE CREDIT SCORE ───────────────────────────────────
// CRITICAL FIX: This was missing — causes credit score to not save
router.put('/credit-score', protect, async (req, res) => {
  try {
    const { creditScore } = req.body;
    if (!creditScore || isNaN(creditScore)) {
      return res.status(400).json({ success: false, message: 'Valid credit score required' });
    }

    const score = Math.max(300, Math.min(850, parseInt(creditScore)));
    const user  = await User.findByIdAndUpdate(
      req.user._id,
      { creditScore: score },
      { new: true }
    ).select('-password');

    res.json({ success: true, user, creditScore: score });
  } catch (e) {
    res.status(500).json({ success: false, message: e.message });
  }
});

// ── UPDATE KYC ────────────────────────────────────────────
router.put('/kyc', protect, async (req, res) => {
  try {
    const { kycStatus, kycIpfsHash } = req.body;
    const user = await User.findByIdAndUpdate(
      req.user._id,
      { kycStatus, ...(kycIpfsHash ? { kycIpfsHash } : {}) },
      { new: true }
    ).select('-password');
    res.json({ success: true, user });
  } catch (e) {
    res.status(500).json({ success: false, message: e.message });
  }
});

module.exports = router;
