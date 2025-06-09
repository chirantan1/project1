// utils/otpGenerator.js
const generateOtp = () => {
    return Math.floor(100000 + Math.random() * 900000).toString(); // Generates a 6-digit OTP
};

module.exports = generateOtp; // This line correctly exports the 'generateOtp' function as a default export