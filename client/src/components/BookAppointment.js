import React, { useState, useEffect } from "react";
import axios from "axios";
import { useNavigate, useLocation } from "react-router-dom";
import "./BookAppointment.css";

const api = axios.create({
  baseURL: "https://project1-backend-d55g.onrender.com/api",
  headers: {
    "Content-Type": "application/json",
  },
});

const BookAppointment = () => {
  const getTodayDate = () => {
    const today = new Date();
    const year = today.getFullYear();
    const month = String(today.getMonth() + 1).padStart(2, '0');
    const day = String(today.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  // Initialize formData with proper values
  const [formData, setFormData] = useState({
    date: getTodayDate(),
    time: "10:00", // Default time in correct format
    symptoms: "",
  });

  const [doctor, setDoctor] = useState(null);
  const [message, setMessage] = useState("");
  const [error, setError] = useState(false);
  const [validationErrors, setValidationErrors] = useState({});
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const [todayDate] = useState(getTodayDate());

  useEffect(() => {
    const fetchDoctorDetails = async () => {
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
  }, [location.state]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
    
    if (validationErrors[name]) {
      setValidationErrors(prev => ({ ...prev, [name]: undefined }));
    }
    setMessage("");
    setError(false);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setMessage("");
    setError(false);
    setValidationErrors({});
    setLoading(true);

    // Enhanced client-side validation
    const errors = {};
    if (!formData.date) errors.date = "Please select a date";
    if (!formData.time) errors.time = "Please select a time";
    if (!formData.symptoms.trim()) errors.symptoms = "Please describe your symptoms";

    if (Object.keys(errors).length > 0) {
      setValidationErrors(errors);
      setMessage("Please fill all required fields");
      setError(true);
      setLoading(false);
      return;
    }

    const appointmentData = {
      doctorId: location.state?.doctorId,
      date: formData.date,
      time: formData.time,
      symptoms: formData.symptoms,
    };

    console.log("Submitting appointment data:", appointmentData);

    try {
      api.defaults.headers.Authorization = `Bearer ${localStorage.getItem("token")}`;

      const response = await api.post("/appointments", appointmentData);

      if (response.data.success) {
        setMessage("Appointment booked successfully!");
        setTimeout(() => navigate("/patient-dashboard"), 1800);
      } else {
        setMessage(response.data.message || "Booking failed.");
        setError(true);
      }
    } catch (err) {
      console.error("Booking error:", {
        response: err.response?.data,
        error: err
      });

      if (err.response?.data) {
        const { errors: backendErrors, message: backendMessage } = err.response.data;
        
        if (backendErrors) {
          // Handle both express-validator array format and mongoose error object format
          const formattedErrors = Array.isArray(backendErrors)
            ? backendErrors.reduce((acc, error) => ({ ...acc, [error.path || error.param]: error.msg }), {})
            : Object.keys(backendErrors).reduce((acc, key) => {
                const errorObj = backendErrors[key];
                return {
                  ...acc,
                  [key]: errorObj.message || `Invalid ${key}`
                };
              }, {});

          setValidationErrors(formattedErrors);
        }
        
        setMessage(backendMessage || "Booking failed. Please check your inputs.");
      } else {
        setMessage(err.message || "An error occurred. Please try again.");
      }
      setError(true);
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
            min={todayDate}
            className={validationErrors.date ? "error-input" : ""}
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
            className={validationErrors.time ? "error-input" : ""}
          >
            <option value="09:00">9:00 AM</option>
            <option value="10:00">10:00 AM</option>
            <option value="11:00">11:00 AM</option>
            <option value="12:00">12:00 PM</option>
            <option value="13:00">1:00 PM</option>
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
            className={validationErrors.symptoms ? "error-input" : ""}
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