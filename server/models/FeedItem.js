const mongoose = require('mongoose');

/*
  A feed kept in the farm store (e.g. "Broiler Starter, 25 kg bags").
  Stock is counted in bags and may include part-bags (e.g. 12.5). Every change is a FeedTransaction.
  When stock falls to the low-stock level, admins are alerted once (lowAlertSentAt); restocking above
  the level re-arms the alert.
*/
const FEED_TYPES = ['STARTER', 'GROWER', 'FINISHER', 'LAYER', 'CONCENTRATE', 'SUPPLEMENT', 'OTHER'];

const feedItemSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true, maxlength: 100 },
    brand: { type: String, trim: true, maxlength: 80 },
    feedType: { type: String, enum: FEED_TYPES, default: 'OTHER' },
    bagSizeKg: { type: Number, min: 0.1, default: 25 },
    stockBags: { type: Number, min: 0, default: 0 },
    lowStockBags: { type: Number, min: 0, default: 10 },
    lastCostPerBag: { type: Number, min: 0 },
    notes: { type: String, trim: true, maxlength: 500 },
    isActive: { type: Boolean, default: true },
    lowAlertSentAt: Date,
  },
  { timestamps: true }
);

feedItemSchema.index({ name: 1, brand: 1 }, { unique: true, collation: { locale: 'en', strength: 2 } });

feedItemSchema.virtual('isLow').get(function isLow() {
  return this.stockBags <= this.lowStockBags;
});

feedItemSchema.set('toJSON', { virtuals: true, versionKey: false });
feedItemSchema.statics.TYPES = FEED_TYPES;

module.exports = mongoose.model('FeedItem', feedItemSchema);
