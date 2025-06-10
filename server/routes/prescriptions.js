// routes/prescriptions.js
import express from 'express';
import { protect, authorize } from '../middleware/auth.js'; // Assuming you have these
import { createPrescription, sendPrescriptionEmail } from '../controllers/prescriptionController.js';
import multer from 'multer';

const router = express.Router();

// Configure multer for file uploads
const upload = multer(); // No disk storage needed, we'll process in memory

router.post('/', protect, authorize(['doctor']), createPrescription);
router.post('/send-email', protect, authorize(['doctor']), upload.single('prescription'), sendPrescriptionEmail); // New route for sending email with PDF

export default router;