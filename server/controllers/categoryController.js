const { Category, Product } = require('../models');
const ApiError = require('../utils/ApiError');
const asyncHandler = require('../utils/asyncHandler');
const slugify = require('../utils/slugify');
const pick = require('../utils/pick');
const { deleteImage } = require('../services/uploadService');

const FIELDS = ['name', 'description', 'image', 'variantType', 'sortOrder', 'isActive'];

exports.listCategories = asyncHandler(async (req, res) => {
  const includeInactive = req.query.all === 'true' && req.user?.role === 'admin';
  const filter = includeInactive ? {} : { isActive: true };
  const categories = await Category.find(filter).sort({ sortOrder: 1, name: 1 }).lean();

  const counts = await Product.aggregate([
    { $match: { isActive: true } },
    { $group: { _id: '$category', count: { $sum: 1 } } },
  ]);
  const countMap = Object.fromEntries(counts.map((c) => [String(c._id), c.count]));
  res.json({
    success: true,
    categories: categories.map((c) => ({ ...c, productCount: countMap[String(c._id)] || 0 })),
  });
});

exports.getCategory = asyncHandler(async (req, res) => {
  const category = await Category.findOne({ slug: req.params.slug, isActive: true }).lean();
  if (!category) throw ApiError.notFound('Category not found');
  res.json({ success: true, category });
});

exports.createCategory = asyncHandler(async (req, res) => {
  const data = pick(req.body, FIELDS);
  data.slug = slugify(req.body.slug || data.name);
  const category = await Category.create(data);
  res.status(201).json({ success: true, category });
});

exports.updateCategory = asyncHandler(async (req, res) => {
  const category = await Category.findById(req.params.id);
  if (!category) throw ApiError.notFound('Category not found');
  const data = pick(req.body, FIELDS);
  if (data.image && category.image?.publicId && data.image.publicId !== category.image.publicId) {
    await deleteImage(category.image.publicId);
  }
  Object.assign(category, data);
  if (req.body.slug) category.slug = slugify(req.body.slug);
  await category.save();
  res.json({ success: true, category });
});

exports.deleteCategory = asyncHandler(async (req, res) => {
  const category = await Category.findById(req.params.id);
  if (!category) throw ApiError.notFound('Category not found');
  const inUse = await Product.countDocuments({ category: category._id });
  if (inUse) throw ApiError.conflict(`This category has ${inUse} product(s). Move or delete them first, or disable the category.`);
  await deleteImage(category.image?.publicId);
  await category.deleteOne();
  res.json({ success: true, message: 'Category deleted' });
});
