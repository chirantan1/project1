// server/controllers/prescriptionController.js
const Prescription = require('../models/Prescription'); // Changed import to require
const User = require('../models/User'); // Changed import to require
const sendEmail = require('../utils/emailSender'); // Changed import to require

// @desc    Create new prescription
// @route   POST /api/prescriptions
// @access  Private/Doctor
exports.createPrescription = async (req, res) => { // Changed export const to exports.create...
  try {
    const { patientId, doctorId, medicines, dosage, instructions, followUpDate, diagnosis, date } = req.body;

    // Basic validation
    if (!patientId || !doctorId || !medicines || !dosage || !diagnosis) {
      return res.status(400).json({ success: false, message: 'Please provide all required prescription fields.' });
    }

    const newPrescription = new Prescription({
      patient: patientId,
      doctor: doctorId,
      // Ensure medicines and dosage are stored as arrays, splitting by new line
      medicines: medicines.split('\n').map(m => m.trim()).filter(Boolean),
      dosage: dosage.split('\n').map(d => d.trim()).filter(Boolean),
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
    console.error('Error creating prescription:', error.message);
    res.status(500).json({ success: false, message: 'Server error during prescription creation.', error: error.message });
  }
};

// @desc    Send prescription PDF via email
// @route   POST /api/prescriptions/send-email
// @access  Private/Doctor
exports.sendPrescriptionEmail = async (req, res) => { // Changed export const to exports.send...
  try {
    // Multer places the file in req.file when using upload.single()
    if (!req.file) {
      return res.status(400).json({ success: false, message: 'No PDF file uploaded.' });
    }

    // Extract data from req.body (sent as form data from frontend)
    const { patientEmail, patientName, doctorName, diagnosis, medicines, dosage, instructions, followUpDate, doctorSpecialization, clinicName, clinicAddress, clinicPhone } = req.body;
    const pdfBuffer = req.file.buffer; // The PDF content as a Buffer
    const pdfFilename = req.file.originalname || 'medical-prescription.pdf'; // Use original name or default

    // Validate patient email
    if (!patientEmail) {
      return res.status(400).json({ success: false, message: 'Patient email is required to send the prescription.' });
    }

    // Construct email content
    const emailSubject = `Medical Prescription from Dr. ${doctorName || 'Your Doctor'}`;
    const emailText = `Dear ${patientName || 'Patient'},\n\nPlease find your medical prescription attached.\n\nRegards,\nDr. ${doctorName || 'Doctor'}`;
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

    // Define attachments array
    const attachments = [
      {
        filename: pdfFilename,
        content: pdfBuffer, // The actual PDF data
        contentType: 'application/pdf',
      },
    ];

    // FIX: Call sendEmail with a single options object as it expects
    const emailResult = await sendEmail({
      to: patientEmail,
      subject: emailSubject,
      text: emailText,
      html: emailHtml,
      attachments: attachments,
    });

    if (emailResult.success) {
      res.status(200).json({ success: true, message: 'Prescription PDF sent to patient email successfully!' });
    } else {
      // If sendEmail returns success: false, or throws an error caught here
      console.error('Failed to send email:', emailResult.error); // Log the specific error from emailSender
      res.status(500).json({ success: false, message: `Failed to send email: ${emailResult.error || 'Unknown error'}` });
    }
  } catch (error) {
    console.error('Error in sendPrescriptionEmail:', error.message);
    res.status(500).json({ success: false, message: 'Server error during email sending.', error: error.message });
  }
};
