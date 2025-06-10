// models/Prescription.js
import mongoose from 'mongoose';

const PrescriptionSchema = new mongoose.Schema({
  patient: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User', // Assuming your patient users are also in the 'User' collection
    required: true,
  },
  doctor: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User', // Assuming your doctors are also in the 'User' collection
    required: true,
  },
  date: {
    type: Date,
    default: Date.now,
  },
  diagnosis: {
    type: String,
    required: [true, 'Please add a diagnosis'],
    trim: true,
  },
  medicines: {
    type: [String], // Array of strings for each medicine
    required: [true, 'Please add medicines'],
  },
  dosage: {
    type: [String], // Array of strings for each dosage
    required: [true, 'Please add dosage instructions'],
  },
  instructions: {
    type: String,
    trim: true,
  },
  followUpDate: {
    type: Date,
  },
}, { timestamps: true });

const Prescription = mongoose.model('Prescription', PrescriptionSchema);

export default Prescription;