// server/utils/emailSender.js
const nodemailer = require('nodemailer');
require('dotenv').config(); // Load environment variables from .env file

const sendEmail = async (options) => {
    // Validate required options for email sending
    if (!options.to || !options.subject || (!options.html && !options.text)) {
        console.error('Error: Missing required email options (to, subject, html/text).');
        throw new Error('Missing required email options for sending.');
    }

    const transporter = nodemailer.createTransport({
        service: process.env.EMAIL_SERVICE, // e.g., 'gmail', 'Outlook365', 'SendGrid'
        auth: {
            user: process.env.EMAIL_USERNAME, // Your email address
            pass: process.env.EMAIL_PASSWORD, // Your email password or app-specific password (RECOMMENDED: App Password for Gmail)
        },
        // Optional: Add TLS/SSL options if your service requires them and 'service' is not sufficient.
        // For some SMTP servers, 'secure: true' (for port 465) or 'tls: { rejectUnauthorized: false }'
        // might be necessary depending on your setup.
        // secure: process.env.EMAIL_SECURE === 'true', // true for 465, false for other ports
        // port: process.env.EMAIL_PORT, // e.g., 587 for TLS, 465 for SSL
    });

    const mailOptions = {
        from: process.env.EMAIL_FROM || process.env.EMAIL_USERNAME, // Sender address, falls back to username if EMAIL_FROM isn't set
        to: options.to,          // Recipient(s) email address (can be a string or array of strings)
        subject: options.subject,  // Subject line of the email
        html: options.html,      // HTML body of the email
        text: options.text,      // Plain text body (good practice for email clients that don't render HTML)
        attachments: options.attachments || [], // Array of attachments, defaults to empty array if none provided
    };

    try {
        const info = await transporter.sendMail(mailOptions);
        console.log('Email sent successfully! Message ID: %s', info.messageId);
        // Return success status and messageId for potential logging or frontend feedback
        return { success: true, messageId: info.messageId };
    } catch (error) {
        console.error('Error sending email:', error);
        // Re-throw a custom error to be caught by the calling controller,
        // providing a clearer message for debugging.
        throw new Error(`Email could not be sent: ${error.message}`);
    }
};

module.exports = sendEmail;
