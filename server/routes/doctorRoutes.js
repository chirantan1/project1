const express = require('express');
const router = express.Router();
const authMiddleware = require('../middleware/auth');
const User = require('../models/User'); // CHANGED: Import User model instead of Doctor

// GET /api/doctor/me - Get current logged-in doctor's profile
router.get('/me', authMiddleware.protect, async (req, res) => {
    try {
        // Ensure user is authenticated and ID is available
        if (!req.user || !req.user.id) {
            return res.status(401).json({ success: false, message: 'Unauthorized' });
        }

        // Ensure the logged-in user has the 'doctor' role
        if (req.user.role !== 'doctor') {
            return res.status(403).json({ success: false, message: 'Access denied. Not a doctor.' });
        }

        // CHANGED: Query the User model for the specific user ID and role 'doctor'
        // Select specific fields relevant to a doctor's profile.
        const doctor = await User.findOne({ _id: req.user.id, role: 'doctor' })
                                 .select('name email specialization experience phone bio registrationId'); // Adjusted selected fields

        if (!doctor) {
            // This might happen if a user's role was changed or data inconsistency
            return res.status(404).json({ success: false, message: 'Doctor profile not found for this user ID and role.' });
        }

        res.json({ success: true, data: doctor });
    } catch (error) {
        console.error('Get doctor profile error:', error);
        res.status(500).json({ success: false, message: 'Server error' });
    }
});

module.exports = router;