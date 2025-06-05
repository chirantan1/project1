import React, { useEffect, useState } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import "./DoctorDashboard.css";

const DoctorDashboard = () => {
  const [appointments, setAppointments] = useState([]);
  const [filteredAppointments, setFilteredAppointments] = useState([]);
  const [statusFilter, setStatusFilter] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedDate, setSelectedDate] = useState("");
  const [modalData, setModalData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [page, setPage] = useState(1);
  const limit = 6;
  const [user, setUser] = useState(null);

  const navigate = useNavigate();

  // Configure axios instance
  const api = axios.create({
    baseURL: "https://project1-backend-d55g.onrender.com/api",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${localStorage.getItem("token")}`
    }
  });

  // Fetch user data
  const fetchUserData = async () => {
    try {
      const response = await api.get("/auth/me");
      setUser(response.data);
    } catch (err) {
      console.error("Error fetching user data:", err);
    }
  };

  // Fetch appointments
  const fetchAppointments = async () => {
    try {
      setLoading(true);
      setError("");

      const response = await api.get("/appointments/doctor");

      if (response.data?.success) {
        setAppointments(response.data.data || []);
      } else {
        setError(response.data?.message || "Failed to load appointments");
      }
    } catch (err) {
      console.error("Fetch error:", err);
      if (err.response?.status === 401) {
        localStorage.removeItem("token");
        navigate("/login");
      } else {
        setError(err.response?.data?.message || "Failed to load appointments");
      }
    } finally {
      setLoading(false);
    }
  };

  // Update appointment status
  const handleStatusChange = async (id, newStatus) => {
    try {
      setLoading(true);
      setError("");
      setSuccess("");

      const response = await api.put(`/appointments/${id}/status`, {
        status: newStatus
      });

      if (response.data.success) {
        setSuccess("Appointment updated successfully");
        fetchAppointments();
      } else {
        setError(response.data.message || "Update failed");
      }
    } catch (err) {
      console.error("Update error:", err);
      setError(err.response?.data?.message || "Failed to update appointment");
    } finally {
      setLoading(false);
    }
  };

  // Handle logout
  const handleLogout = () => {
    localStorage.removeItem("token");
    navigate("/login");
  };

  // Initial data fetch
  useEffect(() => {
    fetchUserData();
    fetchAppointments();
  }, []);

  // Filter appointments
  useEffect(() => {
    let filtered = [...appointments];

    if (statusFilter) {
      filtered = filtered.filter(a => a.status === statusFilter);
    }

    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(a =>
        a.patient?.name?.toLowerCase().includes(term) ||
        a.symptoms?.toLowerCase().includes(term)
      );
    }

    if (selectedDate) {
      const selected = new Date(selectedDate).toDateString();
      filtered = filtered.filter(a =>
        new Date(a.date).toDateString() === selected
      );
    }

    setFilteredAppointments(filtered);
    setPage(1);
  }, [appointments, statusFilter, searchTerm, selectedDate]);

  // Pagination
  const paginatedAppointments = filteredAppointments.slice(
    (page - 1) * limit,
    page * limit
  );

  const totalPages = Math.ceil(filteredAppointments.length / limit);

  return (
    <div className="doctor-dashboard">
      {/* Header */}
      <div className="dashboard-header">
        <div>
          <h2>Doctor Dashboard</h2>
          <p className="welcome-message">
            Welcome, Dr. {user?.name || "Doctor"}!
            {user?.specialization && ` (${user.specialization})`}
          </p>
        </div>
        <button className="logout-btn" onClick={handleLogout}>
          Logout
        </button>
      </div>

      {/* Filters */}
      <div className="dashboard-controls">
        <div className="filter-controls">
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
          >
            <option value="">All Status</option>
            <option value="pending">Pending</option>
            <option value="confirmed">Confirmed</option>
            <option value="completed">Completed</option>
            <option value="cancelled">Cancelled</option>
          </select>

          <input
            type="text"
            placeholder="Search patients or symptoms..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />

          <input
            type="date"
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
          />
        </div>
      </div>

      {/* Status Messages */}
      {error && <div className="error-message">{error}</div>}
      {success && <div className="success-message">{success}</div>}

      {/* Summary Cards */}
      <div className="appointments-summary">
        {["total", "pending", "confirmed", "completed"].map((status) => (
          <div key={status} className="summary-card">
            <h4>{status.charAt(0).toUpperCase() + status.slice(1)}</h4>
            <p>
              {status === "total"
                ? appointments.length
                : appointments.filter(a => a.status === status).length}
            </p>
          </div>
        ))}
      </div>

      {/* Appointments List */}
      {loading ? (
        <div className="loading-spinner">Loading appointments...</div>
      ) : paginatedAppointments.length === 0 ? (
        <div className="no-appointments">No appointments found</div>
      ) : (
        <div className="appointments-list">
          {paginatedAppointments.map(appt => (
            <div key={appt._id} className="appt-card">
              <div className="appt-card-header">
                <h4>{appt.patient?.name || "Unknown Patient"}</h4>
                <span className={`status-badge status-${appt.status}`}>
                  {appt.status}
                </span>
              </div>

              <div className="appt-card-body">
                <p><strong>Date:</strong> {new Date(appt.date).toLocaleDateString()}</p>
                <p><strong>Time:</strong> {appt.time || "N/A"}</p>
                <p><strong>Symptoms:</strong> {appt.symptoms || "N/A"}</p>
              </div>

              <div className="appt-card-footer">
                <button
                  className="details-btn"
                  onClick={() => setModalData(appt)}
                >
                  Details
                </button>

                {appt.status === "pending" && (
                  <>
                    <button
                      className="accept-btn"
                      onClick={() => handleStatusChange(appt._id, "confirmed")}
                      disabled={loading}
                    >
                      Accept
                    </button>
                    <button
                      className="cancel-btn"
                      onClick={() => handleStatusChange(appt._id, "cancelled")}
                      disabled={loading}
                    >
                      Cancel
                    </button>
                  </>
                )}

                {appt.status === "confirmed" && (
                  <button
                    className="complete-btn"
                    onClick={() => handleStatusChange(appt._id, "completed")}
                    disabled={loading}
                  >
                    Complete
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="pagination">
          <button
            onClick={() => setPage(p => Math.max(p - 1, 1))}
            disabled={page === 1}
          >
            Previous
          </button>

          {Array.from({ length: totalPages }, (_, i) => (
            <button
              key={i}
              className={page === i + 1 ? "active" : ""}
              onClick={() => setPage(i + 1)}
            >
              {i + 1}
            </button>
          ))}

          <button
            onClick={() => setPage(p => Math.min(p + 1, totalPages))}
            disabled={page === totalPages}
          >
            Next
          </button>
        </div>
      )}

      {/* Appointment Details Modal */}
      {modalData && (
        <div className="modal-overlay" onClick={() => setModalData(null)}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <h3>Appointment Details</h3>
            <div className="modal-body">
              <p><strong>Patient:</strong> {modalData.patient?.name}</p>
              <p><strong>Contact:</strong> {modalData.patient?.email || modalData.patient?.phone || "N/A"}</p>
              <p><strong>Date:</strong> {new Date(modalData.date).toDateString()}</p>
              <p><strong>Time:</strong> {modalData.time}</p>
              <p><strong>Symptoms:</strong> {modalData.symptoms}</p>
              <p>
                <strong>Status:</strong>
                <span className={`status-${modalData.status}`}>
                  {modalData.status}
                </span>
              </p>
              {modalData.notes && <p><strong>Notes:</strong> {modalData.notes}</p>}
            </div>
            <button
              className="close-modal"
              onClick={() => setModalData(null)}
            >
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default DoctorDashboard;
