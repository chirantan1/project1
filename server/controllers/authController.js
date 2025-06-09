const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const User = require('../models/User'); // Ensure path is correct
const { validationResult } = require('express-validator'); // For handling validation middleware errors

// @route   POST /api/auth/signup
// @desc    Register a new user (patient or doctor)
// @access  Public
const signupUser = async (req, res) => {
  // Check for validation errors from express-validator (if used)
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ success: false, errors: errors.array() });
  }

  const {
    name,
    email,
    password,
    role,
    // Doctor specific fields
    specialization,
    experience,
    phone,
    bio,
    isActive,
    availableDays,
    qualifications,
    hospitalAffiliation,
    allergies,
    medications,
    medicalHistory,
  } = req.body; // Destructure all possible fields from request body

  try {
    // Check if user already exists
    let user = await User.findOne({ email });
    if (user) {
      return res.status(400).json({ success: false, message: 'User already exists with this email' });
    }

    // Hash password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    // Create a new User instance
    user = new User({
      name,
      email,
      password: hashedPassword,
      role,
    });

    // Conditionally add doctor-specific fields
    if (role === 'doctor') {
      user.specialization = specialization;
      user.experience = experience;
      user.phone = phone;
      user.bio = bio;
      user.isActive = isActive; // Boolean value
      user.availableDays = availableDays;
      user.qualifications = qualifications;
      user.hospitalAffiliation = hospitalAffiliation;
      // These fields are optional for doctors, save if provided
      user.allergies = allergies || '';
      user.medications = medications || '';
      user.medicalHistory = medicalHistory || '';
    }

    // Save the user to the database
    await user.save();

    // Generate JWT token
    const payload = { id: user._id, role: user.role };
    const token = jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: '1d' });

    // Send success response
    return res.status(201).json({
      success: true,
      message: 'User registered successfully',
      token,
      role: user.role,
      id: user._id,
      name: user.name,
    });
  } catch (err) {
    console.error('Signup error:', err.message);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
};

// @route   POST /api/auth/login
// @desc    Authenticate user & get token
// @access  Public
const loginUser = async (req, res) => {
  // Check validation errors from express-validator middleware
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ success: false, errors: errors.array() });
  }

  const { email, password } = req.body;

  try {
    // Find user and include password field explicitly
    const user = await User.findOne({ email }).select('+password');
    if (!user) {
      return res.status(401).json({ success: false, message: 'Invalid credentials' });
    }

    // Compare password
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(401).json({ success: false, message: 'Invalid credentials' });
    }

    // Generate JWT token
    const payload = { id: user._id, role: user.role };
    const token = jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: '1d' });

    // Send response
    return res.json({
      success: true,
      token,
      role: user.role,
      id: user._id,
      name: user.name,
    });
  } catch (err) {
    console.error('Login error:', err.message);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
};

module.exports = {
  signupUser,
  loginUser
};
