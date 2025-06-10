const express = require('express');
const router = express.Router();
const { check, validationResult } = require('express-validator');
const Appointment = require('../models/Appointment'); // Ensure this path is correct
const User = require('../models/User'); // Ensure this path is correct
const authMiddleware = require('../middleware/auth'); // Ensure this path is correct

// Utility to handle validation errors
const handleValidationErrors = (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({
            success: false,
            errors: errors.array(),
            message: 'Validation failed' // Added a general message for clarity
        });
    }
    next(); // Pass control to the next middleware/route handler if no errors
};

// @route   POST /api/appointments
// @desc    Book a new appointment (patient)
// @access  Private
router.post(
    '/',
    authMiddleware.protect,
    [
        check('doctorId', 'Doctor ID is required').not().isEmpty(),
        // Validate date format and convert to Date object
        check('date', 'Date is required and must be a valid YYYY-MM-DD format').isISO8601().toDate(),
        // Validate time format (HH:MM)
        check('time', 'Time is required and must be in HH:MM format (e.g., 09:00)').not().isEmpty().matches(/^([0-1]\d|2[0-3]):([0-5]\d)$/),
        check('symptoms', 'Symptoms are required').not().isEmpty()
    ],
    handleValidationErrors, // Apply validation middleware
    async (req, res) => {
        const { doctorId, date, time, symptoms } = req.body;

        try {
            const doctor = await User.findById(doctorId);
            if (!doctor || doctor.role !== 'doctor') {
                return res.status(404).json({
                    success: false,
                    message: 'Doctor not found or invalid doctor role.'
                });
            }

            // Combine date (which is already a Date object from isISO8601().toDate()) and time string
            // to create a complete Date object for storage in MongoDB.
            // Note: The `date` variable here is already a Date object, but we construct a new one
            // to ensure the time component is correctly added based on the `time` string.
            const appointmentDateTime = new Date(date); // Start with the date part
            const [hours, minutes] = time.split(':').map(Number);
            appointmentDateTime.setHours(hours, minutes, 0, 0); // Set hours and minutes to the Date object

            // Optional: Check if the appointment is in the past
            if (appointmentDateTime < new Date()) {
                return res.status(400).json({
                    success: false,
                    message: 'Cannot book an appointment in the past.'
                });
            }

            const appointment = await Appointment.create({
                doctor: doctorId,
                patient: req.user.id, // Set by authMiddleware.protect
                date: appointmentDateTime, // Store the combined Date object
                symptoms,
                status: 'pending' // Default status for new appointments
            });

            res.status(201).json({
                success: true,
                message: 'Appointment booked successfully!',
                data: appointment
            });
        } catch (err) {
            console.error('Booking appointment error:', err.message);
            // Check if it's a Mongoose validation error
            if (err.name === 'ValidationError') {
                return res.status(400).json({
                    success: false,
                    message: 'Invalid input data for appointment.',
                    errors: err.errors // Mongoose validation errors details
                });
            }
            res.status(500).json({
                success: false,
                message: 'Server error while booking appointment. Please try again later.'
            });
        }
    }
);

// @route   GET /api/appointments/patient
// @desc    Get all appointments for logged-in patient
// @access  Private
router.get('/patient', authMiddleware.protect, async (req, res) => {
    try {
        const appointments = await Appointment.find({ patient: req.user.id })
            .populate('doctor', 'name specialization') // Populate doctor details
            .sort({ date: -1 }); // Sort by date, newest first

        res.json({
            success: true,
            count: appointments.length,
            data: appointments
        });
    } catch (err) {
        console.error('Error fetching patient appointments:', err.message);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch appointments for patient. Server error.'
        });
    }
});

// @route   GET /api/appointments/doctor
// @desc    Get all appointments for logged-in doctor
// @access  Private (Doctor only)
router.get('/doctor', authMiddleware.protect, authMiddleware.authorize('doctor'), async (req, res) => {
    try {
        const appointments = await Appointment.find({ doctor: req.user.id })
            .populate('patient', 'name email phone') // Populate patient details
            .sort({ date: -1 }); // Sort by date, newest first

        res.json({
            success: true,
            count: appointments.length,
            data: appointments
        });
    } catch (err) {
        console.error('Error fetching doctor appointments:', err.message);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch appointments for doctor. Server error.'
        });
    }
});

// @route   PUT /api/appointments/:id/status
// @desc    Update appointment status (approve/reject/complete)
// @access  Private (Doctor only)
router.put(
    '/:id/status',
    [
        authMiddleware.protect,
        authMiddleware.authorize('doctor'),
        // Validate status to be one of the allowed values
        check('status', 'Status is required').not().isEmpty().isIn(['pending', 'confirmed', 'completed', 'cancelled']),
    ],
    handleValidationErrors, // Apply validation middleware
    async (req, res) => {
        try {
            const { status } = req.body;

            const appointment = await Appointment.findOneAndUpdate(
                { _id: req.params.id, doctor: req.user.id }, // Find by ID and ensure the doctor owns it
                { status: status },
                { new: true, runValidators: true } // Return the updated document and run Mongoose schema validators
            ).populate('patient', 'name email'); // Populate patient info for the response

            if (!appointment) {
                return res.status(404).json({
                    success: false,
                    message: 'Appointment not found or you are not authorized to update its status.'
                });
            }

            res.json({
                success: true,
                message: `Appointment status updated to ${status}.`,
                data: appointment
            });
        } catch (err) {
            console.error('Update appointment status error:', err.message);
            res.status(500).json({
                success: false,
                message: 'Server error while updating appointment status. Please try again later.'
            });
        }
    }
);

module.exports = router;