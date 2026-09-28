const mongoose = require('mongoose');
const { imageSchema } = require('./shared');

const certificationSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true, maxlength: 200 },
    issuingOrganisation: { type: String, required: true, trim: true, maxlength: 200 },
    certificateNumber: { type: String, trim: true, maxlength: 100 },
    issueDate: Date,
    expiryDate: Date,
    image: imageSchema,
    status: { type: String, enum: ['ACTIVE', 'PENDING', 'EXPIRED', 'REVOKED'], default: 'ACTIVE' },
    isPublic: { type: Boolean, default: true },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Certification', certificationSchema);
