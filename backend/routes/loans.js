// backend/routes/loans.js
// CRITICAL FIX: Update credit score when loan is repaid
const express = require('express');
const router  = express.Router();
const Loan    = require('../models/Loan');
const User    = require('../models/User');
const Notification = require('../models/Notification');
const { protect } = require('../middleware/auth');

// ── CALCULATE CREDIT SCORE ────────────────────────────────
const calcCreditScore = (loans, kycVerified = false, createdAt = null) => {
  let score = 500;
  const completed = loans.filter(l => l.status === 2).length;
  const defaulted = loans.filter(l => l.status === 3).length;
  const total     = loans.length;

  if (total > 0) score += (completed / total) * 200;
  score -= defaulted * 100;
  if (kycVerified) score += 50;
  score += completed * 15; // +15 per successful repayment

  if (createdAt) {
    const months = (Date.now() - new Date(createdAt)) / (1000 * 60 * 60 * 24 * 30);
    score += Math.min(months * 5, 50);
  }

  return Math.max(300, Math.min(850, Math.round(score)));
};

// ── GET ALL LOANS ─────────────────────────────────────────
router.get('/', async (req, res) => {
  try {
    const { borrowerAddress, loanId, page = 1, limit = 50 } = req.query;
    const query = {};
    if (borrowerAddress) query.borrowerAddress = borrowerAddress.toLowerCase();
    if (loanId)          query.loanId = parseInt(loanId);

    const loans = await Loan.find(query)
      .sort({ createdAt: -1 })
      .limit(parseInt(limit))
      .skip((parseInt(page) - 1) * parseInt(limit));

    res.json({ success: true, loans });
  } catch (e) {
    res.status(500).json({ success: false, message: e.message });
  }
});

// ── GET LOAN HISTORY ──────────────────────────────────────
router.get('/history/:address', async (req, res) => {
  try {
    const addr  = req.params.address.toLowerCase();
    const loans = await Loan.find({ borrowerAddress: addr });
    const funded = await Loan.find({ 'investments.lenderAddress': addr });
    res.json({ success: true, loans, funded });
  } catch (e) {
    res.status(500).json({ success: false, message: e.message });
  }
});

// ── CREATE LOAN ───────────────────────────────────────────
router.post('/', protect, async (req, res) => {
  try {
    const { loanId, borrowerAddress, borrowerName, amount, interestRate, duration, purpose, category, ipfsHash } = req.body;

    const existing = await Loan.findOne({ loanId: parseInt(loanId) });
    if (existing) {
      return res.json({ success: true, loan: existing, message: 'Loan already exists' });
    }

    // Fraud check
    const user = await User.findOne({ walletAddress: borrowerAddress?.toLowerCase() });
    const fraudFlags = [];
    if (user) {
      const accountAgeDays = (Date.now() - new Date(user.createdAt)) / 86400000;
      if (accountAgeDays < 3)  fraudFlags.push({ type: 'new_account',    severity: 'medium' });
      if (user.creditScore < 400) fraudFlags.push({ type: 'low_score',   severity: 'high' });

      const existingLoans = await Loan.find({ borrowerAddress: borrowerAddress?.toLowerCase() });
      const defaults      = existingLoans.filter(l => l.status === 3).length;
      if (defaults > 0) fraudFlags.push({ type: 'previous_defaults', severity: 'high', count: defaults });
    }

    const loan = await Loan.create({
      loanId:          parseInt(loanId),
      borrowerAddress: borrowerAddress?.toLowerCase(),
      borrowerName:    borrowerName || user?.name || 'Unknown',
      amount:          amount?.toString(),
      interestRate:    parseFloat(interestRate),
      duration:        parseInt(duration),
      purpose:         purpose || '',
      category:        category || 'other',
      ipfsHash:        ipfsHash || '',
      status:          0,
      fraudFlags,
      riskLevel:       fraudFlags.some(f => f.severity === 'high') ? 'high' : fraudFlags.length > 0 ? 'medium' : 'low',
    });

    res.status(201).json({ success: true, loan });
  } catch (e) {
    res.status(500).json({ success: false, message: e.message });
  }
});

