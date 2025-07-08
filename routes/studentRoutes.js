const express = require('express');
const { addStudentByAdmin, getAllStudents, deleteStudent, bulkDeleteStudents, bulkAddStudents } = require('../controllers/studentController'); // <--- ADD bulkAddStudents HERE
const { protect, authorizeRoles } = require('./../middleware/authMiddleware');
const router = express.Router();

const multer = require('multer'); // <--- ADD THIS LINE
const upload = multer({ storage: multer.memoryStorage() }); // <--- Configure Multer for in-memory storage

// Admin routes to manage students
router.post('/', protect, authorizeRoles('admin'), addStudentByAdmin);
router.get('/', protect, authorizeRoles('admin'), getAllStudents);

// IMPORTANT: Place specific static routes like /bulk-delete before dynamic :id routes
router.delete('/bulk-delete', protect, authorizeRoles('admin'), bulkDeleteStudents);

// NEW: Bulk upload route for students (requires multer middleware)
router.post('/bulk-upload', protect, authorizeRoles('admin'), upload.single('excelFile'), bulkAddStudents); // 'excelFile' is the field name for the file input

// General delete by ID route
router.delete('/:id', protect, authorizeRoles('admin'), deleteStudent);

module.exports = router;