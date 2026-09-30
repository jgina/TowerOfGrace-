const mongoose = require('mongoose');
const { FlockBatch, Category, Product, Counter } = require('../models');
const ApiError = require('../utils/ApiError');
const asyncHandler = require('../utils/asyncHandler');
const escapeRegex = require('../utils/escapeRegex');
const pick = require('../utils/pick');
const { getPagination, buildMeta } = require('../utils/pagination');
const inventory = require('../services/inventoryService');
const { markReadyBatches } = require('../services/batchScheduler');

const PREFIX = { broilers: 'BRL', noilers: 'NOI', turkeys: 'TRK' };
const EDITABLE = ['breed', 'supplier', 'house', 'purchaseDate', 'ageAtPurchaseDays', 'quantityPurchased', 'unitCost', 'targetAgeDays', 'targetWeightKg', 'notes'];
const NUMERIC = ['ageAtPurchaseDays', 'quantityPurchased', 'unitCost', 'targetAgeDays', 'targetWeightKg'];

const cleanNumbers = (data) => {
  NUMERIC.forEach((f) => {
    if (data[f] === '' || data[f] === null) data[f] = undefined;
    else if (data[f] !== undefined) data[f] = Number(data[f]);
  });
  return data;
};

// e.g. BRL-260929-01 — category prefix, arrival date, sequence for that day.
async function nextBatchCode(categorySlug, date) {
  const prefix = PREFIX[categorySlug] || 'BAT';
  const d = new Date(date);
  const stamp = `${String(d.getFullYear()).slice(2)}${String(d.getMonth() + 1).padStart(2, '0')}${String(d.getDate()).padStart(2, '0')}`;
  const counter = await Counter.findOneAndUpdate({ _id: `batch-${prefix}-${stamp}` }, { $inc: { seq: 1 } }, { returnDocument: 'after', upsert: true });
  return `${prefix}-${stamp}-${String(counter.seq).padStart(2, '0')}`;
}

async function loadBatch(id) {
  if (!mongoose.isValidObjectId(id)) throw ApiError.notFound('Batch not found');
  const batch = await FlockBatch.findById(id);
  if (!batch) throw ApiError.notFound('Batch not found');
  return batch;
}

const assertOpen = (batch) => {
  if (['COMPLETED', 'CLOSED'].includes(batch.status)) throw ApiError.conflict(`This batch is ${batch.status.toLowerCase()} and can no longer change`);
};

// Keeps status in step with age after edits (e.g. target age changed).
function syncStatus(batch) {
  if (['COMPLETED', 'CLOSED'].includes(batch.status)) return;
  if (batch.stage() === 'READY') {
    batch.status = 'READY';
    batch.readyAt = batch.readyAt || new Date();
  } else {
    batch.status = 'ACTIVE';
    batch.readyAt = undefined;
    batch.readyNotifiedAt = undefined; // notify again when it becomes ready under the new target
  }
}

// ---------- List ----------

exports.listBatches = asyncHandler(async (req, res) => {
  await markReadyBatches(); // make sure statuses are current before showing them
  const { status, category, q } = req.query;
  const { page, limit, skip } = getPagination(req.query, 24, 100);
  const filter = {};
  if (status === 'open') filter.status = { $in: ['ACTIVE', 'READY'] };
  else if (status) filter.status = status;
  if (category) filter.categorySlug = category;
  if (q) {
    const rx = new RegExp(escapeRegex(String(q).slice(0, 60)), 'i');
    filter.$or = [{ batchCode: rx }, { supplier: rx }, { house: rx }, { breed: rx }];
  }

  const [batches, total, open] = await Promise.all([
    FlockBatch.find(filter).sort({ status: 1, purchaseDate: -1 }).skip(skip).limit(limit),
    FlockBatch.countDocuments(filter),
    FlockBatch.find({ status: { $in: ['ACTIVE', 'READY'] } }),
  ]);

  const openSummaries = open.map((b) => ({ ...b.summary(), status: b.status }));
  res.json({
    success: true,
    batches,
    meta: buildMeta(total, page, limit),
    summary: {
      openBatches: open.length,
      readyBatches: open.filter((b) => b.status === 'READY').length,
      birdsGrowing: openSummaries.reduce((s, b) => s + b.live, 0),
      birdsReady: openSummaries.filter((b) => b.status === 'READY').reduce((s, b) => s + b.live, 0),
      deathsInOpenBatches: openSummaries.reduce((s, b) => s + b.deaths, 0),
      purchasedInOpenBatches: open.reduce((s, b) => s + b.quantityPurchased, 0),
    },
  });
});

