/*
  End-to-end API smoke test.
  - Default: runs against a throwaway in-memory MongoDB (mongodb-memory-server downloads a mongod binary once).
  - Or: SMOKE_MONGO_URI="mongodb+srv://..." npm run smoke
    uses a real server with a uniquely named scratch database that is dropped afterwards.
  Your application database is never touched.
*/
const assert = require('assert/strict');

const results = [];
const check = async (name, fn) => {
  try {
    await fn();
    results.push(['PASS', name]);
  } catch (error) {
    // Unexpected errors (not assertions) include where they were thrown.
    const where = error.code === 'ERR_ASSERTION' ? '' : ` @ ${String(error.stack || '').split('\n').slice(1, 3).map((l) => l.trim()).join(' < ')}`;
    results.push(['FAIL', name, `${error.message}${where}`]);
  }
};

function scratchUri(uri) {
  const url = new URL(uri);
  url.pathname = `/tgf-smoke-${Date.now()}`;
  return url.toString();
}

(async () => {
  let mongo = null;
  let uri;
  if (process.env.SMOKE_MONGO_URI) {
    uri = scratchUri(process.env.SMOKE_MONGO_URI);
  } else {
    const { MongoMemoryServer } = require('mongodb-memory-server');
    mongo = await MongoMemoryServer.create();
    uri = mongo.getUri('tgf-smoke');
  }
  Object.assign(process.env, {
    NODE_ENV: 'test',
    MONGO_URI: uri,
    JWT_SECRET: 'smoke-test-secret-that-is-long-enough-123456',
    ADMIN_EMAIL: 'admin@example.com',
    ADMIN_PASSWORD: 'AdminPass123',
    FRONTEND_URL: 'http://localhost:5173',
    PAYSTACK_SECRET_KEY: '',
    FLUTTERWAVE_SECRET_KEY: '',
  });

  const mongoose = require('mongoose');
  const connectDB = require('../config/db');
  const app = require('../app');
  const { ensureBaseData } = require('./bootstrap');
  await connectDB(process.env.MONGO_URI);
  await ensureBaseData();
  const server = app.listen(0);
  const base = `http://127.0.0.1:${server.address().port}/api`;

  const call = async (method, path, body, token) => {
    const res = await fetch(base + path, {
      method,
      headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
      body: body ? JSON.stringify(body) : undefined,
    });
    const json = await res.json().catch(() => ({}));
    return { status: res.status, body: json };
  };

  let adminToken;
  let customerToken;
  let categories;
  let product;
  let eggProduct;
  let order;

  await check('health endpoint', async () => {
    const r = await call('GET', '/health');
    assert.equal(r.status, 200);
  });

  await check('base categories seeded (Broilers, Noilers, Eggs, Turkeys, Prepared Meat)', async () => {
    const r = await call('GET', '/categories');
    categories = r.body.categories;
    assert.deepEqual(categories.map((c) => c.slug), ['broilers', 'noilers', 'eggs', 'turkeys', 'prepared-meat']);
  });

  await check('admin login', async () => {
    const r = await call('POST', '/auth/login', { email: 'admin@example.com', password: 'AdminPass123' });
    assert.equal(r.status, 200);
    assert.equal(r.body.user.role, 'admin');
    assert.equal(r.body.user.password, undefined);
    adminToken = r.body.token;
  });

  await check('customer registration + weak password rejected', async () => {
    const weak = await call('POST', '/auth/register', { name: 'A', email: 'a@example.com', password: 'short' });
    assert.equal(weak.status, 400);
    const r = await call('POST', '/auth/register', { name: 'Ada Customer', email: 'ada@example.com', phone: '08030000000', password: 'Customer123' });
    assert.equal(r.status, 201);
    customerToken = r.body.token;
  });

  await check('customer cannot access admin routes', async () => {
    const r = await call('GET', '/admin/dashboard', null, customerToken);
    assert.equal(r.status, 403);
    const anon = await call('GET', '/admin/dashboard');
    assert.equal(anon.status, 401);
  });

  await check('admin creates broiler with weight options', async () => {
    const broilers = categories.find((c) => c.slug === 'broilers');
    const r = await call(
      'POST',
      '/admin/products',
      {
        name: 'Test Broiler',
        sku: 'TGF-TEST-1',
        category: broilers._id,
        shortDescription: 'Smoke test product',
        variants: [
          { label: '1.5–2.0 kg', type: 'weight', minWeight: 1.5, maxWeight: 2, price: 5000, stock: 5 },
          { label: '2.0–2.5 kg', type: 'weight', minWeight: 2, maxWeight: 2.5, price: 6500, salePrice: 6000, stock: 3 },
        ],
      },
      adminToken
    );
    assert.equal(r.status, 201, JSON.stringify(r.body));
    product = r.body.product;
    assert.equal(product.priceFrom, 5000);
    assert.equal(product.priceTo, 6000);
    assert.equal(product.availableStock, 8);
    assert.equal(product.slug, 'test-broiler');
  });

  await check('invalid weight range rejected', async () => {
    const r = await call(
      'POST',
      '/admin/products',
      { name: 'Bad', category: categories[0]._id, variants: [{ label: 'x', price: 1, minWeight: 3, maxWeight: 2 }] },
      adminToken
    );
    assert.equal(r.status, 400);
  });

  await check('admin creates eggs with packaging options', async () => {
    const eggs = categories.find((c) => c.slug === 'eggs');
    const r = await call(
      'POST',
      '/admin/products',
      {
        name: 'Test Eggs',
        sku: '',
        category: eggs._id,
        variants: [
          { label: '12 eggs', type: 'packaging', unitsPerPack: 12, price: 1500, stock: 10 },
          { label: '30 eggs (crate)', type: 'packaging', unitsPerPack: 30, price: 3500, stock: 10 },
        ],
      },
      adminToken
    );
    assert.equal(r.status, 201);
    eggProduct = r.body.product;
  });

  await check('single-price product without options or SKU (blank SKUs do not collide)', async () => {
    const turkeys = categories.find((c) => c.slug === 'turkeys');
    const r = await call(
      'POST',
      '/admin/products',
      { name: 'Test Turkey', sku: '', category: turkeys._id, price: '20000', stock: '2', weight: '6', variants: [], isActive: false },
      adminToken
    );
    assert.equal(r.status, 201, JSON.stringify(r.body));
    assert.equal(r.body.product.priceFrom, 20000);
    assert.equal(r.body.product.availableStock, 2);
    const hidden = await call('GET', '/products/test-turkey');
    assert.equal(hidden.status, 404, 'disabled products are hidden from the shop');
  });

  await check('public listing, category + weight + price filters', async () => {
    const all = await call('GET', '/products');
    assert.equal(all.body.meta.total, 2);
    const byCat = await call('GET', '/products?category=broilers');
    assert.equal(byCat.body.products.length, 1);
    const heavy = await call('GET', '/products?minWeight=2.2');
    assert.equal(heavy.body.products.length, 1);
    const cheap = await call('GET', '/products?maxPrice=2000');
    assert.equal(cheap.body.products[0].name, 'Test Eggs');
    assert.equal(all.body.products[0].variants[0].reservedStock, undefined, 'reservation internals must be hidden');
  });

  await check('product detail by slug', async () => {
    const r = await call('GET', '/products/test-broiler');
    assert.equal(r.status, 200);
    assert.equal(r.body.product.variants.length, 2);
    assert.equal(r.body.product.purchasable, true);
  });

  const heavyVariant = () => product.variants.find((v) => v.label.startsWith('2.0'));

  await check('guest order: server prices items, reserves stock, numbers TGF-YYYY-000001', async () => {
    const r = await call('POST', '/orders', {
      customer: { fullName: 'Guest Buyer', email: 'guest@example.com', phone: '08011111111' },
      items: [
        { productId: product._id, variantId: heavyVariant()._id, quantity: 2 },
        { productId: eggProduct._id, variantId: eggProduct.variants[1]._id, quantity: 1 },
      ],
      deliveryMethod: 'HOME_DELIVERY',
      deliveryAddress: { address: '1 Test Road', city: 'Ibadan', state: 'Oyo' },
      paymentMethod: 'BANK_TRANSFER',
    });
    assert.equal(r.status, 201, JSON.stringify(r.body));
    order = r.body.order;
    assert.match(order.orderNumber, new RegExp(`^TGF-${new Date().getFullYear()}-000001$`));
    assert.equal(order.subtotal, 2 * 6000 + 3500);
    assert.equal(order.total, order.subtotal + order.deliveryFee);
    assert.equal(order.paymentStatus, 'PENDING');
    const p = await call('GET', '/products/test-broiler');
    assert.equal(p.body.product.variants.find((v) => v._id === heavyVariant()._id).availableStock, 1);
  });

  await check('overselling is blocked', async () => {
    const r = await call('POST', '/orders', {
      customer: { fullName: 'Greedy', email: 'g@example.com', phone: '08022222222' },
      items: [{ productId: product._id, variantId: heavyVariant()._id, quantity: 2 }],
      deliveryMethod: 'FARM_PICKUP',
      paymentMethod: 'PAY_ON_DELIVERY',
    });
    assert.equal(r.status, 409);
  });

  await check('address required for delivery', async () => {
    const r = await call('POST', '/orders', {
      customer: { fullName: 'No Address', email: 'n@example.com', phone: '08022222222' },
      items: [{ productId: eggProduct._id, variantId: eggProduct.variants[0]._id, quantity: 1 }],
      deliveryMethod: 'HOME_DELIVERY',
      paymentMethod: 'PAY_ON_DELIVERY',
    });
    assert.equal(r.status, 400);
  });

  await check('unconfigured gateway is refused (no fake payment)', async () => {
    const r = await call('POST', '/orders', {
      customer: { fullName: 'Card', email: 'c@example.com', phone: '08022222222' },
      items: [{ productId: eggProduct._id, variantId: eggProduct.variants[0]._id, quantity: 1 }],
      deliveryMethod: 'FARM_PICKUP',
      paymentMethod: 'PAYSTACK',
    });
    assert.equal(r.status, 400);
    const cfg = await call('GET', '/payments/config');
    assert.equal(cfg.body.methods.PAYSTACK, false);
  });

  await check('guest can track order with number + email only', async () => {
    const ok = await call('GET', `/orders/track?orderNumber=${order.orderNumber}&email=guest@example.com`);
    assert.equal(ok.status, 200);
    const wrong = await call('GET', `/orders/track?orderNumber=${order.orderNumber}&email=other@example.com`);
    assert.equal(wrong.status, 404);
  });

  await check('receipt upload rejects fake files and wrong orders', async () => {
    const upload = async (fields, bytes, type, name) => {
      const form = new FormData();
      Object.entries(fields).forEach(([k, v]) => form.append(k, v));
      form.append('receipt', new Blob([bytes], { type }), name);
      const res = await fetch(`${base}/orders/payment-proof`, { method: 'POST', body: form });
      return { status: res.status, body: await res.json() };
    };
    const fake = await upload({ orderNumber: order.orderNumber, email: 'guest@example.com' }, 'not really a png at all', 'image/png', 'r.png');
    assert.equal(fake.status, 400, JSON.stringify(fake.body));
    const badType = await upload({ orderNumber: order.orderNumber, email: 'guest@example.com' }, 'MZ....', 'application/x-msdownload', 'r.exe');
    assert.equal(badType.status, 400);
    const pdf = Buffer.from('%PDF-1.4 test receipt');
    const wrongEmail = await upload({ orderNumber: order.orderNumber, email: 'someone@example.com' }, pdf, 'application/pdf', 'r.pdf');
    assert.equal(wrongEmail.status, 404);
  });

  await check('customer "I have made the transfer" notice (no file) alerts the admin in-app', async () => {
    const notice = async () => {
      const form = new FormData();
      form.append('orderNumber', order.orderNumber);
      form.append('email', 'guest@example.com');
      form.append('senderName', 'Guest Buyer');
      form.append('transferDate', new Date().toISOString().slice(0, 10));
      const res = await fetch(`${base}/orders/payment-proof`, { method: 'POST', body: form });
      return { status: res.status, body: await res.json() };
    };
    const first = await notice();
    assert.equal(first.status, 201, JSON.stringify(first.body));
    assert.equal(first.body.order.paymentProofs.at(-1).kind, 'NOTICE');
    assert.equal(first.body.order.awaitingPaymentReview, true);
    assert.equal(first.body.order.internalNotes, undefined, 'internal notes stay private');
    const duplicate = await notice();
    assert.equal(duplicate.status, 409, 'a second plain notice while one is pending is refused');

    const feed = await call('GET', '/admin/notifications', null, adminToken);
    assert.equal(feed.status, 200);
    const types = feed.body.notifications.map((n) => n.type);
    assert.ok(types.includes('TRANSFER_NOTICE'), types.join(','));
    assert.ok(types.includes('NEW_ORDER'));
    assert.ok(feed.body.unreadCount > 0);
    const transfer = feed.body.notifications.find((n) => n.type === 'TRANSFER_NOTICE');
    assert.equal(transfer.link, `/admin/orders/${order._id}`);
    const read = await call('PATCH', `/admin/notifications/${transfer._id}/read`, null, adminToken);
    assert.equal(read.status, 200);
    await call('POST', '/admin/notifications/read-all', null, adminToken);
    const after = await call('GET', '/admin/notifications', null, adminToken);
    assert.equal(after.body.unreadCount, 0);
    const customerFeed = await call('GET', '/admin/notifications', null, customerToken);
    assert.equal(customerFeed.status, 403);
  });

  await check('admin rejects a receipt with a reason; order shows it to the customer', async () => {
    // Simulate a stored upload (the real upload goes to Cloudinary, which the test does not touch).
    const { Order } = require('../models');
    const addProof = () =>
      Order.updateOne(
        { _id: order._id },
        { $push: { paymentProofs: { url: 'https://example.com/r.png', mimeType: 'image/png', status: 'PENDING' } }, $set: { awaitingPaymentReview: true } }
      );
    await addProof();
    const queue = await call('GET', '/admin/orders?awaitingReview=true', null, adminToken);
    assert.equal(queue.body.orders.length, 1);
    const dash = await call('GET', '/admin/dashboard', null, adminToken);
    assert.equal(dash.body.stats.receiptsToReview, 1);
    const noReason = await call('POST', `/admin/orders/${order._id}/reject-proof`, {}, adminToken);
    assert.equal(noReason.status, 400);
    const rejected = await call('POST', `/admin/orders/${order._id}/reject-proof`, { reason: 'No matching transfer' }, adminToken);
    assert.equal(rejected.status, 200, JSON.stringify(rejected.body));
    assert.equal(rejected.body.order.awaitingPaymentReview, false);
    const tracked = await call('GET', `/orders/track?orderNumber=${order.orderNumber}&email=guest@example.com`);
    assert.equal(tracked.body.order.paymentProofs[0].status, 'REJECTED');
    assert.equal(tracked.body.order.paymentProofs[0].reviewNote, 'No matching transfer');
    assert.equal(tracked.body.order.internalNotes, undefined, 'internal notes stay private');
    await addProof();
  });

  await check('admin confirms money received: order PAID + CONFIRMED, receipt accepted, stock committed', async () => {
    const customerCannot = await call('POST', `/admin/orders/${order._id}/confirm-payment`, {}, customerToken);
    assert.equal(customerCannot.status, 403);
    const r = await call('POST', `/admin/orders/${order._id}/confirm-payment`, { note: 'Transfer seen' }, adminToken);
    assert.equal(r.status, 200, JSON.stringify(r.body));
    assert.equal(r.body.order.paymentStatus, 'PAID');
    assert.equal(r.body.order.orderStatus, 'CONFIRMED');
    assert.equal(r.body.order.inventoryState, 'COMMITTED');
    assert.equal(r.body.order.awaitingPaymentReview, false);
    assert.equal(r.body.order.paymentProofs.at(-1).status, 'ACCEPTED');
    const again = await call('POST', `/admin/orders/${order._id}/confirm-payment`, {}, adminToken);
    assert.equal(again.status, 409, 'payment can only be confirmed once');
    const tracked = await call('GET', `/orders/track?orderNumber=${order.orderNumber}&email=guest@example.com`);
    assert.equal(tracked.body.order.paymentStatus, 'PAID');
    assert.ok(tracked.body.order.paidAt);
    const inv = await call('GET', '/admin/inventory', null, adminToken);
    const row = inv.body.rows.find((x) => x.variantId === heavyVariant()._id);
    assert.equal(row.stock, 1);
    assert.equal(row.reservedStock, 0);
  });

  await check('customer order + cancel releases reservation', async () => {
    const created = await call(
      'POST',
      '/orders',
      {
        customer: { fullName: 'Ada Customer', email: 'ada@example.com', phone: '08030000000' },
        items: [{ productId: eggProduct._id, variantId: eggProduct.variants[0]._id, quantity: 4 }],
        deliveryMethod: 'FARM_PICKUP',
        paymentMethod: 'PAY_ON_DELIVERY',
      },
      customerToken
    );
    assert.equal(created.status, 201);
    const mine = await call('GET', '/orders/mine', null, customerToken);
    assert.equal(mine.body.orders.length, 1);
    const cancelled = await call('POST', `/orders/mine/${created.body.order._id}/cancel`, null, customerToken);
    assert.equal(cancelled.body.order.orderStatus, 'CANCELLED');
    const p = await call('GET', '/products/test-eggs');
    assert.equal(p.body.product.variants[0].availableStock, 10);
    const again = await call('PATCH', `/admin/orders/${created.body.order._id}/status`, { status: 'PROCESSING' }, adminToken);
    assert.equal(again.status, 409, 'cancelled orders are terminal');
  });

  await check('inventory cannot go negative or below reserved', async () => {
    const neg = await call('PATCH', `/admin/inventory/${eggProduct._id}`, { variantId: eggProduct.variants[0]._id, adjustment: -50 }, adminToken);
    assert.equal(neg.status, 400);
    const ok = await call('PATCH', `/admin/inventory/${eggProduct._id}`, { variantId: eggProduct.variants[0]._id, stock: 25 }, adminToken);
    assert.equal(ok.status, 200);
  });

  await check('mortality/loss records deduct stock, validate, summarise and reverse', async () => {
    const variantId = eggProduct.variants[0]._id;
    const stockOf = async () => {
      const inv = await call('GET', '/admin/inventory', null, adminToken);
      return inv.body.rows.find((x) => x.variantId === variantId).stock;
    };
    assert.equal(await stockOf(), 25);
    const created = await call('POST', '/admin/stock-losses', { productId: eggProduct._id, variantId, quantity: 3, reason: 'BROKEN', notes: 'Dropped tray' }, adminToken);
    assert.equal(created.status, 201, JSON.stringify(created.body));
    assert.equal(created.body.record.stockBefore, 25);
    assert.equal(created.body.record.stockAfter, 22);
    assert.equal(await stockOf(), 22);

    const tooMany = await call('POST', '/admin/stock-losses', { productId: eggProduct._id, variantId, quantity: 999, reason: 'BROKEN' }, adminToken);
    assert.equal(tooMany.status, 409);
    const future = await call('POST', '/admin/stock-losses', { productId: eggProduct._id, variantId, quantity: 1, reason: 'BROKEN', occurredOn: '2999-01-01' }, adminToken);
    assert.equal(future.status, 400);
    const noVariant = await call('POST', '/admin/stock-losses', { productId: eggProduct._id, quantity: 1, reason: 'BROKEN' }, adminToken);
    assert.equal(noVariant.status, 400);
    const customer = await call('GET', '/admin/stock-losses', null, customerToken);
    assert.equal(customer.status, 403);

    const list = await call('GET', '/admin/stock-losses', null, adminToken);
    assert.equal(list.body.summary.eggs, 3);
    assert.equal(list.body.summary.birds, 0);
    assert.equal(list.body.summary.byReason[0].reason, 'BROKEN');

    const dash = await call('GET', '/admin/dashboard', null, adminToken);
    assert.equal(dash.body.stats.eggLosses30d, 3);

    const reversed = await call('POST', `/admin/stock-losses/${created.body.record._id}/reverse`, { note: 'test' }, adminToken);
    assert.equal(reversed.status, 200, JSON.stringify(reversed.body));
    assert.equal(await stockOf(), 25);
    const twice = await call('POST', `/admin/stock-losses/${created.body.record._id}/reverse`, {}, adminToken);
    assert.equal(twice.status, 409);
    const after = await call('GET', '/admin/stock-losses', null, adminToken);
    assert.equal(after.body.summary.eggs, 0, 'reversed records are excluded from totals');
  });

  await check('market trip: stock leaves on dispatch, returns balance it, losses logged once, totals reported', async () => {
    const v0 = eggProduct.variants[0]._id;
    const v1 = eggProduct.variants[1]._id;
    const row = async (variantId) => {
      const inv = await call('GET', '/admin/inventory', null, adminToken);
      return inv.body.rows.find((x) => x.variantId === variantId);
    };
    assert.equal((await row(v0)).stock, 25);
    const v1Before = (await row(v1)).stock;

    // All-or-nothing dispatch: one impossible line means nothing leaves.
    const tooMany = await call(
      'POST',
      '/admin/market-trips',
      { market: 'Bodija Market', items: [{ productId: eggProduct._id, variantId: v1, quantity: 2 }, { productId: eggProduct._id, variantId: v0, quantity: 999 }] },
      adminToken
    );
    assert.equal(tooMany.status, 409);
    assert.equal((await row(v1)).stock, v1Before, 'earlier lines are rolled back');

    const sent = await call(
      'POST',
      '/admin/market-trips',
      { market: 'Bodija Market', responsiblePerson: 'Musa', items: [{ productId: eggProduct._id, variantId: v0, quantity: 6 }, { productId: eggProduct._id, variantId: v0, quantity: 4 }] },
      adminToken
    );
    assert.equal(sent.status, 201, JSON.stringify(sent.body));
    const trip = sent.body.trip;
    assert.match(trip.tripNumber, /^MKT-\d{4}-0001$/);
    assert.equal(trip.items.length, 1, 'duplicate lines are merged');
    assert.equal(trip.items[0].quantityOut, 10);
    const afterDispatch = await row(v0);
    assert.equal(afterDispatch.stock, 15);
    assert.equal(afterDispatch.atMarket, 10);

    const item = trip.items[0]._id;
    const unbalanced = await call('POST', `/admin/market-trips/${trip._id}/close`, { items: [{ itemId: item, sold: 6, returned: 3, lost: 0 }] }, adminToken);
    assert.equal(unbalanced.status, 400, 'sold + returned + lost must equal quantity out');
    const noReason = await call('POST', `/admin/market-trips/${trip._id}/close`, { items: [{ itemId: item, sold: 6, returned: 3, lost: 1 }] }, adminToken);
    assert.equal(noReason.status, 400);

    const closed = await call(
      'POST',
      `/admin/market-trips/${trip._id}/close`,
      { items: [{ itemId: item, sold: 6, returned: 3, lost: 1, lossReason: 'BROKEN', salesAmount: 9000 }] },
      adminToken
    );
    assert.equal(closed.status, 200, JSON.stringify(closed.body));
    assert.equal(closed.body.trip.status, 'CLOSED');
    assert.deepEqual(
      { sold: closed.body.trip.totals.sold, returned: closed.body.trip.totals.returned, lost: closed.body.trip.totals.lost },
      { sold: 6, returned: 3, lost: 1 }
    );
    const afterClose = await row(v0);
    assert.equal(afterClose.stock, 18, '15 + 3 returned; the lost unit is not deducted twice');
    assert.equal(afterClose.atMarket, 0);

    const again = await call('POST', `/admin/market-trips/${trip._id}/close`, { items: [{ itemId: item, sold: 10 }] }, adminToken);
    assert.equal(again.status, 409);

    const losses = await call('GET', '/admin/stock-losses', null, adminToken);
    const tripLoss = losses.body.records.find((r) => r.tripNumber === trip.tripNumber);
    assert.ok(tripLoss, 'trip loss appears in Mortality & Losses');
    assert.equal(tripLoss.quantity, 1);
    const reverse = await call('POST', `/admin/stock-losses/${tripLoss._id}/reverse`, {}, adminToken);
    assert.equal(reverse.status, 409, 'trip losses cannot be reversed separately');

    const second = await call('POST', '/admin/market-trips', { market: 'Oje Market', items: [{ productId: eggProduct._id, variantId: v0, quantity: 5 }] }, adminToken);
    assert.equal((await row(v0)).stock, 13);
    const cancelled = await call('POST', `/admin/market-trips/${second.body.trip._id}/cancel`, { reason: 'Truck broke down' }, adminToken);
    assert.equal(cancelled.status, 200);
    assert.equal((await row(v0)).stock, 18, 'cancelling returns everything');

    const list = await call('GET', '/admin/market-trips', null, adminToken);
    assert.equal(list.body.summary.openTrips, 0);
    assert.equal(list.body.summary.last30Days.sales, 9000);
    assert.equal(list.body.summary.last30Days.sellThrough, 60);
    const dash = await call('GET', '/admin/dashboard', null, adminToken);
    assert.equal(dash.body.stats.marketSales30d, 9000);
    const customer = await call('GET', '/admin/market-trips', null, customerToken);
    assert.equal(customer.status, 403);
  });

  await check('monthly statement balances: opening + movements = closing = real stock; revenue totals match', async () => {
    const now = new Date();
    const r = await call('GET', `/admin/reports/statement?type=month&year=${now.getFullYear()}&month=${now.getMonth() + 1}`, null, adminToken);
    assert.equal(r.status, 200, JSON.stringify(r.body));
    const s = r.body.statement;
    assert.match(s.period.statementNumber, /^TGF-STMT-\d{4}-\d{2}$/);

    // Revenue: one paid online order + one closed market trip (₦9,000).
    assert.equal(s.summary.marketRevenue, 9000);
    assert.equal(s.summary.onlineRevenue, order.total);
    assert.equal(s.summary.totalRevenue, order.total + 9000);
    assert.equal(s.transactions.at(-1).balance, s.summary.totalRevenue, 'running balance ends at total revenue');

    // Stock: every line must reconcile, and closing must equal the live inventory.
    const inv = await call('GET', '/admin/inventory', null, adminToken);
    const eggs = s.stock.rows.find((x) => x.productName === 'Test Eggs' && x.variantLabel === '12 eggs');
    assert.ok(eggs, 'egg option appears in the stock statement');
    assert.equal(eggs.opening, 0, 'product was created this month');
    assert.equal(eggs.closing, inv.body.rows.find((x) => x.variantId === eggProduct.variants[0]._id).stock);
    assert.equal(eggs.marketOut, 15);
    assert.equal(eggs.marketReturn, 8);
    s.stock.rows.forEach((row) => {
      const computed = row.opening + row.added - row.onlineSales - row.marketOut + row.marketReturn - row.losses;
      assert.equal(computed, row.closing, `${row.productName} ${row.variantLabel || ''} does not reconcile`);
    });
    const broiler = s.stock.rows.find((x) => x.variantLabel === '2.0–2.5 kg');
    assert.equal(broiler.onlineSales, 2, 'committed online sale is in the ledger');
    assert.ok(s.stock.ledgerStartedAt);

    const annual = await call('GET', `/admin/reports/statement?type=year&year=${now.getFullYear()}`, null, adminToken);
    assert.equal(annual.body.statement.monthly.length, 12);
    assert.equal(annual.body.statement.monthly[now.getMonth()].total, s.summary.totalRevenue);

    const bad = await call('GET', '/admin/reports/statement?type=month&year=2026&month=13', null, adminToken);
    assert.equal(bad.status, 400);
    const customer = await call('GET', `/admin/reports/statement?type=year&year=${now.getFullYear()}`, null, customerToken);
    assert.equal(customer.status, 403);
  });

  await check('flock batch: ages from arrival, deaths do not touch stock, ready alert, confirmed transfer adds stock', async () => {
    const broilers = categories.find((c) => c.slug === 'broilers');
    const eggsCat = categories.find((c) => c.slug === 'eggs');
    const heavy = heavyVariant()._id;
    const light = product.variants.find((v) => v._id !== heavy)._id;
    const stockOf = async (variantId) => {
      const inv = await call('GET', '/admin/inventory', null, adminToken);
      return inv.body.rows.find((x) => x.variantId === variantId).stock;
    };
    const heavyBefore = await stockOf(heavy);
    const lightBefore = await stockOf(light);
    const tenDaysAgo = new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);

    const eggsBatch = await call('POST', '/admin/batches', { category: eggsCat._id, quantityPurchased: 10, targetAgeDays: 10 }, adminToken);
    assert.equal(eggsBatch.status, 400, 'eggs are not flock batches');

    const created = await call(
      'POST',
      '/admin/batches',
      { category: broilers._id, quantityPurchased: 100, purchaseDate: tenDaysAgo, targetAgeDays: 42, supplier: 'Test Hatchery', unitCost: 650 },
      adminToken
    );
    assert.equal(created.status, 201, JSON.stringify(created.body));
    const b = created.body.batch;
    assert.match(b.batchCode, /^BRL-\d{6}-\d{2}$/);
    assert.equal(b.ageDays, 11, 'day-old on arrival + 10 days');
    assert.equal(b.stage, 'BROODING');
    assert.equal(b.status, 'ACTIVE');
    assert.equal(b.live, 100);
    assert.equal(b.totalCost, 65000);

    const died = await call('POST', `/admin/batches/${b._id}/mortality`, { quantity: 3, reason: 'MORTALITY' }, adminToken);
    assert.equal(died.body.batch.live, 97);
    assert.equal(await stockOf(heavy), heavyBefore, 'batch deaths never change shop stock');
    const tooMany = await call('POST', `/admin/batches/${b._id}/mortality`, { quantity: 500, reason: 'MORTALITY' }, adminToken);
    assert.equal(tooMany.status, 400);
    const weighed = await call('POST', `/admin/batches/${b._id}/weighings`, { avgWeightKg: 0.45, sampleSize: 20 }, adminToken);
    assert.equal(weighed.body.batch.latestWeightKg, 0.45);
    const early = await call('POST', `/admin/batches/${b._id}/transfer`, { allocations: [{ productId: product._id, variantId: heavy, quantity: 1 }] }, adminToken);
    assert.equal(early.status, 409, 'birds cannot be pushed to inventory before the batch is ready');

    // Bring the target forward: the batch becomes READY and the admins are notified once.
    const edited = await call('PUT', `/admin/batches/${b._id}`, { targetAgeDays: 11 }, adminToken);
    assert.equal(edited.body.batch.status, 'READY');
    await call('GET', '/admin/batches', null, adminToken);
    const feed = await call('GET', '/admin/notifications?limit=50', null, adminToken);
    const alerts = feed.body.notifications.filter((n) => n.type === 'BATCH_READY' && n.title.includes(b.batchCode));
    assert.equal(alerts.length, 1, 'exactly one ready notification');
    assert.equal(alerts[0].link, `/admin/batches/${b._id}`);

    const over = await call('POST', `/admin/batches/${b._id}/transfer`, { allocations: [{ productId: product._id, variantId: heavy, quantity: 98 }] }, adminToken);
    assert.equal(over.status, 400);
    const first = await call(
      'POST',
      `/admin/batches/${b._id}/transfer`,
      { allocations: [{ productId: product._id, variantId: heavy, quantity: 50 }, { productId: product._id, variantId: light, quantity: 20 }] },
      adminToken
    );
    assert.equal(first.status, 200, JSON.stringify(first.body));
    assert.equal(first.body.batch.live, 27);
    assert.equal(first.body.batch.status, 'READY', 'partial transfer keeps the batch open');
    assert.equal(await stockOf(heavy), heavyBefore + 50);
    assert.equal(await stockOf(light), lightBefore + 20);

    const rest = await call('POST', `/admin/batches/${b._id}/transfer`, { allocations: [{ productId: product._id, variantId: heavy, quantity: 27 }] }, adminToken);
    assert.equal(rest.body.batch.status, 'COMPLETED');
    assert.equal(rest.body.batch.stage, 'IN_STOCK');
    const locked = await call('POST', `/admin/batches/${b._id}/mortality`, { quantity: 1, reason: 'MORTALITY' }, adminToken);
    assert.equal(locked.status, 409);

    const now = new Date();
    const statement = await call('GET', `/admin/reports/statement?type=month&year=${now.getFullYear()}&month=${now.getMonth() + 1}`, null, adminToken);
    const heavyRow = statement.body.statement.stock.rows.find((x) => x.variantLabel === '2.0–2.5 kg');
    assert.equal(heavyRow.closing, heavyBefore + 77, 'batch transfers flow into the stock statement');
    statement.body.statement.stock.rows.forEach((row) => {
      assert.equal(row.opening + row.added - row.onlineSales - row.marketOut + row.marketReturn - row.losses, row.closing);
    });
    const customer = await call('GET', '/admin/batches', null, customerToken);
    assert.equal(customer.status, 403);
  });

  await check('feed store: purchases in, daily feeding out (per batch), never below zero, one low-feed alert per drop', async () => {
    await call('PUT', '/admin/content/settings', { data: { feedAlertEmails: 'boss@example.com' } }, adminToken);
    const created = await call('POST', '/admin/feeds', { name: 'Broiler Starter', brand: 'Test Mills', feedType: 'STARTER', bagSizeKg: 25, lowStockBags: 10, openingBags: 15 }, adminToken);
    assert.equal(created.status, 201, JSON.stringify(created.body));
    const feed = created.body.feed;
    assert.equal(feed.stockBags, 15);
    const duplicate = await call('POST', '/admin/feeds', { name: 'broiler starter', brand: 'test mills' }, adminToken);
    assert.equal(duplicate.status, 409, 'the same feed cannot be added twice');

    const bought = await call('POST', `/admin/feeds/${feed._id}/purchases`, { bags: 5, costPerBag: 12000, supplier: 'Agro Depot' }, adminToken);
    assert.equal(bought.body.feed.stockBags, 20);

    const broilers = categories.find((c) => c.slug === 'broilers');
    const batch = (await call('POST', '/admin/batches', { category: broilers._id, quantityPurchased: 200, targetAgeDays: 42 }, adminToken)).body.batch;
    const fed = await call('POST', '/admin/feeds/usage', { lines: [{ feedId: feed._id, bags: 6, batchId: batch._id }, { feedId: feed._id, bags: 2.5 }] }, adminToken);
    assert.equal(fed.status, 201, JSON.stringify(fed.body));

    const feedsNow = async () => (await call('GET', '/admin/feeds', null, adminToken)).body;
    assert.equal((await feedsNow()).feeds.find((f) => f._id === feed._id).stockBags, 11.5);
    const alertsFor = async () =>
      (await call('GET', '/admin/notifications?limit=50', null, adminToken)).body.notifications.filter((n) => n.type === 'FEED_LOW' && n.title.includes('Broiler Starter'));
    assert.equal((await alertsFor()).length, 0, 'no alert above 10 bags');

    await call('POST', '/admin/feeds/usage', { lines: [{ feedId: feed._id, bags: 2 }] }, adminToken);
    assert.equal((await alertsFor()).length, 1, 'alert when stock reaches 10 bags or fewer');
    await call('POST', '/admin/feeds/usage', { lines: [{ feedId: feed._id, bags: 1 }] }, adminToken);
    assert.equal((await alertsFor()).length, 1, 'no duplicate alert while still low');

    const over = await call('POST', '/admin/feeds/usage', { lines: [{ feedId: feed._id, bags: 1 }, { feedId: feed._id, bags: 999 }] }, adminToken);
    assert.equal(over.status, 409, 'cannot feed more than is in store');
    let summary = await feedsNow();
    assert.equal(summary.feeds.find((f) => f._id === feed._id).stockBags, 8.5, 'a rejected multi-line entry deducts nothing');
    assert.equal(summary.summary.lowFeeds, 1);

    const noReason = await call('POST', `/admin/feeds/${feed._id}/adjust`, { countedBags: 30 }, adminToken);
    assert.equal(noReason.status, 400);
    const counted = await call('POST', `/admin/feeds/${feed._id}/adjust`, { countedBags: 30, note: 'Stock count' }, adminToken);
    assert.equal(counted.body.feed.stockBags, 30);
    await call('POST', '/admin/feeds/usage', { lines: [{ feedId: feed._id, bags: 20 }] }, adminToken);
    assert.equal((await alertsFor()).length, 2, 'the alert re-arms after restocking');

    const perBatch = await call('GET', `/admin/feeds/batch/${batch._id}`, null, adminToken);
    assert.equal(perBatch.body.totalBags, 6);
    const ledger = await call('GET', `/admin/feeds/transactions?feed=${feed._id}`, null, adminToken);
    assert.equal(ledger.body.transactions[0].balanceAfter, 10, 'latest ledger balance matches stock');
    assert.deepEqual(ledger.body.transactions.map((t) => t.type).reverse(), ['OPENING', 'PURCHASE', 'USAGE', 'USAGE', 'USAGE', 'USAGE', 'ADJUSTMENT', 'USAGE']);

    summary = await feedsNow();
    assert.equal(summary.summary.totalBags, 10);
    assert.equal(summary.summary.spent30Days, 60000);
    const dash = await call('GET', '/admin/dashboard', null, adminToken);
    assert.equal(dash.body.stats.feedBags, 10);
    assert.equal((await call('GET', '/admin/feeds', null, customerToken)).status, 403);
  });

  await check('feeding covers every bird: whole farm, growing and ready batches, birds in stock, named pens', async () => {
    const feed = (await call('POST', '/admin/feeds', { name: 'Layer Mash', feedType: 'LAYER', lowStockBags: 2, openingBags: 40 }, adminToken)).body.feed;
    const broilers = categories.find((c) => c.slug === 'broilers');
    const fiftyDaysAgo = new Date(Date.now() - 50 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
    const ready = (await call('POST', '/admin/batches', { category: broilers._id, quantityPurchased: 60, purchaseDate: fiftyDaysAgo, targetAgeDays: 42 }, adminToken)).body.batch;
    assert.equal(ready.status, 'READY');

    const targets = (await call('GET', '/admin/feeds/targets', null, adminToken)).body;
    assert.ok(targets.batches.some((b) => b._id === ready._id && b.status === 'READY'), 'ready-for-sale batches can be fed');
    assert.ok(targets.products.length > 0, 'birds in the main stock can be fed');
    assert.ok(targets.products.every((p) => !/egg/i.test(p.name)), 'egg products are not feeding targets');
    const stockBird = targets.products[0];

    const fed = await call(
      'POST',
      '/admin/feeds/usage',
      {
        lines: [
          { feedId: feed._id, bags: 4, fedTo: 'FARM' },
          { feedId: feed._id, bags: 3, fedTo: 'BATCH', batchId: ready._id },
          { feedId: feed._id, bags: 2, fedTo: 'STOCK', productId: stockBird._id },
          { feedId: feed._id, bags: 1, fedTo: 'STOCK' },
          { feedId: feed._id, bags: 1.5, fedTo: 'GROUP', groupName: 'Layer house 2' },
        ],
      },
      adminToken
    );
    assert.equal(fed.status, 201, JSON.stringify(fed.body));

    const noName = await call('POST', '/admin/feeds/usage', { lines: [{ feedId: feed._id, bags: 1, fedTo: 'GROUP' }] }, adminToken);
    assert.equal(noName.status, 400, 'a pen / group needs a name');
    const noBatch = await call('POST', '/admin/feeds/usage', { lines: [{ feedId: feed._id, bags: 1, fedTo: 'BATCH' }] }, adminToken);
    assert.equal(noBatch.status, 400, 'a batch line needs the batch');
    const completed = (await call('GET', '/admin/batches?status=COMPLETED', null, adminToken)).body.batches[0];
    if (completed) {
      const gone = await call('POST', '/admin/feeds/usage', { lines: [{ feedId: feed._id, bags: 1, fedTo: 'BATCH', batchId: completed._id }] }, adminToken);
      assert.equal(gone.status, 400, 'a batch already moved to stock is fed as stock');
    }

    const ledger = (await call('GET', `/admin/feeds/transactions?feed=${feed._id}&type=USAGE`, null, adminToken)).body.transactions;
    assert.deepEqual(ledger.map((t) => t.fedTo).sort(), ['BATCH', 'FARM', 'GROUP', 'STOCK', 'STOCK']);
    assert.equal(ledger.find((t) => t.fedTo === 'BATCH').batchCode, ready.batchCode);
    assert.equal(ledger.find((t) => t.fedTo === 'STOCK' && t.product).productName, stockBird.name);
    assert.equal(ledger.find((t) => t.fedTo === 'GROUP').groupName, 'Layer house 2');
    const stockOnly = (await call('GET', `/admin/feeds/transactions?feed=${feed._id}&fedTo=STOCK`, null, adminToken)).body.transactions;
    assert.equal(stockOnly.length, 2);

    const store = (await call('GET', '/admin/feeds', null, adminToken)).body;
    assert.equal(store.feeds.find((f) => f._id === feed._id).stockBags, 28.5);
    assert.ok(store.summary.fedTo30Days.STOCK >= 3 && store.summary.fedTo30Days.GROUP >= 1.5);
    assert.equal((await call('GET', `/admin/feeds/batch/${ready._id}`, null, adminToken)).body.totalBags, 3, 'a ready batch still tracks its own feed');
  });

  await check('medicine store: purchases in, treatments out, withdrawal periods, low-stock and expiry alerts, disposal', async () => {
    const DAY = 24 * 60 * 60 * 1000;
    const isoDay = (offset) => new Date(Date.now() + offset * DAY).toISOString().slice(0, 10);
    const created = await call(
      'POST',
      '/admin/medicines',
      { name: 'Amoxicillin 20%', brand: 'Test Vet', category: 'ANTIBIOTIC', unit: 'SACHET', unitSize: '100 g', lowStockUnits: 3, withdrawalDays: 7, openingUnits: 6, expiryDate: isoDay(200) },
      adminToken
    );
    assert.equal(created.status, 201, JSON.stringify(created.body));
    const amox = created.body.medicine;
    assert.equal(amox.stockUnits, 6);
    assert.equal((await call('POST', '/admin/medicines', { name: 'amoxicillin 20%', brand: 'test vet' }, adminToken)).status, 409, 'the same medicine cannot be added twice');
    const vaccine = (await call('POST', '/admin/medicines', { name: 'Gumboro Vaccine', category: 'VACCINE', unit: 'VIAL', lowStockUnits: 1, openingUnits: 4 }, adminToken)).body.medicine;

    // A purchase with a sooner expiry becomes the store's expiry date; a later one does not.
    const bought = await call('POST', `/admin/medicines/${amox._id}/purchases`, { quantity: 4, costPerUnit: 2500, supplier: 'Vet Shop', lotNumber: 'L-1', expiryDate: isoDay(100) }, adminToken);
    assert.equal(bought.status, 201, JSON.stringify(bought.body));
    assert.equal(bought.body.medicine.stockUnits, 10);
    assert.equal(bought.body.medicine.expiryDate.slice(0, 10), isoDay(100));
    const later = await call('POST', `/admin/medicines/${amox._id}/purchases`, { quantity: 1, costPerUnit: 2500, expiryDate: isoDay(300) }, adminToken);
    assert.equal(later.body.medicine.expiryDate.slice(0, 10), isoDay(100), 'the earliest expiry on hand is kept');

    const broilers = categories.find((c) => c.slug === 'broilers');
    const batch = (await call('POST', '/admin/batches', { category: broilers._id, quantityPurchased: 300, targetAgeDays: 42 }, adminToken)).body.batch;
    const treated = await call(
      'POST',
      '/admin/medicines/treatments',
      {
        givenTo: 'BATCH',
        batchId: batch._id,
        purpose: 'TREATMENT',
        condition: 'CRD',
        route: 'DRINKING_WATER',
        birdsTreated: 300,
        durationDays: 5,
        lines: [
          { medicineId: amox._id, quantity: 5, dosage: '1 g per 2 L water' },
          { medicineId: vaccine._id, quantity: 1, withdrawalDays: 0 },
        ],
      },
      adminToken
    );
    assert.equal(treated.status, 201, JSON.stringify(treated.body));
    // 5 days of treatment from today: last dose in 4 days, plus 7 days of withdrawal.
    const until = new Date(treated.body.withdrawalUntil);
    const expected = new Date();
    expected.setHours(0, 0, 0, 0);
    expected.setDate(expected.getDate() + 4 + 7);
    assert.equal(until.getTime(), expected.getTime(), 'withdrawal runs from the last dose');

    const perBatch = (await call('GET', `/admin/medicines/batch/${batch._id}`, null, adminToken)).body;
    assert.equal(perBatch.treatments.length, 1, 'one treatment with two medicines is one record');
    assert.equal(perBatch.treatments[0].medicines.length, 2);
    assert.equal(new Date(perBatch.withdrawalUntil).getTime(), expected.getTime());

    const lowAlerts = async () =>
      (await call('GET', '/admin/notifications?limit=50', null, adminToken)).body.notifications.filter((n) => n.type === 'MEDICINE_LOW' && n.title.includes('Amoxicillin'));
    assert.equal((await lowAlerts()).length, 0, 'no alert above the alert level (6 left)');
    const pen = await call('POST', '/admin/medicines/treatments', { givenTo: 'GROUP', groupName: 'Layer house 2', purpose: 'PREVENTION', lines: [{ medicineId: amox._id, quantity: 3 }] }, adminToken);
    assert.equal(pen.status, 201, JSON.stringify(pen.body));
    assert.equal((await lowAlerts()).length, 1, 'alert when stock reaches the alert level');

    const over = await call('POST', '/admin/medicines/treatments', { lines: [{ medicineId: amox._id, quantity: 1 }, { medicineId: amox._id, quantity: 50 }] }, adminToken);
    assert.equal(over.status, 409, 'cannot give more than is in store');
    const noPen = await call('POST', '/admin/medicines/treatments', { givenTo: 'GROUP', lines: [{ medicineId: amox._id, quantity: 1 }] }, adminToken);
    assert.equal(noPen.status, 400, 'a pen / group needs a name');

    let store = (await call('GET', '/admin/medicines', null, adminToken)).body;
    assert.equal(store.medicines.find((m) => m._id === amox._id).stockUnits, 3, 'a rejected entry deducts nothing');
    assert.ok(store.withdrawals.some((w) => w.batch === batch._id && w.medicines.includes('Amoxicillin 20%')), 'the batch is listed as on withdrawal');
    assert.ok(!store.withdrawals.some((w) => w.groupName === 'Layer house 2' && w.medicines.includes('Gumboro Vaccine')));
    assert.equal(store.summary.spent30Days, 12500);
    assert.ok(store.summary.treatments30Days >= 2);
    assert.ok(store.summary.purposes30Days.TREATMENT >= 1 && store.summary.purposes30Days.PREVENTION >= 1);

    // Expiry alerts: a warning when near, an "expired" alert when past, then weekly reminders until disposed of.
    const { checkMedicineExpiry } = require('../services/medicineService');
    const { MedicineItem } = require('../models');
    const gumboroAlerts = async () =>
      (await call('GET', '/admin/notifications?limit=50', null, adminToken)).body.notifications.filter((n) => n.type === 'MEDICINE_EXPIRY' && n.title.includes('Gumboro'));
    await call('PUT', `/admin/medicines/${vaccine._id}`, { expiryDate: isoDay(10) }, adminToken);
    assert.equal((await gumboroAlerts()).length, 1, 'warning sent as soon as a near expiry date is entered');
    assert.match((await gumboroAlerts())[0].title, /expires in (9|10) day/);
    assert.equal(await checkMedicineExpiry(), 0, 'one warning per expiry date');

    await call('PUT', `/admin/medicines/${vaccine._id}`, { expiryDate: isoDay(-2) }, adminToken);
    let alerts = await gumboroAlerts();
    assert.equal(alerts.length, 2, 'expired alert sent straight away');
    assert.match(alerts[0].title, /^Expired drug: Gumboro/);
    assert.equal(await checkMedicineExpiry(), 0, 'no repeat within the week');
    await MedicineItem.updateOne({ _id: vaccine._id }, { $set: { expiredAlertSentAt: new Date(Date.now() - 8 * DAY) } });
    assert.equal(await checkMedicineExpiry(), 1, 'weekly reminder while expired stock is in store');
    alerts = await gumboroAlerts();
    assert.match(alerts[0].title, /^Reminder: expired Gumboro/);
    assert.equal(await checkMedicineExpiry(), 0);

    const expiredUse = await call('POST', '/admin/medicines/treatments', { lines: [{ medicineId: vaccine._id, quantity: 1 }] }, adminToken);
    assert.equal(expiredUse.status, 400, 'expired medicine cannot be given');
    store = (await call('GET', '/admin/medicines', null, adminToken)).body;
    assert.ok(store.medicines.find((m) => m._id === vaccine._id).isExpired);
    assert.ok(store.summary.expired >= 1);
    const dashExpired = (await call('GET', '/admin/dashboard', null, adminToken)).body.stats;
    assert.ok(dashExpired.expiredMedicines.some((m) => m.name === 'Gumboro Vaccine'), 'the dashboard lists expired drugs');

    const disposed = await call('POST', `/admin/medicines/${vaccine._id}/dispose`, { quantity: 3, reason: 'EXPIRED', note: 'Burnt' }, adminToken);
    assert.equal(disposed.status, 200, JSON.stringify(disposed.body));
    assert.equal(disposed.body.medicine.stockUnits, 0);
    assert.equal(disposed.body.medicine.expiryDate, undefined, 'an emptied store has no expiry date');
    await MedicineItem.updateOne({ _id: vaccine._id }, { $set: { expiredAlertSentAt: new Date(Date.now() - 8 * DAY) } });
    assert.equal(await checkMedicineExpiry(), 0, 'reminders stop once the expired stock is disposed of');

    const noReason = await call('POST', `/admin/medicines/${amox._id}/adjust`, { countedUnits: 2 }, adminToken);
    assert.equal(noReason.status, 400);
    const counted = await call('POST', `/admin/medicines/${amox._id}/adjust`, { countedUnits: 2, note: 'Stock count' }, adminToken);
    assert.equal(counted.body.medicine.stockUnits, 2);

    const ledger = (await call('GET', `/admin/medicines/transactions?medicine=${amox._id}`, null, adminToken)).body.transactions;
    assert.deepEqual(ledger.map((t) => t.type).reverse(), ['OPENING', 'PURCHASE', 'PURCHASE', 'USAGE', 'USAGE', 'ADJUSTMENT']);
    assert.equal(ledger[0].balanceAfter, 2, 'latest ledger balance matches stock');
    const dash = (await call('GET', '/admin/dashboard', null, adminToken)).body.stats;
    assert.ok(dash.lowMedicines.some((m) => m.name === 'Amoxicillin 20%'));
    assert.ok(dash.batchesUnderWithdrawal >= 1);
    assert.equal((await call('GET', '/admin/medicines', null, customerToken)).status, 403);
  });

  await check('prepared meat sells like any product but is never treated as live birds', async () => {
    const meatCat = categories.find((c) => c.slug === 'prepared-meat');
    const created = await call('POST', '/admin/products', { name: 'Dressed Chicken', sku: '', category: meatCat._id, price: '9000', stock: '10', variants: [] }, adminToken);
    assert.equal(created.status, 201, JSON.stringify(created.body));
    const meat = created.body.product;
    const listed = await call('GET', '/products?category=prepared-meat');
    assert.ok(listed.body.products.some((p) => p._id === meat._id), 'prepared meat is listed in its shop category');

    const batch = await call('POST', '/admin/batches', { category: meatCat._id, quantityPurchased: 10, targetAgeDays: 42 }, adminToken);
    assert.equal(batch.status, 400, 'prepared meat cannot be a flock batch');
    const targets = (await call('GET', '/admin/feeds/targets', null, adminToken)).body;
    assert.ok(!targets.products.some((p) => p._id === meat._id), 'prepared meat is not fed');

    const before = (await call('GET', '/admin/stock-losses', null, adminToken)).body.summary;
    const dashBefore = (await call('GET', '/admin/dashboard', null, adminToken)).body.stats.birdLosses30d;
    const spoiled = await call('POST', '/admin/stock-losses', { productId: meat._id, quantity: 2, reason: 'SPOILED', notes: 'Cold chain' }, adminToken);
    assert.equal(spoiled.status, 201, JSON.stringify(spoiled.body));
    const after = (await call('GET', '/admin/stock-losses', null, adminToken)).body.summary;
    assert.equal(after.meat, before.meat + 2);
    assert.equal(after.birds, before.birds, 'spoiled meat is not counted as birds lost');
    assert.equal((await call('GET', '/admin/dashboard', null, adminToken)).body.stats.birdLosses30d, dashBefore);
  });

  await check('meat processing: birds in (stock or ready batch), prepared meat out, yield, expiry alert, cancel restores', async () => {
    const meatCat = categories.find((c) => c.slug === 'prepared-meat');
    const broilers = categories.find((c) => c.slug === 'broilers');
    const eggs = categories.find((c) => c.slug === 'eggs');
    const createdLive = await call('POST', '/admin/products', { name: 'Process Broiler', sku: '', category: broilers._id, price: '7000', stock: '20', variants: [] }, adminToken);
    assert.equal(createdLive.status, 201, JSON.stringify(createdLive.body));
    const createdMeat = await call('POST', '/admin/products', { name: 'Whole Dressed Chicken', sku: '', category: meatCat._id, price: '9500', stock: '0', variants: [] }, adminToken);
    assert.equal(createdMeat.status, 201, JSON.stringify(createdMeat.body));
    const live = createdLive.body.product;
    const meat = createdMeat.body.product;
    const stockOf = async (id) => {
      const r = await call('GET', `/admin/products/${id}`, null, adminToken);
      assert.equal(r.status, 200, JSON.stringify(r.body));
      return r.body.product.stock;
    };

    const options = (await call('GET', '/admin/processing/options', null, adminToken)).body;
    assert.ok(options.birdStock.some((l) => l.productId === live._id), 'live birds in stock can be processed');
    assert.ok(options.meatProducts.some((p) => p._id === meat._id), 'prepared meat products are offered as outputs');
    assert.ok(!options.birdStock.some((l) => l.productId === meat._id), 'prepared meat is never a source');

    const run = await call(
      'POST',
      '/admin/processing',
      { sourceType: 'STOCK', productId: live._id, birdsIn: 5, condemned: 1, liveWeightKg: 12.5, dressedWeightKg: 9, storage: 'CHILLED', outputs: [{ productId: meat._id, quantity: 4, weightKg: 9 }] },
      adminToken
    );
    assert.equal(run.status, 201, JSON.stringify(run.body));
    assert.match(run.body.run.runNumber, /^PMR-\d{4}-\d{4}$/);
    assert.equal(run.body.run.yieldPct, 72);
    assert.equal(run.body.run.unitsOut, 4);
    assert.equal(await stockOf(live._id), 15, 'birds leave live stock');
    assert.equal(await stockOf(meat._id), 4, 'prepared meat enters stock');
    const useBy = new Date(run.body.run.useBy);
    assert.ok(useBy - Date.now() > 2 * 86400000 && useBy - Date.now() < 4 * 86400000, 'chilled meat defaults to a 3-day use-by');

    const tooMany = await call('POST', '/admin/processing', { sourceType: 'STOCK', productId: live._id, birdsIn: 999, outputs: [{ productId: meat._id, quantity: 1 }] }, adminToken);
    assert.equal(tooMany.status, 409);
    assert.equal(await stockOf(meat._id), 4, 'a failed run changes nothing');
    const eggItem = (await call('POST', '/admin/products', { name: 'Proc Eggs', sku: '', category: eggs._id, price: '100', stock: '1', variants: [] }, adminToken)).body.product;
    const wrongOutput = await call('POST', '/admin/processing', { sourceType: 'STOCK', productId: live._id, birdsIn: 1, outputs: [{ productId: eggItem._id, quantity: 1 }] }, adminToken);
    assert.equal(wrongOutput.status, 400, 'only prepared meat products can be produced');
    const meatAsSource = await call('POST', '/admin/processing', { sourceType: 'STOCK', productId: meat._id, birdsIn: 1, outputs: [{ productId: meat._id, quantity: 1 }] }, adminToken);
    assert.equal(meatAsSource.status, 400);
    assert.equal(await stockOf(live._id), 15);

    // From a flock batch: only once ready, and the birds leave the batch (not shop stock).
    const fiftyDaysAgo = new Date(Date.now() - 50 * 86400000).toISOString().slice(0, 10);
    const ready = (await call('POST', '/admin/batches', { category: broilers._id, quantityPurchased: 30, purchaseDate: fiftyDaysAgo, targetAgeDays: 42 }, adminToken)).body.batch;
    const young = (await call('POST', '/admin/batches', { category: broilers._id, quantityPurchased: 30, targetAgeDays: 42 }, adminToken)).body.batch;
    const early = await call('POST', '/admin/processing', { sourceType: 'BATCH', batchId: young._id, birdsIn: 5, outputs: [{ productId: meat._id, quantity: 5 }] }, adminToken);
    assert.equal(early.status, 409, 'a growing batch cannot be processed');
    const fromBatch = await call('POST', '/admin/processing', { sourceType: 'BATCH', batchId: ready._id, birdsIn: 10, storage: 'FROZEN', outputs: [{ productId: meat._id, quantity: 10 }] }, adminToken);
    assert.equal(fromBatch.status, 201, JSON.stringify(fromBatch.body));
    let batchNow = (await call('GET', `/admin/batches/${ready._id}`, null, adminToken)).body.batch;
    assert.equal(batchNow.live, 20);
    assert.equal(batchNow.processed, 10);
    assert.equal(await stockOf(meat._id), 14);

    // Statement: processing has its own column and every stock row still balances.
    const thisMonth = new Date();
    const statementRes = await call('GET', `/admin/reports/statement?type=month&year=${thisMonth.getFullYear()}&month=${thisMonth.getMonth() + 1}`, null, adminToken);
    assert.equal(statementRes.status, 200, JSON.stringify(statementRes.body));
    const { statement } = statementRes.body;
    assert.equal(statement.stock.rows.find((r) => r.productName === 'Whole Dressed Chicken').processing, 14);
    assert.equal(statement.stock.rows.find((r) => r.productName === 'Process Broiler').processing, -5);
    statement.stock.rows.forEach((r) => {
      assert.equal(r.opening + r.added + r.processing - r.onlineSales - r.marketOut + r.marketReturn - r.losses, r.closing);
    });
    assert.ok(statement.processing.totals.birdsIn >= 15);

    // Expiry alert: sent once, when the use-by date is within a day.
    const soon = await call('POST', '/admin/processing', { sourceType: 'STOCK', productId: live._id, birdsIn: 1, storage: 'READY_TO_EAT', outputs: [{ productId: meat._id, quantity: 1 }] }, adminToken);
    assert.equal(soon.status, 201, JSON.stringify(soon.body));
    const { checkMeatExpiry } = require('../services/meatExpiryService');
    assert.ok((await checkMeatExpiry()) >= 1);
    assert.equal(await checkMeatExpiry(), 0, 'no repeat alerts');
    const alerts = (await call('GET', '/admin/notifications?limit=50', null, adminToken)).body.notifications.filter(
      (n) => n.type === 'MEAT_EXPIRY' && n.title.includes(soon.body.run.runNumber)
    );
    assert.equal(alerts.length, 1);
    const list = (await call('GET', '/admin/processing', null, adminToken)).body;
    assert.ok(list.summary.birds30d >= 16);
    assert.ok(list.expiring.some((r) => r.runNumber === soon.body.run.runNumber));
    assert.ok((await call('GET', '/admin/dashboard', null, adminToken)).body.stats.meatInStock >= 15);

    // Cancelling puts everything back.
    assert.equal((await call('POST', `/admin/processing/${run.body.run._id}/cancel`, {}, adminToken)).status, 400, 'a reason is required');
    const cancelled = await call('POST', `/admin/processing/${run.body.run._id}/cancel`, { reason: 'Entered twice' }, adminToken);
    assert.equal(cancelled.status, 200, JSON.stringify(cancelled.body));
    assert.equal(await stockOf(live._id), 19, 'birds returned to stock (1 is still in the ready-to-eat run)');
    assert.equal(await stockOf(meat._id), 11);
    assert.equal((await call('POST', `/admin/processing/${run.body.run._id}/cancel`, { reason: 'again' }, adminToken)).status, 409);
    await call('POST', `/admin/processing/${fromBatch.body.run._id}/cancel`, { reason: 'Test' }, adminToken);
    batchNow = (await call('GET', `/admin/batches/${ready._id}`, null, adminToken)).body.batch;
    assert.equal(batchNow.live, 30, 'birds returned to the batch');
    assert.equal(await stockOf(meat._id), 1);
    assert.equal((await call('GET', '/admin/processing', null, customerToken)).status, 403);
  });

  await check('bank transfer details are published for checkout', async () => {
    const cfg = await call('GET', '/payments/config');
    assert.equal(cfg.body.bankTransfer.accountNumber, '3011906808');
    assert.equal(cfg.body.bankTransfer.bankName, 'First Bank');
    assert.equal(cfg.body.bankTransfer.accountName, 'Ngonadi Amobi Felix');
  });

  await check('contact + bulk order stored and visible to admin', async () => {
    const c = await call('POST', '/contact', { name: 'Visitor', email: 'v@example.com', message: 'Hello, do you deliver to Lagos?' });
    assert.equal(c.status, 201);
    const b = await call('POST', '/bulk-orders', {
      businessName: 'Hotel Test',
      businessType: 'Hotel',
      contactPerson: 'Manager',
      phone: '08099999999',
      email: 'hotel@example.com',
      product: 'Broilers',
      quantity: '100 birds weekly',
      deliveryLocation: 'Ibadan',
    });
    assert.equal(b.status, 201);
    const msgs = await call('GET', '/admin/messages', null, adminToken);
    const bulk = await call('GET', '/admin/bulk-orders', null, adminToken);
    assert.equal(msgs.body.messages.length, 1);
    assert.equal(bulk.body.requests.length, 1);
  });

  await check('CMS content save + public read', async () => {
    const r = await call('PUT', '/admin/content/about', { data: { heroTitle: 'About Tower of Grace' } }, adminToken);
    assert.equal(r.status, 200);
    const pub = await call('GET', '/content');
    assert.equal(pub.body.content.about.heroTitle, 'About Tower of Grace');
    assert.ok(Array.isArray(pub.body.content.settings.deliveryMethods));
    const bad = await call('PUT', '/admin/content/not-a-key', { data: {} }, adminToken);
    assert.equal(bad.status, 404);
  });

  await check('dashboard reports real figures', async () => {
    const r = await call('GET', '/admin/dashboard', null, adminToken);
    assert.equal(r.status, 200);
    assert.equal(r.body.stats.totalOrders, 2);
    assert.equal(r.body.stats.totalSales, order.total);
    assert.equal(r.body.stats.totalCustomers, 1);
    assert.equal(r.body.salesSeries.length, 6);
  });

  await check('customers list aggregates orders', async () => {
    const r = await call('GET', '/admin/customers', null, adminToken);
    assert.equal(r.body.customers[0].totalOrders, 1);
  });

  await check('NoSQL injection in login is neutralised', async () => {
    const r = await call('POST', '/auth/login', { email: { $gt: '' }, password: { $gt: '' } });
    assert.equal(r.status, 400);
  });

  await check('admin deletes a product with no open reservations', async () => {
    const del = await call('DELETE', `/admin/products/${eggProduct._id}`, null, adminToken);
    assert.equal(del.status, 200);
  });

  server.close();
  if (mongo) {
    await mongoose.disconnect();
    await mongo.stop();
  } else {
    await mongoose.connection.dropDatabase();
    await mongoose.disconnect();
  }

  const failed = results.filter((r) => r[0] === 'FAIL');
  results.forEach(([status, name, msg]) => console.log(`${status}  ${name}${msg ? `\n      ${msg}` : ''}`));
  console.log(`\n${results.length - failed.length}/${results.length} checks passed`);
  process.exit(failed.length ? 1 : 0);
})().catch((error) => {
  console.error(error);
  process.exit(1);
});
