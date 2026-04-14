// backend/models/Customer.js
const mongoose = require('mongoose');

const TiffinDateSchema = new mongoose.Schema({
  date: { type: Number, required: true },
  paid: { type: Boolean, default: false },
}, { _id: false });

const PaymentHistorySchema = new mongoose.Schema({
  amount: { type: Number, required: true },
  paidAt: { type: Date, default: Date.now },
  note: { type: String, default: '' },
});

const CustomerSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true },
  type: {
    type: String,
    enum: ['Full Tiffin', 'Half Tiffin', 'Daily', 'Custom', 'Full', 'Half'],
    default: 'Full Tiffin',
  },
  rate: { type: Number, required: true, default: 60 },
  phone: { type: String, default: '' },
  floor: { type: String, default: '' },
  note: { type: String, default: '' },
  rawStr: { type: String, default: '' },
  paidExtra: { type: Number, default: 0 },
  paymentHistory: [PaymentHistorySchema],
  isActive: { type: Boolean, default: true },
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true },
});

// Virtual: parse dates from rawStr
CustomerSchema.virtual('parsedDates').get(function () {
  return parseRawStr(this.rawStr);
});

// Virtual: calculated fields
CustomerSchema.virtual('calc').get(function () {
  const dates = parseRawStr(this.rawStr);
  const total = dates.length;
  const paidDates = dates.filter(d => d.paid).length;
  const totalAmt = total * this.rate;
  const paidAmt = (paidDates * this.rate) + (this.paidExtra || 0);
  const dueAmt = Math.max(0, totalAmt - paidAmt);
  const status = dueAmt === 0 ? 'paid' : paidAmt > 0 ? 'partial' : 'due';
  return { total, paidDates, unpaidDates: total - paidDates, totalAmt, paidAmt, dueAmt, status, dates };
});

function parseRawStr(str) {
  if (!str || !str.trim()) return [];
  const dates = [];
  const tokens = str.split(',').map(t => t.trim()).filter(Boolean);
  let buffer = [];
  for (const tok of tokens) {
    const hasPaid = tok.toLowerCase().includes('paid');
    const nums = tok.match(/\d+/g) || [];
    for (const n of nums) buffer.push(parseInt(n));
    if (hasPaid) {
      for (const d of buffer) dates.push({ date: d, paid: true });
      buffer = [];
    }
  }
  for (const d of buffer) dates.push({ date: d, paid: false });
  return dates;
}

module.exports = mongoose.model('Customer', CustomerSchema);
