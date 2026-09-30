const mongoose = require('mongoose');
const { MarketTrip, Product, StockLoss } = require('../models');
const ApiError = require('../utils/ApiError');
const asyncHandler = require('../utils/asyncHandler');
const escapeRegex = require('../utils/escapeRegex');
const { getPagination, buildMeta } = require('../utils/pagination');
const inventory = require('../services/inventoryService');
const { nextTripNumber } = require('../services/orderNumberService');
const ledger = require('../services/stockLedger');

const lineKey = (productId, variantId) => `${productId}:${variantId || ''}`;

// Returns stock to the farm; a deleted product is noted instead of failing the whole request.
// `movement` labels the stock-ledger line (omitted for silent rollbacks of a failed dispatch).
async function returnToStock(item, qty, warnings, movement) {
  if (!qty) return;
  try {
    await inventory.changeStock({ productId: item.product, variantId: item.variantId || undefined, delta: qty, movement });
  } catch (error) {
    warnings.push(`${qty} × ${item.productName}${item.variantLabel ? ` (${item.variantLabel})` : ''} could not be returned to stock: ${error.message}`);
  }
}

// ---------- List & summary ----------

exports.listTrips = asyncHandler(async (req, res) => {
  const { status, q, from, to } = req.query;
  const { page, limit, skip } = getPagination(req.query, 20, 100);
  const filter = {};
  if (status) filter.status = status;
  if (q) {
    const rx = new RegExp(escapeRegex(String(q).slice(0, 80)), 'i');
    filter.$or = [{ tripNumber: rx }, { market: rx }, { responsiblePerson: rx }, { 'items.productName': rx }];
  }
  if (from || to) {
    filter.tripDate = {};
    if (from) filter.tripDate.$gte = new Date(from);
    if (to) filter.tripDate.$lte = new Date(`${to}T23:59:59.999Z`);
  }

  const since = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
  const [trips, total, openAgg, closedAgg] = await Promise.all([
    MarketTrip.find(filter).sort({ tripDate: -1, createdAt: -1 }).skip(skip).limit(limit),
    MarketTrip.countDocuments(filter),
    MarketTrip.aggregate([
      { $match: { status: 'OUT' } },
      { $unwind: '$items' },
      { $group: { _id: null, trips: { $addToSet: '$_id' }, units: { $sum: '$items.quantityOut' } } },
    ]),
    MarketTrip.aggregate([
      { $match: { status: 'CLOSED', closedAt: { $gte: since } } },
      { $unwind: '$items' },
      {
        $group: {
          _id: null,
          trips: { $addToSet: '$_id' },
          out: { $sum: '$items.quantityOut' },
          sold: { $sum: '$items.quantitySold' },
          returned: { $sum: '$items.quantityReturned' },
          lost: { $sum: '$items.quantityLost' },
          sales: { $sum: '$items.salesAmount' },
        },
      },
    ]),
  ]);

  const closed = closedAgg[0];
  res.json({
    success: true,
    trips,
    meta: buildMeta(total, page, limit),
    summary: {
      openTrips: openAgg[0]?.trips.length || 0,
      unitsAtMarket: openAgg[0]?.units || 0,
      last30Days: {
        trips: closed?.trips.length || 0,
        out: closed?.out || 0,
        sold: closed?.sold || 0,
        returned: closed?.returned || 0,
        lost: closed?.lost || 0,
        sales: closed?.sales || 0,
        sellThrough: closed?.out ? Math.round((closed.sold / closed.out) * 100) : 0,
      },
    },
  });
});

exports.getTrip = asyncHandler(async (req, res) => {
  const trip = await MarketTrip.findById(req.params.id);
  if (!trip) throw ApiError.notFound('Market trip not found');
  res.json({ success: true, trip });
});

// ---------- Send stock to market ----------

