// server/controllers/appointments.js
const Appointment = require('../models/Appointment');
const User = require('../models/User');
const { validationResult } = require('express-validator'); // Import validationResult

// @desc    Create appointment
// @route   POST /api/appointments
// @access  Private (Patient)
exports.createAppointment = async (req, res) => {
    // --- START: express-validator error handling ---
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        console.error('Validation errors for createAppointment:', errors.array());
        return res.status(400).json({
            success: false,
            message: 'Invalid input data for appointment.', // Generic message
            errors: errors.array() // Send detailed validation errors to frontend
        });
    }
    // --- END: express-validator error handling ---

    try {
        const { doctorId, date, time, symptoms } = req.body;

        // Basic check for required fields (can be redundant if express-validator is exhaustive)
        if (!doctorId || !date || !time || !symptoms) {
            return res.status(400).json({
                success: false,
                message: 'Please provide doctor ID, date, time, and symptoms for the appointment.'
            });
        }

        // Verify doctor exists and has the 'doctor' role
        const doctor = await User.findById(doctorId);
        if (!doctor || doctor.role !== 'doctor') {
            return res.status(400).json({
                success: false,
                message: 'Invalid doctor ID or doctor not found.'
            });
        }

        // Parse the date string into a Date object for comparison and storage
        const appointmentDate = new Date(date);
        const appointmentTime = time; // Time should be HH:MM string from express-validator

        // Check if appointment slot is already booked for this doctor on this date and time
        const existingAppointment = await Appointment.findOne({
            doctor: doctorId,
            date: appointmentDate,
            time: appointmentTime,
            status: { $in: ['pending', 'confirmed'] } // Only consider pending or confirmed as booked
        });

        if (existingAppointment) {
            return res.status(400).json({
                success: false,
                message: 'This time slot is already booked for the selected doctor.'
            });
        }

        // Create the new appointment
        const appointment = await Appointment.create({
            doctor: doctorId,
            patient: req.user.id, // req.user.id should be set by your authentication middleware
            date: appointmentDate,
            time: appointmentTime,
            symptoms,
            status: 'pending' // New appointments are always pending initially
        });

        res.status(201).json({
            success: true,
            data: appointment
        });
    } catch (err) {
        console.error('Error in createAppointment:', err.message);
        if (err.name === 'CastError') { // Mongoose CastError for invalid IDs
            return res.status(400).json({ success: false, message: `Invalid ID format for ${err.path}.` });
        }
        if (err.name === 'ValidationError') { // Mongoose validation errors
            const messages = Object.values(err.errors).map(val => val.message);
            return res.status(400).json({ success: false, message: messages.join(', ') });
        }
        res.status(500).json({
            success: false,
            message: 'Server Error: Could not create appointment. Please try again later.'
        });
    }
};

// @desc    Get patient appointments
// @route   GET /api/appointments/patient
// @access  Private (Patient)
exports.getPatientAppointments = async (req, res) => {
    try {
        const appointments = await Appointment.find({ patient: req.user.id })
            .populate('doctor', 'name email specialization') // Populate doctor details
            .sort('-date -time'); // Sort by date (desc) then time (desc)

        res.status(200).json({
            success: true,
            count: appointments.length,
            data: appointments
        });
    } catch (err) {
        console.error('Error in getPatientAppointments:', err.message);
        res.status(500).json({
            success: false,
            message: 'Server Error: Could not retrieve patient appointments.'
        });
    }
};

// @desc    Get doctor appointments
// @route   GET /api/appointments/doctor
// @access  Private (Doctor only)
exports.getDoctorAppointments = async (req, res) => {
    try {
        const appointments = await Appointment.find({ doctor: req.user.id })
            .populate('patient', 'name email') // Populate patient details
            .sort('-date -time'); // Sort by date (desc) then time (desc)

        res.status(200).json({
            success: true,
            count: appointments.length,
            data: appointments
        });
    } catch (err) {
        console.error('Error in getDoctorAppointments:', err.message);
        res.status(500).json({
            success: false,
            message: 'Server Error: Could not retrieve doctor appointments.'
        });
    }
};

