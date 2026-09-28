const { Order } = require('../models');
const ApiError = require('../utils/ApiError');
const inventory = require('./inventoryService');
const { sendOrderStatusUpdate, sendPaymentConfirmed } = require('./emailService');
const { notify } = require('./notificationService');

const TERMINAL = ['COMPLETED', 'CANCELLED'];

// Applies an order status change, keeping inventory in step with the order lifecycle.
async function changeStatus(order, status, { note, userId, notify = true } = {}) {
  if (!Order.ORDER_STATUSES.includes(status)) throw ApiError.badRequest('Unknown order status');
  if (order.orderStatus === status) return order;
  if (TERMINAL.includes(order.orderStatus)) {
    throw ApiError.conflict(`This order is already ${order.orderStatus.toLowerCase()} and can no longer change status`);
  }

  if (status === 'CANCELLED') await inventory.releaseOrder(order);
  if (status === 'COMPLETED') await inventory.commitOrder(order);

  order.orderStatus = status;
  order.statusHistory.push({ status, note, changedBy: userId });
  await order.save();
  if (notify) sendOrderStatusUpdate(order);
  return order;
}

/**
 * Marks an order paid exactly once: confirms it, commits its stock, accepts any receipt awaiting review
 * and emails the customer. The atomic claim stops two admins (or an admin and a webhook) double-confirming.
 */
async function markPaid(order, { note, userId, gatewayResponse } = {}) {
  if (order.paymentStatus === 'PAID') return order;
  const paidAt = new Date();
  const claimed = await Order.updateOne({ _id: order._id, paymentStatus: { $ne: 'PAID' } }, { $set: { paymentStatus: 'PAID', paidAt } });
  if (claimed.modifiedCount === 0) {
    // Someone else confirmed it a moment ago; return the current state.
    return Order.findById(order._id);
  }

  if (order.orderStatus === 'CANCELLED') {
    order.internalNotes.push({ note: 'Payment received for a cancelled order. Review for refund.', authorName: 'System' });
  }
  order.paymentStatus = 'PAID';
  order.paidAt = paidAt;
  if (gatewayResponse) order.paymentGatewayResponse = gatewayResponse;
  (order.paymentProofs || []).forEach((proof) => {
    if (proof.status === 'PENDING') {
      proof.status = 'ACCEPTED';
      proof.reviewedBy = userId;
      proof.reviewedAt = paidAt;
    }
  });
  order.awaitingPaymentReview = false;
  if (order.orderStatus !== 'CANCELLED') await inventory.commitOrder(order);
  if (order.orderStatus === 'PENDING') {
    order.orderStatus = 'CONFIRMED';
    order.statusHistory.push({ status: 'CONFIRMED', note: note || 'Payment received', changedBy: userId });
  }
  await order.save();
  if (order.orderStatus !== 'CANCELLED') sendPaymentConfirmed(order);
  // Gateway payments confirm themselves; let the admins know one arrived.
  if (!userId) {
    notify({
      type: 'PAYMENT_RECEIVED',
      title: `Payment received · ${order.orderNumber}`,
      message: `₦${order.total.toLocaleString('en-NG')} paid online by ${order.customer.fullName}.`,
      link: `/admin/orders/${order._id}`,
      order: order._id,
    });
  }
  return order;
}

module.exports = { changeStatus, markPaid };
