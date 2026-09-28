const mongoose = require('mongoose');
const { Order, Product } = require('../models');
const ApiError = require('../utils/ApiError');
const asyncHandler = require('../utils/asyncHandler');
const escapeRegex = require('../utils/escapeRegex');
const { getPagination, buildMeta } = require('../utils/pagination');
const { nextOrderNumber } = require('../services/orderNumberService');
const inventory = require('../services/inventoryService');
const { getSettings } = require('../services/settingsService');
const { availableMethods } = require('../services/paymentService');
const { toPublicProduct } = require('../services/productPresenter');
const { sendOrderReceived, sendReceiptReceived, sendReceiptRejected } = require('../services/emailService');
const { uploadReceipt } = require('../services/uploadService');
const { hasValidSignature } = require('../middleware/upload');
const { notify } = require('../services/notificationService');
const orderService = require('../services/orderService');

const MAX_LINE_QTY = 10000;

function mergeLines(items = []) {
  const merged = new Map();
  items.forEach((item) => {
    const key = `${item.productId}:${item.variantId || ''}`;
    const quantity = parseInt(item.quantity, 10);
    if (!mongoose.isValidObjectId(item.productId) || (item.variantId && !mongoose.isValidObjectId(item.variantId))) {
      throw ApiError.badRequest('Your cart contains an invalid item. Please refresh your cart.');
    }
    if (!Number.isInteger(quantity) || quantity < 1 || quantity > MAX_LINE_QTY) {
      throw ApiError.badRequest('Each item quantity must be a whole number of at least 1');
    }
    const current = merged.get(key);
    merged.set(key, { ...item, quantity: (current?.quantity || 0) + quantity });
  });
  return [...merged.values()];
}

// Prices every line from the database; client-sent prices are never trusted.
async function priceLines(lines) {
  const ids = [...new Set(lines.map((l) => l.productId))];
  const products = await Product.find({ _id: { $in: ids } }).populate('category', 'name');
  const byId = new Map(products.map((p) => [String(p._id), p]));

  return lines.map((line) => {
    const product = byId.get(String(line.productId));
    if (!product) throw ApiError.badRequest('A product in your cart no longer exists. Please refresh your cart.');
    const view = toPublicProduct(product);
    if (!view.purchasable) throw ApiError.conflict(`${product.name} is currently not available for purchase`);

    const hasVariants = view.variants.length > 0;
    if (hasVariants && !line.variantId) throw ApiError.badRequest(`Please choose an option for ${product.name}`);
    const variant = hasVariants ? view.variants.find((v) => String(v._id) === String(line.variantId)) : null;
    if (hasVariants && !variant) throw ApiError.badRequest(`The selected option for ${product.name} is no longer available`);

    const unitPrice = variant ? variant.effectivePrice : view.effectivePrice;
    return {
      product: product._id,
      variantId: variant?._id,
      name: product.name,
      sku: variant?.sku || product.sku,
      image: product.images[0]?.url,
      categoryName: product.category?.name,
      variantLabel: variant ? [variant.label, variant.weightLabel].filter(Boolean).filter((v, i, a) => a.indexOf(v) === i).join(' · ') : undefined,
      unitPrice,
      quantity: line.quantity,
      lineTotal: Math.round(unitPrice * line.quantity * 100) / 100,
    };
  });
}

