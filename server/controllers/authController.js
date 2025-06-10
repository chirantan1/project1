const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const User = require('../models/User'); // Ensure path is correct
const { validationResult } = require('express-validator'); // For handling validation middleware errors
const generateOtp = require("../utils/otpGenerator"); // Correct for your otpGenerator.js
const sendEmail = require('../utils/emailSender'); // Import sendEmail utility
// Removed: require('dotenv').config(); // This should ideally be called once in server.js

// @route   POST /api/auth/signup
// @desc    Register a new user (patient or doctor)
// @access  Public
const signupUser = async (req, res) => {
    // Check for validation errors from express-validator (if used)
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({ success: false, errors: errors.array() });
    }

    const {
        name,
        email,
        password,
        role,
        // Doctor specific fields
        specialization,
        experience,
        phone,
        bio,
        registrationId, // Now explicitly included for doctor signup
    } = req.body; // Destructure only the necessary fields from request body

    try {
        // Check if user already exists
        let user = await User.findOne({ email });
        if (user) {
            return res.status(400).json({ success: false, message: 'User already exists with this email' });
        }

        // Hash password
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);

        // Create a new User instance
        user = new User({
            name,
            email,
            password: hashedPassword,
            role,
        });

        // Conditionally add doctor-specific fields and handle registrationId
        if (role === 'doctor') {
            // Validate and assign doctor-specific fields
            user.specialization = specialization;
            user.experience = experience;
            user.phone = phone;
            user.bio = bio;
            user.isApproved = false; // Doctors often need approval after signup

            // Check for unique registrationId for doctors
            if (!registrationId) {
                return res.status(400).json({ success: false, message: 'Registration ID is required for doctors.' });
            }

            const existingDoctorWithId = await User.findOne({ registrationId, role: 'doctor' });
            if (existingDoctorWithId) {
                return res.status(400).json({ success: false, message: 'A doctor with this Registration ID already exists.' });
            }
            user.registrationId = registrationId; // Assign the registration ID
        } else {
            // For patients, ensure doctor-specific fields are not stored
            user.specialization = undefined;
            user.experience = undefined;
            user.phone = undefined;
            user.bio = undefined;
            user.registrationId = undefined;
            user.isApproved = undefined; // Patients don't need approval
        }

        // Save the user to the database
        await user.save();

        // --- Send Welcome Email ---
        try {
            const welcomeSubject = 'Welcome to Our Healthcare Platform!';
            let welcomeHtml = '';

            if (role === 'doctor') {
                welcomeHtml = `
                    <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
                        <h2 style="color: #0056b3;">Welcome, Dr. ${name}!</h2>
                        <p>Thank you for registering as a doctor with our healthcare platform. We're excited to have you join our network.</p>
                        <p>Your account is currently <strong>pending approval</strong> by our administrators. We will review your details, especially your Registration ID (${registrationId}), and notify you once your profile is active.</p>
                        <p>In the meantime, please ensure all your profile details are accurate.</p>
                        <p>If you have any questions, feel free to contact our support team.</p>
                        <p>Best regards,</p>
                        <p>The Healthcare Platform Team</p>
                    </div>
                `;
            } else { // Patient role
                welcomeHtml = `
                    <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
                        <h2 style="color: #0056b3;">Welcome, ${name}!</h2>
                        <p>Thank you for registering with our healthcare platform. We're excited to have you on board as a patient.</p>
                        <p>You can now log in to your account and start booking appointments, managing your health records, and connecting with healthcare professionals.</p>
                        <p>Click here to log in: <a href="https://project1-3jvu.onrender.com/login" style="color: #0056b3; text-decoration: none;">Login to your account</a></p>
                        <p>If you have any questions, feel free to contact our support team.</p>
                        <p>Best regards,</p>
                        <p>The Healthcare Platform Team</p>
                    </div>
                `;
            }

            // FIX: Changed 'to' back to 'email' to match the provided emailSender.js
            await sendEmail({
                email: user.email, // Pass the recipient email using the 'email' key
                subject: welcomeSubject,
                html: welcomeHtml,
                text: `Welcome to our platform, ${name}! Your account has been successfully created as a ${role}.`,
            });
            console.log('Welcome email sent successfully to:', user.email);
        } catch (emailError) {
            console.error('Error sending welcome email:', emailError);
            // Decide how to handle email sending failures:
            // - Log the error but continue with registration success (common)
            // - Potentially inform the user that the email couldn't be sent (less common for welcome emails)
        }
        // --- End Send Welcome Email ---

        // Generate JWT token
        const payload = { id: user._id, role: user.role };
        const token = jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: '1d' });

        // Send success response
        return res.status(201).json({
            success: true,
            message: 'User registered successfully',
            token,
            user: { // Return full user object for frontend redirection
                id: user._id,
                name: user.name,
                email: user.email,
                role: user.role,
                ...(user.role === 'doctor' && { // Include doctor fields if applicable
                    specialization: user.specialization,
                    experience: user.experience,
                    phone: user.phone,
                    bio: user.bio,
                    registrationId: user.registrationId,
                    isApproved: user.isApproved // Include approval status for doctors
                })
            },
        });
    } catch (err) {
        console.error('Signup error:', err.message);
        // Handle potential duplicate registrationId errors if the sparse unique index fails
        if (err.code === 11000 && err.keyPattern && err.keyPattern.registrationId) {
            return res.status(400).json({ success: false, message: 'A doctor with this Registration ID already exists.' });
        }
        return res.status(500).json({ success: false, message: 'Server error' });
    }
};

