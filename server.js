// server.js (Elective Portal)
const express   = require('express');
const dotenv    = require('dotenv');
const path      = require('path');
const morgan    = require('morgan');
const cors      = require('cors');
const passport  = require('passport'); // Keep this import for now

const connectDB     = require('./config/db');
const errorHandler  = require('./middleware/errorHandler');
const authRoutes    = require('./routes/authRoutes');
const courseRoutes  = require('./routes/courseRoutes');
const studentRoutes = require('./routes/studentRoutes');

// load .env
dotenv.config();

// connect to Mongo
connectDB();

const app = express();
console.log('DEBUG: GOOGLE_CLIENT_ID:', process.env.GOOGLE_CLIENT_ID ? 'Set' : 'Not Set');
console.log('DEBUG: GOOGLE_CLIENT_SECRET:', process.env.GOOGLE_CLIENT_SECRET ? 'Set' : 'Not Set');
console.log('DEBUG: GOOGLE_CALLBACK_URL:', process.env.GOOGLE_CALLBACK_URL);
console.log('DEBUG: FRONTEND_URL:', process.env.FRONTEND_URL);
console.log('DEBUG: NODE_ENV:', process.env.NODE_ENV);

// --- Middlewares ---
app.use(cors({
  origin: process.env.FRONTEND_URL,
  methods: 'GET,HEAD,PUT,PATCH,POST,DELETE',
  credentials: true,
}));

app.use(express.json());
app.use(morgan('dev'));

// passport config & init (TEMPORARILY COMMENT THESE OUT)
// require('./config/passport')(passport);
// app.use(passport.initialize());
// if you ever use sessions: app.use(passport.session());

// --- API Routes ---
// Keep these enabled as they were not the direct cause of the error in previous tests
app.use('/api/auth',     authRoutes);
app.use('/api/courses', courseRoutes);
app.use('/api/students',studentRoutes);

// --- Serve React in Production (KEEP THIS ENABLED FOR THIS TEST) ---
if (process.env.NODE_ENV === 'production') {
  const clientPath = path.join(__dirname, 'client', 'build');
  console.log('DEBUG: clientPath calculated:', clientPath);
  app.use(express.static(clientPath));

  // Re-enable app.get('*') with its original res.sendFile logic for this test
  app.get('*', (req, res) => {
    if (req.path.startsWith('/api/')) {
      return res.status(404).end();
    }
    res.sendFile(path.join(clientPath, 'index.html'));
  });
}

// --- Error Handler ---
app.use(errorHandler);

// --- Start Server ---
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});