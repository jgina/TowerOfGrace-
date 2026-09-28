const config = require('../config');
const ApiError = require('../utils/ApiError');
const asyncHandler = require('../utils/asyncHandler');
const { uploadBuffer, deleteImage, isCloudinaryConfigured } = require('../services/uploadService');

exports.uploadStatus = (req, res) => res.json({ success: true, configured: isCloudinaryConfigured });

exports.uploadImages = asyncHandler(async (req, res) => {
  const files = req.files || [];
  if (!files.length) throw ApiError.badRequest('Please choose at least one image');
  const folder = req.query.folder || req.body.folder;
  const images = await Promise.all(files.map((file) => uploadBuffer(file.buffer, folder)));
  res.status(201).json({ success: true, images });
});

// Discards an uploaded image that was never saved to a record (e.g. a cancelled form).
exports.deleteUpload = asyncHandler(async (req, res) => {
  const { publicId } = req.body;
  if (!publicId || !String(publicId).startsWith(`${config.cloudinary.folder}/`)) {
    throw ApiError.badRequest('Invalid image reference');
  }
  await deleteImage(publicId);
  res.json({ success: true });
});
