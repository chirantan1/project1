import React, { useState } from "react";
import axios from "axios";
import { useNavigate, Link } from "react-router-dom";
import "./Login.css";
import loginBg from "../asset/signup.jpg"; // Path to your background image

const Login = () => {
  // State for managing login form data (email and password)
  const [formData, setFormData] = useState({ email: "", password: "" });
  // State for displaying general login errors
  const [error, setError] = useState("");
  // State for managing loading status during API calls
  const [loading, setLoading] = useState(false);

  // States for the external admin portal access
  const [showExternalAdminPasswordModal, setShowExternalAdminPasswordModal] = useState(false);
  const [externalAdminPassword, setExternalAdminPassword] = useState("");
  const [externalAdminPasswordError, setExternalAdminPasswordError] = useState("");
  const [showExternalAdminAnimation, setShowExternalAdminAnimation] = useState(false);

  // --- New states for Forgot Password functionality ---
  const [showForgotPasswordModal, setShowForgotPasswordModal] = useState(false);
  const [forgotPasswordEmail, setForgotPasswordEmail] = useState("");
  const [otp, setOtp] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmNewPassword, setConfirmNewPassword] = useState("");
  const [forgotPasswordMessage, setForgotPasswordMessage] = useState("");
  const [forgotPasswordError, setForgotPasswordError] = useState("");
  const [otpSent, setOtpSent] = useState(false);
  const [resetStep, setResetStep] = useState(1); // FIX APPLIED HERE: was setResetStep = 1);
  // --- End new states ---

  // Hook for programmatic navigation
  const navigate = useNavigate();

  // Handles changes in form input fields and updates the formData state
  const handleChange = (e) => {
    // Clear general error message when user starts typing
    setError("");
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  // Handles the main login form submission
  const handleSubmit = async (e) => {
    e.preventDefault(); // Prevent default browser form submission
    setError(""); // Clear previous errors
    setLoading(true); // Set loading state to true

    try {
      // Make the POST request to the backend login API endpoint
      const res = await axios.post(
        "https://project1-backend-d55g.onrender.com/api/auth/login",
        formData
      );

      const { token, user } = res.data; // Assuming backend sends user object with role

      // Store the JWT token if received
      if (token) {
        localStorage.setItem("token", token);
      }

      // Redirect based on the user's role
      if (user?.role === "doctor") {
        navigate("/doctor-dashboard");
      } else if (user?.role === "patient") {
        navigate("/patient-dashboard");
      } else if (user?.role === "admin") {
        // Redirect to an internal admin dashboard for the main application's admin role
        navigate("/admin-dashboard");
      } else {
        // Fallback for unexpected roles
        setError("Login successful, but user role is unknown. Please contact support.");
      }

      // Reset form fields after successful login
      setFormData({ email: "", password: "" });
    } catch (err) {
      // Handle login errors from the API or network
      console.error("Login error:", err.response?.data || err);
      setError(
        err.response?.data?.message
          ? "Login failed: " + err.response.data.message
          : "Login failed: " + err.message
      );
    } finally {
      setLoading(false); // Reset loading state
    }
  };

  // Handles the submission for the separate external admin portal access
  const handleExternalAdminSubmit = () => {
    setExternalAdminPasswordError(""); // Clear previous admin errors

    // Hardcoded password check for the external admin portal
    // It's recommended to use environment variables for sensitive data like passwords.
    // process.env.REACT_APP_EXTERNAL_ADMIN_PASSWORD should be set in your hosting environment.
    if (externalAdminPassword === (process.env.REACT_APP_EXTERNAL_ADMIN_PASSWORD || "admin")) {
      setShowExternalAdminAnimation(true); // Show animation
      setTimeout(() => {
        // Open the external admin dashboard in a new tab
        window.open("https://admin-1-5zv8.onrender.com", "_blank");
        // Reset states after redirection
        setShowExternalAdminPasswordModal(false);
        setExternalAdminPassword("");
        setShowExternalAdminAnimation(false);
        setExternalAdminPasswordError("");
      }, 3000); // Simulate loading for 3 seconds
    } else {
      setExternalAdminPasswordError("Incorrect password. Please try again."); // Display error
    }
  };

  // --- New functions for Forgot Password ---
  const handleSendOtp = async (e) => {
    e.preventDefault();
    setForgotPasswordMessage("");
    setForgotPasswordError("");
    if (!forgotPasswordEmail) {
      setForgotPasswordError("Please enter your email.");
      return;
    }
    try {
      setLoading(true);
      const res = await axios.post("https://project1-backend-d55g.onrender.com/api/auth/forgot-password", { email: forgotPasswordEmail });
      setForgotPasswordMessage(res.data.message);
      setOtpSent(true);
      setResetStep(2); // Move to OTP verification step
    } catch (err) {
      setForgotPasswordError(err.response?.data?.message || "Failed to send OTP.");
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOtp = async (e) => {
    e.preventDefault();
    setForgotPasswordMessage("");
    setForgotPasswordError("");
    if (!otp) {
      setForgotPasswordError("Please enter the OTP.");
      return;
    }
    try {
      setLoading(true);
      const res = await axios.post("https://project1-backend-d55g.onrender.com/api/auth/verify-otp", { email: forgotPasswordEmail, otp });
      setForgotPasswordMessage(res.data.message);
      setResetStep(3); // Move to new password step
    } catch (err) {
      setForgotPasswordError(err.response?.data?.message || "Invalid OTP.");
    } finally {
      setLoading(false);
    }
  };

  const handleResetPassword = async (e) => {
    e.preventDefault();
    setForgotPasswordMessage("");
    setForgotPasswordError("");
    if (!newPassword || !confirmNewPassword) {
      setForgotPasswordError("Please enter and confirm your new password.");
      return;
    }
    if (newPassword !== confirmNewPassword) {
      setForgotPasswordError("Passwords do not match.");
      return;
    }
    try {
      setLoading(true);
      const res = await axios.post("https://project1-backend-d55g.onrender.com/api/auth/reset-password", {
        email: forgotPasswordEmail,
        otp,
        newPassword,
      });
      setForgotPasswordMessage(res.data.message + " You can now login with your new password.");
      // Close the modal after successful reset
      setShowForgotPasswordModal(false);
      setForgotPasswordEmail("");
      setOtp("");
      setNewPassword("");
      setConfirmNewPassword("");
      setForgotPasswordMessage("");
      setForgotPasswordError("");
      setOtpSent(false);
      setResetStep(1);
    } catch (err) {
      setForgotPasswordError(err.response?.data?.message || "Failed to reset password.");
    } finally {
      setLoading(false);
    }
  };

  const closeForgotPasswordModal = () => {
    setShowForgotPasswordModal(false);
    setForgotPasswordEmail("");
    setOtp("");
    setNewPassword("");
    setConfirmNewPassword("");
    setForgotPasswordMessage("");
    setForgotPasswordError("");
    setOtpSent(false);
    setResetStep(1);
  };
  // --- End new functions ---

  return (
    <div
      className="login-page"
      style={{
        backgroundImage: `url(${loginBg})`,
        backgroundSize: "cover",
        backgroundPosition: "center",
        minHeight: "100vh", // Ensure full viewport height
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "flex-start", // Align items to the top
        padding: "2rem",
        boxSizing: "border-box", // Include padding in element's total width and height
      }}
    >
      <h1 className="main-heading">
        Patient Management System with Integrated Disease Assistance
      </h1>

      <div className="login-container">
        <h2>Login</h2>

        <form onSubmit={handleSubmit} className="login-form" noValidate>
          {" "}
          {/* Added noValidate */}
          <div className="form-group">
            <label htmlFor="email">Email</label>
            <input
              type="email"
              id="email"
              name="email"
              placeholder="Enter your email"
              required
              value={formData.email}
              onChange={handleChange}
              aria-label="Email Address"
              autoComplete="email"
            />
          </div>

          <div className="form-group">
            <label htmlFor="password">Password</label>
            <input
              type="password"
              id="password"
              name="password"
              placeholder="Enter your password"
              required
              value={formData.password}
              onChange={handleChange}
              aria-label="Password"
              autoComplete="current-password"
            />
          </div>

          <button type="submit" className="submit-btn" disabled={loading} aria-label={loading ? "Logging in..." : "Login"}>
            {loading ? "Logging in..." : "Login"}
          </button>
        </form>

        {error && (
          <p className="error-text" role="alert">
            {error}
          </p>
        )}

        <p className="register-link">
          Don't have an account? <Link to="/signup">Sign up here</Link>
        </p>

        {/* Forgot Password Link */}
        <p className="forgot-password-link">
          <button
            type="button"
            className="link-button"
            onClick={() => setShowForgotPasswordModal(true)}
            aria-label="Forgot Password?"
          >
            Forgot Password?
          </button>
        </p>

        {/* AI Assistant Button */}
        <div className="feature-section">
          <button
            className="feature-btn ai-assistant-btn"
            onClick={() => window.open("https://disease-assistance-web.onrender.com", "_blank")}
            aria-label="Ask our AI Assistant"
          >
            Ask our AI Assistant
          </button>
        </div>

        {/* External Admin Portal Access Section */}
        <div className="feature-section admin-access-section">
          <h3>External Admin Portal (Official Use Only)</h3>
          <button
            className="feature-btn admin-access-trigger-btn"
            onClick={() => setShowExternalAdminPasswordModal(true)}
            aria-label="Access External Admin Dashboard"
          >
            Access Admin Dashboard
          </button>

          {/* Admin Password Input Modal/Overlay */}
          {showExternalAdminPasswordModal && (
            <div className="modal-overlay">
              {" "}
              {/* Reused modal-overlay class */}
              <div className="modal-content" onClick={(e) => e.stopPropagation()}>
                {" "}
                {/* Reused modal-content class */}
                <h4>Admin Access Verification</h4>
                <input
                  type="password"
                  value={externalAdminPassword}
                  placeholder="Enter admin password"
                  onChange={(e) => setExternalAdminPassword(e.target.value)}
                  aria-label="Admin Password"
                />
                <button
                  className="modal-action-btn primary-btn"
                  onClick={handleExternalAdminSubmit}
                  disabled={showExternalAdminAnimation}
                  aria-label={showExternalAdminAnimation ? "Verifying..." : "Verify Admin Password"}
                >
                  {showExternalAdminAnimation ? "Verifying..." : "Verify"}
                </button>
                {externalAdminPasswordError && (
                  <p className="error-text" role="alert">
                    {externalAdminPasswordError}
                  </p>
                )}
                <button
                  className="modal-action-btn secondary-btn"
                  onClick={() => {
                    setShowExternalAdminPasswordModal(false);
                    setExternalAdminPassword("");
                    setShowExternalAdminAnimation(false);
                    setExternalAdminPasswordError("");
                  }}
                  aria-label="Cancel Admin Access"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Admin Access Animation Overlay */}
        {showExternalAdminAnimation && (
          <div className="animation-overlay">
            <div className="loader-circle"></div>
            <p>Verifying Admin Access...</p>
          </div>
        )}

        {/* Forgot Password Modal */}
        {showForgotPasswordModal && (
          <div className="modal-overlay">
            <div className="modal-content" onClick={(e) => e.stopPropagation()}>
              <h4>Forgot Password</h4>
              {forgotPasswordMessage && (
                <p className="success-text">{forgotPasswordMessage}</p>
              )}
              {forgotPasswordError && (
                <p className="error-text" role="alert">
                  {forgotPasswordError}
                </p>
              )}

              {resetStep === 1 && (
                <form onSubmit={handleSendOtp}>
                  <p>Enter your email to receive a password reset OTP.</p>
                  <input
                    type="email"
                    value={forgotPasswordEmail}
                    placeholder="Enter your email"
                    onChange={(e) => setForgotPasswordEmail(e.target.value)}
                    required
                    aria-label="Email for password reset"
                  />
                  <button
                    type="submit"
                    className="modal-action-btn primary-btn"
                    disabled={loading}
                    aria-label={loading ? "Sending OTP..." : "Send OTP"}
                  >
                    {loading ? "Sending OTP..." : "Send OTP"}
                  </button>
                </form>
              )}

              {resetStep === 2 && (
                <form onSubmit={handleVerifyOtp}>
                  <p>A 6-digit OTP has been sent to {forgotPasswordEmail}. Enter it below.</p>
                  <input
                    type="text"
                    value={otp}
                    placeholder="Enter OTP"
                    onChange={(e) => setOtp(e.target.value)}
                    required
                    maxLength="6"
                    aria-label="One-Time Password"
                  />
                  <button
                    type="submit"
                    className="modal-action-btn primary-btn"
                    disabled={loading}
                    aria-label={loading ? "Verifying OTP..." : "Verify OTP"}
                  >
                    {loading ? "Verifying OTP..." : "Verify OTP"}
                  </button>
                </form>
              )}

              {resetStep === 3 && (
                <form onSubmit={handleResetPassword}>
                  <p>Enter your new password.</p>
                  <input
                    type="password"
                    value={newPassword}
                    placeholder="New password"
                    onChange={(e) => setNewPassword(e.target.value)}
                    required
                    aria-label="New password"
                  />
                  <input
                    type="password"
                    value={confirmNewPassword}
                    placeholder="Confirm new password"
                    onChange={(e) => setConfirmNewPassword(e.target.value)}
                    required
                    aria-label="Confirm new password"
                  />
                  <button
                    type="submit"
                    className="modal-action-btn primary-btn"
                    disabled={loading}
                    aria-label={loading ? "Resetting password..." : "Reset Password"}
                  >
                    {loading ? "Resetting password..." : "Reset Password"}
                  </button>
                </form>
              )}

              <button
                className="modal-action-btn secondary-btn"
                onClick={closeForgotPasswordModal}
                aria-label="Cancel password reset"
              >
                Cancel
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Login;