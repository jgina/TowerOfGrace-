const mongoose = require('mongoose');

// Editable CMS sections. Each key stores a free-form document the admin UI understands.
const CONTENT_KEYS = [
  'settings',
  'home',
  'about',
  'farm',
  'quality',
  'production',
  'shop',
  'contact',
  'bulk',
  'footer',
  'announcement',
];

const contentSchema = new mongoose.Schema(
  {
    key: { type: String, enum: CONTENT_KEYS, required: true, unique: true },
    data: { type: mongoose.Schema.Types.Mixed, default: {} },
    updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true, minimize: false }
);

contentSchema.statics.KEYS = CONTENT_KEYS;

module.exports = mongoose.model('Content', contentSchema);
