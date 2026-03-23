const mongoose = require('mongoose');

const investmentSchema = new mongoose.Schema({
  lenderAddress: { type: String, required: true },
  lenderName:    { type: String, default: 'Unknown' },
  lenderEmail:   { type: String, default: '' },
  amount:        { type: String, required: true },
  fundedAt:      { type: Date, default: Date.now },
});

const loanSchema = new mongoose.Schema({
  // Blockchain data
  loanId:        { type: Number, required: true, unique: true },
  borrowerAddress:{ type: String, required: true },
  borrowerName:  { type: String, default: 'Unknown' },
  borrowerEmail: { type: String, default: '' },
  amount:        { type: String, required: true },
  interestRate:  { type: Number, required: true },
  duration:      { type: Number, required: true },
  purpose:       { type: String, default: '' },
  category:      { type: String, default: 'Other' },
  ipfsHash:      { type: String, default: '' },

  // Status: 0=Pending, 1=Active, 2=Repaid, 3=Defaulted
  status:        { type: Number, default: 0 },
  statusLabel:   { type: String, default: 'Pending' },

  // Funding
  amountFunded:  { type: String, default: '0' },
  investments:   [investmentSchema],
  fundedAt:      { type: Date },

  // Repayment
  repaidAt:      { type: Date },
  repaidAmount:  { type: String, default: '0' },

  // Timestamps
  createdAt:     { type: Date, default: Date.now },
  updatedAt:     { type: Date, default: Date.now },
});

loanSchema.pre('save', function(next) {
  this.updatedAt = new Date();
  next();
});

module.exports = mongoose.model('Loan', loanSchema);
