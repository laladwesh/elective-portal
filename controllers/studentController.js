const User = require('../models/User');
const Enrollment = require('../models/Enrollment');
const asyncHandler = require('express-async-handler');
const XLSX = require('xlsx'); // <--- ADD THIS LINE

// @desc    Admin adds a new user (student or admin)
// @route   POST /api/students
// @access  Private/Admin
const addStudentByAdmin = asyncHandler(async (req, res) => {
  const { name, batch, role = 'student' } = req.body;
  const email = req.body.email ? req.body.email.trim().toLowerCase() : null;

  if (!name || !email) {
    res.status(400);
    throw new Error('Please enter all required fields (Name, Email)');
  }

  // Validate that students must have a batch
  if (role === 'student' && !batch) {
    res.status(400);
    throw new Error('Batch is required for students');
  }

  const userExists = await User.findOne({ email });
  if (userExists) {
    res.status(400);
    throw new Error('User with this email already exists');
  }

  // Create user with specified role. They will authenticate via Google later.
  const userData = {
    name,
    email,
    role,
  };

  // Only add batch for students
  if (role === 'student') {
    userData.batch = batch;
  }

  const newUser = await User.create(userData);

  if (newUser) {
    res.status(201).json({
      _id: newUser._id,
      name: newUser.name,
      email: newUser.email,
      batch: newUser.batch,
      role: newUser.role,
    });
  } else {
    res.status(400);
    throw new Error('Invalid user data');
  }
});

// @desc    Get all users (students and admins) for admin management
// @route   GET /api/students
// @access  Private/Admin
const getAllStudents = asyncHandler(async (req, res) => {
  const users = await User.find({}); // Get all users (students and admins)
  res.status(200).json(users);
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

  // 2. Get all enrollments for this student to update course counts
  const enrollments = await Enrollment.find({ student: studentId });
  
  // 3. Decrement enrolledStudentsCount for each course the student was enrolled in
  const Course = require('../models/Course');
  for (const enrollment of enrollments) {
    await Course.findByIdAndUpdate(
      enrollment.course,
      { $inc: { enrolledStudentsCount: -1 } }
    );
  }

  // 4. Delete all enrollments associated with this student
  await Enrollment.deleteMany({ student: studentId });

  // 5. Delete the student record
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

  // 1. Get all enrollments for these students to update course counts
  const enrollments = await Enrollment.find({ student: { $in: ids } });
  
  // 2. Decrement enrolledStudentsCount for each affected course
  const Course = require('../models/Course');
  const courseUpdates = {}; // Map to track how many students to decrement per course
  
  for (const enrollment of enrollments) {
    const courseId = enrollment.course.toString();
    courseUpdates[courseId] = (courseUpdates[courseId] || 0) + 1;
  }
  
  // 3. Batch update all affected courses
  for (const [courseId, decrementBy] of Object.entries(courseUpdates)) {
    await Course.findByIdAndUpdate(
      courseId,
      { $inc: { enrolledStudentsCount: -decrementBy } }
    );
  }

  // 4. Delete all enrollments associated with these students
  await Enrollment.deleteMany({ student: { $in: ids } });

  // 5. Delete the students themselves
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

// @desc    Admin updates a student
// @route   PUT /api/students/:id
// @access  Private/Admin
const updateStudent = asyncHandler(async (req, res) => {
  const studentId = req.params.id;
  const { name, batch, role } = req.body;
  const email = req.body.email ? req.body.email.trim().toLowerCase() : undefined;

  // Find the student
  const student = await User.findById(studentId);

  if (!student) {
    res.status(404);
    throw new Error('User not found');
  }

  // Check if email is being changed and if it's already taken by another user
  if (email && email !== student.email) {
    const emailExists = await User.findOne({ email, _id: { $ne: studentId } });
    if (emailExists) {
      res.status(400);
      throw new Error('Email is already in use by another user');
    }
  }

  // Validate that students have a batch
  if (role === 'student' && !batch) {
    res.status(400);
    throw new Error('Batch is required for students');
  }

  // Update fields
  if (name) student.name = name;
  if (email) student.email = email;
  if (batch !== undefined) student.batch = batch; // Allow clearing batch for non-students
  if (role) student.role = role;

  const updatedStudent = await student.save();

  res.status(200).json({
    _id: updatedStudent._id,
    name: updatedStudent.name,
    email: updatedStudent.email,
    batch: updatedStudent.batch,
    role: updatedStudent.role,
  });
});


module.exports = {
  addStudentByAdmin,
  getAllStudents,
  updateStudent,
  deleteStudent,
  bulkDeleteStudents,
  bulkAddStudents, // <--- ADD THIS LINE
};