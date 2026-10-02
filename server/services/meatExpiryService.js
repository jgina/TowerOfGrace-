const { ProcessingRun } = require('../models');
const { notify } = require('./notificationService');
const { notifyAdmin, escapeHtml } = require('./emailService');
const config = require('../config');

const DAY_MS = 24 * 60 * 60 * 1000;

/**
 * Alerts the admins once per processing run when its prepared meat reaches its use-by date
 * (within the next 24 hours). Safe to run any number of times: `expiryNotifiedAt` is claimed atomically.
 */
async function checkMeatExpiry() {
  const now = Date.now();
  const due = await ProcessingRun.find({
    status: 'COMPLETED',
    expiryNotifiedAt: { $exists: false },
    useBy: { $lte: new Date(now + DAY_MS), $gte: new Date(now - 7 * DAY_MS) },
  });
  let sent = 0;
  for (const run of due) {
    const claimed = await ProcessingRun.updateOne({ _id: run._id, expiryNotifiedAt: { $exists: false } }, { $set: { expiryNotifiedAt: new Date() } });
    if (claimed.modifiedCount === 0) continue;
    sent += 1;
    const products = run.outputs.map((o) => `${o.quantity} × ${o.productName}${o.variantLabel ? ` (${o.variantLabel})` : ''}`).join(', ');
    const when = new Date(run.useBy).toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' });
    const passed = new Date(run.useBy).getTime() < now;
    const title = `${passed ? 'Use-by passed' : 'Use by'} ${when}: meat from ${run.runNumber}`;
    const message = `${products}. Check what is left — sell it first, or record it as spoiled in Mortality & Losses.`;
    await notify({ type: 'MEAT_EXPIRY', title, message, link: `/admin/processing/${run._id}` });
    notifyAdmin(
      title,
      `<p>Prepared meat from processing run <strong>${escapeHtml(run.runNumber)}</strong> reaches its use-by date on <strong>${escapeHtml(when)}</strong>.</p>
       <p>${escapeHtml(products)}</p>
       <p>Sell remaining stock first, or record it as spoiled. <a href="${config.frontendUrl}/admin/processing/${run._id}">Open the run</a></p>`
    );
  }
  return sent;
}

module.exports = { checkMeatExpiry };
