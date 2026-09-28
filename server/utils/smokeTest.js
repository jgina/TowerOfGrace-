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
    results.push(['FAIL', name, error.message]);
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

  await check('base categories seeded (Broilers, Noilers, Eggs, Turkeys)', async () => {
    const r = await call('GET', '/categories');
    categories = r.body.categories;
    assert.deepEqual(categories.map((c) => c.slug), ['broilers', 'noilers', 'eggs', 'turkeys']);
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
