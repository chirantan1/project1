const mongoose = require('mongoose');

const UserSchema = new mongoose.Schema({
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true, select: false }, // password should not be returned by default queries
  role: { type: String, enum: ['patient', 'doctor', 'admin'], required: true }, // Added 'admin' as a possible role

  // Doctor specific fields (only present if role is 'doctor')
  specialization: {
    type: String,
    // Conditional requirement: required if role is 'doctor'
    required: function() { return this.role === 'doctor'; }
  },
  experience: {
    type: Number,
    min: 0,
    // Conditional requirement
    required: function() { return this.role === 'doctor'; }
  },
  phone: {
    type: String,
    // Conditional requirement
    required: function() { return this.role === 'doctor'; }
  },
  bio: {
    type: String,
    // Conditional requirement
    required: function() { return this.role === 'doctor'; }
  },
  // Removed: isActive, availableDays, qualifications, hospitalAffiliation
  // As per your request, these fields are removed from the schema.

  // **NEW**: Registration ID for doctors
  registrationId: {
    type: String,
    unique: true, // Ensure each doctor has a unique registration ID
    sparse: true, // Allows null values, so patients/admins don't need this field
    required: function() { return this.role === 'doctor'; } // Required only if role is 'doctor'
  },

  // Removed: Optional patient-like fields (allergies, medications, medicalHistory)
  // As per your request, these fields are removed from the schema.

}, {
  timestamps: true // Adds createdAt and updatedAt timestamps automatically
});

module.exports = mongoose.model('User', UserSchema);