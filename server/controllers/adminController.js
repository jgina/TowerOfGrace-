const mongoose = require('mongoose');
const { Product, Order, User, BulkOrder, ContactMessage, StockLoss, MarketTrip, FlockBatch, FeedItem, ProcessingRun, Category } = require('../models');
const ApiError = require('../utils/ApiError');
const asyncHandler = require('../utils/asyncHandler');
const escapeRegex = require('../utils/escapeRegex');
const { getPagination, buildMeta } = require('../utils/pagination');
const { stockStatus } = require('../services/productPresenter');
const { refreshAggregates } = require('../services/inventoryService');
const ledger = require('../services/stockLedger');
const { liveBirdsExpr } = require('../utils/categoryKinds');
const { unitsAtMarket, lineKey: tripLineKey } = require('./marketTripController');

// ---------- Dashboard ----------

const LOW_STOCK = {
  isSoldOut: false,
  $expr: { $and: [{ $gt: ['$availableStock', 0] }, { $lte: ['$availableStock', '$lowStockThreshold'] }] },
};
const OUT_OF_STOCK = { $or: [{ availableStock: { $lte: 0 } }, { isSoldOut: true }] };

exports.getDashboard = asyncHandler(async (req, res) => {
  const since = new Date();
  since.setMonth(since.getMonth() - 5, 1);
  since.setHours(0, 0, 0, 0);

  const [
    totalProducts,
    totalOrders,
    totalCustomers,
    salesAgg,
    pendingOrders,
    completedOrders,
    lowStock,
    outOfStock,
    recentOrders,
    recentCustomers,
    monthly,
    byStatus,
    newBulk,
    newMessages,
    lowStockCount,
    outOfStockCount,
    recentLosses,
    receiptsToReview,
    marketAgg,
    openBatches,
    feedItems,
    meatProducts,
    meatExpiring,
    processed30d,
  ] = await Promise.all([
    Product.countDocuments(),
    Order.countDocuments(),
    User.countDocuments({ role: 'customer' }),
    Order.aggregate([{ $match: { paymentStatus: 'PAID' } }, { $group: { _id: null, total: { $sum: '$total' } } }]),
    Order.countDocuments({ orderStatus: 'PENDING' }),
    Order.countDocuments({ orderStatus: 'COMPLETED' }),
    Product.find({ isActive: true, ...LOW_STOCK })
      .select('name slug availableStock lowStockThreshold images')
      .limit(8)
      .lean(),
    Product.find({ isActive: true, ...OUT_OF_STOCK })
      .select('name slug availableStock isSoldOut images')
      .limit(8)
      .lean(),
    Order.find().sort({ createdAt: -1 }).limit(6).select('orderNumber customer total orderStatus paymentStatus createdAt'),
    User.find({ role: 'customer' }).sort({ createdAt: -1 }).limit(6).select('name email phone createdAt'),
    Order.aggregate([
      { $match: { createdAt: { $gte: since }, orderStatus: { $ne: 'CANCELLED' } } },
      {
        $group: {
          _id: { y: { $year: '$createdAt' }, m: { $month: '$createdAt' } },
          orders: { $sum: 1 },
          sales: { $sum: { $cond: [{ $eq: ['$paymentStatus', 'PAID'] }, '$total', 0] } },
        },
      },
    ]),
    Order.aggregate([{ $group: { _id: '$orderStatus', count: { $sum: 1 } } }]),
    BulkOrder.countDocuments({ status: 'NEW' }),
    ContactMessage.countDocuments({ status: 'NEW' }),
    Product.countDocuments({ isActive: true, ...LOW_STOCK }),
    Product.countDocuments({ isActive: true, ...OUT_OF_STOCK }),
    StockLoss.aggregate([
      { $match: { reversedAt: { $exists: false }, occurredOn: { $gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) } } },
      {
        $group: {
          _id: null,
          birds: { $sum: { $cond: [liveBirdsExpr, '$quantity', 0] } },
          eggs: { $sum: { $cond: [{ $eq: ['$categorySlug', 'eggs'] }, '$quantity', 0] } },
        },
      },
    ]),
    Order.countDocuments({ awaitingPaymentReview: true, paymentStatus: { $ne: 'PAID' } }),
    MarketTrip.aggregate([
      { $match: { $or: [{ status: 'OUT' }, { status: 'CLOSED', closedAt: { $gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) } }] } },
      { $unwind: '$items' },
      {
        $group: {
          _id: null,
          atMarket: { $sum: { $cond: [{ $eq: ['$status', 'OUT'] }, '$items.quantityOut', 0] } },
          sales30d: { $sum: { $cond: [{ $eq: ['$status', 'CLOSED'] }, '$items.salesAmount', 0] } },
        },
      },
    ]),
    FlockBatch.find({ status: { $in: ['ACTIVE', 'READY'] } }),
    FeedItem.find({ isActive: true }).select('name stockBags lowStockBags').lean(),
    Category.findOne({ slug: 'prepared-meat' })
      .select('_id')
      .lean()
      .then((cat) => (cat ? Product.find({ category: cat._id }).select('stock variants.stock').lean() : [])),
    ProcessingRun.countDocuments({ status: 'COMPLETED', useBy: { $lte: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000), $gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) } }),
    ProcessingRun.aggregate([
      { $match: { status: 'COMPLETED', processedOn: { $gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) } } },
      { $group: { _id: null, birds: { $sum: '$birdsIn' } } },
    ]),
  ]);
  const batchSummaries = openBatches.map((b) => ({ status: b.status, ...b.counts() }));

  // Build a continuous six-month series so empty months render as zero rather than disappearing.
  const series = [];
  for (let i = 0; i < 6; i += 1) {
    const d = new Date(since);
    d.setMonth(since.getMonth() + i);
    const match = monthly.find((m) => m._id.y === d.getFullYear() && m._id.m === d.getMonth() + 1);
    series.push({
      label: d.toLocaleString('en-GB', { month: 'short' }),
      year: d.getFullYear(),
      orders: match?.orders || 0,
      sales: match?.sales || 0,
    });
  }

  res.json({
    success: true,
    stats: {
      totalProducts,
      totalOrders,
      totalCustomers,
      totalSales: salesAgg[0]?.total || 0,
      pendingOrders,
      completedOrders,
      lowStockCount,
      outOfStockCount,
      newBulkRequests: newBulk,
      newMessages,
      birdLosses30d: recentLosses[0]?.birds || 0,
      eggLosses30d: recentLosses[0]?.eggs || 0,
      receiptsToReview,
      unitsAtMarket: marketAgg[0]?.atMarket || 0,
      marketSales30d: marketAgg[0]?.sales30d || 0,
      birdsGrowing: batchSummaries.reduce((s, b) => s + b.live, 0),
      batchesReady: batchSummaries.filter((b) => b.status === 'READY').length,
      feedBags: Math.round(feedItems.reduce((s, f) => s + f.stockBags, 0) * 100) / 100,
      meatInStock: meatProducts.reduce((s, p) => s + (p.variants?.length ? p.variants.reduce((x, v) => x + (v.stock || 0), 0) : p.stock || 0), 0),
      meatExpiring,
      birdsProcessed30d: processed30d[0]?.birds || 0,
      lowFeeds: feedItems.filter((f) => f.stockBags <= f.lowStockBags).map((f) => ({ name: f.name, stockBags: f.stockBags })),
    },
    lowStock,
    outOfStock,
    recentOrders,
    recentCustomers,
    salesSeries: series,
    ordersByStatus: Order.ORDER_STATUSES.map((status) => ({
      status,
      count: byStatus.find((s) => s._id === status)?.count || 0,
    })),
  });
});

