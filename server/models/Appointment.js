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
    match: [
      /^([01]?[0-9]|2[0-3]):[0-5][0-9]$/,
      'Please enter a valid time in HH:MM format'
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
