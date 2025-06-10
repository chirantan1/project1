// controllers/prescriptionController.js
import Prescription from '../models/Prescription.js'; // Assuming you'll create this model
import sendEmail from '../utils/emailSender.js';

// @desc    Create new prescription
// @route   POST /api/prescriptions
// @access  Private/Doctor
export const createPrescription = async (req, res) => {
  try {
    const { patientId, doctorId, medicines, dosage, instructions, followUpDate, diagnosis, date } = req.body;

    const newPrescription = new Prescription({
      patient: patientId,
      doctor: doctorId,
      medicines: medicines.split('\n').map(m => m.trim()).filter(Boolean), // Store as array
      dosage: dosage.split('\n').map(d => d.trim()).filter(Boolean),     // Store as array
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
export const sendPrescriptionEmail = async (req, res) => {
  try {
    // Multer places the file in req.file when using upload.single()
    if (!req.file) {
      return res.status(400).json({ success: false, message: 'No PDF file uploaded.' });
    }

    const { patientEmail, patientName, doctorName } = req.body;
    const pdfBuffer = req.file.buffer; // The PDF content as a Buffer
    const pdfFilename = req.file.originalname || 'medical-prescription.pdf'; // Use original name or default

    if (!patientEmail) {
      return res.status(400).json({ success: false, message: 'Patient email is required to send the prescription.' });
    }

    const emailSubject = `Medical Prescription from Dr. ${doctorName || 'Your Doctor'}`;
    const emailText = `Dear ${patientName},\n\nPlease find your medical prescription attached.\n\nRegards,\nDr. ${doctorName}`;
    const emailHtml = `
      <p>Dear ${patientName},</p>
      <p>Please find your medical prescription attached to this email.</p>
      <p>If you have any questions, please do not hesitate to contact us.</p>
      <p>Regards,</p>
      <p>Dr. ${doctorName}</p>
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

    const emailResult = await sendEmail(patientEmail, emailSubject, emailText, emailHtml, attachments);

    if (emailResult.success) {
      res.status(200).json({ success: true, message: 'Prescription PDF sent to patient email successfully!' });
    } else {
      res.status(500).json({ success: false, message: `Failed to send email: ${emailResult.error}` });
    }
  } catch (error) {
    console.error('Error sending prescription email:', error);
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
};