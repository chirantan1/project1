import React, { useState } from "react";
import axios from "axios";
import { useNavigate, Link } from "react-router-dom";
import "./Signup.css"; // Import the CSS file for styling

const Signup = () => {
  // State to manage form input values
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    password: "",
    confirmPassword: "",
    role: "patient", // Default role is patient
    specialization: "",
    experience: "",
    phone: "",
    bio: "",
    // New fields for doctor profile
    isActive: true, // Default to true for new doctor accounts
    availableDays: "", // e.g., "Monday, Wednesday, Friday"
    qualifications: "", // e.g., "MD, PhD, FRCS"
    hospitalAffiliation: "", // e.g., "City General Hospital"
    // Though typically patient-related, added for doctor signup as per request
    allergies: "", // e.g., "Penicillin, Dust"
    medications: "", // e.g., "Insulin, Metformin"
    medicalHistory: "", // e.g., "No significant history"
  });

  // State for displaying error, success messages, and loading status
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [loading, setLoading] = useState(false);
  const [showSuccessAnimation, setShowSuccessAnimation] = useState(false); // New state for success animation

  // Hook to programmatically navigate users
  const navigate = useNavigate();

  // Handles changes in form input fields and updates the formData state
  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: type === "checkbox" ? checked : value, // Handle checkbox boolean values
    }));
  };

  // Validates the form data before submission
  const validateForm = () => {
    // Clear previous errors
    setError("");

    // General validation for all user types
    if (!formData.name.trim()) {
      setError("Full Name is required.");
      return false;
    }
    if (!formData.email.trim()) {
      setError("Email Address is required.");
      return false;
    }
    // Basic email format validation using a regex
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      setError("Please enter a valid email address.");
      return false;
    }
    if (!formData.password) {
      setError("Password is required.");
      return false;
    }
    if (formData.password.length < 6) {
      setError("Password must be at least 6 characters long.");
      return false;
    }
    if (formData.password !== formData.confirmPassword) {
      setError("Passwords do not match.");
      return false;
    }

    // Doctor-specific validation
    if (formData.role === "doctor") {
      if (!formData.specialization.trim()) {
        setError("Doctor Specialization is required.");
        return false;
      }
      if (!formData.experience || isNaN(formData.experience) || Number(formData.experience) < 0) {
        setError("Experience must be a positive number.");
        return false;
      }
      if (!formData.phone.trim()) {
        setError("Phone Number is required.");
        return false;
      }
      // Basic phone number validation (e.g., at least 10 digits)
      if (!/^\d{10,}$/.test(formData.phone.replace(/\D/g, ''))) { // Remove non-digits before checking length
        setError("Please enter a valid phone number (at least 10 digits).");
        return false;
      }
      if (!formData.bio.trim()) {
        setError("Professional Bio is required.");
        return false;
      }
      if (!formData.availableDays.trim()) {
        setError("Available Days are required.");
        return false;
      }
      if (!formData.qualifications.trim()) {
        setError("Qualifications are required.");
        return false;
      }
      if (!formData.hospitalAffiliation.trim()) {
        setError("Hospital Affiliation is required.");
        return false;
      }
    }

    return true; // Form is valid
  };

  // Handles the form submission
  const handleSubmit = async (e) => {
    e.preventDefault(); // Prevent default browser form submission
    setError(""); // Reset error message
    setSuccess(""); // Reset success message

    // Run validation; if it fails, stop the submission
    if (!validateForm()) return;

    setLoading(true); // Set loading state to true during API call

    try {
      // Construct the data payload for the API
      const submitData = {
        name: formData.name,
        email: formData.email,
        password: formData.password,
        role: formData.role,
      };

      // Add doctor-specific fields if the role is 'doctor'
      if (formData.role === "doctor") {
        submitData.specialization = formData.specialization;
        submitData.experience = Number(formData.experience); // Ensure it's a number
        submitData.phone = formData.phone;
        submitData.bio = formData.bio;
        submitData.isActive = formData.isActive; // Send boolean value
        submitData.availableDays = formData.availableDays;
        submitData.qualifications = formData.qualifications;
        submitData.hospitalAffiliation = formData.hospitalAffiliation;
        submitData.allergies = formData.allergies; // Include even if optional
        submitData.medications = formData.medications; // Include even if optional
        submitData.medicalHistory = formData.medicalHistory; // Include even if optional
      }

      // Make the POST request to the signup API endpoint
      const response = await axios.post(
        "https://project1-backend-d55g.onrender.com/api/auth/signup",
        submitData
      );

      // On successful registration
      setSuccess("Registration successful!"); // Set success message
      setShowSuccessAnimation(true); // Show the success animation

      // After a delay, hide animation and redirect to login
      setTimeout(() => {
        setShowSuccessAnimation(false);
        navigate("/login"); // Redirect to the login page
      }, 3000); // Animation duration + a little extra for user to see
      
      // Removed localStorage.setItem("token") as user will log in separately
      // Removed direct dashboard navigation as user will be redirected to login

    } catch (err) {
      // Log and display error messages if the API call fails
      console.error("Signup error:", err.response?.data);
      setError(err.response?.data?.message || "Registration failed. Please try again.");
    } finally {
      setLoading(false); // Reset loading state
    }
  };

  return (
    <div className="signup-page">
      <div className="signup-container">
        <h2>Create an Account</h2>

        {/* Display error messages */}
        {error && <p className="error-text" aria-live="polite">{error}</p>}
        {/* Display success messages (will be hidden when animation is active) */}
        {success && !showSuccessAnimation && <p className="success-text" aria-live="polite">{success}</p>}

        <form onSubmit={handleSubmit} className="signup-form" noValidate>
          {/* Full Name Field */}
          <div className="form-group">
            <label htmlFor="name">Full Name<span className="required-star">*</span></label>
            <input
              id="name"
              name="name"
              type="text"
              placeholder="e.g., John Doe"
              value={formData.name}
              onChange={handleChange}
              required
              aria-required="true"
              autoComplete="name"
            />
          </div>

          {/* Email Address Field */}
          <div className="form-group">
            <label htmlFor="email">Email Address<span className="required-star">*</span></label>
            <input
              id="email"
              name="email"
              type="email"
              placeholder="e.g., your.email@example.com"
              value={formData.email}
              onChange={handleChange}
              required
              aria-required="true"
              autoComplete="email"
            />
          </div>

          {/* Password Field */}
          <div className="form-group">
            <label htmlFor="password">Password<span className="required-star">*</span></label>
            <input
              id="password"
              name="password"
              type="password"
              placeholder="Enter at least 6 characters"
              value={formData.password}
              onChange={handleChange}
              required
              minLength={6}
              aria-required="true"
              autoComplete="new-password"
            />
          </div>

          {/* Confirm Password Field */}
          <div className="form-group">
            <label htmlFor="confirmPassword">Confirm Password<span className="required-star">*</span></label>
            <input
              id="confirmPassword"
              name="confirmPassword"
              type="password"
              placeholder="Re-enter your password"
              value={formData.confirmPassword}
              onChange={handleChange}
              required
              minLength={6}
              aria-required="true"
              autoComplete="new-password"
            />
          </div>

          {/* Account Type Selection */}
          <div className="form-group">
            <label htmlFor="role">Account Type<span className="required-star">*</span></label>
            <select
              id="role"
              name="role"
              value={formData.role}
              onChange={handleChange}
              aria-required="true"
            >
              <option value="patient">Patient</option>
              <option value="doctor">Doctor</option>
            </select>
          </div>

          {/* Doctor-Specific Fields (Conditionally Rendered) */}
          {formData.role === "doctor" && (
            <>
              {/* Specialization Field */}
              <div className="form-group">
                <label htmlFor="specialization">Specialization<span className="required-star">*</span></label>
                <input
                  id="specialization"
                  name="specialization"
                  type="text"
                  placeholder="e.g., Cardiology, Pediatrics, General Surgery"
                  value={formData.specialization}
                  onChange={handleChange}
                  required
                  aria-required="true"
                  autoComplete="off"
                />
              </div>

              {/* Years of Experience Field */}
              <div className="form-group">
                <label htmlFor="experience">Years of Experience<span className="required-star">*</span></label>
                <input
                  id="experience"
                  name="experience"
                  type="number"
                  placeholder="e.g., 5"
                  value={formData.experience}
                  onChange={handleChange}
                  required
                  min={0}
                  aria-required="true"
                  autoComplete="off"
                />
              </div>

              {/* Phone Number Field */}
              <div className="form-group">
                <label htmlFor="phone">Phone Number<span className="required-star">*</span></label>
                <input
                  id="phone"
                  name="phone"
                  type="tel"
                  placeholder="e.g., +919876543210"
                  value={formData.phone}
                  onChange={handleChange}
                  required
                  aria-required="true"
                  autoComplete="tel"
                />
              </div>

              {/* Professional Bio Field */}
              <div className="form-group">
                <label htmlFor="bio">Professional Bio<span className="required-star">*</span></label>
                <textarea
                  id="bio"
                  name="bio"
                  placeholder="Tell us about your medical background, interests, and approach to patient care."
                  value={formData.bio}
                  onChange={handleChange}
                  required
                  rows={4}
                  aria-required="true"
                  autoComplete="off"
                />
              </div>

              {/* New Doctor-Specific Fields */}
              <div className="form-group checkbox-group">
                <input
                  id="isActive"
                  name="isActive"
                  type="checkbox"
                  checked={formData.isActive}
                  onChange={handleChange}
                  aria-required="true"
                />
                <label htmlFor="isActive">Active Status</label>
              </div>

              <div className="form-group">
                <label htmlFor="availableDays">Available Days<span className="required-star">*</span></label>
                <input
                  id="availableDays"
                  name="availableDays"
                  type="text"
                  placeholder="e.g., Monday, Wednesday, Friday"
                  value={formData.availableDays}
                  onChange={handleChange}
                  required
                  aria-required="true"
                  autoComplete="off"
                />
              </div>

              <div className="form-group">
                <label htmlFor="qualifications">Qualifications<span className="required-star">*</span></label>
                <textarea
                  id="qualifications"
                  name="qualifications"
                  placeholder="e.g., MD from ABC University, Board Certified in Internal Medicine"
                  value={formData.qualifications}
                  onChange={handleChange}
                  required
                  rows={2}
                  aria-required="true"
                  autoComplete="off"
                />
              </div>

              <div className="form-group">
                <label htmlFor="hospitalAffiliation">Hospital Affiliation<span className="required-star">*</span></label>
                <input
                  id="hospitalAffiliation"
                  name="hospitalAffiliation"
                  type="text"
                  placeholder="e.g., St. Jude Medical Center"
                  value={formData.hospitalAffiliation}
                  onChange={handleChange}
                  required
                  aria-required="true"
                  autoComplete="off"
                />
              </div>

              {/* Optional: Patient-like fields if applicable for doctors */}
              <div className="form-group">
                <label htmlFor="allergies">Allergies (Optional)</label>
                <textarea
                  id="allergies"
                  name="allergies"
                  type="text"
                  placeholder="Any known allergies? (e.g., Penicillin, Latex)"
                  value={formData.allergies}
                  onChange={handleChange}
                  rows={2}
                  autoComplete="off"
                />
              </div>

              <div className="form-group">
                <label htmlFor="medications">Current Medications (Optional)</label>
                <textarea
                  id="medications"
                  name="medications"
                  type="text"
                  placeholder="Are you currently on any medications? (e.g., Metformin, Lisinopril)"
                  value={formData.medications}
                  onChange={handleChange}
                  rows={2}
                  autoComplete="off"
                />
              </div>

              <div className="form-group">
                <label htmlFor="medicalHistory">Past Medical History (Optional)</label>
                <textarea
                  id="medicalHistory"
                  name="medicalHistory"
                  type="text"
                  placeholder="Briefly describe any significant past medical history."
                  value={formData.medicalHistory}
                  onChange={handleChange}
                  rows={3}
                  autoComplete="off"
                />
              </div>
            </>
          )}

          {/* Submit Button */}
          <button type="submit" className="submit-btn" disabled={loading}>
            {loading ? "Registering..." : "Sign Up"}
          </button>
        </form>

        {/* Link to Login Page */}
        <p className="login-link">
          Already have an account? <Link to="/login">Login here</Link>
        </p>
      </div>

      {/* Success Animation Overlay */}
      {showSuccessAnimation && (
        <div className="animation-overlay success-animation-overlay">
          <div className="success-checkmark-container">
            <svg className="checkmark" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 52 52">
              <circle className="checkmark-circle" cx="26" cy="26" r="25" fill="none"/>
              <path className="checkmark-check" fill="none" d="M14.1 27.2l7.1 7.2 16.7-16.8"/>
            </svg>
          </div>
          <p className="success-message-text">{success} Redirecting...</p>
        </div>
      )}
    </div>
  );
};

export default Signup;