exports.createOrder = asyncHandler(async (req, res) => {
  const { customer, deliveryAddress = {}, deliveryMethod, preferredDeliveryDate, paymentMethod, notes } = req.body;
  const settings = await getSettings();

  const method = settings.deliveryMethods.find((m) => m.code === deliveryMethod && m.isActive !== false);
  if (!method) throw ApiError.badRequest('Please choose a valid delivery method');
  if (method.requiresAddress && !(deliveryAddress.address && deliveryAddress.city && deliveryAddress.state)) {
    throw ApiError.badRequest('Delivery address, city and state are required for delivery');
  }

  const methods = availableMethods();
  const enabled = {
    ...methods,
    BANK_TRANSFER: settings.payments.bankTransferEnabled !== false,
    PAY_ON_DELIVERY: settings.payments.payOnDeliveryEnabled !== false,
  };
  if (!enabled[paymentMethod]) throw ApiError.badRequest('The selected payment method is not available');

  const items = await priceLines(mergeLines(req.body.items));
  const subtotal = Math.round(items.reduce((sum, item) => sum + item.lineTotal, 0) * 100) / 100;
  const deliveryFee = Number(method.fee) || 0;

  await inventory.reserveItems(items);
  let order;
  try {
    order = await Order.create({
      orderNumber: await nextOrderNumber(),
      user: req.user?._id,
      customer: { fullName: customer.fullName, email: customer.email, phone: customer.phone },
      items,
      subtotal,
      deliveryFee,
      total: subtotal + deliveryFee,
      deliveryAddress: method.requiresAddress ? deliveryAddress : {},
      deliveryMethod: method.code,
      deliveryMethodLabel: method.label,
      preferredDeliveryDate: preferredDeliveryDate || undefined,
      paymentMethod,
      notes,
      statusHistory: [{ status: 'PENDING', note: 'Order placed' }],
    });
  } catch (error) {
    await inventory.releaseOrder({ items, inventoryState: 'RESERVED' });
    throw error;
  }

  sendOrderReceived(order);
  notify({
    type: 'NEW_ORDER',
    title: `New order · ${order.orderNumber}`,
    message: `${order.customer.fullName} ordered ${order.items.reduce((s, i) => s + i.quantity, 0)} item(s) for ₦${order.total.toLocaleString(
      'en-NG'
    )} — ${order.paymentMethod.replace(/_/g, ' ').toLowerCase()}.`,
    link: `/admin/orders/${order._id}`,
    order: order._id,
  });
  res.status(201).json({ success: true, order });
});

// Public lookup for guests: requires both the order number and the email used at checkout.
exports.trackOrder = asyncHandler(async (req, res) => {
  const { orderNumber, email } = req.query;
  if (!orderNumber || !email) throw ApiError.badRequest('Order number and email are required');
  const order = await Order.findOne({
    orderNumber: String(orderNumber).trim().toUpperCase(),
    'customer.email': String(email).trim().toLowerCase(),
  }).select('-internalNotes -statusHistory.changedBy');
  if (!order) throw ApiError.notFound('We could not find an order with those details');
  res.json({ success: true, order });
});

exports.myOrders = asyncHandler(async (req, res) => {
  const { page, limit, skip } = getPagination(req.query, 10, 50);
  const filter = { user: req.user._id };
  const [orders, total] = await Promise.all([
    Order.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit).select('-internalNotes'),
    Order.countDocuments(filter),
  ]);
  res.json({ success: true, orders, meta: buildMeta(total, page, limit) });
});

exports.getMyOrder = asyncHandler(async (req, res) => {
  const order = await Order.findOne({ _id: req.params.id, user: req.user._id }).select('-internalNotes');
  if (!order) throw ApiError.notFound('Order not found');
  res.json({ success: true, order });
});

exports.cancelMyOrder = asyncHandler(async (req, res) => {
  const order = await Order.findOne({ _id: req.params.id, user: req.user._id });
  if (!order) throw ApiError.notFound('Order not found');
  if (order.orderStatus !== 'PENDING' || order.paymentStatus === 'PAID') {
    throw ApiError.conflict('This order can no longer be cancelled online. Please contact us.');
  }
  await orderService.changeStatus(order, 'CANCELLED', { note: 'Cancelled by customer', userId: req.user._id });
  res.json({ success: true, order });
});

