const Course = require('../models/Course');
const Enrollment = require('../models/Enrollment');
const asyncHandler = require('express-async-handler');
const User = require('../models/User');

// ========================================
// UTILITY FUNCTION: AUTO-ACTIVATE COURSES
// ========================================
// Automatically activates courses whose enrollment open time has passed
const autoActivateCourses = async () => {
  try {
    const currentTimeUTC = new Date(); // Current time in UTC

    // Self-heal inconsistent data where enrollment is marked active but open time is still in the future.
    const normalizeResult = await Course.updateMany(
      {
        isEnrollmentActive: true,
        enrollmentOpenTime: { $ne: null, $gt: currentTimeUTC },
      },
      {
        $set: { enrollmentOpenTime: currentTimeUTC },
      }
    );

    if (normalizeResult.modifiedCount > 0) {
      console.log(`✓ Normalized ${normalizeResult.modifiedCount} active course(s) with future open time`);
    }
    
    // Find courses that:
    // 1. Have an enrollmentOpenTime set
    // 2. Are not yet active
    // 3. Current time >= enrollmentOpenTime
    const result = await Course.updateMany(
      {
        enrollmentOpenTime: { $ne: null, $lte: currentTimeUTC },
        isEnrollmentActive: false
      },
      {
        $set: { isEnrollmentActive: true }
      }
    );
    
    if (result.modifiedCount > 0) {
      console.log(`✓ Auto-activated ${result.modifiedCount} courses based on enrollment open time`);
    }
    
    return result.modifiedCount + normalizeResult.modifiedCount;
  } catch (error) {
    console.error('Error in autoActivateCourses:', error);
    return 0;
  }
};

// Resolves enrollment state consistently for create/update flows.
// If admin explicitly activates now, activation is immediate and open time is set to "now".
const resolveEnrollmentState = ({ enrollmentOpenTime, isEnrollmentActive }, res, currentState = {}) => {
  const hasOpenTimeInput = typeof enrollmentOpenTime !== 'undefined';
  const hasActiveInput = typeof isEnrollmentActive === 'boolean';

  if (!hasOpenTimeInput && !hasActiveInput) {
    return {
      openTimeUTC: currentState.enrollmentOpenTime ?? null,
      finalIsEnrollmentActive: currentState.isEnrollmentActive ?? false,
    };
  }

  const currentTimeUTC = new Date();

  if (isEnrollmentActive === true) {
    return {
      openTimeUTC: currentTimeUTC,
      finalIsEnrollmentActive: true,
    };
  }

  if (isEnrollmentActive === false && !hasOpenTimeInput) {
    return {
      openTimeUTC: null,
      finalIsEnrollmentActive: false,
    };
  }

  const effectiveOpenTime = hasOpenTimeInput ? enrollmentOpenTime : currentState.enrollmentOpenTime;

  if (!effectiveOpenTime) {
    return {
      openTimeUTC: null,
      finalIsEnrollmentActive: false,
    };
  }

  const parsedOpenTimeUTC = new Date(effectiveOpenTime);
  if (Number.isNaN(parsedOpenTimeUTC.getTime())) {
    res.status(400);
    throw new Error('Invalid enrollment open time format.');
  }

  return {
    openTimeUTC: parsedOpenTimeUTC,
    finalIsEnrollmentActive: parsedOpenTimeUTC <= currentTimeUTC,
  };
};

const VALID_BLOCKS = ['Block 1', 'Block 2'];

const normalizeCourseBlock = (rawBlock) => {
  if (typeof rawBlock !== 'string') {
    return null;
  }

  const normalized = rawBlock.trim().toLowerCase().replace(/\s+/g, ' ');
  if (normalized === '1' || normalized === 'block1' || normalized === 'block 1') {
    return 'Block 1';
  }
  if (normalized === '2' || normalized === 'block2' || normalized === 'block 2') {
    return 'Block 2';
  }

  return null;
};

// @desc    Admin adds a new single course
// @route   POST /api/courses
// @access  Private/Admin
const addCourse = asyncHandler(async (req, res) => {
  const { courseName, batch, block, intakeCapacity, department, professorName } = req.body;

  if (!courseName || !batch || !block || !intakeCapacity || !department || !professorName) {
    res.status(400);
    throw new Error('Please fill all required fields: Course Name, Batch, Block, Intake Capacity, Department, Professor Name.');
  }

  const normalizedBlock = normalizeCourseBlock(block);
  if (!normalizedBlock) {
    res.status(400);
    throw new Error(`Invalid block. Allowed values are: ${VALID_BLOCKS.join(', ')}.`);
  }

  const courseExists = await Course.findOne({ courseName, batch, block: normalizedBlock });
  if (courseExists) {
    res.status(400);
    throw new Error('Course with this name, batch, and block already exists.');
  }

  const course = await Course.create({
    courseName,
    batch,
    block: normalizedBlock,
    intakeCapacity,
    department,
    professorName,
    enrolledStudentsCount: 0, // Initialize to 0 for new courses
  });

  res.status(201).json(course);
});

