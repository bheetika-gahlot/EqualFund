// routes/reminders.js
// Auto EMI reminder system — runs every 24 hours
const express  = require('express');
const router   = express.Router();
const mongoose = require('mongoose');
const Loan     = require('../models/Loan');
const User     = require('../models/User');
const Notification = require('../models/Notification');

// ── CHECK DUE LOANS & SEND REMINDERS ─────────────────────
const checkDueLoans = async () => {
  try {
    const now      = new Date();
    const loans    = await Loan.find({ status: 1, repaid: false }); // Active loans

    for (const loan of loans) {
      if (!loan.fundedAt) continue;

      const dueDate  = new Date(loan.fundedAt);
      dueDate.setDate(dueDate.getDate() + loan.duration);

      const daysLeft = Math.ceil((dueDate - now) / 86400000);

      // Find borrower
      const borrower = await User.findOne({
        walletAddress: loan.borrowerAddress?.toLowerCase()
      });
      if (!borrower) continue;

      // Send reminders at 7 days, 3 days, 1 day, and overdue
      if (daysLeft === 7) {
        await Notification.create({
          userId:  borrower._id,
          title:   '⏰ Loan Due in 7 Days',
          message: `Your loan of ${loan.amount} ETH is due in 7 days on ${dueDate.toLocaleDateString()}. Please arrange repayment to maintain your credit score.`,
          type:    'emi_reminder',
        });
      } else if (daysLeft === 3) {
        await Notification.create({
          userId:  borrower._id,
          title:   '🔔 Urgent: Loan Due in 3 Days',
          message: `URGENT: Your loan of ${loan.amount} ETH is due in 3 days! Repay now to avoid credit score penalty.`,
          type:    'emi_reminder',
        });
      } else if (daysLeft === 1) {
        await Notification.create({
          userId:  borrower._id,
          title:   '🚨 Final Reminder: Due Tomorrow!',
          message: `FINAL REMINDER: Your loan of ${loan.amount} ETH is due TOMORROW! Failure to repay will result in credit score reduction and loan default.`,
          type:    'emi_reminder',
        });
      } else if (daysLeft <= 0) {
        // OVERDUE — mark as defaulted and penalize
        await Loan.findByIdAndUpdate(loan._id, { status: 3 }); // Defaulted

        await Notification.create({
          userId:  borrower._id,
          title:   '🔴 Loan DEFAULTED — Account Restricted',
          message: `Your loan of ${loan.amount} ETH is OVERDUE. Your account has been restricted from creating new loans. Credit score penalized -100 points.`,
          type:    'loan_defaulted',
        });

        // Notify all lenders
        for (const inv of loan.investments || []) {
          const lender = await User.findOne({ walletAddress: inv.lenderAddress?.toLowerCase() });
          if (lender) {
            await Notification.create({
              userId:  lender._id,
              title:   '⚠️ Loan Defaulted',
              message: `Borrower has defaulted on loan #${loan.loanId}. Smart contract will handle recovery. We apologize for the inconvenience.`,
              type:    'loan_defaulted',
            });
          }
        }

        console.log(`🔴 Loan #${loan.loanId} marked as defaulted`);
      }
    }
    console.log(`✅ EMI check complete — ${loans.length} loans checked`);
  } catch (e) {
    console.error('EMI check error:', e.message);
  }
};

// ── RUN EMI CHECK ─────────────────────────────────────────
// Called by server.js on startup and every 24 hours
const startEMIReminders = () => {
  // Run immediately on startup
  setTimeout(checkDueLoans, 5000);

  // Run every 24 hours
  setInterval(checkDueLoans, 24 * 60 * 60 * 1000);
  console.log('✅ EMI reminder system started');
};

// ── MANUAL TRIGGER (for testing) ─────────────────────────
router.post('/check-now', async (req, res) => {
  await checkDueLoans();
  res.json({ success: true, message: 'EMI check completed' });
});

module.exports = router;
module.exports.startEMIReminders = startEMIReminders;