// Customer uploads a bank-transfer receipt. Identified by order number + checkout email (works for guests).
/*
  Customer tells us they have paid by bank transfer — with a receipt (photo/PDF) or as a plain notice.
  Identified by order number + checkout email, so it works for guests. Alerts the admin in-app and by email.
*/
exports.uploadPaymentProof = asyncHandler(async (req, res) => {
  const { orderNumber, email, note, senderName, transferDate } = req.body;
  const hasFile = Boolean(req.file);
  if (hasFile && !hasValidSignature(req.file)) throw ApiError.badRequest('That file does not look like a valid image or PDF');

  const order = await Order.findOne({
    orderNumber: String(orderNumber || '').trim().toUpperCase(),
    'customer.email': String(email || '').trim().toLowerCase(),
  });
  if (!order) throw ApiError.notFound('We could not find an order with those details');
  if (order.paymentMethod !== 'BANK_TRANSFER') throw ApiError.badRequest('This is only needed for bank transfer orders');
  if (order.paymentStatus === 'PAID') throw ApiError.conflict('Payment for this order has already been confirmed');
  if (order.orderStatus === 'CANCELLED') throw ApiError.conflict('This order has been cancelled');
  if ((order.paymentProofs || []).length >= 10) throw ApiError.badRequest('Too many payment notices for this order. Please contact us.');

  const latest = order.paymentProofs[order.paymentProofs.length - 1];
  if (!hasFile && latest?.status === 'PENDING') {
    throw ApiError.conflict('We have already been notified and are checking your transfer. You can still upload a receipt.');
  }

  const date = transferDate ? new Date(transferDate) : undefined;
  const entry = {
    kind: hasFile ? 'RECEIPT' : 'NOTICE',
    note: note ? String(note).slice(0, 500) : undefined,
    senderName: senderName ? String(senderName).slice(0, 120) : undefined,
    transferDate: date && !Number.isNaN(date.getTime()) ? date : undefined,
  };
  if (hasFile) {
    const stored = await uploadReceipt(req.file, order.orderNumber);
    Object.assign(entry, {
      url: stored.url,
      publicId: stored.publicId,
      fileName: String(req.file.originalname || '').slice(0, 150),
      mimeType: req.file.mimetype,
    });
  }
  order.paymentProofs.push(entry);
  order.awaitingPaymentReview = true;
  order.internalNotes.push({
    note: hasFile
      ? 'Customer uploaded a bank transfer receipt. Check the account and confirm payment.'
      : `Customer says the transfer has been made${entry.senderName ? ` from ${entry.senderName}` : ''}. Check the account and confirm payment.`,
    authorName: 'System',
  });
  await order.save();

  notify({
    type: hasFile ? 'RECEIPT_UPLOADED' : 'TRANSFER_NOTICE',
    title: hasFile ? `Receipt uploaded · ${order.orderNumber}` : `Transfer made · ${order.orderNumber}`,
    message: `${order.customer.fullName} ${hasFile ? 'uploaded a transfer receipt' : 'says they have paid'} for ₦${order.total.toLocaleString('en-NG')}${
      entry.senderName ? ` (sender: ${entry.senderName})` : ''
    }. Check the account and confirm.`,
    link: `/admin/orders/${order._id}`,
    order: order._id,
  });
  sendReceiptReceived(order);

  const { internalNotes, ...publicOrder } = order.toJSON();
  res.status(201).json({
    success: true,
    order: publicOrder,
    message: hasFile
      ? 'Receipt received. We will confirm your payment shortly.'
      : 'Thank you — we have been notified of your transfer and will confirm it shortly.',
  });
});

// ---------- Admin ----------

exports.adminListOrders = asyncHandler(async (req, res) => {
  const { q, status, paymentStatus, paymentMethod, from, to } = req.query;
  const { page, limit, skip } = getPagination(req.query, 20, 100);
  const filter = {};
  if (q) {
    const rx = new RegExp(escapeRegex(String(q).trim().slice(0, 80)), 'i');
    filter.$or = [{ orderNumber: rx }, { 'customer.fullName': rx }, { 'customer.email': rx }, { 'customer.phone': rx }];
  }
  if (status) filter.orderStatus = status;
  if (paymentStatus) filter.paymentStatus = paymentStatus;
  if (paymentMethod) filter.paymentMethod = paymentMethod;
  if (req.query.awaitingReview === 'true') filter.awaitingPaymentReview = true;
  if (from || to) {
    filter.createdAt = {};
    if (from) filter.createdAt.$gte = new Date(from);
    if (to) filter.createdAt.$lte = new Date(`${to}T23:59:59.999Z`);
  }
  const [orders, total] = await Promise.all([
    Order.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit),
    Order.countDocuments(filter),
  ]);
  res.json({ success: true, orders, meta: buildMeta(total, page, limit) });
});

