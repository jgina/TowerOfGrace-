const nodemailer = require('nodemailer');
const config = require('../config');

const isEmailConfigured = Boolean(config.email.host && config.email.user && config.email.password);

const transporter = isEmailConfigured
  ? nodemailer.createTransport({
      host: config.email.host,
      port: config.email.port,
      secure: config.email.port === 465,
      auth: { user: config.email.user, pass: config.email.password },
    })
  : null;

// Email is best-effort: failures are logged and never break the request that triggered them.
async function sendMail({ to, subject, html, text }) {
  if (!transporter || !to) return false;
  try {
    await transporter.sendMail({ from: config.email.from, to, subject, html, text });
    return true;
  } catch (error) {
    console.warn(`Email to ${to} failed: ${error.message}`);
    return false;
  }
}

const naira = (value) => `NGN ${Number(value || 0).toLocaleString('en-NG', { minimumFractionDigits: 2 })}`;

const escapeHtml = (value = '') =>
  String(value).replace(/[&<>"']/g, (ch) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[ch]);

function orderSummaryHtml(order) {
  const rows = order.items
    .map(
      (item) =>
        `<tr><td>${escapeHtml(item.name)}${item.variantLabel ? ` (${escapeHtml(item.variantLabel)})` : ''}</td>` +
        `<td align="center">${item.quantity}</td><td align="right">${naira(item.lineTotal)}</td></tr>`
    )
    .join('');
  return `
    <table width="100%" cellpadding="6" style="border-collapse:collapse;font-family:Arial,sans-serif;font-size:14px">
      <thead><tr><th align="left">Item</th><th>Qty</th><th align="right">Amount</th></tr></thead>
      <tbody>${rows}</tbody>
      <tfoot>
        <tr><td colspan="2">Subtotal</td><td align="right">${naira(order.subtotal)}</td></tr>
        <tr><td colspan="2">Delivery</td><td align="right">${naira(order.deliveryFee)}</td></tr>
        <tr><td colspan="2"><strong>Total</strong></td><td align="right"><strong>${naira(order.total)}</strong></td></tr>
      </tfoot>
    </table>`;
}

function sendOrderReceived(order) {
  const html = `
    <p>Hello ${escapeHtml(order.customer.fullName)},</p>
    <p>Thank you for your order with Tower of Grace Farms. Your order number is <strong>${order.orderNumber}</strong>.</p>
    ${orderSummaryHtml(order)}
    <p>We will contact you on ${escapeHtml(order.customer.phone)} to confirm delivery.</p>`;
  sendMail({ to: order.customer.email, subject: `Order ${order.orderNumber} received`, html });
  if (config.email.adminNotify) {
    sendMail({ to: config.email.adminNotify, subject: `New order ${order.orderNumber}`, html });
  }
}

function sendOrderStatusUpdate(order) {
  const status = order.orderStatus.replace(/_/g, ' ').toLowerCase();
  sendMail({
    to: order.customer.email,
    subject: `Order ${order.orderNumber} is now ${status}`,
    html: `<p>Hello ${escapeHtml(order.customer.fullName)},</p><p>Your order <strong>${order.orderNumber}</strong> is now <strong>${status}</strong>.</p>`,
  });
}

function notifyAdmin(subject, html) {
  if (config.email.adminNotify) sendMail({ to: config.email.adminNotify, subject, html });
}

// Simple branded wrapper used by the payment emails.
function layout(title, body) {
  return `
  <div style="margin:0;padding:24px;background:#f1f8f2;font-family:Arial,Helvetica,sans-serif;color:#13231a">
    <div style="max-width:560px;margin:0 auto;background:#ffffff;border-radius:10px;overflow:hidden;border:1px solid #dce8df">
      <div style="background:#003c24;padding:18px 24px;border-bottom:4px solid #e4a80c">
        <div style="color:#ffffff;font-size:18px;font-weight:bold;letter-spacing:.5px">TOWER OF GRACE FARMS</div>
        <div style="color:#f9bf3a;font-size:11px;letter-spacing:1.5px">QUALITY POULTRY · HEALTHY FOOD · BRIGHTER TOMORROW</div>
      </div>
      <div style="padding:24px;font-size:14px;line-height:1.6">
        <h2 style="margin:0 0 12px;font-size:18px;color:#003c24">${title}</h2>
        ${body}
      </div>
    </div>
  </div>`;
}

const orderLink = (order) =>
  `${config.frontendUrl}/track-order?orderNumber=${encodeURIComponent(order.orderNumber)}&email=${encodeURIComponent(order.customer.email)}`;

const button = (href, label) =>
  `<p style="margin:20px 0"><a href="${href}" style="background:#e4a80c;color:#1c1300;padding:12px 20px;border-radius:6px;text-decoration:none;font-weight:bold">${label}</a></p>`;

function sendReceiptReceived(order) {
  const latest = order.paymentProofs?.[order.paymentProofs.length - 1];
  const isReceipt = latest?.kind !== 'NOTICE';
  const what = isReceipt ? 'transfer receipt' : 'notice that you have made the transfer';
  sendMail({
    to: order.customer.email,
    subject: `We received your payment ${isReceipt ? 'receipt' : 'notice'} for order ${order.orderNumber}`,
    html: layout(
      isReceipt ? 'Receipt received' : 'Transfer notice received',
      `<p>Hello ${escapeHtml(order.customer.fullName)},</p>
       <p>Thank you. We have received your ${what} for order <strong>${order.orderNumber}</strong>
       (${naira(order.total)}). Our team will confirm the payment in our bank account and email you as soon as it is confirmed.</p>
       ${button(orderLink(order), 'View order status')}`
    ),
  });
  notifyAdmin(
    `${isReceipt ? 'Payment receipt uploaded' : 'Transfer made'} for ${order.orderNumber}`,
    layout(
      isReceipt ? 'New payment receipt to review' : 'Customer says they have paid',
      `<p>${escapeHtml(order.customer.fullName)} ${isReceipt ? 'uploaded a bank transfer receipt' : 'says they have made the transfer'}
       for order <strong>${order.orderNumber}</strong> (${naira(order.total)}).
       ${latest?.senderName ? `Sender account name: <strong>${escapeHtml(latest.senderName)}</strong>.` : ''}</p>
       ${button(`${config.frontendUrl}/admin/orders/${order._id}`, 'Check and confirm payment')}`
    )
  );
}

function sendPaymentConfirmed(order) {
  sendMail({
    to: order.customer.email,
    subject: `Payment confirmed for order ${order.orderNumber}`,
    html: layout(
      'Payment confirmed ✓',
      `<p>Hello ${escapeHtml(order.customer.fullName)},</p>
       <p>Good news — we have received your payment of <strong>${naira(order.total)}</strong> for order
       <strong>${order.orderNumber}</strong>. Your order is confirmed and our team is now preparing it.</p>
       ${orderSummaryHtml(order)}
       ${button(orderLink(order), 'View your order')}
       <p>Thank you for choosing Tower of Grace Farms.</p>`
    ),
  });
}

function sendReceiptRejected(order, reason) {
  sendMail({
    to: order.customer.email,
    subject: `Action needed: payment for order ${order.orderNumber}`,
    html: layout(
      'We could not confirm your payment yet',
      `<p>Hello ${escapeHtml(order.customer.fullName)},</p>
       <p>We checked the receipt you uploaded for order <strong>${order.orderNumber}</strong> but could not match it to a payment
       of ${naira(order.total)} in our account.</p>
       ${reason ? `<p style="padding:12px;background:#fdf2d6;border-left:3px solid #e4a80c"><strong>Reason:</strong> ${escapeHtml(reason)}</p>` : ''}
       <p>Please check the transfer and upload a clear receipt again, or contact us.</p>
       ${button(orderLink(order), 'Upload receipt again')}`
    ),
  });
}

module.exports = {
  isEmailConfigured,
  sendMail,
  sendOrderReceived,
  sendOrderStatusUpdate,
  sendReceiptReceived,
  sendPaymentConfirmed,
  sendReceiptRejected,
  notifyAdmin,
  escapeHtml,
};
