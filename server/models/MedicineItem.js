const mongoose = require('mongoose');

/*
  A medicine, vaccine or other animal-health product kept in the farm store (e.g. "Gumboro vaccine,
  1000-dose vial" or "Amoxicillin 20%, 100 g sachet"). Stock is counted in the item's own unit and may
  include part-units (e.g. 2.5 bottles). Every change is a MedicineTransaction.
  - Low stock: admins are alerted once when stock falls to the alert level (lowAlertSentAt); restocking
    above the level re-arms the alert.
  - Expiry: the earliest expiry date of the stock on hand. Admins are alerted once when it is near
    (expiryAlertSentAt), again when it has expired, then weekly while expired stock is still in the
    store (expiredAlertSentAt = last expired alert). A new expiry date re-arms both.
  - Withdrawal: days birds must wait after the last dose before they are sold or slaughtered.
*/
const MEDICINE_CATEGORIES = ['VACCINE', 'ANTIBIOTIC', 'ANTICOCCIDIAL', 'DEWORMER', 'VITAMIN', 'ANTISTRESS', 'DISINFECTANT', 'OTHER'];
const MEDICINE_UNITS = ['BOTTLE', 'SACHET', 'VIAL', 'PACK', 'TABLET', 'ML', 'LITRE', 'GRAM', 'KG', 'DOSE'];

const medicineItemSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true, maxlength: 100 },
    brand: { type: String, trim: true, maxlength: 80 },
    category: { type: String, enum: MEDICINE_CATEGORIES, default: 'OTHER' },
    unit: { type: String, enum: MEDICINE_UNITS, default: 'BOTTLE' },
    // What one unit holds, e.g. "100 g", "1000 doses", "500 ml".
    unitSize: { type: String, trim: true, maxlength: 60 },
    activeIngredient: { type: String, trim: true, maxlength: 150 },
    stockUnits: { type: Number, min: 0, default: 0 },
    lowStockUnits: { type: Number, min: 0, default: 2 },
    lastCostPerUnit: { type: Number, min: 0 },
    withdrawalDays: { type: Number, min: 0, max: 365, default: 0 },
    expiryDate: Date,
    storage: { type: String, trim: true, maxlength: 150 }, // e.g. "Refrigerate 2–8 °C"
    notes: { type: String, trim: true, maxlength: 500 },
    isActive: { type: Boolean, default: true },
    lowAlertSentAt: Date,
    expiryAlertSentAt: Date,
    expiredAlertSentAt: Date,
  },
  { timestamps: true }
);

medicineItemSchema.index({ name: 1, brand: 1 }, { unique: true, collation: { locale: 'en', strength: 2 } });

medicineItemSchema.virtual('isLow').get(function isLow() {
  return this.stockUnits <= this.lowStockUnits;
});

medicineItemSchema.set('toJSON', { virtuals: true, versionKey: false });
medicineItemSchema.statics.CATEGORIES = MEDICINE_CATEGORIES;
medicineItemSchema.statics.UNITS = MEDICINE_UNITS;

module.exports = mongoose.model('MedicineItem', medicineItemSchema);
