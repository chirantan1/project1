// server/utils/emailSender.js
const nodemailer = require('nodemailer');
require('dotenv').config(); // Ensure dotenv is loaded here too, if needed for email credentials

const sendEmail = async (options) => {
    // Create a transporter object using the default SMTP transport
    const transporter = nodemailer.createTransport({
        service: process.env.EMAIL_SERVICE, // e.g., 'gmail', 'SendGrid'
        auth: {
            user: process.env.EMAIL_USERNAME, // Your email address from .env
            pass: process.env.EMAIL_PASSWORD, // Your email password/app password from .env
        },
        // Optional: Add TLS/SSL options if your provider requires it
        // tls: {
        //     rejectUnauthorized: false
        // }
    });

    const mailOptions = {
        from: process.env.EMAIL_FROM, // Sender address (e.g., your email)
        to: options.email,            // List of receivers (e.g., user's email)
        subject: options.subject,     // Subject line
        html: options.html,           // HTML body
    };

    try {
        await transporter.sendMail(mailOptions);
        console.log('Email sent successfully!');
    } catch (error) {
        console.error('Error sending email:', error);
        throw new Error('Email could not be sent.'); // Re-throw to be caught by the caller
    }
};

module.exports = sendEmail; // Export the function