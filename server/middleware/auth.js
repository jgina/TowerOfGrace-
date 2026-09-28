const jwt = require('jsonwebtoken');
const config = require('../config');
const { User } = require('../models');
const ApiError = require('../utils/ApiError');
const asyncHandler = require('../utils/asyncHandler');

function readToken(req) {
  const header = req.headers.authorization || '';
  return header.startsWith('Bearer ') ? header.slice(7) : null;
}

async function resolveUser(token) {
  const payload = jwt.verify(token, config.jwtSecret);
  const user = await User.findById(payload.id);
  if (!user) throw ApiError.unauthorized('Your account no longer exists');
  if (!user.isActive) throw ApiError.forbidden('Your account has been deactivated. Please contact support.');
  return user;
}

// Requires a valid token.
const protect = asyncHandler(async (req, res, next) => {
  const token = readToken(req);
  if (!token) throw ApiError.unauthorized();
  req.user = await resolveUser(token);
  next();
});

// Attaches the user when a valid token is present but never blocks the request (e.g. guest checkout).
const optionalAuth = asyncHandler(async (req, res, next) => {
  const token = readToken(req);
  if (token) {
    try {
      req.user = await resolveUser(token);
    } catch (error) {
      req.user = undefined;
    }
  }
  next();
});

const authorize = (...roles) => (req, res, next) => {
  if (!req.user || !roles.includes(req.user.role)) {
    return next(ApiError.forbidden());
  }
  return next();
};

const adminOnly = [protect, authorize('admin')];

module.exports = { protect, optionalAuth, authorize, adminOnly };
