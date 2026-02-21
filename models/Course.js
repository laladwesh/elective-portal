const mongoose = require('mongoose');

const courseSchema = new mongoose.Schema({
  courseName: {
    type: String,
    required: true,
    unique: true,
  },
  batch: {
    type: String, // e.g., "2020", "2021", "All"
    required: true,
  },
  intakeCapacity: {
    type: Number,
    required: true,
    min: 1,
  },
  enrolledStudentsCount: {
    type: Number,
    default: 0,
  },
  enrollmentOpenTime: {
    type: Date, // Stored in UTC, converted to IST for display
    default: null,
  },
  isEnrollmentActive: {
    type: Boolean,
    default: false, // Admin sets this to true when enrollment opens
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

// Index for efficient batch-based queries
courseSchema.index({ batch: 1 });

// Index for enrollment status queries
courseSchema.index({ isEnrollmentActive: 1 });

// Compound index for batch + enrollment status (common query pattern)
courseSchema.index({ batch: 1, isEnrollmentActive: 1 });

module.exports = mongoose.model('Course', courseSchema);