require('dotenv').config();
const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');

const app = express();

// ✅ MongoDB Connection
mongoose.connect(process.env.MONGO_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true
})
.then(() => console.log('✅ MongoDB Connected'))
.catch(err => {
    console.error('❌ MongoDB Connection Error:', err.message);
    process.exit(1); // Exit process with failure
});

// ✅ CORS Configuration (Local + Deployed Frontend)
const allowedOrigins = [
    'http://localhost:3000',
    'http://192.168.56.1:3000',
    'https://project1-3jvu.onrender.com',
    'https://disease-assistance-web.onrender.com', // Added for AI Assistant
    'https://admin-1-5zv8.onrender.com' // Added for External Admin Portal
];

app.use(cors({
    origin: function (origin, callback) {
        // Allow requests with no origin (like mobile apps or curl requests)
        if (!origin) return callback(null, true);
        if (allowedOrigins.includes(origin)) {
            callback(null, true);
        } else {
            callback(new Error(`❌ Not allowed by CORS: ${origin}`));
        }
    },
    credentials: true
}));

app.use(express.json()); // Middleware to parse JSON request bodies

// ✅ Routes
const authRoutes = require('./routes/auth');
const appointmentRoutes = require('./routes/appointments');
const doctorRoutes = require('./routes/doctorRoutes'); // ⭐ Added doctorRoutes

app.use('/api/auth', authRoutes);
app.use('/api/appointments', appointmentRoutes);
app.use('/api/doctors', doctorRoutes); // ⭐ Added doctorRoutes middleware

// ✅ Root route
app.get('/', (req, res) => {
    res.send('API is running...');
});

// ✅ Global Error Handler
app.use((err, req, res, next) => {
    console.error('Global Error:', err.stack);
    res.status(500).json({
        success: false,
        message: err.message || 'Internal Server Error'
    });
});

// ✅ Start Server
const PORT = process.env.PORT || 5000;
app.listen(PORT, () =>
    console.log(`🚀 Server running on http://localhost:${PORT}`)
);