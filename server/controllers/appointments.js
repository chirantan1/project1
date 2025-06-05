const Appointment = require('../models/Appointment');
const User = require('../models/User');

// @desc    Create appointment
// @route   POST /api/appointments
// @access  Private
exports.createAppointment = async (req, res) => {
  try {
    // Verify doctor exists
    const doctor = await User.findById(req.body.doctorId);
    if (!doctor || doctor.role !== 'doctor') {
      return res.status(400).json({ 
        success: false,
        error: 'Invalid doctor ID' 
      });
    }

    // Check if appointment slot is available
    const existingAppointment = await Appointment.findOne({
      doctor: req.body.doctorId,
      date: req.body.date,
      time: req.body.time,
      status: { $in: ['pending', 'confirmed'] }
    });

    if (existingAppointment) {
      return res.status(400).json({
        success: false,
        error: 'This time slot is already booked'
      });
    }

    const appointment = await Appointment.create({
      doctor: req.body.doctorId,
      patient: req.user.id,
      date: req.body.date,
      time: req.body.time,
      symptoms: req.body.symptoms,
      status: 'pending'
    });

    res.status(201).json({
      success: true,
      data: appointment
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ 
      success: false,
      error: 'Server Error' 
    });
  }
};

// @desc    Get patient appointments
// @route   GET /api/appointments/patient
// @access  Private
exports.getPatientAppointments = async (req, res) => {
  try {
    const appointments = await Appointment.find({ patient: req.user.id })
      .populate('doctor', 'name email specialization')
      .sort('-date -time');

    res.json({
      success: true,
      count: appointments.length,
      data: appointments
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ 
      success: false,
      error: 'Server Error' 
    });
  }
};

// @desc    Get doctor appointments
// @route   GET /api/appointments/doctor
// @access  Private (Doctor only)
exports.getDoctorAppointments = async (req, res) => {
  try {
    const appointments = await Appointment.find({ doctor: req.user.id })
      .populate('patient', 'name email')
      .sort('-date -time');

    res.json({
      success: true,
      count: appointments.length,
      data: appointments
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ 
      success: false,
      error: 'Server Error' 
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
        error: 'Appointment not found'
      });
    }

    // Verify the requesting user is either the patient or doctor
    if (appointment.patient._id.toString() !== req.user.id && 
        appointment.doctor._id.toString() !== req.user.id) {
      return res.status(401).json({
        success: false,
        error: 'Not authorized to access this appointment'
      });
    }

    res.json({
      success: true,
      data: appointment
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ 
      success: false,
      error: 'Server Error' 
    });
  }
};

// @desc    Update appointment status
// @route   PUT /api/appointments/:id/status
// @access  Private (Doctor only)
exports.updateAppointmentStatus = async (req, res) => {
  try {
    const appointment = await Appointment.findById(req.params.id);

    if (!appointment) {
      return res.status(404).json({
        success: false,
        error: 'Appointment not found'
      });
    }

    // Verify the requesting user is the doctor
    if (appointment.doctor.toString() !== req.user.id) {
      return res.status(401).json({
        success: false,
        error: 'Not authorized to update this appointment'
      });
    }

    // Validate status
    const validStatuses = ['pending', 'confirmed', 'cancelled', 'completed'];
    if (!validStatuses.includes(req.body.status)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid status value'
      });
    }

    appointment.status = req.body.status;
    await appointment.save();

    res.json({
      success: true,
      data: appointment
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ 
      success: false,
      error: 'Server Error' 
    });
  }
};

// @desc    Cancel appointment
// @route   DELETE /api/appointments/:id
// @access  Private
exports.cancelAppointment = async (req, res) => {
  try {
    const appointment = await Appointment.findById(req.params.id);

    if (!appointment) {
      return res.status(404).json({
        success: false,
        error: 'Appointment not found'
      });
    }

    // Verify the requesting user is either the patient or doctor
    if (appointment.patient.toString() !== req.user.id && 
        appointment.doctor.toString() !== req.user.id) {
      return res.status(401).json({
        success: false,
        error: 'Not authorized to cancel this appointment'
      });
    }

    // Only allow cancellation if status is pending or confirmed
    if (!['pending', 'confirmed'].includes(appointment.status)) {
      return res.status(400).json({
        success: false,
        error: 'Cannot cancel an appointment that is already cancelled or completed'
      });
    }

    appointment.status = 'cancelled';
    await appointment.save();

    res.json({
      success: true,
      data: {}
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ 
      success: false,
      error: 'Server Error' 
    });
  }
};

// @desc    Get available time slots for a doctor on a specific date
// @route   GET /api/appointments/availability/:doctorId
// @access  Private
exports.getAvailableSlots = async (req, res) => {
  try {
    const { date } = req.query;
    const doctorId = req.params.doctorId;

    if (!date) {
      return res.status(400).json({
        success: false,
        error: 'Date parameter is required'
      });
    }

    // Verify doctor exists
    const doctor = await User.findById(doctorId);
    if (!doctor || doctor.role !== 'doctor') {
      return res.status(400).json({ 
        success: false,
        error: 'Invalid doctor ID' 
      });
    }

    // Get all appointments for this doctor on this date
    const appointments = await Appointment.find({
      doctor: doctorId,
      date: new Date(date),
      status: { $in: ['pending', 'confirmed'] }
    });

    // Get booked time slots
    const bookedSlots = appointments.map(appt => appt.time);

    // Generate all possible time slots (example: 9am to 5pm in 30-minute intervals)
    const allSlots = [];
    const startHour = 9; // 9am
    const endHour = 17; // 5pm
    
    for (let hour = startHour; hour < endHour; hour++) {
      for (let minute = 0; minute < 60; minute += 30) {
        const timeString = `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`;
        allSlots.push(timeString);
      }
    }

    // Filter out booked slots
    const availableSlots = allSlots.filter(slot => !bookedSlots.includes(slot));

    res.json({
      success: true,
      data: availableSlots
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ 
      success: false,
      error: 'Server Error' 
    });
  }
};

// @desc    Update appointment details
// @route   PUT /api/appointments/:id
// @access  Private
exports.updateAppointment = async (req, res) => {
  try {
    const appointment = await Appointment.findById(req.params.id);

    if (!appointment) {
      return res.status(404).json({
        success: false,
        error: 'Appointment not found'
      });
    }

    // Verify the requesting user is the patient
    if (appointment.patient.toString() !== req.user.id) {
      return res.status(401).json({
        success: false,
        error: 'Not authorized to update this appointment'
      });
    }

    // Only allow updates if status is pending
    if (appointment.status !== 'pending') {
      return res.status(400).json({
        success: false,
        error: 'Cannot update an appointment that is not pending'
      });
    }

    // Check if new time slot is available
    if (req.body.time && req.body.time !== appointment.time) {
      const existingAppointment = await Appointment.findOne({
        doctor: appointment.doctor,
        date: req.body.date || appointment.date,
        time: req.body.time,
        status: { $in: ['pending', 'confirmed'] }
      });

      if (existingAppointment) {
        return res.status(400).json({
          success: false,
          error: 'This time slot is already booked'
        });
      }
    }

    // Update allowed fields
    const allowedUpdates = ['date', 'time', 'symptoms'];
    allowedUpdates.forEach(field => {
      if (req.body[field] !== undefined) {
        appointment[field] = req.body[field];
      }
    });

    await appointment.save();

    res.json({
      success: true,
      data: appointment
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ 
      success: false,
      error: 'Server Error' 
    });
  }
};