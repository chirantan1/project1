const express = require('express');
const router = express.Router();
const authMiddleware = require('../middleware/auth');
const Doctor = require('../models/Doctor');

// GET /api/doctor/me - Get current logged-in doctor's profile
router.get('/me', authMiddleware.protect, async (req, res) => {
  try {
    if (!req.user || !req.user.id) {
      return res.status(401).json({ success: false, message: 'Unauthorized' });
    }

    const doctor = await Doctor.findOne({ userId: req.user.id }).select('name specialization licenseNumber phone bio experience');

    if (!doctor) {
      return res.status(404).json({ success: false, message: 'Doctor profile not found' });
    }

    res.json({ success: true, data: doctor });
  } catch (error) {
    console.error('Get doctor profile error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

module.exports = router;
