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
        // IMPORTANT: Return here to stop execution if there are validation errors
        return res.status(400).json({
            success: false,
            errors: errors.array()
        });
    }
    // If no errors, implicitly return or return true, but the key is to prevent further execution
    // in the calling route handler when errors are present.
    return true; // Indicate that validation passed, though not strictly necessary if called as below
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
        // Fix: Check the return value of handleValidationErrors
        const validationPassed = handleValidationErrors(req, res);
        if (validationPassed !== true) {
            return; // Stop execution if validation failed and a response was already sent
        }

        const { doctorId, date, time, symptoms } = req.body;

        try {
            const doctor = await User.findById(doctorId);
            if (!doctor || doctor.role !== 'doctor') {
                return res.status(404).json({
                    success: false,
                    message: 'Doctor not found'
                });
            }

            // Ensure date and time are in correct format for the unique index check
            // The schema has a regex for time, so ensure it's passed as a string like "HH:MM"
            // For date, you might want to convert to ISO string or just pass the Date object directly
            // The unique index handles this by combining doctor, date, and time.

            // Optional: Check for existing appointment for the specific doctor at the exact date/time
            // This adds a layer of protection before attempting to create. Mongoose unique index
            // will also catch this at the database level but this can provide a cleaner error message.
            const existingAppointment = await Appointment.findOne({
                doctor: doctorId,
                date: new Date(date), // Ensure date is a Date object for comparison
                time: time // Time is already a string in HH:MM
            });

            if (existingAppointment) {
                return res.status(409).json({ // 409 Conflict
                    success: false,
                    message: 'This doctor is already booked at the specified date and time.'
                });
            }

            const appointment = await Appointment.create({
                doctor: doctorId,
                patient: req.user.id,
                date: new Date(date), // Store as Date object
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
            // Check for Mongoose duplicate key error (code 11000) specifically for unique index
            if (err.code === 11000) {
                return res.status(409).json({ // 409 Conflict
                    success: false,
                    message: 'This appointment slot is already taken by the doctor. Please choose a different time.'
                });
            }
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
        const appointments = await Appointment.find({ patient: req.user.id })
            .populate('doctor', 'name specialization')
            .sort({ date: 1, time: 1 }); // Sort by date and then time for better display

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
            .sort({ date: 1, time: 1 }); // Sort by date and then time for better display

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
        // Fix: Check the return value of handleValidationErrors
        const validationPassed = handleValidationErrors(req, res);
        if (validationPassed !== true) {
            return; // Stop execution if validation failed
        }

        try {
            // Find the appointment and ensure it belongs to the logged-in doctor
            const appointment = await Appointment.findOneAndUpdate(
                { _id: req.params.id, doctor: req.user.id },
                { status: req.body.status },
                { new: true } // Return the modified document rather than the original
            ).populate('patient', 'name email');

            if (!appointment) {
                return res.status(404).json({
                    success: false,
                    message: 'Appointment not found or not authorized' // More specific message
                });
            }

            res.json({
                success: true,
                data: appointment
            });
        } catch (err) {
            console.error('Update appointment status error:', err.message);
            res.status(500).json({
                success: false,
                message: 'Server Error updating appointment status'
            });
        }
    }
);

// @route   DELETE /api/appointments/:id
// @desc    Cancel/Delete an appointment
// @access  Private (Patient who booked, or Doctor who owns it)
router.delete(
    '/:id',
    authMiddleware.protect,
    async (req, res) => {
        try {
            const appointment = await Appointment.findById(req.params.id);

            if (!appointment) {
                return res.status(404).json({
                    success: false,
                    message: 'Appointment not found'
                });
            }

            // Check if the user is the patient who booked or the doctor associated with the appointment
            if (appointment.patient.toString() !== req.user.id && appointment.doctor.toString() !== req.user.id) {
                return res.status(403).json({
                    success: false,
                    message: 'Not authorized to delete this appointment'
                });
            }

            // Optionally, you might want to prevent deletion of 'completed' appointments
            // if (appointment.status === 'completed') {
            //     return res.status(400).json({
            //         success: false,
            //         message: 'Cannot delete completed appointments'
            //     });
            // }

            await appointment.deleteOne(); // Use deleteOne() on the document instance

            res.json({
                success: true,
                message: 'Appointment cancelled successfully'
            });

        } catch (err) {
            console.error('Delete appointment error:', err.message);
            res.status(500).json({
                success: false,
                message: 'Server Error deleting appointment'
            });
        }
    }
);


module.exports = router;
