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
  createBatchCourses,
  getBatches,
  getEnrollmentStats,
  getUnenrolledStudents,
  syncEnrollmentCounts,
  closeBatchEnrollment
} = require('../controllers/courseController');
const { protect, authorizeRoles } = require('../middleware/authMiddleware');
const router = express.Router();

// Admin routes
router.post('/', protect, authorizeRoles('admin'), addCourse);
router.post('/batch-courses', protect, authorizeRoles('admin'), createBatchCourses); // <--- NEW ROUTE for adding multiple courses for a batch

router.get('/all-details', protect, authorizeRoles('admin'), getAllEnrollmentsWithDetails);

// IMPORTANT: Place specific static routes before general dynamic routes
// DELETE routes
router.delete('/clear-all', protect, authorizeRoles('admin'), clearAllCourses); // Moved this UP
router.delete('/bulk-delete', protect, authorizeRoles('admin'), bulkDeleteCourses); // NEW ROUTE

// PUT routes - Specific routes MUST come before /:id
router.put('/close-batch-enrollment', protect, authorizeRoles('admin'), closeBatchEnrollment); // NEW ROUTE for closing batch enrollment
router.put('/:id/set-enrollment-time', protect, authorizeRoles('admin'), setEnrollmentTime);
router.put('/:id', protect, authorizeRoles('admin'), updateCourse); // This MUST come after specific PUT routes

// POST routes
router.post('/sync-enrollment-counts', protect, authorizeRoles('admin'), syncEnrollmentCounts); // NEW ROUTE for syncing counts

// General delete by ID route (comes after more specific delete routes)
router.delete('/:id', protect, authorizeRoles('admin'), deleteCourse);

router.get('/:id/enrollments', protect, authorizeRoles('admin'), getCourseEnrollments);


// Student and Admin can get courses (student gets filtered)
router.get('/', protect, getCourses);

//Enrollment routes
router.get('/enrollment-stats', protect, authorizeRoles('admin'), getEnrollmentStats);
router.get('/unenrolled-students/:batch', protect, authorizeRoles('admin'), getUnenrolledStudents);

// Student routes
router.post('/:id/enroll', protect, authorizeRoles('student'), enrollInCourse);
router.get('/my-enrollments', protect, authorizeRoles('student'), getMyEnrollments);

router.get('/batches', protect, authorizeRoles('admin'), getBatches);

module.exports = router;