const mongoose = require('mongoose');

const refreshTokenSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true
    },
    sessionId: {
      type: String,
      required: true,
      index: true
    },
    jti: {
      type: String,
      required: true,
      unique: true,
      index: true
    },
    tokenHash: {
      type: String,
      required: true,
      unique: true,
      index: true
    },
    familyId: {
      type: String,
      required: true,
      index: true
    },
    parentTokenId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'RefreshToken',
      default: null
    },
    issuedAt: {
      type: Date,
      default: Date.now,
      index: true
    },
    expiresAt: {
      type: Date,
      required: true,
      index: true
    },
    usedAt: {
      type: Date,
      default: null
    },
    revokedAt: {
      type: Date,
      default: null
    },
    revokeReason: {
      type: String,
      default: ''
    },
    createdByIp: String,
    createdByUa: String
  },
  {
    timestamps: true,
    collection: 'refresh_tokens'
  }
);

refreshTokenSchema.index({ userId: 1, sessionId: 1, expiresAt: 1 });

module.exports = mongoose.model('RefreshToken', refreshTokenSchema);
