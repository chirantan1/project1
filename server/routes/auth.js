const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { check, validationResult } = require('express-validator');

const User = require('../models/User'); // Ensure correct path to your User model
const authMiddleware = require('../middleware/auth'); // Assuming this path is correct

const router = express.Router();

// Helper function to handle validation errors from express-validator
const handleValidationErrors = (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    res.status(400).json({ success: false, errors: errors.array() });
    return true; // Indicates that errors were found and response was sent
  }
  return false; // Indicates no validation errors
};

// @route   POST /api/auth/signup
// @desc    Register a new user (patient or doctor)
// @access  Public
router.post(
  '/signup',
  [
    // General user fields validation
    check('name', 'Name is required').trim().notEmpty(),
    check('email', 'Please include a valid email').isEmail(),
    check('password', 'Password must be at least 6 characters').isLength({ min: 6 }),
    check('role', 'Role must be patient or doctor').isIn(['patient', 'doctor']), // Ensure consistent enum values with model

    // Doctor specific fields validation (conditional)
    check('specialization', 'Specialization is required for doctors')
      .if(check('role').equals('doctor'))
      .trim().notEmpty(),
    check('experience', 'Experience must be a non-negative number for doctors')
      .if(check('role').equals('doctor'))
      .isInt({ min: 0 }).withMessage('Experience must be a number greater than or equal to 0'),
    check('phone', 'Phone number is required for doctors')
      .if(check('role').equals('doctor'))
      .trim().notEmpty().isLength({ min: 10 }).withMessage('Phone number must be at least 10 digits.'), // Basic phone length validation
    check('bio', 'Professional Bio is required for doctors')
      .if(check('role').equals('doctor'))
      .trim().notEmpty().isLength({ min: 5 }).withMessage('Bio must be at least 5 characters'),
    
    // registrationId is now explicitly required for doctors
    check('registrationId', 'Registration ID is required for doctors')
      .if(check('role').equals('doctor'))
      .trim().notEmpty(),

    // Removed validation checks for isActive, availableDays, qualifications, hospitalAffiliation,
    // allergies, medications, and medicalHistory as they are no longer handled by the frontend or schema.
  ],
  async (req, res) => {
    // Check for validation errors; if any, send error response and return
    if (handleValidationErrors(req, res)) {
      return;
    }

    const {
      name,
      email,
      password,
      role,
      specialization,
      experience,
      phone,
      bio,
      registrationId, // Now explicitly destructured for doctor signup
      // Removed isActive, availableDays, qualifications, hospitalAffiliation, allergies, medications, medicalHistory
    } = req.body; // Destructure only the necessary fields from the request body

    try {
      // Check if a user with the given email already exists
      let user = await User.findOne({ email });
      if (user) {
        return res.status(400).json({ success: false, message: 'User already exists with this email' });
      }

      // Hash the password
      const salt = await bcrypt.genSalt(10);
      const hashedPassword = await bcrypt.hash(password, salt);

      // Create a new User instance
      user = new User({
        name,
        email,
        password: hashedPassword, // Store hashed password
        role,
      });

      // Conditionally assign doctor-specific fields if the role is 'doctor'
      if (role === 'doctor') {
        user.specialization = specialization;
        user.experience = Number(experience); // Ensure experience is stored as a number
        user.phone = phone;
        user.bio = bio;
        user.registrationId = registrationId; // Assign the registration ID
        // isActive, availableDays, qualifications, hospitalAffiliation, allergies, medications, medicalHistory
        // are no longer set here as per the updated schema and frontend
      } else {
        // For patients, ensure doctor-specific fields are not stored
        user.specialization = undefined;
        user.experience = undefined;
        user.phone = undefined;
        user.bio = undefined;
        user.registrationId = undefined;
      }

      // Save the new user to the database
      await user.save();

      // Create JWT payload (including relevant user data for client-side)
      const payload = {
        id: user._id,
        role: user.role,
        name: user.name,
        email: user.email,
        // Include doctor specific fields in payload if applicable
        ...(user.role === 'doctor' && {
          specialization: user.specialization,
          experience: user.experience,
          phone: user.phone,
          bio: user.bio,
          registrationId: user.registrationId,
          // isActive, availableDays, qualifications, hospitalAffiliation, allergies, medications, medicalHistory
          // are no longer included in payload
        })
      };

      // Sign the JWT token
      const token = jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: '1d' });

      // Send success response with token and user data
      res.status(201).json({
        success: true,
        message: 'User registered successfully',
        token,
        user: payload // Send the full payload as the user object
      });
    } catch (err) {
      console.error('Signup error:', err.message);
      // Handle potential duplicate registrationId errors from Mongoose unique index
      if (err.code === 11000 && err.keyPattern && err.keyPattern.registrationId) {
        return res.status(400).json({ success: false, message: 'A doctor with this Registration ID already exists.' });
      }
      res.status(500).json({ success: false, message: 'Server error during registration' });
    }
  }
);