// @desc    Admin creates multiple courses for a specific batch with shared enrollment settings
// @route   POST /api/courses/batch-courses
// @access  Private/Admin
const createBatchCourses = asyncHandler(async (req, res) => {
  const { batch, block, enrollmentOpenTime, isEnrollmentActive, courses } = req.body;

  if (!batch || !block || typeof isEnrollmentActive === 'undefined' || !courses || !Array.isArray(courses) || courses.length === 0) {
    res.status(400);
    throw new Error('Please provide batch, block, active status, and a list of courses.');
  }

  const normalizedBlock = normalizeCourseBlock(block);
  if (!normalizedBlock) {
    res.status(400);
    throw new Error(`Invalid block. Allowed values are: ${VALID_BLOCKS.join(', ')}.`);
  }

  // Validate individual courses data and check for duplicates within the same batch + block
  const courseNamesInBatch = new Set();
  for (const courseData of courses) {
    if (
      !courseData.courseName
      || !courseData.intakeCapacity
      || courseData.intakeCapacity < 1
      || !courseData.department
      || !courseData.professorName
    ) {
      res.status(400);
      throw new Error('Each course must have a name, department, professor name, and a valid intake capacity (min 1).');
    }
    if (courseNamesInBatch.has(courseData.courseName)) {
        res.status(400);
        throw new Error(`Duplicate course name "${courseData.courseName}" found in the list for batch "${batch}" and ${normalizedBlock}.`);
    }
    courseNamesInBatch.add(courseData.courseName);

      // Also check against existing courses in DB for this batch + block
      const existingCourse = await Course.findOne({ courseName: courseData.courseName, batch, block: normalizedBlock });
    if (existingCourse) {
        res.status(400);
        throw new Error(`Course "${courseData.courseName}" already exists for batch "${batch}" and ${normalizedBlock}.`);
    }
  }

  const { openTimeUTC, finalIsEnrollmentActive } = resolveEnrollmentState(
    { enrollmentOpenTime, isEnrollmentActive },
    res
  );

  const newCourses = courses.map(courseData => ({
    courseName: courseData.courseName,
    batch, // Apply the same batch to all courses in this bunch
    block: normalizedBlock,
    intakeCapacity: courseData.intakeCapacity,
    department: courseData.department,
    professorName: courseData.professorName,
    enrolledStudentsCount: 0, // Initialize to 0
    enrollmentOpenTime: openTimeUTC,
    isEnrollmentActive: finalIsEnrollmentActive,
  }));

  const createdCourses = await Course.insertMany(newCourses);

  res.status(201).json({
    message: `${createdCourses.length} courses created successfully for batch ${batch}, ${normalizedBlock}!`,
    courses: createdCourses,
  });
});


