import React, { useState } from "react";
import axios from "axios";
import { useNavigate, Link } from "react-router-dom";
import "./Login.css";
import loginBg from "../asset/signup.jpg";

const Login = () => {
  // State for login form
  const [formData, setFormData] = useState({ email: "", password: "" });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  // Admin portal states
  const [showExternalAdminPasswordModal, setShowExternalAdminPasswordModal] = useState(false);
  const [externalAdminPassword, setExternalAdminPassword] = useState("");
  const [externalAdminPasswordError, setExternalAdminPasswordError] = useState("");
  const [showExternalAdminAnimation, setShowExternalAdminAnimation] = useState(false);

  // Forgot password states
  const [showForgotPasswordModal, setShowForgotPasswordModal] = useState(false);
  const [forgotPasswordEmail, setForgotPasswordEmail] = useState("");
  const [otp, setOtp] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmNewPassword, setConfirmNewPassword] = useState("");
  const [forgotPasswordMessage, setForgotPasswordMessage] = useState("");
  const [forgotPasswordError, setForgotPasswordError] = useState("");
  const [otpSent, setOtpSent] = useState(false);
  const [resetStep, setResetStep] = useState(1);

  const navigate = useNavigate();

  const handleChange = (e) => {
    setError("");
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const res = await axios.post(
        "https://project1-backend-d55g.onrender.com/api/auth/login",
        formData
      );

      const { token, user } = res.data;

      if (token) {
        localStorage.setItem("token", token);
      }

      if (user?.role === "doctor") {
        navigate("/doctor-dashboard");
      } else if (user?.role === "patient") {
        navigate("/patient-dashboard");
      } else if (user?.role === "admin") {
        navigate("/admin-dashboard");
      } else {
        setError("Login successful, but user role is unknown. Please contact support.");
      }

      setFormData({ email: "", password: "" });
    } catch (err) {
      console.error("Login error:", err.response?.data || err);
      setError(
        err.response?.data?.message
          ? "Login failed: " + err.response.data.message
          : "Login failed: " + err.message
      );
    } finally {
      setLoading(false);
    }
  };

  const handleExternalAdminSubmit = () => {
    setExternalAdminPasswordError("");

    if (externalAdminPassword === (process.env.REACT_APP_EXTERNAL_ADMIN_PASSWORD || "admin")) {
      setShowExternalAdminAnimation(true);
      setTimeout(() => {
        window.open("https://admin-1-5zv8.onrender.com", "_blank");
        setShowExternalAdminPasswordModal(false);
        setExternalAdminPassword("");
        setShowExternalAdminAnimation(false);
        setExternalAdminPasswordError("");
      }, 3000);
    } else {
      setExternalAdminPasswordError("Incorrect password. Please try again.");
    }
  };

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
      setResetStep(2);
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
      setResetStep(3);
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
      closeForgotPasswordModal();
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

  return (
    <div className="login-page">
      {/* Animated background elements */}
      <div className="bg-overlay"></div>
      <div className="particles-container">
        {[...Array(30)].map((_, i) => (
          <div key={i} className="particle" style={{
            top: `${Math.random() * 100}%`,
            left: `${Math.random() * 100}%`,
            width: `${Math.random() * 10 + 5}px`,
            height: `${Math.random() * 10 + 5}px`,
            animationDelay: `${Math.random() * 5}s`,
            animationDuration: `${Math.random() * 20 + 10}s`
          }}></div>
        ))}
      </div>

      <div className="content-wrapper">
        <h1 className="main-heading">
          <span className="gradient-text">Patient Management System</span>
          <span className="sub-heading">with Integrated Disease Assistance</span>
        </h1>

        <div className="login-container">
          <div className="login-card">
            <div className="card-decoration"></div>
            
            <div className="login-header">
              <h2>Welcome Back</h2>
              <p>Please login to your account</p>
            </div>

            <form onSubmit={handleSubmit} className="login-form">
              <div className="form-group floating-label">
                <input
                  type="email"
                  id="email"
                  name="email"
                  required
                  value={formData.email}
                  onChange={handleChange}
                  autoComplete="email"
                />
                <label htmlFor="email">Email Address</label>
                <div className="input-decoration">
                  <i className="fas fa-envelope"></i>
                </div>
              </div>

              <div className="form-group floating-label">
                <input
                  type="password"
                  id="password"
                  name="password"
                  required
                  value={formData.password}
                  onChange={handleChange}
                  autoComplete="current-password"
                />
                <label htmlFor="password">Password</label>
                <div className="input-decoration">
                  <i className="fas fa-lock"></i>
                </div>
              </div>

              <div className="form-options">
                <div className="remember-me">
                  <input type="checkbox" id="remember" />
                  <label htmlFor="remember">Remember me</label>
                </div>
                <button
                  type="button"
                  className="forgot-password-link"
                  onClick={() => setShowForgotPasswordModal(true)}
                >
                  Forgot Password?
                </button>
              </div>

              <button 
                type="submit" 
                className="submit-btn neon-btn"
                disabled={loading}
              >
                {loading ? (
                  <span className="btn-loader"></span>
                ) : (
                  <>
                    <span className="btn-text">Login</span>
                    <span className="btn-icon">
                      <i className="fas fa-arrow-right"></i>
                    </span>
                  </>
                )}
              </button>

              {error && (
                <div className="error-message">
                  <i className="fas fa-exclamation-circle"></i>
                  <span>{error}</span>
                </div>
              )}
{/* 
              <div className="social-login">
                <p>Or login with</p>
                <div className="social-icons">
                  <button type="button" className="social-btn google">
                    <i className="fab fa-google"></i>
                  </button>
                  <button type="button" className="social-btn facebook">
                    <i className="fab fa-facebook-f"></i>
                  </button>
                  <button type="button" className="social-btn twitter">
                    <i className="fab fa-twitter"></i>
                  </button>
                </div>
              </div> */}

              <div className="register-link">
                Don't have an account? <Link to="/signup">Create one</Link>
              </div>
            </form>
          </div>
        </div>

        <div className="feature-buttons">
          <button
            className="feature-btn ai-assistant-btn glass-morphism"
            onClick={() => window.open("https://disease-assistance-web.onrender.com", "_blank")}
          >
            <i className="fas fa-robot"></i>
            <span>AI Health Assistant</span>
          </button>

          <button
            className="feature-btn admin-access-btn glass-morphism"
            onClick={() => setShowExternalAdminPasswordModal(true)}
          >
            <i className="fas fa-user-shield"></i>
            <span>Admin Portal</span>
          </button>
        </div>
      </div>

      {/* External Admin Password Modal */}
      {showExternalAdminPasswordModal && (
        <div className="modal-overlay">
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <h4>Admin Access Verification</h4>
            <div className="modal-input-group">
              <i className="fas fa-key"></i>
              <input
                type="password"
                value={externalAdminPassword}
                placeholder="Enter admin password"
                onChange={(e) => setExternalAdminPassword(e.target.value)}
              />
            </div>
            <div className="modal-actions">
              <button
                className="modal-action-btn primary-btn"
                onClick={handleExternalAdminSubmit}
                disabled={showExternalAdminAnimation}
              >
                {showExternalAdminAnimation ? (
                  <span className="btn-loader small"></span>
                ) : (
                  "Verify"
                )}
              </button>
              <button
                className="modal-action-btn secondary-btn"
                onClick={() => {
                  setShowExternalAdminPasswordModal(false);
                  setExternalAdminPassword("");
                  setExternalAdminPasswordError("");
                }}
              >
                Cancel
              </button>
            </div>
            {externalAdminPasswordError && (
              <div className="error-message">
                <i className="fas fa-exclamation-circle"></i>
                <span>{externalAdminPasswordError}</span>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Admin Access Animation */}
      {showExternalAdminAnimation && (
        <div className="animation-overlay">
          <div className="animation-content">
            <div className="loader-circle"></div>
            <p>Verifying Admin Access...</p>
          </div>
        </div>
      )}

      {/* Forgot Password Modal */}
      {showForgotPasswordModal && (
        <div className="modal-overlay">
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <h4>Forgot Password</h4>
            {forgotPasswordMessage && (
              <div className="success-message">
                <i className="fas fa-check-circle"></i>
                <span>{forgotPasswordMessage}</span>
              </div>
            )}
            {forgotPasswordError && (
              <div className="error-message">
                <i className="fas fa-exclamation-circle"></i>
                <span>{forgotPasswordError}</span>
              </div>
            )}

            {resetStep === 1 && (
              <form onSubmit={handleSendOtp} className="modal-form">
                <p>Enter your email to receive a password reset OTP.</p>
                <div className="modal-input-group">
                  <i className="fas fa-envelope"></i>
                  <input
                    type="email"
                    value={forgotPasswordEmail}
                    placeholder="Enter your email"
                    onChange={(e) => setForgotPasswordEmail(e.target.value)}
                    required
                  />
                </div>
                <div className="modal-actions">
                  <button
                    type="submit"
                    className="modal-action-btn primary-btn"
                    disabled={loading}
                  >
                    {loading ? (
                      <span className="btn-loader small"></span>
                    ) : (
                      "Send OTP"
                    )}
                  </button>
                  <button
                    type="button"
                    className="modal-action-btn secondary-btn"
                    onClick={closeForgotPasswordModal}
                  >
                    Cancel
                  </button>
                </div>
              </form>
            )}

            {resetStep === 2 && (
              <form onSubmit={handleVerifyOtp} className="modal-form">
                <p>A 6-digit OTP has been sent to {forgotPasswordEmail}. Enter it below.</p>
                <div className="modal-input-group">
                  <i className="fas fa-shield-alt"></i>
                  <input
                    type="text"
                    value={otp}
                    placeholder="Enter OTP"
                    onChange={(e) => setOtp(e.target.value)}
                    required
                    maxLength="6"
                  />
                </div>
                <div className="modal-actions">
                  <button
                    type="submit"
                    className="modal-action-btn primary-btn"
                    disabled={loading}
                  >
                    {loading ? (
                      <span className="btn-loader small"></span>
                    ) : (
                      "Verify OTP"
                    )}
                  </button>
                  <button
                    type="button"
                    className="modal-action-btn secondary-btn"
                    onClick={closeForgotPasswordModal}
                  >
                    Cancel
                  </button>
                </div>
              </form>
            )}

            {resetStep === 3 && (
              <form onSubmit={handleResetPassword} className="modal-form">
                <p>Enter your new password.</p>
                <div className="modal-input-group">
                  <i className="fas fa-lock"></i>
                  <input
                    type="password"
                    value={newPassword}
                    placeholder="New password"
                    onChange={(e) => setNewPassword(e.target.value)}
                    required
                  />
                </div>
                <div className="modal-input-group">
                  <i className="fas fa-lock"></i>
                  <input
                    type="password"
                    value={confirmNewPassword}
                    placeholder="Confirm new password"
                    onChange={(e) => setConfirmNewPassword(e.target.value)}
                    required
                  />
                </div>
                <div className="modal-actions">
                  <button
                    type="submit"
                    className="modal-action-btn primary-btn"
                    disabled={loading}
                  >
                    {loading ? (
                      <span className="btn-loader small"></span>
                    ) : (
                      "Reset Password"
                    )}
                  </button>
                  <button
                    type="button"
                    className="modal-action-btn secondary-btn"
                    onClick={closeForgotPasswordModal}
                  >
                    Cancel
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default Login;