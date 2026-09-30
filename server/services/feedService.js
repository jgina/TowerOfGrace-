const { FeedItem, FeedTransaction } = require('../models');
const ApiError = require('../utils/ApiError');
const config = require('../config');
const { notify } = require('./notificationService');
const { sendMail, escapeHtml } = require('./emailService');
const { getSettings } = require('./settingsService');

const round2 = (n) => Math.round(n * 100) / 100;
const DAY_MS = 24 * 60 * 60 * 1000;

/**
 * Atomically changes a feed's bag count. A reduction never takes stock below zero.
 * Returns the updated feed. Also writes the ledger line.
 */
async function changeFeedStock(feedId, delta, tx) {
  const qty = round2(delta);
  if (!Number.isFinite(qty) || qty === 0) throw ApiError.badRequest('Enter a quantity of bags');
  const filter = { _id: feedId, ...(qty < 0 ? { stockBags: { $gte: -qty - 0.0001 } } : {}) };
  const updated = await FeedItem.findOneAndUpdate(filter, { $inc: { stockBags: qty } }, { returnDocument: 'after' });
  if (!updated) {
    const feed = await FeedItem.findById(feedId);
    if (!feed) throw ApiError.notFound('Feed not found');
    throw ApiError.conflict(`Only ${feed.stockBags} bag(s) of ${feed.name} left in the store`);
  }
  // Keep the stored figure tidy after decimal arithmetic (e.g. 12.499999 → 12.5).
  const tidy = round2(Math.max(updated.stockBags, 0));
  if (tidy !== updated.stockBags) {
    await FeedItem.updateOne({ _id: feedId }, { $set: { stockBags: tidy } });
    updated.stockBags = tidy;
  }
  await FeedTransaction.create({ ...tx, feed: updated._id, feedName: updated.name, quantityBags: qty, balanceAfter: tidy });
  await checkLowStock(updated);
  return updated;
}

/**
 * Average bags used per day, per feed id, over the last `days` days — or over the days actually
 * recorded, if feeding records started more recently (so a new feed is not under-estimated).
 */
async function averageDailyUsage(days = 14) {
  const since = new Date(Date.now() - days * DAY_MS);
  const rows = await FeedTransaction.aggregate([
    { $match: { type: 'USAGE', date: { $gte: since } } },
    { $group: { _id: '$feed', used: { $sum: '$quantityBags' }, first: { $min: '$date' } } },
  ]);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return new Map(
    rows.map((r) => {
      const firstDay = new Date(r.first);
      firstDay.setHours(0, 0, 0, 0);
      const span = Math.min(Math.max(Math.round((today - firstDay) / DAY_MS) + 1, 1), days);
      return [String(r._id), round2(-r.used / span)];
    })
  );
}

async function recipients() {
  const settings = await getSettings();
  const list = String(settings.feedAlertEmails || '')
    .split(/[,;\s]+/)
    .map((e) => e.trim().toLowerCase())
    .filter((e) => /^\S+@\S+\.\S+$/.test(e));
  if (config.email.adminNotify) list.push(config.email.adminNotify.toLowerCase());
  return [...new Set(list)];
}

/**
 * Sends the low-feed alert once per drop: when stock reaches the low level it notifies admins in-app
 * and emails the boss; when stock is topped up above the level, the alert is re-armed.
 */
async function checkLowStock(feed) {
  if (feed.stockBags > feed.lowStockBags) {
    if (feed.lowAlertSentAt) await FeedItem.updateOne({ _id: feed._id }, { $unset: { lowAlertSentAt: 1 } });
    return false;
  }
  const claimed = await FeedItem.updateOne({ _id: feed._id, lowAlertSentAt: { $exists: false } }, { $set: { lowAlertSentAt: new Date() } });
  if (claimed.modifiedCount === 0) return false;

  const daily = (await averageDailyUsage()).get(String(feed._id)) || 0;
  const daysLeft = daily > 0 ? Math.floor(feed.stockBags / daily) : null;
  const title = feed.stockBags <= 0 ? `Out of feed: ${feed.name}` : `Low feed: ${feed.name} — ${feed.stockBags} bag(s) left`;
  const message = `${feed.stockBags} bag(s) remaining (alert level ${feed.lowStockBags}).${daysLeft !== null ? ` About ${daysLeft} day(s) left at the current rate.` : ''} Please restock.`;

  await notify({ type: 'FEED_LOW', title, message, link: '/admin/feeds' });
  const to = await recipients();
  if (to.length) {
    sendMail({
      to: to.join(', '),
      subject: `[Tower of Grace Farms] ${title}`,
      html: `
        <div style="font-family:Arial,sans-serif;font-size:14px;color:#13231a">
          <div style="background:#003c24;color:#fff;padding:14px 18px;border-bottom:4px solid #e4a80c"><strong>TOWER OF GRACE FARMS — FEED STORE ALERT</strong></div>
          <div style="padding:18px">
            <p><strong>${escapeHtml(feed.name)}</strong>${feed.brand ? ` (${escapeHtml(feed.brand)})` : ''} is running low.</p>
            <table cellpadding="6" style="border-collapse:collapse">
              <tr><td>Bags remaining</td><td><strong style="color:#c0392b">${feed.stockBags}</strong></td></tr>
              <tr><td>Alert level</td><td>${feed.lowStockBags} bags</td></tr>
              <tr><td>Average daily use (14 days)</td><td>${daily ? `${daily} bags/day` : 'not enough data'}</td></tr>
              <tr><td>Estimated days left</td><td>${daysLeft !== null ? `${daysLeft} day(s)` : '—'}</td></tr>
            </table>
            <p><a href="${config.frontendUrl}/admin/feeds" style="background:#e4a80c;color:#1c1300;padding:10px 16px;border-radius:6px;text-decoration:none;font-weight:bold">Open the feed store</a></p>
          </div>
        </div>`,
    });
  }
  return true;
}

module.exports = { changeFeedStock, averageDailyUsage, checkLowStock, round2 };
