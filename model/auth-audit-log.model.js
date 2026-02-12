const mongoose = require('mongoose');

const authAuditLogSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      index: true,
      default: null
    },
    sessionId: {
      type: String,
      index: true,
      default: ''
    },
    event: {
      type: String,
      enum: [
        'REGISTER_SUCCESS',
        'VERIFY_EMAIL_SUCCESS',
        'LOGIN_SUCCESS',
        'LOGIN_FAILED',
        'TOKEN_REFRESH_SUCCESS',
        'TOKEN_REFRESH_REUSE_DETECTED',
        'LOGOUT',
        'LOGOUT_ALL',
        'PASSWORD_CHANGED'
      ],
      required: true,
      index: true
    },
    ip: String,
    userAgent: String,
    meta: {
      type: mongoose.Schema.Types.Mixed,
      default: {}
    }
  },
  {
    timestamps: { createdAt: true, updatedAt: false },
    collection: 'auth_audit_logs'
  }
);

authAuditLogSchema.index({ createdAt: 1 }, { expireAfterSeconds: 60 * 60 * 24 * 365 });

module.exports = mongoose.model('AuthAuditLog', authAuditLogSchema);
