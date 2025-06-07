const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { check, validationResult } = require('express-validator');

const User = require('../models/User');
const authMiddleware = require('../middleware/auth');

const router = express.Router();

// Helper to handle validation errors
const handleValidationErrors = (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    res.status(400).json({ success: false, errors: errors.array() });
    return true; // errors found
  }
  return false;
};

// POST /api/auth/signup
router.post(
  '/signup',
  [
    check('name', 'Name is required').trim().notEmpty(),
    check('email', 'Please include a valid email').isEmail(),
    check('password', 'Password must be at least 6 characters').isLength({ min: 6 }),
    check('role', 'Role must be patient or doctor').isIn(['patient', 'doctor']),
    // Conditional checks for doctors
    check('phone', 'Phone is required for doctors').if(check('role').equals('doctor')).notEmpty(),
    check('specialization', 'Specialization is required for doctors').if(check('role').equals('doctor')).notEmpty(),
    check('experience', 'Experience must be a positive number').if(check('role').equals('doctor')).isInt({ min: 0 }),
    check('bio', 'Bio must be at least 50 characters').if(check('role').equals('doctor')).isLength({ min: 5 }),
  ],
  async (req, res) => {
    if (handleValidationErrors(req, res)) return;

    const { name, email, password, role, specialization, experience, phone, bio } = req.body;

    try {
      // Check if user exists
      let user = await User.findOne({ email });
      if (user) {
        return res.status(400).json({ success: false, message: 'User already exists' });
      }

      // Create new user object
      user = new User({
        name,
        email,
        role,
        specialization: role === 'doctor' ? specialization : undefined,
        experience: role === 'doctor' ? experience : undefined,
        phone: role === 'doctor' ? phone : undefined,
        bio: role === 'doctor' ? bio : undefined,
      });

      // Hash password
      const salt = await bcrypt.genSalt(10);
      user.password = await bcrypt.hash(password, salt);

      await user.save();

      // Generate JWT token
      const payload = { id: user._id, role: user.role };
      const token = jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: '1d' });

      res.status(201).json({
        success: true,
        token,
        role: user.role,
        id: user._id,
        name: user.name,
      });
    } catch (err) {
      console.error('Signup error:', err.message);
      res.status(500).json({ success: false, message: 'Server error' });
    }
  }
);

// POST /api/auth/login
router.post(
  '/login',
  [
    check('email', 'Please include a valid email').isEmail(),
    check('password', 'Password is required').exists(),
  ],
  async (req, res) => {
    if (handleValidationErrors(req, res)) return;

    const { email, password } = req.body;

    try {
      // Find user, including password field explicitly
      const user = await User.findOne({ email }).select('+password');
      if (!user) {
        return res.status(401).json({ success: false, message: 'Invalid credentials' });
      }

      // Compare password
      const isMatch = await bcrypt.compare(password, user.password);
      if (!isMatch) {
        return res.status(401).json({ success: false, message: 'Invalid credentials' });
      }

      // Generate token
      const payload = { id: user._id, role: user.role };
      const token = jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: '1d' });

      res.json({
        success: true,
        token,
        role: user.role,
        id: user._id,
        name: user.name,
      });
    } catch (err) {
      console.error('Login error:', err.message);
      res.status(500).json({ success: false, message: 'Server error' });
    }
  }
);

// GET /api/auth/me (protected route)
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

// Public list of doctors
router.get('/doctors', async (req, res) => {
  try {
    const doctors = await User.find({ role: 'doctor' }).select('-password').sort({ name: 1 });
    res.json({ success: true, count: doctors.length, data: doctors });
  } catch (err) {
    console.error('Get doctors error:', err.message);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// Get single doctor by id
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
