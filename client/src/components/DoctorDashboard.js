import React, { useEffect, useState, useCallback, useRef } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import { usePDF } from "react-to-pdf"; // For client-side PDF generation (download)
import html2canvas from 'html2canvas'; // For converting HTML to canvas/image
import { jsPDF } from 'jspdf'; // For creating PDF from canvas/image
import "./DoctorDashboard.css"; // Ensure your CSS is robust

const DoctorDashboard = () => {
  // --- State Variables ---
  const [appointments, setAppointments] = useState([]);
  const [filteredAppointments, setFilteredAppointments] = useState([]);
  const [statusFilter, setStatusFilter] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedDate, setSelectedDate] = useState("");
  const [modalData, setModalData] = useState(null); // For appointment details modal
  const [loading, setLoading] = useState(false); // Managed centrally now
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [page, setPage] = useState(1);
  const limit = 6; // Items per page
  const [user, setUser] = useState(null); // Current logged-in doctor user
  const [showPrescriptionForm, setShowPrescriptionForm] = useState(false);
  const [prescriptionData, setPrescriptionData] = useState({
    patientId: "",
    medicines: "", // medicines as a single string, one per line
    dosage: "", // dosage as a single string, one per line (matching medicines)
    instructions: "", // additional general instructions
    followUpDate: "",
    diagnosis: "",
  });

  const navigate = useNavigate();
  // usePDF hook for generating PDF for download
  const { toPDF, targetRef } = usePDF({ filename: "medical-prescription.pdf" });

  // --- Axios Instance Configuration ---
  const api = axios.create({
    baseURL: "https://project1-backend-d55g.onrender.com/api",
    // FIX: Remove Content-Type from default headers.
    // Axios automatically sets 'multipart/form-data' when FormData is used.
    // Setting it here explicitly to 'application/json' was overriding that.
    // headers: {
    //   "Content-Type": "application/json",
    // },
  });

  // Request Interceptor to attach token
  api.interceptors.request.use(
    (config) => {
      const token = localStorage.getItem("token");
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }
      return config;
    },
    (error) => {
      return Promise.reject(error);
    }
  );

  // Response Interceptor to handle unauthorized errors
  api.interceptors.response.use(
    (response) => response,
    (error) => {
      if (error.response?.status === 401) {
        localStorage.removeItem("token");
        navigate("/login");
        setError("Session expired. Please log in again.");
        clearMessages();
      }
      return Promise.reject(error);
    }
  );

  // --- Utility Functions ---

  // Function to clear messages after a delay
  const clearMessages = useCallback(() => {
    const timer = setTimeout(() => {
      setError("");
      setSuccess("");
    }, 5000); // Clear messages after 5 seconds
    return () => clearTimeout(timer); // Cleanup on component unmount or re-render
  }, []); // clearMessages has no dependencies, so it's very stable

  // --- API Calls (memoized with useCallback) ---

  // Fetch user data (doctor's own profile)
  const fetchUserData = useCallback(async () => {
    console.log("Attempting to fetch user data...");
    try {
      const response = await api.get("/auth/me");
      setUser(response.data);
      console.log("User data fetched successfully:", response.data);
      return response.data;
    } catch (err) {
      console.error("Error fetching user data:", err);
      if (err.response?.status === 401) {
        localStorage.removeItem("token");
        navigate("/login");
        setError("Session expired. Please log in again.");
      } else {
        setError("Failed to load doctor's profile.");
      }
      clearMessages();
      throw err;
    }
  }, [clearMessages, api, navigate]); // Dependencies are stable

  // Fetch appointments for the logged-in doctor
  const fetchAppointments = useCallback(async () => {
    console.log("Attempting to fetch appointments...");
    try {
      const response = await api.get("/appointments/doctor");
      if (response.data?.success) {
        setAppointments(response.data.data || []);
        console.log("Appointments fetched successfully:", response.data.data);
        return response.data.data;
      } else {
        setError(response.data?.message || "Failed to load appointments.");
        console.warn("Backend reported success: false or unexpected data for appointments:", response.data);
        clearMessages();
        throw new Error(response.data?.message || "Failed to load appointments.");
      }
    } catch (err) {
      console.error("Fetch appointments error:", err.response?.data || err.message || err);
      if (err.response?.status === 401) {
        localStorage.removeItem("token");
        navigate("/login");
        setError("Session expired. Please log in again.");
      } else {
        setError(err.response?.data?.message || "Failed to load appointments. Network error or server issue.");
      }
      clearMessages();
      throw err;
    }
  }, [clearMessages, api, navigate]); // Dependencies are stable

  // Update appointment status (e.g., pending -> confirmed, confirmed -> completed)
  const handleStatusChange = useCallback(
    async (id, newStatus) => {
      setLoading(true);
      setError("");
      setSuccess("");
      try {
        const response = await api.put(`/appointments/${id}/status`, {
          status: newStatus,
        });

        if (response.data.success) {
          setSuccess(`Appointment ${newStatus} successfully!`);
          fetchAppointments(); // Re-fetch appointments to update the list
          clearMessages();
        } else {
          setError(response.data.message || "Failed to update appointment status.");
          clearMessages();
        }
      } catch (err) {
        console.error("Update status error:", err.response?.data || err.message || err);
        setError(err.response?.data?.message || "Failed to update appointment status.");
        clearMessages();
      } finally {
        setLoading(false);
      }
    },
    [fetchAppointments, clearMessages, api]
  );

  // Submit new prescription to save it in the database
  const submitPrescription = useCallback(
    async () => {
      if (!prescriptionData.patientId || !prescriptionData.medicines) {
        setError("Please select a patient and enter medicines.");
        clearMessages();
        return;
      }

      setLoading(true);
      setError("");
      setSuccess("");
      try {
        const response = await api.post("/prescriptions", {
          ...prescriptionData,
          doctorId: user?._id, // Ensure doctorId is sent
          date: new Date().toISOString(), // Current date for prescription
        });

        if (response.data.success) {
          setSuccess("Prescription saved successfully!");
          // Do not close form here, let the user decide if they want to email or just save
          // setPrescriptionData will reset form data, which is done later
          clearMessages();
        } else {
          setError(response.data.message || "Failed to save prescription.");
          clearMessages();
        }
      } catch (err) {
        console.error("Save prescription error:", err.response?.data || err.message || err);
        setError(err.response?.data?.message || "Failed to save prescription.");
        clearMessages();
      } finally {
        setLoading(false);
      }
    },
    [prescriptionData, user, clearMessages, api]
  );

  // --- Event Handlers ---

  // Handles changes in prescription form inputs
  const handlePrescriptionChange = useCallback((e) => {
    const { name, value } = e.target;
    setPrescriptionData((prev) => ({
      ...prev,
      [name]: value,
    }));
  }, []);

  // Initiates PDF generation for local download
  const handleGeneratePdf = useCallback(() => {
    if (!prescriptionData.patientId) {
      setError("Please select a patient before generating the PDF.");
      clearMessages();
      return;
    }
    toPDF(); // Triggers react-to-pdf to convert the targetRef content to PDF and download
    setSuccess("Prescription PDF generated for download!");
    clearMessages();
  }, [prescriptionData.patientId, toPDF, clearMessages]);

  // Gets the full patient object for the currently selected patient in the prescription form
  // Changed from useCallback to a regular function to avoid initialization issues
  const getSelectedPatient = () => {
    return appointments.find(
      (a) => a.patient?._id === prescriptionData.patientId
    )?.patient;
  };


  // Initiates PDF generation and sends it via email
  const handleSendEmail = useCallback(async () => {
    if (!prescriptionData.patientId) {
      setError("Please select a patient before sending the email.");
      clearMessages();
      return;
    }
    // Ensure patient has an email to send the prescription
    const patient = getSelectedPatient();
    if (!patient || !patient.email) {
      setError("Selected patient does not have an email address to send the prescription.");
      clearMessages();
      return;
    }

    if (!targetRef.current) { // Using targetRef as it's already linked to the preview div
      setError("Prescription content not found for PDF generation.");
      clearMessages();
      return;
    }

    setLoading(true);
    setError("");
    setSuccess("");

    try {
      // 1. Capture the content of the ref as a canvas
      const canvas = await html2canvas(targetRef.current, {
        scale: 2, // Increase scale for better quality PDF
        useCORS: true, // Important if you have images from other origins
      });

      // 2. Convert canvas to an image data URL
      const imgData = canvas.toDataURL('image/png');

      // 3. Create a new jsPDF instance
      const pdf = new jsPDF('p', 'mm', 'a4'); // 'p' for portrait, 'mm' for millimeters, 'a4' size
      const imgWidth = 210; // A4 width in mm
      const pageHeight = 297; // A4 height in mm
      const imgHeight = canvas.height * imgWidth / canvas.width;
      let heightLeft = imgHeight;

      let position = 0;

      // Add first page
      pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
      heightLeft -= pageHeight;

      // Add additional pages if content overflows A4 height
      while (heightLeft >= 0) {
          position = heightLeft - pageHeight; // Corrected position for multi-page
          pdf.addPage();
          pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
          heightLeft -= pageHeight;
      }

      // 4. Get the PDF as a Blob
      const pdfBlob = pdf.output('blob');

      // 5. Create FormData and append the PDF Blob and other necessary data
      const formData = new FormData();
      // 'prescription' is the field name expected by Multer on the backend
      formData.append('prescription', pdfBlob, `prescription_${patient?.name || 'unknown'}_${new Date().toISOString().slice(0,10)}.pdf`);
      
      // Append other data that the backend might need for email content
      formData.append('patientEmail', patient.email); // Crucial for sending email
      formData.append('patientName', patient.name || 'Unknown Patient');
      formData.append('doctorName', user?.name || 'Doctor');
      formData.append('doctorSpecialization', user?.specialization || 'General Physician');
      formData.append('diagnosis', prescriptionData.diagnosis || '');
      formData.append('medicines', prescriptionData.medicines || '');
      formData.append('dosage', prescriptionData.dosage || '');
      formData.append('instructions', prescriptionData.instructions || '');
      formData.append('followUpDate', prescriptionData.followUpDate || '');
      // Add clinic info as well if the backend uses it for the email template
      formData.append('clinicName', 'Healthcare Clinic');
      formData.append('clinicAddress', 'Adisaptogram, Hooghly');
      formData.append('clinicPhone', '6294505905');

      // --- NEW DEBUGGING LOG ---
      // Log FormData contents before sending
      console.log('--- Frontend: FormData Contents before sending ---');
      for (let [key, value] of formData.entries()) {
          if (value instanceof File || value instanceof Blob) {
              console.log(`  File Field: ${key}, Filename: ${value.name}, Type: ${value.type}, Size: ${value.size} bytes`);
          } else {
              console.log(`  Field: ${key}, Value: ${value}`);
          }
      }
      console.log('--------------------------------------------------');

      // 6. Send to backend
      const response = await api.post("/prescriptions/send-email", formData, {
          headers: {
              // Axios automatically sets Content-Type to 'multipart/form-data' for FormData
              // No need to set it manually unless there's a specific issue
              // The explicit 'Content-Type': 'application/json' in api.create was causing the issue.
          },
      });

      if (response.data.success) {
          setSuccess("Prescription email sent successfully!");
          setShowPrescriptionForm(false); // Close form after successful email
          // Reset prescription form data
          setPrescriptionData({
            patientId: "",
            medicines: "",
            dosage: "",
            instructions: "",
            followUpDate: "",
            diagnosis: "",
          });
      } else {
          setError(response.data.message || "Failed to send prescription email.");
      }
      clearMessages();
    } catch (err) {
      console.error("Send email error:", err.response?.data || err.message || err);
      setError(err.response?.data?.message || "Failed to send prescription email. Please ensure patient has an email.");
      clearMessages();
    } finally {
      setLoading(false);
    }
  }, [prescriptionData, user, clearMessages, api, targetRef, getSelectedPatient]); // Added getSelectedPatient to dependencies


  // Handles user logout
  const handleLogout = useCallback(() => {
    localStorage.removeItem("token");
    navigate("/login");
  }, [navigate]);

  // --- Effects ---

  // Primary useEffect for initial data fetching - runs only once on mount
  useEffect(() => {
    console.count("DoctorDashboard useEffect: Initial Fetch Triggered");
    const loadInitialData = async () => {
      setLoading(true);
      setError("");
      try {
        // Run both fetches in parallel
        await Promise.all([
          fetchUserData(),
          fetchAppointments()
        ]);
        console.log("All initial data fetches completed successfully.");
      } catch (err) {
        console.error("Error during initial data loading:", err);
        // Errors are already handled by individual fetch functions
      } finally {
        setLoading(false);
        console.log("Finished all initial data loading.");
      }
    };

    loadInitialData();
  }, []); // Dependency array changed to empty: This effect runs ONCE on component mount.

  // Filters appointments whenever `appointments`, `statusFilter`, `searchTerm`, or `selectedDate` changes
  useEffect(() => {
    console.log("Filtering appointments...");
    console.log("Initial appointments received for filtering:", appointments.length);
    console.log("Status Filter:", statusFilter);
    console.log("Search Term:", searchTerm);
    console.log("Selected Date (input value):", selectedDate);

    let filtered = [...appointments];

    if (statusFilter) {
      filtered = filtered.filter((a) => a.status === statusFilter);
      console.log("After status filter (count):", filtered.length);
    }

    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(
        (a) =>
          a.patient?.name?.toLowerCase().includes(term) ||
          a.symptoms?.toLowerCase().includes(term)
      );
      console.log("After search term filter (count):", filtered.length);
    }

    if (selectedDate) {
      const selectedDateString = selectedDate; 

      filtered = filtered.filter(a => {
        const apptDate = new Date(a.date);
        const year = apptDate.getFullYear();
        const month = String(apptDate.getMonth() + 1).padStart(2, '0');
        const day = String(apptDate.getDate()).padStart(2, '0');
        const apptDateFormatted = `${year}-${month}-${day}`;
        
        console.log(`Comparing appt date: ${apptDateFormatted} with selected date: ${selectedDateString}`);
        return apptDateFormatted === selectedDateString;
      });
      console.log("After date filter (count):", filtered.length);
    }

    setFilteredAppointments(filtered);
    setPage(1); // Reset to first page on filter change
    console.log("Final filtered appointments count:", filtered.length);
  }, [appointments, statusFilter, searchTerm, selectedDate]);

  // --- Helper Functions for Rendering ---

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
              setPrescriptionData((prev) => ({
                ...prev,
                patientId: modalData.patient?._id,
              }));
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
                : appointments.filter((a) => a.status === status).length}
            </p>
          </div>
        ))}
      </div>

      {/* Appointments List */}
      {console.log("Rendering paginated appointments. Length:", paginatedAppointments.length, "Data:", paginatedAppointments)}
      {loading ? (
        <div className="loading-spinner">Loading appointments...</div>
      ) : paginatedAppointments.length === 0 ? (
        <div className="no-appointments">No appointments found.</div>
      ) : (
        <div className="appointments-list">
          {paginatedAppointments.map((appt) => (
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
                  <span className="appt-card-value">
                    {new Date(appt.date).toLocaleDateString()}
                  </span>
                </div>
                <div className="appt-card-row">
                  <span className="appt-card-label">Time:</span>
                  {/* Ensure consistent time formatting */}
                  <span className="appt-card-value">
                    {new Date(appt.date).toLocaleTimeString([], {
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </span>
                </div>
                <div className="appt-card-row">
                  <span className="appt-card-label">Symptoms:</span>
                  <span className="appt-card-value symptoms">
                    {appt.symptoms || "N/A"}
                  </span>
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
            onClick={() => setPage((p) => Math.max(p - 1, 1))}
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
            onClick={() => setPage((p) => Math.min(p + 1, totalPages))}
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
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <h3>Appointment Details</h3>
            <div className="modal-body">
              <p>
                <strong>Patient:</strong> {modalData.patient?.name || "N/A"}
              </p>
              <p>
                <strong>Contact:</strong>{" "}
                {modalData.patient?.email || modalData.patient?.phone || "N/A"}
              </p>
              <p>
                <strong>Date:</strong> {new Date(modalData.date).toDateString()}
              </p>
              <p>
                <strong>Time:</strong>{" "}
                {new Date(modalData.date).toLocaleTimeString([], {
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </p>
              <p>
                <strong>Symptoms:</strong> {modalData.symptoms || "N/A"}
              </p>
              <p>
                <strong>Status:</strong>{" "}
                <span className={`status-${modalData.status}`}>
                  {modalData.status}
                </span>
              </p>
              {modalData.notes && <p>
                  <strong>Notes:</strong> {modalData.notes}
                </p>
              }
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
        <div
          className="modal-overlay"
          onClick={() => setShowPrescriptionForm(false)}
        >
          <div
            className="modal-content prescription-modal"
            onClick={(e) => e.stopPropagation()}
          >
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
                <p className="prescription-date">
                  Date: {new Date().toLocaleDateString()}
                </p>
              </div>

              <div className="prescription-body">
                <div className="doctor-patient-info">
                  <div>
                    <p>
                      <strong>Doctor:</strong> Dr. {user?.name || "Doctor"}
                    </p>
                    <p>
                      <strong>Specialization:</strong>{" "}
                      {user?.specialization || "General Physician"}
                    </p>
                  </div>
                  <div>
                    <p>
                      <strong>Patient:</strong>{" "}
                      {getSelectedPatient()?.name || "________________"}
                    </p>
                    <p>
                      <strong>Patient ID:</strong>{" "}
                      {getSelectedPatient()?._id?.slice(-6) || "______"}
                    </p>
                  </div>
                </div>

                <div className="diagnosis-section">
                  <p>
                    <strong>Diagnosis:</strong>
                  </p>
                  <div className="diagnosis-box">
                    {prescriptionData.diagnosis ||
                      "_________________________________________________________"}
                  </div>
                </div>

                <div className="medicines-section">
                  <table>
                    <thead>
                      <tr>
                        <th>Medicine</th>
                        <th>Dosage</th>
                        <th>Instructions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {/* Split medicines and dosage by new line to create rows */}
                      {prescriptionData.medicines
                        .split("\n")
                        .map((medicine, index) =>
                          medicine.trim() ? (
                            <tr key={index}>
                              <td>{medicine.trim()}</td>
                              <td>
                                {prescriptionData.dosage.split("\n")[index]
                                  ?.trim() || "As directed"}
                              </td>
                              <td>
                                {prescriptionData.instructions.split("\n")[
                                  index
                                ]?.trim() || "Until finished"}
                              </td>
                            </tr>
                          ) : null
                        )}
                      {/* Add placeholder rows if no medicines are entered */}
                      {prescriptionData.medicines
                        .split("\n")
                        .filter(Boolean).length === 0 && (
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
                  <p>
                    <strong>Additional Notes:</strong>
                  </p>
                  <p>{prescriptionData.instructions || "None"}</p>
                </div>

                <div className="follow-up">
                  <p>
                    <strong>Follow-up Date:</strong>{" "}
                    {prescriptionData.followUpDate || "Not specified"}
                  </p>
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
                  {appointments.map(
                    (appt) =>
                      // Only show appointments that have a patient object
                      appt.patient?._id && (
                        // FIX: Use appt._id as the key for uniqueness across all appointments
                        <option key={appt._id} value={appt.patient._id}>
                          {appt.patient.name} (
                          {new Date(appt.date).toLocaleDateString()})
                        </option>
                      )
                  )}
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
                <label htmlFor="dosage">
                  Dosage (match lines with medicines):
                </label>
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
              
              <button
                onClick={handleGeneratePdf}
                className="generate-btn"
                disabled={!prescriptionData.patientId} // Disable if no patient is selected
              >
                Download PDF
              </button>
              <button
                onClick={handleSendEmail}
                className="send-email-btn"
                disabled={loading || !prescriptionData.patientId || !getSelectedPatient()?.email} // Disable if no patient or no email
              >
                Send via Email
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