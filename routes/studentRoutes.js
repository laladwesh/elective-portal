const express = require('express');
const { addStudentByAdmin, getAllStudents } = require('../controllers/studentController');
const { protect, authorizeRoles } = require('../middleware/authMiddleware');
const router = express.Router();

// Admin routes to manage students
router.post('/', protect, authorizeRoles('admin'), addStudentByAdmin);
router.get('/', protect, authorizeRoles('admin'), getAllStudents);

module.exports = router;