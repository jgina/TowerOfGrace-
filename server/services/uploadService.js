const { cloudinary, isCloudinaryConfigured } = require('../config/cloudinary');
const config = require('../config');
const ApiError = require('../utils/ApiError');

const FOLDERS = ['products', 'gallery', 'content', 'certifications', 'categories', 'brand'];

function assertConfigured() {
  if (!isCloudinaryConfigured) {
    throw ApiError.unavailable(
      'Image uploads are not configured. Set CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY and CLOUDINARY_API_SECRET.'
    );
  }
}

function uploadBuffer(buffer, folder = 'content') {
  assertConfigured();
  const target = FOLDERS.includes(folder) ? folder : 'content';
  return new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      {
        folder: `${config.cloudinary.folder}/${target}`,
        resource_type: 'image',
        transformation: [{ quality: 'auto', fetch_format: 'auto' }],
      },
      (error, result) => {
        if (error) return reject(ApiError.badRequest(`Image upload failed: ${error.message}`));
        return resolve({ url: result.secure_url, publicId: result.public_id, width: result.width, height: result.height });
      }
    );
    stream.end(buffer);
  });
}

/**
 * Stores a customer's payment receipt. Photos are kept as images; PDFs are stored as raw files
 * (new Cloudinary accounts block delivery of PDFs uploaded as images).
 */
function uploadReceipt(file, orderNumber) {
  assertConfigured();
  const isPdf = file.mimetype === 'application/pdf';
  const stamp = `${orderNumber}-${Date.now()}`;
  return new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      {
        folder: `${config.cloudinary.folder}/receipts`,
        resource_type: isPdf ? 'raw' : 'image',
        public_id: isPdf ? `${stamp}.pdf` : stamp,
      },
      (error, result) => {
        if (error) return reject(ApiError.badRequest(`Receipt upload failed: ${error.message}`));
        return resolve({ url: result.secure_url, publicId: result.public_id, resourceType: result.resource_type });
      }
    );
    stream.end(file.buffer);
  });
}

async function deleteImage(publicId, resourceType = 'image') {
  if (!publicId || !isCloudinaryConfigured) return;
  try {
    await cloudinary.uploader.destroy(publicId, { resource_type: resourceType });
  } catch (error) {
    // A failed remote delete should never block removing the record itself.
    console.warn(`Cloudinary delete failed for ${publicId}: ${error.message}`);
  }
}

async function deleteImages(images = []) {
  await Promise.all(images.filter(Boolean).map((image) => deleteImage(image.publicId)));
}

module.exports = { uploadBuffer, uploadReceipt, deleteImage, deleteImages, FOLDERS, isCloudinaryConfigured };
