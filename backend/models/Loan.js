// backend/models/Loan.js
const mongoose = require('mongoose');

const investmentSchema = new mongoose.Schema({
  lenderAddress: String,
  lenderName:    String,
  amount:        String,
  investedAt:    { type: Date, default: Date.now },
  repaid:        { type: Boolean, default: false },
});

const fraudFlagSchema = new mongoose.Schema({
  type:      String,
  severity:  { type: String, enum: ['low', 'medium', 'high'], default: 'low' },
  count:     Number,
  createdAt: { type: Date, default: Date.now },
});

const loanSchema = new mongoose.Schema({
  loanId:          { type: Number, required: true, unique: true },
  borrowerAddress: { type: String, required: true, lowercase: true, index: true },
  borrowerName:    { type: String, default: 'Unknown' },
  amount:          { type: String, required: true },
  interestRate:    { type: Number, required: true },
  duration:        { type: Number, required: true },
  purpose:         { type: String, default: '' },
  category:        { type: String, default: 'other', enum: ['education','medical','business','emergency','housing','other'] },
  ipfsHash:        { type: String, default: '' },
  status:          { type: Number, default: 0, enum: [0, 1, 2, 3] }, // 0=Pending, 1=Active, 2=Repaid, 3=Defaulted
  fundedAmount:    { type: String, default: '0' },
  fundedAt:        Date,
  repaid:          { type: Boolean, default: false },
  repaidAt:        Date,
  repaidAmount:    String,
  investments:     [investmentSchema],

  // ── COLLATERAL ─────────────────────────────────────────
  collateralType:   { type: String, enum: ['eth', 'none'], default: 'none' },
  collateralAmount: { type: String, default: '0' },
  collateralTxHash: String,
  collateralStatus: { type: String, enum: ['locked', 'released', 'liquidated'], default: 'locked' },

  // ── FRAUD DETECTION ────────────────────────────────────
  fraudFlags:  [fraudFlagSchema],
  riskLevel:   { type: String, enum: ['low', 'medium', 'high'], default: 'low' },

  // ── RATINGS ───────────────────────────────────────────
  borrowerRating: { type: Number, min: 1, max: 5 },
  ratingComment:  String,
  ratedAt:        Date,
  ratedBy:        String,
}, {
  timestamps: true,
});

// Index for efficient querying
loanSchema.index({ borrowerAddress: 1, status: 1 });
loanSchema.index({ 'investments.lenderAddress': 1 });

module.exports = mongoose.models.Loan || mongoose.model('Loan', loanSchema);
