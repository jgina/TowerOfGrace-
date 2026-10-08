const { Content } = require('../models');

// Operational defaults. Fees start at 0 so no price is invented; the admin sets real values in Settings.
const DEFAULT_SETTINGS = {
  currency: 'NGN',
  lowStockThreshold: 10,
  // Comma-separated emails (e.g. the farm owner) that receive feed-store and medicine-store alerts.
  feedAlertEmails: '',
  deliveryMethods: [
    {
      code: 'HOME_DELIVERY',
      label: 'Home / Business Delivery',
      description: 'Delivered to your address. Our team will confirm timing by phone.',
      fee: 0,
      requiresAddress: true,
      isActive: true,
    },
    {
      code: 'FARM_PICKUP',
      label: 'Farm Pickup',
      description: 'Collect your order from the farm at an agreed time.',
      fee: 0,
      requiresAddress: false,
      isActive: true,
    },
  ],
  payments: {
    bankTransferEnabled: true,
    payOnDeliveryEnabled: true,
    bankName: 'First Bank',
    accountName: 'Ngonadi Amobi Felix',
    accountNumber: '3011906808',
    instructions: 'Use your order number as the transfer reference. Your order is confirmed once payment is received.',
  },
};

async function getSettings() {
  const doc = await Content.findOne({ key: 'settings' }).lean();
  const data = doc?.data || {};
  return {
    ...DEFAULT_SETTINGS,
    ...data,
    deliveryMethods: Array.isArray(data.deliveryMethods) && data.deliveryMethods.length
      ? data.deliveryMethods
      : DEFAULT_SETTINGS.deliveryMethods,
    // Blank saved values (e.g. an untouched bank field) fall back to the defaults instead of erasing them.
    payments: {
      ...DEFAULT_SETTINGS.payments,
      ...Object.fromEntries(Object.entries(data.payments || {}).filter(([, v]) => v !== '' && v !== null && v !== undefined)),
    },
  };
}

module.exports = { getSettings, DEFAULT_SETTINGS };
