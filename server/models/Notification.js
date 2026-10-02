const mongoose = require('mongoose');

const NOTIFICATION_TYPES = [
  'NEW_ORDER',
  'TRANSFER_NOTICE', // customer says they have paid (no receipt attached)
  'RECEIPT_UPLOADED',
  'PAYMENT_RECEIVED', // confirmed automatically by a payment gateway
  'BULK_REQUEST',
  'CONTACT_MESSAGE',
  'BATCH_READY', // a flock batch reached its target age
  'FEED_LOW', // a feed in the store fell to its low-stock level
  'MEAT_EXPIRY', // prepared meat from a processing run reaches its use-by date
];

// In-app alerts for the admin panel (shown in the notification bell), independent of email.
const notificationSchema = new mongoose.Schema(
  {
    type: { type: String, enum: NOTIFICATION_TYPES, required: true },
    title: { type: String, required: true, maxlength: 200 },
    message: { type: String, maxlength: 500 },
    link: String, // admin route to open, e.g. /admin/orders/:id
    order: { type: mongoose.Schema.Types.ObjectId, ref: 'Order' },
    readAt: Date,
    readBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true }
);

notificationSchema.index({ createdAt: -1 });
notificationSchema.index({ readAt: 1, createdAt: -1 });
// Old notifications clean themselves up after 90 days.
notificationSchema.index({ createdAt: 1 }, { expireAfterSeconds: 90 * 24 * 60 * 60, name: 'ttl_90_days' });

notificationSchema.statics.TYPES = NOTIFICATION_TYPES;

module.exports = mongoose.model('Notification', notificationSchema);
