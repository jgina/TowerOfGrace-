const mongoose = require('mongoose');

/*
  A flock batch: one delivery of chicks/birds, tracked from the day it arrives until it is sold into stock.

  Growing birds are NOT shop stock. Deaths inside a batch change only the batch's live count.
  Stock changes only when the admin confirms the batch (or part of it) is ready and moves birds into
  a product/option — that move is written to the stock ledger as BATCH_TRANSFER.

  Age and stage are always computed from the arrival date, so the batch moves through
  Brooding → Growing → Finishing → Ready on its own, day by day.
*/
const BATCH_STATUSES = ['ACTIVE', 'READY', 'COMPLETED', 'CLOSED'];
const DAY_MS = 24 * 60 * 60 * 1000;

const mortalitySchema = new mongoose.Schema({
  date: { type: Date, required: true },
  quantity: { type: Number, required: true, min: 1 },
  reason: { type: String, required: true },
  note: { type: String, trim: true, maxlength: 500 },
  byName: String,
  recordedAt: { type: Date, default: Date.now },
});

const weighingSchema = new mongoose.Schema({
  date: { type: Date, required: true },
  avgWeightKg: { type: Number, required: true, min: 0 },
  sampleSize: { type: Number, min: 1 },
  note: { type: String, trim: true, maxlength: 500 },
  byName: String,
});

const transferSchema = new mongoose.Schema({
  date: { type: Date, default: Date.now },
  product: { type: mongoose.Schema.Types.ObjectId, ref: 'Product', required: true },
  variantId: mongoose.Schema.Types.ObjectId,
  productName: String,
  variantLabel: String,
  quantity: { type: Number, required: true, min: 1 },
  note: { type: String, trim: true, maxlength: 500 },
  byName: String,
});

// Birds taken straight from the batch into a meat processing run.
const processedSchema = new mongoose.Schema({
  date: { type: Date, default: Date.now },
  run: { type: mongoose.Schema.Types.ObjectId, ref: 'ProcessingRun', required: true },
  runNumber: String,
  quantity: { type: Number, required: true, min: 1 },
  byName: String,
});

const flockBatchSchema = new mongoose.Schema(
  {
    batchCode: { type: String, required: true, unique: true, uppercase: true, trim: true, maxlength: 40 },
    category: { type: mongoose.Schema.Types.ObjectId, ref: 'Category', required: true },
    categoryName: String,
    categorySlug: String,
    breed: { type: String, trim: true, maxlength: 80 },
    supplier: { type: String, trim: true, maxlength: 150 },
    house: { type: String, trim: true, maxlength: 80 }, // pen / house / section
    purchaseDate: { type: Date, required: true },
    ageAtPurchaseDays: { type: Number, min: 1, default: 1 }, // 1 = day-old chicks
    quantityPurchased: { type: Number, required: true, min: 1 },
    unitCost: { type: Number, min: 0 },
    targetAgeDays: { type: Number, required: true, min: 1 },
    targetWeightKg: { type: Number, min: 0 },
    notes: { type: String, trim: true, maxlength: 1000 },

    mortality: [mortalitySchema],
    weighings: [weighingSchema],
    transfers: [transferSchema],
    processedRuns: [processedSchema],

    status: { type: String, enum: BATCH_STATUSES, default: 'ACTIVE', index: true },
    readyAt: Date,
    readyNotifiedAt: Date,
    completedAt: Date,
    closedAt: Date,
    closeReason: { type: String, trim: true, maxlength: 500 },
    createdByName: String,
  },
  // Every save checks the version, so two admins can never move the same birds into stock twice.
  { timestamps: true, optimisticConcurrency: true }
);

// ---------- Derived figures (always current) ----------

flockBatchSchema.methods.ageDays = function ageDays(at = new Date()) {
  const start = new Date(this.purchaseDate);
  start.setHours(0, 0, 0, 0);
  const day = new Date(at);
  day.setHours(0, 0, 0, 0);
  return (this.ageAtPurchaseDays || 1) + Math.max(Math.floor((day - start) / DAY_MS), 0);
};

flockBatchSchema.methods.counts = function counts() {
  const deaths = (this.mortality || []).reduce((s, m) => s + m.quantity, 0);
  const transferred = (this.transfers || []).reduce((s, t) => s + t.quantity, 0);
  const processed = (this.processedRuns || []).reduce((s, p) => s + p.quantity, 0);
  return { deaths, transferred, processed, live: this.quantityPurchased - deaths - transferred - processed };
};

// Stage follows the batch's age against its own target age.
flockBatchSchema.methods.stage = function stage(at = new Date()) {
  if (this.status === 'COMPLETED') return 'IN_STOCK';
  if (this.status === 'CLOSED') return 'CLOSED';
  const age = this.ageDays(at);
  const target = this.targetAgeDays;
  if (age >= target) return 'READY';
  if (age <= Math.min(21, Math.round(target * 0.3))) return 'BROODING';
  if (age < Math.round(target * 0.75)) return 'GROWING';
  return 'FINISHING';
};

flockBatchSchema.methods.summary = function summary() {
  const { deaths, transferred, processed, live } = this.counts();
  const age = this.ageDays();
  const lastWeighing = [...(this.weighings || [])].sort((a, b) => new Date(b.date) - new Date(a.date))[0];
  return {
    ageDays: age,
    ageWeeks: Math.floor(age / 7),
    stage: this.stage(),
    daysToReady: Math.max(this.targetAgeDays - age, 0),
    progress: Math.min(Math.round((age / this.targetAgeDays) * 100), 100),
    readyDate: new Date(new Date(this.purchaseDate).getTime() + (this.targetAgeDays - (this.ageAtPurchaseDays || 1)) * DAY_MS),
    deaths,
    transferred,
    processed,
    live,
    mortalityRate: this.quantityPurchased ? Math.round((deaths / this.quantityPurchased) * 1000) / 10 : 0,
    latestWeightKg: lastWeighing?.avgWeightKg ?? null,
    totalCost: this.unitCost ? Math.round(this.unitCost * this.quantityPurchased * 100) / 100 : null,
  };
};

flockBatchSchema.set('toJSON', {
  versionKey: false,
  transform: (doc, ret) => ({ ...ret, ...doc.summary() }),
});

flockBatchSchema.statics.STATUSES = BATCH_STATUSES;

module.exports = mongoose.model('FlockBatch', flockBatchSchema);
