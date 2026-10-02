const mongoose = require('mongoose');
const { ProcessingRun, FlockBatch, Product, Category } = require('../models');
const ApiError = require('../utils/ApiError');
const asyncHandler = require('../utils/asyncHandler');
const escapeRegex = require('../utils/escapeRegex');
const { getPagination, buildMeta } = require('../utils/pagination');
const inventory = require('../services/inventoryService');
const { nextProcessingNumber } = require('../services/orderNumberService');
const { markReadyBatches } = require('../services/batchScheduler');
const { PREPARED_MEAT, NOT_LIVE_BIRDS, isLiveBirds } = require('../utils/categoryKinds');

const DAY_MS = 24 * 60 * 60 * 1000;
const round2 = (n) => Math.round(n * 100) / 100;
const label = (name, variantLabel) => (variantLabel ? `${name} (${variantLabel})` : name);

const optionalNumber = (value, field) => {
  if (value === undefined || value === null || value === '') return undefined;
  const n = Number(value);
  if (!Number.isFinite(n) || n < 0) throw ApiError.badRequest(`${field} must be 0 or more`);
  return round2(n);
};

const wholeNumber = (value, field, min = 0) => {
  const n = Number(value);
  if (!Number.isInteger(n) || n < min) throw ApiError.badRequest(`${field} must be a whole number${min ? ` of at least ${min}` : ''}`);
  return n;
};

// Each stock line of a product: its options, or the product itself when it has none.
const stockLines = (p) =>
  p.variants?.length
    ? p.variants.map((v) => ({ productId: p._id, variantId: v._id, productName: p.name, variantLabel: v.label, stock: v.stock || 0, reserved: v.reservedStock || 0 }))
    : [{ productId: p._id, variantId: null, productName: p.name, variantLabel: null, stock: p.stock || 0, reserved: p.reservedStock || 0 }];

async function categoryIds(slugs, include = true) {
  const cats = await Category.find({ slug: { $in: slugs } }).select('_id').lean();
  const ids = cats.map((c) => c._id);
  return include ? { $in: ids } : { $nin: ids };
}

// Prepared meat currently in stock, line by line.
async function preparedMeatStock() {
  const products = await Product.find({ category: await categoryIds([PREPARED_MEAT]) }).sort({ name: 1 }).lean();
  return products.flatMap((p) => stockLines(p).map((l) => ({ ...l, isActive: p.isActive, available: Math.max(l.stock - l.reserved, 0) })));
}

// ---------- List & summary ----------

exports.listRuns = asyncHandler(async (req, res) => {
  const { status, q, from, to, source } = req.query;
  const { page, limit, skip } = getPagination(req.query, 20, 100);
  const filter = {};
  if (status) filter.status = status;
  if (source) filter.sourceType = source;
  if (q) {
    const rx = new RegExp(escapeRegex(String(q).slice(0, 80)), 'i');
    filter.$or = [{ runNumber: rx }, { sourceName: rx }, { batchCode: rx }, { 'outputs.productName': rx }];
  }
  if (from || to) {
    filter.processedOn = {};
    if (from) filter.processedOn.$gte = new Date(from);
    if (to) filter.processedOn.$lte = new Date(`${to}T23:59:59.999Z`);
  }

  const since = new Date(Date.now() - 30 * DAY_MS);
  const soon = new Date(Date.now() + 2 * DAY_MS);
  const [runs, total, recent, expiring, meatStock] = await Promise.all([
    ProcessingRun.find(filter).sort({ processedOn: -1, createdAt: -1 }).skip(skip).limit(limit),
    ProcessingRun.countDocuments(filter),
    ProcessingRun.find({ status: 'COMPLETED', processedOn: { $gte: since } }),
    // Runs whose meat reaches its use-by date within 2 days (or has passed it in the last week).
    ProcessingRun.find({ status: 'COMPLETED', useBy: { $lte: soon, $gte: new Date(Date.now() - 7 * DAY_MS) } }).sort({ useBy: 1 }).limit(10),
    preparedMeatStock(),
  ]);

  const figures = recent.map((r) => ({ run: r, f: r.figures() }));
  const sum = (fn) => round2(figures.reduce((s, x) => s + (fn(x) || 0), 0));
  const withYield = recent.filter((r) => r.liveWeightKg && r.figures().dressedKg);
  const liveKg = withYield.reduce((s, r) => s + r.liveWeightKg, 0);
  const dressedKg = withYield.reduce((s, r) => s + r.figures().dressedKg, 0);

  res.json({
    success: true,
    runs,
    meta: buildMeta(total, page, limit),
    meatStock,
    expiring: expiring.map((r) => ({ _id: r._id, runNumber: r.runNumber, useBy: r.useBy, storage: r.storage, outputs: r.outputs })),
    summary: {
      runs30d: recent.length,
      birds30d: sum((x) => x.run.birdsIn),
      condemned30d: sum((x) => x.run.condemned),
      units30d: sum((x) => x.f.unitsOut),
      dressedKg30d: sum((x) => x.f.dressedKg),
      avgYield30d: liveKg ? Math.round((dressedKg / liveKg) * 1000) / 10 : null,
      meatInStock: meatStock.reduce((s, l) => s + l.stock, 0),
      meatAvailable: meatStock.reduce((s, l) => s + l.available, 0),
      meatProducts: new Set(meatStock.map((l) => String(l.productId))).size,
      expiringSoon: expiring.length,
    },
  });
});

