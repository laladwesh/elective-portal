const Course = require('../models/Course');
const Enrollment = require('../models/Enrollment');
const asyncHandler = require('express-async-handler');
const User = require('../models/User');

// @desc    Admin adds a new single course
// @route   POST /api/courses
// @access  Private/Admin
const addCourse = asyncHandler(async (req, res) => {
  const { courseName, batch, intakeCapacity } = req.body;

  if (!courseName || !batch || !intakeCapacity) {
    res.status(400);
    throw new Error('Please fill all required fields: Course Name, Batch, Intake Capacity.');
  }

  const courseExists = await Course.findOne({ courseName, batch });
  if (courseExists) {
    res.status(400);
    throw new Error('Course with this name and batch already exists.');
  }

  const course = await Course.create({
    courseName,
    batch,
    intakeCapacity,
    enrolledStudentsCount: 0, // Initialize to 0 for new courses
  });

  res.status(201).json(course);
});

// @desc    Admin creates multiple courses for a specific batch with shared enrollment settings
// @route   POST /api/courses/batch-courses
// @access  Private/Admin
const createBatchCourses = asyncHandler(async (req, res) => {
  const { batch, enrollmentOpenTime, isEnrollmentActive, courses } = req.body;

  if (!batch || !enrollmentOpenTime || typeof isEnrollmentActive === 'undefined' || !courses || !Array.isArray(courses) || courses.length === 0) {
    res.status(400);
    throw new Error('Please provide batch, enrollment time, active status, and a list of courses.');
  }

  // Validate individual courses data and check for duplicates within the batch
  const courseNamesInBatch = new Set();
  for (const courseData of courses) {
    if (!courseData.courseName || !courseData.intakeCapacity || courseData.intakeCapacity < 1) {
      res.status(400);
      throw new Error('Each course must have a name and a valid intake capacity (min 1).');
    }
    if (courseNamesInBatch.has(courseData.courseName)) {
        res.status(400);
        throw new Error(`Duplicate course name "${courseData.courseName}" found in the list for this batch.`);
    }
    courseNamesInBatch.add(courseData.courseName);

    // Also check against existing courses in DB for this batch
    const existingCourse = await Course.findOne({ courseName: courseData.courseName, batch: batch });
    if (existingCourse) {
        res.status(400);
        throw new new Error(`Course "${courseData.courseName}" already exists for batch "${batch}".`);
    }
  }

  // Create Date object from IST string (frontend sends with +05:30 offset).
  const openTimeUTC = new Date(enrollmentOpenTime);

  const newCourses = courses.map(courseData => ({
    courseName: courseData.courseName,
    batch, // Apply the same batch to all courses in this bunch
    intakeCapacity: courseData.intakeCapacity,
    enrolledStudentsCount: 0, // Initialize to 0
    enrollmentOpenTime: openTimeUTC,
    isEnrollmentActive: isEnrollmentActive,
  }));

  const createdCourses = await Course.insertMany(newCourses);

  res.status(201).json({
    message: `${createdCourses.length} courses created successfully for batch ${batch}!`,
    courses: createdCourses,
  });
});


// @desc    Get all courses (Admin: all courses; Student: courses for their batch)
// @route   GET /api/courses
// @access  Private/Admin, Private/Student (filtered)
const getCourses = asyncHandler(async (req, res) => {
  let query = {};
  if (req.user.role === 'student') {
    // Students only see courses for their specific batch or 'All'
    query = {
      $or: [
        { batch: req.user.batch },
        { batch: 'All' }
      ]
    };
  }

  // Since enrolledStudentsCount is now directly on the Course model, no need to populate/count
  const courses = await Course.find(query);
  res.status(200).json(courses);
});

