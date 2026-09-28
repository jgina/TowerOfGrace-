const config = require('../config');
const { Order } = require('../models');
const ApiError = require('../utils/ApiError');
const asyncHandler = require('../utils/asyncHandler');
const { gateways, getGateway, availableMethods, describeGatewayError } = require('../services/paymentService');
const { getSettings } = require('../services/settingsService');
const orderService = require('../services/orderService');

const ONLINE = ['PAYSTACK', 'FLUTTERWAVE'];

// Applies a verified gateway result to an order. Only a successful, full-amount NGN payment marks it paid.
async function applyVerification(order, result) {
  const gatewayResponse = result.raw;
  if (result.successful) {
    const amountOk = result.amount + 0.009 >= order.total && (!result.currency || result.currency === 'NGN');
    if (!amountOk) {
      order.internalNotes.push({
        note: `Gateway reported ${result.currency} ${result.amount} but the order total is NGN ${order.total}. Not marked as paid.`,
        authorName: 'System',
      });
      order.paymentGatewayResponse = gatewayResponse;
      await order.save();
      return order;
    }
    return orderService.markPaid(order, { note: `Payment confirmed via ${order.paymentMethod}`, gatewayResponse });
  }
  if (result.failed && order.paymentStatus !== 'PAID') {
    order.paymentStatus = 'FAILED';
    order.paymentGatewayResponse = gatewayResponse;
    await order.save();
  }
  return order;
}

const publicOrder = (order) => ({
  _id: order._id,
  orderNumber: order.orderNumber,
  total: order.total,
  paymentMethod: order.paymentMethod,
  paymentStatus: order.paymentStatus,
  orderStatus: order.orderStatus,
  customer: { fullName: order.customer.fullName, email: order.customer.email },
});

exports.getPaymentConfig = asyncHandler(async (req, res) => {
  const settings = await getSettings();
  const methods = availableMethods();
  res.json({
    success: true,
    methods: {
      ...methods,
      BANK_TRANSFER: settings.payments.bankTransferEnabled !== false,
      PAY_ON_DELIVERY: settings.payments.payOnDeliveryEnabled !== false,
    },
    bankTransfer: {
      bankName: settings.payments.bankName,
      accountName: settings.payments.accountName,
      accountNumber: settings.payments.accountNumber,
      instructions: settings.payments.instructions,
    },
  });
});

exports.initializePayment = asyncHandler(async (req, res) => {
  const { orderId, email } = req.body;
  const order = await Order.findById(orderId);
  if (!order) throw ApiError.notFound('Order not found');

  const isOwner = req.user && order.user && String(order.user) === String(req.user._id);
  const emailMatches = email && String(email).toLowerCase() === order.customer.email;
  if (!isOwner && !emailMatches) throw ApiError.forbidden('You cannot pay for this order');

  if (!ONLINE.includes(order.paymentMethod)) throw ApiError.badRequest('This order does not use online payment');
  if (order.paymentStatus === 'PAID') throw ApiError.conflict('This order has already been paid');
  if (order.orderStatus === 'CANCELLED') throw ApiError.conflict('This order has been cancelled');

  const gateway = getGateway(order.paymentMethod);
  const reference = `${order.orderNumber}-${Date.now().toString(36).toUpperCase()}`;
  const callbackUrl = `${config.frontendUrl}/payment/verify?gateway=${order.paymentMethod.toLowerCase()}&order=${encodeURIComponent(order.orderNumber)}`;

  try {
    const session = await gateway.initialize({ order, reference, callbackUrl });
    order.paymentReference = session.reference;
    if (order.paymentStatus === 'FAILED') order.paymentStatus = 'PENDING';
    await order.save();
    res.json({ success: true, authorizationUrl: session.authorizationUrl, reference: session.reference });
  } catch (error) {
    if (error.isOperational) throw error;
    throw describeGatewayError(error);
  }
});

exports.verifyPayment = asyncHandler(async (req, res) => {
  const reference = req.query.reference || req.query.tx_ref || req.query.trxref;
  if (!reference) throw ApiError.badRequest('Payment reference is required');
  const order = await Order.findOne({ paymentReference: reference });
  if (!order) throw ApiError.notFound('No order matches this payment reference');

  if (order.paymentStatus !== 'PAID') {
    const gateway = getGateway(order.paymentMethod);
    try {
      const result = await gateway.verify(reference);
      await applyVerification(order, result);
    } catch (error) {
      if (error.isOperational) throw error;
      throw describeGatewayError(error);
    }
  }
  res.json({ success: true, order: publicOrder(order) });
});

// Admin re-check for online orders whose customer never returned from the gateway.
exports.adminRecheckPayment = asyncHandler(async (req, res) => {
  const order = await Order.findById(req.params.id);
  if (!order) throw ApiError.notFound('Order not found');
  if (!ONLINE.includes(order.paymentMethod) || !order.paymentReference) {
    throw ApiError.badRequest('This order has no online payment reference to check');
  }
  const gateway = getGateway(order.paymentMethod);
  try {
    await applyVerification(order, await gateway.verify(order.paymentReference));
  } catch (error) {
    if (error.isOperational) throw error;
    throw describeGatewayError(error);
  }
  res.json({ success: true, order });
});

function webhookHandler(method) {
  return asyncHandler(async (req, res) => {
    const gateway = gateways[method];
    if (!gateway.isConfigured() || !gateway.verifyWebhook(req)) return res.sendStatus(401);

    const reference = gateway.referenceFromWebhook(req.body);
    if (reference) {
      const order = await Order.findOne({ paymentReference: reference });
      // The webhook payload is only a hint; the transaction is always re-verified with the gateway.
      if (order && order.paymentStatus !== 'PAID') {
        try {
          await applyVerification(order, await gateway.verify(reference));
        } catch (error) {
          console.error(`${method} webhook verification failed for ${reference}: ${error.message}`);
        }
      }
    }
    return res.sendStatus(200);
  });
}

exports.paystackWebhook = webhookHandler('PAYSTACK');
exports.flutterwaveWebhook = webhookHandler('FLUTTERWAVE');
