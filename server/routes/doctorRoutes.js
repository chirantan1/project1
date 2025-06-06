const express = require('express');
const router = express.Router();
const authMiddleware = require('../middleware/auth');
const Doctor = require('../models/Doctor');

// Get current doctor's profile
router.get('/me', authMiddleware, async (req, res) => {
  try {
    const doctor = await Doctor.findOne({ userId: req.user.id })
      .select('name specialization licenseNumber');
      
    if (!doctor) {
      return res.status(404).json({ message: 'Doctor profile not found' });
    }
    
    res.json(doctor);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;