// @desc    Update course details
// @route   PUT /api/courses/:id
// @access  Private/Admin
const updateCourse = asyncHandler(async (req, res) => {
  const { courseName, batch, intakeCapacity, enrollmentOpenTime, isEnrollmentActive } = req.body;

  const course = await Course.findById(req.params.id);

  if (!course) {
    res.status(404);
    throw new Error('Course not found');
  }

  course.courseName = courseName || course.courseName;
  course.batch = batch || course.batch;
  course.intakeCapacity = intakeCapacity || course.intakeCapacity;
  
  if (enrollmentOpenTime) {
    course.enrollmentOpenTime = new Date(enrollmentOpenTime); // Ensure it's a Date object
  } else if (enrollmentOpenTime === null) { // Allow clearing the time
    course.enrollmentOpenTime = null;
  }

  course.isEnrollmentActive = typeof isEnrollmentActive === 'boolean' ? isEnrollmentActive : course.isEnrollmentActive;

  const updatedCourse = await course.save();
  res.status(200).json(updatedCourse);
});

// @desc    Delete a course
// @route   DELETE /api/courses/:id
// @access  Private/Admin
// NOTE: This route is now superseded by bulkDeleteCourses for UI, but kept for direct API calls if needed.
const deleteCourse = asyncHandler(async (req, res) => {
  const course = await Course.findById(req.params.id);

  if (!course) {
    res.status(404);
    throw new Error('Course not found');
  }

  // Also delete all enrollments associated with this course
  await Enrollment.deleteMany({ course: req.params.id });

  await course.deleteOne();
  res.status(200).json({ message: 'Course removed successfully, and associated enrollments cleared.' });
});

// @desc    Bulk delete courses
// @route   DELETE /api/courses/bulk-delete
// @access  Private/Admin
const bulkDeleteCourses = asyncHandler(async (req, res) => {
  const { ids } = req.body; // Expect an array of course IDs

  if (!ids || !Array.isArray(ids) || ids.length === 0) {
    res.status(400);
    throw new Error('Please provide an array of course IDs to delete.');
  }

  // Delete all enrollments associated with these courses
  await Enrollment.deleteMany({ course: { $in: ids } });

  // Delete the courses themselves
  const deleteResult = await Course.deleteMany({ _id: { $in: ids } });

  if (deleteResult.deletedCount === 0) {
    res.status(404);
    throw new Error('No courses found with the provided IDs to delete.');
  }

  res.status(200).json({ message: `${deleteResult.deletedCount} courses and their associated enrollments removed successfully.` });
});


// @desc    Set/Update enrollment opening time and activate/deactivate enrollment
// @route   PUT /api/courses/:id/set-enrollment-time
// @access  Private/Admin
// NOTE: This route might become redundant if 'createBatchCourses' handles initial setting,
// but it's useful for modifying existing courses individually.
const setEnrollmentTime = asyncHandler(async (req, res) => {
  const { enrollmentOpenTime, isEnrollmentActive } = req.body;

  const course = await Course.findById(req.params.id);

  if (!course) {
    res.status(404);
    throw new Error('Course not found');
  }

  if (enrollmentOpenTime) {
    course.enrollmentOpenTime = new Date(enrollmentOpenTime);
  } else if (enrollmentOpenTime === null) { // Allows admin to clear the time
    course.enrollmentOpenTime = null;
  }
  if (typeof isEnrollmentActive === 'boolean') {
    course.isEnrollmentActive = isEnrollmentActive;
  }

  const updatedCourse = await course.save();
  res.status(200).json(updatedCourse);
});

