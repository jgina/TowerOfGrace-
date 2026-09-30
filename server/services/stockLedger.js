const { StockMovement } = require('../models');

/**
 * Writes stock movement lines. Never throws: the ledger is an audit trail and must not block
 * the stock change itself. Each entry: { product, holder?, type, quantity, reference?, note?, user? }
 * where `product` is a Product document (category may be populated) and `holder` a variant (or omitted).
 */
async function record(entries) {
  const rows = (Array.isArray(entries) ? entries : [entries])
    .filter((e) => e && e.quantity)
    .map((e) => ({
      product: e.product._id || e.product,
      variantId: e.holder?._id && e.holder !== e.product ? e.holder._id : e.variantId,
      productName: e.productName || e.product.name,
      variantLabel: e.variantLabel || (e.holder && e.holder !== e.product ? e.holder.label : undefined),
      categoryName: e.categoryName || e.product.category?.name,
      categorySlug: e.categorySlug || e.product.category?.slug,
      type: e.type,
      quantity: e.quantity,
      balanceAfter: e.balanceAfter,
      reference: e.reference,
      note: e.note ? String(e.note).slice(0, 300) : undefined,
      by: e.user?._id,
      byName: e.user?.name,
      at: e.at || new Date(),
    }));
  if (!rows.length) return;
  try {
    await StockMovement.insertMany(rows, { ordered: false });
  } catch (error) {
    console.warn(`Stock ledger write failed: ${error.message}`);
  }
}

/**
 * Logs the stock differences between a product before and after an admin edit
 * (new options → OPENING, changed counts → ADJUSTMENT, removed options → ADJUSTMENT to zero).
 * `before` is a plain snapshot { stock, variants: [{ _id, label, stock }] } or null for a new product.
 */
function diffEntries(before, product, user, note) {
  const entries = [];
  const base = { product, categorySlug: product.category?.slug, categoryName: product.category?.name, user };
  const isNew = !before;
  const hadVariants = Boolean(before?.hasVariants);
  const hasVariants = product.variants.length > 0;

  // Single stock figure (products without weight/pack options).
  const prevSingle = isNew || hadVariants ? 0 : before.stock || 0;
  const nextSingle = hasVariants ? 0 : product.stock || 0;
  if (nextSingle !== prevSingle) {
    const switched = !isNew && hadVariants !== hasVariants;
    entries.push({
      ...base,
      type: isNew || (switched && !hasVariants) ? 'OPENING' : 'ADJUSTMENT',
      quantity: nextSingle - prevSingle,
      balanceAfter: nextSingle,
      note: switched && hasVariants ? 'Replaced by weight/pack options' : note,
    });
  }

  // Each weight/pack option.
  const oldById = new Map((hadVariants ? before.variants : []).map((v) => [String(v._id), v]));
  product.variants.forEach((v) => {
    const old = oldById.get(String(v._id));
    oldById.delete(String(v._id));
    const delta = (v.stock || 0) - (old?.stock || 0);
    if (delta) entries.push({ ...base, holder: v, type: old ? 'ADJUSTMENT' : 'OPENING', quantity: delta, balanceAfter: v.stock, note });
  });
  oldById.forEach((v) => {
    if (v.stock) {
      entries.push({ ...base, variantId: v._id, variantLabel: v.label, type: 'ADJUSTMENT', quantity: -v.stock, balanceAfter: 0, note: 'Option removed' });
    }
  });
  return entries;
}

const snapshot = (product) => ({
  stock: product.stock || 0,
  hasVariants: product.variants.length > 0,
  variants: product.variants.map((v) => ({ _id: v._id, label: v.label, stock: v.stock || 0 })),
});

module.exports = { record, diffEntries, snapshot };
