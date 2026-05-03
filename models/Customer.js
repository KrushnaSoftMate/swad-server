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
  offDays: { type: [Number], default: [] },
  tiffinsByMonth: { 
    type: Map, 
    of: String, 
    default: {} 
  },
  offDaysByMonth: { 
    type: Map, 
    of: [Number], 
    default: {} 
  },
  paidExtraByMonth: {
    type: Map,
    of: Number,
    default: {}
  },
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
  // Get current month key
  const now = new Date();
  const monthKey = `${now.getFullYear()}-${now.getMonth() + 1}`;
  
  // 1. Current Month Stats
  const currentRaw = this.tiffinsByMonth.get(monthKey) || (this.rawStr || '');
  const currentMonthExtra = this.paidExtraByMonth.get(monthKey) || 0;
  const currentDates = parseRawStr(currentRaw);
  
  const total = currentDates.length;
  const paidDates = currentDates.filter(d => d.paid).length;
  const totalAmt = total * this.rate;
  const paidAmt = (paidDates * this.rate) + currentMonthExtra + (this.paidExtra || 0);
  const dueAmt = Math.max(0, totalAmt - paidAmt);
  const status = dueAmt === 0 ? 'paid' : paidAmt > 0 ? 'partial' : 'due';

  // 2. Lifetime Stats (Accumulate all months)
  let lifetimeBill = 0;
  let lifetimePaid = (this.paidExtra || 0); // Start with legacy lump sum
  
  // Track which months we've processed to avoid double counting if current month is in both legacy and Map
  const processedKeys = new Set();

  this.tiffinsByMonth.forEach((str, key) => {
    const dts = parseRawStr(str);
    lifetimeBill += dts.length * this.rate;
    lifetimePaid += (dts.filter(d => d.paid).length * this.rate) + (this.paidExtraByMonth.get(key) || 0);
    processedKeys.add(key);
  });

  // Add legacy current month data only if it wasn't already in the Map
  if (!processedKeys.has(monthKey) && this.rawStr) {
    const dts = parseRawStr(this.rawStr);
    lifetimeBill += dts.length * this.rate;
    lifetimePaid += (dts.filter(d => d.paid).length * this.rate);
  }

  return { 
    total, 
    totalAmt, 
    paidAmt, 
    dueAmt, 
    status, 
    lifetimeBill, 
    lifetimePaid, 
    lifetimeDue: Math.max(0, lifetimeBill - lifetimePaid) 
  };
});

function parseRawStr(str) {
  if (!str || !str.trim()) return [];
  const result = [];
  const tokens = str.split(',').map(t => t.trim()).filter(Boolean);
  let standaloneBuffer = []; 

  for (const tok of tokens) {
    const lower   = tok.toLowerCase();
    const nums    = tok.match(/\d+/g) || [];
    const hasPaid = lower.includes('paid');

    if (nums.length === 0 && hasPaid) {
      // Mark everything in buffer as paid (legacy support)
      for (const d of standaloneBuffer) result.push({ date: d, paid: true });
      standaloneBuffer = [];
    } else if (nums.length > 0 && hasPaid) {
      // Individual style: "17 paid" -> only 17 is paid
      for (const d of standaloneBuffer) result.push({ date: d, paid: false });
      standaloneBuffer = [];
      result.push({ date: parseInt(nums[0]), paid: true });
    } else if (nums.length > 0) {
      // Pure numbers
      for (const n of nums) standaloneBuffer.push(parseInt(n));
    }
  }
  for (const d of standaloneBuffer) result.push({ date: d, paid: false });
  return result;
}

module.exports = mongoose.model('Customer', CustomerSchema);
