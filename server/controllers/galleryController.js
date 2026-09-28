const { Gallery } = require('../models');
const ApiError = require('../utils/ApiError');
const asyncHandler = require('../utils/asyncHandler');
const pick = require('../utils/pick');
const { getPagination, buildMeta } = require('../utils/pagination');
const { deleteImage } = require('../services/uploadService');

const FIELDS = ['title', 'caption', 'category', 'image', 'isFeatured', 'sortOrder'];

exports.listGallery = asyncHandler(async (req, res) => {
  const { category, featured } = req.query;
  const { page, limit, skip } = getPagination(req.query, 24, 100);
  const filter = {};
  if (category) filter.category = category;
  if (featured === 'true') filter.isFeatured = true;
  const [items, total] = await Promise.all([
    Gallery.find(filter).sort({ isFeatured: -1, sortOrder: 1, createdAt: -1 }).skip(skip).limit(limit).lean(),
    Gallery.countDocuments(filter),
  ]);
  res.json({ success: true, items, categories: Gallery.CATEGORIES, meta: buildMeta(total, page, limit) });
});

exports.createGalleryItem = asyncHandler(async (req, res) => {
  if (!req.body.image?.url) throw ApiError.badRequest('Please upload an image');
  const item = await Gallery.create(pick(req.body, FIELDS));
  res.status(201).json({ success: true, item });
});

// Supports caption/category edits and image replacement (the old Cloudinary asset is removed).
exports.updateGalleryItem = asyncHandler(async (req, res) => {
  const item = await Gallery.findById(req.params.id);
  if (!item) throw ApiError.notFound('Gallery item not found');
  const data = pick(req.body, FIELDS);
  if (data.image && data.image.publicId !== item.image?.publicId) await deleteImage(item.image?.publicId);
  Object.assign(item, data);
  await item.save();
  res.json({ success: true, item });
});

exports.deleteGalleryItem = asyncHandler(async (req, res) => {
  const item = await Gallery.findById(req.params.id);
  if (!item) throw ApiError.notFound('Gallery item not found');
  await deleteImage(item.image?.publicId);
  await item.deleteOne();
  res.json({ success: true, message: 'Image deleted' });
});
