const mongoose = require('mongoose');

const AppointmentSchema = new mongoose.Schema({
  doctor: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  patient: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  date: {
    type: Date,
    required: [true, 'Please add a date']
  },
  time: {
    type: String,
    required: [true, 'Please add a time'],
    // FIX: Updated regex to match express-validator's stricter HH:MM format
    match: [
      /^([01]\d|2[0-3]):([0-5]\d)$/, // Requires two digits for hour (00-23) and two for minute (00-59)
      'Please enter a valid time in HH:MM format (e.g., 09:00)'
    ]
  },
  symptoms: {
    type: String,
    required: [true, 'Please add symptoms or reason for appointment']
  },
  status: {
    type: String,
    enum: ['pending', 'confirmed', 'cancelled', 'completed'],
    default: 'pending'
  },
  notes: {
    type: String,
    default: ''
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

module.exports = mongoose.model('Appointment', AppointmentSchema);