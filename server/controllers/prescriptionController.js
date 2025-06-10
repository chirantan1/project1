// controllers/prescriptionController.js
const Prescription = require('../models/Prescription'); // Changed from import to require
const sendEmail = require('../utils/emailSender'); // Changed from import to require

// @desc    Create new prescription
// @route   POST /api/prescriptions
// @access  Private/Doctor
exports.createPrescription = async (req, res) => { // Changed from export const to exports.
    try {
        const { patientId, doctorId, medicines, dosage, instructions, followUpDate, diagnosis, date } = req.body;

        const newPrescription = new Prescription({
            patient: patientId,
            doctor: doctorId,
            medicines: medicines.split('\n').map(m => m.trim()).filter(Boolean), // Store as array
            dosage: dosage.split('\n').map(d => d.trim()).filter(Boolean),    // Store as array
            instructions,
            followUpDate,
            diagnosis,
            date,
        });

        const savedPrescription = await newPrescription.save();

        res.status(201).json({
            success: true,
            message: 'Prescription created successfully!',
            data: savedPrescription,
        });
    } catch (error) {
        console.error('Error creating prescription:', error);
        res.status(500).json({ success: false, message: 'Server error', error: error.message });
    }
};

// @desc    Send prescription PDF via email
// @route   POST /api/prescriptions/send-email
// @access  Private/Doctor
exports.sendPrescriptionEmail = async (req, res) => { // Changed from export const to exports.
    try {
        // --- Debugging Multer file status ---
        console.log('req.file status:', req.file); // IMPORTANT: Check this in your backend logs!
        console.log('req.body status:', req.body); // IMPORTANT: Check this in your backend logs!

        // Multer places the file in req.file when using upload.single()
        if (!req.file) {
            return res.status(400).json({ success: false, message: 'No PDF file uploaded. Multer might not be configured correctly or file is missing.' });
        }

        const { patientEmail, patientName, doctorName, diagnosis, medicines, dosage, instructions, followUpDate, doctorSpecialization, clinicName, clinicAddress, clinicPhone } = req.body;
        const pdfBuffer = req.file.buffer; // The PDF content as a Buffer
        const pdfFilename = req.file.originalname || 'medical-prescription.pdf'; // Use original name or default

        if (!patientEmail) {
            return res.status(400).json({ success: false, message: 'Patient email is required to send the prescription.' });
        }

        const emailSubject = `Medical Prescription from Dr. ${doctorName || 'Your Doctor'}`;
        
        // Construct detailed HTML for email body using data from req.body
        const emailHtml = `
            <p>Dear ${patientName || 'Patient'},</p>
            <p>Please find attached your medical prescription from Dr. ${doctorName || 'Doctor'} (${doctorSpecialization || 'General Physician'}) at ${clinicName || 'Healthcare Clinic'}.</p>
            <p><strong>Diagnosis:</strong> ${diagnosis || 'N/A'}</p>
            <p><strong>Medicines:</strong></p>
            <ul>
                ${medicines ? medicines.split('\n').map((med, i) => {
                    const dose = dosage ? dosage.split('\n')[i]?.trim() : 'As directed';
                    return `<li>${med.trim()} - ${dose}</li>`;
                }).join('') : '<li>No medicines prescribed.</li>'}
            </ul>
            <p><strong>Instructions:</strong> ${instructions || 'N/A'}</p>
            <p><strong>Follow-up Date:</strong> ${followUpDate || 'Not specified'}</p>
            <p>If you have any questions, please contact us at ${clinicPhone || 'N/A'}.</p>
            <p>Best regards,</p>
            <p>Dr. ${doctorName || 'Doctor'}</p>
            <p>${clinicName || 'Healthcare Clinic'}</p>
            <p>${clinicAddress || 'N/A'}</p>
            <br/>
            <small>This is an automated email, please do not reply directly.</small>
        `;

        const attachments = [
            {
                filename: pdfFilename,
                content: pdfBuffer,
                contentType: 'application/pdf',
            },
        ];

        // The sendEmail utility typically expects (to, subject, text, html, attachments)
        const emailResult = await sendEmail(patientEmail, emailSubject, '', emailHtml, attachments);

        if (emailResult.success) {
            res.status(200).json({ success: true, message: 'Prescription PDF sent to patient email successfully!' });
        } else {
            // Log the specific error from sendEmail for more details
            console.error('Error from sendEmail utility:', emailResult.error);
            res.status(500).json({ success: false, message: `Failed to send email: ${emailResult.error || 'Unknown error'}` });
        }
    } catch (error) {
        console.error('Error in sendPrescriptionEmail controller:', error);
        res.status(500).json({ success: false, message: 'Server error during email sending', error: error.message });
    }
};
