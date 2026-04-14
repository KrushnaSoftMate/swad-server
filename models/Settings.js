// backend/models/Settings.js
const mongoose = require('mongoose');

const SettingsSchema = new mongoose.Schema({
  key: { type: String, default: 'global', unique: true },
  bizName: { type: String, default: 'Swad Tiffins' },
  fullRate: { type: Number, default: 60 },
  halfRate: { type: Number, default: 30 },
  ownerPhone: { type: String, default: '' },
  darkMode: { type: Boolean, default: false },
}, { timestamps: true });

module.exports = mongoose.model('Settings', SettingsSchema);