exports.createTrip = asyncHandler(async (req, res) => {
  const { market, tripDate, responsiblePerson, vehicle, notes } = req.body;

  // Merge duplicate lines so one product option appears once on the trip.
  const merged = new Map();
  (req.body.items || []).forEach((raw) => {
    const qty = Number(raw.quantity);
    if (!mongoose.isValidObjectId(raw.productId) || (raw.variantId && !mongoose.isValidObjectId(raw.variantId))) {
      throw ApiError.badRequest('One of the items is not a valid product');
    }
    if (!Number.isInteger(qty) || qty < 1) throw ApiError.badRequest('Every item needs a whole-number quantity of at least 1');
    const key = lineKey(raw.productId, raw.variantId);
    const existing = merged.get(key);
    merged.set(key, { productId: raw.productId, variantId: raw.variantId || undefined, quantity: (existing?.quantity || 0) + qty });
  });
  if (!merged.size) throw ApiError.badRequest('Add at least one product to send to market');

  // Validate everything before touching stock.
  const products = await Product.find({ _id: { $in: [...merged.values()].map((l) => l.productId) } }).populate('category', 'name slug');
  const byId = new Map(products.map((p) => [String(p._id), p]));
  const items = [...merged.values()].map((line) => {
    const product = byId.get(String(line.productId));
    if (!product) throw ApiError.badRequest('A selected product no longer exists');
    if (product.variants.length && !line.variantId) throw ApiError.badRequest(`Choose which option of ${product.name} is going to market`);
    const variant = line.variantId ? product.variants.id(line.variantId) : null;
    if (line.variantId && !variant) throw ApiError.badRequest(`The selected option of ${product.name} no longer exists`);
    return {
      product: product._id,
      variantId: variant?._id,
      productName: product.name,
      variantLabel: variant?.label,
      categoryName: product.category?.name,
      categorySlug: product.category?.slug,
      quantityOut: line.quantity,
    };
  });

  // Deduct stock line by line; undo earlier deductions if any line fails (e.g. not enough unreserved stock).
  const deducted = [];
  try {
    for (const item of items) {
      await inventory.changeStock({ productId: item.product, variantId: item.variantId, delta: -item.quantityOut });
      deducted.push(item);
    }
  } catch (error) {
    const warnings = [];
    for (const item of deducted) await returnToStock(item, item.quantityOut, warnings);
    throw error;
  }

  const date = tripDate ? new Date(tripDate) : new Date();
  const trip = await MarketTrip.create({
    tripNumber: await nextTripNumber(date),
    market,
    tripDate: date,
    responsiblePerson,
    vehicle,
    notes,
    items,
    dispatchedBy: req.user._id,
    dispatchedByName: req.user.name,
  });

  // Ledger lines are written once the trip exists, so a failed (rolled-back) dispatch leaves no trace.
  await ledger.record(
    items.map((item) => ({
      product: item.product,
      variantId: item.variantId,
      productName: item.productName,
      variantLabel: item.variantLabel,
      categoryName: item.categoryName,
      categorySlug: item.categorySlug,
      type: 'MARKET_OUT',
      quantity: -item.quantityOut,
      reference: trip.tripNumber,
      note: trip.market,
      user: req.user,
    }))
  );

  res.status(201).json({
    success: true,
    trip,
    message: `${trip.totals.out} unit(s) sent to ${trip.market} and deducted from stock (${trip.tripNumber}).`,
  });
});

// ---------- Close: record sold / returned / lost ----------

