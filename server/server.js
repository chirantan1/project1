// server/server.js
require('dotenv').config(); // Load environment variables from .env file immediately

const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose'); // Mongoose is directly used here
const path = require('path'); // Added for serving static files later if needed

// --- Import Database Connection ---
const connectDB = require('./config/db'); // IMPORTED: Assuming db.js exports the connectDB function

const app = express();

// Connect to MongoDB
connectDB(); // Call the imported function to establish database connection

// --- CORS Configuration (TEMPORARILY SIMPLIFIED FOR DEBUGGING) ---
// This allows requests from *any* origin.
// If this works, the issue is with your custom 'origin' logic in the previous setup.
// If it still doesn't work, the 'cors' middleware itself might not be running correctly.
app.use(cors({
    credentials: true // Allow cookies/authorization headers to be sent cross-origin
}));
// --- END TEMPORARY CORS CONFIGURATION ---


// --- Middleware ---
app.use(express.json()); // Parses incoming JSON requests into req.body

// Optional: If you plan to handle form data (e.g., from Multer for file uploads)
// app.use(express.urlencoded({ extended: false }));

// Optional: Serve static files if you have a build folder for a client-side app
// app.use(express.static(path.join(__dirname, 'public')));


// --- Routes ---
// Import your route files
const authRoutes = require('./routes/auth');
const appointmentRoutes = require('./routes/appointments');
const doctorRoutes = require('./routes/doctorRoutes');
const prescriptionRoutes = require('./routes/prescriptions'); // Assuming you have this route for prescriptions

// Mount your routes
app.use('/api/auth', authRoutes);
app.use('/api/appointments', appointmentRoutes);
app.use('/api/doctors', doctorRoutes);
app.use('/api/prescriptions', prescriptionRoutes); // Add prescription routes if not already here

// --- Root Route (Basic Health Check) ---
app.get('/', (req, res) => {
    res.send('API is running...');
});

// --- Global Error Handler Middleware ---
// This middleware catches any errors thrown in your routes or other middleware
app.use((err, req, res, next) => {
    console.error('Global Error (from app.use error handler):', err.stack); // Log the full stack trace
    res.status(err.statusCode || 500).json({ // Use custom status code if available, else 500
        success: false,
        message: err.message || 'Internal Server Error'
    });
});

// --- Handle Unhandled Promise Rejections ---
// Catches errors for async code that is not wrapped in try/catch (e.g., outside Express middleware)
process.on('unhandledRejection', (err, promise) => {
    console.error(`❌ Unhandled Rejection Error: ${err.message}`);
    // Close server & exit process
    // This is good practice to prevent the application from being in an undefined state
    server.close(() => process.exit(1));
});

// --- Start Server ---
const PORT = process.env.PORT || 5000;
const server = app.listen(PORT, () =>
    console.log(`🚀 Server running on http://localhost:${PORT} in ${process.env.NODE_ENV || 'development'} mode`)
);