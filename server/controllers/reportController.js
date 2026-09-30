const { Order, MarketTrip, StockLoss, StockMovement, Product, User, BulkOrder, Content } = require('../models');
const ApiError = require('../utils/ApiError');
const asyncHandler = require('../utils/asyncHandler');

const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
const key = (productId, variantId) => `${productId}:${variantId || ''}`;
const round2 = (n) => Math.round((n || 0) * 100) / 100;

// Resolves ?type=month&year=2026&month=9 or ?type=year&year=2026 into a [start, end] range (inclusive).
function resolvePeriod(query) {
  const type = query.type === 'year' ? 'year' : 'month';
  const year = parseInt(query.year, 10);
  const month = parseInt(query.month, 10);
  if (!Number.isInteger(year) || year < 2000 || year > 2100) throw ApiError.badRequest('Choose a valid year');
  if (type === 'month' && (!Number.isInteger(month) || month < 1 || month > 12)) throw ApiError.badRequest('Choose a valid month');

  const start = type === 'year' ? new Date(year, 0, 1) : new Date(year, month - 1, 1);
  const end = type === 'year' ? new Date(year + 1, 0, 1) : new Date(year, month, 1);
  end.setMilliseconds(-1);
  return {
    type,
    year,
    month: type === 'month' ? month : undefined,
    start,
    end,
    label: type === 'year' ? `January – December ${year}` : `${MONTHS[month - 1]} ${year}`,
    statementNumber: type === 'year' ? `TGF-STMT-${year}` : `TGF-STMT-${year}-${String(month).padStart(2, '0')}`,
  };
}

// ---------- Stock statement (opening → movements → closing) ----------

async function buildStockStatement(start, end) {
  const [products, movementFacets, firstMovement] = await Promise.all([
    Product.find().populate('category', 'name slug').lean(),
    StockMovement.aggregate([
      { $match: { at: { $gte: start } } },
      {
        $facet: {
          within: [
            { $match: { at: { $lte: end } } },
            {
              $group: {
                _id: { product: '$product', variantId: '$variantId', type: '$type' },
                qty: { $sum: '$quantity' },
                productName: { $last: '$productName' },
                variantLabel: { $last: '$variantLabel' },
                categoryName: { $last: '$categoryName' },
              },
            },
          ],
          after: [{ $match: { at: { $gt: end } } }, { $group: { _id: { product: '$product', variantId: '$variantId' }, qty: { $sum: '$quantity' } } }],
        },
      },
    ]),
    StockMovement.findOne().sort({ at: 1 }).select('at').lean(),
  ]);

  const lines = new Map();
  const ensure = (k, info) => {
    if (!lines.has(k)) {
      lines.set(k, {
        ...info,
        current: 0,
        after: 0,
        added: 0, // OPENING + ADJUSTMENT (net) + LOSS_REVERSAL
        onlineSales: 0, // ORDER_SALE + ORDER_RESTOCK (net, shown as outflow)
        marketOut: 0,
        marketReturn: 0,
        losses: 0,
      });
    }
    return lines.get(k);
  };

  products.forEach((p) => {
    const info = { productName: p.name, categoryName: p.category?.name };
    if (p.variants?.length) {
      p.variants.forEach((v) => {
        ensure(key(p._id, v._id), { ...info, variantLabel: v.label }).current = v.stock || 0;
      });
    } else {
      ensure(key(p._id), info).current = p.stock || 0;
    }
  });

  const { within = [], after = [] } = movementFacets[0] || {};
  after.forEach((m) => {
    ensure(key(m._id.product, m._id.variantId), { productName: 'Removed product' }).after += m.qty;
  });
  within.forEach((m) => {
    const line = ensure(key(m._id.product, m._id.variantId), {
      productName: m.productName,
      variantLabel: m.variantLabel,
      categoryName: m.categoryName,
    });
    switch (m._id.type) {
      case 'ORDER_SALE':
      case 'ORDER_RESTOCK':
        line.onlineSales -= m.qty;
        break;
      case 'MARKET_OUT':
        line.marketOut -= m.qty;
        break;
      case 'MARKET_RETURN':
        line.marketReturn += m.qty;
        break;
      case 'LOSS':
        line.losses -= m.qty;
        break;
      default:
        line.added += m.qty; // OPENING, ADJUSTMENT, LOSS_REVERSAL
    }
  });

  const rows = [...lines.values()]
    .map((l) => {
      const closing = l.current - l.after;
      const net = l.added - l.onlineSales - l.marketOut + l.marketReturn - l.losses;
      return {
        productName: l.productName,
        variantLabel: l.variantLabel,
        categoryName: l.categoryName,
        opening: closing - net,
        added: l.added,
        onlineSales: l.onlineSales,
        marketOut: l.marketOut,
        marketReturn: l.marketReturn,
        losses: l.losses,
        closing,
      };
    })
    .filter((r) => r.opening || r.closing || r.added || r.onlineSales || r.marketOut || r.marketReturn || r.losses)
    .sort((a, b) => (a.categoryName || '').localeCompare(b.categoryName || '') || a.productName.localeCompare(b.productName));

  const totals = rows.reduce(
    (t, r) => {
      Object.keys(t).forEach((k) => {
        t[k] += r[k];
      });
      return t;
    },
    { opening: 0, added: 0, onlineSales: 0, marketOut: 0, marketReturn: 0, losses: 0, closing: 0 }
  );

  return { rows, totals, ledgerStartedAt: firstMovement?.at || null };
}