exports.closeTrip = asyncHandler(async (req, res) => {
  const trip = await MarketTrip.findById(req.params.id);
  if (!trip) throw ApiError.notFound('Market trip not found');
  if (trip.status !== 'OUT') throw ApiError.conflict(`This trip is already ${trip.status.toLowerCase()}`);

  const input = new Map((req.body.items || []).map((i) => [String(i.itemId), i]));
  const plan = trip.items.map((item) => {
    const row = input.get(String(item._id));
    if (!row) throw ApiError.badRequest(`Enter the results for ${item.productName}${item.variantLabel ? ` (${item.variantLabel})` : ''}`);
    const sold = Number(row.sold || 0);
    const returned = Number(row.returned || 0);
    const lost = Number(row.lost || 0);
    const salesAmount = Number(row.salesAmount || 0);
    const label = `${item.productName}${item.variantLabel ? ` (${item.variantLabel})` : ''}`;
    if (![sold, returned, lost].every((n) => Number.isInteger(n) && n >= 0)) {
      throw ApiError.badRequest(`${label}: quantities must be whole numbers of 0 or more`);
    }
    if (sold + returned + lost !== item.quantityOut) {
      throw ApiError.badRequest(
        `${label}: sold (${sold}) + returned (${returned}) + lost (${lost}) must equal the ${item.quantityOut} taken to market`
      );
    }
    if (!Number.isFinite(salesAmount) || salesAmount < 0) throw ApiError.badRequest(`${label}: sales amount must be 0 or more`);
    if (lost > 0 && !StockLoss.REASONS.includes(row.lossReason)) throw ApiError.badRequest(`${label}: choose a reason for the ${lost} lost`);
    return { item, sold, returned, lost, salesAmount, lossReason: lost ? row.lossReason : undefined };
  });

  // Claim the trip first so a double click or two admins cannot close it twice.
  const claimed = await MarketTrip.updateOne({ _id: trip._id, status: 'OUT' }, { $set: { status: 'CLOSED', closedAt: new Date() } });
  if (claimed.modifiedCount === 0) throw ApiError.conflict('This trip has just been closed by someone else');

  const warnings = [];
  for (const p of plan) {
    await returnToStock(p.item, p.returned, warnings, {
      type: 'MARKET_RETURN',
      reference: trip.tripNumber,
      note: `Returned from ${trip.market}`,
      user: req.user,
    });
    if (p.lost) {
      await StockLoss.create({
        product: p.item.product,
        variantId: p.item.variantId,
        productName: p.item.productName,
        variantLabel: p.item.variantLabel,
        categoryName: p.item.categoryName,
        categorySlug: p.item.categorySlug,
        quantity: p.lost,
        reason: p.lossReason,
        occurredOn: trip.tripDate,
        notes: `Lost during market trip ${trip.tripNumber} (${trip.market})`,
        marketTrip: trip._id,
        tripNumber: trip.tripNumber,
        recordedBy: req.user._id,
        recordedByName: req.user.name,
      });
    }
    Object.assign(p.item, {
      quantitySold: p.sold,
      quantityReturned: p.returned,
      quantityLost: p.lost,
      lossReason: p.lossReason,
      salesAmount: p.salesAmount,
    });
  }

  trip.status = 'CLOSED';
  trip.closedAt = new Date();
  trip.closedBy = req.user._id;
  trip.closedByName = req.user.name;
  trip.closingNotes = req.body.closingNotes;
  await trip.save();

  const t = trip.totals;
  res.json({
    success: true,
    trip,
    warnings,
    message: `Trip closed: ${t.sold} sold, ${t.returned} returned to stock, ${t.lost} lost.`,
  });
});

// ---------- Cancel: nothing was sold, everything comes back ----------

exports.cancelTrip = asyncHandler(async (req, res) => {
  const claimed = await MarketTrip.findOneAndUpdate(
    { _id: req.params.id, status: 'OUT' },
    { status: 'CANCELLED', cancelledAt: new Date(), cancelledByName: req.user.name, cancelReason: req.body.reason },
    { returnDocument: 'after' }
  );
  if (!claimed) {
    const exists = await MarketTrip.exists({ _id: req.params.id });
    throw exists ? ApiError.conflict('Only trips that are still out can be cancelled') : ApiError.notFound('Market trip not found');
  }
  const warnings = [];
  for (const item of claimed.items) {
    item.quantityReturned = item.quantityOut;
    await returnToStock(item, item.quantityOut, warnings, {
      type: 'MARKET_RETURN',
      reference: claimed.tripNumber,
      note: 'Trip cancelled',
      user: req.user,
    });
  }
  await claimed.save();
  res.json({ success: true, trip: claimed, warnings, message: `Trip cancelled. ${claimed.totals.out} unit(s) returned to stock.` });
});

// Units currently at market per product option, for the inventory ledger.
exports.unitsAtMarket = async function unitsAtMarket() {
  const rows = await MarketTrip.aggregate([
    { $match: { status: 'OUT' } },
    { $unwind: '$items' },
    { $group: { _id: { product: '$items.product', variantId: '$items.variantId' }, units: { $sum: '$items.quantityOut' } } },
  ]);
  return new Map(rows.map((r) => [lineKey(r._id.product, r._id.variantId), r.units]));
};

exports.lineKey = lineKey;
