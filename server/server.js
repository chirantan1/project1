// server/server.js
require('dotenv').config(); // Load environment variables from .env file immediately

const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');
const path = require('path'); // Added for serving static files later if needed

const app = express();

// --- MongoDB Connection ---
const connectDB = async () => {
    try {
        // Mongoose v6.0+ discourages useNewUrlParser and useUnifiedTopology as they are default
        await mongoose.connect(process.env.MONGO_URI);
        console.log('✅ MongoDB Connected Successfully!');
    } catch (err) {
        console.error('❌ MongoDB Connection Error:', err.message);
        // Exit process with failure if DB connection fails
        process.exit(1);
    }
};

// Connect to MongoDB
connectDB();

// --- CORS Configuration ---
// Define allowed origins for your frontend applications
const allowedOrigins = [
    'http://localhost:3000', // Your main development frontend
    'http://192.168.56.1:3000', // Potential local network access
    'https://project1-3jvu.onrender.com', // Your deployed frontend (main app)
    'https://disease-assistance-web.onrender.com', // AI Assistant frontend
    'https://admin-1-5zv8.onrender.com' // External Admin Portal frontend
];

app.use(cors({
    origin: function (origin, callback) {
        // Allow requests with no origin (e.g., from Postman, curl, or mobile apps)
        if (!origin) return callback(null, true);
        if (allowedOrigins.includes(origin)) {
            callback(null, true);
        } else {
            console.warn(`❌ CORS: Request from disallowed origin: ${origin}`);
            callback(new Error(`Not allowed by CORS: ${origin}`));
        }
    },
    credentials: true // Allow cookies/authorization headers to be sent cross-origin
}));

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
