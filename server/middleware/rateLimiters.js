const rateLimit = require('express-rate-limit');

const baseOptions = {
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: 'Too many requests. Please try again later.' },
};

const apiLimiter = rateLimit({ ...baseOptions, windowMs: 15 * 60 * 1000, limit: 600 });

const authLimiter = rateLimit({ ...baseOptions, windowMs: 15 * 60 * 1000, limit: 20 });

const formLimiter = rateLimit({ ...baseOptions, windowMs: 60 * 60 * 1000, limit: 30 });

// Order tracking is polled by the confirmation page while a payment is awaiting review.
const trackLimiter = rateLimit({ ...baseOptions, windowMs: 15 * 60 * 1000, limit: 150 });

module.exports = { apiLimiter, authLimiter, formLimiter, trackLimiter };
