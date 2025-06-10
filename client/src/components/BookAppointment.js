import React, { useState, useEffect } from "react";
import axios from "axios";
import { useNavigate, useLocation } from "react-router-dom";
import "./BookAppointment.css";

// Axios instance using production baseURL
const api = axios.create({
  baseURL: "https://project1-backend-d55g.onrender.com/api",
  headers: {
    "Content-Type": "application/json",
  },
});

const BookAppointment = () => {
  const [formData, setFormData] = useState({
    date: "",
    time: "10:00", // Default time, ensure it matches HH:MM format
    symptoms: "",
  });
  const [doctor, setDoctor] = useState(null);
  const [message, setMessage] = useState("");
  const [error, setError] = useState(false);
  const [validationErrors, setValidationErrors] = useState({}); // New state for detailed validation errors
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    const fetchDoctorDetails = async () => {
      // Clear previous error messages on component mount
      setMessage("");
      setError(false);
      setValidationErrors({});

      api.defaults.headers.Authorization = `Bearer ${localStorage.getItem("token")}`;

      if (!location.state?.doctorId) {
        setMessage("No doctor selected. Please go back and select a doctor.");
        setError(true);
        return;
      }

      try {
        const res = await api.get(`/auth/doctors/${location.state.doctorId}`);
        setDoctor(res.data.data);
      } catch (err) {
        console.error("Error fetching doctor:", err.response?.data || err.message);
        setMessage("Failed to load doctor details.");
        setError(true);
      }
    };

    fetchDoctorDetails();
  }, [location.state]); // Dependency array includes location.state

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
    // Clear specific validation error for the field being changed
    if (validationErrors[e.target.name]) {
      setValidationErrors(prev => ({ ...prev, [e.target.name]: undefined }));
    }
    // Also clear general messages when user starts typing again
    setMessage("");
    setError(false);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setMessage("");
    setError(false);
    setValidationErrors({}); // Clear previous validation errors
    setLoading(true);

    // Basic client-side validation before sending
    if (!formData.date || !formData.time || !formData.symptoms) {
      setMessage("All fields are required.");
      setError(true);
      setLoading(false);
      return;
    }

    // This console.log is crucial for debugging what you're actually sending
    console.log("Attempting to book appointment with data:", {
      doctorId: location.state?.doctorId,
      date: formData.date,
      time: formData.time,
      symptoms: formData.symptoms,
    });

    try {
      api.defaults.headers.Authorization = `Bearer ${localStorage.getItem("token")}`;

      const response = await api.post("/appointments", {
        doctorId: location.state?.doctorId,
        date: formData.date,
        time: formData.time,
        symptoms: formData.symptoms,
      });

      if (response.data.success) {
        setMessage("Appointment booked successfully!");
        setTimeout(() => navigate("/patient-dashboard"), 1800);
      } else {
        // This 'else' block might be hit if the backend sends `success: false`
        // but not necessarily due to express-validator (e.g., slot already booked)
        setMessage(response.data.message || "Booking failed.");
        setError(true);
      }
    } catch (err) {
      console.error("Booking error details:", err.response?.data || err.message);

      if (err.response && err.response.data) {
        const backendResponse = err.response.data;
        if (backendResponse.errors && Array.isArray(backendResponse.errors)) {
          // This path is for express-validator errors (e.g., if you return errors.array())
          const newValidationErrors = {};
          backendResponse.errors.forEach(errorItem => {
            if (errorItem.param) {
              newValidationErrors[errorItem.param] = errorItem.msg;
            }
          });
          setValidationErrors(newValidationErrors);
          setMessage("Please correct the highlighted errors.");
          setError(true);
        } else if (backendResponse.errors && typeof backendResponse.errors === 'object' && !Array.isArray(backendResponse.errors)) {
            // This path is for the specific { "time": {} } error format you showed
            // or if you custom-formatted errors as an object of objects
            const newValidationErrors = {};
            for (const key in backendResponse.errors) {
                // If the error value is an object, try to get its message or just note its presence
                newValidationErrors[key] = backendResponse.errors[key].message || `Invalid ${key} format.`;
            }
            setValidationErrors(newValidationErrors);
            setMessage(backendResponse.message || "Validation failed. Please check your inputs.");
            setError(true);
        } else {
          // Fallback for other backend errors (e.g., custom messages like "slot already booked")
          setMessage(backendResponse.message || "Booking failed due to a server error.");
          setError(true);
        }
      } else {
        // Network errors or other unhandled exceptions
        setMessage(err.message || "Booking failed. Please check your internet connection.");
        setError(true);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="book-appointment-container">
      <h2 className="title">Book Appointment</h2>

      {doctor ? (
        <div className="doctor-info">
          <h3>Dr. {doctor.name}</h3>
          <p>Specialization: {doctor.specialization}</p>
          {doctor.experience && <p>Experience: {doctor.experience} years</p>}
        </div>
      ) : (
        <p>Loading doctor details...</p>
      )}

      <form className="appointment-form" onSubmit={handleSubmit}>
        <div className="form-group">
          <label htmlFor="date">Appointment Date</label>
          <input
            type="date"
            id="date"
            name="date"
            value={formData.date}
            onChange={handleChange}
            required
            min={new Date().toISOString().split("T")[0]} // Prevents selecting past dates
          />
          {validationErrors.date && <p className="error-text">{validationErrors.date}</p>}
        </div>

        <div className="form-group">
          <label htmlFor="time">Preferred Time</label>
          <select
            id="time"
            name="time"
            value={formData.time}
            onChange={handleChange}
            required
          >
            {/* These options are already in HH:MM format, which is good */}
            <option value="10:00">10:00 AM</option>
            <option value="11:00">11:00 AM</option>
            <option value="12:00">12:00 PM</option>
            <option value="14:00">2:00 PM</option>
            <option value="15:00">3:00 PM</option>
            <option value="16:00">4:00 PM</option>
          </select>
          {validationErrors.time && <p className="error-text">{validationErrors.time}</p>}
        </div>

        <div className="form-group">
          <label htmlFor="symptoms">Symptoms/Reason</label>
          <textarea
            id="symptoms"
            name="symptoms"
            value={formData.symptoms}
            onChange={handleChange}
            placeholder="Describe your symptoms or reason for the appointment"
            rows={4}
            required
          />
          {validationErrors.symptoms && <p className="error-text">{validationErrors.symptoms}</p>}
        </div>

        <button type="submit" className="submit-btn" disabled={loading}>
          {loading ? "Booking..." : "Book Appointment"}
        </button>
      </form>

      {message && (
        <p className={`message ${error ? "error" : "success"}`}>
          {message}
        </p>
      )}
    </div>
  );
};

export default BookAppointment;