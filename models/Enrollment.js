const mongoose = require('mongoose');

const enrollmentSchema = new mongoose.Schema({
  student: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  course: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Course',
    required: true,
  },
  enrollmentDate: {
    type: Date,
    default: Date.now,
  },
});

// Ensure a student can enroll in a course only once
enrollmentSchema.index({ student: 1, course: 1 }, { unique: true });

// Index for efficient course-based queries (used in delete operations and count updates)
enrollmentSchema.index({ course: 1 });

// Index for efficient student-based queries  
enrollmentSchema.index({ student: 1 });

module.exports = mongoose.model('Enrollment', enrollmentSchema);