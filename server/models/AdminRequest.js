const mongoose = require('mongoose');

const adminRequestSchema = new mongoose.Schema({
  id: { type: String, trim: true, index: true },
  studentId: { type: String, trim: true, default: '' },
  roll: { type: String, trim: true, default: '' },
  name: { type: String, required: true, trim: true },
  email: { type: String, required: true, trim: true, lowercase: true },
  nominatedBy: { type: String, trim: true, default: 'Admin' },
  note: { type: String, trim: true, default: '' },
  status: { type: String, trim: true, default: 'Pending Super Admin Approval' },
  createdAt: { type: String, default: () => new Date().toISOString() },
  approvedAt: { type: String, default: '' },
  approvedBy: { type: String, default: '' },
  rejectedAt: { type: String, default: '' },
  rejectedBy: { type: String, default: '' },
  rejectionReason: { type: String, default: '' }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

module.exports = mongoose.model('AdminRequest', adminRequestSchema);
