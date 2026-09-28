const jwt = require('jsonwebtoken');
const config = require('../config');
const { User } = require('../models');
const ApiError = require('../utils/ApiError');
const asyncHandler = require('../utils/asyncHandler');
const pick = require('../utils/pick');

const signToken = (user) => jwt.sign({ id: user._id, role: user.role }, config.jwtSecret, { expiresIn: config.jwtExpiresIn });

const sendAuth = (res, user, status = 200) => res.status(status).json({ success: true, token: signToken(user), user });

exports.register = asyncHandler(async (req, res) => {
  const { name, email, phone, password } = req.body;
  const exists = await User.exists({ email: String(email).toLowerCase() });
  if (exists) throw ApiError.conflict('An account with this email already exists');
  const user = await User.create({ name, email, phone, password, role: 'customer' });
  sendAuth(res, user, 201);
});

exports.login = asyncHandler(async (req, res) => {
  const { email, password } = req.body;
  const user = await User.findOne({ email: String(email).toLowerCase() }).select('+password');
  if (!user || !(await user.matchPassword(password))) throw ApiError.unauthorized('Invalid email or password');
  if (!user.isActive) throw ApiError.forbidden('Your account has been deactivated. Please contact support.');
  user.lastLoginAt = new Date();
  await user.save({ validateModifiedOnly: true });
  sendAuth(res, user);
});

exports.me = asyncHandler(async (req, res) => {
  res.json({ success: true, user: req.user });
});

// JWTs are stateless; the client discards its token. The endpoint exists for a consistent API surface.
exports.logout = (req, res) => res.json({ success: true, message: 'Signed out' });

exports.updateProfile = asyncHandler(async (req, res) => {
  const updates = pick(req.body, ['name', 'phone']);
  Object.assign(req.user, updates);
  await req.user.save();
  res.json({ success: true, user: req.user });
});

exports.changePassword = asyncHandler(async (req, res) => {
  const { currentPassword, newPassword } = req.body;
  const user = await User.findById(req.user._id).select('+password');
  if (!(await user.matchPassword(currentPassword))) throw ApiError.badRequest('Current password is incorrect');
  user.password = newPassword;
  await user.save();
  sendAuth(res, user);
});