// @route   POST /api/auth/login
// @desc    Authenticate user & get token
// @access  Public
const loginUser = async (req, res) => {
    // Check validation errors from express-validator middleware
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({ success: false, errors: errors.array() });
    }

    const { email, password } = req.body;

    try {
        // Find user and include password field explicitly
        // If you have `select: false` on password in your User model, you need .select('+password')
        const user = await User.findOne({ email }).select('+password');
        if (!user) {
            return res.status(401).json({ success: false, message: 'Invalid credentials' });
        }

        // Compare password
        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) {
            return res.status(401).json({ success: false, message: 'Invalid credentials' });
        }

        // Generate JWT token
        const payload = { id: user._id, role: user.role };
        const token = jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: '1d' });

        // Send response
        return res.json({
            success: true,
            token,
            user: { // Return full user object for frontend redirection
                id: user._id,
                name: user.name,
                email: user.email,
                role: user.role,
                // Include doctor specific fields in payload if applicable
                ...(user.role === 'doctor' && {
                    specialization: user.specialization,
                    experience: user.experience,
                    phone: user.phone,
                    bio: user.bio,
                    registrationId: user.registrationId,
                    isApproved: user.isApproved, // Include approval status for doctors
                }),
            },
        });
    } catch (err) {
        console.error('Login error:', err.message);
        return res.status(500).json({ success: false, message: 'Server error' });
    }
};

// @desc    Send OTP for password reset
// @route   POST /api/auth/forgot-password
// @access  Public
const forgotPassword = async (req, res) => {
    const { email } = req.body;

    if (!email) {
        return res.status(400).json({ success: false, message: 'Please provide an email address.' });
    }

    try {
        const user = await User.findOne({ email });

        // Security best practice: send a generic success message even if user not found
        // This prevents email enumeration, making it harder for attackers to guess valid emails.
        if (!user) {
            return res.status(200).json({ success: true, message: "If an account with that email exists, an OTP has been sent." });
        }

        const otp = generateOtp(); // Correctly calls the imported generateOtp function
        const otpExpiry = Date.now() + 10 * 60 * 1000; // OTP valid for 10 minutes (in milliseconds)

        user.otp = otp;
        user.otpExpiry = otpExpiry;
        await user.save();

        // Send OTP via email using the dedicated utility
        const emailOptions = {
            email: user.email, // FIX: Changed 'to' back to 'email' for the recipient's address
            subject: "Password Reset OTP for Patient Management System",
            html: `
                <div style="font-family: Arial, sans-serif; line-height: 1.6;">
                    <h2>Password Reset Request</h2>
                    <p>You have requested a password reset for your account.</p>
                    <p>Your One-Time Password (OTP) is: <strong>${otp}</strong></p>
                    <p>This OTP is valid for 10 minutes.</p>
                    <p>If you did not request a password reset, please ignore this email.</p>
                    <p>Thank you,</p>
                    <p>The Patient Management System Team</p>
                </div>
            `,
        };

        try {
            await sendEmail(emailOptions);
            res.status(200).json({ success: true, message: "OTP sent to your email address." });
        } catch (emailError) {
            console.error("Error sending OTP email:", emailError);
            // If email sending fails, clear the OTP from the user record
            user.otp = undefined;
            user.otpExpiry = undefined;
            await user.save();
            return res.status(500).json({ success: false, message: "Error sending OTP. Please try again later." });
        }

    } catch (error) {
        console.error("Forgot password error:", error);
        res.status(500).json({ success: false, message: "Server error. Could not initiate password reset." });
    }
};

// @desc    Verify OTP
// @route   POST /api/auth/verify-otp
// @access  Public
const verifyOtp = async (req, res) => {
    const { email, otp } = req.body;

    if (!email || !otp) {
        return res.status(400).json({ success: false, message: 'Please provide email and OTP.' });
    }

    try {
        const user = await User.findOne({ email });

        if (!user) {
            return res.status(404).json({ success: false, message: "User not found." });
        }

        // Check if OTP matches and is not expired
        if (!user.otp || user.otp !== otp || user.otpExpiry < Date.now()) {
            // For security, clear OTP if it was incorrect or expired
            user.otp = undefined;
            user.otpExpiry = undefined;
            await user.save();
            return res.status(400).json({ success: false, message: "Invalid or expired OTP." });
        }

        res.status(200).json({ success: true, message: "OTP verified successfully. You can now reset your password." });
    } catch (error) {
        console.error("Verify OTP error:", error);
        res.status(500).json({ success: false, message: "Server error. Could not verify OTP." });
    }
};

// @desc    Reset password
// @route   POST /api/auth/reset-password
// @access  Public
const resetPassword = async (req, res) => {
    const { email, otp, newPassword } = req.body;

    if (!email || !otp || !newPassword) {
        return res.status(400).json({ success: false, message: 'Please provide email, OTP, and new password.' });
    }

    try {
        const user = await User.findOne({ email });

        if (!user) {
            return res.status(404).json({ success: false, message: "User not found." });
        }

        // Check if OTP matches and is not expired
        if (!user.otp || user.otp !== otp || user.otpExpiry < Date.now()) {
            user.otp = undefined;
            user.otpExpiry = undefined;
            await user.save();
            return res.status(400).json({ success: false, message: "Invalid or expired OTP." });
        }

        const salt = await bcrypt.genSalt(10);
        user.password = await bcrypt.hash(newPassword, salt);
        user.otp = undefined; // Clear OTP after successful reset
        user.otpExpiry = undefined; // Clear OTP expiry after successful reset

        await user.save();

        res.status(200).json({ success: true, message: "Password reset successfully." });
    } catch (error) {
        console.error("Reset password error:", error);
        res.status(500).json({ success: false, message: "Server error. Could not reset password." });
    }
};


module.exports = {
    signupUser,
    loginUser,
    forgotPassword,
    verifyOtp,
    resetPassword
};
