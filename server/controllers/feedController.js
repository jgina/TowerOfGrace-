const mongoose = require('mongoose');
const { FeedItem, FeedTransaction, FlockBatch, Product, Category } = require('../models');
const ApiError = require('../utils/ApiError');
const asyncHandler = require('../utils/asyncHandler');
const pick = require('../utils/pick');
const { getPagination, buildMeta } = require('../utils/pagination');
const { changeFeedStock, averageDailyUsage, checkLowStock, round2 } = require('../services/feedService');
const { NOT_LIVE_BIRDS } = require('../utils/categoryKinds');

const FIELDS = ['name', 'brand', 'feedType', 'bagSizeKg', 'lowStockBags', 'notes', 'isActive'];
const DAY_MS = 24 * 60 * 60 * 1000;

const toDate = (value) => {
  const date = value ? new Date(value) : new Date();
  if (Number.isNaN(date.getTime())) throw ApiError.badRequest('Invalid date');
  if (date > new Date(Date.now() + 60 * 1000)) throw ApiError.badRequest('The date cannot be in the future');
  return date;
};

const bags = (value, label = 'Quantity') => {
  const n = round2(Number(value));
  if (!Number.isFinite(n) || n <= 0) throw ApiError.badRequest(`${label} must be more than 0 bags`);
  return n;
};

// ---------- Store overview ----------

exports.listFeeds = asyncHandler(async (req, res) => {
  const filter = req.query.all === 'true' ? {} : { isActive: true };
  const since7 = new Date(Date.now() - 7 * DAY_MS);
  const since30 = new Date(Date.now() - 30 * DAY_MS);
  const [feeds, daily, usage7, usage30, spend30, byTarget] = await Promise.all([
    FeedItem.find(filter).sort({ name: 1 }),
    averageDailyUsage(14),
    FeedTransaction.aggregate([{ $match: { type: 'USAGE', date: { $gte: since7 } } }, { $group: { _id: null, bags: { $sum: '$quantityBags' } } }]),
    FeedTransaction.aggregate([{ $match: { type: 'USAGE', date: { $gte: since30 } } }, { $group: { _id: '$feed', bags: { $sum: '$quantityBags' } } }]),
    FeedTransaction.aggregate([{ $match: { type: 'PURCHASE', date: { $gte: since30 } } }, { $group: { _id: null, cost: { $sum: '$totalCost' }, bags: { $sum: '$quantityBags' } } }]),
    // Feed used in the last 30 days, split by who was fed (older entries: batch-linked or whole farm).
    FeedTransaction.aggregate([
      { $match: { type: 'USAGE', date: { $gte: since30 } } },
      {
        $group: {
          _id: { $ifNull: ['$fedTo', { $cond: [{ $ifNull: ['$batch', false] }, 'BATCH', 'FARM'] }] },
          bags: { $sum: '$quantityBags' },
        },
      },
    ]),
  ]);
  const used30 = new Map(usage30.map((u) => [String(u._id), round2(-u.bags)]));

  const rows = feeds.map((f) => {
    const perDay = daily.get(String(f._id)) || 0;
    return {
      ...f.toJSON(),
      avgDailyBags: perDay,
      daysLeft: perDay > 0 ? Math.floor(f.stockBags / perDay) : null,
      used30Days: used30.get(String(f._id)) || 0,
      stockKg: round2(f.stockBags * (f.bagSizeKg || 0)),
    };
  });
  const withRate = rows.filter((r) => r.daysLeft !== null);

  res.json({
    success: true,
    feeds: rows,
    summary: {
      feedTypes: rows.length,
      totalBags: round2(rows.reduce((s, r) => s + r.stockBags, 0)),
      totalKg: round2(rows.reduce((s, r) => s + r.stockKg, 0)),
      lowFeeds: rows.filter((r) => r.isLow).length,
      used7Days: round2(-(usage7[0]?.bags || 0)),
      bought30Days: round2(spend30[0]?.bags || 0),
      spent30Days: round2(spend30[0]?.cost || 0),
      fedTo30Days: Object.fromEntries(byTarget.map((t) => [t._id, round2(-t.bags)])),
      soonestOut: withRate.sort((a, b) => a.daysLeft - b.daysLeft)[0] ? { name: withRate[0].name, daysLeft: withRate[0].daysLeft } : null,
    },
  });
});

exports.listTransactions = asyncHandler(async (req, res) => {
  const { feed, type, batch, fedTo, from, to } = req.query;
  const { page, limit, skip } = getPagination(req.query, 30, 200);
  const filter = {};
  if (feed && mongoose.isValidObjectId(feed)) filter.feed = feed;
  if (batch && mongoose.isValidObjectId(batch)) filter.batch = batch;
  if (type) filter.type = type;
  if (fedTo) filter.fedTo = fedTo;
  if (from || to) {
    filter.date = {};
    if (from) filter.date.$gte = new Date(from);
    if (to) filter.date.$lte = new Date(`${to}T23:59:59.999Z`);
  }
  const [transactions, total] = await Promise.all([
    // Newest entry first, in the order recorded, so the running balance column always reads correctly.
    FeedTransaction.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit),
    FeedTransaction.countDocuments(filter),
  ]);
  res.json({ success: true, transactions, meta: buildMeta(total, page, limit) });
});