exports.getRun = asyncHandler(async (req, res) => {
  if (!mongoose.isValidObjectId(req.params.id)) throw ApiError.notFound('Processing run not found');
  const run = await ProcessingRun.findById(req.params.id);
  if (!run) throw ApiError.notFound('Processing run not found');
  res.json({ success: true, run });
});

// What can be processed (ready batches, live birds in stock) and what can be produced (prepared meat products).
exports.options = asyncHandler(async (req, res) => {
  await markReadyBatches();
  const [batches, birdProducts, meatProducts] = await Promise.all([
    FlockBatch.find({ status: { $in: ['ACTIVE', 'READY'] } }).sort({ purchaseDate: 1 }),
    Product.find({ category: await categoryIds(NOT_LIVE_BIRDS, false) }).populate('category', 'name slug').sort({ name: 1 }).lean(),
    Product.find({ category: await categoryIds([PREPARED_MEAT]) }).sort({ name: 1 }).lean(),
  ]);
  res.json({
    success: true,
    batches: batches.map((b) => {
      const s = b.summary();
      return { _id: b._id, batchCode: b.batchCode, categoryName: b.categoryName, live: s.live, ageDays: s.ageDays, ready: s.stage === 'READY', daysToReady: s.daysToReady, latestWeightKg: s.latestWeightKg };
    }),
    birdStock: birdProducts.flatMap((p) => stockLines(p).map((l) => ({ ...l, categoryName: p.category?.name, available: Math.max(l.stock - l.reserved, 0) }))),
    meatProducts: meatProducts.map((p) => ({
      _id: p._id,
      name: p.name,
      isActive: p.isActive,
      variants: (p.variants || []).map((v) => ({ _id: v._id, label: v.label, stock: v.stock || 0 })),
      stock: p.variants?.length ? undefined : p.stock || 0,
    })),
    shelfLifeDays: ProcessingRun.SHELF_LIFE_DAYS,
  });
});

// ---------- Create ----------

