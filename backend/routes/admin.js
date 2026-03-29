const express = require('express');
const router  = express.Router();
const User    = require('../models/User');
const Activity = require('../models/Activity');
const Notification = require('../models/Notification');

// Admin auth middleware
const adminAuth = (req, res, next) => {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) return res.status(401).json({ success: false, message: 'No token' });
  try {
    const jwt     = require('jsonwebtoken');
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.adminId   = decoded.id;
    next();
  } catch {
    return res.status(401).json({ success: false, message: 'Invalid token' });
  }
};

// ── GET STATS ────────────────────────────────────────────
router.get('/stats', adminAuth, async (req, res) => {
  try {
    const totalUsers  = await User.countDocuments();
    const borrowers   = await User.countDocuments({ role: 'borrower' });
    const lenders     = await User.countDocuments({ role: 'lender' });
    const kycVerified = await User.countDocuments({ kycStatus: 'verified' });
    const kycPending  = await User.countDocuments({ kycStatus: 'pending' });
    res.json({ success: true, stats: { totalUsers, borrowers, lenders, kycVerified, kycPending } });
  } catch (e) {
    res.status(500).json({ success: false, message: e.message });
  }
});

// ── APPROVE KYC ──────────────────────────────────────────
router.put('/kyc/:userId/approve', adminAuth, async (req, res) => {
  try {
    const user = await User.findByIdAndUpdate(
      req.params.userId,
      { kycStatus: 'verified' },
      { new: true }
    );
    if (!user) return res.status(404).json({ success: false, message: 'User not found' });

    await Notification.create({
      userId:  user._id,
      title:   '✅ KYC Approved!',
      message: 'Your KYC has been verified. You can now create loan requests!',
      type:    'kyc_approved',
    });

    res.json({ success: true, message: 'KYC approved' });
  } catch (e) {
    res.status(500).json({ success: false, message: e.message });
  }
});

// ── REJECT KYC ───────────────────────────────────────────
router.put('/kyc/:userId/reject', adminAuth, async (req, res) => {
  try {
    const user = await User.findByIdAndUpdate(
      req.params.userId,
      { kycStatus: 'rejected' },
      { new: true }
    );
    if (!user) return res.status(404).json({ success: false, message: 'User not found' });

    await Notification.create({
      userId:  user._id,
      title:   '❌ KYC Rejected',
      message: 'Your KYC was rejected. Please resubmit with clearer documents.',
      type:    'kyc_rejected',
    });

    res.json({ success: true, message: 'KYC rejected' });
  } catch (e) {
    res.status(500).json({ success: false, message: e.message });
  }
});

// ── DEACTIVATE USER ──────────────────────────────────────
router.put('/users/:userId/deactivate', adminAuth, async (req, res) => {
  try {
    const user = await User.findById(req.params.userId);
    if (!user) return res.status(404).json({ success: false, message: 'User not found' });
    if (user.role === 'admin') return res.status(400).json({ success: false, message: 'Cannot deactivate admin' });

    await User.findByIdAndUpdate(req.params.userId, { isActive: false });
    res.json({ success: true, message: `${user.name} deactivated` });
  } catch (e) {
    res.status(500).json({ success: false, message: e.message });
  }
});

// ── ACTIVATE USER ────────────────────────────────────────
router.put('/users/:userId/activate', adminAuth, async (req, res) => {
  try {
    await User.findByIdAndUpdate(req.params.userId, { isActive: true });
    res.json({ success: true, message: 'User activated' });
  } catch (e) {
    res.status(500).json({ success: false, message: e.message });
  }
});

// ── DELETE USER ──────────────────────────────────────────
router.delete('/users/:userId', adminAuth, async (req, res) => {
  try {
    const user = await User.findById(req.params.userId);
    if (!user) return res.status(404).json({ success: false, message: 'User not found' });
    if (user.role === 'admin') return res.status(400).json({ success: false, message: 'Cannot delete admin' });

    await User.findByIdAndDelete(req.params.userId);
    res.json({ success: true, message: `${user.name} deleted` });
  } catch (e) {
    res.status(500).json({ success: false, message: e.message });
  }
});

module.exports = router;
