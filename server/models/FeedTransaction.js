const mongoose = require('mongoose');

// Feed store ledger: every bag in or out. `quantityBags` is signed (+ in, − out).
const FEED_TX_TYPES = ['OPENING', 'PURCHASE', 'USAGE', 'ADJUSTMENT'];
// Who the feed went to: every bird on the farm, one flock batch (growing or ready for sale),
// birds already in the main stock (a product), or a named pen / group.
const FED_TO = ['FARM', 'BATCH', 'STOCK', 'GROUP'];

const feedTransactionSchema = new mongoose.Schema(
  {
    feed: { type: mongoose.Schema.Types.ObjectId, ref: 'FeedItem', required: true, index: true },
    feedName: { type: String, required: true },
    type: { type: String, enum: FEED_TX_TYPES, required: true },
    quantityBags: { type: Number, required: true },
    balanceAfter: Number,
    date: { type: Date, required: true, index: true },
    // Purchases
    supplier: { type: String, trim: true, maxlength: 150 },
    costPerBag: { type: Number, min: 0 },
    totalCost: { type: Number, min: 0 },
    // Usage: who was fed
    fedTo: { type: String, enum: FED_TO },
    batch: { type: mongoose.Schema.Types.ObjectId, ref: 'FlockBatch', index: true },
    batchCode: String,
    product: { type: mongoose.Schema.Types.ObjectId, ref: 'Product', index: true },
    productName: String,
    groupName: { type: String, trim: true, maxlength: 120 },
    note: { type: String, trim: true, maxlength: 500 },
    byName: String,
  },
  { timestamps: true }
);

feedTransactionSchema.statics.TYPES = FEED_TX_TYPES;
feedTransactionSchema.statics.FED_TO = FED_TO;

module.exports = mongoose.model('FeedTransaction', feedTransactionSchema);