// @route   POST /api/auth/login
// @desc    Authenticate user & get token
// @access  Public
router.post(
  '/login',
  [
    check('email', 'Please include a valid email').isEmail(),
    check('password', 'Password is required').exists(),
  ],
  async (req, res) => {
    // Check for validation errors; if any, send error response and return
    if (handleValidationErrors(req, res)) {
      return;
    }

    const { email, password } = req.body;

    try {
      // Find user and explicitly select the password field
      const user = await User.findOne({ email }).select('+password');
      if (!user) {
        return res.status(401).json({ success: false, message: 'Invalid credentials' });
      }

      // Compare the provided password with the hashed password in the database
      const isMatch = await bcrypt.compare(password, user.password);
      if (!isMatch) {
        return res.status(401).json({ success: false, message: 'Invalid credentials' });
      }

      // Create JWT payload (including all relevant user data)
      const payload = {
        id: user._id,
        role: user.role,
        name: user.name,
        email: user.email,
        phone: user.phone, // Phone might be common to both roles

        // Include doctor specific fields in payload if applicable
        ...(user.role === 'doctor' && {
          specialization: user.specialization,
          experience: user.experience,
          bio: user.bio,
          registrationId: user.registrationId,
          // isActive, availableDays, qualifications, hospitalAffiliation, allergies, medications, medicalHistory
          // are no longer included in payload
        }),
        // Add patient specific fields if applicable (if your patient schema has more fields)
        ...(user.role === 'patient' && {
          // examplePatientField: user.examplePatientField
        })
      };

      // Sign the JWT token
      const token = jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: '1d' });

      // Send success response with token and user data
      res.json({
        success: true,
        token,
        user: payload // Send the full payload as the user object
      });
    } catch (err) {
      console.error('Login error:', err.message);
      res.status(500).json({ success: false, message: 'Server error during login' });
    }
  }
);

// @route   GET /api/auth/me
// @desc    Get current authenticated user's profile
// @access  Private (requires authentication token)
router.get('/me', authMiddleware.protect, async (req, res) => {
  try {
    // Find user by ID from the authenticated request, exclude password
    const user = await User.findById(req.user.id).select('-password');
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }
    // All non-password fields, including new doctor fields, will be included here automatically
    res.json({ success: true, user });
  } catch (err) {
    console.error('Get me error:', err.message);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// @route   GET /api/auth/doctors
// @desc    Get all doctors
// @access  Public
router.get('/doctors', async (req, res) => {
  try {
    // Find all users with role 'doctor', exclude password, and sort by name
    const doctors = await User.find({ role: 'doctor' })
      .select('-password') // This will include all new doctor fields
      .sort({ name: 1 });

    res.json({
      success: true,
      count: doctors.length,
      data: doctors
    });
  } catch (err) {
    console.error('Get doctors error:', err.message);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// @route   GET /api/auth/doctors/:id
// @desc    Get a single doctor by ID
// @access  Public
router.get('/doctors/:id', async (req, res) => {
  try {
    // Find a doctor by ID and role, exclude password
    const doctor = await User.findOne({
      _id: req.params.id,
      role: 'doctor'
    }).select('-password'); // This will include all new doctor fields

    if (!doctor) {
      return res.status(404).json({ success: false, message: 'Doctor not found' });
    }

    res.json({ success: true, data: doctor });
  } catch (err) {
    console.error('Get doctor by id error:', err.message);
    if (err.name === 'CastError') {
      return res.status(400).json({ success: false, message: 'Invalid doctor ID format' }); // Changed to 400 for bad format
    }
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// @route   DELETE /api/auth/doctors/:id
// @desc    Delete a doctor by ID
// @access  Private (protected, admin only)
router.delete('/doctors/:id', authMiddleware.protect, authMiddleware.authorize('admin'), async (req, res) => {
  try {
    // Find and delete a doctor by ID and role
    const doctor = await User.findOneAndDelete({
      _id: req.params.id,
      role: 'doctor'
    });

    if (!doctor) {
      return res.status(404).json({ success: false, message: 'Doctor not found' });
    }

    res.json({
      success: true,
      message: 'Doctor deleted successfully'
    });
  } catch (err) {
    console.error('Delete doctor error:', err.message);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

module.exports = router;