const mongoose = require('mongoose');
const { imageSchema } = require('./shared');

const categorySchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true, maxlength: 80 },
    slug: { type: String, required: true, unique: true, lowercase: true, trim: true },
    description: { type: String, trim: true, maxlength: 1000 },
    image: imageSchema,
    // Drives how the admin form labels options: weight bands vs packaging sizes.
    variantType: { type: String, enum: ['weight', 'packaging'], default: 'weight' },
    sortOrder: { type: Number, default: 0 },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Category', categorySchema);