// @desc    Get single appointment
// @route   GET /api/appointments/:id
// @access  Private
exports.getAppointment = async (req, res) => {
    try {
        const appointment = await Appointment.findById(req.params.id)
            .populate('doctor', 'name email specialization')
            .populate('patient', 'name email');

        if (!appointment) {
            return res.status(404).json({
                success: false,
                message: 'Appointment not found.'
            });
        }

        // Verify the requesting user is either the patient or the doctor for this appointment
        if (appointment.patient._id.toString() !== req.user.id &&
            appointment.doctor._id.toString() !== req.user.id) {
            return res.status(401).json({
                success: false,
                message: 'Not authorized to access this appointment.'
            });
        }

        res.status(200).json({
            success: true,
            data: appointment
        });
    } catch (err) {
        console.error('Error in getAppointment:', err.message);
        if (err.name === 'CastError') {
            return res.status(400).json({ success: false, message: 'Invalid appointment ID format.' });
        }
        res.status(500).json({
            success: false,
            message: 'Server Error: Could not retrieve appointment.'
        });
    }
};

// @desc    Update appointment status
// @route   PUT /api/appointments/:id/status
// @access  Private (Doctor only)
exports.updateAppointmentStatus = async (req, res) => {
    try {
        const { status } = req.body; // Extract status from request body

        if (!status) {
            return res.status(400).json({
                success: false,
                message: 'Please provide a status to update.'
            });
        }

        const appointment = await Appointment.findById(req.params.id);

        if (!appointment) {
            return res.status(404).json({
                success: false,
                message: 'Appointment not found.'
            });
        }

        // Verify the requesting user is the doctor associated with this appointment
        if (appointment.doctor.toString() !== req.user.id) {
            return res.status(401).json({
                success: false,
                message: 'Not authorized to update this appointment.'
            });
        }

        // Validate if the new status is a permissible value
        const validStatuses = ['pending', 'confirmed', 'cancelled', 'completed'];
        if (!validStatuses.includes(status)) {
            return res.status(400).json({
                success: false,
                message: `Invalid status value. Allowed values are: ${validStatuses.join(', ')}.`
            });
        }

        appointment.status = status;
        await appointment.save();

        res.status(200).json({
            success: true,
            message: `Appointment status updated to ${status} successfully!`,
            data: appointment
        });
    } catch (err) {
        console.error('Error in updateAppointmentStatus:', err.message);
        if (err.name === 'CastError') {
            return res.status(400).json({ success: false, message: 'Invalid appointment ID format.' });
        }
        res.status(500).json({
            success: false,
            message: 'Server Error: Could not update appointment status.'
        });
    }
};

// @desc    Cancel appointment
// @route   DELETE /api/appointments/:id
// @access  Private (Patient or Doctor)
exports.cancelAppointment = async (req, res) => {
    try {
        const appointment = await Appointment.findById(req.params.id);

        if (!appointment) {
            return res.status(404).json({
                success: false,
                message: 'Appointment not found.'
            });
        }

        // Verify the requesting user is either the patient or the doctor
        if (appointment.patient.toString() !== req.user.id &&
            appointment.doctor.toString() !== req.user.id) {
            return res.status(401).json({
                success: false,
                message: 'Not authorized to cancel this appointment.'
            });
        }

        // Prevent cancellation if already completed or cancelled
        if (appointment.status === 'cancelled' || appointment.status === 'completed') {
            return res.status(400).json({
                success: false,
                message: 'Cannot cancel an appointment that is already cancelled or completed.'
            });
        }

        appointment.status = 'cancelled';
        await appointment.save();

        res.status(200).json({
            success: true,
            message: 'Appointment cancelled successfully!',
            data: {} // No data needed on successful cancellation
        });
    } catch (err) {
        console.error('Error in cancelAppointment:', err.message);
        if (err.name === 'CastError') {
            return res.status(400).json({ success: false, message: 'Invalid appointment ID format.' });
        }
        res.status(500).json({
            success: false,
            message: 'Server Error: Could not cancel appointment.'
        });
    }
};

