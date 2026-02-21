const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
  },
  email: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
    trim: true,
    match: [/.+@.+\..+/, 'Please use a valid email address'],
  },
  // No password field as we're using OAuth
  batch: {
    type: String, // e.g., "2020", "2021", "Unassigned"
    required: function() { return this.role === 'student'; } // Required only for students
  },
  role: {
    type: String,
    enum: ['student', 'admin'],
    default: 'student',
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

// No password hashing or comparison methods needed here

module.exports = mongoose.model('User', userSchema);