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
// app.use('/api/auth',    authRoutes);
// app.use('/api/courses', courseRoutes);
// app.use('/api/students',studentRoutes);

// --- Serve React in Production ---
if (process.env.NODE_ENV === 'production') {
  // point to client/build, _not_ ../client/build
  const buildPath = path.join(__dirname, 'client', 'build');
  app.use(express.static(buildPath));

  // any GET that isn’t /api/* should return index.html
  app.get('*', (req, res) => {
    if (req.path.startsWith('/api/')) {
      return res.status(404).end();
    }
    res.sendFile(path.join(buildPath, 'index.html'));
  });
}

// --- Error Handler ---
app.use(errorHandler);

// --- Start Server ---
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