exports.getBatch = asyncHandler(async (req, res) => {
  const batch = await loadBatch(req.params.id);
  res.json({ success: true, batch });
});

// ---------- Create & edit ----------

exports.createBatch = asyncHandler(async (req, res) => {
  const category = await Category.findById(req.body.category);
  if (!category) throw ApiError.badRequest('Choose a category');
  if (category.slug === 'eggs') throw ApiError.badRequest('Batches are for birds. Eggs are added through products and inventory.');

  const data = cleanNumbers(pick(req.body, EDITABLE));
  const purchaseDate = data.purchaseDate ? new Date(data.purchaseDate) : new Date();
  if (purchaseDate > new Date(Date.now() + 60 * 1000)) throw ApiError.badRequest('The arrival date cannot be in the future');

  const custom = String(req.body.batchCode || '').trim().toUpperCase();
  if (custom && !/^[A-Z0-9][A-Z0-9-]{1,39}$/.test(custom)) throw ApiError.badRequest('Batch codes may use letters, numbers and dashes only');

  const batch = new FlockBatch({
    ...data,
    purchaseDate,
    batchCode: custom || (await nextBatchCode(category.slug, purchaseDate)),
    category: category._id,
    categoryName: category.name,
    categorySlug: category.slug,
    createdByName: req.user.name,
  });
  syncStatus(batch);
  await batch.save();
  await markReadyBatches(); // a batch entered already at target age is announced straight away
  res.status(201).json({ success: true, batch: await FlockBatch.findById(batch._id), message: `Batch ${batch.batchCode} created` });
});

exports.updateBatch = asyncHandler(async (req, res) => {
  const batch = await loadBatch(req.params.id);
  assertOpen(batch);
  const data = cleanNumbers(pick(req.body, EDITABLE));
  if (data.quantityPurchased !== undefined) {
    const { deaths, transferred } = batch.counts();
    if (data.quantityPurchased < deaths + transferred) {
      throw ApiError.badRequest(`Quantity cannot be less than the ${deaths + transferred} already recorded as dead or moved to stock`);
    }
  }
  Object.assign(batch, data);
  syncStatus(batch);
  await batch.save();
  await markReadyBatches();
  res.json({ success: true, batch: await FlockBatch.findById(batch._id) });
});

// ---------- Daily records (do not touch shop stock) ----------

exports.recordMortality = asyncHandler(async (req, res) => {
  const batch = await loadBatch(req.params.id);
  assertOpen(batch);
  const quantity = Number(req.body.quantity);
  const { live } = batch.counts();
  if (!Number.isInteger(quantity) || quantity < 1) throw ApiError.badRequest('Enter how many birds died');
  if (quantity > live) throw ApiError.badRequest(`This batch only has ${live} live bird(s)`);
  const date = req.body.date ? new Date(req.body.date) : new Date();
  if (date < new Date(batch.purchaseDate).setHours(0, 0, 0, 0)) throw ApiError.badRequest('The date is before the batch arrived');

  batch.mortality.push({ date, quantity, reason: req.body.reason, note: req.body.note, byName: req.user.name });
  if (batch.counts().live === 0) {
    batch.status = 'CLOSED';
    batch.closedAt = new Date();
    batch.closeReason = 'No live birds remaining';
  }
  await batch.save();
  res.status(201).json({ success: true, batch, message: `${quantity} death(s) recorded for ${batch.batchCode}` });
});

