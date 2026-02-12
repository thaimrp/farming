const express = require('express');
const path = require('path');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const helmet = require('helmet');
const compression = require('compression');

const AppError = require('./helpers/apperror');
const { globalLimiter } = require('./middleware/rate-limit');
const enforceContentEncoding = require('./middleware/content-encoding');
const requestLog = require('./middleware/request-log');

const app = express();
const isProd = String(process.env.NODE_ENV || '').toLowerCase() === 'production';
const jsonLimit = process.env.JSON_BODY_LIMIT || '100kb';
const trustProxy = process.env.TRUST_PROXY;

if (trustProxy !== undefined && trustProxy !== '') {
  app.set('trust proxy', trustProxy === 'true' ? true : trustProxy);
}

app.use(helmet());
app.use(globalLimiter);
app.use(requestLog);

app.use(cors({
  origin: (process.env.CORS_ORIGIN || '').split(',').map((v) => v.trim()).filter(Boolean),
  credentials: true
}));
app.use(compression());
app.use(enforceContentEncoding);
app.use(express.json({ limit: jsonLimit, inflate: true }));
app.use(express.urlencoded({ extended: false, limit: jsonLimit, inflate: true }));
app.use(cookieParser());
app.use(express.static(path.resolve(__dirname)));

app.get('/bck/health', (req, res) => {
  res.status(200).json({ result: true, message: 'ok', data: null });
});

app.get('/', (req, res) => {
  res.sendFile(path.resolve(__dirname, 'index.html'));
});

app.use('/api/authen', require('./routes/auth.routes'));
app.use('/bck/cf', require('./routes/configuration.routes'));
app.use('/bck/ct', require('./routes/configuration-type.routes'));
app.use('/bck/mt', require('./routes/mapping-type.routes'));
app.use('/bck/mp', require('./routes/mapping.routes'));

app.use((req, res, next) => {
  next(new AppError(`Route ${req.originalUrl} not found`, 404, 'E_ROUTE_NOT_FOUND'));
});

app.use((err, req, res, next) => {
  const statusCode = Number(err.statusCode || 500);
  const defaultCode = {
    400: 'E_BAD_REQUEST',
    401: 'E_UNAUTHORIZED',
    403: 'E_FORBIDDEN',
    404: 'E_NOT_FOUND',
    409: 'E_CONFLICT',
    422: 'E_UNPROCESSABLE',
    429: 'E_RATE_LIMIT'
  }[statusCode] || 'E_INTERNAL';

  const code = err.errorCode || defaultCode;
  const message = !isProd || statusCode < 500
    ? (err.message || 'Internal server error')
    : 'Internal server error';

  res.status(statusCode).json({
    result: false,
    code,
    message,
    data: null
  });
});

module.exports = app;
