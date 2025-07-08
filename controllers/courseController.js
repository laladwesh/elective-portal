const Course = require('../models/Course');
const Enrollment = require('../models/Enrollment');
const asyncHandler = require('express-async-handler');

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
        throw new Error(`Course "${courseData.courseName}" already exists for batch "${batch}".`);
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

  // 1. Check if the student is ALREADY ENROLLED IN ANY COURSE
  const existingEnrollmentForStudent = await Enrollment.findOne({ student: studentId });
  if (existingEnrollmentForStudent) {
    const enrolledCourse = await Course.findById(existingEnrollmentForStudent.course);
    const courseName = enrolledCourse ? enrolledCourse.courseName : 'an unknown course';
    res.status(400);
    throw new Error(`You are already enrolled in a course: "${courseName}". You can only enroll in one elective course.`);
  }

  // 2. Find the course
  const course = await Course.findById(courseId);
  if (!course) {
    res.status(404);
    throw new Error('Course not found.');
  }

  // 3. Check if enrollment is active and time has passed
  const now = new Date();
  if (!course.isEnrollmentActive || (course.enrollmentOpenTime && now < course.enrollmentOpenTime)) {
    res.status(400);
    throw new Error('Enrollment for this course is not yet open or has been closed.');
  }

  // 4. Check if student's batch matches course batch or if course is for 'All' batches
  if (course.batch !== 'All' && course.batch !== req.user.batch) {
    res.status(403);
    throw new Error(`This course is not available for your batch (${req.user.batch}).`);
  }

  // 5. Check for available seats and handle first-come, first-served atomically
  // Use findOneAndUpdate with $inc and a condition to ensure atomicity
  const updatedCourse = await Course.findOneAndUpdate(
    { _id: courseId, enrolledStudentsCount: { $lt: course.intakeCapacity } }, // Condition: only update if not full
    { $inc: { enrolledStudentsCount: 1 } }, // Action: increment count
    { new: true } // Return the updated document
  );

  if (!updatedCourse) {
    // If updatedCourse is null, it means the course was already full when we tried to update
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


module.exports = {
  addCourse,
  getCourses,
  updateCourse,
  deleteCourse,
  setEnrollmentTime,
  enrollInCourse,
  getCourseEnrollments,
  getMyEnrollments,
  createBatchCourses // <--- NEW EXPORT
};