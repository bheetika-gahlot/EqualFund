const express = require('express');
const router = express.Router();
const User = require('../models/User');
const Activity = require('../models/Activity');
const Notification = require('../models/Notification');
const { protect, generateToken } = require('../middleware/auth');

// ─── REGISTER ───────────────────────────────────────────
// POST /api/auth/register
router.post('/register', async (req, res) => {
  try {
    const { name, email, password, role, walletAddress } = req.body;

    // Validate
    if (!name || !email || !password) {
      return res.status(400).json({ success: false, message: 'Name, email and password are required.' });
    }

    // Check if email already exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ success: false, message: 'Email already registered.' });
    }

    // Check wallet address if provided
    if (walletAddress) {
      const existingWallet = await User.findOne({ walletAddress: walletAddress.toLowerCase() });
      if (existingWallet) {
        return res.status(400).json({ success: false, message: 'Wallet address already linked to another account.' });
      }
    }

    // Create user
    const user = await User.create({
      name,
      email,
      password,
      role: role || 'borrower',
      walletAddress: walletAddress ? walletAddress.toLowerCase() : undefined,
    });

    // Log activity
    await Activity.create({
      userId: user._id,
      walletAddress: walletAddress?.toLowerCase(),
      action: 'register',
      details: { description: `New ${role || 'borrower'} account created` },
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'],
    });

    // Welcome notification
    await Notification.create({
      userId: user._id,
      title: '🎉 Welcome to EqualFund!',
      message: `Hi ${name}! Your account is ready. Connect your MetaMask wallet to start borrowing or lending.`,
      type: 'system',
    });

    const token = generateToken(user._id);

    res.status(201).json({
      success: true,
      message: 'Account created successfully!',
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        walletAddress: user.walletAddress,
        kycStatus: user.kycStatus,
        creditScore: user.creditScore,
        createdAt: user.createdAt,
      },
    });
  } catch (error) {
    console.error('Register error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// ─── LOGIN ───────────────────────────────────────────────
// POST /api/auth/login
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ success: false, message: 'Email and password are required.' });
    }

    // Get user with password
    const user = await User.findOne({ email }).select('+password');
    if (!user) {
      return res.status(401).json({ success: false, message: 'Invalid email or password.' });
    }

    const isMatch = await user.matchPassword(password);
    if (!isMatch) {
      return res.status(401).json({ success: false, message: 'Invalid email or password.' });
    }

    // Update last login
    user.lastLogin = new Date();
    await user.save();

    // Log activity
    await Activity.create({
      userId: user._id,
      walletAddress: user.walletAddress,
      action: 'login',
      details: { description: 'User logged in' },
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'],
    });

    const token = generateToken(user._id);

    res.json({
      success: true,
      message: 'Login successful!',
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        walletAddress: user.walletAddress,
        kycStatus: user.kycStatus,
        creditScore: user.creditScore,
        lastLogin: user.lastLogin,
      },
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// ─── GET CURRENT USER ────────────────────────────────────
// GET /api/auth/me
router.get('/me', protect, async (req, res) => {
  res.json({ success: true, user: req.user });
});

// ─── UPDATE PROFILE ──────────────────────────────────────
// PUT /api/auth/profile
router.put('/profile', protect, async (req, res) => {
  try {
    const { name, bio, phone, country, walletAddress } = req.body;

    // Check wallet not already taken
    if (walletAddress && walletAddress !== req.user.walletAddress) {
      const existing = await User.findOne({ walletAddress: walletAddress.toLowerCase() });
      if (existing && existing._id.toString() !== req.user._id.toString()) {
        return res.status(400).json({ success: false, message: 'Wallet address already linked to another account.' });
      }
    }

    const updated = await User.findByIdAndUpdate(
      req.user._id,
      {
        name: name || req.user.name,
        bio: bio ?? req.user.bio,
        phone: phone ?? req.user.phone,
        country: country ?? req.user.country,
        walletAddress: walletAddress ? walletAddress.toLowerCase() : req.user.walletAddress,
      },
      { new: true, runValidators: true }
    );

    // Log activity
    await Activity.create({
      userId: req.user._id,
      action: 'profile_updated',
      details: { description: 'Profile information updated' },
    });

    res.json({ success: true, message: 'Profile updated!', user: updated });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// ─── LINK WALLET ─────────────────────────────────────────
// POST /api/auth/link-wallet
router.post('/link-wallet', protect, async (req, res) => {
  try {
    const { walletAddress } = req.body;
    if (!walletAddress) {
      return res.status(400).json({ success: false, message: 'Wallet address required.' });
    }

    const existing = await User.findOne({ walletAddress: walletAddress.toLowerCase() });
    if (existing && existing._id.toString() !== req.user._id.toString()) {
      return res.status(400).json({ success: false, message: 'Wallet already linked to another account.' });
    }

    await User.findByIdAndUpdate(req.user._id, { walletAddress: walletAddress.toLowerCase() });

    // Log activity
    await Activity.create({
      userId: req.user._id,
      walletAddress: walletAddress.toLowerCase(),
      action: 'wallet_connected',
      details: { description: `Wallet ${walletAddress} linked to account` },
    });

    // Send notification
    await Notification.create({
      userId: req.user._id,
      title: '🦊 Wallet Connected',
      message: `Your MetaMask wallet ${walletAddress.slice(0,8)}... has been linked to your account.`,
      type: 'system',
    });

    res.json({ success: true, message: 'Wallet linked successfully!' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

module.exports = router;
