// server/controllers/appointments.js
const Appointment = require('../models/Appointment');
const User = require('../models/User'); // Assuming User model is for doctors and patients
const { validationResult } = require('express-validator'); // Import validationResult

// @desc    Create appointment
// @route   POST /api/appointments
// @access  Private (Patient)
exports.createAppointment = async (req, res) => {
    // --- START: Added express-validator error handling ---
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        console.error('Express-validator errors for createAppointment:', errors.array());
        return res.status(400).json({
            success: false,
            message: 'Invalid input data for appointment.', // Generic message
            errors: errors.array() // Send detailed validation errors to frontend
        });
    }
    // --- END: Added express-validator error handling ---

    try {
        const { doctorId, date, time, symptoms } = req.body;

        // --- NEW DEBUGGING LOGS: EXTREMELY IMPORTANT FOR DIAGNOSIS ---
        console.log('--- Debugging Appointment Creation Data ---');
        console.log(`Received doctorId: ${doctorId}`);
        console.log(`Received date: ${date}`);
        console.log(`Received time: '${time}' (Type: ${typeof time})`); // <--- THIS IS THE KEY LOG
        console.log(`Received symptoms: ${symptoms}`);
        console.log('------------------------------------------');
        // --- END NEW DEBUGGING LOGS ---

        // Your existing basic input validation can be removed or kept as a fallback
        // if express-validator handles these specific checks.
        // For 'required' checks, express-validator's .not().isEmpty() is sufficient.
        // If you keep this, ensure express-validator's messages align.
        // For now, I'll keep it as a redundant check, but it's less necessary with express-validator.
        if (!doctorId || !date || !time || !symptoms) {
            console.warn('Manual basic validation triggered: One or more fields are null/undefined/empty string:', { doctorId, date, time, symptoms });
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

        // Parse the date string into a Date object for comparison
        // express-validator's .toDate() can handle this before it reaches here
        const appointmentDate = new Date(date);
        const appointmentTime = time; // This is now guaranteed to be HH:MM by express-validator if it passed

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
            time: appointmentTime, // Mongoose will validate this 'time' value
            symptoms,
            status: 'pending' // New appointments are always pending initially
        });

        res.status(201).json({
            success: true,
            data: appointment
        });
    } catch (err) {
        console.error('Error in createAppointment:', err.message);
        if (err.name === 'ValidationError') { // Catch Mongoose validation errors specifically
            const messages = Object.values(err.errors).map(val => val.message);
            console.error('Mongoose Validation Errors Details:', err.errors); // Log Mongoose specific error details to see WHY it failed
            return res.status(400).json({
                success: false,
                message: messages.join(', ') || 'Appointment validation failed.',
                errors: err.errors // Send Mongoose validation errors too
            });
        }
        // Specifically check for Mongoose CastError if doctorId is malformed before express-validator
        if (err.kind === 'ObjectId') {
            return res.status(400).json({ success: false, message: 'Invalid doctor ID format.' });
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
        // Check for invalid MongoDB ObjectId format
        if (err.kind === 'ObjectId') {
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

        // Validate status input
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

        // Update the appointment status
        appointment.status = status;
        await appointment.save();

        res.status(200).json({
            success: true,
            message: `Appointment status updated to ${status} successfully!`,
            data: appointment
        });
    } catch (err) {
        console.error('Error in updateAppointmentStatus:', err.message);
        if (err.kind === 'ObjectId') {
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

        // Set status to cancelled
        appointment.status = 'cancelled';
        await appointment.save();

        res.status(200).json({
            success: true,
            message: 'Appointment cancelled successfully!',
            data: {} // No data needed on successful cancellation
        });
    } catch (err) {
        console.error('Error in cancelAppointment:', err.message);
        if (err.kind === 'ObjectId') {
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

        // Validate required parameters
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
        if (err.kind === 'ObjectId') {
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
        const newDate = date ? new Date(date) : appointment.date;
        const newTime = time || appointment.time;

        if (time && (newTime !== appointment.time || (date && newDate.toDateString() !== new Date(appointment.date).toDateString()))) {
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
        if (date !== undefined) appointment.date = new Date(date);
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
        if (err.kind === 'ObjectId') {
            return res.status(400).json({ success: false, message: 'Invalid appointment ID format.' });
        }
        res.status(500).json({
            success: false,
            message: 'Server Error: Could not update appointment details.'
        });
    }
};