const mongoose = require('mongoose');

const BUSINESS_TYPES = ['Hotel', 'Restaurant', 'Retailer', 'Distributor', 'Supermarket', 'Caterer', 'Other Business'];
const BULK_STATUSES = ['NEW', 'CONTACTED', 'QUOTED', 'CONFIRMED', 'CLOSED'];

const bulkOrderSchema = new mongoose.Schema(
  {
    businessName: { type: String, required: true, trim: true, maxlength: 150 },
    businessType: { type: String, enum: BUSINESS_TYPES, default: 'Other Business' },
    contactPerson: { type: String, required: true, trim: true, maxlength: 120 },
    phone: { type: String, required: true, trim: true, maxlength: 30 },
    email: { type: String, required: true, lowercase: true, trim: true },
    product: { type: String, required: true, trim: true, maxlength: 150 },
    quantity: { type: String, required: true, trim: true, maxlength: 100 },
    preferredWeight: { type: String, trim: true, maxlength: 100 },
    deliveryLocation: { type: String, required: true, trim: true, maxlength: 300 },
    message: { type: String, trim: true, maxlength: 3000 },
    status: { type: String, enum: BULK_STATUSES, default: 'NEW' },
    adminNotes: { type: String, trim: true, maxlength: 3000 },
  },
  { timestamps: true }
);

bulkOrderSchema.statics.BUSINESS_TYPES = BUSINESS_TYPES;
bulkOrderSchema.statics.STATUSES = BULK_STATUSES;

module.exports = mongoose.model('BulkOrder', bulkOrderSchema);
