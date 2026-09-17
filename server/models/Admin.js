const mongoose = require('mongoose');

const adminSchema = new mongoose.Schema({
  id: { type: String, trim: true },
  studentId: { type: String, trim: true, default: '' },
  roll: { type: String, trim: true, default: '' },
  name: { type: String, required: true, trim: true },
  email: { type: String, required: true, trim: true, lowercase: true, index: true },
  phone: { type: String, trim: true, default: '' },
  role: { type: String, trim: true, default: 'Administrator' },
  isAdmin: { type: Boolean, default: true },
  isSuperAdmin: { type: Boolean, default: false },
  status: { type: String, trim: true, default: 'Active' },
  approvedBy: { type: String, trim: true, default: '' },
  addedAt: { type: String, default: () => new Date().toISOString() },
  password: { type: String, default: '' },
  passwordUpdatedAt: { type: String, default: () => new Date().toISOString() }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

module.exports = mongoose.model('Admin', adminSchema);
