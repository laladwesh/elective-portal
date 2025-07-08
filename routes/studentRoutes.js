const express = require('express');
const { addStudentByAdmin, getAllStudents, deleteStudent, bulkDeleteStudents } = require('../controllers/studentController'); // <--- ADD bulkDeleteStudents HERE
const { protect, authorizeRoles } = require('./../middleware/authMiddleware'); // Corrected path assuming it's in parent dir
const router = express.Router();

// Admin routes to manage students
router.post('/', protect, authorizeRoles('admin'), addStudentByAdmin);
router.get('/', protect, authorizeRoles('admin'), getAllStudents);

// IMPORTANT: Place specific static routes like /bulk-delete before dynamic :id routes
router.delete('/bulk-delete', protect, authorizeRoles('admin'), bulkDeleteStudents); // <--- ADD THIS LINE

// General delete by ID route
router.delete('/:id', protect, authorizeRoles('admin'), deleteStudent);

module.exports = router;