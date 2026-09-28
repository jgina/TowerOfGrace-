const mongoose = require('mongoose');
const { imageSchema } = require('./shared');

const GALLERY_CATEGORIES = [
  'Farm',
  'Broilers',
  'Noilers',
  'Eggs',
  'Turkeys',
  'Facilities',
  'Production',
  'Team',
  'Packaging',
  'Deliveries',
];

const gallerySchema = new mongoose.Schema(
  {
    title: { type: String, trim: true, maxlength: 150 },
    caption: { type: String, trim: true, maxlength: 500 },
    category: { type: String, enum: GALLERY_CATEGORIES, required: true },
    image: { type: imageSchema, required: true },
    isFeatured: { type: Boolean, default: false },
    sortOrder: { type: Number, default: 0 },
  },
  { timestamps: true }
);

gallerySchema.statics.CATEGORIES = GALLERY_CATEGORIES;

module.exports = mongoose.model('Gallery', gallerySchema);
