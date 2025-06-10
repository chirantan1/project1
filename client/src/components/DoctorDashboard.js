import React, { useEffect, useState, useCallback, useRef } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import { usePDF } from "react-to-pdf"; // For client-side PDF generation
import "./DoctorDashboard.css"; // Ensure your CSS is robust

const DoctorDashboard = () => {
  // --- State Variables ---
  const [appointments, setAppointments] = useState([]);
  const [filteredAppointments, setFilteredAppointments] = useState([]);
  const [statusFilter, setStatusFilter] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedDate, setSelectedDate] = useState("");
  const [modalData, setModalData] = useState(null); // For appointment details modal
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [page, setPage] = useState(1);
  const limit = 6; // Items per page
  const [user, setUser] = useState(null); // Current logged-in doctor user
  const [showPrescriptionForm, setShowPrescriptionForm] = useState(false);
  const [prescriptionData, setPrescriptionData] = useState({
    patientId: "",
    medicines: "", // medicines as a single string, one per line
    dosage: "",     // dosage as a single string, one per line (matching medicines)
    instructions: "", // additional general instructions
    followUpDate: "",
    diagnosis: ""
  });

  const navigate = useNavigate();
  // usePDF hook for generating PDF from HTML content
  const { toPDF, targetRef } = usePDF({ filename: "medical-prescription.pdf" });

  // --- Axios Instance Configuration ---
  // The API instance is created once. Its headers will be updated dynamically.
  const api = axios.create({
    // CORRECTED: Removed extra brackets and parentheses from baseURL
    baseURL: "https://project1-backend-d55g.onrender.com/api", 
    headers: {
      "Content-Type": "application/json",
    }
  });

  // --- Utility Functions ---

  // Function to clear messages after a delay
  const clearMessages = useCallback(() => {
    const timer = setTimeout(() => {
      setError("");
      setSuccess("");
    }, 5000); // Clear messages after 5 seconds
    return () => clearTimeout(timer); // Cleanup on component unmount or re-render
  }, []);

  // --- API Calls ---

  // Fetch user data (doctor's own profile)
  const fetchUserData = useCallback(async () => {
    try {
      const token = localStorage.getItem("token");
      if (!token) {
        navigate("/login");
        return;
      }
      // Set the authorization header for this specific API instance's default headers
      api.defaults.headers.common['Authorization'] = `Bearer ${token}`;
      const response = await api.get("/auth/me");
      setUser(response.data);
    } catch (err) {
      console.error("Error fetching user data:", err);
      // If unauthorized or token expired, log out
      if (err.response?.status === 401) {
        localStorage.removeItem("token");
        navigate("/login");
        setError("Session expired. Please log in again.");
        clearMessages();
      } else {
        setError("Failed to load doctor's profile.");
        clearMessages();
      }
    }
  }, [navigate, clearMessages]); // Depend on navigate and clearMessages

  // Fetch appointments for the logged-in doctor
  const fetchAppointments = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const token = localStorage.getItem("token");
      if (!token) {
        navigate("/login");
        setLoading(false);
        return;
      }
      // Ensure token is set for this API call as well
      api.defaults.headers.common['Authorization'] = `Bearer ${token}`;
      const response = await api.get("/appointments/doctor");

      if (response.data?.success) {
        setAppointments(response.data.data || []);
      } else {
        setError(response.data?.message || "Failed to load appointments.");
        clearMessages();
      }
    } catch (err) {
      console.error("Fetch appointments error:", err);
      if (err.response?.status === 401) {
        localStorage.removeItem("token");
        navigate("/login");
        setError("Session expired. Please log in again.");
        clearMessages();
      } else {
        setError(err.response?.data?.message || "Failed to load appointments.");
        clearMessages();
      }
    } finally {
      setLoading(false);
    }
  }, [navigate, clearMessages]); // Depend on navigate and clearMessages

  // Update appointment status (e.g., pending -> confirmed, confirmed -> completed)
  const handleStatusChange = useCallback(async (id, newStatus) => {
    setLoading(true);
    setError("");
    setSuccess("");
    try {
      const token = localStorage.getItem("token");
      if (!token) {
        navigate("/login");
        setLoading(false);
        setError("Authentication token missing. Please log in again.");
        clearMessages();
        return;
      }
      // CRITICAL FIX: Ensure the Authorization header is set before making this request
      api.defaults.headers.common['Authorization'] = `Bearer ${token}`;
      const response = await api.put(`/appointments/${id}/status`, { status: newStatus });

      if (response.data.success) {
        setSuccess(`Appointment ${newStatus} successfully!`);
        fetchAppointments(); // Re-fetch appointments to update the list
        clearMessages();
      } else {
        setError(response.data.message || "Failed to update appointment status.");
        clearMessages();
      }
    } catch (err) {
      console.error("Update status error:", err);
      if (err.response?.status === 401) {
        localStorage.removeItem("token");
        navigate("/login");
        setError("Session expired. Please log in again.");
        clearMessages();
      } else {
        setError(err.response?.data?.message || "Failed to update appointment status.");
        clearMessages();
      }
    } finally {
      setLoading(false);
    }
  }, [navigate, fetchAppointments, clearMessages]); // Dependencies for useCallback

  // Submit new prescription
  const submitPrescription = useCallback(async () => {
    if (!prescriptionData.patientId || !prescriptionData.medicines) {
      setError("Please select a patient and enter medicines.");
      clearMessages();
      return;
    }

    setLoading(true);
    setError("");
    setSuccess("");
    try {
      const token = localStorage.getItem("token");
      if (!token) {
        navigate("/login");
        setLoading(false);
        setError("Authentication token missing. Please log in again.");
        clearMessages();
        return;
      }
      // Ensure the Authorization header is set before making this request
      api.defaults.headers.common['Authorization'] = `Bearer ${token}`;

      const response = await api.post("/prescriptions", {
        ...prescriptionData,
        doctorId: user?._id, // Ensure doctorId is sent
        date: new Date().toISOString() // Current date for prescription
      });

      if (response.data.success) {
        setSuccess("Prescription saved successfully!");
        setShowPrescriptionForm(false); // Close the form
        // Reset prescription form data
        setPrescriptionData({
          patientId: "",
          medicines: "",
          dosage: "",
          instructions: "",
          followUpDate: "",
          diagnosis: ""
        });
        clearMessages();
      } else {
        setError(response.data.message || "Failed to save prescription.");
        clearMessages();
      }
    } catch (err) {
      console.error("Save prescription error:", err);
      if (err.response?.status === 401) {
        localStorage.removeItem("token");
        navigate("/login");
        setError("Session expired. Please log in again.");
        clearMessages();
      } else {
        setError(err.response?.data?.message || "Failed to save prescription.");
        clearMessages();
      }
    } finally {
      setLoading(false);
    }
  }, [prescriptionData, user, navigate, clearMessages]); // Dependencies for useCallback

  // --- Event Handlers ---

  // Handles changes in prescription form inputs
  const handlePrescriptionChange = useCallback((e) => {
    const { name, value } = e.target;
    setPrescriptionData(prev => ({
      ...prev,
      [name]: value
    }));
  }, []); // No dependencies as it only uses e and prev state

  // Initiates PDF generation for the prescription
  const generatePrescription = useCallback(() => {
    // Check if a patient is selected before generating PDF
    if (!prescriptionData.patientId) {
      setError("Please select a patient before generating the PDF.");
      clearMessages();
      return;
    }
    toPDF(); // Triggers react-to-pdf to convert the targetRef content to PDF
    setSuccess("Prescription PDF generated!");
    clearMessages();
  }, [prescriptionData.patientId, toPDF, clearMessages]); // Depend on prescriptionData.patientId

  // Handles user logout
  const handleLogout = useCallback(() => {
    localStorage.removeItem("token");
    // Clear the authorization header from the axios instance as well upon logout
    delete api.defaults.headers.common['Authorization'];
    navigate("/login");
  }, [navigate]); // Depend on navigate

  // --- Effects ---

  // Initial fetch on component mount
  useEffect(() => {
    // This effect runs once to perform initial data fetches.
    // The token setting for the API instance is handled within the fetch functions themselves
    // and also explicitly in handleStatusChange and submitPrescription.
    fetchUserData();
    fetchAppointments();
  }, [fetchUserData, fetchAppointments]); // Ensure these memoized functions are stable

  // Filters appointments whenever `appointments`, `statusFilter`, `searchTerm`, or `selectedDate` changes
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
    setPage(1); // Reset to first page on filter change
  }, [appointments, statusFilter, searchTerm, selectedDate]);

  // --- Helper Functions for Rendering ---

  // Gets the full patient object for the currently selected patient in the prescription form
  const getSelectedPatient = useCallback(() => {
    return appointments.find(a => a.patient?._id === prescriptionData.patientId)?.patient;
  }, [appointments, prescriptionData.patientId]);

  // Pagination logic
  const paginatedAppointments = filteredAppointments.slice(
    (page - 1) * limit,
    page * limit
  );

  const totalPages = Math.ceil(filteredAppointments.length / limit);

  // --- Rendered Component ---
  return (
    <div className="doctor-dashboard">
      {/* Header Section */}
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

      {/* Filter Controls and Prescription Button */}
      <div className="dashboard-controls">
        <div className="filter-controls">
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            aria-label="Filter by status"
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
            aria-label="Search appointments"
          />

          <input
            type="date"
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
            aria-label="Filter by date"
          />
        </div>
        <button
          className="add-prescription-btn"
          onClick={() => {
            setShowPrescriptionForm(true);
            setModalData(null); // Ensure appointment detail modal is closed
            // Optional: Pre-fill patientId if a modalData was active
            if (modalData) {
              setPrescriptionData(prev => ({ ...prev, patientId: modalData.patient?._id }));
            }
          }}
        >
          Generate Prescription
        </button>
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
        <div className="no-appointments">No appointments found.</div>
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
                <div className="appt-card-row">
                  <span className="appt-card-label">Date:</span>
                  <span className="appt-card-value">{new Date(appt.date).toLocaleDateString()}</span>
                </div>
                <div className="appt-card-row">
                  <span className="appt-card-label">Time:</span>
                  {/* Ensure consistent time formatting */}
                  <span className="appt-card-value">{new Date(appt.date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                </div>
                <div className="appt-card-row">
                  <span className="appt-card-label">Symptoms:</span>
                  <span className="appt-card-value symptoms">{appt.symptoms || "N/A"}</span>
                </div>
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

      {/* Pagination Controls */}
      {totalPages > 1 && (
        <div className="pagination">
          <button
            onClick={() => setPage(p => Math.max(p - 1, 1))}
            disabled={page === 1}
            aria-label="Previous page"
          >
            Previous
          </button>

          {Array.from({ length: totalPages }, (_, i) => (
            <button
              key={i}
              className={page === i + 1 ? "active" : ""}
              onClick={() => setPage(i + 1)}
              aria-label={`Page ${i + 1}`}
            >
              {i + 1}
            </button>
          ))}

          <button
            onClick={() => setPage(p => Math.min(p + 1, totalPages))}
            disabled={page === totalPages}
            aria-label="Next page"
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
              <p><strong>Patient:</strong> {modalData.patient?.name || "N/A"}</p>
              <p><strong>Contact:</strong> {modalData.patient?.email || modalData.patient?.phone || "N/A"}</p>
              <p><strong>Date:</strong> {new Date(modalData.date).toDateString()}</p>
              <p><strong>Time:</strong> {new Date(modalData.date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</p>
              <p><strong>Symptoms:</strong> {modalData.symptoms || "N/A"}</p>
              <p>
                <strong>Status:</strong>{" "}
                <span className={`status-${modalData.status}`}>
                  {modalData.status}
                </span>
              </p>
              {modalData.notes && <p><strong>Notes:</strong> {modalData.notes}</p>}
            </div>
            <button
              className="close-modal"
              onClick={() => setModalData(null)}
              aria-label="Close appointment details"
            >
              Close
            </button>
          </div>
        </div>
      )}

      {/* Prescription Form Modal */}
      {showPrescriptionForm && (
        <div className="modal-overlay" onClick={() => setShowPrescriptionForm(false)}>
          <div className="modal-content prescription-modal" onClick={e => e.stopPropagation()}>
            <h3>Generate Prescription</h3>
            {/* The content below this div will be converted to PDF */}
            <div className="prescription-pdf-preview" ref={targetRef}>
              <div className="prescription-header">
                <h2>Medical Prescription</h2>
                <div className="clinic-info">
                  <p>Healthcare Clinic</p>
                  <p>Adisaptogram, Hooghly</p>
                  <p>Phone: 6294505905</p>
                </div>
                <p className="prescription-date">Date: {new Date().toLocaleDateString()}</p>
              </div>

              <div className="prescription-body">
                <div className="doctor-patient-info">
                  <div>
                    <p><strong>Doctor:</strong> Dr. {user?.name || "Doctor"}</p>
                    <p><strong>Specialization:</strong> {user?.specialization || "General Physician"}</p>
                    {/* Removed License No as requested */}
                  </div>
                  <div>
                    <p><strong>Patient:</strong> {getSelectedPatient()?.name || "________________"}</p>
                    {/* Removed Age/Gender as requested */}
                    <p><strong>Patient ID:</strong> {getSelectedPatient()?._id?.slice(-6) || "______"}</p>
                  </div>
                </div>

                <div className="diagnosis-section">
                  <p><strong>Diagnosis:</strong></p>
                  <div className="diagnosis-box">
                    {prescriptionData.diagnosis || "_________________________________________________________"}
                  </div>
                </div>

                <div className="medicines-section">
                  <table>
                    <thead>
                      <tr>
                        <th>Medicine</th>
                        <th>Dosage</th>
                        <th>Instructions</th> {/* Renamed from Duration to Instructions for clarity */}
                      </tr>
                    </thead>
                    <tbody>
                      {/* Split medicines and dosage by new line to create rows */}
                      {prescriptionData.medicines.split('\n').map((medicine, index) => (
                        medicine.trim() && ( // Only render if medicine line is not empty
                          <tr key={index}>
                            <td>{medicine.trim()}</td>
                            <td>{prescriptionData.dosage.split('\n')[index]?.trim() || "As directed"}</td>
                            <td>{prescriptionData.instructions.split('\n')[index]?.trim() || "Until finished"}</td>
                          </tr>
                        )
                      ))}
                      {/* Add placeholder rows if no medicines are entered */}
                      {prescriptionData.medicines.split('\n').filter(Boolean).length === 0 && (
                        <tr>
                          <td>___________________</td>
                          <td>___________</td>
                          <td>___________</td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>

                <div className="additional-instructions">
                  <p><strong>Additional Notes:</strong></p>
                  <p>{prescriptionData.instructions || "None"}</p>
                </div>

                <div className="follow-up">
                  <p><strong>Follow-up Date:</strong> {prescriptionData.followUpDate || "Not specified"}</p>
                </div>
              </div>

              <div className="prescription-footer">
                <div className="signature">
                  <p>Signature: ______________</p>
                  <p>Dr. {user?.name || "Doctor"}</p>
                </div>
              </div>
            </div>

            {/* Prescription Form Inputs (for user to fill) */}
            <div className="prescription-form-inputs">
              <div className="form-group">
                <label htmlFor="patientSelect">Select Patient:</label>
                <select
                  id="patientSelect"
                  name="patientId"
                  value={prescriptionData.patientId}
                  onChange={handlePrescriptionChange}
                  required
                >
                  <option value="">-- Select Patient --</option>
                  {appointments.map(appt => (
                    // Only show appointments that have a patient object
                    appt.patient?._id && (
                      <option key={appt.patient._id} value={appt.patient._id}>
                        {appt.patient.name} ({new Date(appt.date).toLocaleDateString()})
                      </option>
                    )
                  ))}
                </select>
              </div>

              <div className="form-group">
                <label htmlFor="diagnosis">Diagnosis:</label>
                <input
                  id="diagnosis"
                  type="text"
                  name="diagnosis"
                  value={prescriptionData.diagnosis}
                  onChange={handlePrescriptionChange}
                  placeholder="Enter diagnosis (e.g., Common Cold, Flu)"
                />
              </div>

              <div className="form-group">
                <label htmlFor="medicines">Medicines (one per line):</label>
                <textarea
                  id="medicines"
                  name="medicines"
                  value={prescriptionData.medicines}
                  onChange={handlePrescriptionChange}
                  placeholder="e.g.,&#10;Paracetamol 500mg&#10;Amoxicillin 250mg"
                  rows={3}
                  required
                />
              </div>

              <div className="form-group">
                <label htmlFor="dosage">Dosage (match lines with medicines):</label>
                <textarea
                  id="dosage"
                  name="dosage"
                  value={prescriptionData.dosage}
                  onChange={handlePrescriptionChange}
                  placeholder="e.g.,&#10;1 tablet, 3 times a day&#10;1 capsule, 2 times a day"
                  rows={3}
                  required
                />
              </div>

              <div className="form-group">
                <label htmlFor="instructions">Additional Instructions:</label>
                <textarea
                  id="instructions"
                  name="instructions"
                  value={prescriptionData.instructions}
                  onChange={handlePrescriptionChange}
                  placeholder="e.g.,&#10;Drink plenty of fluids&#10;Get adequate rest"
                  rows={2}
                />
              </div>

              <div className="form-group">
                <label htmlFor="followUpDate">Follow-up Date:</label>
                <input
                  id="followUpDate"
                  type="date"
                  name="followUpDate"
                  value={prescriptionData.followUpDate}
                  onChange={handlePrescriptionChange}
                />
              </div>
            </div>

            <div className="modal-actions">
              {/* Removed the "Save Prescription" button */}
              <button
                onClick={generatePrescription}
                className="generate-btn"
                disabled={!prescriptionData.patientId} // Disable if no patient is selected
              >
                Generate PDF
              </button>

              <button
                onClick={() => setShowPrescriptionForm(false)}
                className="cancel-btn"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default DoctorDashboard;