exports.adminGetOrder = asyncHandler(async (req, res) => {
  const order = await Order.findById(req.params.id)
    .populate('user', 'name email phone createdAt')
    .populate('statusHistory.changedBy', 'name');
  if (!order) throw ApiError.notFound('Order not found');
  res.json({ success: true, order });
});

exports.adminUpdateStatus = asyncHandler(async (req, res) => {
  const order = await Order.findById(req.params.id);
  if (!order) throw ApiError.notFound('Order not found');
  await orderService.changeStatus(order, req.body.status, { note: req.body.note, userId: req.user._id });
  res.json({ success: true, order });
});

// Manual payment reconciliation for bank transfers, pay-on-delivery and refunds.
exports.adminUpdatePayment = asyncHandler(async (req, res) => {
  const { paymentStatus, note } = req.body;
  const order = await Order.findById(req.params.id);
  if (!order) throw ApiError.notFound('Order not found');
  if (!Order.PAYMENT_STATUSES.includes(paymentStatus)) throw ApiError.badRequest('Unknown payment status');

  const online = ['PAYSTACK', 'FLUTTERWAVE'].includes(order.paymentMethod);
  if (online && paymentStatus === 'PAID') {
    throw ApiError.badRequest('Online payments are confirmed automatically by the payment gateway. Use "Re-check payment" instead.');
  }

  if (paymentStatus === 'PAID') {
    await orderService.markPaid(order, { note: note || 'Payment confirmed by admin', userId: req.user._id });
  } else {
    order.paymentStatus = paymentStatus;
    await order.save();
  }
  order.internalNotes.push({
    note: `Payment status set to ${paymentStatus}${note ? `: ${note}` : ''}`,
    author: req.user._id,
    authorName: req.user.name,
  });
  await order.save();
  res.json({ success: true, order });
});

// "Money received" button: marks a bank-transfer / pay-on-delivery order paid and emails the customer.
exports.adminConfirmPayment = asyncHandler(async (req, res) => {
  const order = await Order.findById(req.params.id);
  if (!order) throw ApiError.notFound('Order not found');
  if (['PAYSTACK', 'FLUTTERWAVE'].includes(order.paymentMethod)) {
    throw ApiError.badRequest('Online payments are confirmed automatically by the payment gateway. Use "Re-check" instead.');
  }
  if (order.paymentStatus === 'PAID') throw ApiError.conflict('Payment for this order is already confirmed');
  if (order.orderStatus === 'CANCELLED') throw ApiError.conflict('This order is cancelled. Reopen it by creating a new order.');

  const { note } = req.body;
  const confirmed = await orderService.markPaid(order, { note: note || 'Payment received — confirmed by admin', userId: req.user._id });
  confirmed.internalNotes.push({
    note: `Payment confirmed as received${note ? `: ${note}` : ''}`,
    author: req.user._id,
    authorName: req.user.name,
  });
  await confirmed.save();
  res.json({ success: true, order: confirmed, message: 'Payment confirmed. The customer has been notified.' });
});

exports.adminRejectProof = asyncHandler(async (req, res) => {
  const order = await Order.findById(req.params.id);
  if (!order) throw ApiError.notFound('Order not found');
  const proof = [...(order.paymentProofs || [])].reverse().find((p) => p.status === 'PENDING');
  if (!proof) throw ApiError.badRequest('There is no receipt waiting for review');

  const { reason } = req.body;
  proof.status = 'REJECTED';
  proof.reviewNote = reason;
  proof.reviewedBy = req.user._id;
  proof.reviewedAt = new Date();
  order.awaitingPaymentReview = order.paymentProofs.some((p) => p.status === 'PENDING');
  order.internalNotes.push({ note: `Receipt rejected: ${reason}`, author: req.user._id, authorName: req.user.name });
  await order.save();
  sendReceiptRejected(order, reason);
  res.json({ success: true, order, message: 'Receipt rejected. The customer has been asked to upload it again.' });
});

exports.adminAddNote = asyncHandler(async (req, res) => {
  const order = await Order.findById(req.params.id);
  if (!order) throw ApiError.notFound('Order not found');
  order.internalNotes.push({ note: req.body.note, author: req.user._id, authorName: req.user.name });
  await order.save();
  res.status(201).json({ success: true, order });
});
