require('dotenv').config();
const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');

const app = express();

// Connect to MongoDB
mongoose.connect(process.env.MONGO_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true
})
.then(() => console.log('✅ MongoDB Connected'))
.catch(err => {
  console.error('❌ MongoDB Connection Error:', err.message);
  process.exit(1); // Exit process if DB connection fails
});

// Middleware
app.use(cors({
  origin: 'http://localhost:3000',
  credentials: true
}));
app.use(express.json());

// Routes
const authRoutes = require('./routes/auth');
const appointmentRoutes = require('./routes/appointments'); // Make sure this file exists and exports router

app.use('/api/auth', authRoutes);
app.use('/api/appointments', appointmentRoutes);

// Root route
app.get('/', (req, res) => {
  res.send('API is running...');
});

// Global Error Handler
app.use((err, req, res, next) => {
  console.error('Global Error:', err.stack);
  res.status(500).json({ 
    success: false, 
    message: 'Internal Server Error' 
  });
});

// Start Server
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`🚀 Server running on http://localhost:${PORT}`));
