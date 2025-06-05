import React, { useState } from "react";
import axios from "axios";
import { useNavigate, Link } from "react-router-dom";
import "./Login.css";

const Login = () => {
  const [formData, setFormData] = useState({ email: "", password: "" });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleChange = (e) =>
    setFormData({ ...formData, [e.target.name]: e.target.value });

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const res = await axios.post(
        "http://localhost:5000/api/auth/login",
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

  return (
    <div className="login-page">
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
      </div>
    </div>
  );
};

export default Login;
