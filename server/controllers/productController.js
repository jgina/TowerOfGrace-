const mongoose = require('mongoose');
const { Product, Category, Order } = require('../models');
const ApiError = require('../utils/ApiError');
const asyncHandler = require('../utils/asyncHandler');
const slugify = require('../utils/slugify');
const escapeRegex = require('../utils/escapeRegex');
const pick = require('../utils/pick');
const { getPagination, buildMeta } = require('../utils/pagination');
const { deleteImages } = require('../services/uploadService');
const { toPublicProduct, stockStatus } = require('../services/productPresenter');

const SORTS = {
  newest: { createdAt: -1 },
  price_asc: { priceFrom: 1, createdAt: -1 },
  price_desc: { priceFrom: -1, createdAt: -1 },
  name_asc: { name: 1 },
  featured: { isFeatured: -1, createdAt: -1 },
};

const PRODUCT_FIELDS = [
  'name', 'sku', 'category', 'shortDescription', 'description', 'images',
  'price', 'salePrice', 'stock', 'lowStockThreshold',
  'weight', 'minWeight', 'maxWeight', 'weightUnit',
  'packaging', 'storageInfo', 'productionInfo', 'recommendedUse',
  'availability', 'isSoldOut', 'isFeatured', 'isActive', 'seo',
];
const VARIANT_FIELDS = ['label', 'sku', 'type', 'minWeight', 'maxWeight', 'weightUnit', 'unitsPerPack', 'price', 'salePrice', 'stock', 'isActive'];
const NUMERIC_FIELDS = ['price', 'salePrice', 'stock', 'lowStockThreshold', 'weight', 'minWeight', 'maxWeight', 'unitsPerPack'];

// Empty strings from forms become "unset" instead of 0 so optional numbers stay optional.
// Blank SKUs are unset too, otherwise the unique SKU index would treat '' as a duplicate.
function normaliseNumbers(obj) {
  NUMERIC_FIELDS.forEach((field) => {
    if (obj[field] === '' || obj[field] === null) obj[field] = undefined;
    else if (obj[field] !== undefined) obj[field] = Number(obj[field]);
  });
  if (obj.sku !== undefined && !String(obj.sku).trim()) obj.sku = undefined;
  return obj;
}

async function resolveCategoryFilter(value) {
  if (!value) return null;
  const values = String(value).split(',').filter(Boolean);
  const ids = values.filter((v) => mongoose.isValidObjectId(v));
  const slugs = values.filter((v) => !mongoose.isValidObjectId(v));
  const categories = await Category.find({ $or: [{ _id: { $in: ids } }, { slug: { $in: slugs } }] }).select('_id');
  return categories.map((c) => c._id);
}

async function uniqueSlug(base, excludeId) {
  const root = slugify(base) || 'product';
  let slug = root;
  let n = 2;
  // eslint-disable-next-line no-await-in-loop
  while (await Product.exists({ slug, ...(excludeId ? { _id: { $ne: excludeId } } : {}) })) {
    slug = `${root}-${n}`;
    n += 1;
  }
  return slug;
}

// ---------- Storefront ----------

exports.listProducts = asyncHandler(async (req, res) => {
  const { q, category, minPrice, maxPrice, minWeight, maxWeight, inStock, featured, sort } = req.query;
  const { page, limit, skip } = getPagination(req.query, 12, 48);
  const filter = { isActive: true };

  if (q) {
    const rx = new RegExp(escapeRegex(String(q).slice(0, 80)), 'i');
    filter.$or = [{ name: rx }, { shortDescription: rx }, { sku: rx }];
  }
  const categoryIds = await resolveCategoryFilter(category);
  if (categoryIds) filter.category = { $in: categoryIds };
  if (minPrice || maxPrice) {
    filter.priceFrom = {};
    if (minPrice) filter.priceFrom.$gte = Number(minPrice);
    if (maxPrice) filter.priceFrom.$lte = Number(maxPrice);
  }
  // Weight filters match products whose weight range overlaps the requested range.
  if (minWeight) filter.weightTo = { $gte: Number(minWeight) };
  if (maxWeight) filter.weightFrom = { $lte: Number(maxWeight) };
  if (inStock === 'true') {
    filter.availableStock = { $gt: 0 };
    filter.isSoldOut = false;
    filter.availability = { $ne: 'unavailable' };
  }
  if (featured === 'true') filter.isFeatured = true;

  const [items, total] = await Promise.all([
    Product.find(filter)
      .sort(SORTS[sort] || SORTS.featured)
      .skip(skip)
      .limit(limit)
      .populate('category', 'name slug variantType')
      .lean(),
    Product.countDocuments(filter),
  ]);

  res.json({ success: true, products: items.map(toPublicProduct), meta: buildMeta(total, page, limit) });
});

exports.getFilterOptions = asyncHandler(async (req, res) => {
  const [ranges] = await Product.aggregate([
    { $match: { isActive: true } },
    {
      $group: {
        _id: null,
        minPrice: { $min: '$priceFrom' },
        maxPrice: { $max: '$priceTo' },
        minWeight: { $min: '$weightFrom' },
        maxWeight: { $max: '$weightTo' },
      },
    },
  ]);
  const categories = await Category.find({ isActive: true }).sort({ sortOrder: 1, name: 1 }).select('name slug').lean();
  res.json({ success: true, ranges: ranges || {}, categories });
});

