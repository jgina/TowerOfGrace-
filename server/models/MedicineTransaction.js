const mongoose = require('mongoose');

// Medicine store ledger: every unit in or out. `quantity` is signed (+ in, − out).
// DISPOSAL is stock thrown away (expired, damaged, spoiled), kept apart from stock-count corrections.
const MEDICINE_TX_TYPES = ['OPENING', 'PURCHASE', 'USAGE', 'ADJUSTMENT', 'DISPOSAL'];
// Who was treated: every bird on the farm, one flock batch, birds already in the main stock, or a named pen.
const GIVEN_TO = ['FARM', 'BATCH', 'STOCK', 'GROUP'];
const PURPOSES = ['VACCINATION', 'TREATMENT', 'PREVENTION', 'SUPPLEMENT', 'DEWORMING', 'DISINFECTION', 'OTHER'];
const ROUTES = ['DRINKING_WATER', 'FEED', 'INJECTION', 'EYE_DROP', 'NASAL', 'SPRAY', 'WING_WEB', 'ORAL', 'TOPICAL', 'OTHER'];
const DISPOSAL_REASONS = ['EXPIRED', 'DAMAGED', 'SPOILED', 'OTHER'];

const medicineTransactionSchema = new mongoose.Schema(
  {
    medicine: { type: mongoose.Schema.Types.ObjectId, ref: 'MedicineItem', required: true, index: true },
    medicineName: { type: String, required: true },
    unit: String,
    type: { type: String, enum: MEDICINE_TX_TYPES, required: true },
    quantity: { type: Number, required: true },
    balanceAfter: Number,
    date: { type: Date, required: true, index: true },
    // Purchases
    supplier: { type: String, trim: true, maxlength: 150 },
    costPerUnit: { type: Number, min: 0 },
    totalCost: { type: Number, min: 0 },
    lotNumber: { type: String, trim: true, maxlength: 60 },
    expiryDate: Date,
    // Usage: one treatment can use several medicines; its lines share a treatmentId.
    treatmentId: { type: String, index: true },
    givenTo: { type: String, enum: GIVEN_TO },
    batch: { type: mongoose.Schema.Types.ObjectId, ref: 'FlockBatch', index: true },
    batchCode: String,
    product: { type: mongoose.Schema.Types.ObjectId, ref: 'Product', index: true },
    productName: String,
    groupName: { type: String, trim: true, maxlength: 120 },
    purpose: { type: String, enum: PURPOSES },
    condition: { type: String, trim: true, maxlength: 150 }, // disease or reason, e.g. "Gumboro", "CRD"
    route: { type: String, enum: ROUTES },
    dosage: { type: String, trim: true, maxlength: 150 }, // e.g. "1 g per 2 L water"
    birdsTreated: { type: Number, min: 0 },
    durationDays: { type: Number, min: 1, max: 60 },
    withdrawalDays: { type: Number, min: 0, max: 365 },
    // First day the birds may be sold or slaughtered again (last dose day + withdrawal days).
    withdrawalUntil: Date,
    administeredBy: { type: String, trim: true, maxlength: 120 },
    // Disposal
    disposalReason: { type: String, enum: DISPOSAL_REASONS },
    note: { type: String, trim: true, maxlength: 500 },
    byName: String,
  },
  { timestamps: true }
);

medicineTransactionSchema.index({ type: 1, withdrawalUntil: 1 });

medicineTransactionSchema.statics.TYPES = MEDICINE_TX_TYPES;
medicineTransactionSchema.statics.GIVEN_TO = GIVEN_TO;
medicineTransactionSchema.statics.PURPOSES = PURPOSES;
medicineTransactionSchema.statics.ROUTES = ROUTES;
medicineTransactionSchema.statics.DISPOSAL_REASONS = DISPOSAL_REASONS;

module.exports = mongoose.model('MedicineTransaction', medicineTransactionSchema);
