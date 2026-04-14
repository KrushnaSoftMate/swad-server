// backend/routes/customers.js
const express = require('express');
const router = express.Router();
const Customer = require('../models/Customer');

const DEFAULT_CUSTOMERS = [
  {name:'Dipak Sir',type:'Full Tiffin',floor:'',phone:'',rawStr:'10 paid, 11 paid, 12 paid, 13 paid, 14 paid, 16, 17, 18 paid, 23, 24, 25, 26, 27, 28, 30, 31, 1, 3, 6, 7, 8, 9, 10, 11 paid, 13',rate:60,paidExtra:0,note:''},
  {name:'Pranav',type:'Full Tiffin',floor:'',phone:'',rawStr:'10, 11, 12, 13, 14, 17, 18, 23, 24, 25, 26, 27, 28, 30, 31, 1, 3, 6, 7, 8, 9, 10, 11 paid, 13',rate:60,paidExtra:1380,note:'₹1380 collected earlier'},
  {name:'Sudhanshu',type:'Full Tiffin',floor:'',phone:'',rawStr:'4 paid, 10, 11, 12, 13, 14 paid, 10',rate:60,paidExtra:0,note:''},
  {name:'Sejal',type:'Full Tiffin',floor:'',phone:'',rawStr:'11, 17',rate:60,paidExtra:0,note:''},
  {name:'Pranav Sir',type:'Custom',floor:'',phone:'',rawStr:'16',rate:60,paidExtra:110,note:'₹110 extra paid'},
  {name:'Sumit Half',type:'Half Tiffin',floor:'',phone:'',rawStr:'16 paid',rate:30,paidExtra:0,note:''},
  {name:'Sumit Full',type:'Full Tiffin',floor:'',phone:'',rawStr:'16 paid, 16 paid',rate:60,paidExtra:0,note:''},
  {name:'New Temp',type:'Full Tiffin',floor:'',phone:'',rawStr:'10 paid, 11 paid, 18 paid, 23 paid',rate:60,paidExtra:0,note:'Temporary customer'},
  {name:'Swapnil',type:'Full Tiffin',floor:'',phone:'',rawStr:'7, 27 paid',rate:60,paidExtra:0,note:''},
  {name:'Sejal 5th Floor',type:'Full Tiffin',floor:'5th Floor',phone:'',rawStr:'3 paid, 6, 7, 8, 9, 10',rate:60,paidExtra:0,note:''},
  {name:'Guard',type:'Full Tiffin',floor:'',phone:'',rawStr:'9 paid',rate:60,paidExtra:0,note:''},
  {name:'Ankit',type:'Full Tiffin',floor:'',phone:'',rawStr:'11',rate:60,paidExtra:0,note:''},
  {name:'9th Boys (2)',type:'Full Tiffin',floor:'9th Floor',phone:'',rawStr:'10 paid',rate:60,paidExtra:0,note:'2 persons'},
  {name:'9th Girl',type:'Custom',floor:'9th Floor',phone:'',rawStr:'10, 13',rate:60,paidExtra:95,note:'₹60 for date 10, ₹35 extra on 13'},
  {name:'9th Girl 2',type:'Full Tiffin',floor:'9th Floor',phone:'',rawStr:'13',rate:60,paidExtra:0,note:''},
];

// GET all customers
router.get('/', async (req, res) => {
  try {
    const customers = await Customer.find({ isActive: true }).sort({ createdAt: 1 });
    res.json({ success: true, data: customers });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// GET single customer
router.get('/:id', async (req, res) => {
  try {
    const customer = await Customer.findById(req.params.id);
    if (!customer) return res.status(404).json({ success: false, message: 'Customer not found' });
    res.json({ success: true, data: customer });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// POST create customer
router.post('/', async (req, res) => {
  try {
    const customer = new Customer(req.body);
    await customer.save();
    res.status(201).json({ success: true, data: customer });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
});

// PUT update customer
router.put('/:id', async (req, res) => {
  try {
    const customer = await Customer.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    );
    if (!customer) return res.status(404).json({ success: false, message: 'Customer not found' });
    res.json({ success: true, data: customer });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
});

// DELETE customer (soft delete)
router.delete('/:id', async (req, res) => {
  try {
    await Customer.findByIdAndUpdate(req.params.id, { isActive: false });
    res.json({ success: true, message: 'Customer deleted' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// POST mark payment
router.post('/:id/payment', async (req, res) => {
  try {
    const { amount, note } = req.body;
    if (!amount || amount <= 0) return res.status(400).json({ success: false, message: 'Invalid amount' });
    const customer = await Customer.findById(req.params.id);
    if (!customer) return res.status(404).json({ success: false, message: 'Customer not found' });
    customer.paidExtra = (customer.paidExtra || 0) + amount;
    customer.paymentHistory.push({ amount, note: note || '', paidAt: new Date() });
    await customer.save();
    res.json({ success: true, data: customer });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// POST add tiffin date
router.post('/:id/adddate', async (req, res) => {
  try {
    const { date } = req.body;
    if (!date || date < 1 || date > 31) return res.status(400).json({ success: false, message: 'Invalid date' });
    const customer = await Customer.findById(req.params.id);
    if (!customer) return res.status(404).json({ success: false, message: 'Customer not found' });
    customer.rawStr = customer.rawStr ? `${customer.rawStr}, ${date}` : `${date}`;
    await customer.save();
    res.json({ success: true, data: customer });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// GET summary stats
router.get('/stats/summary', async (req, res) => {
  try {
    const customers = await Customer.find({ isActive: true });
    let totalTiffins = 0, totalRevenue = 0, totalCollected = 0, paidCount = 0, dueCount = 0;
    customers.forEach(c => {
      const cl = c.calc;
      totalTiffins += cl.total;
      totalRevenue += cl.totalAmt;
      totalCollected += cl.paidAmt;
      if (cl.status === 'paid') paidCount++;
      else dueCount++;
    });
    res.json({
      success: true,
      data: {
        totalCustomers: customers.length,
        totalTiffins,
        totalRevenue,
        totalCollected,
        totalDue: totalRevenue - totalCollected,
        paidCount,
        dueCount,
      }
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// POST seed default data
router.post('/seed/defaults', async (req, res) => {
  try {
    const count = await Customer.countDocuments({ isActive: true });
    if (count > 0) {
      return res.json({ success: false, message: 'Data already exists. Use force=true to reseed.' });
    }
    await Customer.insertMany(DEFAULT_CUSTOMERS);
    res.json({ success: true, message: `Seeded ${DEFAULT_CUSTOMERS.length} customers` });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// POST force reseed
router.post('/seed/force', async (req, res) => {
  try {
    await Customer.deleteMany({});
    await Customer.insertMany(DEFAULT_CUSTOMERS);
    res.json({ success: true, message: `Reseeded ${DEFAULT_CUSTOMERS.length} customers` });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

module.exports = router;
