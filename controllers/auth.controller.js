const crypto = require('crypto');
const jwt = require('jsonwebtoken');

const User = require('../model/user.model');
const AuthSession = require('../model/auth-session.model');
const RefreshToken = require('../model/refresh-token.model');
const AuthAuditLog = require('../model/auth-audit-log.model');

const AppError = require('../helpers/apperror');
const asyncHandler = require('../helpers/async.handler');
const response = require('../helpers/response');
const mail = require('../helpers/mail.helper');

const REFRESH_COOKIE_NAME = process.env.REFRESH_COOKIE_NAME || 'refreshToken';
const AUTH_COOKIE_PATH = process.env.AUTH_COOKIE_PATH || '/bck/at';
const SESSION_EXPIRES_IN_DAYS = Number(process.env.SESSION_EXPIRES_IN_DAYS || 30);
const REFRESH_TOKEN_EXPIRES_IN = process.env.REFRESH_TOKEN_EXPIRES_IN || '7d';

function parseDurationToMs(input) {
  if (!input) return 7 * 24 * 60 * 60 * 1000;
  if (/^\d+$/.test(String(input))) return Number(input);

  const match = String(input).trim().match(/^(\d+)([smhd])$/i);
  if (!match) return 7 * 24 * 60 * 60 * 1000;

  const value = Number(match[1]);
  const unit = match[2].toLowerCase();
  const multipliers = {
    s: 1000,
    m: 60 * 1000,
    h: 60 * 60 * 1000,
    d: 24 * 60 * 60 * 1000
  };
  return value * multipliers[unit];
}

function addMs(date, ms) {
  return new Date(date.getTime() + ms);
}

function getClientIp(req) {
  const forwarded = req.headers['x-forwarded-for'];
  if (typeof forwarded === 'string' && forwarded.length) {
    return forwarded.split(',')[0].trim();
  }
  return req.ip || '';
}

function getUserAgent(req) {
  return req.headers['user-agent'] || '';
}

function hashRefreshToken(rawToken) {
  const pepper = process.env.REFRESH_TOKEN_PEPPER || process.env.JWT_SECRET || '';
  return crypto.createHash('sha256').update(`${rawToken}.${pepper}`).digest('hex');
}

function getCookieOptions(expiresAt) {
  return {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: AUTH_COOKIE_PATH,
    expires: expiresAt
  };
}

function setRefreshCookie(res, rawToken, expiresAt) {
  res.cookie(REFRESH_COOKIE_NAME, rawToken, getCookieOptions(expiresAt));
}

function clearRefreshCookie(res) {
  res.clearCookie(REFRESH_COOKIE_NAME, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: AUTH_COOKIE_PATH
  });
}

function signAccessToken(user, sessionId) {
  const payload = {
    id: user._id,
    roles: user.roles,
    ver: user.refreshTokenVersion,
    sid: sessionId
  };

  return jwt.sign(payload, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN || '15m'
  });
}

async function writeAuditLog({ userId = null, sessionId = '', event, req, meta = {} }) {
  await AuthAuditLog.create({
    userId,
    sessionId,
    event,
    ip: getClientIp(req),
    userAgent: getUserAgent(req),
    meta
  });
}

async function issueSessionTokens({ user, req, familyId = null, parentTokenId = null, existingSessionId = null }) {
  const now = new Date();
  const sessionExpiry = addMs(now, SESSION_EXPIRES_IN_DAYS * 24 * 60 * 60 * 1000);
  const refreshExpiry = addMs(now, parseDurationToMs(REFRESH_TOKEN_EXPIRES_IN));

  const sessionId = existingSessionId || crypto.randomUUID();
  const resolvedFamilyId = familyId || crypto.randomUUID();

  if (!existingSessionId) {
    await AuthSession.create({
      userId: user._id,
      sessionId,
      deviceId: String(req.headers['x-device-id'] || '').trim() || undefined,
      userAgent: getUserAgent(req),
      ip: getClientIp(req),
      status: 'ACTIVE',
      expiresAt: sessionExpiry,
      lastSeenAt: now
    });
  } else {
    await AuthSession.updateOne(
      { sessionId: existingSessionId, userId: user._id, status: 'ACTIVE' },
      { $set: { lastSeenAt: now, expiresAt: sessionExpiry, ip: getClientIp(req), userAgent: getUserAgent(req) } }
    );
  }

  const rawRefreshToken = crypto.randomBytes(64).toString('hex');
  const tokenHash = hashRefreshToken(rawRefreshToken);

  await RefreshToken.create({
    userId: user._id,
    sessionId,
    jti: crypto.randomUUID(),
    tokenHash,
    familyId: resolvedFamilyId,
    parentTokenId,
    issuedAt: now,
    expiresAt: refreshExpiry,
    createdByIp: getClientIp(req),
    createdByUa: getUserAgent(req)
  });

  const accessToken = signAccessToken(user, sessionId);

  return {
    sessionId,
    accessToken,
    rawRefreshToken,
    refreshExpiry,
    familyId: resolvedFamilyId
  };
}

