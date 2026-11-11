const bcrypt = require('bcryptjs');
const { AdminSecuritySetting, Product, FeedItem, MedicineItem, Category } = require('../models');
const ApiError = require('../utils/ApiError');
const asyncHandler = require('../utils/asyncHandler');
const { changeStock } = require('../services/inventoryService');
const { changeFeedStock } = require('../services/feedService');
const { changeMedicineStock } = require('../services/medicineService');

const RESET_KEY = 'stock-reset';
const RESET_NOTE = 'Stock reset by admin';

async function verifyPasskey(passkey) {
  const securitySetting = await AdminSecuritySetting.findOne({ key: RESET_KEY }).select('+passkeyHash');
  if (!securitySetting) throw ApiError.conflict('Set a stock reset pass key in Admin Settings first');
  if (!(await bcrypt.compare(passkey, securitySetting.passkeyHash))) {
    throw ApiError.forbidden('Incorrect stock reset pass key');
  }
}

exports.passkeyStatus = asyncHandler(async (req, res) => {
  const configured = await AdminSecuritySetting.exists({ key: RESET_KEY });
  res.json({ success: true, configured: Boolean(configured) });
});

exports.setPasskey = asyncHandler(async (req, res) => {
  const passkey = req.body.passkey;
  if (Buffer.byteLength(passkey, 'utf8') > 72) throw ApiError.badRequest('Pass key must be 72 bytes or fewer');

  const passkeyHash = await bcrypt.hash(passkey, 12);
  await AdminSecuritySetting.findOneAndUpdate(
    { key: RESET_KEY },
    { passkeyHash, changedBy: req.user._id },
    { upsert: true, runValidators: true }
  );
  res.json({ success: true, configured: true, message: 'Stock reset pass key saved' });
});

async function resetProductHolder(productId, variantId, user) {
  for (let attempt = 0; attempt < 5; attempt += 1) {
    const product = await Product.findById(productId).select('stock reservedStock variants');
    if (!product) return 0;
    const holder = variantId ? product.variants.id(variantId) : product;
    if (!holder) return 0;
    const available = (holder.stock || 0) - (holder.reservedStock || 0);
    if (available <= 0) return 0;

    try {
      await changeStock({
        productId,
        variantId,
        delta: -available,
        movement: { type: 'ADJUSTMENT', note: RESET_NOTE, user },
      });
      return available;
    } catch (error) {
      if (error.statusCode !== 409 || attempt === 4) throw error;
    }
  }
  return 0;
}

async function resetProducts(filter, user) {
  const products = await Product.find(filter).select('_id variants._id');
  const totals = { products: 0, productUnits: 0 };
  for (const product of products) {
    const holders = [null, ...product.variants.map((variant) => variant._id)];
    for (const variantId of holders) {
      const removed = await resetProductHolder(product._id, variantId, user);
      if (removed > 0) {
        totals.products += 1;
        totals.productUnits += removed;
      }
    }
  }
  return totals;
}

exports.resetCategoryStock = asyncHandler(async (req, res) => {
  await verifyPasskey(req.body.passkey);
  const category = await Category.findById(req.params.categoryId).select('name');
  if (!category) throw ApiError.notFound('Category not found');

  const totals = await resetProducts({ category: category._id }, req.user);
  res.json({ success: true, message: `${category.name} stock reset`, category: { _id: category._id, name: category.name }, totals });
});

exports.resetStock = asyncHandler(async (req, res) => {
  await verifyPasskey(req.body.passkey);

  const totals = {
    ...(await resetProducts({}, req.user)),
    feeds: 0,
    feedBags: 0,
    medicines: 0,
    medicineUnits: 0,
  };

  const feeds = await FeedItem.find({ stockBags: { $gt: 0 } }).select('_id stockBags');
  for (const feed of feeds) {
    const updated = await changeFeedStock(feed._id, -feed.stockBags, {
      type: 'ADJUSTMENT', date: new Date(), note: RESET_NOTE, byName: req.user.name,
    });
    totals.feeds += 1;
    totals.feedBags += feed.stockBags - updated.stockBags;
  }

  const medicines = await MedicineItem.find({ stockUnits: { $gt: 0 } }).select('_id stockUnits');
  for (const medicine of medicines) {
    const updated = await changeMedicineStock(medicine._id, -medicine.stockUnits, {
      type: 'ADJUSTMENT', date: new Date(), note: RESET_NOTE, byName: req.user.name,
    });
    totals.medicines += 1;
    totals.medicineUnits += medicine.stockUnits - updated.stockUnits;
  }

  res.json({ success: true, message: 'Available stock reset to zero', totals });
});