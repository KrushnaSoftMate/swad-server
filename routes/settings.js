// backend/routes/settings.js
const express = require('express');
const router = express.Router();
const Settings = require('../models/Settings');

// GET settings
router.get('/', async (req, res) => {
  try {
    let settings = await Settings.findOne({ key: 'global' });
    if (!settings) {
      settings = await Settings.create({ key: 'global' });
    }
    res.json({ success: true, data: settings });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// PUT update settings
router.put('/', async (req, res) => {
  try {
    const settings = await Settings.findOneAndUpdate(
      { key: 'global' },
      { ...req.body, key: 'global' },
      { new: true, upsert: true, runValidators: true }
    );
    res.json({ success: true, data: settings });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
});

module.exports = router;
