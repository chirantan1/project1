const express = require('express');
const router = express.Router();
const { check, validationResult } = require('express-validator');
const moment = require('moment');
const Appointment = require('../models/Appointment');
const User = require('../models/User');
const authMiddleware = require('../middleware/auth');

// Enhanced validation error handler
const handleValidationErrors = (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        console.error('Validation errors:', errors.array());
        return res.status(400).json({
            success: false,
            message: 'Validation failed',
            errors: errors.array().map(err => ({
                param: err.param,
                msg: err.msg,
                value: err.value
            }))
        });
    }
    next();
};

// @route   POST /api/appointments
// @desc    Book a new appointment (patient)
// @access  Private
router.post(
    '/',
    authMiddleware.protect,
    [
        check('doctorId', 'Doctor ID is required').not().isEmpty().isMongoId(),
        check('date', 'Date is required and must be in YYYY-MM-DD format')
            .not().isEmpty()
            .isISO8601()
            .toDate()
            .custom((value, { req }) => {
                // Check if date is in the future
                if (moment(value).isBefore(moment(), 'day')) {
                    throw new Error('Cannot book appointments for past dates');
                }
                return true;
            }),
        check('time', 'Time is required and must be in HH:MM format (24-hour)')
            .not().isEmpty()
            .matches(/^([01]\d|2[0-3]):([0-5]\d)$/),
        check('symptoms', 'Symptoms description is required (min 10 characters)')
            .not().isEmpty()
            .isLength({ min: 10 })
    ],
    handleValidationErrors,
    async (req, res) => {
        const { doctorId, date, time, symptoms } = req.body;

        try {
            // Verify doctor exists and is actually a doctor
            const doctor = await User.findOne({ 
                _id: doctorId, 
                role: 'doctor' 
            }).select('name specialization');
            
            if (!doctor) {
                return res.status(404).json({
                    success: false,
                    message: 'Doctor not found or invalid doctor ID'
                });
            }

            // Create combined datetime object
            const [hours, minutes] = time.split(':').map(Number);
            const appointmentDateTime = moment(date)
                .set({ hour, minutes, second: 0, millisecond: 0 })
                .toDate();

            // Check for existing appointment at same time
            const existingAppointment = await Appointment.findOne({
                doctor: doctorId,
                date: {
                    $gte: moment(appointmentDateTime).startOf('hour').toDate(),
                    $lt: moment(appointmentDateTime).endOf('hour').toDate()
                },
                status: { $in: ['pending', 'confirmed'] }
            });

            if (existingAppointment) {
                return res.status(400).json({
                    success: false,
                    message: 'This time slot is already booked. Please choose another time.'
                });
            }

            // Create the appointment
            const appointment = await Appointment.create({
                doctor: doctorId,
                patient: req.user.id,
                date: appointmentDateTime,
                time, // Store time separately as well for easier querying
                symptoms,
                status: 'pending'
            });

            // Populate doctor info in response
            const populatedAppointment = await Appointment.populate(appointment, {
                path: 'doctor',
                select: 'name specialization'
            });

            res.status(201).json({
                success: true,
                message: 'Appointment booked successfully!',
                data: populatedAppointment
            });

        } catch (err) {
            console.error('Appointment booking error:', {
                error: err.message,
                stack: err.stack,
                body: req.body,
                user: req.user
            });

            if (err.name === 'ValidationError') {
                return res.status(400).json({
                    success: false,
                    message: 'Appointment validation failed',
                    errors: Object.values(err.errors).map(e => ({
                        param: e.path,
                        msg: e.message
                    }))
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
// @desc    Get patient's appointments with optional date filtering
// @access  Private
router.get('/patient', authMiddleware.protect, async (req, res) => {
    try {
        const { date } = req.query;
        let query = { patient: req.user.id };

        if (date) {
            if (!moment(date, 'YYYY-MM-DD', true).isValid()) {
                return res.status(400).json({
                    success: false,
                    message: 'Invalid date format. Use YYYY-MM-DD'
                });
            }
            query.date = {
                $gte: moment(date).startOf('day').toDate(),
                $lte: moment(date).endOf('day').toDate()
            };
        }

        const appointments = await Appointment.find(query)
            .populate('doctor', 'name specialization')
            .sort({ date: 1 }); // Sort by date ascending (earliest first)

        res.json({
            success: true,
            count: appointments.length,
            data: appointments
        });

    } catch (err) {
        console.error('Error fetching patient appointments:', err);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch appointments'
        });
    }
});

// @route   GET /api/appointments/doctor
// @desc    Get doctor's appointments with filtering options
// @access  Private (Doctor only)
router.get('/doctor', 
    authMiddleware.protect, 
    authMiddleware.authorize('doctor'),
    async (req, res) => {
        try {
            const { date, status } = req.query;
            let query = { doctor: req.user.id };

            if (date) {
                if (!moment(date, 'YYYY-MM-DD', true).isValid()) {
                    return res.status(400).json({
                        success: false,
                        message: 'Invalid date format. Use YYYY-MM-DD'
                    });
                }
                query.date = {
                    $gte: moment(date).startOf('day').toDate(),
                    $lte: moment(date).endOf('day').toDate()
                };
            }

            if (status) {
                query.status = status;
            }

            const appointments = await Appointment.find(query)
                .populate('patient', 'name email phone')
                .sort({ date: 1 });

            res.json({
                success: true,
                count: appointments.length,
                data: appointments
            });

        } catch (err) {
            console.error('Error fetching doctor appointments:', err);
            res.status(500).json({
                success: false,
                message: 'Failed to fetch appointments'
            });
        }
    }
);

// @route   PUT /api/appointments/:id/status
// @desc    Update appointment status
// @access  Private (Doctor only)
router.put(
    '/:id/status',
    [
        authMiddleware.protect,
        authMiddleware.authorize('doctor'),
        check('status', 'Invalid status value')
            .not().isEmpty()
            .isIn(['pending', 'confirmed', 'completed', 'cancelled'])
    ],
    handleValidationErrors,
    async (req, res) => {
        try {
            const { status } = req.body;

            const appointment = await Appointment.findOneAndUpdate(
                {
                    _id: req.params.id,
                    doctor: req.user.id,
                    status: { $ne: 'completed' } // Prevent modifying completed appointments
                },
                { status },
                {
                    new: true,
                    runValidators: true
                }
            ).populate('patient', 'name email');

            if (!appointment) {
                return res.status(404).json({
                    success: false,
                    message: 'Appointment not found or not modifiable'
                });
            }

            res.json({
                success: true,
                message: `Appointment status updated to ${status}`,
                data: appointment
            });

        } catch (err) {
            console.error('Status update error:', err);
            res.status(500).json({
                success: false,
                message: 'Failed to update appointment status'
            });
        }
    }
);

module.exports = router;