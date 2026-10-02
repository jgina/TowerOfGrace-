const mongoose = require('mongoose');

/*
  A meat processing run: live birds go in, prepared meat comes out.

  Birds come either from a flock batch that is ready for sale, or from live-bird stock in the shop.
  The prepared meat produced (whole dressed birds, cuts, roasted…) is added to "Prepared Meat"
  products. Both sides are written to the stock ledger (PROCESSING_OUT / PROCESSING_IN), so statements
  show exactly how many birds were processed and how much meat they became.

  Cancelling a run puts everything back: the meat leaves stock and the birds return to their source.
*/
const STORAGE = ['CHILLED', 'FROZEN', 'READY_TO_EAT'];
const RUN_STATUSES = ['COMPLETED', 'CANCELLED'];

// Default shelf life (days) used to suggest a use-by date.
const SHELF_LIFE_DAYS = { CHILLED: 3, FROZEN: 90, READY_TO_EAT: 1 };

const outputSchema = new mongoose.Schema(
  {
    product: { type: mongoose.Schema.Types.ObjectId, ref: 'Product', required: true },
    variantId: mongoose.Schema.Types.ObjectId,
    productName: { type: String, required: true },
    variantLabel: String,
    quantity: { type: Number, required: true, min: 1 }, // units added to stock (birds, packs, pieces)
    weightKg: { type: Number, min: 0 },
  },
  { _id: true }
);

const processingRunSchema = new mongoose.Schema(
  {
    runNumber: { type: String, required: true, unique: true },
    processedOn: { type: Date, required: true, index: true },

    // Where the live birds came from.
    sourceType: { type: String, enum: ['BATCH', 'STOCK'], required: true },
    batch: { type: mongoose.Schema.Types.ObjectId, ref: 'FlockBatch', index: true },
    batchCode: String,
    sourceProduct: { type: mongoose.Schema.Types.ObjectId, ref: 'Product' },
    sourceVariantId: mongoose.Schema.Types.ObjectId,
    sourceName: String, // batch code or "Product (option)" snapshot
    sourceCategory: String,

    birdsIn: { type: Number, required: true, min: 1 },
    condemned: { type: Number, default: 0, min: 0 }, // rejected as unfit during processing
    liveWeightKg: { type: Number, min: 0 },
    dressedWeightKg: { type: Number, min: 0 },
    processingCost: { type: Number, min: 0 },

    outputs: { type: [outputSchema], validate: [(v) => v.length > 0, 'Add at least one product produced'] },

    storage: { type: String, enum: STORAGE, default: 'CHILLED' },
    useBy: { type: Date, index: true },
    expiryNotifiedAt: Date,

    status: { type: String, enum: RUN_STATUSES, default: 'COMPLETED', index: true },
    cancelledAt: Date,
    cancelReason: { type: String, trim: true, maxlength: 500 },
    cancelledByName: String,

    notes: { type: String, trim: true, maxlength: 1000 },
    byName: String,
  },
  { timestamps: true }
);

processingRunSchema.methods.figures = function figures() {
  const unitsOut = this.outputs.reduce((s, o) => s + o.quantity, 0);
  const outputKg = this.outputs.reduce((s, o) => s + (o.weightKg || 0), 0);
  const dressedKg = this.dressedWeightKg || outputKg || null;
  const usable = this.birdsIn - (this.condemned || 0);
  return {
    unitsOut,
    usableBirds: usable,
    dressedKg: dressedKg ? Math.round(dressedKg * 100) / 100 : null,
    // Dressing yield: dressed weight as a share of live weight.
    yieldPct: this.liveWeightKg && dressedKg ? Math.round((dressedKg / this.liveWeightKg) * 1000) / 10 : null,
    avgDressedKg: dressedKg && usable > 0 ? Math.round((dressedKg / usable) * 100) / 100 : null,
    condemnedPct: this.birdsIn ? Math.round(((this.condemned || 0) / this.birdsIn) * 1000) / 10 : 0,
  };
};

processingRunSchema.set('toJSON', {
  versionKey: false,
  transform: (doc, ret) => ({ ...ret, ...doc.figures() }),
});

processingRunSchema.statics.STORAGE = STORAGE;
processingRunSchema.statics.SHELF_LIFE_DAYS = SHELF_LIFE_DAYS;

module.exports = mongoose.model('ProcessingRun', processingRunSchema);
