// routes/prescriptions.js
const express = require('express');
const router = express.Router();
const { protect, authorize } = require('../middleware/auth'); 
const { createPrescription, sendPrescriptionEmail } = require('../controllers/prescriptionController');
const multer = require('multer');

// Configure multer for in-memory file uploads
// This means the file will be available in req.file.buffer
const upload = multer(); 

// @route   POST /api/prescriptions
// @desc    Create a new prescription (without file upload)
// @access  Private/Doctor
router.post('/', protect, authorize(['doctor']), createPrescription);

// @route   POST /api/prescriptions/send-email
// @desc    Send a prescription email with an attached PDF
// @access  Private/Doctor
// IMPORTANT: `upload.single('prescription')` must come BEFORE the controller
// The string 'prescription' must exactly match the field name used in formData.append() on the frontend.
router.post('/send-email', protect, authorize(['doctor']), upload.single('prescription'), sendPrescriptionEmail); 

module.exports = router;
