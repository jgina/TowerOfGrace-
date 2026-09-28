const { ContactMessage } = require('../models');
const ApiError = require('../utils/ApiError');
const asyncHandler = require('../utils/asyncHandler');
const escapeRegex = require('../utils/escapeRegex');
const pick = require('../utils/pick');
const { getPagination, buildMeta } = require('../utils/pagination');
const { notifyAdmin, escapeHtml } = require('../services/emailService');
const { notify } = require('../services/notificationService');

exports.createMessage = asyncHandler(async (req, res) => {
  const message = await ContactMessage.create(pick(req.body, ['name', 'email', 'phone', 'subject', 'message']));
  notifyAdmin(
    `New enquiry: ${message.subject || 'Website contact form'}`,
    `<p><strong>${escapeHtml(message.name)}</strong> (${escapeHtml(message.email)}, ${escapeHtml(message.phone || 'no phone')})</p><p>${escapeHtml(message.message)}</p>`
  );
  notify({
    type: 'CONTACT_MESSAGE',
    title: `Message from ${message.name}`,
    message: (message.subject ? `${message.subject}: ` : '') + message.message.slice(0, 160),
    link: '/admin/messages',
  });
  res.status(201).json({ success: true, message: 'Thank you. Your message has been received.' });
});

exports.listMessages = asyncHandler(async (req, res) => {
  const { q, status } = req.query;
  const { page, limit, skip } = getPagination(req.query, 20, 100);
  const filter = {};
  if (status) filter.status = status;
  if (q) {
    const rx = new RegExp(escapeRegex(String(q).slice(0, 80)), 'i');
    filter.$or = [{ name: rx }, { email: rx }, { subject: rx }, { message: rx }];
  }
  const [messages, total] = await Promise.all([
    ContactMessage.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit),
    ContactMessage.countDocuments(filter),
  ]);
  res.json({ success: true, messages, meta: buildMeta(total, page, limit) });
});

exports.updateMessage = asyncHandler(async (req, res) => {
  const message = await ContactMessage.findByIdAndUpdate(req.params.id, pick(req.body, ['status']), {
    returnDocument: 'after',
    runValidators: true,
  });
  if (!message) throw ApiError.notFound('Message not found');
  res.json({ success: true, message });
});

exports.deleteMessage = asyncHandler(async (req, res) => {
  const message = await ContactMessage.findByIdAndDelete(req.params.id);
  if (!message) throw ApiError.notFound('Message not found');
  res.json({ success: true });
});
