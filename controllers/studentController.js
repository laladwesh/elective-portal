const User = require('../models/User');
const Enrollment = require('../models/Enrollment');
const asyncHandler = require('express-async-handler');
const XLSX = require('xlsx'); // <--- ADD THIS LINE

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

// @desc    Admin bulk adds students from an Excel file
// @route   POST /api/students/bulk-upload
// @access  Private/Admin
const bulkAddStudents = asyncHandler(async (req, res) => {
  if (!req.file) {
    res.status(400);
    throw new Error('No Excel file uploaded.');
  }

  const workbook = XLSX.read(req.file.buffer, { type: 'buffer' });
  const sheetName = workbook.SheetNames[0];
  const worksheet = workbook.Sheets[sheetName];
  const studentsData = XLSX.utils.sheet_to_json(worksheet);

  if (!studentsData || studentsData.length === 0) {
    res.status(400);
    throw new Error('No data found in the Excel file.');
  }

  const newStudents = [];
  const existingStudents = [];
  const invalidStudents = [];

  for (const row of studentsData) {
    const name = row.Name ? String(row.Name).trim() : null;
    const email = row.Email ? String(row.Email).trim().toLowerCase() : null;
    const batch = row.Batch ? String(row.Batch).trim() : null;

    // Basic validation
    if (!name || !email || !batch || !/\S+@\S+\.\S+/.test(email)) {
      invalidStudents.push({ row, reason: 'Missing or invalid Name, Email, or Batch' });
      continue;
    }

    const studentExists = await User.findOne({ email });
    if (studentExists) {
      existingStudents.push({ name, email, batch, reason: 'Already exists' });
      continue;
    }

    newStudents.push({ name, email, batch, role: 'student' });
  }

  let addedCount = 0;
  let errorCount = 0;

  if (newStudents.length > 0) {
    try {
      const insertedStudents = await User.insertMany(newStudents, { ordered: false }); // ordered: false to continue if some fail
      addedCount = insertedStudents.length;
    } catch (err) {
      // Handle cases where some inserts might fail (e.g., duplicate key errors if not caught by findOne)
      if (err.writeErrors) {
        errorCount = err.writeErrors.length;
        err.writeErrors.forEach(writeError => {
          // Log or process individual write errors if needed
          console.error("Bulk insert write error:", writeError.errmsg);
        });
      } else {
        console.error("Unexpected error during bulk insert:", err);
        errorCount = newStudents.length; // Assume all failed if unexpected error
      }
      // Re-fetch existing students to ensure they are marked as skipped
      const failedEmails = new Set(err.insertedDocs.map(doc => doc.email));
      newStudents.forEach(student => {
        if (failedEmails.has(student.email)) {
          invalidStudents.push({ row: student, reason: 'Database insertion failed' });
        }
      });
    }
  }

  res.status(200).json({
    message: `Bulk upload complete. ${addedCount} students added, ${existingStudents.length} skipped (already exist), ${invalidStudents.length} invalid/failed.`,
    summary: {
      added: addedCount,
      skipped: existingStudents.length,
      invalidOrFailed: invalidStudents.length,
      details: {
        skipped: existingStudents,
        invalid: invalidStudents,
      },
    },
  });
});


module.exports = {
  addStudentByAdmin,
  getAllStudents,
  deleteStudent,
  bulkDeleteStudents,
  bulkAddStudents, // <--- ADD THIS LINE
};