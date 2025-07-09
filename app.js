// app.js
require('dotenv').config();
const path     = require('path');
const express  = require('express');
const cors     = require('cors');
const morgan   = require('morgan');
const passport = require('passport');

const connectDB    = require('./config/db');
const errorHandler = require('./middleware/errorHandler');

// ——— Passport ✚ DB
require('./config/passport');    // your strategy file should import passport itself
connectDB();

const app = express();

// ——— Logging
app.use(morgan('dev'));

// ——— CORS
app.use(cors({
  origin:   process.env.FRONTEND_URL || '*',
  methods:  ['GET','HEAD','POST','PUT','PATCH','DELETE','OPTIONS'],
  credentials: true,
}));

// ——— Body parsers
app.use(express.json({  limit: '5mb' }));
app.use(express.urlencoded({ limit: '5mb', extended: true }));

// ——— Passport init
app.use(passport.initialize());

// ——— API Routes
app.get('/api', (req, res) => res.send('Welcome to the API'));
app.use('/api/auth',     require('./routes/authRoutes'));
app.use('/api/courses',  require('./routes/courseRoutes'));
app.use('/api/students', require('./routes/studentRoutes'));

// ——— Static React in Production
if (process.env.NODE_ENV === 'production') {
  const buildPath = path.join(__dirname, 'client', 'build');
  app.use(express.static(buildPath));
  console.log(`Serving static files from ${buildPath}`);

  // catch-all *after* your /api routes:
  app.get('/{*any}', (req, res, next) => {
    if (req.originalUrl.startsWith('/api/')) return next();
    res.sendFile(path.join(buildPath, 'index.html'));
  });
}


// ——— Error handler (keep it last)
app.use(errorHandler);

module.exports = app;
