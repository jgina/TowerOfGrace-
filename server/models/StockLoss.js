const mongoose = require('mongoose');

// Why stock left the farm without being sold. Birds and eggs share one list; the admin UI groups them.
const LOSS_REASONS = [
  'MORTALITY', // birds that died
  'DISEASE', // died or culled because of illness
  'CULLED', // removed deliberately (injury, poor growth)
  'PREDATOR', // killed by predators or pests
  'BROKEN', // cracked or broken eggs
  'SPOILED', // spoiled, rotten or expired
  'MISSING', // theft or unaccounted for
  'OTHER',
];

/*
  Audit record for livestock deaths and product losses.
  Each record deducts from on-hand stock when created; reversing it restores the stock.
  Records are never deleted, so the history stays complete.
*/
const stockLossSchema = new mongoose.Schema(
  {
    product: { type: mongoose.Schema.Types.ObjectId, ref: 'Product', required: true },
    variantId: { type: mongoose.Schema.Types.ObjectId },
    // Snapshots, so history stays readable if the product is renamed or deleted.
    productName: { type: String, required: true },
    variantLabel: String,
    categoryName: String,
    categorySlug: String,
    quantity: { type: Number, required: true, min: 1 },
    reason: { type: String, enum: LOSS_REASONS, required: true },
    occurredOn: { type: Date, required: true },
    notes: { type: String, trim: true, maxlength: 1000 },
    stockBefore: Number,
    stockAfter: Number,
    // Set when the loss happened during a market trip. Stock was already deducted when the trip left,
    // so these records do not change stock and can only be corrected through the trip itself.
    marketTrip: { type: mongoose.Schema.Types.ObjectId, ref: 'MarketTrip' },
    tripNumber: String,
    recordedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    recordedByName: String,
    reversedAt: Date,
    reversedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    reversedByName: String,
    reversalNote: { type: String, trim: true, maxlength: 500 },
  },
  { timestamps: true }
);

stockLossSchema.index({ occurredOn: -1 });
stockLossSchema.index({ product: 1, occurredOn: -1 });

stockLossSchema.statics.REASONS = LOSS_REASONS;

module.exports = mongoose.model('StockLoss', stockLossSchema);
