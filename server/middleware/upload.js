const multer = require('multer');
const ApiError = require('../utils/ApiError');

const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/avif', 'image/gif'];

// Files stay in memory and are streamed straight to Cloudinary.
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024, files: 10 },
  fileFilter: (req, file, cb) => {
    if (ALLOWED_TYPES.includes(file.mimetype)) return cb(null, true);
    return cb(ApiError.badRequest('Only JPG, PNG, WEBP, AVIF or GIF images are allowed'));
  },
});

// Payment receipts from customers: a single photo or PDF.
const RECEIPT_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'application/pdf'];
const receiptUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024, files: 1 },
  fileFilter: (req, file, cb) => {
    if (RECEIPT_TYPES.includes(file.mimetype)) return cb(null, true);
    return cb(ApiError.badRequest('Upload the receipt as a JPG, PNG, WEBP image or a PDF'));
  },
});

// Checks the file's real signature so a renamed file cannot pass as an image or PDF.
function hasValidSignature(file) {
  const b = file?.buffer;
  if (!b || b.length < 12) return false;
  const hex = b.subarray(0, 12).toString('hex');
  if (file.mimetype === 'application/pdf') return b.subarray(0, 5).toString() === '%PDF-';
  if (file.mimetype === 'image/png') return hex.startsWith('89504e47');
  if (file.mimetype === 'image/jpeg') return hex.startsWith('ffd8ff');
  if (file.mimetype === 'image/webp') return b.subarray(0, 4).toString() === 'RIFF' && b.subarray(8, 12).toString() === 'WEBP';
  return false;
}

module.exports = upload;
module.exports.receiptUpload = receiptUpload;
module.exports.hasValidSignature = hasValidSignature;
