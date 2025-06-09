const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const User = require('../models/User'); // Ensure path is correct
const { validationResult } = require('express-validator'); // For handling validation middleware errors
const nodemailer = require("nodemailer"); // Added for email sending
const generateOtp = require("../utils/otpGenerator"); // Added for OTP generation
require('dotenv').config(); // Ensure dotenv is configured to access environment variables

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
    }

    // Save the user to the database
    await user.save();

    // Generate JWT token
    const payload = { id: user._id, role: user.role };
    const token = jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: '1d' });

    // Send success response
    return res.status(201).json({
      success: true,
      message: 'User registered successfully',
      token,
      role: user.role,
      id: user._id,
      name: user.name,
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
      user: { // Return user object for role-based redirection on frontend
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role
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

  try {
    const user = await User.findOne({ email });

    if (!user) {
      return res.status(404).json({ message: "User not found with this email." });
    }

    const otp = generateOtp();
    const otpExpiry = Date.now() + 10 * 60 * 1000; // OTP valid for 10 minutes

    user.otp = otp;
    user.otpExpiry = otpExpiry;
    await user.save();

    // Send OTP via email
    const transporter = nodemailer.createTransport({
      service: process.env.EMAIL_SERVICE,
      auth: {
        user: process.env.EMAIL_USERNAME,
        pass: process.env.EMAIL_PASSWORD,
      },
    });

    const mailOptions = {
      from: process.env.EMAIL_FROM,
      to: user.email,
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

    await transporter.sendMail(mailOptions);

    res.status(200).json({ message: "OTP sent to your email address." });
  } catch (error) {
    console.error("Forgot password error:", error);
    res.status(500).json({ message: "Server error. Could not send OTP." });
  }
};

// @desc    Verify OTP
// @route   POST /api/auth/verify-otp
// @access  Public
const verifyOtp = async (req, res) => {
  const { email, otp } = req.body;

  try {
    const user = await User.findOne({ email });

    if (!user) {
      return res.status(404).json({ message: "User not found." });
    }

    if (!user.otp || user.otp !== otp) {
      return res.status(400).json({ message: "Invalid OTP." });
    }

    if (user.otpExpiry < Date.now()) {
      return res.status(400).json({ message: "OTP has expired. Please request a new one." });
    }

    res.status(200).json({ message: "OTP verified successfully. You can now reset your password." });
  } catch (error) {
    console.error("Verify OTP error:", error);
    res.status(500).json({ message: "Server error. Could not verify OTP." });
  }
};

// @desc    Reset password
// @route   POST /api/auth/reset-password
// @access  Public
const resetPassword = async (req, res) => {
  const { email, otp, newPassword } = req.body;

  try {
    const user = await User.findOne({ email });

    if (!user) {
      return res.status(404).json({ message: "User not found." });
    }

    if (!user.otp || user.otp !== otp) {
      return res.status(400).json({ message: "Invalid or expired OTP." });
    }

    if (user.otpExpiry < Date.now()) {
      return res.status(400).json({ message: "OTP has expired. Please request a new one." });
    }

    const salt = await bcrypt.genSalt(10);
    user.password = await bcrypt.hash(newPassword, salt);
    user.otp = undefined; // Clear OTP
    user.otpExpiry = undefined; // Clear OTP expiry

    await user.save();

    res.status(200).json({ message: "Password reset successfully." });
  } catch (error) {
    console.error("Reset password error:", error);
    res.status(500).json({ message: "Server error. Could not reset password." });
  }
};


module.exports = {
  signupUser,
  loginUser,
  forgotPassword, // Export the new function
  verifyOtp,      // Export the new function
  resetPassword   // Export the new function
};