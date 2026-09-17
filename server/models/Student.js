const mongoose = require('mongoose');

const studentSchema = new mongoose.Schema({
  id: { type: String, trim: true },
  roll: { type: String, required: true, trim: true, index: true },
  reg: { type: String, trim: true, default: '' },
  name: { type: String, required: true, trim: true },
  email: { type: String, required: true, trim: true, lowercase: true, index: true },
  phone: { type: String, trim: true, default: '' },
  bloodGroup: { type: String, trim: true, default: 'B+' },
  district: { type: String, trim: true, default: 'Rajshahi' },
  role: { type: String, trim: true, default: 'Member' },
  isAdmin: { type: Boolean, default: false },
  isSuperAdmin: { type: Boolean, default: false },
  avatar: { type: String, trim: true, default: '' },
  skills: [{ type: String, trim: true }],
  bio: { type: String, trim: true, default: '' },
  facebook: { type: String, trim: true, default: '' },
  instagram: { type: String, trim: true, default: '' },
  threads: { type: String, trim: true, default: '' },
  youtube: { type: String, trim: true, default: '' },
  linkedin: { type: String, trim: true, default: '' },
  github: { type: String, trim: true, default: '' },
  portfolio: { type: String, trim: true, default: '' },
  status: { type: String, trim: true, default: 'Active' },
  creditsCompleted: { type: Number, default: 0 },
  cgpa: { type: Number, default: 0.0 },
  password: { type: String, default: '' },
  passwordUpdatedAt: { type: String, default: () => new Date().toISOString() },
  passwordResetVia: { type: String, default: '' },
  roleUpdatedAt: { type: String, default: '' },
  fatherName: { type: String, trim: true, default: '' },
  motherName: { type: String, trim: true, default: '' },
  dobOriginal: { type: String, trim: true, default: '' },
  dobCertificate: { type: String, trim: true, default: '' }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

module.exports = mongoose.model('Student', studentSchema);
