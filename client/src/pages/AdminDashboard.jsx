import React, { useState, useEffect, useCallback } from "react";
import axios from "axios";
import { toast } from "react-hot-toast";

// Import your Modal component
import Modal from "../components/Modal";

// Heroicon Imports - Solid Icons
import {
  PlusCircleIcon,
  MinusCircleIcon,
  UserPlusIcon,
  AcademicCapIcon,
  EyeIcon,
  ArrowRightOnRectangleIcon,
  CheckCircleIcon,
  XCircleIcon,
  CalendarIcon,
  IdentificationIcon,
  EnvelopeIcon,
  BuildingOffice2Icon,
  ClipboardDocumentListIcon, // For viewing enrollments/students
  UserGroupIcon, // For group of students
  TagIcon, // For batch tag
  TicketIcon, // For individual course in modal
} from "@heroicons/react/24/solid";

function AdminDashboard({ user, onLogout }) {
  const [courses, setCourses] = useState([]);
  const [newBatchCourseData, setNewBatchCourseData] = useState({
    batch: "",
    enrollmentTime: "", // Will hold the datetime-local string
    isEnrollmentActive: false,
    courses: [{ courseName: "", intakeCapacity: "" }],
  });
  const [newStudent, setNewStudent] = useState({
    name: "",
    email: "",
    batch: "",
  });

  // State for Course Enrollments Modal
  const [isEnrollmentModalOpen, setIsEnrollmentModalOpen] = useState(false);
  const [selectedCourseId, setSelectedCourseId] = useState("");
  const [selectedCourseName, setSelectedCourseName] = useState("");
  const [courseEnrollments, setCourseEnrollments] = useState([]);
  const [isLoadingEnrollments, setIsLoadingEnrollments] = useState(false);

  // State for All Students Modal
  const [isStudentsModalOpen, setIsStudentsModalOpen] = useState(false);
  const [allStudents, setAllStudents] = useState([]);
  const [activeStudentBatchTab, setActiveStudentBatchTab] = useState(""); // Holds the active batch e.g., "2020"
  const [isLoadingStudents, setIsLoadingStudents] = useState(false);

  // Memoize config for API calls
  const config = useCallback(
    () => ({
      headers: {
        Authorization: `Bearer ${user?.token}`,
      },
    }),
    [user?.token]
  );

  // Fetch all courses (for admin's table)
  const fetchCourses = useCallback(async () => {
    try {
      const res = await axios.get(`/api/courses`, config());
      setCourses(res.data);
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to fetch courses");
    }
  }, [config]);

  // Fetch all students (for student list modal)
  const fetchAllStudents = useCallback(async () => {
    setIsLoadingStudents(true);
    try {
      const res = await axios.get(`/api/students`, config());
      setAllStudents(res.data);
      // Set the first batch as active tab by default if not already set
      if (res.data.length > 0 && !activeStudentBatchTab) {
        const uniqueBatches = [...new Set(res.data.map(student => student.batch))].sort();
        if (uniqueBatches.length > 0) {
          setActiveStudentBatchTab(uniqueBatches[0]);
        }
      }
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to fetch students");
    } finally {
      setIsLoadingStudents(false);
    }
  }, [config, activeStudentBatchTab]); // Added activeStudentBatchTab as dependency

  useEffect(() => {
    fetchCourses();
  }, [fetchCourses]);

  const handleBatchCourseChange = (e) => {
    const { name, value, type, checked } = e.target;
    setNewBatchCourseData((prev) => ({
      ...prev,
      [name]: type === "checkbox" ? checked : value,
    }));
  };

  const handleIndividualCourseChange = (index, e) => {
    const { name, value } = e.target;
    const updatedCourses = newBatchCourseData.courses.map((course, i) =>
      i === index ? { ...course, [name]: value } : course
    );
    setNewBatchCourseData((prev) => ({ ...prev, courses: updatedCourses }));
  };

  const handleAddIndividualCourseField = () => {
    setNewBatchCourseData((prev) => ({
      ...prev,
      courses: [...prev.courses, { courseName: "", intakeCapacity: "" }],
    }));
  };

  const handleRemoveIndividualCourseField = (index) => {
    if (newBatchCourseData.courses.length > 1) {
      setNewBatchCourseData((prev) => ({
        ...prev,
        courses: prev.courses.filter((_, i) => i !== index),
      }));
    }
  };

  const handleCreateBatchCourses = async (e) => {
    e.preventDefault();
    const {
      batch,
      enrollmentTime,
      isEnrollmentActive,
      courses: individualCourses,
    } = newBatchCourseData;

    if (!batch || !enrollmentTime || individualCourses.length === 0) {
      toast.error("Please fill all batch details and add at least one course.");
      return;
    }

    for (const course of individualCourses) {
      if (
        !course.courseName ||
        !course.intakeCapacity ||
        course.intakeCapacity <= 0
      ) {
        toast.error(
          "All courses must have a name and a positive intake capacity."
        );
        return;
      }
    }

    // Append IST offset if not already present
    let timeToSend = enrollmentTime;
    if (timeToSend) {
      if (!timeToSend.match(/:[0-5]\d([+-]\d{2}:\d{2}|Z)$/)) { // Checks if already has seconds and timezone/Z
        timeToSend += ":00"; // Add seconds if missing (datetime-local usually doesn't have it)
      }
      if (!timeToSend.match(/[+-]\d{2}:\d{2}$/)) { // Checks if timezone offset is missing
        timeToSend += "+05:30"; // IST offset
      }
    }
    try {
      toast.loading("Creating courses...", { id: "createCourseToast" });
      await axios.post(
        `/api/courses/batch-courses`,
        {
          batch,
          enrollmentOpenTime: timeToSend,
          isEnrollmentActive,
          courses: individualCourses,
        },
        config()
      );
      toast.success(`Courses for batch ${batch} created successfully!`, { id: "createCourseToast" });
      setNewBatchCourseData({
        batch: "",
        enrollmentTime: "",
        isEnrollmentActive: false,
        courses: [{ courseName: "", intakeCapacity: "" }],
      });
      fetchCourses();
    } catch (error) {
      toast.error(
        error.response?.data?.message || "Failed to create batch courses",
        { id: "createCourseToast" }
      );
      console.error(
        "Error creating batch courses:",
        error.response?.data || error
      );
    }
  };

  const handleAddStudent = async (e) => {
    e.preventDefault();
    try {
      toast.loading("Adding student...", { id: "addStudentToast" });
      await axios.post(`/api/students`, newStudent, config());
      toast.success("Student added successfully!", { id: "addStudentToast" });
      setNewStudent({ name: "", email: "", batch: "" });
      fetchAllStudents(); // Refresh student list when a new student is added
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to add student", { id: "addStudentToast" });
    }
  };

  // --- Modal Specific Functions ---

  // For Course Enrollments Modal
  const openEnrollmentModal = async (courseId, courseName) => {
    setSelectedCourseId(courseId);
    setSelectedCourseName(courseName);
    setCourseEnrollments([]); // Clear previous enrollments
    setIsEnrollmentModalOpen(true);
    setIsLoadingEnrollments(true);
    try {
      const res = await axios.get(
        `/api/courses/${courseId}/enrollments`,
        config()
      );
      setCourseEnrollments(res.data);
      toast.success(`Enrollments for ${courseName} loaded.`);
    } catch (error) {
      toast.error(
        error.response?.data?.message || "Failed to fetch enrollments"
      );
    } finally {
      setIsLoadingEnrollments(false);
    }
  };

  const closeEnrollmentModal = () => {
    setIsEnrollmentModalOpen(false);
    setSelectedCourseId("");
    setSelectedCourseName("");
    setCourseEnrollments([]);
  };

  // For All Students Modal
  const openStudentsModal = () => {
    setIsStudentsModalOpen(true);
    fetchAllStudents(); // Fetch students when modal opens
  };

  const closeStudentsModal = () => {
    setIsStudentsModalOpen(false);
    setAllStudents([]); // Clear student data on close
    setActiveStudentBatchTab("");
  };

  // Group students by batch for the tabs
  const studentsByBatch = allStudents.reduce((acc, student) => {
    (acc[student.batch] = acc[student.batch] || []).push(student);
    return acc;
  }, {});

  const sortedBatches = Object.keys(studentsByBatch).sort();


  return (
    <div className="min-h-screen bg-gray-50 p-4 sm:p-6 lg:p-8">
      <div className="max-w-7xl mx-auto">
        <div className="flex justify-between items-center mb-6 bg-white p-4 rounded-lg shadow-sm">
          <h1 className="text-3xl font-extrabold text-gray-900 flex items-center">
            <AcademicCapIcon className="w-8 h-8 mr-3 text-indigo-600" />
            Admin Dashboard
          </h1>
          <div className="flex items-center space-x-4">
            <p className="text-lg text-gray-700">
              Welcome,{" "}
              <span className="font-semibold text-indigo-700">
                {user?.name}
              </span>{" "}
              ({user?.role})
            </p>
            <button
              onClick={onLogout}
              className="flex items-center px-4 py-2 bg-red-600 text-white font-medium rounded-lg shadow-md hover:bg-red-700 transition duration-300 ease-in-out"
            >
              <ArrowRightOnRectangleIcon className="w-5 h-5 mr-2" />
              Logout
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
          {/* Create Batch Courses Form */}
          <div className="lg:col-span-2 bg-white p-6 rounded-lg shadow-lg border border-gray-100">
            <h2 className="text-2xl font-bold text-gray-800 mb-5 flex items-center">
              <BuildingOffice2Icon className="w-6 h-6 mr-3 text-indigo-600" />
              Create Courses for a Batch
            </h2>
            <form onSubmit={handleCreateBatchCourses} className="space-y-5">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label
                    htmlFor="batch"
                    className="block text-sm font-medium text-gray-700 mb-1"
                  >
                    Batch Year
                  </label>
                  <input
                    type="text"
                    name="batch"
                    id="batch"
                    placeholder="e.g., 2020"
                    className="w-full p-3 border border-gray-300 rounded-md focus:ring-indigo-500 focus:border-indigo-500 transition duration-150"
                    value={newBatchCourseData.batch}
                    onChange={handleBatchCourseChange}
                    required
                  />
                </div>
                <div>
                  <label
                    htmlFor="enrollmentTime"
                    className="block text-sm font-medium text-gray-700 mb-1"
                  >
                    Enrollment Open Time (IST)
                  </label>
                  <input
                    type="datetime-local"
                    name="enrollmentTime"
                    id="enrollmentTime"
                    className="w-full p-3 border border-gray-300 rounded-md focus:ring-indigo-500 focus:border-indigo-500 transition duration-150"
                    value={newBatchCourseData.enrollmentTime}
                    onChange={handleBatchCourseChange}
                    required
                  />
                </div>
              </div>
              <div className="flex items-center gap-3 mt-4">
                <input
                  type="checkbox"
                  id="isEnrollmentActive"
                  name="isEnrollmentActive"
                  checked={newBatchCourseData.isEnrollmentActive}
                  onChange={handleBatchCourseChange}
                  className="h-5 w-5 text-indigo-600 border-gray-300 rounded focus:ring-indigo-500"
                />
                <label
                  htmlFor="isEnrollmentActive"
                  className="text-gray-700 text-base font-medium"
                >
                  Activate Enrollment for this Batch
                </label>
              </div>

              <h3 className="text-xl font-semibold text-gray-800 pt-4 pb-2">
                Individual Courses:
              </h3>
              {newBatchCourseData.courses.map((course, index) => (
                <div
                  key={index}
                  className="grid grid-cols-1 md:grid-cols-5 gap-4 items-end bg-gray-50 p-4 rounded-md border border-gray-200 shadow-sm"
                >
                  <div className="md:col-span-2">
                    <label
                      htmlFor={`courseName-${index}`}
                      className="block text-sm font-medium text-gray-700 mb-1"
                    >
                      Course Name
                    </label>
                    <input
                      type="text"
                      name="courseName"
                      id={`courseName-${index}`}
                      placeholder="e.g., Data Structures"
                      className="w-full p-3 border border-gray-300 rounded-md focus:ring-indigo-500 focus:border-indigo-500 transition duration-150"
                      value={course.courseName}
                      onChange={(e) => handleIndividualCourseChange(index, e)}
                      required
                    />
                  </div>
                  <div className="md:col-span-2">
                    <label
                      htmlFor={`intakeCapacity-${index}`}
                      className="block text-sm font-medium text-gray-700 mb-1"
                    >
                      Intake Capacity
                    </label>
                    <input
                      type="number"
                      name="intakeCapacity"
                      id={`intakeCapacity-${index}`}
                      placeholder="e.g., 60"
                      className="w-full p-3 border border-gray-300 rounded-md focus:ring-indigo-500 focus:border-indigo-500 transition duration-150"
                      value={course.intakeCapacity}
                      onChange={(e) => handleIndividualCourseChange(index, e)}
                      min="1"
                      required
                    />
                  </div>
                  {newBatchCourseData.courses.length > 1 && (
                    <button
                      type="button"
                      onClick={() => handleRemoveIndividualCourseField(index)}
                      className="flex items-center justify-center px-4 py-3 bg-red-500 text-white font-medium rounded-md shadow-sm hover:bg-red-600 transition duration-300 ease-in-out text-sm mt-auto"
                    >
                      <MinusCircleIcon className="w-5 h-5 mr-2" />
                      Remove
                    </button>
                  )}
                </div>
              ))}
              <button
                type="button"
                onClick={handleAddIndividualCourseField}
                className="flex items-center px-5 py-3 bg-green-600 text-white font-medium rounded-md shadow-md hover:bg-green-700 transition duration-300 ease-in-out"
              >
                <PlusCircleIcon className="w-5 h-5 mr-2" />
                Add Another Course
              </button>

              <button
                type="submit"
                className="w-full flex items-center justify-center px-6 py-3 bg-blue-600 text-white font-semibold rounded-lg shadow-lg hover:bg-blue-700 transition duration-300 ease-in-out mt-6"
              >
                <AcademicCapIcon className="w-6 h-6 mr-3" />
                Create Batch Courses
              </button>
            </form>
          </div>

          {/* Add Student Form */}
          <div className="bg-white p-6 rounded-lg shadow-lg border border-gray-100">
            <h2 className="text-2xl font-bold text-gray-800 mb-5 flex items-center">
              <UserPlusIcon className="w-6 h-6 mr-3 text-purple-600" />
              Add New Student
            </h2>
            <form onSubmit={handleAddStudent} className="space-y-4">
              <div>
                <label
                  htmlFor="studentName"
                  className="block text-sm font-medium text-gray-700 mb-1"
                >
                  Student Name
                </label>
                <input
                  type="text"
                  id="studentName"
                  placeholder="e.g., John Doe"
                  className="w-full p-3 border border-gray-300 rounded-md focus:ring-purple-500 focus:border-purple-500 transition duration-150"
                  value={newStudent.name}
                  onChange={(e) =>
                    setNewStudent({ ...newStudent, name: e.target.value })
                  }
                  required
                />
              </div>
              <div>
                <label
                  htmlFor="studentEmail"
                  className="block text-sm font-medium text-gray-700 mb-1"
                >
                  Student Email
                </label>
                <input
                  type="email"
                  id="studentEmail"
                  placeholder="e.g., john.doe@example.com"
                  className="w-full p-3 border border-gray-300 rounded-md focus:ring-purple-500 focus:border-purple-500 transition duration-150"
                  value={newStudent.email}
                  onChange={(e) =>
                    setNewStudent({ ...newStudent, email: e.target.value })
                  }
                  required
                />
              </div>
              <div>
                <label
                  htmlFor="studentBatch"
                  className="block text-sm font-medium text-gray-700 mb-1"
                >
                  Batch Year
                </label>
                <input
                  type="text"
                  id="studentBatch"
                  placeholder="e.g., 2020"
                  className="w-full p-3 border border-gray-300 rounded-md focus:ring-purple-500 focus:border-purple-500 transition duration-150"
                  value={newStudent.batch}
                  onChange={(e) =>
                    setNewStudent({ ...newStudent, batch: e.target.value })
                  }
                  required
                />
              </div>
              <button
                type="submit"
                className="w-full flex items-center justify-center px-6 py-3 bg-purple-600 text-white font-semibold rounded-lg shadow-lg hover:bg-purple-700 transition duration-300 ease-in-out"
              >
                <UserPlusIcon className="w-6 h-6 mr-3" />
                Add Student
              </button>
            </form>
          </div>
        </div>

        {/* View All Students Button */}
        <div className="flex justify-center mb-8">
          <button
            onClick={openStudentsModal}
            className="flex items-center px-6 py-3 bg-teal-600 text-white font-semibold rounded-lg shadow-lg hover:bg-teal-700 transition duration-300 ease-in-out"
          >
            <UserGroupIcon className="w-6 h-6 mr-3" />
            View All Students
          </button>
        </div>


        {/* Courses List (for Admin to see all courses) */}
        <div className="bg-white p-6 rounded-lg shadow-lg border border-gray-100 mb-8">
          <h2 className="text-2xl font-bold text-gray-800 mb-5 flex items-center">
            <ClipboardDocumentListIcon className="w-6 h-6 mr-3 text-emerald-600" />
            Available Courses (All Batches)
          </h2>
          {courses.length === 0 ? (
            <p className="text-gray-600 text-center py-4">
              No courses available. Start by creating courses for a batch!
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th
                      scope="col"
                      className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                    >
                      Course Name
                    </th>
                    <th
                      scope="col"
                      className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                    >
                      Batch
                    </th>
                    <th
                      scope="col"
                      className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                    >
                      Intake
                    </th>
                    <th
                      scope="col"
                      className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                    >
                      Enrolled
                    </th>
                    <th
                      scope="col"
                      className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                    >
                      Open Time (IST)
                    </th>
                    <th
                      scope="col"
                      className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                    >
                      Active
                    </th>
                    <th
                      scope="col"
                      className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                    >
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {courses.map((course) => {
                    const isFull = course.enrolledStudentsCount >= course.intakeCapacity;
                    let statusIcon = course.isEnrollmentActive ? (
                      <CheckCircleIcon className="w-5 h-5 text-green-500 inline-block align-middle mr-1" />
                    ) : (
                      <XCircleIcon className="w-5 h-5 text-red-500 inline-block align-middle mr-1" />
                    );
                    let statusText = course.isEnrollmentActive ? "Yes" : "No";
                    let statusClass = course.isEnrollmentActive ? "text-green-600" : "text-red-600";

                    if (isFull && course.isEnrollmentActive) {
                        statusIcon = <XCircleIcon className="w-5 h-5 text-red-500 inline-block align-middle mr-1" />;
                        statusText = "Full (Inactive)";
                        statusClass = "text-red-600";
                    } else if (isFull) { // If it's full but admin manually closed it
                        statusIcon = <XCircleIcon className="w-5 h-5 text-red-500 inline-block align-middle mr-1" />;
                        statusText = "Full";
                        statusClass = "text-red-600";
                    }

                    return (
                      <tr key={course._id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                          {course.courseName}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {course.batch}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {course.intakeCapacity}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {course.enrolledStudentsCount}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {course.enrollmentOpenTime
                            ? new Date(course.enrollmentOpenTime).toLocaleString(
                                "en-IN",
                                { timeZone: "Asia/Kolkata", dateStyle: 'short', timeStyle: 'short' }
                              )
                            : "Not Set"}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm">
                          {statusIcon}
                          <span className={`${statusClass} font-semibold`}>
                            {statusText}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                          <button
                            onClick={() =>
                              openEnrollmentModal(course._id, course.courseName)
                            }
                            className="flex items-center justify-center px-3 py-2 rounded-md text-white bg-indigo-600 hover:bg-indigo-700 font-medium text-xs transition duration-150 shadow-sm"
                          >
                            <EyeIcon className="w-4 h-4 mr-1" />
                            View Enrolled
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Course Enrollments Modal */}
        <Modal
          isOpen={isEnrollmentModalOpen}
          onClose={closeEnrollmentModal}
          title={`Enrollments for ${selectedCourseName}`}
        >
          {isLoadingEnrollments ? (
            <div className="text-center py-8 text-indigo-600">Loading enrollments...</div>
          ) : courseEnrollments.length === 0 ? (
            <p className="text-gray-600 text-center py-4">
              No students enrolled in this course yet.
            </p>
          ) : (
            <div className="overflow-x-auto max-h-96"> {/* Added max-h for scroll */}
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Student Name</th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Student Email</th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Batch</th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Enrollment Date (IST)</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {courseEnrollments.map((enrollment) => (
                    <tr key={enrollment._id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 flex items-center">
                        <IdentificationIcon className="w-4 h-4 mr-2 text-gray-500" />
                        {enrollment.student.name}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 flex items-center">
                        <EnvelopeIcon className="w-4 h-4 mr-2 text-gray-500" />
                        {enrollment.student.email}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        <TagIcon className="w-4 h-4 mr-1 text-gray-400" />
                        {enrollment.student.batch}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 flex items-center">
                        <CalendarIcon className="w-4 h-4 mr-2 text-gray-500" />
                        {new Date(enrollment.enrollmentDate).toLocaleString(
                          "en-IN",
                          { timeZone: "Asia/Kolkata", dateStyle: 'short', timeStyle: 'short' }
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Modal>

        {/* All Students Modal */}
        <Modal
          isOpen={isStudentsModalOpen}
          onClose={closeStudentsModal}
          title="All Students by Batch"
        >
          {isLoadingStudents ? (
            <div className="text-center py-8 text-teal-600">Loading students...</div>
          ) : sortedBatches.length === 0 ? (
            <p className="text-gray-600 text-center py-4">No students found.</p>
          ) : (
            <div>
              {/* Batch Tabs */}
              <div className="border-b border-gray-200">
                <nav className="-mb-px flex space-x-8" aria-label="Tabs">
                  {sortedBatches.map((batch) => (
                    <button
                      key={batch}
                      onClick={() => setActiveStudentBatchTab(batch)}
                      className={`${
                        activeStudentBatchTab === batch
                          ? "border-indigo-500 text-indigo-600"
                          : "border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700"
                      } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm transition duration-150`}
                    >
                      Batch {batch} ({studentsByBatch[batch].length})
                    </button>
                  ))}
                </nav>
              </div>

              {/* Student List for Active Tab */}
              <div className="mt-6 overflow-x-auto max-h-96"> {/* Added max-h for scroll */}
                {activeStudentBatchTab && (
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Name</th>
                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Email</th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {studentsByBatch[activeStudentBatchTab].map((student) => (
                        <tr key={student._id} className="hover:bg-gray-50">
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 flex items-center">
                            <IdentificationIcon className="w-4 h-4 mr-2 text-gray-500" />
                            {student.name}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 flex items-center">
                            <EnvelopeIcon className="w-4 h-4 mr-2 text-gray-500" />
                            {student.email}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            </div>
          )}
        </Modal>
      </div>
    </div>
  );
}

export default AdminDashboard;