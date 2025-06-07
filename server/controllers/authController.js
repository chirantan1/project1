const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const { validationResult } = require('express-validator');
const {
  sendVerificationEmail,
  sendAdminNotification,
  sendApprovalEmail,
  sendRejectionEmail
} = require('../services/emailService');

// ========== SIGNUP ==========
exports.signup = async (req, res) => {
  try {
    const {
      name, email, password, role,
      specialization, experience, phone,
      bio, licenseNumber
    } = req.body;

    // Validation errors
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ message: 'Email already exists' });
    }

    const newUser = new User({
      name,
      email,
      password,
      role,
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

    await newUser.save();

    // Doctor-specific logic
    if (role === 'doctor') {
      await sendVerificationEmail(newUser);
      await sendAdminNotification(newUser);
      return res.status(201).json({
        message: 'Doctor registration submitted for admin approval. You will be notified once approved.'
      });
    }

    // Patient or Admin logic
    const token = jwt.sign(
      { userId: newUser._id, role: newUser.role },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );

    return res.status(201).json({
      token,
      userId: newUser._id,
      role: newUser.role
    });

  } catch (error) {
    console.error('Signup Error:', error.message);
    return res.status(500).json({ message: 'Signup failed', error: error.message });
  }
};

// ========== LOGIN ==========
exports.login = async (req, res) => {
  try {
    const { email, password } = req.body;

    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const user = await User.findOne({ email }).select('+password');
    if (!user) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    if (user.role === 'doctor' && !user.isVerified) {
      return res.status(403).json({
        message: 'Your account is pending admin approval. Please wait for verification.'
      });
    }

    const token = jwt.sign(
      { userId: user._id, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );

    return res.json({
      token,
      userId: user._id,
      role: user.role,
      name: user.name
    });

  } catch (error) {
    console.error('Login Error:', error.message);
    return res.status(500).json({ message: 'Login failed', error: error.message });
  }
};

// ========== GET CURRENT USER ==========
exports.getMe = async (req, res) => {
  try {
    const user = await User.findById(req.userId).select('-password');
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    return res.json(user);
  } catch (error) {
    console.error('GetMe Error:', error.message);
    return res.status(500).json({ message: 'Failed to fetch user', error: error.message });
  }
};
