import React, { useEffect, useState } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import "./PatientDashboard.css";

const PatientDashboard = () => {
  const [doctors, setDoctors] = useState([]);
  const [appointments, setAppointments] = useState([]);
  const [userData, setUserData] = useState(null);
  const [loadingDoctors, setLoadingDoctors] = useState(true);
  const [loadingAppointments, setLoadingAppointments] = useState(true);
  const [activeTab, setActiveTab] = useState("doctors");
  const navigate = useNavigate();

  // Fetch user data
  useEffect(() => {
    const fetchUserData = async () => {
      try {
        const token = localStorage.getItem("token");
        const res = await axios.get("http://localhost:5000/api/auth/me", {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });
        setUserData(res.data);
      } catch (err) {
        console.error("Error fetching user data:", err);
      }
    };

    fetchUserData();
  }, []);

  // Fetch doctors
  useEffect(() => {
    const fetchDoctors = async () => {
      try {
        setLoadingDoctors(true);
        const res = await axios.get("http://localhost:5000/api/auth/doctors");
        console.log("Doctors response:", res.data);
        setDoctors(res.data.data || []);
      } catch (err) {
        console.error("Error fetching doctors:", err);
      } finally {
        setLoadingDoctors(false);
      }
    };

    fetchDoctors();
  }, []);

  // Fetch appointments for patient
  useEffect(() => {
    const fetchAppointments = async () => {
      try {
        setLoadingAppointments(true);
        const token = localStorage.getItem("token");
        const res = await axios.get(
          "http://localhost:5000/api/appointments/patient",
          {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          }
        );
        setAppointments(res.data.data || []);
      } catch (err) {
        console.error("Error fetching appointments:", err);
      } finally {
        setLoadingAppointments(false);
      }
    };

    fetchAppointments();
  }, []);

  const handleBook = (doctorId) => {
    navigate("/book", { state: { doctorId } });
  };

  const handleLogout = () => {
    localStorage.removeItem("token");
    navigate("/login");
  };

  const handleCancelAppointment = async (appointmentId) => {
    try {
      const token = localStorage.getItem("token");
      await axios.delete(
        `http://localhost:5000/api/appointments/${appointmentId}`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );
      setAppointments(appointments.filter((appt) => appt._id !== appointmentId));
    } catch (err) {
      console.error("Error cancelling appointment:", err);
    }
  };

  return (
    <div className="dashboard-container">
      <div className="dashboard-header">
        <h2 className="dashboard-title">
          Welcome {userData?.name || "Patient"}
        </h2>
        <button onClick={handleLogout} className="logout-button">
          Logout
        </button>
      </div>

      <div className="quick-actions">
        <a
          href="https://disease-assistance-web.onrender.com"
          target="_blank"
          rel="noopener noreferrer"
          className="ai-button"
        >
          Ask our AI Assistant
        </a>
      </div>

      <div className="tabs">
        <button
          className={`tab-button ${activeTab === "doctors" ? "active" : ""}`}
          onClick={() => setActiveTab("doctors")}
        >
          Available Doctors
        </button>
        <button
          className={`tab-button ${activeTab === "appointments" ? "active" : ""}`}
          onClick={() => setActiveTab("appointments")}
        >
          My Appointments
        </button>
      </div>

      {activeTab === "doctors" && (
        <section className="doctors-section">
          <h3 className="section-title">Available Doctors</h3>
          {loadingDoctors ? (
            <div className="loading-spinner">Loading doctors...</div>
          ) : doctors.length === 0 ? (
            <p className="no-data">No doctors found.</p>
          ) : (
            <div className="cards-container">
              {doctors.map((doc) => (
                <div className="card doctor-card" key={doc._id}>
                  <div className="doctor-info">
                    <h4>Dr. {doc.name}</h4>
                    <p>
                      <strong>Specialization:</strong>{" "}
                      {doc.specialization || "General Practitioner"}
                    </p>
                    <p>
                      <strong>Contact:</strong> {doc.email}
                    </p>
                    {doc.bio && <p className="doctor-bio">{doc.bio}</p>}
                  </div>
                  <button
                    onClick={() => handleBook(doc._id)}
                    className="book-button"
                  >
                    Book Appointment
                  </button>
                </div>
              ))}
            </div>
          )}
        </section>
      )}

      {activeTab === "appointments" && (
        <section className="appointments-section">
          <h3 className="section-title">My Appointments</h3>
          {loadingAppointments ? (
            <div className="loading-spinner">Loading appointments...</div>
          ) : !Array.isArray(appointments) || appointments.length === 0 ? (
            <p className="no-data">No appointments booked yet.</p>
          ) : (
            <div className="cards-container">
              {appointments.map((appt) => (
                <div className="card appointment-card" key={appt._id}>
                  <div className="appointment-info">
                    <h4>Appointment with Dr. {appt.doctor?.name || "N/A"}</h4>
                    <p>
                      <strong>Status:</strong>{" "}
                      <span className={`status-${appt.status?.toLowerCase()}`}>
                        {appt.status || "Pending"}
                      </span>
                    </p>
                    {appt.date && (
                      <p>
                        <strong>Date:</strong>{" "}
                        {new Date(appt.date).toLocaleString()}
                      </p>
                    )}
                    {appt.notes && (
                      <p>
                        <strong>Notes:</strong> {appt.notes}
                      </p>
                    )}
                  </div>
                  {appt.status === "Pending" && (
                    <button
                      onClick={() => handleCancelAppointment(appt._id)}
                      className="cancel-button"
                    >
                      Cancel
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}
        </section>
      )}

      <div className="health-tips">
        <h3>Health Tips</h3>
        <ul>
          <li>Stay hydrated by drinking at least 8 glasses of water daily</li>
          <li>Get 7-8 hours of sleep each night</li>
          <li>Exercise for at least 30 minutes most days</li>
          <li>Eat a balanced diet with plenty of fruits and vegetables</li>
        </ul>
      </div>
    </div>
  );
};

export default PatientDashboard;
