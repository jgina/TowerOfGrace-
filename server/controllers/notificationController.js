const { Notification } = require('../models');
const ApiError = require('../utils/ApiError');
const asyncHandler = require('../utils/asyncHandler');

exports.listNotifications = asyncHandler(async (req, res) => {
  const limit = Math.min(parseInt(req.query.limit, 10) || 20, 50);
  const filter = req.query.unread === 'true' ? { readAt: { $exists: false } } : {};
  const [notifications, unreadCount] = await Promise.all([
    Notification.find(filter).sort({ createdAt: -1 }).limit(limit).lean(),
    Notification.countDocuments({ readAt: { $exists: false } }),
  ]);
  res.json({ success: true, notifications, unreadCount });
});

exports.markRead = asyncHandler(async (req, res) => {
  const notification = await Notification.findOneAndUpdate(
    { _id: req.params.id, readAt: { $exists: false } },
    { readAt: new Date(), readBy: req.user._id },
    { returnDocument: 'after' }
  );
  if (!notification && !(await Notification.exists({ _id: req.params.id }))) throw ApiError.notFound('Notification not found');
  res.json({ success: true });
});

exports.markAllRead = asyncHandler(async (req, res) => {
  const result = await Notification.updateMany({ readAt: { $exists: false } }, { readAt: new Date(), readBy: req.user._id });
  res.json({ success: true, updated: result.modifiedCount });
});
