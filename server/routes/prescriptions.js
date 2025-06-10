// routes/prescriptions.js
const express = require('express'); // Changed from import to require
const router = express.Router();
const { protect, authorize } = require('../middleware/auth'); // Changed from import to require, removed .js extension
const { createPrescription, sendPrescriptionEmail } = require('../controllers/prescriptionController'); // Changed from import to require, removed .js extension
const multer = require('multer'); // Changed from import to require

// Configure multer for file uploads
const upload = multer(); // No disk storage needed, we'll process in memory

// @route   POST /api/prescriptions
// @desc    Create a new prescription
// @access  Private (Doctor only)
router.post('/', protect, authorize(['doctor']), createPrescription);

// @route   POST /api/prescriptions/send-email
// @desc    Send a prescription email with an attachment
// @access  Private (Doctor only)
router.post('/send-email', protect, authorize(['doctor']), upload.single('prescription'), sendPrescriptionEmail); // New route for sending email with PDF

module.exports = router; // Changed from export default to module.exports
