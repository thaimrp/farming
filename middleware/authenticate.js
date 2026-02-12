const jwt = require('jsonwebtoken');
const asyncHandler = require('../helpers/async.handler');
const AppError = require('../helpers/apperror');
const User = require('../model/user.model');
const AuthSession = require('../model/auth-session.model');

module.exports = asyncHandler(async (req, res, next) => {
  const authHeader = req.headers.authorization || '';
  if (!authHeader.startsWith('Bearer ')) {
    throw new AppError('Unauthorized', 401, 'E_AUTH_MISSING_BEARER');
  }

  const token = authHeader.slice(7).trim();
  const decoded = jwt.verify(token, process.env.JWT_SECRET);

  const user = await User.findById(decoded.id);
  if (!user) throw new AppError('User not found', 401, 'E_AUTH_USER_NOT_FOUND');
  if (user.status !== 'ACTIVE') throw new AppError('User is not active', 403, 'E_AUTH_USER_INACTIVE');

  if (Number(decoded.ver) !== Number(user.refreshTokenVersion)) {
    throw new AppError('Token is expired. Please sign in again.', 401, 'E_AUTH_TOKEN_VERSION_MISMATCH');
  }

  if (decoded.sid) {
    const session = await AuthSession.findOne({
      userId: user._id,
      sessionId: decoded.sid,
      status: 'ACTIVE',
      expiresAt: { $gt: new Date() }
    });

    if (!session) {
      throw new AppError('Session is not active', 401, 'E_AUTH_SESSION_INACTIVE');
    }
  }

  req.user = user;
  req.auth = decoded;
  next();
});
