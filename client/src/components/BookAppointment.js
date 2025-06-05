import React, { useState, useEffect } from "react";
import axios from "axios";
import { useNavigate, useLocation } from "react-router-dom";
import "./BookAppointment.css";

// ✅ Axios instance outside the component (reused across components)
const api = axios.create({
  baseURL: "http://localhost:5000/api",
  headers: {
    "Content-Type": "application/json"
  }
});

const BookAppointment = () => {
  const [formData, setFormData] = useState({ 
    date: "", 
    time: "10:00",  // 24-hour format
    symptoms: "" 
  });
  const [doctor, setDoctor] = useState(null);
  const [message, setMessage] = useState("");
  const [error, setError] = useState(false);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    const fetchDoctorDetails = async () => {
      // ✅ Dynamically set Authorization token here
      api.defaults.headers.Authorization = `Bearer ${localStorage.getItem("token")}`;

      if (location.state?.doctorId) {
        try {
          const res = await api.get(`/auth/doctors/${location.state.doctorId}`);
          setDoctor(res.data.data);
        } catch (err) {
          console.error("Error fetching doctor:", err.response?.data || err.message);
          setMessage("Failed to load doctor details");
          setError(true);
        }
      }
    };

    fetchDoctorDetails();
  }, [location.state]);  // ✅ No eslint warning

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setMessage("");
    setError(false);
    setLoading(true);

    try {
      if (!formData.date || !formData.time || !formData.symptoms) {
        throw new Error("All fields are required");
      }

      // ✅ Ensure token is set again before making API request
      api.defaults.headers.Authorization = `Bearer ${localStorage.getItem("token")}`;

      const response = await api.post("/appointments", {
        doctorId: location.state?.doctorId,
        date: formData.date,
        time: formData.time,
        symptoms: formData.symptoms
      });

      if (response.data.success) {
        setMessage("Appointment booked successfully!");
        setTimeout(() => navigate("/patient-dashboard"), 1800);
      } else {
        throw new Error(response.data.message || "Booking failed");
      }
    } catch (err) {
      console.error("Booking error:", err.response?.data || err.message);
      setMessage(
        err.response?.data?.message || 
        err.message || 
        "Booking failed. Please try again."
      );
      setError(true);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="book-appointment-container">
      <h2 className="title">Book Appointment</h2>
      
      {doctor && (
        <div className="doctor-info">
          <h3>Dr. {doctor.name}</h3>
          <p>Specialization: {doctor.specialization}</p>
          {doctor.experience && <p>Experience: {doctor.experience} years</p>}
        </div>
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
            min={new Date().toISOString().split('T')[0]}
          />
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
            <option value="10:00">10:00 AM</option>
            <option value="11:00">11:00 AM</option>
            <option value="12:00">12:00 PM</option>
            <option value="14:00">2:00 PM</option>
            <option value="15:00">3:00 PM</option>
            <option value="16:00">4:00 PM</option>
          </select>
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
        </div>

        <button 
          type="submit" 
          className="submit-btn"
          disabled={loading}
        >
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
