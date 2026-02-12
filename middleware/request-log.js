function redactValue(value) {
  if (value === undefined || value === null) return value;
  const str = String(value);
  if (str.length <= 8) return '***';
  return `${str.slice(0, 4)}***${str.slice(-2)}`;
}

function sanitizeHeaders(headers = {}) {
  const masked = { ...headers };
  const keysToRedact = [
    'authorization',
    'cookie',
    'set-cookie',
    'x-api-key',
    'x-access-token'
  ];

  for (const key of keysToRedact) {
    if (masked[key] !== undefined) {
      masked[key] = redactValue(masked[key]);
    }
  }

  return masked;
}

module.exports = function requestLog(req, res, next) {
  const enabled = String(process.env.LOG_REQUESTS || '').toLowerCase() === 'true';
  if (!enabled) return next();

  const start = Date.now();
  const ip = req.ip || req.socket?.remoteAddress || '';

  res.on('finish', () => {
    const ms = Date.now() - start;
    const line = `[REQ] ${req.method} ${req.originalUrl} ${res.statusCode} ${ms}ms ip=${ip}`;
    console.log(line);

    const includeHeaders = String(process.env.LOG_REQUEST_HEADERS || '').toLowerCase() === 'true';
    if (includeHeaders) {
      console.log('[REQ_HEADERS]', sanitizeHeaders(req.headers));
    }
  });

  next();
};
