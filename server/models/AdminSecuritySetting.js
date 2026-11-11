const mongoose = require('mongoose');

const adminSecuritySettingSchema = new mongoose.Schema(
  {
    key: { type: String, enum: ['stock-reset'], required: true, unique: true },
    passkeyHash: { type: String, required: true, select: false },
    changedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true }
);

module.exports = mongoose.model('AdminSecuritySetting', adminSecuritySettingSchema);