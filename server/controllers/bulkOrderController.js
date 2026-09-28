const { BulkOrder } = require('../models');
const ApiError = require('../utils/ApiError');
const asyncHandler = require('../utils/asyncHandler');
const escapeRegex = require('../utils/escapeRegex');
const pick = require('../utils/pick');
const { getPagination, buildMeta } = require('../utils/pagination');
const { notifyAdmin, escapeHtml } = require('../services/emailService');
const { notify } = require('../services/notificationService');

const PUBLIC_FIELDS = [
  'businessName', 'businessType', 'contactPerson', 'phone', 'email',
  'product', 'quantity', 'preferredWeight', 'deliveryLocation', 'message',
];

exports.createBulkOrder = asyncHandler(async (req, res) => {
  const request = await BulkOrder.create(pick(req.body, PUBLIC_FIELDS));
  notifyAdmin(
    `Bulk order request from ${request.businessName}`,
    `<p>${escapeHtml(request.contactPerson)} (${escapeHtml(request.phone)}, ${escapeHtml(request.email)}) requested
     <strong>${escapeHtml(request.quantity)}</strong> of <strong>${escapeHtml(request.product)}</strong>
     for delivery to ${escapeHtml(request.deliveryLocation)}.</p><p>${escapeHtml(request.message || '')}</p>`
  );
  notify({
    type: 'BULK_REQUEST',
    title: `Bulk request · ${request.businessName}`,
    message: `${request.contactPerson} wants ${request.quantity} of ${request.product} delivered to ${request.deliveryLocation}.`,
    link: '/admin/bulk-orders',
  });
  res.status(201).json({ success: true, message: 'Your bulk order request has been received. Our sales team will contact you shortly.' });
});

exports.listBulkOrders = asyncHandler(async (req, res) => {
  const { q, status, businessType } = req.query;
  const { page, limit, skip } = getPagination(req.query, 20, 100);
  const filter = {};
  if (status) filter.status = status;
  if (businessType) filter.businessType = businessType;
  if (q) {
    const rx = new RegExp(escapeRegex(String(q).slice(0, 80)), 'i');
    filter.$or = [{ businessName: rx }, { contactPerson: rx }, { email: rx }, { phone: rx }, { product: rx }];
  }
  const [requests, total] = await Promise.all([
    BulkOrder.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit),
    BulkOrder.countDocuments(filter),
  ]);
  res.json({ success: true, requests, meta: buildMeta(total, page, limit) });
});

exports.updateBulkOrder = asyncHandler(async (req, res) => {
  const request = await BulkOrder.findByIdAndUpdate(req.params.id, pick(req.body, ['status', 'adminNotes']), {
    returnDocument: 'after',
    runValidators: true,
  });
  if (!request) throw ApiError.notFound('Request not found');
  res.json({ success: true, request });
});

exports.deleteBulkOrder = asyncHandler(async (req, res) => {
  const request = await BulkOrder.findByIdAndDelete(req.params.id);
  if (!request) throw ApiError.notFound('Request not found');
  res.json({ success: true });
});
