// backend/routes/loans.js — Credit score fix + collateral visibility
const express  = require('express');
const router   = express.Router();
const Loan     = require('../models/Loan');
const User     = require('../models/User');
const Notification = require('../models/Notification');
const { protect } = require('../middleware/auth');

/* ─── Credit score calculator ──────────────────────────── */
function calcScore(loans = [], kycVerified = false, createdAt = null) {
  let score = 500;
  const total     = loans.length;
  const repaid    = loans.filter(l => l.status === 2).length;
  const defaulted = loans.filter(l => l.status === 3).length;

  if (total > 0) score += Math.round((repaid / total) * 200);
  score -= defaulted * 80;
  score += repaid * 15;             // +15 per successful repayment
  if (kycVerified) score += 50;

  if (createdAt) {
    const months = (Date.now() - new Date(createdAt)) / (1000 * 60 * 60 * 24 * 30);
    score += Math.min(Math.round(months * 5), 50);
  }

  return Math.max(300, Math.min(850, Math.round(score)));
}

/* ─── GET all loans ─────────────────────────────────────── */
router.get('/', async (req, res) => {
  try {
    const { borrowerAddress, loanId, page = 1, limit = 100 } = req.query;
    const q = {};
    if (borrowerAddress) q.borrowerAddress = borrowerAddress.toLowerCase();
    if (loanId)          q.loanId = parseInt(loanId);
    const loans = await Loan.find(q).sort({ createdAt: -1 }).limit(parseInt(limit)).skip((parseInt(page) - 1) * parseInt(limit));
    res.json({ success: true, loans });
  } catch (e) { res.status(500).json({ success: false, message: e.message }); }
});

/* ─── CREATE loan ───────────────────────────────────────── */
router.post('/', protect, async (req, res) => {
  try {
    const { loanId, borrowerAddress, borrowerName, amount, interestRate, duration, purpose, category, ipfsHash, collateralType, collateralAmount } = req.body;

    const existing = await Loan.findOne({ loanId: parseInt(loanId) });
    if (existing) return res.json({ success: true, loan: existing });

    const user = await User.findOne({ walletAddress: borrowerAddress?.toLowerCase() });

    // ── Fraud detection ──────────────────────────────────
    const fraudFlags = [];
    if (user) {
      const ageDays = (Date.now() - new Date(user.createdAt)) / 86400000;
      if (ageDays < 3) fraudFlags.push({ type: 'new_account', severity: 'medium', desc: `Account only ${Math.floor(ageDays)} days old` });
      if ((user.creditScore || 650) < 400) fraudFlags.push({ type: 'low_credit', severity: 'high', desc: `Credit score: ${user.creditScore}` });
      const prevLoans   = await Loan.find({ borrowerAddress: borrowerAddress?.toLowerCase() });
      const prevDefault = prevLoans.filter(l => l.status === 3).length;
      if (prevDefault > 0) fraudFlags.push({ type: 'previous_defaults', severity: 'high', desc: `${prevDefault} defaulted loan(s) on record` });
      const maxLoan = (user.creditScore >= 700) ? 5 : (user.creditScore >= 600) ? 2 : 0.5;
      if (parseFloat(amount) > maxLoan * 1.5) fraudFlags.push({ type: 'amount_exceeds', severity: 'high', desc: `Requesting ${amount} ETH, credit allows ~${maxLoan} ETH` });
    }

    const riskLevel = fraudFlags.some(f => f.severity === 'high') ? 'high' : fraudFlags.length > 0 ? 'medium' : 'low';

    const loan = await Loan.create({
      loanId:           parseInt(loanId),
      borrowerAddress:  borrowerAddress?.toLowerCase(),
      borrowerName:     borrowerName || user?.name || 'Unknown',
      amount:           amount?.toString(),
      interestRate:     parseFloat(interestRate),
      duration:         parseInt(duration),
      purpose:          purpose || '',
      category:         category || 'other',
      ipfsHash:         ipfsHash || '',
      status:           0,
      collateralType:   collateralType || 'none',
      collateralAmount: collateralAmount || '0',
      fraudFlags,
      riskLevel,
    });

    res.status(201).json({ success: true, loan });
  } catch (e) { res.status(500).json({ success: false, message: e.message }); }
});