// @desc    Student enrolls in a course (First-Come, First-Served, One Course Limit)
// @route   POST /api/courses/:id/enroll
// @access  Private/Student
const enrollInCourse = asyncHandler(async (req, res) => {
  const courseId = req.params.id;
  const studentId = req.user._id;

  // 1. Check if student is already enrolled in this course
  const existingEnrollment = await Enrollment.findOne({ student: studentId, course: courseId });
  if (existingEnrollment) {
    res.status(400);
    throw new Error('You are already enrolled in this course.');
  }

  // 2. Find the course and check availability
  const course = await Course.findById(courseId);
  if (!course) {
    res.status(404);
    throw new Error('Course not found.');
  }

  // **START OF NEW ENROLLMENT CONTROL CHECKS**

  // Check 1: Is enrollment active for this course?
  if (!course.isEnrollmentActive) {
    res.status(403); // Forbidden
    throw new Error('Enrollment is currently not active for this course. Please contact administration for more details.');
  }

  // Check 2: Has the enrollment open time passed?
  if (course.enrollmentOpenTime) { // Proceed only if enrollmentOpenTime is set
    const currentTime = new Date(); // Current time (UTC) on the server
    const enrollmentOpenTime = new Date(course.enrollmentOpenTime); // The stored IST moment (as UTC Date object)

    if (currentTime < enrollmentOpenTime) {
      res.status(403); // Forbidden
      // Provide a user-friendly message with the exact opening time in IST
      const formatter = new Intl.DateTimeFormat('en-IN', {
        timeZone: 'Asia/Kolkata',
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: 'numeric',
        minute: '2-digit',
        hour12: true, // Use 12-hour format with AM/PM
        // weekday: 'short', // Optional: add weekday
      });
      const formattedOpenTime = formatter.format(enrollmentOpenTime);
      throw new Error(`Enrollment for this course will open on ${formattedOpenTime} IST.`);
    }
  }
  // **END OF NEW ENROLLMENT CONTROL CHECKS**

  if (course.enrolledStudentsCount >= course.intakeCapacity) {
    res.status(409); // Conflict
    // To prevent a race condition, also mark enrollment as inactive if it just became full
    // This is a pragmatic approach; for strictness, separate admin action might be preferred.
    // For now, let's just throw the error.
    throw new Error('Course is full. No seats available.');
  }

  // Atomically increment enrolledStudentsCount
  const updatedCourse = await Course.findByIdAndUpdate(
    courseId,
    { $inc: { enrolledStudentsCount: 1 } },
    { new: true } // Return the updated document
  );

  if (!updatedCourse) {
    // This case ideally shouldn't happen if findById found it, but for safety
    res.status(500);
    throw new Error('Failed to update course enrollment count.');
  }

  // Defensive check in case another request filled it right after our check
  // This check is less critical with $inc but good for robustness
  if (updatedCourse.enrolledStudentsCount > updatedCourse.intakeCapacity) {
    // Revert the count if it went over
    await Course.findByIdAndUpdate(courseId, { $inc: { enrolledStudentsCount: -1 } });
    res.status(409); // Conflict
    throw new Error('No seats available for this course, or another student just took the last seat.');
  }

  // 6. Create the enrollment record
  const enrollment = await Enrollment.create({
    student: studentId,
    course: courseId,
  });

  res.status(201).json({
    message: 'Successfully enrolled in course',
    enrollment,
    updatedCourse, // Return the updated course with new count
  });
});

// @desc    Admin gets all enrollments for a specific course
// @route   GET /api/courses/:id/enrollments
// @access  Private/Admin
const getCourseEnrollments = asyncHandler(async (req, res) => {
  const courseId = req.params.id;
  const enrollments = await Enrollment.find({ course: courseId }).populate('student', 'name email batch'); // Populate student details

  res.status(200).json(enrollments);
});

// @desc    Student gets their own enrollments
// @route   GET /api/courses/my-enrollments
// @access  Private/Student
const getMyEnrollments = asyncHandler(async (req, res) => {
  const studentId = req.user._id;
  const enrollments = await Enrollment.find({ student: studentId }).populate('course', 'courseName batch intakeCapacity');

  res.status(200).json(enrollments);
});
const clearAllCourses = asyncHandler(async (req, res) => {
  // Delete all enrollments first
  await Enrollment.deleteMany({});
  // Then delete all courses
  const deleteResult = await Course.deleteMany({});

  res.status(200).json({
    message: `Successfully cleared all ${deleteResult.deletedCount} courses and all associated enrollments.`,
  });
});