exports.recordWeighing = asyncHandler(async (req, res) => {
  const batch = await loadBatch(req.params.id);
  assertOpen(batch);
  const avgWeightKg = Number(req.body.avgWeightKg);
  if (!Number.isFinite(avgWeightKg) || avgWeightKg <= 0) throw ApiError.badRequest('Enter the average weight in kg');
  batch.weighings.push({
    date: req.body.date ? new Date(req.body.date) : new Date(),
    avgWeightKg,
    sampleSize: req.body.sampleSize ? Number(req.body.sampleSize) : undefined,
    note: req.body.note,
    byName: req.user.name,
  });
  await batch.save();
  res.status(201).json({ success: true, batch, message: 'Weigh-in recorded' });
});

// ---------- Confirm ready: move birds into stock ----------

exports.transferToStock = asyncHandler(async (req, res) => {
  const batch = await loadBatch(req.params.id);
  assertOpen(batch);
  // Birds join main inventory only once the batch is ready (to sell early, lower the batch's selling age).
  if (batch.stage() !== 'READY') {
    const { daysToReady } = batch.summary();
    throw ApiError.conflict(
      `${batch.batchCode} is not ready yet — ${daysToReady} day${daysToReady === 1 ? '' : 's'} to go. To sell early, edit the batch and lower its selling age.`
    );
  }
  const allocations = (req.body.allocations || []).filter((a) => Number(a.quantity) > 0);
  if (!allocations.length) throw ApiError.badRequest('Enter how many birds go into each product option');

  const total = allocations.reduce((s, a) => s + Number(a.quantity), 0);
  const { live } = batch.counts();
  if (allocations.some((a) => !Number.isInteger(Number(a.quantity)))) throw ApiError.badRequest('Quantities must be whole numbers');
  if (total > live) throw ApiError.badRequest(`Only ${live} live bird(s) remain in this batch`);

  // Validate every target before changing any stock.
  const products = await Product.find({ _id: { $in: allocations.map((a) => a.productId) } }).populate('category', 'slug');
  const byId = new Map(products.map((p) => [String(p._id), p]));
  const lines = allocations.map((a) => {
    const product = byId.get(String(a.productId));
    if (!product) throw ApiError.badRequest('A selected product no longer exists');
    if (product.category?.slug === 'eggs') throw ApiError.badRequest('Birds cannot be moved into an egg product');
    if (product.variants.length && !a.variantId) throw ApiError.badRequest(`Choose which option of ${product.name} the birds go into`);
    const variant = a.variantId ? product.variants.id(a.variantId) : null;
    if (a.variantId && !variant) throw ApiError.badRequest(`The selected option of ${product.name} no longer exists`);
    return { product, variant, quantity: Number(a.quantity) };
  });

  // Claim the birds on the batch first (atomic on the batch's version) so they cannot be moved twice.
  const date = new Date();
  lines.forEach((l) =>
    batch.transfers.push({
      date,
      product: l.product._id,
      variantId: l.variant?._id,
      productName: l.product.name,
      variantLabel: l.variant?.label,
      quantity: l.quantity,
      note: req.body.note,
      byName: req.user.name,
    })
  );
  const done = batch.counts().live === 0;
  if (done) {
    batch.status = 'COMPLETED';
    batch.completedAt = date;
  }
  try {
    await batch.save();
  } catch (error) {
    if (error.name === 'VersionError') throw ApiError.conflict('This batch was just updated by someone else. Refresh and try again.');
    throw error;
  }

  const warnings = [];
  for (const l of lines) {
    try {
      await inventory.changeStock({
        productId: l.product._id,
        variantId: l.variant?._id,
        delta: l.quantity,
        movement: { type: 'BATCH_TRANSFER', reference: batch.batchCode, note: `From batch ${batch.batchCode}`, user: req.user },
      });
    } catch (error) {
      warnings.push(`${l.quantity} × ${l.product.name}: ${error.message}`);
    }
  }

  res.json({
    success: true,
    batch: await FlockBatch.findById(batch._id),
    warnings,
    message: `${total} bird(s) from ${batch.batchCode} added to stock${done ? ' — batch completed' : ''}.`,
  });
});

exports.closeBatch = asyncHandler(async (req, res) => {
  const batch = await loadBatch(req.params.id);
  assertOpen(batch);
  batch.status = 'CLOSED';
  batch.closedAt = new Date();
  batch.closeReason = req.body.reason;
  await batch.save();
  res.json({ success: true, batch, message: `Batch ${batch.batchCode} closed` });
});
