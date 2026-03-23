const express = require('express');
const router = express.Router();
const User = require('../models/User');
const Activity = require('../models/Activity');
const Notification = require('../models/Notification');

// ── APPROVE KYC ─────────────────────────────────────────
router.put('/kyc/:userId/approve', async (req, res) => {
  try {
    const user = await User.findById(req.params.userId);
    if (!user) return res.status(404).json({ success: false, message: 'User not found' });

    await User.findByIdAndUpdate(req.params.userId, { kycStatus: 'verified' });

    // Notify the user
    await Notification.create({
      userId: user._id,
      title: '✅ KYC Verified!',
      message: 'Your identity has been verified. You can now create loan requests.',
      type: 'kyc_verified',
    });

    // Log — no req.user needed
    await Activity.create({
      action: 'kyc_submitted',
      details: { description: `Admin approved KYC for ${user.name} (${user.email})` },
    });

    res.json({ success: true, message: `KYC approved for ${user.name}` });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// ── REJECT KYC ──────────────────────────────────────────
router.put('/kyc/:userId/reject', async (req, res) => {
  try {
    const { reason } = req.body;
    const user = await User.findById(req.params.userId);
    if (!user) return res.status(404).json({ success: false, message: 'User not found' });

    await User.findByIdAndUpdate(req.params.userId, { kycStatus: 'rejected' });

    await Notification.create({
      userId: user._id,
      title: '❌ KYC Rejected',
      message: `Your KYC was rejected. ${reason || 'Please resubmit with clear, valid documents.'}`,
      type: 'kyc_submitted',
    });

    await Activity.create({
      action: 'kyc_submitted',
      details: { description: `Admin rejected KYC for ${user.name} (${user.email})` },
    });

    res.json({ success: true, message: `KYC rejected for ${user.name}` });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// ── DEACTIVATE USER ─────────────────────────────────────
router.put('/users/:userId/deactivate', async (req, res) => {
  try {
    const user = await User.findById(req.params.userId);
    if (!user) return res.status(404).json({ success: false, message: 'User not found' });
    if (user.role === 'admin') return res.status(403).json({ success: false, message: 'Cannot deactivate admin' });

    await User.findByIdAndUpdate(req.params.userId, { isActive: false });

    await Activity.create({
      action: 'profile_updated',
      details: { description: `Admin deactivated user ${user.name} (${user.email})` },
    });

    res.json({ success: true, message: `User ${user.name} deactivated` });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// ── REACTIVATE USER ─────────────────────────────────────
router.put('/users/:userId/activate', async (req, res) => {
  try {
    await User.findByIdAndUpdate(req.params.userId, { isActive: true });
    res.json({ success: true, message: 'User reactivated' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// ── CHANGE USER ROLE ────────────────────────────────────
router.put('/users/:userId/role', async (req, res) => {
  try {
    const { role } = req.body;
    if (!['borrower', 'lender', 'admin'].includes(role)) {
      return res.status(400).json({ success: false, message: 'Invalid role' });
    }
    await User.findByIdAndUpdate(req.params.userId, { role });
    res.json({ success: true, message: `Role updated to ${role}` });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// ── GET ALL ACTIVITIES ───────────────────────────────────
router.get('/activities', async (req, res) => {
  try {
    const page  = parseInt(req.query.page)  || 1;
    const limit = parseInt(req.query.limit) || 50;
    const activities = await Activity.find()
      .populate('userId', 'name email')
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit);
    const total = await Activity.countDocuments();
    res.json({ success: true, activities, total });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// ── BROADCAST NOTIFICATION ───────────────────────────────
router.post('/notify', async (req, res) => {
  try {
    const { title, message, target } = req.body;
    const filter = target === 'all' ? { isActive: true } : { role: target, isActive: true };
    const users = await User.find(filter).select('_id');
    await Promise.all(users.map(u =>
      Notification.create({ userId: u._id, title, message, type: 'system' })
    ));
    res.json({ success: true, message: `Sent to ${users.length} users` });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// ── PLATFORM STATS ───────────────────────────────────────
router.get('/stats', async (req, res) => {
  try {
    const [total, borrowers, lenders, admins, kycVerified, kycPending, kycRejected, activeUsers] = await Promise.all([
      User.countDocuments(),
      User.countDocuments({ role: 'borrower' }),
      User.countDocuments({ role: 'lender' }),
      User.countDocuments({ role: 'admin' }),
      User.countDocuments({ kycStatus: 'verified' }),
      User.countDocuments({ kycStatus: 'pending' }),
      User.countDocuments({ kycStatus: 'rejected' }),
      User.countDocuments({ isActive: true }),
    ]);
    res.json({
      success: true,
      stats: { total, borrowers, lenders, admins, kycVerified, kycPending, kycRejected, activeUsers },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

module.exports = router;
