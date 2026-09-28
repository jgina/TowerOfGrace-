const mongoose = require('mongoose');

// Cloudinary-backed image reference reused across models.
const imageSchema = new mongoose.Schema(
  {
    url: { type: String, required: true, trim: true },
    publicId: { type: String, trim: true },
    alt: { type: String, trim: true, maxlength: 200 },
  },
  { _id: false }
);

module.exports = { imageSchema };
