const express = require('express');
const router = express.Router();
const { check, validationResult } = require('express-validator');
const Appointment = require('../models/Appointment');
const User = require('../models/User');
const authMiddleware = require('../middleware/auth');

// Utility to handle validation errors
const handleValidationErrors = (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      errors: errors.array()
    });
  }
};

// @route   POST /api/appointments
// @desc    Book a new appointment (patient)
// @access  Private
router.post(
  '/',
  authMiddleware.protect,
  [
    check('doctorId', 'Doctor ID is required').not().isEmpty(),
    check('date', 'Date is required').not().isEmpty(),
    check('time', 'Time is required').not().isEmpty(),
    check('symptoms', 'Symptoms are required').not().isEmpty()
  ],
  async (req, res) => {
    handleValidationErrors(req, res);
    const { doctorId, date, time, symptoms } = req.body;

    try {
      const doctor = await User.findById(doctorId);
      if (!doctor || doctor.role !== 'doctor') {
        return res.status(404).json({
          success: false,
          message: 'Doctor not found'
        });
      }

      const appointment = await Appointment.create({
        doctor: doctorId,
        patient: req.user.id,
        date,
        time,
        symptoms
      });

      res.status(201).json({
        success: true,
        message: 'Appointment booked successfully',
        data: appointment
      });
    } catch (err) {
      console.error('Booking error:', err.message);
      res.status(500).json({
        success: false,
        message: 'Server error while booking appointment'
      });
    }
  }
);

// @route   GET /api/appointments/patient
// @desc    Get all appointments for logged-in patient
// @access  Private
router.get('/patient', authMiddleware.protect, async (req, res) => {
  try {
    const appointments = await Appointment.find({ patient: req.user.id }).populate('doctor', 'name specialization');
    res.json({
      success: true,
      count: appointments.length,
      data: appointments
    });
  } catch (err) {
    console.error('Error fetching patient appointments:', err.message);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch appointments'
    });
  }
});

// @route   GET /api/appointments/doctor
// @desc    Get all appointments for logged-in doctor
// @access  Private (Doctor only)
router.get('/doctor', authMiddleware.protect, authMiddleware.authorize('doctor'), async (req, res) => {
  try {
    const appointments = await Appointment.find({ doctor: req.user.id })
      .populate('patient', 'name email phone')
      .sort({ date: -1 });

    res.json({
      success: true,
      count: appointments.length,
      data: appointments
    });
  } catch (err) {
    console.error('Appointment fetch error:', err.message);
    res.status(500).json({
      success: false,
      message: 'Server Error'
    });
  }
});

// @route   PUT /api/appointments/:id/status
// @desc    Update appointment status (approve/reject)
// @access  Private (Doctor only)
router.put(
  '/:id/status',
  [
    authMiddleware.protect,
    authMiddleware.authorize('doctor'),
    check('status', 'Status is required').not().isEmpty()
  ],
  async (req, res) => {
    handleValidationErrors(req, res);

    try {
      const appointment = await Appointment.findOneAndUpdate(
        { _id: req.params.id, doctor: req.user.id },
        { status: req.body.status },
        { new: true }
      ).populate('patient', 'name email');

      if (!appointment) {
        return res.status(404).json({
          success: false,
          message: 'Appointment not found'
        });
      }

      res.json({
        success: true,
        data: appointment
      });
    } catch (err) {
      console.error('Update error:', err.message);
      res.status(500).json({
        success: false,
        message: 'Server Error'
      });
    }
  }
);

module.exports = router;
