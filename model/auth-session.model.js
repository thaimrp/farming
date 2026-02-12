const mongoose = require('mongoose');

const authSessionSchema = new mongoose.Schema(
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
      unique: true,
      index: true
    },
    deviceId: {
      type: String,
      index: true
    },
    userAgent: String,
    ip: String,
    status: {
      type: String,
      enum: ['ACTIVE', 'REVOKED', 'EXPIRED'],
      default: 'ACTIVE',
      index: true
    },
    expiresAt: {
      type: Date,
      required: true,
      index: true
    },
    lastSeenAt: {
      type: Date,
      default: Date.now
    },
    revokedAt: {
      type: Date,
      default: null
    },
    revokeReason: {
      type: String,
      default: ''
    }
  },
  {
    timestamps: true,
    collection: 'auth_sessions'
  }
);

authSessionSchema.index({ userId: 1, status: 1, createdAt: -1 });

module.exports = mongoose.model('AuthSession', authSessionSchema);
