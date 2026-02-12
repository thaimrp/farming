function hasValue(v) {
  return v !== undefined && v !== null && String(v).trim() !== '';
}

function fail(messages) {
  const err = new Error(`Invalid environment configuration: ${messages.join('; ')}`);
  err.name = 'EnvValidationError';
  throw err;
}

function validateEnv() {
  const issues = [];

  if (!hasValue(process.env.JWT_SECRET)) {
    issues.push('JWT_SECRET is required');
  } else if (String(process.env.JWT_SECRET).length < 32) {
    issues.push('JWT_SECRET should be at least 32 characters');
  }

  const hasMongoUri = hasValue(process.env.MONGODB_URI);
  const hasMongoParts =
    hasValue(process.env.MONG_USER) &&
    hasValue(process.env.MONG_PASS) &&
    hasValue(process.env.MONG_HOST) &&
    hasValue(process.env.MONG_DATABASE);

  if (!hasMongoUri && !hasMongoParts) {
    issues.push('Set MONGODB_URI or all of MONG_USER/MONG_PASS/MONG_HOST/MONG_DATABASE');
  }

  if (!hasValue(process.env.CORS_ORIGIN)) {
    issues.push('CORS_ORIGIN is required');
  }

  if (!hasValue(process.env.CLIENT_URL)) {
    issues.push('CLIENT_URL is required');
  }

  if (String(process.env.NODE_ENV || '').toLowerCase() === 'production') {
    if (!hasValue(process.env.REFRESH_TOKEN_PEPPER)) {
      issues.push('REFRESH_TOKEN_PEPPER is required in production');
    }
  }

  if (issues.length) {
    fail(issues);
  }
}

module.exports = validateEnv;
