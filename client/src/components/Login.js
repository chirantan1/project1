import React, { useState } from "react";
import axios from "axios";
import { useNavigate, Link } from "react-router-dom";
import "./Login.css";
import loginBg from "../asset/signup.jpg"; // ✅ Adjust the path if needed

const Login = () => {
  const [formData, setFormData] = useState({ email: "", password: "" });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [showAdminInput, setShowAdminInput] = useState(false);
  const [adminPass, setAdminPass] = useState("");
  const [adminError, setAdminError] = useState("");
  const [showAnimation, setShowAnimation] = useState(false);

  const navigate = useNavigate();

  const handleChange = (e) =>
    setFormData({ ...formData, [e.target.name]: e.target.value });

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const res = await axios.post(
        "https://project1-backend-d55g.onrender.com/api/auth/login",
        formData
      );

      const { token, role } = res.data;
      if (token) {
        localStorage.setItem("token", token);
      }

      if (role === "doctor") {
        navigate("/doctor-dashboard");
      } else if (role === "patient") {
        navigate("/patient-dashboard");
      } else {
        setError("Unknown user role");
      }

      setFormData({ email: "", password: "" });
    } catch (err) {
      setError(
        err.response?.data?.message
          ? "Login failed: " + err.response.data.message
          : "Login failed: " + err.message
      );
    } finally {
      setLoading(false);
    }
  };

  const handleAdminSubmit = () => {
    if (adminPass === "admin") {
      setShowAnimation(true);
      setTimeout(() => {
        window.open("https://admin-1-5zv8.onrender.com", "_blank");
        setShowAdminInput(false);
        setAdminPass("");
        setShowAnimation(false);
        setAdminError("");
      }, 3000);
    } else {
      setAdminError("Incorrect password. Try again.");
    }
  };

  return (
    <div
      className="login-page"
      style={{
        backgroundImage: `url(${loginBg})`,
        backgroundSize: "cover",
        backgroundPosition: "center",
        minHeight: "100vh",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "flex-start",
        padding: "2rem",
      }}
    >
      <h1 className="main-heading">
        Patient Management System with Integrated Disease Assistance
      </h1>

      <div className="login-container">
        <h2>Login</h2>

        <form onSubmit={handleSubmit} className="login-form">
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
            />
          </div>

          <button type="submit" className="submit-btn" disabled={loading}>
            {loading ? "Logging in..." : "Login"}
          </button>
        </form>

        {error && <p className="error-text">{error}</p>}

        <p className="register-link">
          Don't have an account? <Link to="/signup">Sign up here</Link>
        </p>

        {/* ✅ AI Assistant Button */}
        <div className="chatbot-access">
          <button
            className="chatbot-btn"
            onClick={() =>
              window.open("https://disease-assistance-web.onrender.com", "_blank")
            }
          >
            Ask our AI Assistant
          </button>
        </div>

        <div className="admin-access">
          <h3>Admin Dashboard (Official Use Only)</h3>
          <button className="admin-btn" onClick={() => setShowAdminInput(true)}>
            Access Admin Dashboard
          </button>

          {showAdminInput && (
            <div className="otp-modal">
              <h4>Admin Access</h4>
              <input
                type="password"
                value={adminPass}
                placeholder="Enter admin password"
                onChange={(e) => setAdminPass(e.target.value)}
              />
              <button className="verify-btn" onClick={handleAdminSubmit}>
                Verify
              </button>
              {adminError && <p className="error-text">{adminError}</p>}
              <button
                className="close-btn"
                onClick={() => setShowAdminInput(false)}
              >
                Cancel
              </button>
            </div>
          )}
        </div>
      </div>

      {showAnimation && (
        <div className="animation-overlay">
          <div className="loader-circle"></div>
          <p>Verifying Admin Access...</p>
        </div>
      )}
    </div>
  );
};

export default Login;
