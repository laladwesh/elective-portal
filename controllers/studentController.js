const User = require('../models/User');
const asyncHandler = require('express-async-handler');

// @desc    Admin adds a new student (creates a record for a student who will eventually log in with Google)
// @route   POST /api/students
// @access  Private/Admin
const addStudentByAdmin = asyncHandler(async (req, res) => {
  const { name, email, batch } = req.body; // No password in req.body for OAuth users

  if (!name || !email || !batch) {
    res.status(400);
    throw new Error('Please enter all required fields for the student (Name, Email, Batch)');
  }

  const studentExists = await User.findOne({ email });
  if (studentExists) {
    res.status(400);
    throw new Error('Student with this email already exists');
  }

  // Create student with 'student' role. They will authenticate via Google later.
  const student = await User.create({
    name,
    email,
    batch,
    role: 'student',
  });

  if (student) {
    res.status(201).json({
      _id: student._id,
      name: student.name,
      email: student.email,
      batch: student.batch,
      role: student.role,
    });
  } else {
    res.status(400);
    throw new Error('Invalid student data');
  }
});

// @desc    Get all students (Admin only)
// @route   GET /api/students
// @access  Private/Admin
const getAllStudents = asyncHandler(async (req, res) => {
  const students = await User.find({ role: 'student' }); // No password to select out
  res.status(200).json(students);
});

module.exports = { addStudentByAdmin, getAllStudents };