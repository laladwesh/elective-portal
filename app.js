require('dotenv').config();
const path = require('path');
const express = require('express');
const cors = require('cors');
const morgan = require('morgan');
const passport = require('passport');

// Database
const connectDB = require('./config/db');

// Error Handler
const errorHandler = require('./middleware/errorHandler');

// Passport Config
require('./config/passport')(passport);

// Connect to DB
connectDB();

const app = express();

// Middleware
app.use(cors({
  origin: process.env.FRONTEND_URL,
  methods: 'GET,HEAD,PUT,PATCH,POST,DELETE',
  credentials: true,
}));
app.use(express.json({ limit: '5mb' }));
app.use(express.urlencoded({ limit: '5mb', extended: true }));
app.use(passport.initialize());
app.use(morgan('dev'));

// Routes
app.get('/api', (req, res) => res.send('Welcome to the API'));
app.use('/api/auth', require('./routes/authRoutes'));
app.use('/api/courses', require('./routes/courseRoutes'));
app.use('/api/students', require('./routes/studentRoutes'));

// Serve React in production
if (process.env.NODE_ENV === 'production') {
  const clientPath = path.join(__dirname, '../client/build');
  app.use(express.static(clientPath));
  app.get('*', (req, res) => {
    if (req.path.startsWith('/api/')) return res.status(404).end();
    res.sendFile(path.join(clientPath, 'index.html'));
  });
}

// Error handling middleware
app.use(errorHandler);

module.exports = app;
