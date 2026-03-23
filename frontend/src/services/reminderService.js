// reminderService.js
// Call this once when the app loads to set up daily loan reminders
// Place in: frontend/src/services/reminderService.js

import { notificationsAPI } from './apiService';

export async function checkAndSendReminders(loans, account) {
  if (!account || !loans?.length) return;

  const token = localStorage.getItem('ef-token');
  if (!token) return; // Only send if user is logged in

  for (const loan of loans) {
    // Only check active loans that belong to this user
    if (loan.status !== 1) continue;
    if (loan.borrower?.toLowerCase() !== account?.toLowerCase()) continue;
    if (!loan.fundedAt) continue;

    const fundedDate = new Date(loan.fundedAt * 1000); // blockchain timestamp
    const dueDate = new Date(fundedDate);
    dueDate.setDate(dueDate.getDate() + parseInt(loan.duration));

    const now = new Date();
    const daysLeft = Math.ceil((dueDate - now) / (1000 * 60 * 60 * 24));
    const lastReminderKey = `reminder_${loan.id}_${new Date().toDateString()}`;

    // Only send one reminder per day per loan
    if (localStorage.getItem(lastReminderKey)) continue;

    let title = '';
    let message = '';
    let shouldSend = false;

    if (daysLeft <= 0) {
      title = '🚨 OVERDUE: Loan Repayment Required!';
      message = `Loan #${loan.id} of ${loan.amount} ETH is OVERDUE. Repay immediately to avoid default and credit score penalty.`;
      shouldSend = true;
    } else if (daysLeft === 1) {
      title = '🔴 Final Reminder: Repay Tomorrow!';
      message = `Your loan #${loan.id} of ${loan.amount} ETH is due TOMORROW. Repay ${(parseFloat(loan.amount) * (1 + parseFloat(loan.interestRate)/100)).toFixed(4)} ETH to stay in good standing.`;
      shouldSend = true;
    } else if (daysLeft <= 3) {
      title = `⚠️ Urgent: ${daysLeft} Days Left to Repay`;
      message = `Loan #${loan.id} of ${loan.amount} ETH is due in ${daysLeft} days. Don't forget to repay!`;
      shouldSend = true;
    } else if (daysLeft <= 7) {
      title = `⏰ Reminder: ${daysLeft} Days Until Repayment`;
      message = `Your loan #${loan.id} of ${loan.amount} ETH is due in ${daysLeft} days on ${dueDate.toLocaleDateString()}.`;
      shouldSend = true;
    } else {
      // Daily reminder for all active loans
      title = `💰 Active Loan Reminder — ${daysLeft} Days Left`;
      message = `Loan #${loan.id}: ${loan.amount} ETH due in ${daysLeft} days on ${dueDate.toLocaleDateString()}.`;
      shouldSend = true;
    }

    if (shouldSend) {
      try {
        await notificationsAPI.create(title, message, 'loan_funded', loan.id, '', loan.amount);
        localStorage.setItem(lastReminderKey, '1');
      } catch (e) {
        // Silent fail — don't break app if reminders fail
      }
    }
  }
}