// ---------- Customers ----------

exports.listCustomers = asyncHandler(async (req, res) => {
  const { q, status } = req.query;
  const { page, limit, skip } = getPagination(req.query, 20, 100);
  const match = { role: 'customer' };
  if (status === 'active') match.isActive = true;
  if (status === 'inactive') match.isActive = false;
  if (q) {
    const rx = new RegExp(escapeRegex(String(q).slice(0, 80)), 'i');
    match.$or = [{ name: rx }, { email: rx }, { phone: rx }];
  }

  const [customers, total] = await Promise.all([
    User.aggregate([
      { $match: match },
      { $sort: { createdAt: -1 } },
      { $skip: skip },
      { $limit: limit },
      {
        $lookup: {
          from: 'orders',
          let: { uid: '$_id' },
          pipeline: [
            { $match: { $expr: { $eq: ['$user', '$$uid'] } } },
            {
              $group: {
                _id: null,
                orders: { $sum: 1 },
                spent: { $sum: { $cond: [{ $eq: ['$paymentStatus', 'PAID'] }, '$total', 0] } },
              },
            },
          ],
          as: 'orderStats',
        },
      },
      {
        $project: {
          name: 1, email: 1, phone: 1, isActive: 1, createdAt: 1, lastLoginAt: 1,
          totalOrders: { $ifNull: [{ $arrayElemAt: ['$orderStats.orders', 0] }, 0] },
          totalSpent: { $ifNull: [{ $arrayElemAt: ['$orderStats.spent', 0] }, 0] },
        },
      },
    ]),
    User.countDocuments(match),
  ]);
  res.json({ success: true, customers, meta: buildMeta(total, page, limit) });
});

exports.getCustomer = asyncHandler(async (req, res) => {
  const customer = await User.findOne({ _id: req.params.id, role: 'customer' });
  if (!customer) throw ApiError.notFound('Customer not found');
  const orders = await Order.find({ user: customer._id }).sort({ createdAt: -1 }).limit(100);
  const totalSpent = orders.filter((o) => o.paymentStatus === 'PAID').reduce((sum, o) => sum + o.total, 0);
  res.json({ success: true, customer, orders, totals: { orders: orders.length, spent: totalSpent } });
});

