const { Notification } = require('../models');

// Records an admin notification. Never throws: a failed alert must not break the customer's request.
async function notify({ type, title, message, link, order }) {
  try {
    await Notification.create({ type, title, message, link, order });
  } catch (error) {
    console.warn(`Notification (${type}) not saved: ${error.message}`);
  }
}

module.exports = { notify };
