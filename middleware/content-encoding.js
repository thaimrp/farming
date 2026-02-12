const AppError = require('../helpers/apperror');

module.exports = (req, res, next) => {
  const raw = String(req.headers['content-encoding'] || '').trim().toLowerCase();
  if (!raw || raw === 'identity') return next();

  // Express body parser supports gzip/deflate inflation.
  if (raw === 'gzip' || raw === 'deflate') return next();

  return next(new AppError('Unsupported Content-Encoding', 415, 'E_UNSUPPORTED_CONTENT_ENCODING'));
};
