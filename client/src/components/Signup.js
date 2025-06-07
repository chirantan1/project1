import React, { useState } from "react";
import axios from "axios";
import { useNavigate, Link } from "react-router-dom";
import "./Signup.css";

const Signup = () => {
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    password: "",
    confirmPassword: "",
    role: "patient",
    specialization: "",
    experience: "",
    phone: "",
    bio: "",
    licenseNumber: "",
  });

  const [documents, setDocuments] = useState([]);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [loading, setLoading] = useState(false);

  const navigate = useNavigate();

  const handleChange = (e) =>
    setFormData((prev) => ({ ...prev, [e.target.name]: e.target.value }));

  const handleFileChange = (e) => {
    setDocuments([...e.target.files]);
  };

  const validateForm = () => {
    if (!formData.name || !formData.email || !formData.password || !formData.confirmPassword) {
      setError("All required fields must be filled");
      return false;
    }

    if (formData.password.length < 6) {
      setError("Password must be at least 6 characters");
      return false;
    }

    if (formData.password !== formData.confirmPassword) {
      setError("Passwords do not match");
      return false;
    }

    if (formData.role === "doctor") {
      if (
        !formData.specialization ||
        !formData.experience ||
        !formData.phone ||
        !formData.bio ||
        !formData.licenseNumber ||
        documents.length === 0
      ) {
        setError("All doctor fields are required including documents");
        return false;
      }
      if (isNaN(formData.experience) || Number(formData.experience) < 0) {
        setError("Experience must be a positive number");
        return false;
      }
    }

    setError("");
    return true;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setSuccess("");

    if (!validateForm()) return;

    setLoading(true);

    try {
      const submitData = new FormData();
      submitData.append("name", formData.name);
      submitData.append("email", formData.email);
      submitData.append("password", formData.password);
      submitData.append("role", formData.role);

      if (formData.role === "doctor") {
        submitData.append("specialization", formData.specialization);
        submitData.append("experience", formData.experience);
        submitData.append("phone", formData.phone);
        submitData.append("bio", formData.bio);
        submitData.append("licenseNumber", formData.licenseNumber);

        documents.forEach((file) => {
          submitData.append("documents", file);
        });
      }

      const response = await axios.post(
        "https://project1-backend-d55g.onrender.com/api/signup",
        submitData,
        {
          headers: {
            "Content-Type": "multipart/form-data",
          },
        }
      );

      if (formData.role === "doctor") {
        setSuccess("Registration submitted for admin approval. You'll be notified via email once approved.");
      } else {
        setSuccess("Registration successful! Redirecting...");
        localStorage.setItem("token", response.data.token);
        setTimeout(() => {
          navigate(`/${response.data.role}-dashboard`);
        }, 1500);
      }
    } catch (err) {
      console.error("Signup error:", err.response?.data);
      setError(err.response?.data?.message || "Registration failed. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="signup-page">
      <div className="signup-container">
        <h2>Create an Account</h2>

        {error && <p className="error-text">{error}</p>}
        {success && <p className="success-text">{success}</p>}

        <form onSubmit={handleSubmit} className="signup-form" encType="multipart/form-data">
          <div className="form-group">
            <label htmlFor="name">Full Name</label>
            <input
              id="name"
              name="name"
              type="text"
              placeholder="Enter your full name"
              value={formData.name}
              onChange={handleChange}
              required
            />
          </div>

          <div className="form-group">
            <label htmlFor="email">Email Address</label>
            <input
              id="email"
              name="email"
              type="email"
              placeholder="Enter your email"
              value={formData.email}
              onChange={handleChange}
              required
            />
          </div>

          <div className="form-group">
            <label htmlFor="password">Password</label>
            <input
              id="password"
              name="password"
              type="password"
              placeholder="Create a password"
              value={formData.password}
              onChange={handleChange}
              required
              minLength={6}
            />
          </div>

          <div className="form-group">
            <label htmlFor="confirmPassword">Confirm Password</label>
            <input
              id="confirmPassword"
              name="confirmPassword"
              type="password"
              placeholder="Confirm your password"
              value={formData.confirmPassword}
              onChange={handleChange}
              required
              minLength={6}
            />
          </div>

          <div className="form-group">
            <label htmlFor="role">Account Type</label>
            <select id="role" name="role" value={formData.role} onChange={handleChange}>
              <option value="patient">Patient</option>
              <option value="doctor">Doctor</option>
            </select>
          </div>

          {formData.role === "doctor" && (
            <>
              <div className="form-group">
                <label htmlFor="specialization">Specialization</label>
                <input
                  id="specialization"
                  name="specialization"
                  type="text"
                  placeholder="Your specialization"
                  value={formData.specialization}
                  onChange={handleChange}
                  required
                />
              </div>

              <div className="form-group">
                <label htmlFor="licenseNumber">License Number</label>
                <input
                  id="licenseNumber"
                  name="licenseNumber"
                  type="text"
                  placeholder="Your professional license number"
                  value={formData.licenseNumber}
                  onChange={handleChange}
                  required
                />
              </div>

              <div className="form-group">
                <label htmlFor="experience">Years of Experience</label>
                <input
                  id="experience"
                  name="experience"
                  type="number"
                  placeholder="Years of experience"
                  value={formData.experience}
                  onChange={handleChange}
                  required
                  min={0}
                />
              </div>

              <div className="form-group">
                <label htmlFor="phone">Phone Number</label>
                <input
                  id="phone"
                  name="phone"
                  type="tel"
                  placeholder="Phone number"
                  value={formData.phone}
                  onChange={handleChange}
                  required
                />
              </div>

              <div className="form-group">
                <label htmlFor="bio">Professional Bio</label>
                <textarea
                  id="bio"
                  name="bio"
                  placeholder="Write a short professional bio"
                  value={formData.bio}
                  onChange={handleChange}
                  required
                  rows={4}
                />
              </div>

              <div className="form-group">
                <label htmlFor="documents">Upload Documents (License, Certificates)</label>
                <input
                  id="documents"
                  name="documents"
                  type="file"
                  multiple
                  onChange={handleFileChange}
                  required
                  accept=".pdf,.jpg,.jpeg,.png"
                />
                <small>Upload scanned copies of your professional documents (PDF, JPG, PNG)</small>
              </div>
            </>
          )}

          <button type="submit" className="submit-btn" disabled={loading}>
            {loading ? "Registering..." : "Sign Up"}
          </button>
        </form>

        <p className="login-link">
          Already have an account? <Link to="/login">Login here</Link>
        </p>
      </div>
    </div>
  );
};

export default Signup;
