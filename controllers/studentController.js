const User = require('../models/User');
const Enrollment = require('../models/Enrollment'); // Already added in previous step
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

// @desc    Admin deletes a student and their associated enrollments
// @route   DELETE /api/students/:id
// @access  Private/Admin
const deleteStudent = asyncHandler(async (req, res) => {
  const studentId = req.params.id;

  // 1. Find the student
  const student = await User.findById(studentId);

  if (!student) {
    res.status(404);
    throw new Error('Student not found');
  }

  // 2. Delete all enrollments associated with this student
  await Enrollment.deleteMany({ student: studentId });

  // 3. Delete the student record
  await student.deleteOne();

  res.status(200).json({ message: 'Student and associated enrollments removed successfully.' });
});

// @desc    Admin bulk deletes students and their associated enrollments
// @route   DELETE /api/students/bulk-delete
// @access  Private/Admin
const bulkDeleteStudents = asyncHandler(async (req, res) => {
  const { ids } = req.body; // Expect an array of student IDs

  if (!ids || !Array.isArray(ids) || ids.length === 0) {
    res.status(400);
    throw new Error('Please provide an array of student IDs to delete.');
  }

  // 1. Delete all enrollments associated with these students
  await Enrollment.deleteMany({ student: { $in: ids } });

  // 2. Delete the students themselves
  const deleteResult = await User.deleteMany({ _id: { $in: ids }, role: 'student' }); // Ensure only students are deleted

  if (deleteResult.deletedCount === 0) {
    res.status(404);
    throw new Error('No students found with the provided IDs to delete.');
  }

  res.status(200).json({ message: `${deleteResult.deletedCount} students and their associated enrollments removed successfully.` });
});


module.exports = {
  addStudentByAdmin,
  getAllStudents,
  deleteStudent,
  bulkDeleteStudents, // <--- ADD THIS LINE
};