function getRefreshTokenFromRequest(req) {
  const fromCookie = req.cookies?.[REFRESH_COOKIE_NAME];
  if (fromCookie) return String(fromCookie);

  const fromBody = req.body?.refreshToken;
  if (fromBody) return String(fromBody);

  return '';
}

exports.register = asyncHandler(async (req, res) => {
  const { email, password, displayName } = req.body || {};

  if (!email || !password) {
    throw new AppError('Email and password are required', 400, 'E_AUTH_MISSING_CREDENTIALS');
  }

  const normalizedEmail = String(email).trim().toLowerCase();
  const existing = await User.findOne({ email: normalizedEmail });
  if (existing) throw new AppError('Email already exists', 400, 'E_AUTH_EMAIL_EXISTS');

  const verifyToken = crypto.randomBytes(32).toString('hex');

  const user = new User({
    email: normalizedEmail,
    emailVerified: false,
    emailVerifyToken: verifyToken,
    status: 'PENDING_VERIFY',
    profile: {
      displayName: String(displayName || '').trim(),
      avatarUrl: '',
      locale: 'th-TH',
      timezone: 'Asia/Bangkok'
    }
  });
  user.password = password;
  await user.save();

  const verifyLink = `${process.env.CLIENT_URL || 'http://localhost:5173'}/verify/${verifyToken}`;
  const mailResult = await mail.sendVerifyEmail(user.email, verifyLink);

  await writeAuditLog({
    userId: user._id,
    event: 'REGISTER_SUCCESS',
    req,
    meta: { email: user.email }
  });

  response.success(
    res,
    {
      userId: user._id,
      email: user.email,
      previewUrl: mailResult.previewUrl || null
    },
    'Register successful. Please verify your email.',
    201
  );
});

exports.verifyEmail = asyncHandler(async (req, res) => {
  const token = String(req.params.token || '').trim();
  if (!token) throw new AppError('Invalid token', 400, 'E_AUTH_INVALID_VERIFY_TOKEN');

  const user = await User.findOne({ emailVerifyToken: token }).select('+emailVerifyToken');
  if (!user) throw new AppError('Invalid or expired token', 400, 'E_AUTH_INVALID_VERIFY_TOKEN');

  user.emailVerified = true;
  user.emailVerifiedAt = new Date();
  user.emailVerifyToken = undefined;
  if (user.status === 'PENDING_VERIFY') {
    user.status = 'ACTIVE';
  }

  await user.save();

  await writeAuditLog({
    userId: user._id,
    event: 'VERIFY_EMAIL_SUCCESS',
    req
  });

  response.success(res, null, 'Email verified successfully');
});

