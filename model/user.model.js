const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema(
  {
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
      index: true
    },
    phone: {
      type: String,
      trim: true,
      sparse: true,
      index: true
    },
    passwordHash: {
      type: String,
      required: true,
      select: false
    },
    passwordChangedAt: Date,
    refreshTokenVersion: {
      type: Number,
      default: 0
    },
    roles: {
      type: [String],
      enum: ['customer', 'farmer', 'support', 'finance', 'admin', 'superadmin'],
      default: ['customer'],
      index: true
    },
    status: {
      type: String,
      enum: ['PENDING_VERIFY', 'ACTIVE', 'SUSPENDED', 'LOCKED', 'DELETED'],
      default: 'PENDING_VERIFY',
      index: true
    },
    emailVerified: {
      type: Boolean,
      default: false
    },
    emailVerifiedAt: Date,
    emailVerifyToken: {
      type: String,
      select: false
    },
    mfaEnabled: {
      type: Boolean,
      default: false
    },
    mfaSecretEnc: {
      type: String,
      select: false
    },
    backupCodesHash: {
      type: [String],
      default: [],
      select: false
    },
    failedLoginCount: {
      type: Number,
      default: 0
    },
    lockUntil: Date,
    profile: {
      displayName: { type: String, trim: true, default: '' },
      avatarUrl: { type: String, trim: true, default: '' },
      locale: { type: String, default: 'th-TH' },
      timezone: { type: String, default: 'Asia/Bangkok' }
    },
    lastLoginAt: Date,
    lastLoginIp: String,
    lastLoginUa: String
  },
  {
    timestamps: true,
    collection: 'users'
  }
);

userSchema.index({ status: 1, roles: 1 });

userSchema.virtual('password').set(function setPassword(password) {
  this._password = password;
});

userSchema.pre('save', async function preSave(next) {
  if (!this._password) return next();

  if (typeof this._password !== 'string' || this._password.length < 8) {
    return next(new Error('Password must be at least 8 characters'));
  }

  const salt = await bcrypt.genSalt(12);
  this.passwordHash = await bcrypt.hash(this._password, salt);
  this.passwordChangedAt = new Date();
  return next();
});

userSchema.methods.comparePassword = function comparePassword(candidatePassword) {
  if (!this.passwordHash) return Promise.resolve(false);
  return bcrypt.compare(candidatePassword, this.passwordHash);
};

userSchema.methods.isLocked = function isLocked() {
  return Boolean(this.lockUntil && this.lockUntil > new Date());
};

module.exports = mongoose.model('User', userSchema);
