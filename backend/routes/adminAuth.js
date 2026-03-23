const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const User = require('../models/User');
const Activity = require('../models/Activity');
const Notification = require('../models/Notification');
const { protect, adminOnly } = require('../middleware/auth');

// ── ADMIN LOGIN ──────────────────────────────────────────
// POST /api/admin/auth/login
// No email/OTP required — direct token login with secret key
router.post('/auth/login', async (req, res) => {
  try {
    const { email, password, secretKey } = req.body;
    const ip = req.headers['x-forwarded-for'] || req.ip;

    // 1. Check secret key
    if (!secretKey || secretKey !== process.env.ADMIN_SECRET_KEY) {
      console.log(`🚨 Wrong secret key attempt from IP: ${ip}, email: ${email}`);

      // Log the attempt (no email needed)
      try {
        await Activity.create({
          action: 'login',
          walletAddress: null,
          details: {
            description: `🚨 UNAUTHORIZED admin login attempt — wrong secret key. Email: ${email}, IP: ${ip}`,
          },
        });
      } catch (e) { /* don't crash if activity log fails */ }

      return res.status(401).json({ success: false, message: 'Invalid admin credentials.' });
    }

    // 2. Find user
    const user = await User.findOne({ email }).select('+password');
    if (!user) {
      console.log(`Admin login: user not found for ${email}`);
      return res.status(401).json({ success: false, message: 'Invalid admin credentials.' });
    }

    // 3. Must be admin role
    if (user.role !== 'admin') {
      console.log(`Admin login: user ${email} is not an admin (role: ${user.role})`);
      return res.status(401).json({ success: false, message: 'Invalid admin credentials.' });
    }

    // 4. Check password
    const isMatch = await user.matchPassword(password);
    if (!isMatch) {
      console.log(`Admin login: wrong password for ${email}`);
      return res.status(401).json({ success: false, message: 'Invalid admin credentials.' });
    }

    // 5. Check account is active
    if (!user.isActive) {
      return res.status(403).json({ success: false, message: 'This admin account has been deactivated.' });
    }

    // 6. Issue JWT token
    const token = jwt.sign(
      { id: user._id, isAdmin: true },
      process.env.JWT_SECRET,
      { expiresIn: '8h' }
    );

    // 7. Log successful login
    try {
      await Activity.create({
        userId: user._id,
        action: 'login',
        details: { description: `Admin login successful from IP: ${ip}` },
      });
    } catch (e) { /* don't crash if activity log fails */ }

    console.log(`✅ Admin login successful: ${email}`);

    res.json({
      success: true,
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
      },
    });

  } catch (error) {
    console.error('Admin login error:', error.message);
    res.status(500).json({ success: false, message: error.message });
  }
});

// ── BLOCK USER FROM ADMIN ACCESS ─────────────────────────
// POST /api/admin/auth/block-admin-access/:userId
// Removes admin role — does NOT affect borrower/lender access
router.post('/auth/block-admin-access/:userId', protect, adminOnly, async (req, res) => {
  try {
    const user = await User.findById(req.params.userId);
    if (!user) return res.status(404).json({ success: false, message: 'User not found' });

    if (user._id.toString() === req.user._id.toString()) {
      return res.status(400).json({ success: false, message: 'You cannot block yourself.' });
    }

    // Downgrade from admin to borrower — keeps platform access
    await User.findByIdAndUpdate(req.params.userId, {
      role: 'borrower',
      adminBlocked: true,
    });

    // Notify the affected user
    try {
      await Notification.create({
        userId: user._id,
        title: '⚠️ Admin Access Revoked',
        message: 'Your admin access has been revoked. You can still use EqualFund as a borrower or lender.',
        type: 'system',
      });
    } catch (e) { /* silent */ }

    await Activity.create({
      userId: req.user._id,
      action: 'profile_updated',
      details: { description: `Admin revoked admin access for ${user.name} (${user.email})` },
    });

    res.json({
      success: true,
      message: `Admin access blocked for ${user.name}. Their borrower/lender access is unaffected.`,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// ── VERIFY ADMIN TOKEN ───────────────────────────────────
// GET /api/admin/auth/verify
// Frontend calls this on page load to confirm token is still valid
router.get('/auth/verify', protect, async (req, res) => {
  try {
    const user = await User.findById(req.user._id);
    if (!user || user.role !== 'admin') {
      return res.status(403).json({ success: false, message: 'Not an admin.' });
    }
    res.json({ success: true, user: { id: user._id, name: user.name, email: user.email, role: user.role } });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

module.exports = router;
