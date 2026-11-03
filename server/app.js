
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

// Allowed frontend origins
const allowedOrigins = [
  'https://tower-of-grace-woad.vercel.app',
  'https://towerofgracefarms.com',
  'https://www.towerofgracefarms.com',
  ...(config.frontendUrls || [])
].map(origin => origin.replace(/\/$/, ''));

// CORS configuration
app.use(
  cors({
    origin(origin, callback) {
      // Allow requests without an Origin header
      if (!origin) {
        return callback(null, true);
      }

      const normalizedOrigin = origin.replace(/\/$/, '');

      // Allow explicitly configured frontend domains
      if (allowedOrigins.includes(normalizedOrigin)) {
        return callback(null, true);
      }

      // Allow Vercel preview deployments for this project
      if (
        /^https:\/\/tower-of-grace-[a-z0-9-]+\.vercel\.app$/.test(normalizedOrigin)
      ) {
        return callback(null, true);
      }

      return callback(
        ApiError.forbidden(`Origin ${origin} is not allowed`)
      );
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization']
  })
);

app.use(
  helmet({
    crossOriginResourcePolicy: {
      policy: 'cross-origin'
    }
  })
);

app.use(compression());

app.use(
  express.json({
    limit: '1mb',
    verify: (req, res, buf) => {
      if (req.originalUrl.startsWith('/api/payments/webhook')) {
        req.rawBody = buf;
      }
    }
  })
);

app.use(
  express.urlencoded({
    extended: true,
    limit: '1mb'
  })
);

app.use(mongoSanitize());

if (config.env !== 'test') {
  app.use(
    morgan(config.env === 'production' ? 'combined' : 'dev')
  );
}

// API routes
app.use('/api', apiLimiter, routes);

// Health check
app.get('/health', (req, res) => {
  res.status(200).json({
    success: true,
    message: 'Tower of Grace API is running',
    environment: config.env
  });
});

// 404 and error handlers
app.use(notFound);
app.use(errorHandler);

module.exports = app;
