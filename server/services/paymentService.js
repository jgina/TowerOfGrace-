const crypto = require('crypto');
const axios = require('axios');
const config = require('../config');
const ApiError = require('../utils/ApiError');

const paystackClient = axios.create({ baseURL: 'https://api.paystack.co', timeout: 20000 });
const flutterwaveClient = axios.create({ baseURL: 'https://api.flutterwave.com/v3', timeout: 20000 });

const gateways = {
  PAYSTACK: {
    isConfigured: () => Boolean(config.paystack.secretKey),
    headers: () => ({ Authorization: `Bearer ${config.paystack.secretKey}` }),

    async initialize({ order, reference, callbackUrl }) {
      const { data } = await paystackClient.post(
        '/transaction/initialize',
        {
          email: order.customer.email,
          amount: Math.round(order.total * 100), // kobo
          currency: 'NGN',
          reference,
          callback_url: callbackUrl,
          metadata: { orderId: String(order._id), orderNumber: order.orderNumber },
        },
        { headers: this.headers() }
      );
      return { authorizationUrl: data.data.authorization_url, reference: data.data.reference };
    },

    async verify(reference) {
      const { data } = await paystackClient.get(`/transaction/verify/${encodeURIComponent(reference)}`, {
        headers: this.headers(),
      });
      const tx = data.data || {};
      return {
        successful: tx.status === 'success',
        failed: ['failed', 'abandoned', 'reversed'].includes(tx.status),
        amount: (tx.amount || 0) / 100,
        currency: tx.currency,
        reference: tx.reference,
        raw: { id: tx.id, status: tx.status, channel: tx.channel, paid_at: tx.paid_at, gateway_response: tx.gateway_response },
      };
    },

    verifyWebhook(req) {
      if (!config.paystack.secretKey || !req.rawBody) return false;
      const hash = crypto.createHmac('sha512', config.paystack.secretKey).update(req.rawBody).digest('hex');
      const signature = req.headers['x-paystack-signature'] || '';
      return hash.length === signature.length && crypto.timingSafeEqual(Buffer.from(hash), Buffer.from(signature));
    },

    referenceFromWebhook(body) {
      return body?.event === 'charge.success' ? body.data?.reference : null;
    },
  },

  FLUTTERWAVE: {
    isConfigured: () => Boolean(config.flutterwave.secretKey),
    headers: () => ({ Authorization: `Bearer ${config.flutterwave.secretKey}` }),

    async initialize({ order, reference, callbackUrl }) {
      const { data } = await flutterwaveClient.post(
        '/payments',
        {
          tx_ref: reference,
          amount: order.total,
          currency: 'NGN',
          redirect_url: callbackUrl,
          customer: { email: order.customer.email, phonenumber: order.customer.phone, name: order.customer.fullName },
          customizations: { title: 'Tower of Grace Farms', description: `Order ${order.orderNumber}` },
          meta: { orderId: String(order._id), orderNumber: order.orderNumber },
        },
        { headers: this.headers() }
      );
      return { authorizationUrl: data.data.link, reference };
    },

    async verify(reference) {
      const { data } = await flutterwaveClient.get('/transactions/verify_by_reference', {
        params: { tx_ref: reference },
        headers: this.headers(),
      });
      const tx = data.data || {};
      return {
        successful: tx.status === 'successful',
        failed: tx.status === 'failed',
        amount: Number(tx.amount || 0),
        currency: tx.currency,
        reference: tx.tx_ref,
        raw: { id: tx.id, status: tx.status, payment_type: tx.payment_type, created_at: tx.created_at },
      };
    },

    verifyWebhook(req) {
      const expected = config.flutterwave.webhookHash;
      const received = req.headers['verif-hash'] || '';
      return Boolean(expected) && expected.length === received.length &&
        crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(received));
    },

    referenceFromWebhook(body) {
      return body?.data?.tx_ref || body?.txRef || null;
    },
  },
};

function getGateway(method) {
  const gateway = gateways[method];
  if (!gateway) throw ApiError.badRequest('This payment method does not use an online gateway');
  if (!gateway.isConfigured()) {
    throw ApiError.unavailable(`${method === 'PAYSTACK' ? 'Paystack' : 'Flutterwave'} payments are not available yet`);
  }
  return gateway;
}

function availableMethods() {
  return {
    PAYSTACK: gateways.PAYSTACK.isConfigured(),
    FLUTTERWAVE: gateways.FLUTTERWAVE.isConfigured(),
    BANK_TRANSFER: true,
    PAY_ON_DELIVERY: true,
  };
}

function describeGatewayError(error) {
  const message = error.response?.data?.message || error.message;
  return ApiError.unavailable(`Payment gateway error: ${message}`);
}

module.exports = { gateways, getGateway, availableMethods, describeGatewayError };
