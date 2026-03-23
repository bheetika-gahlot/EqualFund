const express = require('express');
const router = express.Router();
const User = require('../models/User');
const Notification = require('../models/Notification');
const Activity = require('../models/Activity');
const { protect } = require('../middleware/auth');

// ─── GET USER BY WALLET ──────────────────────────────────
router.get('/wallet/:address', protect, async (req, res) => {
  try {
    const user = await User.findOne({ walletAddress: req.params.address.toLowerCase() });
    if (!user) return res.status(404).json({ success: false, message: 'No user found for this wallet.' });
    res.json({ success: true, user });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// ─── UPDATE CREDIT SCORE ─────────────────────────────────
router.put('/credit-score', protect, async (req, res) => {
  try {
    const { creditScore } = req.body;
    if (!creditScore || creditScore < 300 || creditScore > 850) {
      return res.status(400).json({ success: false, message: 'Invalid credit score (300-850).' });
    }
    const oldScore = req.user.creditScore;
    await User.findByIdAndUpdate(req.user._id, { creditScore });
    if (Math.abs(creditScore - oldScore) >= 50) {
      const improved = creditScore > oldScore;
      await Notification.create({
        userId: req.user._id,
        title: improved ? '📈 Credit Score Improved!' : '📉 Credit Score Decreased',
        message: improved
          ? `Your credit score increased from ${oldScore} to ${creditScore}.`
          : `Your credit score decreased from ${oldScore} to ${creditScore}.`,
        type: 'credit_score',
      });
    }
    res.json({ success: true, message: 'Credit score updated.' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// ─── UPDATE KYC STATUS ───────────────────────────────────
router.put('/kyc', protect, async (req, res) => {
  try {
    const { kycStatus, kycIpfsHash } = req.body;
    await User.findByIdAndUpdate(req.user._id, {
      kycStatus: kycStatus || 'pending',
      kycIpfsHash: kycIpfsHash || '',
    });
    await Activity.create({
      userId: req.user._id,
      walletAddress: req.user.walletAddress,
      action: 'kyc_submitted',
      details: { ipfsHash: kycIpfsHash, description: 'KYC documents submitted' },
    });
    await Notification.create({
      userId: req.user._id,
      title: '📋 KYC Submitted',
      message: 'Your KYC documents have been submitted. Admin will review within 24-48 hours.',
      type: 'kyc_submitted',
    });
    res.json({ success: true, message: 'KYC status updated.' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// ─── GET ALL USERS ───────────────────────────────────────
// No adminOnly — admin uses separate JWT token, protect handles it
router.get('/', protect, async (req, res) => {
  try {
    const page   = parseInt(req.query.page)  || 1;
    const limit  = parseInt(req.query.limit) || 100;
    const skip   = (page - 1) * limit;
    const filter = {};
    if (req.query.role)      filter.role      = req.query.role;
    if (req.query.kycStatus) filter.kycStatus = req.query.kycStatus;

    const users = await User.find(filter)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    const total = await User.countDocuments(filter);

    res.json({
      success: true,
      users,
      pagination: { total, page, pages: Math.ceil(total / limit) },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// ─── GET PLATFORM STATS ──────────────────────────────────
router.get('/stats', protect, async (req, res) => {
  try {
    const totalUsers  = await User.countDocuments();
    const borrowers   = await User.countDocuments({ role: 'borrower' });
    const lenders     = await User.countDocuments({ role: 'lender' });
    const kycVerified = await User.countDocuments({ kycStatus: 'verified' });
    const kycPending  = await User.countDocuments({ kycStatus: 'pending' });
    const recentUsers = await User.find().sort({ createdAt: -1 }).limit(5);
    res.json({
      success: true,
      stats: { totalUsers, borrowers, lenders, kycVerified, kycPending },
      recentUsers,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

module.exports = router;