/* ─── FUND loan ─────────────────────────────────────────── */
router.post('/:loanId/fund', protect, async (req, res) => {
  try {
    const { lenderAddress, lenderName, amount, amountFunded, isFullyFunded } = req.body;
    const loan = await Loan.findOne({ loanId: parseInt(req.params.loanId) });
    if (!loan) return res.status(404).json({ success: false, message: 'Loan not found' });

    loan.investments = loan.investments || [];
    const already = loan.investments.find(i => i.lenderAddress === lenderAddress?.toLowerCase());
    if (!already) {
      loan.investments.push({ lenderAddress: lenderAddress?.toLowerCase(), lenderName: lenderName || 'Unknown', amount: amount?.toString(), investedAt: new Date() });
    }
    loan.fundedAmount = amountFunded?.toString();
    if (isFullyFunded) { loan.status = 1; loan.fundedAt = new Date(); }
    await loan.save();
    res.json({ success: true, loan });
  } catch (e) { res.status(500).json({ success: false, message: e.message }); }
});

/* ─── REPAY loan — UPDATES CREDIT SCORE ────────────────── */
router.post('/:loanId/repay', protect, async (req, res) => {
  try {
    const { borrowerAddress, repaidAmount } = req.body;
    const loan = await Loan.findOne({ loanId: parseInt(req.params.loanId) });
    if (!loan) return res.status(404).json({ success: false, message: 'Loan not found' });

    loan.status      = 2;
    loan.repaid      = true;
    loan.repaidAt    = new Date();
    loan.repaidAmount = repaidAmount?.toString();
    if (loan.collateralType === 'eth') loan.collateralStatus = 'released';
    await loan.save();

    // ── CRITICAL: recalculate and save credit score ──────
    const borrower = await User.findOne({ walletAddress: borrowerAddress?.toLowerCase() });
    if (borrower) {
      const allLoans = await Loan.find({ borrowerAddress: borrowerAddress?.toLowerCase() });
      const newScore = calcScore(allLoans, borrower.kycStatus === 'verified', borrower.createdAt);
      const oldScore = borrower.creditScore || 650;

      borrower.creditScore = newScore;
      await borrower.save();

      // Notify borrower
      await Notification.create({
        userId:  borrower._id,
        title:   newScore > oldScore ? `🎉 Credit Score Increased! ${oldScore} → ${newScore}` : '✅ Loan Repaid Successfully',
        message: `Loan #${loan.loanId} repaid. Credit score: ${newScore}${newScore > oldScore ? ` (+${newScore - oldScore})` : ''}.`,
        type:    'loan_repaid',
      });

      // Notify all lenders
      for (const inv of (loan.investments || [])) {
        const lender = await User.findOne({ walletAddress: inv.lenderAddress });
        if (lender) {
          await Notification.create({
            userId:  lender._id,
            title:   '💰 Loan Repaid — Funds Returned!',
            message: `Loan #${loan.loanId} was repaid. Your ${inv.amount} ETH + interest is back in your wallet.`,
            type:    'loan_repaid',
          });
        }
      }

      return res.json({ success: true, loan, newCreditScore: newScore, oldCreditScore: oldScore, scoreDiff: newScore - oldScore });
    }

    res.json({ success: true, loan });
  } catch (e) { res.status(500).json({ success: false, message: e.message }); }
});

/* ─── GET loan history for a wallet ────────────────────── */
router.get('/history/:address', async (req, res) => {
  try {
    const addr  = req.params.address.toLowerCase();
    const loans  = await Loan.find({ borrowerAddress: addr });
    const funded = await Loan.find({ 'investments.lenderAddress': addr });
    res.json({ success: true, loans, funded });
  } catch (e) { res.status(500).json({ success: false, message: e.message }); }
});

module.exports = router;