// @desc    Get available time slots for a doctor on a specific date
// @route   GET /api/appointments/availability/:doctorId
// @access  Private
exports.getAvailableSlots = async (req, res) => {
    try {
        const { date } = req.query; // Date passed as query parameter
        const doctorId = req.params.doctorId;

        if (!date || !doctorId) {
            return res.status(400).json({
                success: false,
                message: 'Both date and doctorId parameters are required.'
            });
        }

        // Verify doctor exists and has the 'doctor' role
        const doctor = await User.findById(doctorId);
        if (!doctor || doctor.role !== 'doctor') {
            return res.status(400).json({
                success: false,
                message: 'Invalid doctor ID or doctor not found.'
            });
        }

        // Convert the query date string to a Date object (start of the day)
        const queryDate = new Date(date);
        queryDate.setHours(0, 0, 0, 0); // Normalize to start of the day for range query

        // Get all appointments for this doctor on this specific day
        const appointments = await Appointment.find({
            doctor: doctorId,
            date: {
                $gte: queryDate, // Greater than or equal to the start of the day
                $lt: new Date(queryDate.getTime() + 24 * 60 * 60 * 1000) // Less than the start of the next day
            },
            status: { $in: ['pending', 'confirmed'] } // Only consider pending or confirmed as booked
        });

        // Extract booked time slots
        const bookedSlots = appointments.map(appt => appt.time);

        // Generate all possible time slots (example: 9am to 5pm in 30-minute intervals)
        const allSlots = [];
        const startHour = 9; // 9 AM
        const endHour = 17; // 5 PM (meaning up to 4:30 PM slot)

        for (let hour = startHour; hour < endHour; hour++) {
            for (let minute = 0; minute < 60; minute += 30) {
                const timeString = `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`;
                allSlots.push(timeString);
            }
        }

        // Filter out booked slots to get available ones
        const availableSlots = allSlots.filter(slot => !bookedSlots.includes(slot));

        res.status(200).json({
            success: true,
            data: availableSlots
        });
    } catch (err) {
        console.error('Error in getAvailableSlots:', err.message);
        if (err.name === 'CastError') {
            return res.status(400).json({ success: false, message: 'Invalid doctor ID format.' });
        }
        res.status(500).json({
            success: false,
            message: 'Server Error: Could not retrieve available slots.'
        });
    }
};

// @desc    Update appointment details
// @route   PUT /api/appointments/:id
// @access  Private (Patient only)
exports.updateAppointment = async (req, res) => {
    try {
        const { date, time, symptoms } = req.body;

        const appointment = await Appointment.findById(req.params.id);

        if (!appointment) {
            return res.status(404).json({
                success: false,
                message: 'Appointment not found.'
            });
        }

        // Verify the requesting user is the patient for this appointment
        if (appointment.patient.toString() !== req.user.id) {
            return res.status(401).json({
                success: false,
                message: 'Not authorized to update this appointment.'
            });
        }

        // Only allow updates if the appointment status is 'pending'
        if (appointment.status !== 'pending') {
            return res.status(400).json({
                success: false,
                message: 'Cannot update an appointment that is not pending.'
            });
        }

        // If date or time is being updated, check for new slot availability
        // Convert date to Date object if provided, otherwise use existing
        const newDate = date ? new Date(date) : appointment.date;
        const newTime = time || appointment.time;

        // Check for slot availability only if time or date is actually changing
        if (time !== undefined && (newTime !== appointment.time || (date !== undefined && newDate.toDateString() !== new Date(appointment.date).toDateString()))) {
            const existingAppointment = await Appointment.findOne({
                doctor: appointment.doctor,
                date: newDate,
                time: newTime,
                status: { $in: ['pending', 'confirmed'] },
                _id: { $ne: appointment._id } // Exclude current appointment from the check
            });

            if (existingAppointment) {
                return res.status(400).json({
                    success: false,
                    message: 'The requested time slot is already booked for this doctor.'
                });
            }
        }

        // Update allowed fields
        if (date !== undefined) appointment.date = new Date(date); // Ensure date is stored as Date object
        if (time !== undefined) appointment.time = time;
        if (symptoms !== undefined) appointment.symptoms = symptoms;

        await appointment.save();

        res.status(200).json({
            success: true,
            message: 'Appointment updated successfully!',
            data: appointment
        });
    } catch (err) {
        console.error('Error in updateAppointment:', err.message);
        if (err.name === 'CastError') {
            return res.status(400).json({ success: false, message: 'Invalid appointment ID format.' });
        }
        if (err.name === 'ValidationError') {
            const messages = Object.values(err.errors).map(val => val.message);
            return res.status(400).json({ success: false, message: messages.join(', ') });
        }
        res.status(500).json({
            success: false,
            message: 'Server Error: Could not update appointment details.'
        });
    }
};