exports.createRun = asyncHandler(async (req, res) => {
  const body = req.body;
  const processedOn = body.processedOn ? new Date(body.processedOn) : new Date();
  if (Number.isNaN(processedOn.getTime())) throw ApiError.badRequest('Invalid processing date');
  if (processedOn > new Date(Date.now() + 60 * 1000)) throw ApiError.badRequest('The processing date cannot be in the future');

  const birdsIn = wholeNumber(body.birdsIn, 'Birds processed', 1);
  const condemned = wholeNumber(body.condemned || 0, 'Condemned birds');
  if (condemned > birdsIn) throw ApiError.badRequest('Condemned birds cannot be more than the birds processed');
  const storage = ProcessingRun.STORAGE.includes(body.storage) ? body.storage : 'CHILLED';
  const useBy = body.useBy ? new Date(body.useBy) : new Date(processedOn.getTime() + ProcessingRun.SHELF_LIFE_DAYS[storage] * DAY_MS);
  if (Number.isNaN(useBy.getTime())) throw ApiError.badRequest('Invalid use-by date');
  if (useBy < new Date(processedOn.toDateString())) throw ApiError.badRequest('The use-by date cannot be before the processing date');

  // ---- Outputs: prepared meat products only ----
  const rawOutputs = (body.outputs || []).filter((o) => o && o.productId);
  if (!rawOutputs.length) throw ApiError.badRequest('Add the prepared meat produced');
  const meatCat = await Category.findOne({ slug: PREPARED_MEAT }).select('_id');
  const outProducts = await Product.find({ _id: { $in: rawOutputs.map((o) => o.productId) } });
  const outById = new Map(outProducts.map((p) => [String(p._id), p]));
  const outputs = rawOutputs.map((o) => {
    const product = outById.get(String(o.productId));
    if (!product) throw ApiError.badRequest('A selected meat product no longer exists');
    if (!meatCat || String(product.category) !== String(meatCat._id)) throw ApiError.badRequest(`${product.name} is not a Prepared Meat product`);
    if (product.variants.length && !o.variantId) throw ApiError.badRequest(`Choose which option of ${product.name} was produced`);
    const variant = o.variantId ? product.variants.id(o.variantId) : null;
    if (o.variantId && !variant) throw ApiError.badRequest(`The selected option of ${product.name} no longer exists`);
    return {
      product: product._id,
      variantId: variant?._id,
      productName: product.name,
      variantLabel: variant?.label,
      quantity: wholeNumber(o.quantity, `Quantity of ${product.name}`, 1),
      weightKg: optionalNumber(o.weightKg, `Weight of ${product.name}`),
    };
  });

  // ---- Source: a ready flock batch, or live birds in stock ----
  const run = new ProcessingRun({
    runNumber: await nextProcessingNumber(processedOn),
    processedOn,
    sourceType: body.sourceType === 'BATCH' ? 'BATCH' : 'STOCK',
    birdsIn,
    condemned,
    liveWeightKg: optionalNumber(body.liveWeightKg, 'Live weight'),
    dressedWeightKg: optionalNumber(body.dressedWeightKg, 'Dressed weight'),
    processingCost: optionalNumber(body.processingCost, 'Processing cost'),
    outputs,
    storage,
    useBy,
    notes: body.notes,
    byName: req.user.name,
  });

  let batch = null;
  let sourceLine = null;
  if (run.sourceType === 'BATCH') {
    if (!mongoose.isValidObjectId(body.batchId)) throw ApiError.badRequest('Choose the flock batch the birds came from');
    batch = await FlockBatch.findById(body.batchId);
    if (!batch) throw ApiError.badRequest('That flock batch no longer exists');
    if (!['ACTIVE', 'READY'].includes(batch.status)) throw ApiError.conflict(`Batch ${batch.batchCode} is ${batch.status.toLowerCase()} and has no birds left to process`);
    if (batch.stage() !== 'READY') {
      throw ApiError.conflict(`${batch.batchCode} is not ready yet — ${batch.summary().daysToReady} day(s) to go. Birds are processed once the batch is ready.`);
    }
    const { live } = batch.counts();
    if (birdsIn > live) throw ApiError.badRequest(`Only ${live} live bird(s) remain in ${batch.batchCode}`);
    run.batch = batch._id;
    run.batchCode = batch.batchCode;
    run.sourceName = `Batch ${batch.batchCode}`;
    run.sourceCategory = batch.categoryName;
  } else {
    if (!mongoose.isValidObjectId(body.productId)) throw ApiError.badRequest('Choose the birds taken from stock');
    const product = await Product.findById(body.productId).populate('category', 'name slug');
    if (!product) throw ApiError.badRequest('That product no longer exists');
    if (!isLiveBirds(product.category?.slug)) throw ApiError.badRequest(`${product.name} is not a live-bird product`);
    if (product.variants.length && !body.variantId) throw ApiError.badRequest(`Choose which option of ${product.name} the birds came from`);
    const variant = body.variantId ? product.variants.id(body.variantId) : null;
    if (body.variantId && !variant) throw ApiError.badRequest(`The selected option of ${product.name} no longer exists`);
    sourceLine = { productId: product._id, variantId: variant?._id };
    run.sourceProduct = product._id;
    run.sourceVariantId = variant?._id;
    run.sourceName = label(product.name, variant?.label);
    run.sourceCategory = product.category?.name;
  }
  await run.validate();

  // ---- Apply: take the birds, then add the meat. Any failure undoes what was done. ----
  const movement = (type, note) => ({ type, reference: run.runNumber, note, user: req.user, at: processedOn });
  const undo = [];
  const rollback = async () => {
    for (const step of undo.reverse()) {
      try {
        await step();
      } catch (error) {
        console.warn(`Processing rollback step failed: ${error.message}`);
      }
    }
  };

  try {
    if (batch) {
      batch.processedRuns.push({ date: processedOn, run: run._id, runNumber: run.runNumber, quantity: birdsIn, byName: req.user.name });
      if (batch.counts().live === 0) {
        batch.status = 'COMPLETED';
        batch.completedAt = new Date();
      }
      try {
        await batch.save();
      } catch (error) {
        if (error.name === 'VersionError') throw ApiError.conflict('This batch was just updated by someone else. Refresh and try again.');
        throw error;
      }
      undo.push(() => releaseBatchBirds(run));
    } else {
      await inventory.changeStock({ ...sourceLine, delta: -birdsIn, movement: movement('PROCESSING_OUT', `Processed into meat (${run.runNumber})`) });
      undo.push(() =>
        inventory.changeStock({ ...sourceLine, delta: birdsIn, movement: movement('PROCESSING_OUT', `Rolled back ${run.runNumber}`) })
      );
    }

    for (const o of outputs) {
      const line = { productId: o.product, variantId: o.variantId };
      await inventory.changeStock({ ...line, delta: o.quantity, movement: movement('PROCESSING_IN', `From ${run.sourceName}`) });
      undo.push(() => inventory.changeStock({ ...line, delta: -o.quantity, movement: movement('PROCESSING_IN', `Rolled back ${run.runNumber}`) }));
    }

    await run.save();
  } catch (error) {
    await rollback();
    throw error;
  }

  const units = outputs.reduce((s, o) => s + o.quantity, 0);
  res.status(201).json({
    success: true,
    run,
    message: `${run.runNumber}: ${birdsIn} bird(s) processed into ${units} unit(s) of prepared meat`,
  });
});