exports.login = asyncHandler(async (req, res) => {
  const { email, password } = req.body || {};

  if (!email || !password) {
    throw new AppError('Email and password are required', 400, 'E_AUTH_MISSING_CREDENTIALS');
  }

  const normalizedEmail = String(email).trim().toLowerCase();
  const user = await User.findOne({ email: normalizedEmail }).select('+passwordHash');

  if (!user) {
    await writeAuditLog({ event: 'LOGIN_FAILED', req, meta: { reason: 'USER_NOT_FOUND', email: normalizedEmail } });
    throw new AppError('Invalid credentials', 401, 'E_AUTH_INVALID_CREDENTIALS');
  }

  if (user.isLocked()) {
    await writeAuditLog({ userId: user._id, event: 'LOGIN_FAILED', req, meta: { reason: 'ACCOUNT_LOCKED' } });
    throw new AppError('Account is temporarily locked', 423, 'E_AUTH_ACCOUNT_LOCKED');
  }

  const passwordOk = await user.comparePassword(password);
  if (!passwordOk) {
    user.failedLoginCount += 1;
    if (user.failedLoginCount >= 5) {
      user.lockUntil = new Date(Date.now() + 15 * 60 * 1000);
      user.status = 'LOCKED';
    }
    await user.save();
    await writeAuditLog({ userId: user._id, event: 'LOGIN_FAILED', req, meta: { reason: 'BAD_PASSWORD' } });
    throw new AppError('Invalid credentials', 401, 'E_AUTH_INVALID_CREDENTIALS');
  }

  if (!user.emailVerified) {
    await writeAuditLog({ userId: user._id, event: 'LOGIN_FAILED', req, meta: { reason: 'EMAIL_NOT_VERIFIED' } });
    throw new AppError('Email is not verified', 403, 'E_AUTH_EMAIL_NOT_VERIFIED');
  }

  if (!['ACTIVE', 'LOCKED'].includes(user.status)) {
    await writeAuditLog({ userId: user._id, event: 'LOGIN_FAILED', req, meta: { reason: 'INVALID_STATUS', status: user.status } });
    throw new AppError('Account is not allowed to sign in', 403, 'E_AUTH_ACCOUNT_NOT_ALLOWED');
  }

  user.failedLoginCount = 0;
  user.lockUntil = null;
  user.status = 'ACTIVE';
  user.lastLoginAt = new Date();
  user.lastLoginIp = getClientIp(req);
  user.lastLoginUa = getUserAgent(req);
  await user.save();

  const issued = await issueSessionTokens({ user, req });
  setRefreshCookie(res, issued.rawRefreshToken, issued.refreshExpiry);

  await writeAuditLog({ userId: user._id, sessionId: issued.sessionId, event: 'LOGIN_SUCCESS', req });

  response.success(res, {
    accessToken: issued.accessToken,
    tokenType: 'Bearer',
    expiresIn: process.env.JWT_EXPIRES_IN || '15m',
    user: {
      id: user._id,
      email: user.email,
      roles: user.roles,
      profile: user.profile
    }
  }, 'Login successful');
});

exports.refresh = asyncHandler(async (req, res) => {
  const rawRefreshToken = getRefreshTokenFromRequest(req);
  if (!rawRefreshToken) throw new AppError('Refresh token is required', 401, 'E_AUTH_REFRESH_MISSING');

  const tokenHash = hashRefreshToken(rawRefreshToken);
  const tokenDoc = await RefreshToken.findOne({ tokenHash });

  if (!tokenDoc) {
    throw new AppError('Invalid refresh token', 401, 'E_AUTH_REFRESH_INVALID');
  }

  const now = new Date();
  if (tokenDoc.revokedAt || tokenDoc.expiresAt <= now || tokenDoc.usedAt) {
    await RefreshToken.updateMany(
      { userId: tokenDoc.userId, familyId: tokenDoc.familyId, revokedAt: null },
      { $set: { revokedAt: now, revokeReason: 'REUSE_OR_INVALID' } }
    );
    await AuthSession.updateOne(
      { userId: tokenDoc.userId, sessionId: tokenDoc.sessionId, status: 'ACTIVE' },
      { $set: { status: 'REVOKED', revokedAt: now, revokeReason: 'REUSE_OR_INVALID_REFRESH' } }
    );

    await writeAuditLog({
      userId: tokenDoc.userId,
      sessionId: tokenDoc.sessionId,
      event: 'TOKEN_REFRESH_REUSE_DETECTED',
      req,
      meta: { familyId: tokenDoc.familyId }
    });

    clearRefreshCookie(res);
    throw new AppError('Refresh token is no longer valid', 401, 'E_AUTH_REFRESH_REUSE_DETECTED');
  }

  const user = await User.findById(tokenDoc.userId);
  if (!user || user.status !== 'ACTIVE' || !user.emailVerified) {
    clearRefreshCookie(res);
    throw new AppError('User is not allowed to refresh token', 403, 'E_AUTH_REFRESH_USER_NOT_ALLOWED');
  }

  const session = await AuthSession.findOne({
    userId: tokenDoc.userId,
    sessionId: tokenDoc.sessionId,
    status: 'ACTIVE',
    expiresAt: { $gt: now }
  });
  if (!session) {
    clearRefreshCookie(res);
    throw new AppError('Session expired', 401, 'E_AUTH_SESSION_EXPIRED');
  }

  const markUsed = await RefreshToken.updateOne(
    { _id: tokenDoc._id, usedAt: null, revokedAt: null },
    { $set: { usedAt: now } }
  );
  if (!markUsed.modifiedCount) {
    clearRefreshCookie(res);
    throw new AppError('Refresh token already used', 401, 'E_AUTH_REFRESH_ALREADY_USED');
  }

  const issued = await issueSessionTokens({
    user,
    req,
    familyId: tokenDoc.familyId,
    parentTokenId: tokenDoc._id,
    existingSessionId: tokenDoc.sessionId
  });

  setRefreshCookie(res, issued.rawRefreshToken, issued.refreshExpiry);

  await writeAuditLog({
    userId: user._id,
    sessionId: issued.sessionId,
    event: 'TOKEN_REFRESH_SUCCESS',
    req
  });

  response.success(res, {
    accessToken: issued.accessToken,
    tokenType: 'Bearer',
    expiresIn: process.env.JWT_EXPIRES_IN || '15m'
  }, 'Token refreshed');
});

