const express = require('express');
const router = express.Router();
const Activity = require('../models/Activity');
const { protect, adminOnly } = require('../middleware/auth');

// ─── GET MY ACTIVITY ─────────────────────────────────────
// GET /api/activity
router.get('/', protect, async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const skip = (page - 1) * limit;
    const { action } = req.query;

    const filter = { userId: req.user._id };
    if (action) filter.action = action;

    const activities = await Activity.find(filter)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    const total = await Activity.countDocuments(filter);

    res.json({
      success: true,
      activities,
      pagination: { total, page, pages: Math.ceil(total / limit) },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// ─── LOG ACTIVITY (called by frontend after blockchain tx) ─
// POST /api/activity
router.post('/', protect, async (req, res) => {
  try {
    const { action, details } = req.body;

    if (!action) {
      return res.status(400).json({ success: false, message: 'Action is required.' });
    }

    const activity = await Activity.create({
      userId: req.user._id,
      walletAddress: req.user.walletAddress,
      action,
      details: details || {},
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'],
    });

    res.status(201).json({ success: true, activity });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// ─── GET ALL ACTIVITY (admin only) ───────────────────────
// GET /api/activity/all
router.get('/all', protect, adminOnly, async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 50;
    const skip = (page - 1) * limit;

    const activities = await Activity.find()
      .populate('userId', 'name email')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    const total = await Activity.countDocuments();

    res.json({
      success: true,
      activities,
      pagination: { total, page, pages: Math.ceil(total / limit) },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// ─── GET ACTIVITY STATS ──────────────────────────────────
// GET /api/activity/stats
router.get('/stats', protect, async (req, res) => {
  try {
    const stats = await Activity.aggregate([
      { $match: { userId: req.user._id } },
      { $group: { _id: '$action', count: { $sum: 1 } } },
      { $sort: { count: -1 } },
    ]);

    const totalActions = stats.reduce((sum, s) => sum + s.count, 0);

    res.json({ success: true, stats, totalActions });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

module.exports = router;
