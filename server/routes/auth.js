const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { check, validationResult } = require('express-validator');

const User = require('../models/User');
const authMiddleware = require('../middleware/auth');
const { sendVerificationEmail, sendAdminNotification } = require('../services/emailService');

const router = express.Router();

// Helper to handle validation errors
const handleValidationErrors = (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    res.status(400).json({ success: false, errors: errors.array() });
    return true;
  }
  return false;
};

// ========== POST /api/auth/signup ==========
router.post(
  '/signup',
  [
    check('name', 'Name is required').trim().notEmpty(),
    check('email', 'Please include a valid email').isEmail(),
    check('password', 'Password must be at least 6 characters').isLength({ min: 6 }),
    check('role', 'Role must be patient or doctor').isIn(['patient', 'doctor']),
    // Conditional validations for doctor role
    check('phone').if(check('role').equals('doctor')).notEmpty().withMessage('Phone is required for doctors'),
    check('specialization').if(check('role').equals('doctor')).notEmpty().withMessage('Specialization is required for doctors'),
    check('experience').if(check('role').equals('doctor')).isInt({ min: 0 }).withMessage('Experience must be a positive number'),
    check('bio').if(check('role').equals('doctor')).isLength({ min: 10 }).withMessage('Bio must be at least 10 characters'),
    check('licenseNumber').if(check('role').equals('doctor')).notEmpty().withMessage('License number is required for doctors'),
  ],
  async (req, res) => {
    if (handleValidationErrors(req, res)) return;

    const {
      name,
      email,
      password,
      role,
      specialization,
      experience,
      phone,
      bio,
      licenseNumber
    } = req.body;

    try {
      let user = await User.findOne({ email });
      if (user) {
        return res.status(400).json({ success: false, message: 'User already exists' });
      }

      user = new User({
        name,
        email,
        role,
        password,
        ...(role === 'doctor' && {
          specialization,
          experience,
          phone,
          bio,
          licenseNumber,
          isVerified: false,
          verificationStatus: 'pending'
        })
      });

      const salt = await bcrypt.genSalt(10);
      user.password = await bcrypt.hash(password, salt);

      await user.save();

      if (role === 'doctor') {
        await sendVerificationEmail(user);
        await sendAdminNotification(user);
        return res.status(201).json({
          success: true,
          message: 'Doctor registration submitted. You will be notified after admin approval.'
        });
      }

      const token = jwt.sign({ id: user._id, role: user.role }, process.env.JWT_SECRET, {
        expiresIn: '1d'
      });

      res.status(201).json({
        success: true,
        token,
        role: user.role,
        id: user._id,
        name: user.name
      });
    } catch (err) {
      console.error('Signup error:', err.message);
      res.status(500).json({ success: false, message: 'Server error' });
    }
  }
);

// ========== POST /api/auth/login ==========
router.post(
  '/login',
  [
    check('email', 'Please include a valid email').isEmail(),
    check('password', 'Password is required').exists()
  ],
  async (req, res) => {
    if (handleValidationErrors(req, res)) return;

    const { email, password } = req.body;

    try {
      const user = await User.findOne({ email }).select('+password');
      if (!user) {
        return res.status(401).json({ success: false, message: 'Invalid credentials' });
      }

      const isMatch = await bcrypt.compare(password, user.password);
      if (!isMatch) {
        return res.status(401).json({ success: false, message: 'Invalid credentials' });
      }

      if (user.role === 'doctor' && !user.isVerified) {
        return res.status(403).json({
          success: false,
          message: 'Your account is pending admin approval. Please wait for verification.'
        });
      }

      const token = jwt.sign({ id: user._id, role: user.role }, process.env.JWT_SECRET, {
        expiresIn: '1d'
      });

      res.json({
        success: true,
        token,
        role: user.role,
        id: user._id,
        name: user.name
      });
    } catch (err) {
      console.error('Login error:', err.message);
      res.status(500).json({ success: false, message: 'Server error' });
    }
  }
);

// ========== GET /api/auth/me (Protected) ==========
router.get('/me', authMiddleware.protect, async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select('-password');
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }
    res.json({ success: true, data: user });
  } catch (err) {
    console.error('Get me error:', err.message);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// ========== GET /api/auth/doctors ==========
router.get('/doctors', async (req, res) => {
  try {
    const doctors = await User.find({ role: 'doctor', isVerified: true }).select('-password').sort({ name: 1 });
    res.json({ success: true, count: doctors.length, data: doctors });
  } catch (err) {
    console.error('Get doctors error:', err.message);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// ========== GET /api/auth/doctors/:id ==========
router.get('/doctors/:id', async (req, res) => {
  try {
    const doctor = await User.findOne({ _id: req.params.id, role: 'doctor' }).select('-password');
    if (!doctor) {
      return res.status(404).json({ success: false, message: 'Doctor not found' });
    }
    res.json({ success: true, data: doctor });
  } catch (err) {
    console.error('Get doctor by id error:', err.message);
    if (err.name === 'CastError') {
      return res.status(404).json({ success: false, message: 'Invalid doctor ID' });
    }
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

module.exports = router;