// ---------- Statement ----------

exports.getStatement = asyncHandler(async (req, res) => {
  const period = resolvePeriod(req.query);
  const { start, end } = period;
  const inPeriod = { $gte: start, $lte: end };

  const [paidOrders, periodOrders, trips, losses, stock, newCustomers, bulkRequests, contentDocs] = await Promise.all([
    Order.find({ paymentStatus: 'PAID', paidAt: inPeriod }).sort({ paidAt: 1 }).lean(),
    Order.find({ createdAt: inPeriod }).select('orderNumber orderStatus paymentStatus paymentMethod total createdAt').lean(),
    MarketTrip.find({ tripDate: inPeriod }).sort({ tripDate: 1 }).lean(),
    StockLoss.find({ occurredOn: inPeriod, reversedAt: { $exists: false } }).sort({ occurredOn: 1 }).lean(),
    buildStockStatement(start, end),
    User.countDocuments({ role: 'customer', createdAt: inPeriod }),
    BulkOrder.countDocuments({ createdAt: inPeriod }),
    Content.find({ key: { $in: ['contact', 'settings'] } }).lean(),
  ]);

  const content = Object.fromEntries(contentDocs.map((d) => [d.key, d.data || {}]));
  const closedTrips = trips.filter((t) => t.status === 'CLOSED');
  const tripTotals = (t) =>
    t.items.reduce(
      (s, i) => ({
        out: s.out + i.quantityOut,
        sold: s.sold + (i.quantitySold || 0),
        returned: s.returned + (i.quantityReturned || 0),
        lost: s.lost + (i.quantityLost || 0),
        sales: s.sales + (i.salesAmount || 0),
      }),
      { out: 0, sold: 0, returned: 0, lost: 0, sales: 0 }
    );

  // Revenue transactions in date order with a running balance — the "account statement" core.
  const transactions = [
    ...paidOrders.map((o) => {
      const units = o.items.reduce((s, i) => s + i.quantity, 0);
      return {
        date: o.paidAt,
        reference: o.orderNumber,
        description: `Online order — ${o.customer.fullName} (${units} unit${units === 1 ? '' : 's'})`,
        channel: o.paymentMethod.replace(/_/g, ' '),
        amount: o.total,
      };
    }),
    ...closedTrips.map((t) => {
      const tt = tripTotals(t);
      return {
        date: t.tripDate,
        reference: t.tripNumber,
        description: `Market sales — ${t.market} (${tt.sold} sold of ${tt.out})`,
        channel: 'MARKET',
        amount: tt.sales,
      };
    }),
  ].sort((a, b) => new Date(a.date) - new Date(b.date));
  let running = 0;
  transactions.forEach((t) => {
    running = round2(running + t.amount);
    t.balance = running;
  });

  // Sales by product option, online vs market.
  const sales = new Map();
  const addSale = (k, info, field, units, revenue) => {
    if (!sales.has(k)) sales.set(k, { ...info, onlineUnits: 0, onlineRevenue: 0, marketUnits: 0, marketRevenue: 0 });
    const row = sales.get(k);
    row[`${field}Units`] += units;
    row[`${field}Revenue`] += revenue;
  };
  paidOrders.forEach((o) =>
    o.items.forEach((i) =>
      addSale(key(i.product, i.variantId), { productName: i.name, variantLabel: i.variantLabel, categoryName: i.categoryName }, 'online', i.quantity, i.lineTotal)
    )
  );
  closedTrips.forEach((t) =>
    t.items.forEach((i) =>
      addSale(
        key(i.product, i.variantId),
        { productName: i.productName, variantLabel: i.variantLabel, categoryName: i.categoryName },
        'market',
        i.quantitySold || 0,
        i.salesAmount || 0
      )
    )
  );
  const salesByProduct = [...sales.values()]
    .map((r) => ({ ...r, totalUnits: r.onlineUnits + r.marketUnits, totalRevenue: round2(r.onlineRevenue + r.marketRevenue) }))
    .sort((a, b) => b.totalRevenue - a.totalRevenue);

  const onlineRevenue = round2(paidOrders.reduce((s, o) => s + o.total, 0));
  const marketRevenue = round2(closedTrips.reduce((s, t) => s + tripTotals(t).sales, 0));
  const deliveryFees = round2(paidOrders.reduce((s, o) => s + (o.deliveryFee || 0), 0));

  // Orders placed in the period.
  const countBy = (field) =>
    Object.entries(
      periodOrders.reduce((acc, o) => {
        acc[o[field]] = acc[o[field]] || { count: 0, value: 0 };
        acc[o[field]].count += 1;
        acc[o[field]].value = round2(acc[o[field]].value + o.total);
        return acc;
      }, {})
    ).map(([k, v]) => ({ key: k, ...v }));
  const outstanding = periodOrders.filter((o) => o.paymentStatus !== 'PAID' && o.orderStatus !== 'CANCELLED');

  // Losses.
  const lossByReason = Object.entries(
    losses.reduce((acc, l) => {
      acc[l.reason] = (acc[l.reason] || 0) + l.quantity;
      return acc;
    }, {})
  ).map(([reason, units]) => ({ reason, units }));
  const birdsLost = losses.filter((l) => l.categorySlug !== 'eggs').reduce((s, l) => s + l.quantity, 0);
  const eggsLost = losses.filter((l) => l.categorySlug === 'eggs').reduce((s, l) => s + l.quantity, 0);

  // Month-by-month for annual statements.
  let monthly;
  if (period.type === 'year') {
    monthly = MONTHS.map((name) => ({ month: name, online: 0, market: 0, total: 0, unitsSold: 0, losses: 0, orders: 0 }));
    paidOrders.forEach((o) => {
      const row = monthly[new Date(o.paidAt).getMonth()];
      row.online += o.total;
      row.unitsSold += o.items.reduce((s, i) => s + i.quantity, 0);
    });
    closedTrips.forEach((t) => {
      const row = monthly[new Date(t.tripDate).getMonth()];
      const tt = tripTotals(t);
      row.market += tt.sales;
      row.unitsSold += tt.sold;
    });
    losses.forEach((l) => {
      monthly[new Date(l.occurredOn).getMonth()].losses += l.quantity;
    });
    periodOrders.forEach((o) => {
      monthly[new Date(o.createdAt).getMonth()].orders += 1;
    });
    monthly.forEach((r) => {
      r.online = round2(r.online);
      r.market = round2(r.market);
      r.total = round2(r.online + r.market);
    });
  }

  const unitsSoldOnline = paidOrders.reduce((s, o) => s + o.items.reduce((x, i) => x + i.quantity, 0), 0);
  const unitsSoldMarket = closedTrips.reduce((s, t) => s + tripTotals(t).sold, 0);

  res.json({
    success: true,
    statement: {
      period: { ...period, start, end },
      generatedAt: new Date(),
      generatedBy: req.user.name,
      company: {
        name: 'Tower of Grace Farms & Agro-Based Industries Ltd',
        address: content.contact?.address || '',
        phone: content.contact?.phone || '',
        email: content.contact?.email || '',
        logo: content.settings?.logo?.url || null,
      },
      summary: {
        totalRevenue: round2(onlineRevenue + marketRevenue),
        onlineRevenue,
        marketRevenue,
        deliveryFees,
        paidOrders: paidOrders.length,
        ordersPlaced: periodOrders.length,
        outstandingOrders: outstanding.length,
        outstandingValue: round2(outstanding.reduce((s, o) => s + o.total, 0)),
        unitsSold: unitsSoldOnline + unitsSoldMarket,
        unitsSoldOnline,
        unitsSoldMarket,
        marketTrips: trips.length,
        birdsLost,
        eggsLost,
        newCustomers,
        bulkRequests,
      },
      transactions,
      salesByProduct,
      stock,
      losses: losses.map((l) => ({
        date: l.occurredOn,
        productName: l.productName,
        variantLabel: l.variantLabel,
        categoryName: l.categoryName,
        reason: l.reason,
        quantity: l.quantity,
        notes: l.notes,
        reference: l.tripNumber,
      })),
      lossByReason,
      marketTrips: trips.map((t) => ({ tripNumber: t.tripNumber, date: t.tripDate, market: t.market, status: t.status, responsiblePerson: t.responsiblePerson, ...tripTotals(t) })),
      ordersByStatus: countBy('orderStatus'),
      ordersByPayment: countBy('paymentMethod'),
      monthly,
    },
  });
});
