const mongoose = require('mongoose');
const { StockLoss, Product } = require('../models');
const ApiError = require('../utils/ApiError');
const asyncHandler = require('../utils/asyncHandler');
const { getPagination, buildMeta } = require('../utils/pagination');
const inventory = require('../services/inventoryService');
const { liveBirdsExpr } = require('../utils/categoryKinds');

function buildFilter(query) {
  const { from, to, reason, category, product, status } = query;
  const filter = {};
  if (reason) filter.reason = reason;
  if (category) filter.categorySlug = category;
  if (product && mongoose.isValidObjectId(product)) filter.product = new mongoose.Types.ObjectId(product);
  if (status === 'active') filter.reversedAt = { $exists: false };
  if (status === 'reversed') filter.reversedAt = { $exists: true };
  if (from || to) {
    filter.occurredOn = {};
    if (from) filter.occurredOn.$gte = new Date(from);
    if (to) filter.occurredOn.$lte = new Date(`${to}T23:59:59.999Z`);
  }
  return filter;
}

exports.listLosses = asyncHandler(async (req, res) => {
  const { page, limit, skip } = getPagination(req.query, 25, 100);
  const filter = buildFilter(req.query);
  // Summaries only count losses that still stand (reversed entries are corrections).
  const active = { ...filter, reversedAt: { $exists: false } };
  if (req.query.status === 'reversed') active._id = null; // nothing active to summarise

  const [records, total, byReason, byProduct, totals] = await Promise.all([
    StockLoss.find(filter).sort({ occurredOn: -1, createdAt: -1 }).skip(skip).limit(limit).lean(),
    StockLoss.countDocuments(filter),
    StockLoss.aggregate([{ $match: active }, { $group: { _id: '$reason', units: { $sum: '$quantity' }, records: { $sum: 1 } } }, { $sort: { units: -1 } }]),
    StockLoss.aggregate([
      { $match: active },
      {
        $group: {
          _id: { product: '$product', variantLabel: '$variantLabel' },
          productName: { $last: '$productName' },
          categoryName: { $last: '$categoryName' },
          units: { $sum: '$quantity' },
        },
      },
      { $sort: { units: -1 } },
      { $limit: 6 },
    ]),
    StockLoss.aggregate([
      { $match: active },
      {
        $group: {
          _id: null,
          units: { $sum: '$quantity' },
          records: { $sum: 1 },
          birds: { $sum: { $cond: [liveBirdsExpr, '$quantity', 0] } },
          meat: { $sum: { $cond: [{ $eq: ['$categorySlug', 'prepared-meat'] }, '$quantity', 0] } },
          eggs: { $sum: { $cond: [{ $eq: ['$categorySlug', 'eggs'] }, '$quantity', 0] } },
        },
      },
    ]),
  ]);

  res.json({
    success: true,
    records,
    meta: buildMeta(total, page, limit),
    summary: {
      units: totals[0]?.units || 0,
      records: totals[0]?.records || 0,
      birds: totals[0]?.birds || 0,
      eggs: totals[0]?.eggs || 0,
      meat: totals[0]?.meat || 0,
      byReason: byReason.map((r) => ({ reason: r._id, units: r.units, records: r.records })),
      byProduct: byProduct.map((p) => ({
        productId: p._id.product,
        productName: p.productName,
        variantLabel: p._id.variantLabel,
        categoryName: p.categoryName,
        units: p.units,
      })),
    },
  });
});

exports.createLoss = asyncHandler(async (req, res) => {
  const { productId, variantId, quantity, reason, occurredOn, notes } = req.body;
  const qty = Number(quantity);
  if (!Number.isInteger(qty) || qty < 1) throw ApiError.badRequest('Quantity must be a whole number of at least 1');

  const product = await Product.findById(productId).populate('category', 'name slug');
  if (!product) throw ApiError.notFound('Product not found');
  if (product.variants.length && !variantId) throw ApiError.badRequest('Choose which weight or pack option was affected');

  const date = occurredOn ? new Date(occurredOn) : new Date();
  if (date > new Date(Date.now() + 60 * 1000)) throw ApiError.badRequest('The date of the loss cannot be in the future');

  const change = await inventory.changeStock({
    productId: product._id,
    variantId: variantId || undefined,
    delta: -qty,
    movement: { type: 'LOSS', note: `${reason}${notes ? ` — ${notes}` : ''}`, user: req.user, at: date },
  });

  const record = await StockLoss.create({
    product: product._id,
    variantId: variantId || undefined,
    productName: product.name,
    variantLabel: variantId ? change.holder.label : undefined,
    categoryName: product.category?.name,
    categorySlug: product.category?.slug,
    quantity: qty,
    reason,
    occurredOn: date,
    notes,
    stockBefore: change.before,
    stockAfter: change.after,
    recordedBy: req.user._id,
    recordedByName: req.user.name,
  });

  res.status(201).json({ success: true, record, message: `${qty} unit(s) deducted from ${product.name}` });
});

// Undoes a mistaken entry: restores the stock and keeps the record, marked as reversed.
exports.reverseLoss = asyncHandler(async (req, res) => {
  const record = await StockLoss.findById(req.params.id);
  if (!record) throw ApiError.notFound('Loss record not found');
  if (record.reversedAt) throw ApiError.conflict('This record has already been reversed');
  if (record.marketTrip) {
    throw ApiError.conflict(`This loss belongs to market trip ${record.tripNumber}. Its stock was deducted when the trip left the farm.`);
  }
  if (!(await Product.exists({ _id: record.product }))) {
    throw ApiError.conflict('The product no longer exists, so its stock cannot be restored');
  }

  // Claim the record first so two admins cannot restore the same stock twice.
  const claimed = await StockLoss.findOneAndUpdate(
    { _id: record._id, reversedAt: { $exists: false } },
    { reversedAt: new Date(), reversedBy: req.user._id, reversedByName: req.user.name, reversalNote: req.body.note },
    { returnDocument: 'after' }
  );
  if (!claimed) throw ApiError.conflict('This record has already been reversed');

  try {
    await inventory.changeStock({
      productId: record.product,
      variantId: record.variantId,
      delta: record.quantity,
      movement: { type: 'LOSS_REVERSAL', note: req.body.note || 'Loss entry reversed', user: req.user },
    });
  } catch (error) {
    await StockLoss.updateOne({ _id: record._id }, { $unset: { reversedAt: 1, reversedBy: 1, reversedByName: 1, reversalNote: 1 } });
    throw error;
  }
  res.json({ success: true, record: claimed, message: `${record.quantity} unit(s) returned to stock` });
});