// ---------- Feed types ----------

exports.createFeed = asyncHandler(async (req, res) => {
  const data = pick(req.body, FIELDS);
  const feed = await FeedItem.create({ ...data, stockBags: 0 });
  const opening = Number(req.body.openingBags || 0);
  if (opening > 0) {
    await changeFeedStock(feed._id, opening, { type: 'OPENING', date: new Date(), note: 'Opening stock', byName: req.user.name });
  }
  res.status(201).json({ success: true, feed: await FeedItem.findById(feed._id), message: `${feed.name} added to the feed store` });
});

exports.updateFeed = asyncHandler(async (req, res) => {
  const feed = await FeedItem.findById(req.params.id);
  if (!feed) throw ApiError.notFound('Feed not found');
  Object.assign(feed, pick(req.body, FIELDS));
  await feed.save();
  // A changed alert level may make the feed low (or no longer low) immediately.
  await checkLowStock(feed);
  res.json({ success: true, feed: await FeedItem.findById(feed._id), message: 'Feed updated' });
});

// ---------- Stock in / out ----------

exports.recordPurchase = asyncHandler(async (req, res) => {
  const quantity = bags(req.body.bags);
  const costPerBag = req.body.costPerBag === '' || req.body.costPerBag === undefined ? undefined : Number(req.body.costPerBag);
  if (costPerBag !== undefined && (!Number.isFinite(costPerBag) || costPerBag < 0)) throw ApiError.badRequest('Cost per bag must be 0 or more');
  const feed = await changeFeedStock(req.params.id, quantity, {
    type: 'PURCHASE',
    date: toDate(req.body.date),
    supplier: req.body.supplier,
    costPerBag,
    totalCost: costPerBag !== undefined ? round2(costPerBag * quantity) : undefined,
    note: req.body.note,
    byName: req.user.name,
  });
  if (costPerBag !== undefined) await FeedItem.updateOne({ _id: feed._id }, { lastCostPerBag: costPerBag });
  res.status(201).json({ success: true, feed, message: `${quantity} bag(s) of ${feed.name} added — ${feed.stockBags} now in store` });
});

// Live-bird products in the main stock (not eggs, not prepared meat).
async function birdProducts(ids) {
  const notBirds = await Category.find({ slug: { $in: NOT_LIVE_BIRDS } }).select('_id').lean();
  const filter = { category: { $nin: notBirds.map((c) => c._id) } };
  if (ids) filter._id = { $in: ids };
  else filter.isActive = true;
  return Product.find(filter).select('name availableStock').sort({ name: 1 }).lean();
}
exports.birdProducts = birdProducts;

// Who can be fed: open flock batches (growing or ready for sale) and birds already in the main stock.
exports.feedingTargets = asyncHandler(async (req, res) => {
  const [batches, products] = await Promise.all([
    FlockBatch.find({ status: { $in: ['ACTIVE', 'READY'] } }).sort({ status: 1, purchaseDate: 1 }),
    birdProducts(),
  ]);
  res.json({
    success: true,
    batches: batches.map((b) => ({ _id: b._id, batchCode: b.batchCode, categoryName: b.categoryName, status: b.status, ageDays: b.ageDays(), live: b.counts().live })),
    products: products.map((p) => ({ _id: p._id, name: p.name, stock: p.availableStock || 0 })),
  });
});

// Who a feeding line went to. Older clients only sent batchId.
const fedToOf = (l) => l.fedTo || (l.batchId ? 'BATCH' : 'FARM');

