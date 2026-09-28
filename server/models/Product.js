const mongoose = require('mongoose');
const { imageSchema } = require('./shared');

const WEIGHT_UNITS = ['kg', 'g', 'lb'];

const variantSchema = new mongoose.Schema({
  label: { type: String, required: true, trim: true, maxlength: 80 },
  sku: { type: String, trim: true, uppercase: true, maxlength: 60 },
  type: { type: String, enum: ['weight', 'packaging'], default: 'weight' },
  minWeight: { type: Number, min: 0 },
  maxWeight: { type: Number, min: 0 },
  weightUnit: { type: String, enum: WEIGHT_UNITS, default: 'kg' },
  unitsPerPack: { type: Number, min: 1 },
  price: { type: Number, required: true, min: 0 },
  salePrice: { type: Number, min: 0 },
  stock: { type: Number, default: 0, min: 0 },
  reservedStock: { type: Number, default: 0, min: 0 },
  isActive: { type: Boolean, default: true },
});

const productSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true, maxlength: 150 },
    slug: { type: String, required: true, unique: true, lowercase: true, trim: true },
    sku: { type: String, trim: true, uppercase: true, maxlength: 60 },
    category: { type: mongoose.Schema.Types.ObjectId, ref: 'Category', required: true },
    shortDescription: { type: String, trim: true, maxlength: 300 },
    description: { type: String, trim: true, maxlength: 10000 },
    images: [imageSchema],

    // Base pricing/stock is used when a product has no active variants.
    price: { type: Number, min: 0, default: 0 },
    salePrice: { type: Number, min: 0 },
    stock: { type: Number, min: 0, default: 0 },
    reservedStock: { type: Number, min: 0, default: 0 },
    lowStockThreshold: { type: Number, min: 0, default: 10 },

    weight: { type: Number, min: 0 },
    minWeight: { type: Number, min: 0 },
    maxWeight: { type: Number, min: 0 },
    weightUnit: { type: String, enum: WEIGHT_UNITS, default: 'kg' },

    variants: [variantSchema],
    packaging: { type: String, trim: true, maxlength: 1000 },
    storageInfo: { type: String, trim: true, maxlength: 2000 },
    productionInfo: { type: String, trim: true, maxlength: 3000 },
    recommendedUse: { type: String, trim: true, maxlength: 2000 },

    availability: { type: String, enum: ['available', 'pre_order', 'unavailable'], default: 'available' },
    isSoldOut: { type: Boolean, default: false },
    isFeatured: { type: Boolean, default: false },
    isActive: { type: Boolean, default: true },

    seo: {
      metaTitle: { type: String, trim: true, maxlength: 70 },
      metaDescription: { type: String, trim: true, maxlength: 170 },
    },

    // Denormalised values kept in sync by recalculate() for fast filtering and sorting.
    priceFrom: { type: Number, default: 0, index: true },
    priceTo: { type: Number, default: 0 },
    availableStock: { type: Number, default: 0 },
    weightFrom: Number,
    weightTo: Number,
  },
  { timestamps: true }
);

productSchema.index({ name: 'text', shortDescription: 'text', description: 'text' });
productSchema.index({ category: 1, isActive: 1 });
productSchema.index({ sku: 1 }, { unique: true, partialFilterExpression: { sku: { $type: 'string' } } });

function effectivePrice(item) {
  const hasSale = typeof item.salePrice === 'number' && item.salePrice > 0 && item.salePrice < item.price;
  return hasSale ? item.salePrice : item.price;
}

productSchema.methods.activeVariants = function activeVariants() {
  return (this.variants || []).filter((variant) => variant.isActive);
};

productSchema.methods.recalculate = function recalculate() {
  const variants = this.activeVariants();
  const priced = variants.length ? variants : [this];
  const prices = priced.map(effectivePrice).filter((value) => typeof value === 'number');
  this.priceFrom = prices.length ? Math.min(...prices) : 0;
  this.priceTo = prices.length ? Math.max(...prices) : 0;

  this.availableStock = variants.length
    ? variants.reduce((sum, v) => sum + Math.max((v.stock || 0) - (v.reservedStock || 0), 0), 0)
    : Math.max((this.stock || 0) - (this.reservedStock || 0), 0);

  const weights = variants.length
    ? variants.flatMap((v) => [v.minWeight, v.maxWeight]).filter((w) => typeof w === 'number')
    : [this.minWeight, this.maxWeight, this.weight].filter((w) => typeof w === 'number');
  this.weightFrom = weights.length ? Math.min(...weights) : undefined;
  this.weightTo = weights.length ? Math.max(...weights) : undefined;
};

// A 400-status error the central error handler reports as-is.
const invalid = (message) => Object.assign(new Error(message), { statusCode: 400 });

productSchema.pre('validate', function validateRanges() {
  const bad = (this.variants || []).find(
    (v) => typeof v.minWeight === 'number' && typeof v.maxWeight === 'number' && v.minWeight > v.maxWeight
  );
  if (bad) throw invalid(`Option "${bad.label}" has a minimum weight above its maximum weight`);
  if (typeof this.minWeight === 'number' && typeof this.maxWeight === 'number' && this.minWeight > this.maxWeight) {
    throw invalid('Minimum weight cannot be greater than maximum weight');
  }
  const overReserved = (this.variants || []).some((v) => (v.reservedStock || 0) > (v.stock || 0));
  if (overReserved || (this.reservedStock || 0) > (this.stock || 0)) {
    throw invalid('Stock cannot be lower than the quantity reserved by pending orders');
  }
});

productSchema.pre('save', function syncAggregates() {
  this.recalculate();
});

productSchema.statics.effectivePrice = effectivePrice;
productSchema.statics.WEIGHT_UNITS = WEIGHT_UNITS;

productSchema.set('toJSON', { versionKey: false });

module.exports = mongoose.model('Product', productSchema);
