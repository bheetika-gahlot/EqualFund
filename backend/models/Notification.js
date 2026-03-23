const mongoose = require('mongoose');

const NotificationSchema = new mongoose.Schema(
  {
    // Who gets this notification
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },

    // Notification content
    title: { type: String, required: true },
    message: { type: String, required: true },

    // Type of notification
    type: {
      type: String,
      enum: [
        'loan_created',       // borrower created a loan
        'loan_funded',        // lender funded a loan
        'loan_fully_funded',  // loan reached 100% funding
        'loan_repaid',        // borrower repaid
        'loan_defaulted',     // loan defaulted
        'kyc_submitted',      // kyc docs submitted
        'kyc_verified',       // kyc approved
        'credit_score',       // credit score changed
        'investment_return',  // lender received repayment
        'system',             // general system message
      ],
      default: 'system',
    },

    // Related blockchain data
    loanId: { type: Number, default: null },
    txHash: { type: String, default: '' },
    amount: { type: String, default: '' },

    // Status
    read: { type: Boolean, default: false },
    readAt: { type: Date, default: null },
  },
  { timestamps: true }
);

// Index for fast unread count queries
NotificationSchema.index({ userId: 1, read: 1 });

module.exports = mongoose.model('Notification', NotificationSchema);