// ── FUND LOAN ─────────────────────────────────────────────
router.post('/:loanId/fund', protect, async (req, res) => {
  try {
    const { lenderAddress, lenderName, amount, amountFunded, isFullyFunded } = req.body;

    let loan = await Loan.findOne({ loanId: parseInt(req.params.loanId) });
    if (!loan) return res.status(404).json({ success: false, message: 'Loan not found' });

    // Add investment
    loan.investments = loan.investments || [];
    const existing   = loan.investments.find(i => i.lenderAddress === lenderAddress?.toLowerCase());
    if (!existing) {
      loan.investments.push({
        lenderAddress: lenderAddress?.toLowerCase(),
        lenderName:    lenderName || 'Unknown',
        amount:        amount?.toString(),
        investedAt:    new Date(),
      });
    }

    loan.fundedAmount = amountFunded?.toString();
    if (isFullyFunded) {
      loan.status   = 1;
      loan.fundedAt = new Date();
    }
    await loan.save();

    res.json({ success: true, loan });
  } catch (e) {
    res.status(500).json({ success: false, message: e.message });
  }
});

// ── REPAY LOAN — UPDATES CREDIT SCORE ────────────────────
router.post('/:loanId/repay', protect, async (req, res) => {
  try {
    const { borrowerAddress, repaidAmount } = req.body;

    let loan = await Loan.findOne({ loanId: parseInt(req.params.loanId) });
    if (!loan) return res.status(404).json({ success: false, message: 'Loan not found' });

    const oldStatus  = loan.status;
    loan.status      = 2; // Repaid
    loan.repaid      = true;
    loan.repaidAt    = new Date();
    loan.repaidAmount = repaidAmount?.toString();
    await loan.save();

    // ── CRITICAL: Update borrower credit score ─────────────
    const borrower = await User.findOne({ walletAddress: borrowerAddress?.toLowerCase() });
    if (borrower) {
      // Get all their loans
      const allLoans = await Loan.find({ borrowerAddress: borrowerAddress?.toLowerCase() });
      const newScore = calcCreditScore(
        allLoans,
        borrower.kycStatus === 'verified',
        borrower.createdAt
      );

      const oldScore = borrower.creditScore || 650;
      borrower.creditScore = newScore;
      await borrower.save();

      // Send notification about score change
      const scoreDiff = newScore - oldScore;
      await Notification.create({
        userId:  borrower._id,
        title:   scoreDiff > 0 ? `🎉 Credit Score Increased! +${scoreDiff}` : '✅ Loan Repaid Successfully',
        message: `Loan #${loan.loanId} repaid. Your credit score is now ${newScore}${scoreDiff > 0 ? ` (+${scoreDiff})` : ''}.`,
        type:    'loan_repaid',
      });

      // Notify all lenders
      for (const inv of (loan.investments || [])) {
        const lender = await User.findOne({ walletAddress: inv.lenderAddress });
        if (lender) {
          await Notification.create({
            userId:  lender._id,
            title:   '💰 Loan Repaid — Funds Returned!',
            message: `Borrower repaid Loan #${loan.loanId}. Your ${inv.amount} ETH + interest has been returned to your wallet.`,
            type:    'loan_repaid',
          });
        }
      }

      return res.json({ success: true, loan, newCreditScore: newScore, scoreDiff });
    }

    res.json({ success: true, loan });
  } catch (e) {
    res.status(500).json({ success: false, message: e.message });
  }
});

// ── UPDATE BORROWER NAME ──────────────────────────────────
router.put('/:loanId/update-name', protect, async (req, res) => {
  try {
    const loan = await Loan.findOneAndUpdate(
      { loanId: parseInt(req.params.loanId) },
      { borrowerName: req.body.borrowerName },
      { new: true }
    );
    res.json({ success: true, loan });
  } catch (e) {
    res.status(500).json({ success: false, message: e.message });
  }
});

module.exports = router;