// @desc    Get all courses (Admin: all courses; Student: courses for their batch)
// @route   GET /api/courses
// @access  Private/Admin, Private/Student (filtered)
const getCourses = asyncHandler(async (req, res) => {
  // First, auto-activate any courses whose enrollment time has passed
  await autoActivateCourses();
  
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
  const {
    courseName,
    batch,
    block,
    intakeCapacity,
    department,
    professorName,
    enrollmentOpenTime,
    isEnrollmentActive,
  } = req.body;

  const course = await Course.findById(req.params.id);

  if (!course) {
    res.status(404);
    throw new Error('Course not found');
  }

  course.courseName = courseName || course.courseName;
  course.batch = batch || course.batch;
  course.intakeCapacity = intakeCapacity || course.intakeCapacity;
  if (typeof block !== 'undefined') {
    const normalizedBlock = normalizeCourseBlock(block);
    if (!normalizedBlock) {
      res.status(400);
      throw new Error(`Invalid block. Allowed values are: ${VALID_BLOCKS.join(', ')}.`);
    }
    course.block = normalizedBlock;
  }
  if (typeof department !== 'undefined') {
    course.department = department;
  }
  if (typeof professorName !== 'undefined') {
    course.professorName = professorName;
  }
  
  if (typeof enrollmentOpenTime !== 'undefined' || typeof isEnrollmentActive === 'boolean') {
    const { openTimeUTC, finalIsEnrollmentActive } = resolveEnrollmentState(
      { enrollmentOpenTime, isEnrollmentActive },
      res,
      {
        enrollmentOpenTime: course.enrollmentOpenTime,
        isEnrollmentActive: course.isEnrollmentActive,
      }
    );

    course.enrollmentOpenTime = openTimeUTC;
    course.isEnrollmentActive = finalIsEnrollmentActive;
  }

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

// @desc    Close enrollment for all courses in a specific batch
// @route   PUT /api/courses/close-batch-enrollment
// @access  Private/Admin
const closeBatchEnrollment = asyncHandler(async (req, res) => {
  const { batch } = req.body;

  if (!batch) {
    res.status(400);
    throw new Error('Please provide a batch to close enrollment for.');
  }

  // First, check how many courses are in this batch
  const totalCourses = await Course.countDocuments({ batch });
  
  if (totalCourses === 0) {
    res.status(404);
    throw new Error(`No courses found for batch "${batch}".`);
  }

  // Count how many are already closed
  const alreadyClosedCount = await Course.countDocuments({ 
    batch, 
    isEnrollmentActive: false 
  });

  // Update all courses for this batch to:
  // 1. Set isEnrollmentActive to false
  // 2. Clear enrollmentOpenTime to prevent auto-reactivation
  const result = await Course.updateMany(
    { batch, isEnrollmentActive: true }, // Only update courses that are currently active
    { 
      $set: { 
        isEnrollmentActive: false,
        enrollmentOpenTime: null // Clear the time to prevent auto-reactivation
      } 
    }
  );

  res.status(200).json({
    message: result.modifiedCount > 0 
      ? `Successfully closed enrollment for ${result.modifiedCount} course(s) in batch "${batch}".`
      : `All courses in batch "${batch}" are already closed.`,
    modifiedCount: result.modifiedCount,
    totalCourses,
    alreadyClosedCount,
    batch
  });
});

// @desc    Set enrollment settings (time + active) for all courses in a specific batch
// @route   PUT /api/courses/set-batch-enrollment
// @access  Private/Admin
const setBatchEnrollmentSettings = asyncHandler(async (req, res) => {
  const { batch, block, enrollmentOpenTime, isEnrollmentActive } = req.body;

  if (!batch || !block) {
    res.status(400);
    throw new Error('Please provide both batch and block.');
  }

  const normalizedBlock = normalizeCourseBlock(block);
  if (!normalizedBlock) {
    res.status(400);
    throw new Error(`Invalid block. Allowed values are: ${VALID_BLOCKS.join(', ')}.`);
  }

  if (typeof enrollmentOpenTime === 'undefined' && typeof isEnrollmentActive === 'undefined') {
    res.status(400);
    throw new Error('Please provide enrollment settings to update.');
  }

  const totalCourses = await Course.countDocuments({ batch, block: normalizedBlock });
  if (totalCourses === 0) {
    res.status(404);
    throw new Error(`No courses found for batch "${batch}", ${normalizedBlock}.`);
  }

  const { openTimeUTC, finalIsEnrollmentActive } = resolveEnrollmentState(
    { enrollmentOpenTime, isEnrollmentActive },
    res
  );

  const result = await Course.updateMany(
    { batch, block: normalizedBlock },
    {
      $set: {
        enrollmentOpenTime: openTimeUTC,
        isEnrollmentActive: finalIsEnrollmentActive,
      },
    }
  );

  res.status(200).json({
    message: `Updated enrollment settings for batch "${batch}", ${normalizedBlock}.`,
    batch,
    block: normalizedBlock,
    totalCourses,
    modifiedCount: result.modifiedCount,
    enrollmentOpenTime: openTimeUTC,
    isEnrollmentActive: finalIsEnrollmentActive,
  });
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

  const { openTimeUTC, finalIsEnrollmentActive } = resolveEnrollmentState(
    { enrollmentOpenTime, isEnrollmentActive },
    res,
    {
      enrollmentOpenTime: course.enrollmentOpenTime,
      isEnrollmentActive: course.isEnrollmentActive,
    }
  );

  course.enrollmentOpenTime = openTimeUTC;
  course.isEnrollmentActive = finalIsEnrollmentActive;

  const updatedCourse = await course.save();
  res.status(200).json(updatedCourse);
});

// @desc    Student enrolls in a course (First-Come, First-Served, Atomic & Race-Condition-Free)
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

  // 2. Find the course and check basic availability
  const course = await Course.findById(courseId);
  if (!course) {
    res.status(404);
    throw new Error('Course not found.');
  }

  // **START OF ENROLLMENT CONTROL CHECKS**

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
  // **END OF ENROLLMENT CONTROL CHECKS**

  // **ATOMIC SEAT RESERVATION - RACE CONDITION FIX**
  // This atomic operation ONLY increments if seats are available
  // The query condition ensures we only update if enrolledStudentsCount < intakeCapacity
  // This prevents any race conditions even with thousands of simultaneous requests
  const updatedCourse = await Course.findOneAndUpdate(
    {
      _id: courseId,
      $expr: { $lt: ['$enrolledStudentsCount', '$intakeCapacity'] }, // Only update if count < capacity (field comparison)
    },
    {
      $inc: { enrolledStudentsCount: 1 }
    },
    {
      new: true, // Return updated document
      runValidators: true
    }
  );

  // If updatedCourse is null, it means the condition wasn't met (course is full)
  if (!updatedCourse) {
    res.status(409); // Conflict
    throw new Error('Course is full. No seats available.');
  }

  // 3. Create the enrollment record
  // At this point, we have successfully reserved a seat atomically
  try {
    const enrollment = await Enrollment.create({
      student: studentId,
      course: courseId,
    });

    res.status(201).json({
      message: 'Successfully enrolled in course',
      enrollment,
      updatedCourse, // Return the updated course with new count
    });
  } catch (enrollmentError) {
    // If enrollment creation fails (e.g., duplicate key), rollback the count
    await Course.findByIdAndUpdate(courseId, { $inc: { enrolledStudentsCount: -1 } });
    
    // Check if it's a duplicate enrollment error
    if (enrollmentError.code === 11000) {
      res.status(400);
      throw new Error('You are already enrolled in this course.');
    }
    
    // Re-throw other errors
    throw enrollmentError;
  }
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
  const enrollments = await Enrollment.find({ student: studentId }).populate('course', 'courseName batch block intakeCapacity department professorName');

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
    .populate('course', 'courseName batch block intakeCapacity department professorName'); // Populate course details

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

// @desc    Recalculate and sync enrolledStudentsCount for all courses (Admin utility)
// @route   POST /api/courses/sync-enrollment-counts
// @access  Private/Admin
const syncEnrollmentCounts = asyncHandler(async (req, res) => {
  // Get all courses
  const courses = await Course.find({});
  
  let updatedCount = 0;
  let errors = [];
  
  for (const course of courses) {
    try {
      // Count actual enrollments for this course
      const actualCount = await Enrollment.countDocuments({ course: course._id });
      
      // Only update if there's a mismatch
      if (course.enrolledStudentsCount !== actualCount) {
        await Course.findByIdAndUpdate(course._id, {
          enrolledStudentsCount: actualCount
        });
        updatedCount++;
      }
    } catch (error) {
      errors.push({
        courseId: course._id,
        courseName: course.courseName,
        error: error.message
      });
    }
  }
  
  if (errors.length > 0) {
    res.status(207); // Multi-Status
    return res.json({
      message: `Synced ${updatedCount} courses with mismatched counts`,
      updatedCount,
      totalCourses: courses.length,
      errors
    });
  }
  
  res.status(200).json({
    message: updatedCount > 0 
      ? `Successfully synced ${updatedCount} courses with mismatched enrollment counts!`
      : 'All course enrollment counts are already accurate!',
    updatedCount,
    totalCourses: courses.length
  });
});

module.exports = {
  addCourse,
  getCourses,
  updateCourse,
  deleteCourse, // Keep this if you want single delete endpoint
  bulkDeleteCourses, // NEW EXPORT
  clearAllCourses,
  closeBatchEnrollment, // NEW EXPORT for closing enrollment for a batch
  setBatchEnrollmentSettings,
  setEnrollmentTime,
  enrollInCourse,
  getCourseEnrollments,
  getAllEnrollmentsWithDetails,
  getMyEnrollments,
  createBatchCourses,
  getBatches, // NEW EXPORT for fetching distinct batches
  getEnrollmentStats,
  getUnenrolledStudents, // NEW EXPORT for getting unenrolled students in a batch
  syncEnrollmentCounts, // NEW EXPORT for syncing enrollment counts
};