require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');

const app = express();

// CORS Allowed Origins
const allowedOrigins = [
  'http://localhost:3000',
  'http://192.168.56.1:3000',
  'https://project1-3jvu.onrender.com'
];

// Middleware
app.use(cors({
  origin: function (origin, callback) {
    // Allow requests with no origin (like mobile apps, curl, Postman)
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error(`❌ Not allowed by CORS: ${origin}`));
    }
  },
  credentials: true
}));

app.use(express.json());

// Database Connection
mongoose.connect(process.env.MONGO_URI || process.env.MONGODB_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
  // useCreateIndex is deprecated in newer mongoose versions; safe to remove
})
.then(() => console.log('✅ MongoDB Connected'))
.catch(err => {
  console.error('❌ MongoDB Connection Error:', err.message);
  process.exit(1);
});

// Routes import and use
const authRoutes = require('./routes/auth');
const appointmentRoutes = require('./routes/appointments');

app.use('/api/auth', authRoutes);
app.use('/api/appointments', appointmentRoutes);

// Root route
app.get('/', (req, res) => {
  res.send('API is running...');
});

// Global error handler
app.use((err, req, res, next) => {
  console.error('Global Error:', err.stack);
  res.status(500).json({
    success: false,
    message: err.message || 'Internal Server Error'
  });
});

// Start server
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
});
