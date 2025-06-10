// server/utils/emailSender.js
const nodemailer = require('nodemailer');
// Removed: require('dotenv').config(); // This should ideally be called once in server.js

const sendEmail = async (options) => {
    // --- NEW DEBUGGING LOG ---
    console.log('\n--- Inside sendEmail Utility ---');
    console.log('Email options received:', {
        recipientEmail: options.email, // Changed to options.email
        subject: options.subject,
        hasHtml: !!options.html,
        hasText: !!options.text,
        attachmentsCount: (options.attachments || []).length,
        attachmentFilenames: (options.attachments || []).map(att => att.filename)
    });
    console.log('------------------------------\n');

    // Validate required options for email sending
    // Changed options.to to options.email for consistency
    if (!options.email || !options.subject || (!options.html && !options.text)) {
        console.error('Error: Missing required email options (email, subject, html/text).');
        throw new Error('Missing required email options for sending.');
    }

    // Ensure environment variables are loaded (this check is more of a reminder; dotenv should load it at app start)
    if (!process.env.EMAIL_SERVICE || !process.env.EMAIL_USERNAME || !process.env.EMAIL_PASSWORD) {
        console.error('Email service configuration missing in environment variables.');
        throw new Error('Email service credentials are not configured.');
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
        // port: parseInt(process.env.EMAIL_PORT, 10), // e.g., 587 for TLS, 465 for SSL
    });

    const mailOptions = {
        from: process.env.EMAIL_FROM || process.env.EMAIL_USERNAME, // Sender address, falls back to username if EMAIL_FROM isn't set
        to: options.email,           // Recipient(s) email address (now consistently options.email)
        subject: options.subject,    // Subject line of the email
        html: options.html,          // HTML body of the email
        text: options.text,          // Plain text body (good practice for email clients that don't render HTML)
        attachments: options.attachments || [], // Array of attachments, defaults to empty array if none provided
    };

    try {
        const info = await transporter.sendMail(mailOptions);
        console.log('Email sent successfully! Message ID: %s', info.messageId);
        // Return success status and messageId for potential logging or frontend feedback
        return { success: true, messageId: info.messageId };
    } catch (error) {
        console.error('Error sending email:', error);
        // Provide more specific error messages for common issues
        if (error.code === 'EAUTH') {
            throw new Error('Email authentication failed. Check username and password in .env.');
        } else if (error.code === 'ECONNREFUSED') {
            throw new Error('Email service connection refused. Check host, port, and network.');
        } else {
            // Re-throw a custom error to be caught by the calling controller,
            // providing a clearer message for debugging.
            throw new Error(`Email could not be sent: ${error.message}`);
        }
    }
};

module.exports = sendEmail;