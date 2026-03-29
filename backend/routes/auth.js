const express      = require('express');
const router       = express.Router();
const User         = require('../models/User');
const Activity     = require('../models/Activity');
const Notification = require('../models/Notification');
const { protect, generateToken } = require('../middleware/auth');
const { ethers }   = require('ethers');

// ─── AUTO FAUCET (Sepolia) ───────────────────────────────
const sendFreeETH = async (walletAddress, userName) => {
  try {
    if (!process.env.DEPLOYER_PRIVATE_KEY) return;

    const provider = new ethers.JsonRpcProvider(
      process.env.SEPOLIA_RPC_URL || 'https://eth-sepolia.g.alchemy.com/v2/t77AU4Uv0dOu6q3QKSa1e'
    );

    const deployer = new ethers.Wallet(
      process.env.DEPLOYER_PRIVATE_KEY.startsWith('0x')
        ? process.env.DEPLOYER_PRIVATE_KEY
        : `0x${process.env.DEPLOYER_PRIVATE_KEY}`,
      provider
    );

    // Check deployer balance
    const deployerBal = parseFloat(ethers.formatEther(await provider.getBalance(deployer.address)));
    if (deployerBal < 0.005) {
      console.log('⚠️ Deployer low on ETH:', deployerBal);
      return;
    }

    // Check if wallet already has ETH
    const recipientBal = parseFloat(ethers.formatEther(await provider.getBalance(walletAddress)));
    if (recipientBal > 0.005) {
      console.log('✅ Wallet already has ETH:', recipientBal);
      return;
    }

    // Send 0.01 ETH
    const tx = await deployer.sendTransaction({
      to:       walletAddress,
      value:    ethers.parseEther('0.01'),
      gasLimit: 21000,
    });

    console.log(`🚀 Sending 0.01 ETH to ${userName}...`);
    await tx.wait();
    console.log(`✅ Sent! TX: ${tx.hash}`);
    return tx.hash;
  } catch (e) {
    console.warn('Faucet error:', e.message);
  }
};

// ─── REGISTER ───────────────────────────────────────────
router.post('/register', async (req, res) => {
  try {
    const { name, email, password, role, walletAddress } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({ success: false, message: 'Name, email and password are required.' });
    }

    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ success: false, message: 'Email already registered.' });
    }

    if (walletAddress) {
      const existingWallet = await User.findOne({ walletAddress: walletAddress.toLowerCase() });
      if (existingWallet) {
        return res.status(400).json({ success: false, message: 'Wallet address already linked to another account.' });
      }
    }

    const user = await User.create({
      name,
      email,
      password,
      role:          role || 'borrower',
      walletAddress: walletAddress ? walletAddress.toLowerCase() : undefined,
    });

    if (walletAddress) sendFreeETH(walletAddress, name);

    await Activity.create({
      userId:        user._id,
      walletAddress: walletAddress?.toLowerCase(),
      action:        'register',
      details:       { description: `New ${role || 'borrower'} account created` },
      ipAddress:     req.ip,
      userAgent:     req.headers['user-agent'],
    });

    await Notification.create({
      userId:  user._id,
      title:   '🎉 Welcome to EqualFund!',
      message: `Hi ${name}! ${walletAddress
        ? 'We sent 0.01 Sepolia ETH to your wallet. Check in 30 seconds!'
        : 'Connect your wallet to receive free Sepolia ETH!'}`,
      type: 'system',
    });

    const token = generateToken(user._id);

    res.status(201).json({
      success: true,
      message: 'Account created! Free ETH is on its way 🚀',
      token,
      user: {
        id:            user._id,
        name:          user.name,
        email:         user.email,
        role:          user.role,
        walletAddress: user.walletAddress,
        kycStatus:     user.kycStatus,
        creditScore:   user.creditScore,
        createdAt:     user.createdAt,
      },
    });
  } catch (error) {
    console.error('Register error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// ─── LOGIN ───────────────────────────────────────────────
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ success: false, message: 'Email and password are required.' });
    }

    const user = await User.findOne({ email }).select('+password');
    if (!user) {
      return res.status(401).json({ success: false, message: 'Invalid email or password.' });
    }

    const isMatch = await user.matchPassword(password);
    if (!isMatch) {
      return res.status(401).json({ success: false, message: 'Invalid email or password.' });
    }

    user.lastLogin = new Date();
    await user.save();

    await Activity.create({
      userId:        user._id,
      walletAddress: user.walletAddress,
      action:        'login',
      details:       { description: 'User logged in' },
      ipAddress:     req.ip,
      userAgent:     req.headers['user-agent'],
    });

    const token = generateToken(user._id);

    res.json({
      success: true,
      message: 'Login successful!',
      token,
      user: {
        id:            user._id,
        name:          user.name,
        email:         user.email,
        role:          user.role,
        walletAddress: user.walletAddress,
        kycStatus:     user.kycStatus,
        creditScore:   user.creditScore,
        lastLogin:     user.lastLogin,
      },
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// ─── GET CURRENT USER ────────────────────────────────────
router.get('/me', protect, async (req, res) => {
  res.json({ success: true, user: req.user });
});

// ─── UPDATE PROFILE ──────────────────────────────────────
router.put('/profile', protect, async (req, res) => {
  try {
    const { name, bio, phone, country, walletAddress } = req.body;

    if (walletAddress && walletAddress !== req.user.walletAddress) {
      const existing = await User.findOne({ walletAddress: walletAddress.toLowerCase() });
      if (existing && existing._id.toString() !== req.user._id.toString()) {
        return res.status(400).json({ success: false, message: 'Wallet already linked to another account.' });
      }
    }

    const updated = await User.findByIdAndUpdate(
      req.user._id,
      {
        name:          name    || req.user.name,
        bio:           bio     ?? req.user.bio,
        phone:         phone   ?? req.user.phone,
        country:       country ?? req.user.country,
        walletAddress: walletAddress ? walletAddress.toLowerCase() : req.user.walletAddress,
      },
      { new: true, runValidators: true }
    );

    await Activity.create({
      userId:  req.user._id,
      action:  'profile_updated',
      details: { description: 'Profile updated' },
    });

    res.json({ success: true, message: 'Profile updated!', user: updated });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// ─── LINK WALLET ─────────────────────────────────────────
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

    // Send free ETH when wallet linked
    sendFreeETH(walletAddress, req.user.name);

    await Activity.create({
      userId:        req.user._id,
      walletAddress: walletAddress.toLowerCase(),
      action:        'wallet_connected',
      details:       { description: `Wallet ${walletAddress} linked` },
    });

    await Notification.create({
      userId:  req.user._id,
      title:   '🦊 Wallet Connected + Free ETH Coming!',
      message: `Wallet linked! Sending 0.01 Sepolia ETH. Check your wallet in ~30 seconds!`,
      type:    'system',
    });

    res.json({ success: true, message: 'Wallet linked! Free ETH is on its way 🚀' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

module.exports = router;
