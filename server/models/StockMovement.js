const mongoose = require('mongoose');

/*
  Stock ledger: one row for every change to on-hand stock, like lines on a bank statement.
  `quantity` is signed (+ in, − out). Used to build opening/closing balances for statements.
*/
const MOVEMENT_TYPES = [
  'OPENING', // stock entered when a product or option is first created
  'ADJUSTMENT', // manual correction / restock by an admin
  'ORDER_SALE', // stock leaving for a paid or completed online order
  'ORDER_RESTOCK', // a sold order was cancelled and its stock came back
  'LOSS', // deaths, broken eggs, spoilage (Mortality & Losses)
  'LOSS_REVERSAL', // a mistaken loss entry was reversed
  'MARKET_OUT', // taken to market
  'MARKET_RETURN', // brought back from market (or trip cancelled)
  'BATCH_TRANSFER', // grown birds from a flock batch confirmed ready and moved into stock
];

const stockMovementSchema = new mongoose.Schema(
  {
    product: { type: mongoose.Schema.Types.ObjectId, ref: 'Product', required: true },
    variantId: { type: mongoose.Schema.Types.ObjectId },
    productName: { type: String, required: true },
    variantLabel: String,
    categoryName: String,
    categorySlug: String,
    type: { type: String, enum: MOVEMENT_TYPES, required: true },
    quantity: { type: Number, required: true },
    balanceAfter: Number,
    reference: String, // order number, trip number, etc.
    note: { type: String, maxlength: 300 },
    by: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    byName: String,
    at: { type: Date, default: Date.now },
  },
  { timestamps: false }
);

stockMovementSchema.index({ at: 1 });
stockMovementSchema.index({ product: 1, variantId: 1, at: 1 });

stockMovementSchema.statics.TYPES = MOVEMENT_TYPES;

module.exports = mongoose.model('StockMovement', stockMovementSchema);
