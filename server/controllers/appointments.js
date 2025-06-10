// server/controllers/appointments.js
const Appointment = require('../models/Appointment');
const User = require('../models/User');
const { validationResult } = require('express-validator');
const moment = require('moment'); // Added for better date handling

// Helper function to validate time format
const isValidTimeFormat = (time) => {
    // This regex ensures HH:MM format (00-23 for hour, 00-59 for minute)
    return /^([01]\d|2[0-3]):([0-5]\d)$/.test(time);
};

// @desc    Create appointment
// @route   POST /api/appointments
// @access  Private (Patient)
exports.createAppointment = async (req, res) => {
    // Enhanced validation error handling from express-validator
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        console.error('Validation errors for createAppointment (express-validator):', {
            body: req.body, // Log the full request body if validation fails
            errors: errors.array()
        });
        return res.status(400).json({
            success: false,
            message: 'Validation failed', // Generic message, details in 'errors'
            errors: errors.array()
        });
    }

    try {
        const { doctorId, date, time, symptoms } = req.body;

        // --- CRUCIAL DEBUGGING LOGS: What value does 'time' actually have? ---
        console.log('--- DEBUGGING APPOINTMENT CREATION DATA ---');
        console.log('Received doctorId:', doctorId);
        console.log('Received date:', date);
        console.log('Received time:', `'${time}'`); // Log with quotes to see if it's empty string
        console.log('Type of time:', typeof time);
        console.log('Received symptoms:', symptoms);
        console.log('--- END DEBUGGING ---');


        // --- Manual Validations (can be partially redundant with express-validator, but good as a fallback) ---

        // Basic check for required fields. `express-validator` should ideally catch this.
        if (!doctorId || !date || !time || !symptoms) {
            console.warn('Manual basic validation triggered: Missing required fields.');
            return res.status(400).json({
                success: false,
                message: 'Please provide doctor ID, date, time, and symptoms for the appointment.'
            });
        }

        // Additional validation for time format (redundant if express-validator's .matches() is active)
        if (!isValidTimeFormat(time)) {
            console.warn('Manual time format validation failed for:', time);
            return res.status(400).json({
                success: false,
                message: 'Invalid time format. Please use HH:MM (24-hour format), e.g., 09:00 or 14:30.'
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

        // Parse and validate date using moment.js
        const appointmentDate = moment(date, 'YYYY-MM-DD', true); // 'true' for strict parsing
        if (!appointmentDate.isValid()) {
            console.warn('Moment.js date validation failed for:', date);
            return res.status(400).json({
                success: false,
                message: 'Invalid date format. Please use YYYY-MM-DD (e.g., 2025-06-10).'
            });
        }

        // Check if date is in the past (using moment.js)
        // Using moment().startOf('day') to compare against the start of the current day
        if (appointmentDate.isBefore(moment().startOf('day'))) {
            return res.status(400).json({
                success: false,
                message: 'Cannot book appointments for past dates. Please select a future date.'
            });
        }

        // --- End Manual Validations ---


        // Check if appointment slot is already booked for this doctor on this date and time
        const existingAppointment = await Appointment.findOne({
            doctor: doctorId,
            date: appointmentDate.toDate(), // Convert moment object to native Date
            time: time,
            status: { $in: ['pending', 'confirmed'] } // Only consider pending or confirmed as booked
        });

        if (existingAppointment) {
            return res.status(400).json({
                success: false,
                message: 'This time slot is already booked for the selected doctor. Please choose another time or date.'
            });
        }

        // Create the appointment
        const appointment = await Appointment.create({
            doctor: doctorId,
            patient: req.user.id, // req.user.id should be set by your authentication middleware
            date: appointmentDate.toDate(), // Save as native Date object
            time: time, // Save as HH:MM string
            symptoms,
            status: 'pending' // New appointments are always pending initially
        });

        res.status(201).json({
            success: true,
            message: 'Appointment booked successfully!',
            data: appointment
        });

    } catch (err) {
        console.error('Catch block - Error in createAppointment:', {
            error: err.message,
            name: err.name,
            stack: err.stack, // Full stack trace for deeper debugging
            requestBody: req.body // Log request body for context
        });

        if (err.name === 'CastError') { // Mongoose CastError (e.g., invalid ObjectId)
            return res.status(400).json({
                success: false,
                message: `Invalid ID format for ${err.path}. Please check the provided ID.`
            });
        }

        if (err.name === 'ValidationError') { // Mongoose validation errors (e.g., required, match)
            const messages = Object.values(err.errors).map(val => val.message);
            console.error('Mongoose Validation Error Details:', err.errors); // Log full Mongoose error details
            return res.status(400).json({
                success: false,
                message: messages.join('; ') || 'Appointment validation failed during database save.',
                errors: err.errors // Send full Mongoose errors object to frontend
            });
        }

        // Generic server error
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
        if (err.name === 'CastError') {
            return res.status(400).json({ success: false, message: 'Invalid patient ID format.' });
        }
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
        if (err.name === 'CastError') {
            return res.status(400).json({ success: false, message: 'Invalid doctor ID format.' });
        }
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
        const queryDate = moment(date, 'YYYY-MM-DD', true).startOf('day'); // Use moment for parsing and startOf('day')
        if (!queryDate.isValid()) {
             return res.status(400).json({
                success: false,
                message: 'Invalid date format for availability. Please use YYYY-MM-DD.'
             });
        }


        // Get all appointments for this doctor on this specific day
        const appointments = await Appointment.find({
            doctor: doctorId,
            date: {
                $gte: queryDate.toDate(), // Greater than or equal to the start of the day
                $lt: moment(queryDate).add(1, 'days').toDate() // Less than the start of the next day
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
    // Basic validation for update fields
    const errors = validationResult(req); // Assuming you'd have validation for update too
    if (!errors.isEmpty()) {
        console.error('Validation errors for updateAppointment (express-validator):', errors.array());
        return res.status(400).json({
            success: false,
            message: 'Invalid input data for update.',
            errors: errors.array()
        });
    }

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

        // Prepare new date and time values, using moment for parsing if date is updated
        let newDate = appointment.date;
        if (date !== undefined) {
            const parsedDate = moment(date, 'YYYY-MM-DD', true);
            if (!parsedDate.isValid()) {
                return res.status(400).json({
                    success: false,
                    message: 'Invalid date format for update. Please use YYYY-MM-DD.'
                });
            }
            newDate = parsedDate.toDate();
        }
        
        let newTime = appointment.time;
        if (time !== undefined) {
            if (!isValidTimeFormat(time)) { // Validate time format
                return res.status(400).json({
                    success: false,
                    message: 'Invalid time format for update. Please use HH:MM (24-hour format).'
                });
            }
            newTime = time;
        }

        // Check for slot availability only if time or date is actually changing
        const isTimeChanging = time !== undefined && newTime !== appointment.time;
        const isDateChanging = date !== undefined && newDate.toDateString() !== appointment.date.toDateString();

        if (isTimeChanging || isDateChanging) {
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
                    message: 'The requested time slot is already booked for this doctor. Please choose another time or date.'
                });
            }
        }

        // Update allowed fields only if they are defined in the request body
        if (date !== undefined) appointment.date = newDate;
        if (time !== undefined) appointment.time = newTime;
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