exports.getProductBySlug = asyncHandler(async (req, res) => {
  const product = await Product.findOne({ slug: req.params.slug, isActive: true })
    .populate('category', 'name slug variantType')
    .lean();
  if (!product) throw ApiError.notFound('Product not found');

  const related = await Product.find({ category: product.category?._id, isActive: true, _id: { $ne: product._id } })
    .sort({ isFeatured: -1, createdAt: -1 })
    .limit(4)
    .populate('category', 'name slug')
    .lean();

  res.json({ success: true, product: toPublicProduct(product), related: related.map(toPublicProduct) });
});

// ---------- Admin ----------

exports.adminListProducts = asyncHandler(async (req, res) => {
  const { q, category, status } = req.query;
  const { page, limit, skip } = getPagination(req.query, 20, 100);
  const filter = {};
  if (q) {
    const rx = new RegExp(escapeRegex(String(q).slice(0, 80)), 'i');
    filter.$or = [{ name: rx }, { sku: rx }, { 'variants.sku': rx }];
  }
  const categoryIds = await resolveCategoryFilter(category);
  if (categoryIds) filter.category = { $in: categoryIds };
  if (status === 'active') filter.isActive = true;
  if (status === 'inactive') filter.isActive = false;
  if (status === 'featured') filter.isFeatured = true;
  if (status === 'sold_out') filter.isSoldOut = true;
  if (status === 'out_of_stock') filter.availableStock = { $lte: 0 };
  if (status === 'low_stock') filter.$expr = { $and: [{ $gt: ['$availableStock', 0] }, { $lte: ['$availableStock', '$lowStockThreshold'] }] };

  const [items, total] = await Promise.all([
    Product.find(filter).sort({ updatedAt: -1 }).skip(skip).limit(limit).populate('category', 'name slug').lean(),
    Product.countDocuments(filter),
  ]);
  res.json({
    success: true,
    products: items.map((p) => ({ ...p, stockStatus: stockStatus(p, p.availableStock) })),
    meta: buildMeta(total, page, limit),
  });
});

exports.adminGetProduct = asyncHandler(async (req, res) => {
  const product = await Product.findById(req.params.id).populate('category', 'name slug variantType');
  if (!product) throw ApiError.notFound('Product not found');
  res.json({ success: true, product });
});

function buildVariants(input = [], existing = []) {
  if (!Array.isArray(input)) throw ApiError.badRequest('Options must be a list');
  const existingById = new Map(existing.map((v) => [String(v._id), v]));
  const keptIds = new Set();

  const variants = input.map((raw) => {
    const data = normaliseNumbers(pick(raw, VARIANT_FIELDS));
    const current = raw._id ? existingById.get(String(raw._id)) : null;
    if (current) {
      keptIds.add(String(current._id));
      return { ...data, _id: current._id, reservedStock: current.reservedStock || 0 };
    }
    return { ...data, reservedStock: 0 };
  });

  const removedWithReservations = existing.filter((v) => !keptIds.has(String(v._id)) && (v.reservedStock || 0) > 0);
  if (removedWithReservations.length) {
    throw ApiError.conflict(
      `Option "${removedWithReservations[0].label}" is reserved by pending orders. Disable it instead of removing it.`
    );
  }
  return variants;
}

async function assertCategory(categoryId) {
  if (!mongoose.isValidObjectId(categoryId) || !(await Category.exists({ _id: categoryId }))) {
    throw ApiError.badRequest('Please choose a valid category');
  }
}

exports.createProduct = asyncHandler(async (req, res) => {
  const data = normaliseNumbers(pick(req.body, PRODUCT_FIELDS));
  await assertCategory(data.category);
  data.slug = await uniqueSlug(req.body.slug || data.name);
  data.variants = buildVariants(req.body.variants || []);
  const product = await Product.create(data);
  res.status(201).json({ success: true, product });
});

exports.updateProduct = asyncHandler(async (req, res) => {
  const product = await Product.findById(req.params.id);
  if (!product) throw ApiError.notFound('Product not found');
  const data = normaliseNumbers(pick(req.body, PRODUCT_FIELDS));
  if (data.category) await assertCategory(data.category);

  if (req.body.variants !== undefined) {
    product.variants = buildVariants(req.body.variants, product.variants);
  }
  if (Array.isArray(data.images)) {
    const keep = new Set(data.images.map((img) => img.publicId).filter(Boolean));
    await deleteImages(product.images.filter((img) => img.publicId && !keep.has(img.publicId)));
  }
  if (req.body.slug && slugify(req.body.slug) !== product.slug) {
    product.slug = await uniqueSlug(req.body.slug, product._id);
  }
  Object.assign(product, data);
  await product.save();
  res.json({ success: true, product });
});

// Quick toggles used from the product table (enable/disable, featured, sold out).
exports.patchProductFlags = asyncHandler(async (req, res) => {
  const flags = pick(req.body, ['isActive', 'isFeatured', 'isSoldOut', 'availability']);
  if (!Object.keys(flags).length) throw ApiError.badRequest('Nothing to update');
  const product = await Product.findById(req.params.id);
  if (!product) throw ApiError.notFound('Product not found');
  Object.assign(product, flags);
  await product.save();
  res.json({ success: true, product });
});

exports.deleteProduct = asyncHandler(async (req, res) => {
  const product = await Product.findById(req.params.id);
  if (!product) throw ApiError.notFound('Product not found');
  const reserved = (product.reservedStock || 0) + product.variants.reduce((s, v) => s + (v.reservedStock || 0), 0);
  if (reserved > 0) {
    throw ApiError.conflict('This product is reserved by pending orders. Disable it instead, or resolve those orders first.');
  }
  const hasOrders = await Order.exists({ 'items.product': product._id });
  await deleteImages(product.images);
  await product.deleteOne();
  res.json({
    success: true,
    message: hasOrders ? 'Product deleted. Past orders keep their own copy of the product details.' : 'Product deleted',
  });
});
