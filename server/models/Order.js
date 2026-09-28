const mongoose = require('mongoose');

const ORDER_STATUSES = ['PENDING', 'CONFIRMED', 'PROCESSING', 'READY', 'OUT_FOR_DELIVERY', 'COMPLETED', 'CANCELLED'];
const PAYMENT_STATUSES = ['PENDING', 'PAID', 'FAILED', 'REFUNDED'];
const PAYMENT_METHODS = ['PAYSTACK', 'FLUTTERWAVE', 'BANK_TRANSFER', 'PAY_ON_DELIVERY'];
const PROOF_STATUSES = ['PENDING', 'ACCEPTED', 'REJECTED'];

const orderItemSchema = new mongoose.Schema(
  {
    product: { type: mongoose.Schema.Types.ObjectId, ref: 'Product', required: true },
    variantId: { type: mongoose.Schema.Types.ObjectId },
    name: { type: String, required: true },
    sku: String,
    image: String,
    categoryName: String,
    variantLabel: String,
    unitPrice: { type: Number, required: true, min: 0 },
    quantity: { type: Number, required: true, min: 1 },
    lineTotal: { type: Number, required: true, min: 0 },
  },
  { _id: false }
);

const orderSchema = new mongoose.Schema(
  {
    orderNumber: { type: String, required: true, unique: true },
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    customer: {
      fullName: { type: String, required: true, trim: true },
      email: { type: String, required: true, lowercase: true, trim: true },
      phone: { type: String, required: true, trim: true },
    },
    items: {
      type: [orderItemSchema],
      validate: [(items) => items.length > 0, 'An order must contain at least one item'],
    },
    subtotal: { type: Number, required: true, min: 0 },
    deliveryFee: { type: Number, required: true, min: 0, default: 0 },
    total: { type: Number, required: true, min: 0 },
    deliveryAddress: {
      address: { type: String, trim: true },
      city: { type: String, trim: true },
      state: { type: String, trim: true },
    },
    deliveryMethod: { type: String, required: true },
    deliveryMethodLabel: String,
    preferredDeliveryDate: Date,
    paymentMethod: { type: String, enum: PAYMENT_METHODS, required: true },
    paymentStatus: { type: String, enum: PAYMENT_STATUSES, default: 'PENDING' },
    paymentReference: { type: String, index: true },
    paymentGatewayResponse: { type: mongoose.Schema.Types.Mixed, select: false },
    paidAt: Date,
    // Bank-transfer notices from the customer, newest last: a RECEIPT has a file; a NOTICE is "I have paid" without one.
    // An admin accepts or rejects each.
    paymentProofs: [
      {
        kind: { type: String, enum: ['RECEIPT', 'NOTICE'], default: 'RECEIPT' },
        url: String,
        senderName: { type: String, trim: true, maxlength: 120 },
        amount: { type: Number, min: 0 },
        transferDate: Date,
        publicId: String,
        fileName: String,
        mimeType: String,
        note: { type: String, trim: true, maxlength: 500 },
        status: { type: String, enum: PROOF_STATUSES, default: 'PENDING' },
        reviewNote: { type: String, trim: true, maxlength: 500 },
        reviewedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
        reviewedAt: Date,
        uploadedAt: { type: Date, default: Date.now },
      },
    ],
    // True while the latest receipt is waiting for an admin to check the bank account.
    awaitingPaymentReview: { type: Boolean, default: false, index: true },
    orderStatus: { type: String, enum: ORDER_STATUSES, default: 'PENDING' },
    statusHistory: [
      {
        status: String,
        note: String,
        changedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
        at: { type: Date, default: Date.now },
      },
    ],
    notes: { type: String, trim: true, maxlength: 1000 },
    internalNotes: [
      {
        note: { type: String, required: true, trim: true, maxlength: 2000 },
        author: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
        authorName: String,
        at: { type: Date, default: Date.now },
      },
    ],
    // RESERVED: held for this order; COMMITTED: deducted from stock; RELEASED: returned to stock.
    inventoryState: { type: String, enum: ['RESERVED', 'COMMITTED', 'RELEASED'], default: 'RESERVED' },
  },
  { timestamps: true }
);

orderSchema.index({ createdAt: -1 });
orderSchema.index({ 'customer.email': 1 });
orderSchema.index({ orderStatus: 1, paymentStatus: 1 });

orderSchema.statics.ORDER_STATUSES = ORDER_STATUSES;
orderSchema.statics.PAYMENT_STATUSES = PAYMENT_STATUSES;
orderSchema.statics.PAYMENT_METHODS = PAYMENT_METHODS;

orderSchema.set('toJSON', { versionKey: false });

module.exports = mongoose.model('Order', orderSchema);
