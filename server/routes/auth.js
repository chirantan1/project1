const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { check, validationResult } = require('express-validator');

const User = require('../models/User'); // Ensure correct path to your User model
const authMiddleware = require('../middleware/auth'); // Assuming this path is correct
const authController = require('../controllers/authController'); // IMPORTANT: Ensure authController is imported

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
    ],
    // The actual logic is now in authController.signupUser
    authController.signupUser
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
    // The actual logic is now in authController.loginUser
    authController.loginUser
);

// --- Forgot Password Related Routes ---
// @route   POST /api/auth/forgot-password
// @desc    Initiate password reset process (send OTP)
// @access  Public
router.post('/forgot-password', authController.forgotPassword);


// @route   POST /api/auth/verify-otp
// @desc    Verify OTP
// @access  Public
router.post('/verify-otp', authController.verifyOtp); // ⭐ ADDED: This line was missing or incorrect!


// @route   POST /api/auth/reset-password
// @desc    Verify OTP and reset user's password
// @access  Public
router.post('/reset-password', authController.resetPassword); // ⭐ ADDED: This line was also missing!
// --- End Forgot Password Related Routes ---


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