const getAllEnrollmentsWithDetails = asyncHandler(async (req, res) => {
  const enrollments = await Enrollment.find({})
    .populate('student', 'name email batch') // Populate student details
    .populate('course', 'courseName batch intakeCapacity'); // Populate course details

  res.status(200).json(enrollments);
});

const getBatches = asyncHandler(async (req, res) => {
  // Fetch distinct batches from the User model where role is 'student'
  const batches = await User.distinct('batch', { role: 'student' });
  // Sort the batches for a cleaner display in the dropdown
  batches.sort();
  res.status(200).json(batches);
});


const getEnrollmentStats = asyncHandler(async (req, res) => {
  const stats = [];
  const batches = await User.distinct('batch', { role: 'student' }); // Get all unique batches from students

  for (const batch of batches) {
    const totalStudents = await User.countDocuments({ batch, role: 'student' }); //
    const enrolledStudentsInBatch = await Enrollment.aggregate([
      {
        $lookup: {
          from: 'users', // Collection name for User model is typically 'users'
          localField: 'student',
          foreignField: '_id',
          as: 'studentDetails',
        },
      },
      {
        $unwind: '$studentDetails',
      },
      {
        $match: {
          'studentDetails.batch': batch,
          'studentDetails.role': 'student', // Ensure we only count students
        },
      },
      {
        $group: {
          _id: '$student', // Group by student to count unique enrolled students
        },
      },
      {
        $count: 'enrolledCount',
      },
    ]);

    const enrolledCount = enrolledStudentsInBatch.length > 0 ? enrolledStudentsInBatch[0].enrolledCount : 0;
    const notEnrolledStudents = totalStudents - enrolledCount;

    stats.push({
      batch,
      totalStudents,
      enrolledStudents: enrolledCount,
      notEnrolledStudents,
    });
  }

  res.status(200).json(stats);
});

// @desc    Get unenrolled students for a specific batch
// @route   GET /api/admin/unenrolled-students/:batch
// @access  Private/Admin
const getUnenrolledStudents = asyncHandler(async (req, res) => {
  const { batch } = req.params;

  // 1. Get all student IDs for the given batch
  const allStudentsInBatch = await User.find({ batch, role: 'student' }).select('_id'); //
  const allStudentIdsInBatch = allStudentsInBatch.map(student => student._id);

  // 2. Get all student IDs who are enrolled in any course for the given batch
  const enrolledStudentIds = await Enrollment.aggregate([
    {
      $lookup: {
        from: 'users', // Collection name for User model is typically 'users'
        localField: 'student',
        foreignField: '_id',
        as: 'studentDetails',
      },
    },
    {
      $unwind: '$studentDetails',
    },
    {
      $match: {
        'studentDetails.batch': batch,
        'studentDetails.role': 'student', // Ensure we only match students
      },
    },
    {
      $group: {
        _id: '$student',
      },
    },
  ]);

  const enrolledIds = enrolledStudentIds.map(enrollment => enrollment._id);

  // 3. Find students who are in allStudentIdsInBatch but not in enrolledIds
  const unenrolledStudents = await User.find({ //
    _id: { $in: allStudentIdsInBatch, $nin: enrolledIds },
    batch: batch,
    role: 'student', // Ensure we only query for students
  }).select('name email batch'); // Select only necessary fields

  if (!unenrolledStudents || unenrolledStudents.length === 0) {
    return res.status(404).json({ message: `No unenrolled students found for batch ${batch}.` });
  }

  res.status(200).json(unenrolledStudents);
});

module.exports = {
  addCourse,
  getCourses,
  updateCourse,
  deleteCourse, // Keep this if you want single delete endpoint
  bulkDeleteCourses, // NEW EXPORT
    clearAllCourses,
  setEnrollmentTime,
  enrollInCourse,
  getCourseEnrollments,
  getAllEnrollmentsWithDetails,
  getMyEnrollments,
  createBatchCourses,
  getBatches, // NEW EXPORT for fetching distinct batches
  getEnrollmentStats,
  getUnenrolledStudents, // NEW EXPORT for getting unenrolled students in a batch
};