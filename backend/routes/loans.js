const express = require('express');
const router = express.Router();
const Loan = require('../models/Loan');
const User = require('../models/User');
const Notification = require('../models/Notification');
const Activity = require('../models/Activity');
const { protect } = require('../middleware/auth');

// ── SAVE LOAN (called after blockchain createLoan) ────────
// POST /api/loans
router.post('/', protect, async (req, res) => {
  try {
    const {
      loanId, borrowerAddress, amount, interestRate,
      duration, purpose, category, ipfsHash,
    } = req.body;

    // Get borrower details from MongoDB
    const borrower = await User.findOne({
      walletAddress: borrowerAddress?.toLowerCase()
    });

    // Check if loan already exists
    const existing = await Loan.findOne({ loanId });
    if (existing) {
      return res.json({ success: true, loan: existing, message: 'Loan already saved' });
    }

    const loan = await Loan.create({
      loanId,
      borrowerAddress: borrowerAddress?.toLowerCase(),
      borrowerName:  borrower?.name  || 'Unknown',
      borrowerEmail: borrower?.email || '',
      amount,
      interestRate,
      duration,
      purpose,
      category,
      ipfsHash,
      status: 0,
      statusLabel: 'Pending',
    });

    // Log activity
    await Activity.create({
      userId: req.user._id,
      walletAddress: borrowerAddress,
      action: 'loan_created',
      details: {
        description: `Loan #${loanId} created for ${amount} ETH`,
        amount,
        loanId,
      },
    });

    res.json({ success: true, loan });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// ── GET ALL LOANS ─────────────────────────────────────────
// GET /api/loans
router.get('/', async (req, res) => {
  try {
    const filter = {};
    if (req.query.status)          filter.status          = parseInt(req.query.status);
    if (req.query.borrowerAddress) filter.borrowerAddress = req.query.borrowerAddress.toLowerCase();
    if (req.query.category)        filter.category        = req.query.category;

    const loans = await Loan.find(filter).sort({ createdAt: -1 });
    res.json({ success: true, loans });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// ── GET SINGLE LOAN ───────────────────────────────────────
// GET /api/loans/:loanId
router.get('/:loanId', async (req, res) => {
  try {
    const loan = await Loan.findOne({ loanId: parseInt(req.params.loanId) });
    if (!loan) return res.status(404).json({ success: false, message: 'Loan not found' });
    res.json({ success: true, loan });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// ── FUND LOAN (called after blockchain fundLoan) ──────────
// POST /api/loans/:loanId/fund
router.post('/:loanId/fund', protect, async (req, res) => {
  try {
    const { lenderAddress, amount, amountFunded, isFullyFunded } = req.body;

    const loan = await Loan.findOne({ loanId: parseInt(req.params.loanId) });
    if (!loan) return res.status(404).json({ success: false, message: 'Loan not found' });

    // Get lender details
    const lender = await User.findOne({ walletAddress: lenderAddress?.toLowerCase() });
    const lenderName  = lender?.name  || `${lenderAddress?.slice(0,6)}...${lenderAddress?.slice(-4)}`;
    const lenderEmail = lender?.email || '';

    // Add investment to loan
    loan.investments.push({
      lenderAddress: lenderAddress?.toLowerCase(),
      lenderName,
      lenderEmail,
      amount,
      fundedAt: new Date(),
    });

    loan.amountFunded = amountFunded || amount;

    if (isFullyFunded) {
      loan.status      = 1;
      loan.statusLabel = 'Active';
      loan.fundedAt    = new Date();
    }

    await loan.save();

    // ── Notify BORROWER ──
    const borrower = await User.findOne({ walletAddress: loan.borrowerAddress });
    if (borrower) {
      await Notification.create({
        userId: borrower._id,
        title:  `💰 ${lenderName} funded your loan!`,
        message: `${lenderName} has funded ${amount} ETH to your loan #${loan.loanId}. ${isFullyFunded ? 'Your loan is now fully funded! Funds have been released to your wallet.' : `Total funded so far: ${loan.amountFunded} ETH.`}`,
        type:   'loan_funded',
        loanId: loan.loanId.toString(),
      });
    }

    // ── Log activity ──
    await Activity.create({
      userId: req.user._id,
      walletAddress: lenderAddress,
      action: 'loan_funded',
      details: {
        description: `${lenderName} funded ${amount} ETH to Loan #${loan.loanId}`,
        amount,
        loanId: loan.loanId,
      },
    });

    res.json({ success: true, loan });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// ── REPAY LOAN (called after blockchain repayLoan) ────────
// POST /api/loans/:loanId/repay
router.post('/:loanId/repay', protect, async (req, res) => {
  try {
    const { repaidAmount, borrowerAddress } = req.body;

    const loan = await Loan.findOne({ loanId: parseInt(req.params.loanId) });
    if (!loan) return res.status(404).json({ success: false, message: 'Loan not found' });

    // Update loan status
    loan.status      = 2;
    loan.statusLabel = 'Repaid';
    loan.repaidAt    = new Date();
    loan.repaidAmount = repaidAmount;
    await loan.save();

    const borrowerName = loan.borrowerName || 'Borrower';
    const totalRepaid  = repaidAmount;

    // ── Notify each LENDER ──
    for (const inv of loan.investments) {
      const lender = await User.findOne({ walletAddress: inv.lenderAddress });
      if (lender) {
        // Calculate this lender's share
        const share = (parseFloat(inv.amount) / parseFloat(loan.amount));
        const receives = (parseFloat(totalRepaid) * share).toFixed(4);

        await Notification.create({
          userId: lender._id,
          title:  `✅ ${borrowerName} repaid the loan!`,
          message: `${borrowerName} has repaid Loan #${loan.loanId}. You funded ${inv.amount} ETH and received ${receives} ETH back (principal + interest).`,
          type:   'loan_repaid',
          loanId: loan.loanId.toString(),
        });
      }
    }

    // ── Notify BORROWER ──
    const borrower = await User.findOne({ walletAddress: loan.borrowerAddress });
    if (borrower) {
      await Notification.create({
        userId: borrower._id,
        title:  '✅ Loan Repaid Successfully!',
        message: `You have successfully repaid ${totalRepaid} ETH for Loan #${loan.loanId}. Your credit score has been updated. Great job!`,
        type:   'loan_repaid',
        loanId: loan.loanId.toString(),
      });
    }

    // ── Log activity ──
    await Activity.create({
      userId: req.user._id,
      walletAddress: borrowerAddress,
      action: 'loan_repaid',
      details: {
        description: `${borrowerName} repaid ${totalRepaid} ETH for Loan #${loan.loanId}`,
        amount: totalRepaid,
        loanId: loan.loanId,
      },
    });

    res.json({ success: true, loan });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// ── GET LOAN HISTORY FOR A WALLET ─────────────────────────
// GET /api/loans/history/:address
router.get('/history/:address', async (req, res) => {
  try {
    const address = req.params.address.toLowerCase();

    // Loans where user is borrower
    const borrowed = await Loan.find({ borrowerAddress: address }).sort({ createdAt: -1 });

    // Loans where user is lender
    const funded = await Loan.find({
      'investments.lenderAddress': address
    }).sort({ createdAt: -1 });

    res.json({ success: true, borrowed, funded });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

module.exports = router;