// Gives a run's birds back to its flock batch (cancel or rollback).
async function releaseBatchBirds(run) {
  const batch = await FlockBatch.findById(run.batch);
  if (!batch) return 'The flock batch no longer exists, so its birds could not be returned to it';
  const entry = batch.processedRuns.find((p) => String(p.run) === String(run._id));
  if (!entry) return null;
  batch.processedRuns.pull(entry._id);
  if (batch.status === 'COMPLETED' && batch.counts().live > 0) {
    batch.status = 'READY';
    batch.completedAt = undefined;
  }
  if (batch.status === 'CLOSED') return `Batch ${batch.batchCode} is closed; its ${entry.quantity} bird(s) were not returned to it`;
  await batch.save();
  return null;
}

// ---------- Cancel ----------

exports.cancelRun = asyncHandler(async (req, res) => {
  const reason = String(req.body.reason || '').trim();
  if (!reason) throw ApiError.badRequest('Give a reason for cancelling this run');
  const run = await ProcessingRun.findOneAndUpdate(
    { _id: req.params.id, status: 'COMPLETED' },
    { $set: { status: 'CANCELLED', cancelledAt: new Date(), cancelReason: reason, cancelledByName: req.user.name } },
    { returnDocument: 'after' }
  );
  if (!run) {
    const exists = await ProcessingRun.exists({ _id: req.params.id });
    throw exists ? ApiError.conflict('This run has already been cancelled') : ApiError.notFound('Processing run not found');
  }
  const movement = (type, note) => ({ type, reference: run.runNumber, note, user: req.user });

  // 1. Take the meat back out of stock. If some was already sold, nothing changes.
  const removed = [];
  try {
    for (const o of run.outputs) {
      await inventory.changeStock({ productId: o.product, variantId: o.variantId, delta: -o.quantity, movement: movement('PROCESSING_IN', `Cancelled ${run.runNumber}`) });
      removed.push(o);
    }
  } catch (error) {
    for (const o of removed) {
      await inventory
        .changeStock({ productId: o.product, variantId: o.variantId, delta: o.quantity, movement: movement('PROCESSING_IN', `Cancel of ${run.runNumber} undone`) })
        .catch(() => {});
    }
    await ProcessingRun.updateOne({ _id: run._id }, { $set: { status: 'COMPLETED' }, $unset: { cancelledAt: 1, cancelReason: 1, cancelledByName: 1 } });
    throw ApiError.conflict(`This run cannot be cancelled because some of its meat has already been sold or reserved (${error.message}). Record a loss or adjust stock instead.`);
  }

  // 2. Return the birds to where they came from.
  const warnings = [];
  if (run.sourceType === 'BATCH') {
    const warning = await releaseBatchBirds(run);
    if (warning) warnings.push(warning);
  } else {
    try {
      await inventory.changeStock({
        productId: run.sourceProduct,
        variantId: run.sourceVariantId,
        delta: run.birdsIn,
        movement: movement('PROCESSING_OUT', `Cancelled ${run.runNumber} — birds returned`),
      });
    } catch (error) {
      warnings.push(`${run.birdsIn} bird(s) could not be returned to ${run.sourceName}: ${error.message}`);
    }
  }

  res.json({ success: true, run, warnings, message: `${run.runNumber} cancelled — meat removed from stock and birds returned` });
});
