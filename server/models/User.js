const mongoose = require('mongoose');

const UserSchema = new mongoose.Schema({
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true, select: false },
  role: { type: String, enum: ['patient', 'doctor'], required: true },
  specialization: { type: String },
  experience: { type: Number },
  phone: { type: String },
  bio: { type: String },
});

module.exports = mongoose.model('User', UserSchema);
