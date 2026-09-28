const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
const compression = require('compression');
const morgan = require('morgan');
const mongoSanitize = require('express-mongo-sanitize');
const config = require('./config');
const ApiError = require('./utils/ApiError');
const routes = require('./routes');
const { apiLimiter } = require('./middleware/rateLimiters');
const { notFound, errorHandler } = require('./middleware/error');

const app = express();

app.set('trust proxy', 1);
app.disable('x-powered-by');

app.use(helmet({ crossOriginResourcePolicy: { policy: 'cross-origin' } }));
app.use(
  cors({
    origin(origin, callback) {
      // Allow same-origin/server-to-server requests (no Origin header) and configured frontends.
      if (!origin || config.frontendUrls.includes(origin)) return callback(null, true);
      return callback(ApiError.forbidden(`Origin ${origin} is not allowed`));
    },
    credentials: true,
  })
);
app.use(compression());
app.use(
  express.json({
    limit: '1mb',
    // Keep the raw body for payment webhook signature verification.
    verify: (req, res, buf) => {
      if (req.originalUrl.startsWith('/api/payments/webhook')) req.rawBody = buf;
    },
  })
);
app.use(express.urlencoded({ extended: true, limit: '1mb' }));
app.use(mongoSanitize());
if (config.env !== 'test') app.use(morgan(config.env === 'production' ? 'combined' : 'dev'));

app.use('/api', apiLimiter, routes);

app.use(notFound);
app.use(errorHandler);

module.exports = app;
