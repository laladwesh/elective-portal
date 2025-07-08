const express = require('express');
const {
  addCourse,
  getCourses,
  updateCourse,
  deleteCourse,
  setEnrollmentTime,
  enrollInCourse,
  getCourseEnrollments,
  clearAllCourses,
  getMyEnrollments,
  bulkDeleteCourses,
  getAllEnrollmentsWithDetails,
  createBatchCourses
} = require('../controllers/courseController');
const { protect, authorizeRoles } = require('../middleware/authMiddleware');
const router = express.Router();

// Admin routes
router.post('/', protect, authorizeRoles('admin'), addCourse);
router.post('/batch-courses', protect, authorizeRoles('admin'), createBatchCourses); // <--- NEW ROUTE for adding multiple courses for a batch
router.put('/:id', protect, authorizeRoles('admin'), updateCourse);

router.get('/all-details', protect, authorizeRoles('admin'), getAllEnrollmentsWithDetails);
// IMPORTANT: Place specific static routes before general dynamic routes
router.delete('/clear-all', protect, authorizeRoles('admin'), clearAllCourses); // Moved this UP
router.delete('/bulk-delete', protect, authorizeRoles('admin'), bulkDeleteCourses); // NEW ROUTE

// General delete by ID route (comes after more specific delete routes)
router.delete('/:id', protect, authorizeRoles('admin'), deleteCourse);

router.put('/:id/set-enrollment-time', protect, authorizeRoles('admin'), setEnrollmentTime);
router.get('/:id/enrollments', protect, authorizeRoles('admin'), getCourseEnrollments);


// Student and Admin can get courses (student gets filtered)
router.get('/', protect, getCourses);

// Student routes
router.post('/:id/enroll', protect, authorizeRoles('student'), enrollInCourse);
router.get('/my-enrollments', protect, authorizeRoles('student'), getMyEnrollments);


module.exports = router;