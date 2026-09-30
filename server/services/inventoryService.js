const { Product } = require('../models');
const ApiError = require('../utils/ApiError');
const ledger = require('./stockLedger');

const MAX_RETRIES = 5;

// Recomputes the denormalised price/stock/weight fields without overwriting concurrent stock changes.
async function refreshAggregates(productId) {
  const product = await Product.findById(productId);
  if (!product) return;
  product.recalculate();
  await Product.updateOne(
    { _id: productId },
    {
      $set: {
        priceFrom: product.priceFrom,
        priceTo: product.priceTo,
        availableStock: product.availableStock,
        weightFrom: product.weightFrom,
        weightTo: product.weightTo,
      },
    }
  );
}

function findStockHolder(product, variantId) {
  if (!variantId) return product;
  return (product.variants || []).find((v) => String(v._id) === String(variantId));
}

// Atomically reserves stock using compare-and-set on the values just read, retrying on contention.
async function reserveLine({ productId, variantId, quantity }) {
  for (let attempt = 0; attempt < MAX_RETRIES; attempt += 1) {
    const product = await Product.findById(productId);
    if (!product || !product.isActive) throw ApiError.badRequest('A product in your cart is no longer available');
    const holder = findStockHolder(product, variantId);
    if (!holder) throw ApiError.badRequest(`The selected option for ${product.name} is no longer available`);

    const available = (holder.stock || 0) - (holder.reservedStock || 0);
    if (available < quantity) {
      const label = variantId ? `${product.name} (${holder.label})` : product.name;
      throw ApiError.conflict(
        available > 0 ? `Only ${available} left in stock for ${label}` : `${label} is out of stock`
      );
    }

    const filter = variantId
      ? {
          _id: productId,
          variants: { $elemMatch: { _id: variantId, stock: holder.stock, reservedStock: holder.reservedStock || 0 } },
        }
      : { _id: productId, stock: product.stock, reservedStock: product.reservedStock || 0 };
    const update = variantId
      ? { $inc: { 'variants.$.reservedStock': quantity } }
      : { $inc: { reservedStock: quantity } };

    const result = await Product.updateOne(filter, update);
    if (result.modifiedCount === 1) return;
  }
  throw ApiError.conflict('Stock is changing rapidly for an item in your cart. Please try again.');
}

/**
 * Atomically changes on-hand stock by `delta` (negative for losses, positive for restocks/reversals).
 * A reduction may only consume unreserved stock, so pending orders are never left without birds or eggs.
 * Returns { product, holder, before, after } for audit logging.
 * `movement` ({ type, reference, note, user }) writes a stock-ledger line; omit it for silent rollbacks.
 */
async function changeStock({ productId, variantId, delta, movement }) {
  if (!Number.isInteger(delta) || delta === 0) throw ApiError.badRequest('Quantity must be a whole number');
  for (let attempt = 0; attempt < MAX_RETRIES; attempt += 1) {
    const product = await Product.findById(productId).populate('category', 'name slug');
    if (!product) throw ApiError.notFound('Product not found');
    const holder = findStockHolder(product, variantId);
    if (!holder) throw ApiError.notFound('Product option not found');

    const stock = holder.stock || 0;
    const reserved = holder.reservedStock || 0;
    if (delta < 0 && stock - reserved < -delta) {
      const label = variantId ? `${product.name} (${holder.label})` : product.name;
      throw ApiError.conflict(
        `${label} has only ${Math.max(stock - reserved, 0)} unreserved unit(s)` +
          (reserved ? ` (${reserved} are reserved by pending orders — cancel or adjust those orders first)` : '')
      );
    }

    const filter = variantId
      ? { _id: productId, variants: { $elemMatch: { _id: variantId, stock, reservedStock: reserved } } }
      : { _id: productId, stock, reservedStock: reserved };
    const update = variantId ? { $inc: { 'variants.$.stock': delta } } : { $inc: { stock: delta } };

    const result = await Product.updateOne(filter, update);
    if (result.modifiedCount === 1) {
      await refreshAggregates(productId);
      if (movement) {
        await ledger.record({ ...movement, product, holder: variantId ? holder : undefined, quantity: delta, balanceAfter: stock + delta });
      }
      return { product, holder, before: stock, after: stock + delta };
    }
  }
  throw ApiError.conflict('Stock changed while saving. Please try again.');
}

async function adjustLine({ productId, variantId, quantity }, mode) {
  // mode: release (reserved -> available), commit (reserved -> sold), restock (sold -> stock)
  const incs = {
    release: { reservedStock: -quantity },
    commit: { reservedStock: -quantity, stock: -quantity },
    restock: { stock: quantity },
  }[mode];
  const guard = mode === 'restock' ? {} : { reservedStock: { $gte: quantity } };

  const filter = variantId
    ? { _id: productId, variants: { $elemMatch: { _id: variantId, ...guard } } }
    : { _id: productId, ...guard };
  const update = { $inc: {} };
  Object.entries(incs).forEach(([field, value]) => {
    update.$inc[variantId ? `variants.$.${field}` : field] = value;
  });
  const result = await Product.updateOne(filter, update);
  if (result.matchedCount === 0) {
    console.warn(`Inventory ${mode} skipped for product ${productId} variant ${variantId || '-'}`);
    return false;
  }
  return true;
}

const toLines = (items) =>
  items.map((item) => ({ productId: item.product, variantId: item.variantId, quantity: item.quantity }));

async function refreshMany(lines) {
  const ids = [...new Set(lines.map((line) => String(line.productId)))];
  await Promise.all(ids.map(refreshAggregates));
}

async function reserveItems(items) {
  const lines = toLines(items);
  const reserved = [];
  try {
    for (const line of lines) {
      await reserveLine(line);
      reserved.push(line);
    }
  } catch (error) {
    await Promise.all(reserved.map((line) => adjustLine(line, 'release')));
    await refreshMany(reserved);
    throw error;
  }
  await refreshMany(lines);
}

const LEDGER_TYPE = { commit: 'ORDER_SALE', restock: 'ORDER_RESTOCK' };

async function applyToOrder(order, mode) {
  const lines = toLines(order.items);
  const movements = [];
  for (const [index, line] of lines.entries()) {
    const applied = await adjustLine(line, mode);
    // Only commit/restock change on-hand stock; releasing a reservation does not.
    if (applied && LEDGER_TYPE[mode]) {
      const item = order.items[index];
      movements.push({
        product: item.product,
        variantId: item.variantId,
        productName: item.name,
        variantLabel: item.variantLabel,
        categoryName: item.categoryName,
        type: LEDGER_TYPE[mode],
        quantity: mode === 'commit' ? -item.quantity : item.quantity,
        reference: order.orderNumber,
      });
    }
  }
  await refreshMany(lines);
  await ledger.record(movements);
}

// Moves an order's inventory to COMMITTED (stock physically leaves the farm).
async function commitOrder(order) {
  if (order.inventoryState !== 'RESERVED') return;
  await applyToOrder(order, 'commit');
  order.inventoryState = 'COMMITTED';
}

// Returns an order's inventory when it is cancelled.
async function releaseOrder(order) {
  if (order.inventoryState === 'RESERVED') await applyToOrder(order, 'release');
  else if (order.inventoryState === 'COMMITTED') await applyToOrder(order, 'restock');
  order.inventoryState = 'RELEASED';
}

module.exports = { reserveItems, commitOrder, releaseOrder, refreshAggregates, changeStock };
