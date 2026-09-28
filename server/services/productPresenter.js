const { Product } = require('../models');

const available = (holder) => Math.max((holder.stock || 0) - (holder.reservedStock || 0), 0);

function stockStatus(product, availableQty) {
  if (!product.isActive || product.availability === 'unavailable') return 'unavailable';
  if (product.isSoldOut) return 'sold_out';
  if (availableQty <= 0) return 'out_of_stock';
  if (product.availability === 'pre_order') return 'pre_order';
  if (availableQty <= (product.lowStockThreshold ?? 10)) return 'low_stock';
  return 'in_stock';
}

function formatWeight(min, max, unit = 'kg') {
  const hasMin = typeof min === 'number';
  const hasMax = typeof max === 'number';
  if (hasMin && hasMax) return min === max ? `${min} ${unit}` : `${min}–${max} ${unit}`;
  if (hasMin) return `${min} ${unit}+`;
  if (hasMax) return `Up to ${max} ${unit}`;
  return '';
}

// Shapes a product for storefront consumers: hides reservation internals and exposes purchasability.
function toPublicProduct(doc) {
  const product = doc.toObject ? doc.toObject() : doc;
  const variants = (product.variants || [])
    .filter((v) => v.isActive)
    .map((v) => {
      const qty = available(v);
      return {
        _id: v._id,
        label: v.label,
        sku: v.sku,
        type: v.type,
        minWeight: v.minWeight,
        maxWeight: v.maxWeight,
        weightUnit: v.weightUnit,
        weightLabel: formatWeight(v.minWeight, v.maxWeight, v.weightUnit),
        unitsPerPack: v.unitsPerPack,
        price: v.price,
        salePrice: v.salePrice,
        effectivePrice: Product.effectivePrice(v),
        availableStock: qty,
        inStock: qty > 0,
      };
    });
  const totalAvailable = variants.length ? variants.reduce((s, v) => s + v.availableStock, 0) : available(product);
  const status = stockStatus(product, totalAvailable);
  const { reservedStock, stock, ...rest } = product;

  return {
    ...rest,
    variants,
    effectivePrice: Product.effectivePrice(product),
    availableStock: totalAvailable,
    weightLabel: formatWeight(product.minWeight ?? product.weight, product.maxWeight, product.weightUnit),
    stockStatus: status,
    purchasable: ['in_stock', 'low_stock', 'pre_order'].includes(status),
  };
}

module.exports = { toPublicProduct, stockStatus, formatWeight, available };
