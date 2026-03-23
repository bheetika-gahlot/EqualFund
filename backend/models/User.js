const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const UserSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Name is required'],
      trim: true,
      maxlength: 50,
    },
    email: {
      type: String,
      required: [true, 'Email is required'],
      unique: true,
      lowercase: true,
      trim: true,
      match: [/^\S+@\S+\.\S+$/, 'Please enter a valid email'],
    },
    password: {
      type: String,
      required: [true, 'Password is required'],
      minlength: 6,
      select: false, // never return password in queries
    },
    role: {
      type: String,
      enum: ['borrower', 'lender', 'admin'],
      default: 'borrower',
    },

    // Blockchain identity
    walletAddress: {
      type: String,
      unique: true,
      sparse: true, // allow multiple null values
      lowercase: true,
      trim: true,
    },

    // Profile
    avatar: { type: String, default: '' },
    bio: { type: String, default: '', maxlength: 200 },
    phone: { type: String, default: '' },
    country: { type: String, default: '' },

    // KYC status (mirrors what's on blockchain)
    kycStatus: {
      type: String,
      enum: ['none', 'pending', 'verified', 'rejected'],
      default: 'none',
    },
    kycIpfsHash: { type: String, default: '' },

    // Stats (cached from blockchain for fast display)
    totalLoans: { type: Number, default: 0 },
    totalInvested: { type: Number, default: 0 },
    creditScore: { type: Number, default: 650 },

    // Account status
    isActive: { type: Boolean, default: true },
    adminBlocked: { type: Boolean, default: false },
  },
  { timestamps: true }
);

// Hash password before saving
UserSchema.pre('save', async function (next) {
  if (!this.isModified('password')) return next();
  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
  next();
});

// Compare password method
UserSchema.methods.matchPassword = async function (enteredPassword) {
  return await bcrypt.compare(enteredPassword, this.password);
};

// Remove password from JSON output
UserSchema.methods.toJSON = function () {
  const obj = this.toObject();
  delete obj.password;
  return obj;
};

module.exports = mongoose.model('User', UserSchema);
