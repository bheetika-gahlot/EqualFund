// backend/services/fraudDetection.js
const User = require('../models/User');
const Loan = require('../models/Loan');

const WEIGHTS = {
  new_account:        30,
  low_credit:         50,
  previous_defaults:  80,
  multiple_kyc:       40,
  amount_exceeds:     50,
  no_repayments:      20,
};

const SCORE_TO_MAX_LOAN = {
  800: 10, 700: 5, 600: 2, 500: 0.5, 400: 0.1, 0: 0.05
};

const getMaxLoan = (score) => {
  const tiers = Object.keys(SCORE_TO_MAX_LOAN).map(Number).sort((a,b) => b-a);
  for (const tier of tiers) {
    if (score >= tier) return SCORE_TO_MAX_LOAN[tier];
  }
  return 0.05;
};

const assessFraudRisk = async (walletAddress, loanAmount) => {
  const flags = [];
  let riskScore = 0;

  const user = await User.findOne({ walletAddress: walletAddress?.toLowerCase() });
  if (!user) return { riskScore: 0, riskLevel: 'low', flags: [] };

  // 1. New account check
  const ageDays = (Date.now() - new Date(user.createdAt)) / 86400000;
  if (ageDays < 3) {
    flags.push({ type: 'new_account', severity: 'medium', desc: `Account only ${Math.floor(ageDays)} days old` });
    riskScore += WEIGHTS.new_account;
  }

  // 2. Low credit score
  if ((user.creditScore || 650) < 400) {
    flags.push({ type: 'low_credit', severity: 'high', desc: `Credit score: ${user.creditScore}` });
    riskScore += WEIGHTS.low_credit;
  }

  // 3. Previous defaults
  const allLoans = await Loan.find({ borrowerAddress: walletAddress?.toLowerCase() });
  const defaults = allLoans.filter(l => l.status === 3);
  if (defaults.length > 0) {
    flags.push({ type: 'previous_defaults', severity: 'high', desc: `${defaults.length} defaulted loan(s) on record` });
    riskScore += WEIGHTS.previous_defaults * Math.min(defaults.length, 2);
  }

  // 4. Amount exceeds credit limit
  const maxLoan = getMaxLoan(user.creditScore || 650);
  if (parseFloat(loanAmount) > maxLoan * 1.5) {
    flags.push({ type: 'amount_exceeds', severity: 'high', desc: `Requesting ${loanAmount} ETH but credit allows ${maxLoan} ETH` });
    riskScore += WEIGHTS.amount_exceeds;
  }

  // 5. No repayment history (new borrower with large loan)
  const completed = allLoans.filter(l => l.status === 2).length;
  if (completed === 0 && allLoans.length === 0 && parseFloat(loanAmount) > 1) {
    flags.push({ type: 'no_repayments', severity: 'low', desc: 'No repayment history' });
    riskScore += WEIGHTS.no_repayments;
  }

  const riskLevel = riskScore >= 80 ? 'high' : riskScore >= 40 ? 'medium' : 'low';

  return { riskScore, riskLevel, flags, approved: riskScore < 100 };
};

module.exports = { assessFraudRisk };
