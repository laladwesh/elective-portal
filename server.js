// server.js
const express   = require('express');
const dotenv    = require('dotenv');
const path      = require('path');
const morgan    = require('morgan');
const cors      = require('cors');
const passport  = require('passport');

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
console.log('DEBUG: GOOGLE_CALLBACK_URL:', process.env.GOOGLE_CALLBACK_URL); // <-- CRITICAL ONE
console.log('DEBUG: FRONTEND_URL:', process.env.FRONTEND_URL);
console.log('DEBUG: NODE_ENV:', process.env.NODE_ENV);

// --- Middlewares ---
app.use(cors({
  origin: process.env.FRONTEND_URL,    // e.g. https://your-frontend.com
  methods: 'GET,HEAD,PUT,PATCH,POST,DELETE',
  credentials: true,
}));

app.use(express.json());
app.use(morgan('dev'));

// passport config & init (needed if you’re using JWT or sessions)
require('./config/passport')(passport);
app.use(passport.initialize());
// if you ever use sessions: app.use(passport.session());

// --- API Routes ---
// Keep these commented out from previous debugging step if they were the issue,
// or uncomment them if you've already verified they are not the source of the error.
// For now, let's assume they are NOT the source based on your last message.
app.use('/api/auth',     authRoutes);
app.use('/api/courses', courseRoutes);
app.use('/api/students',studentRoutes);

// --- Serve React in Production ---
// TEMPORARILY COMMENT OUT THIS ENTIRE BLOCK FOR DEBUGGING
// if (process.env.NODE_ENV === 'production') {
//   // point to client/build, _not_ ../client/build
//   const buildPath = path.join(__dirname, 'client', 'build');
//   app.use(express.static(buildPath));

//   // any GET that isn’t /api/* should return index.html
//   app.get('*', (req, res) => {
//     if (req.path.startsWith('/api/')) {
//       return res.status(404).end();
//     }
//     res.sendFile(path.join(buildPath, 'index.html'));
//   });
// }
// server.js (updated production block)

if (process.env.NODE_ENV === 'production') {
  const clientPath = path.join(__dirname, 'client', 'build');
  console.log('DEBUG: clientPath calculated:', clientPath);
  app.use(express.static(clientPath));

  // Re-enable app.get('*') but simplify its content for testing
  app.get('*', (req, res) => {
    // TEMPORARILY COMMENT OUT THIS IF CONDITION
    // if (req.path.startsWith('/api/')) {
    //   return res.status(404).end();
    // }

   res.send('<h1>Welcome to the Elective Portal (Production Fallback)</h1>'); // Keep this line
  });
}
// --- Error Handler ---
app.use(errorHandler);

// --- Start Server ---
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});