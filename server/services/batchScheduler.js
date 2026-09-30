const { FlockBatch } = require('../models');
const { notify } = require('./notificationService');
const { notifyAdmin, escapeHtml } = require('./emailService');
const config = require('../config');

const INTERVAL_MS = 30 * 60 * 1000;

/**
 * Moves every active batch that has reached its target age to READY and alerts the admins once.
 * Safe to run any number of times: the atomic claim on `readyNotifiedAt` prevents duplicate alerts.
 */
async function markReadyBatches() {
  const open = await FlockBatch.find({ status: { $in: ['ACTIVE', 'READY'] }, readyNotifiedAt: { $exists: false } });
  let marked = 0;
  for (const batch of open) {
    if (batch.stage() !== 'READY') continue;
    const claimed = await FlockBatch.updateOne(
      { _id: batch._id, status: { $in: ['ACTIVE', 'READY'] }, readyNotifiedAt: { $exists: false } },
      { $set: { status: 'READY', readyAt: batch.readyAt || new Date(), readyNotifiedAt: new Date() } }
    );
    if (claimed.modifiedCount === 0) continue; // another run got there first
    marked += 1;
    const { live } = batch.counts();
    const title = `Batch ${batch.batchCode} is ready`;
    const message = `${live} ${batch.categoryName || 'birds'} reached ${batch.targetAgeDays} days. Confirm and move them into stock for sale.`;
    await notify({ type: 'BATCH_READY', title, message, link: `/admin/batches/${batch._id}` });
    notifyAdmin(
      title,
      `<p><strong>${escapeHtml(batch.batchCode)}</strong> (${live} ${escapeHtml(batch.categoryName || 'birds')}) has reached its target age of
       ${batch.targetAgeDays} days.</p><p><a href="${config.frontendUrl}/admin/batches/${batch._id}">Confirm and move to stock</a></p>`
    );
  }
  return marked;
}

let timer = null;

function startBatchScheduler() {
  if (timer) return;
  const run = () => markReadyBatches().catch((error) => console.warn(`Batch scheduler: ${error.message}`));
  run();
  timer = setInterval(run, INTERVAL_MS);
  timer.unref?.();
}

module.exports = { markReadyBatches, startBatchScheduler };
