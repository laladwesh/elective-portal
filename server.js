const express = require('express');
const dotenv = require('dotenv');
const connectDB = require('./config/db');
const courseRoutes = require('./routes/courseRoutes');
const studentRoutes = require('./routes/studentRoutes');
const errorHandler = require('./middleware/errorHandler');
const morgan = require('morgan');
const cors = require('cors');
const passport = require('passport'); // Import Passport
const path = require('path'); // Import path module for production serving

// Load environment variables
dotenv.config({ path: './.env' });

// Connect to database
connectDB();

const app = express();

// Passport config - MUST BE CALLED BEFORE Passport routes
require('./config/passport')(passport); // Pass passport object to config

// Middleware
app.use(cors({
    origin: process.env.FRONTEND_URL, // Use FRONTEND_URL from .env
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE',
    credentials: true,
}));
app.use(express.json());
app.use(morgan('dev'));

// Passport middleware (if you use sessions, otherwise can be skipped for stateless JWT)
// app.use(passport.initialize());
// If you use passport sessions: app.use(passport.session());

// Use Auth Routes
const authRoutes = require('./routes/authRoutes'); // Import your new auth routes
app.use('/api/auth', authRoutes); // Mount auth routes under /api/auth
// Production static file serving
if (process.env.NODE_ENV === "production") {
    const clientPath = path.join(__dirname, "../client/build"); // Correct path to client build folder
    app.use(express.static(clientPath));
    app.get("*", (req, res) => {
        if (req.path.startsWith("/api/")) return res.status(404).end(); // Don't serve index.html for API routes
        res.sendFile(path.join(clientPath, "index.html"));
    });
}

// Other Routes
app.use('/api/courses', courseRoutes);
app.use('/api/students', studentRoutes);

// Error handling middleware
app.use(errorHandler);

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});