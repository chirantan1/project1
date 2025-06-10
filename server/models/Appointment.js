const mongoose = require('mongoose');

const AppointmentSchema = new mongoose.Schema({
    doctor: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User', // Refers to the User model (assuming User model has a role 'doctor')
        required: true
    },
    patient: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User', // Refers to the User model (assuming User model has a role 'patient')
        required: true
    },
    date: {
        type: Date,
        required: [true, 'Please add a date']
    },
    time: {
        type: String,
        required: [true, 'Please add a time'],
        trim: true, // Trim whitespace from the time string
        match: [
            /^([01]?[0-9]|2[0-3]):[0-5][0-9]$/, // Validates HH:MM format
            'Please enter a valid time in HH:MM format'
        ]
    },
    symptoms: {
        type: String,
        required: [true, 'Please add symptoms or reason for appointment'],
        trim: true // Trim whitespace from symptoms
    },
    status: {
        type: String,
        enum: ['pending', 'confirmed', 'cancelled', 'completed'],
        default: 'pending'
    },
    notes: {
        type: String,
        default: '',
        trim: true // Trim whitespace from notes
    },
    createdAt: {
        type: Date,
        default: Date.now
    }
});

// Add a compound unique index to prevent a doctor from having multiple appointments
// at the exact same date and time.
// This is crucial for preventing double-booking.
AppointmentSchema.index({ doctor: 1, date: 1, time: 1 }, { unique: true });

module.exports = mongoose.model('Appointment', AppointmentSchema);
