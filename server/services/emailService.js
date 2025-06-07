const nodemailer = require('nodemailer');
require('dotenv').config(); // Ensure environment variables are loaded

// Configure nodemailer transporter
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER, // Your Gmail address
    pass: process.env.EMAIL_PASS  // App password (not your Gmail login password)
  }
});

// Send email to doctor after registration
exports.sendVerificationEmail = async (doctor) => {
  const mailOptions = {
    from: `"Healthcare System" <${process.env.EMAIL_USER}>`,
    to: doctor.email,
    subject: 'Doctor Registration Submitted',
    html: `
      <p>Dear ${doctor.name},</p>
      <p>Your doctor registration has been submitted for admin approval.</p>
      <p>You will receive another email once your account is reviewed.</p>
      <p>Thank you for joining our platform!</p>
    `
  };

  await transporter.sendMail(mailOptions);
};

// Send email to admin to notify new doctor registration
exports.sendAdminNotification = async (doctor) => {
  const mailOptions = {
    from: `"Healthcare System" <${process.env.EMAIL_USER}>`,
    to: process.env.ADMIN_EMAIL,
    subject: 'New Doctor Registration Needs Approval',
    html: `
      <p>A new doctor has registered and needs approval:</p>
      <ul>
        <li>Name: ${doctor.name}</li>
        <li>Email: ${doctor.email}</li>
        <li>Specialization: ${doctor.specialization || 'Not provided'}</li>
      </ul>
      <p>Please review this registration in the admin dashboard.</p>
    `
  };

  await transporter.sendMail(mailOptions);
};

// Send email to doctor on approval
exports.sendApprovalEmail = async (doctor) => {
  const mailOptions = {
    from: `"Healthcare System" <${process.env.EMAIL_USER}>`,
    to: doctor.email,
    subject: 'Doctor Account Approved',
    html: `
      <p>Dear ${doctor.name},</p>
      <p>We are pleased to inform you that your doctor account has been approved!</p>
      <p>You can now log in to your dashboard and start using our platform.</p>
      <p><strong>Notes from admin:</strong> ${doctor.verificationNotes}</p>
      <p>Thank you for your patience!</p>
    `
  };

  await transporter.sendMail(mailOptions);
};

// Send email to doctor on rejection
exports.sendRejectionEmail = async (doctor) => {
  const mailOptions = {
    from: `"Healthcare System" <${process.env.EMAIL_USER}>`,
    to: doctor.email,
    subject: 'Doctor Account Rejected',
    html: `
      <p>Dear ${doctor.name},</p>
      <p>We regret to inform you that your doctor account registration has been rejected.</p>
      <p><strong>Reason:</strong> ${doctor.verificationNotes}</p>
      <p>If you believe this is a mistake, please contact our support team.</p>
    `
  };

  await transporter.sendMail(mailOptions);
};
