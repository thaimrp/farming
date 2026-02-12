const rateLimit = require('express-rate-limit');
const { ipKeyGenerator } = require('express-rate-limit');
const AppError = require('../helpers/apperror');

function toInt(value, fallback) {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

function createLimiter({ windowMs, max, keyGenerator, code }) {
  return rateLimit({
    windowMs,
    max,
    standardHeaders: true,
    legacyHeaders: false,
    keyGenerator,
    handler: (req, res) => {
      const err = new AppError('Too many requests, please try again later.', 429, code || 'E_RATE_LIMIT');
      res.status(429).json({
        result: false,
        code: err.errorCode || 'E_RATE_LIMIT',
        message: err.message,
        data: null
      });
    }
  });
}

const globalLimiter = createLimiter({
  windowMs: toInt(process.env.GLOBAL_RATE_LIMIT_WINDOW_MS, 60 * 1000),
  max: toInt(process.env.GLOBAL_RATE_LIMIT_MAX, 200),
  code: 'E_RATE_LIMIT_GLOBAL'
});

const loginLimiter = createLimiter({
  windowMs: toInt(process.env.LOGIN_RATE_LIMIT_WINDOW_MS, 10 * 60 * 1000),
  max: toInt(process.env.LOGIN_RATE_LIMIT_MAX, 10),
  keyGenerator: (req) => {
    const ipKey = ipKeyGenerator(req.ip || '');
    const email = String(req.body?.email || '').trim().toLowerCase();
    return `${ipKey}|${email}`;
  },
  code: 'E_RATE_LIMIT_LOGIN'
});

const refreshLimiter = createLimiter({
  windowMs: toInt(process.env.REFRESH_RATE_LIMIT_WINDOW_MS, 5 * 60 * 1000),
  max: toInt(process.env.REFRESH_RATE_LIMIT_MAX, 30),
  code: 'E_RATE_LIMIT_REFRESH'
});

const registerLimiter = createLimiter({
  windowMs: toInt(process.env.REGISTER_RATE_LIMIT_WINDOW_MS, 10 * 60 * 1000),
  max: toInt(process.env.REGISTER_RATE_LIMIT_MAX, 5),
  keyGenerator: (req) => {
    const ipKey = ipKeyGenerator(req.ip || '');
    const email = String(req.body?.email || '').trim().toLowerCase();
    return `${ipKey}|${email}`;
  },
  code: 'E_RATE_LIMIT_REGISTER'
});

const verifyLimiter = createLimiter({
  windowMs: toInt(process.env.VERIFY_RATE_LIMIT_WINDOW_MS, 10 * 60 * 1000),
  max: toInt(process.env.VERIFY_RATE_LIMIT_MAX, 30),
  code: 'E_RATE_LIMIT_VERIFY'
});

module.exports = {
  globalLimiter,
  loginLimiter,
  refreshLimiter,
  registerLimiter,
  verifyLimiter
};
