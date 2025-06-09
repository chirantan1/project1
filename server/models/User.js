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
  isActive: { 
    type: Boolean, 
    default: true, 
    // Only applies to doctors, but can be present for patients as false or omitted
    required: function() { return this.role === 'doctor'; } 
  },
  availableDays: { 
    type: String, // Store as a string, e.g., "Monday, Wednesday, Friday"
    // Conditional requirement
    required: function() { return this.role === 'doctor'; } 
  },
  qualifications: { 
    type: String, 
    // Conditional requirement
    required: function() { return this.role === 'doctor'; } 
  },
  hospitalAffiliation: { 
    type: String, 
    // Conditional requirement
    required: function() { return this.role === 'doctor'; } 
  },

  // Optional: Patient-like fields, which might also be relevant for doctors in some contexts
  allergies: { type: String, default: '' },
  medications: { type: String, default: '' },
  medicalHistory: { type: String, default: '' },
}, {
  timestamps: true // Adds createdAt and updatedAt timestamps automatically
});

module.exports = mongoose.model('User', UserSchema);
