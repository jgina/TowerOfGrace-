const mongoose = require('mongoose');

/*
  A market trip moves birds/eggs off the farm to sell at a market.

  Lifecycle and stock effect:
    OUT        → created: every item's quantity is deducted from stock immediately (it has physically left).
    CLOSED     → reconciled: for each item, sold + returned + lost must equal the quantity taken out.
                 Returned units go back into stock; lost units are logged as StockLoss (no second deduction).
    CANCELLED  → trip called off before selling: everything goes back into stock.
*/
const TRIP_STATUSES = ['OUT', 'CLOSED', 'CANCELLED'];

const tripItemSchema = new mongoose.Schema({
  product: { type: mongoose.Schema.Types.ObjectId, ref: 'Product', required: true },
  variantId: { type: mongoose.Schema.Types.ObjectId },
  // Snapshots keep the trip readable even if the product is later renamed or deleted.
  productName: { type: String, required: true },
  variantLabel: String,
  categoryName: String,
  categorySlug: String,
  quantityOut: { type: Number, required: true, min: 1 },
  // Filled in when the trip is closed.
  quantitySold: { type: Number, min: 0, default: 0 },
  quantityReturned: { type: Number, min: 0, default: 0 },
  quantityLost: { type: Number, min: 0, default: 0 },
  lossReason: String,
  salesAmount: { type: Number, min: 0, default: 0 },
});

const marketTripSchema = new mongoose.Schema(
  {
    tripNumber: { type: String, required: true, unique: true },
    market: { type: String, required: true, trim: true, maxlength: 150 },
    tripDate: { type: Date, required: true },
    responsiblePerson: { type: String, trim: true, maxlength: 120 },
    vehicle: { type: String, trim: true, maxlength: 80 },
    notes: { type: String, trim: true, maxlength: 1000 },
    items: {
      type: [tripItemSchema],
      validate: [(items) => items.length > 0, 'A market trip needs at least one item'],
    },
    status: { type: String, enum: TRIP_STATUSES, default: 'OUT', index: true },

    dispatchedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    dispatchedByName: String,
    closedAt: Date,
    closedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    closedByName: String,
    closingNotes: { type: String, trim: true, maxlength: 1000 },
    cancelledAt: Date,
    cancelledByName: String,
    cancelReason: { type: String, trim: true, maxlength: 500 },
  },
  { timestamps: true }
);

marketTripSchema.index({ tripDate: -1 });

marketTripSchema.virtual('totals').get(function totals() {
  return (this.items || []).reduce(
    (t, i) => ({
      out: t.out + i.quantityOut,
      sold: t.sold + (i.quantitySold || 0),
      returned: t.returned + (i.quantityReturned || 0),
      lost: t.lost + (i.quantityLost || 0),
      salesAmount: t.salesAmount + (i.salesAmount || 0),
    }),
    { out: 0, sold: 0, returned: 0, lost: 0, salesAmount: 0 }
  );
});

marketTripSchema.set('toJSON', { virtuals: true, versionKey: false });
marketTripSchema.statics.STATUSES = TRIP_STATUSES;

module.exports = mongoose.model('MarketTrip', marketTripSchema);