/*
  Daily feeding: several lines at once, e.g. Starter 3 bags → batch BRL-…, Layer mash 4 bags → birds in stock,
  Grower 2 bags → the whole farm. All lines are checked first; if any line would take a feed below zero,
  nothing is deducted.
*/
exports.recordUsage = asyncHandler(async (req, res) => {
  const date = toDate(req.body.date);
  const lines = (req.body.lines || []).map((l) => ({ ...l, fedTo: fedToOf(l), bags: bags(l.bags, 'Bags used') }));
  if (!lines.length) throw ApiError.badRequest('Add at least one feed used');

  const feeds = await FeedItem.find({ _id: { $in: lines.map((l) => l.feedId) } });
  const feedsById = new Map(feeds.map((f) => [String(f._id), f]));
  const batchIds = lines.filter((l) => l.fedTo === 'BATCH').map((l) => l.batchId).filter(Boolean);
  const productIds = lines.filter((l) => l.fedTo === 'STOCK').map((l) => l.productId).filter(Boolean);
  const [batches, products] = await Promise.all([
    FlockBatch.find({ _id: { $in: batchIds } }).select('batchCode status'),
    productIds.length ? birdProducts(productIds) : [],
  ]);
  const batchesById = new Map(batches.map((b) => [String(b._id), b]));
  const productsById = new Map(products.map((p) => [String(p._id), p]));

  const needed = new Map();
  lines.forEach((l) => {
    const feed = feedsById.get(String(l.feedId));
    if (!feed) throw ApiError.badRequest('A selected feed no longer exists');
    if (l.fedTo === 'BATCH') {
      const batch = batchesById.get(String(l.batchId));
      if (!batch) throw ApiError.badRequest('Choose the flock batch that was fed');
      if (!['ACTIVE', 'READY'].includes(batch.status)) {
        throw ApiError.badRequest(`Batch ${batch.batchCode} has left the batch system — record its feed under "Birds in stock"`);
      }
    }
    if (l.fedTo === 'STOCK' && l.productId && !productsById.get(String(l.productId))) throw ApiError.badRequest('A selected stock bird product no longer exists');
    if (l.fedTo === 'GROUP' && !String(l.groupName || '').trim()) throw ApiError.badRequest('Name the pen or group that was fed');
    needed.set(String(feed._id), round2((needed.get(String(feed._id)) || 0) + l.bags));
  });
  needed.forEach((qty, id) => {
    const feed = feedsById.get(id);
    if (qty > feed.stockBags) throw ApiError.conflict(`Only ${feed.stockBags} bag(s) of ${feed.name} left, but ${qty} entered`);
  });

  const applied = [];
  try {
    for (const l of lines) {
      const batch = l.fedTo === 'BATCH' ? batchesById.get(String(l.batchId)) : null;
      const product = l.fedTo === 'STOCK' && l.productId ? productsById.get(String(l.productId)) : null;
      await changeFeedStock(l.feedId, -l.bags, {
        type: 'USAGE',
        date,
        fedTo: l.fedTo,
        batch: batch?._id,
        batchCode: batch?.batchCode,
        product: product?._id,
        productName: product?.name,
        groupName: l.fedTo === 'GROUP' ? String(l.groupName).trim() : undefined,
        note: l.note || req.body.note,
        byName: req.user.name,
      });
      applied.push(l);
    }
  } catch (error) {
    // Another deduction raced us: put back what this request already took.
    for (const l of applied) {
      await changeFeedStock(l.feedId, l.bags, { type: 'ADJUSTMENT', date, note: 'Reversal of an incomplete feeding entry', byName: 'System' });
    }
    throw error;
  }

  const total = round2(lines.reduce((s, l) => s + l.bags, 0));
  res.status(201).json({ success: true, message: `${total} bag(s) of feed recorded as used` });
});

// Stock count correction: set the counted figure (or adjust by a difference).
exports.adjustStock = asyncHandler(async (req, res) => {
  const feed = await FeedItem.findById(req.params.id);
  if (!feed) throw ApiError.notFound('Feed not found');
  let delta;
  if (req.body.countedBags !== undefined && req.body.countedBags !== '') {
    const counted = round2(Number(req.body.countedBags));
    if (!Number.isFinite(counted) || counted < 0) throw ApiError.badRequest('Counted bags must be 0 or more');
    delta = round2(counted - feed.stockBags);
  } else {
    delta = round2(Number(req.body.adjustmentBags));
  }
  if (!Number.isFinite(delta)) throw ApiError.badRequest('Enter the counted bags');
  if (delta === 0) return res.json({ success: true, feed, message: 'Stock already matches the count' });
  if (!String(req.body.note || '').trim()) throw ApiError.badRequest('Give a reason for the correction');
  const updated = await changeFeedStock(feed._id, delta, { type: 'ADJUSTMENT', date: toDate(req.body.date), note: req.body.note, byName: req.user.name });
  return res.json({ success: true, feed: updated, message: `${feed.name} corrected to ${updated.stockBags} bag(s)` });
});

// Feed eaten by one flock batch (shown on the batch page).
exports.batchFeedUsage = asyncHandler(async (req, res) => {
  const rows = await FeedTransaction.aggregate([
    { $match: { type: 'USAGE', batch: new mongoose.Types.ObjectId(req.params.batchId) } },
    { $group: { _id: '$feed', feedName: { $last: '$feedName' }, bags: { $sum: '$quantityBags' }, lastDate: { $max: '$date' } } },
    { $sort: { feedName: 1 } },
  ]);
  const feeds = rows.map((r) => ({ feedId: r._id, feedName: r.feedName, bags: round2(-r.bags), lastDate: r.lastDate }));
  res.json({ success: true, feeds, totalBags: round2(feeds.reduce((s, f) => s + f.bags, 0)) });
});
