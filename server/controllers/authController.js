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
    // Doctor specific fields (only these remain as per the updated schema)
    specialization,
    experience,
    phone,
    bio,
    registrationId, // Now explicitly included for doctor signup
  } = req.body; // Destructure only the necessary fields from request body

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

    // Conditionally add doctor-specific fields and handle registrationId
    if (role === 'doctor') {
      // Validate and assign doctor-specific fields
      user.specialization = specialization;
      user.experience = experience;
      user.phone = phone;
      user.bio = bio;

      // Check for unique registrationId for doctors
      if (!registrationId) {
        return res.status(400).json({ success: false, message: 'Registration ID is required for doctors.' });
      }

      const existingDoctorWithId = await User.findOne({ registrationId, role: 'doctor' });
      if (existingDoctorWithId) {
        return res.status(400).json({ success: false, message: 'A doctor with this Registration ID already exists.' });
      }
      user.registrationId = registrationId; // Assign the registration ID
    } else {
      // For patients, ensure doctor-specific fields are not stored
      user.specialization = undefined;
      user.experience = undefined;
      user.phone = undefined;
      user.bio = undefined;
      user.registrationId = undefined;
      // isActive, availableDays, qualifications, hospitalAffiliation, allergies, medications, medicalHistory
      // are now completely removed from the schema and thus not set here.
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
    // Handle potential duplicate registrationId errors if the sparse unique index fails
    if (err.code === 11000 && err.keyPattern && err.keyPattern.registrationId) {
      return res.status(400).json({ success: false, message: 'A doctor with this Registration ID already exists.' });
    }
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