exports.updateCustomerStatus = asyncHandler(async (req, res) => {
  const customer = await User.findOneAndUpdate(
    { _id: req.params.id, role: 'customer' },
    { isActive: Boolean(req.body.isActive) },
    { returnDocument: 'after' }
  );
  if (!customer) throw ApiError.notFound('Customer not found');
  res.json({ success: true, customer });
});

// ---------- Inventory ----------

exports.listInventory = asyncHandler(async (req, res) => {
  const { q, category, status } = req.query;
  const filter = {};
  if (q) {
    const rx = new RegExp(escapeRegex(String(q).slice(0, 80)), 'i');
    filter.$or = [{ name: rx }, { sku: rx }, { 'variants.sku': rx }, { 'variants.label': rx }];
  }
  if (category && mongoose.isValidObjectId(category)) filter.category = category;

  const [products, atMarket] = await Promise.all([
    Product.find(filter).sort({ name: 1 }).populate('category', 'name').lean(),
    unitsAtMarket(),
  ]);
  let rows = [];
  products.forEach((product) => {
    const threshold = product.lowStockThreshold ?? 10;
    const holders = product.variants?.length ? product.variants : [null];
    holders.forEach((variant) => {
      const src = variant || product;
      const availableQty = Math.max((src.stock || 0) - (src.reservedStock || 0), 0);
      rows.push({
        productId: product._id,
        variantId: variant?._id || null,
        productName: product.name,
        productSlug: product.slug,
        image: product.images?.[0]?.url,
        category: product.category?.name,
        variantLabel: variant?.label || '—',
        sku: variant?.sku || product.sku,
        stock: src.stock || 0,
        reservedStock: src.reservedStock || 0,
        // Already deducted from stock; shown so staff know how many are away at market.
        atMarket: atMarket.get(tripLineKey(product._id, variant?._id)) || 0,
        availableStock: availableQty,
        lowStockThreshold: threshold,
        isActive: product.isActive && (variant ? variant.isActive : true),
        status: stockStatus({ ...product, isActive: true, availability: 'available' }, availableQty),
      });
    });
  });

  if (status === 'low_stock') rows = rows.filter((r) => r.status === 'low_stock');
  if (status === 'out_of_stock') rows = rows.filter((r) => r.availableStock <= 0);
  if (status === 'reserved') rows = rows.filter((r) => r.reservedStock > 0);

  const summary = {
    rows: rows.length,
    totalStock: rows.reduce((s, r) => s + r.stock, 0),
    totalReserved: rows.reduce((s, r) => s + r.reservedStock, 0),
    totalAtMarket: rows.reduce((s, r) => s + r.atMarket, 0),
    lowStock: rows.filter((r) => r.status === 'low_stock').length,
    outOfStock: rows.filter((r) => r.availableStock <= 0).length,
  };
  res.json({ success: true, rows, summary });
});

// Sets on-hand stock (or adjusts it) for a product or one of its options. Validated server-side.
exports.updateInventory = asyncHandler(async (req, res) => {
  const { variantId, stock, adjustment, lowStockThreshold } = req.body;
  const product = await Product.findById(req.params.productId);
  if (!product) throw ApiError.notFound('Product not found');

  const holder = variantId ? product.variants.id(variantId) : product;
  if (!holder) throw ApiError.notFound('Product option not found');

  let next = holder.stock || 0;
  if (stock !== undefined && stock !== '') next = Number(stock);
  else if (adjustment !== undefined && adjustment !== '') next = (holder.stock || 0) + Number(adjustment);

  if (!Number.isInteger(next)) throw ApiError.badRequest('Stock must be a whole number');
  if (next < 0) throw ApiError.badRequest('Stock cannot be negative');
  if (next < (holder.reservedStock || 0)) {
    throw ApiError.badRequest(`Stock cannot be lower than the ${holder.reservedStock} unit(s) reserved by pending orders`);
  }

  const previous = holder.stock || 0;
  holder.stock = next;
  if (lowStockThreshold !== undefined && lowStockThreshold !== '') {
    const threshold = Number(lowStockThreshold);
    if (!Number.isInteger(threshold) || threshold < 0) throw ApiError.badRequest('Low-stock threshold must be 0 or more');
    product.lowStockThreshold = threshold;
  }
  await product.save();
  await refreshAggregates(product._id);
  await product.populate('category', 'name slug');
  await ledger.record({
    product,
    holder: variantId ? holder : undefined,
    type: 'ADJUSTMENT',
    quantity: next - previous,
    balanceAfter: next,
    note: req.body.note || 'Stock updated from inventory ledger',
    user: req.user,
  });
  res.json({ success: true, message: 'Inventory updated' });
});