exports.logout = asyncHandler(async (req, res) => {
  const now = new Date();
  const sessionId = req.auth?.sid || '';

  if (sessionId) {
    await AuthSession.updateOne(
      { userId: req.user._id, sessionId, status: 'ACTIVE' },
      { $set: { status: 'REVOKED', revokedAt: now, revokeReason: 'USER_LOGOUT' } }
    );

    await RefreshToken.updateMany(
      { userId: req.user._id, sessionId, revokedAt: null },
      { $set: { revokedAt: now, revokeReason: 'USER_LOGOUT' } }
    );
  }

  clearRefreshCookie(res);

  await writeAuditLog({
    userId: req.user._id,
    sessionId,
    event: 'LOGOUT',
    req
  });

  response.success(res, null, 'Logged out');
});

exports.logoutAll = asyncHandler(async (req, res) => {
  const now = new Date();

  req.user.refreshTokenVersion += 1;
  await req.user.save();

  await AuthSession.updateMany(
    { userId: req.user._id, status: 'ACTIVE' },
    { $set: { status: 'REVOKED', revokedAt: now, revokeReason: 'LOGOUT_ALL' } }
  );

  await RefreshToken.updateMany(
    { userId: req.user._id, revokedAt: null },
    { $set: { revokedAt: now, revokeReason: 'LOGOUT_ALL' } }
  );

  clearRefreshCookie(res);

  await writeAuditLog({
    userId: req.user._id,
    sessionId: req.auth?.sid || '',
    event: 'LOGOUT_ALL',
    req
  });

  response.success(res, null, 'Logged out from all devices');
});

exports.changePassword = asyncHandler(async (req, res) => {
  const { currentPassword, newPassword } = req.body || {};

  if (!currentPassword || !newPassword) {
    throw new AppError('Current and new password are required', 400, 'E_AUTH_PASSWORD_FIELDS_REQUIRED');
  }

  if (String(newPassword).length < 8) {
    throw new AppError('New password must be at least 8 characters', 400, 'E_AUTH_PASSWORD_TOO_SHORT');
  }

  const user = await User.findById(req.user._id).select('+passwordHash');
  if (!user) throw new AppError('User not found', 404, 'E_AUTH_USER_NOT_FOUND');

  const match = await user.comparePassword(currentPassword);
  if (!match) throw new AppError('Current password is incorrect', 400, 'E_AUTH_PASSWORD_INVALID');

  user.password = newPassword;
  user.refreshTokenVersion += 1;
  await user.save();

  const now = new Date();
  await AuthSession.updateMany(
    { userId: user._id, status: 'ACTIVE' },
    { $set: { status: 'REVOKED', revokedAt: now, revokeReason: 'PASSWORD_CHANGED' } }
  );

  await RefreshToken.updateMany(
    { userId: user._id, revokedAt: null },
    { $set: { revokedAt: now, revokeReason: 'PASSWORD_CHANGED' } }
  );

  clearRefreshCookie(res);

  await writeAuditLog({
    userId: user._id,
    sessionId: req.auth?.sid || '',
    event: 'PASSWORD_CHANGED',
    req
  });

  response.success(res, null, 'Password changed. Please login again.');
});

exports.me = asyncHandler(async (req, res) => {
  response.success(res, {
    id: req.user._id,
    email: req.user.email,
    roles: req.user.roles,
    status: req.user.status,
    emailVerified: req.user.emailVerified,
    profile: req.user.profile
  }, 'Current user loaded');
});
