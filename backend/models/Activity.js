const mongoose = require('mongoose');

const ActivitySchema = new mongoose.Schema(
  {
    // Who did this action
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      index: true,
    },
    walletAddress: {
      type: String,
      lowercase: true,
      index: true,
    },

    // What happened
    action: {
      type: String,
      enum: [
        'register',           // new user registered
        'login',              // user logged in
        'wallet_connected',   // metamask connected
        'kyc_submitted',      // kyc submitted
        'loan_created',       // loan request created
        'loan_funded',        // funded a loan
        'loan_repaid',        // repaid a loan
        'profile_updated',    // profile details changed
        'notification_read',  // read a notification
      ],
      required: true,
    },

    // Extra details about the action
    details: {
      loanId: { type: Number, default: null },
      amount: { type: String, default: '' },
      txHash: { type: String, default: '' },
      ipfsHash: { type: String, default: '' },
      description: { type: String, default: '' },
    },

    // Request info
    ipAddress: { type: String, default: '' },
    userAgent: { type: String, default: '' },

    // Status of the action
    status: {
      type: String,
      enum: ['success', 'failed', 'pending'],
      default: 'success',
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Activity', ActivitySchema);
