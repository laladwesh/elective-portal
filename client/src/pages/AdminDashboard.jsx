import React, { useState, useEffect, useCallback } from "react";
import axios from "axios";
import { toast } from "react-hot-toast";
import { courseAPI, studentAPI } from '../services/apiService';

// Import your Modal component
import Modal from "../components/Modal";
import ClearSessionButton from "../components/ClearSessionButton"; // Assuming you have this component
import DownloadReportsButton from "../components/DownloadReportsButton";
import BulkUploadStudents from "../components/BulkUploadStudents";
import EnrollmentStatsModal from "../components/EnrollmentStatsModal";
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
  TagIcon,
  PencilSquareIcon, // For edit functionality
  TrashIcon, // For delete functionality
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
  console.info("Selected Course ID:", selectedCourseId);
  const [selectedCourseName, setSelectedCourseName] = useState("");
  const [courseEnrollments, setCourseEnrollments] = useState([]);
  const [isLoadingEnrollments, setIsLoadingEnrollments] = useState(false);

  // State for All Students Modal
  const [isStudentsModalOpen, setIsStudentsModalOpen] = useState(false);
  const [allStudents, setAllStudents] = useState([]);
  const [activeStudentBatchTab, setActiveStudentBatchTab] = useState(""); // Holds the active batch e.g., "2020"
  const [isLoadingStudents, setIsLoadingStudents] = useState(false);

  // NEW: State for Edit Course Modal
  const [isEditCourseModalOpen, setIsEditCourseModalOpen] = useState(false);
  const [editingCourse, setEditingCourse] = useState(null); // Stores the course object being edited
  const [editFormData, setEditFormData] = useState({
    // Stores form data for the edit modal
    courseName: "",
    batch: "",
    intakeCapacity: "",
    enrollmentOpenTime: "",
    isEnrollmentActive: false,
  });

  // NEW: State for Course Batch Tabs
  const [activeCourseBatchTab, setActiveCourseBatchTab] = useState("");

  // NEW: State for selected courses for deletion
  const [selectedCourseIds, setSelectedCourseIds] = useState([]);

  // NEW STATES FOR STUDENT DELETION
  const [selectedStudentIds, setSelectedStudentIds] = useState([]);
  const [isDeleteConfirmationModalOpen, setIsDeleteConfirmationModalOpen] =
    useState(false);
  const [studentToDelete, setStudentToDelete] = useState(null); // For single delete: stores student ID
  const [deleteMode, setDeleteMode] = useState(""); // 'single' or 'bulk'

  // Memoize config for API calls
  const config = useCallback(
    () => ({
      headers: {
        Authorization: `Bearer ${user?.token}`,
      },
    }),
    [user?.token]
  );

  // Helper function to format UTC Date objects to datetime-local string (IST)
  // This is crucial for displaying the correct time in the edit modal input field.
  // const formatUTCToISTDatetimeLocal = (utcDateString) => {
  //   if (!utcDateString) return "";

  //   const date = new Date(utcDateString);

  //   // Use Intl.DateTimeFormat to get components in 'Asia/Kolkata' timezone
  //   const options = {
  //     year: "numeric",
  //     month: "2-digit",
  //     day: "2-digit",
  //     hour: "2-digit",
  //     minute: "2-digit",
  //     hourCycle: "h23", // Ensure 24-hour format for input type="datetime-local"
  //     timeZone: "Asia/Kolkata",
  //   };

  //   const formatter = new Intl.DateTimeFormat("en-CA", options); // 'en-CA' is good for YYYY-MM-DD
  //   const parts = formatter.formatToParts(date);

  //   const year = parts.find((p) => p.type === "year").value;
  //   const month = parts.find((p) => p.type === "month").value;
  //   const day = parts.find((p) => p.type === "day").value;
  //   const hour = parts.find((p) => p.type === "hour").value;
  //   const minute = parts.find((p) => p.type === "minute").value;

  //   return `${year}-${month}-${day}T${hour}:${minute}`;
  // };

  // Fetch all courses (for admin's table)
  const fetchCourses = useCallback(async () => {
    try {
      const res = await courseAPI.getAll(config());
      setCourses(res.data);
      // Set the first batch as active tab for courses if not already set
      if (res.data.length > 0 && !activeCourseBatchTab) {
        const uniqueCourseBatches = [
          ...new Set(res.data.map((course) => course.batch)),
        ].sort();
        if (uniqueCourseBatches.length > 0) {
          setActiveCourseBatchTab(uniqueCourseBatches[0]);
        }
      }
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to fetch courses");
    }
  }, [config, activeCourseBatchTab]); // Added activeCourseBatchTab as dependency

  // Fetch all students (for student list modal)
  const fetchAllStudents = useCallback(async () => {
    setIsLoadingStudents(true);
    try {
      const res = await studentAPI.getAll(config());
      setAllStudents(res.data);
      // Set the first batch as active tab by default if not already set
      if (res.data.length > 0 && !activeStudentBatchTab) {
        const uniqueBatches = [
          ...new Set(res.data.map((student) => student.batch)),
        ].sort();
        if (uniqueBatches.length > 0) {
          setActiveStudentBatchTab(uniqueBatches[0]);
        }
      } else if (res.data.length === 0) {
        // If no students, clear active batch tab
        setActiveStudentBatchTab("");
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
        courses: newBatchCourseData.courses.filter((_, i) => i !== index),
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
      if (!timeToSend.match(/:[0-5]\d([+-]\d{2}:\d{2}|Z)$/)) {
        // Checks if already has seconds and timezone/Z
        timeToSend += ":00"; // Add seconds if missing (datetime-local usually doesn't have it)
      }
      if (!timeToSend.match(/[+-]\d{2}:\d{2}$/)) {
        // Checks if timezone offset is missing
        timeToSend += "+05:30"; // IST offset
      }
    }
    try {
      toast.loading("Creating courses...", { id: "createCourseToast" });
      await courseAPI.createBatchCourses(
        {
          batch,
          enrollmentOpenTime: timeToSend,
          isEnrollmentActive,
          courses: individualCourses,
        },
        config()
      );
      toast.success(`Courses for batch ${batch} created successfully!`, {
        id: "createCourseToast",
      });
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
      await studentAPI.create(newStudent, config());
      toast.success("Student added successfully!", { id: "addStudentToast" });
      setNewStudent({ name: "", email: "", batch: "" });
      fetchAllStudents(); // Refresh student list when a new student is added
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to add student", {
        id: "addStudentToast",
      });
    }
  };
  const handleNewStudentChange = (e) => {
    const { name, value } = e.target;
    setNewStudent((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  // --- Modal Specific Functions ---
  const handleSessionCleared = () => {
    fetchCourses(); // Refresh courses after all data is cleared
    setSelectedCourseIds([]); // Clear any lingering selections
    fetchAllStudents(); // Also refresh students if they are affected by clear session
  };
  // For Course Enrollments Modal
  const openEnrollmentModal = async (courseId, courseName) => {
    setSelectedCourseId(courseId);
    setSelectedCourseName(courseName);
    setCourseEnrollments([]); // Clear previous enrollments
    setIsEnrollmentModalOpen(true);
    setIsLoadingEnrollments(true);
    try {
      const res = await courseAPI.getEnrollments(courseId, config());
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
    setSelectedStudentIds([]); // Clear selected student IDs on modal close
  };

  // Functions for Edit Course Modal
  const openEditCourseModal = (course) => {
    setEditingCourse(course);
    let formattedTime = "";
    if (course.enrollmentOpenTime) {
      const dateObj = new Date(course.enrollmentOpenTime); // This is a UTC Date object
      if (dateObj.toString() !== "Invalid Date") {
        // Use Intl.DateTimeFormat to get parts in IST, then construct YYYY-MM-DDTHH:MM
        const options = {
          year: "numeric",
          month: "2-digit",
          day: "2-digit",
          hour: "2-digit",
          minute: "2-digit",
          hourCycle: "h23", // Use 24-hour format
          timeZone: "Asia/Kolkata",
        };
        const parts = new Intl.DateTimeFormat("en-CA", options).formatToParts(
          dateObj
        ); // en-CA gives YYYY-MM-DD order
        const year = parts.find((p) => p.type === "year").value;
        const month = parts.find((p) => p.type === "month").value;
        const day = parts.find((p) => p.type === "day").value;
        const hour = parts.find((p) => p.type === "hour").value;
        const minute = parts.find((p) => p.type === "minute").value;
        formattedTime = `${year}-${month}-${day}T${hour}:${minute}`;
      }
    }

    setEditFormData({
      courseName: course.courseName,
      batch: course.batch,
      intakeCapacity: course.intakeCapacity,
      enrollmentOpenTime: formattedTime,
      isEnrollmentActive: course.isEnrollmentActive,
    });
    setIsEditCourseModalOpen(true);
  };

  const closeEditCourseModal = () => {
    setIsEditCourseModalOpen(false);
    setEditingCourse(null);
    setEditFormData({
      courseName: "",
      batch: "",
      intakeCapacity: "",
      enrollmentOpenTime: "",
      isEnrollmentActive: false,
    });
  };

  const handleEditFormChange = (e) => {
    const { name, value, type, checked } = e.target;
    setEditFormData((prev) => ({
      ...prev,
      [name]: type === "checkbox" ? checked : value,
    }));
  };

  const handleUpdateCourse = async (e) => {
    e.preventDefault();
    if (!editingCourse) return;

    let timeToSend = editFormData.enrollmentOpenTime;
    if (timeToSend) {
      if (!timeToSend.match(/:[0-5]\d([+-]\d{2}:\d{2}|Z)$/)) {
        timeToSend += ":00";
      }
      if (!timeToSend.match(/[+-]\d{2}:\d{2}$/)) {
        timeToSend += "+05:30"; // IST offset
      }
    } else {
      timeToSend = null; // Send null if time is cleared
    }

    try {
      toast.loading("Updating course...", { id: "updateCourseToast" });
      await courseAPI.update(
        editingCourse._id,
        {
          ...editFormData,
          enrollmentOpenTime: timeToSend,
        },
        config()
      );
      toast.success("Course updated successfully!", {
        id: "updateCourseToast",
      });
      closeEditCourseModal();
      fetchCourses(); // Refresh the courses list
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to update course", {
        id: "updateCourseToast",
      });
      console.error("Error updating course:", error.response?.data || error);
    }
  };

  // Handle checkbox selection for courses
  const handleCourseCheckboxChange = (courseId) => {
    setSelectedCourseIds((prevSelected) =>
      prevSelected.includes(courseId)
        ? prevSelected.filter((id) => id !== courseId)
        : [...prevSelected, courseId]
    );
  };

  // Handle "Select All" checkbox for courses in the current active batch
  const handleSelectAllCourses = (e) => {
    const isChecked = e.target.checked;
    if (isChecked) {
      const allIdsInCurrentBatch = coursesByBatch[activeCourseBatchTab].map(
        (course) => course._id
      );
      setSelectedCourseIds(allIdsInCurrentBatch);
    } else {
      setSelectedCourseIds([]);
    }
  };

  // Handle bulk deletion of selected courses
  const handleDeleteSelectedCourses = async () => {
    if (selectedCourseIds.length === 0) {
      toast.error("Please select at least one course to delete.");
      return;
    }

    if (
      window.confirm(
        `Are you sure you want to delete ${selectedCourseIds.length} selected course(s) and all their associated enrollments?`
      )
    ) {
      try {
        toast.loading("Deleting courses...", { id: "deleteCoursesToast" });
        // Send selectedCourseIds in the request body for DELETE
        await courseAPI.bulkDelete({
          data: { ids: selectedCourseIds }, // DELETE with body requires 'data' key
          ...config(), // Spread the config after data to ensure headers are applied
        });
        toast.success("Selected courses deleted successfully!", {
          id: "deleteCoursesToast",
        });
        setSelectedCourseIds([]); // Clear selection
        fetchCourses(); // Refresh course list
      } catch (error) {
        toast.error(
          error.response?.data?.message || "Failed to delete selected courses.",
          { id: "deleteCoursesToast" }
        );
        console.error("Error deleting courses:", error.response?.data || error);
      }
    }
  };

  // NEW: Student Deletion Handlers
  const handleStudentCheckboxChange = (studentId) => {
    setSelectedStudentIds((prevSelected) =>
      prevSelected.includes(studentId)
        ? prevSelected.filter((id) => id !== studentId)
        : [...prevSelected, studentId]
    );
  };

  const handleSelectAllStudents = (e) => {
    const isChecked = e.target.checked;
    if (activeStudentBatchTab && studentsByBatch[activeStudentBatchTab]) {
      if (isChecked) {
        const allIdsInBatch = studentsByBatch[activeStudentBatchTab].map(
          (student) => student._id
        );
        setSelectedStudentIds((prevSelected) => [
          ...new Set([...prevSelected, ...allIdsInBatch]), // Use Set to avoid duplicates
        ]);
      } else {
        const allIdsInBatch = studentsByBatch[activeStudentBatchTab].map(
          (student) => student._id
        );
        setSelectedStudentIds((prevSelected) =>
          prevSelected.filter((id) => !allIdsInBatch.includes(id))
        );
      }
    }
  };

  const handleDeleteStudentConfirmation = (
    studentId = null,
    mode = "single"
  ) => {
    setStudentToDelete(studentId); // Null for bulk
    setDeleteMode(mode);
    setIsDeleteConfirmationModalOpen(true);
  };

  const handleConfirmDeleteStudent = async () => {
    setIsDeleteConfirmationModalOpen(false); // Close modal immediately

    try {
      if (deleteMode === "single" && studentToDelete) {
        await studentAPI.delete(studentToDelete, config());
        toast.success("Student deleted successfully!");
      } else if (deleteMode === "bulk" && selectedStudentIds.length > 0) {
        await studentAPI.bulkDelete({
          ...config(),
          data: { ids: selectedStudentIds },
        });
        toast.success(
          `${selectedStudentIds.length} students deleted successfully!`
        );
        setSelectedStudentIds([]); // Clear selection after bulk delete
      }
      fetchAllStudents(); // Refresh the list of students
    } catch (error) {
      toast.error(
        error.response?.data?.message || `Failed to delete student(s)`
      );
    } finally {
      // Reset temporary states
      setStudentToDelete(null);
      setDeleteMode("");
    }
  };

  const handleCancelDeleteStudent = () => {
    setIsDeleteConfirmationModalOpen(false);
    setStudentToDelete(null);
    setDeleteMode("");
  };

  const getDeleteStudentConfirmationMessage = () => {
    if (deleteMode === "single" && studentToDelete) {
      const student = studentsByBatch[activeStudentBatchTab]?.find(
        (s) => s._id === studentToDelete
      );
      return `Are you sure you want to delete student "${
        student?.name || "Unknown"
      }"? All associated enrollments will also be deleted.`;
    } else if (deleteMode === "bulk" && selectedStudentIds.length > 0) {
      return `Are you sure you want to delete ${selectedStudentIds.length} selected students? All associated enrollments will also be deleted.`;
    }
    return "Are you sure you want to delete?";
  };

  // Group students by batch for the tabs
  const studentsByBatch = allStudents.reduce((acc, student) => {
    (acc[student.batch] = acc[student.batch] || []).push(student);
    return acc;
  }, {});

  const sortedBatches = Object.keys(studentsByBatch).sort();

  // Group courses by batch for the new course tabs
  const coursesByBatch = courses.reduce((acc, course) => {
    (acc[course.batch] = acc[course.batch] || []).push(course);
    return acc;
  }, {});

  const sortedCourseBatches = Object.keys(coursesByBatch).sort();

  // Check if all courses in the current active batch are selected
  const areAllCoursesInCurrentBatchSelected =
    activeCourseBatchTab &&
    coursesByBatch[activeCourseBatchTab] &&
    coursesByBatch[activeCourseBatchTab].length > 0 &&
    coursesByBatch[activeCourseBatchTab].every((course) =>
      selectedCourseIds.includes(course._id)
    );

  // Check if all students in the current active batch are selected
  const areAllStudentsInCurrentBatchSelected =
    activeStudentBatchTab &&
    studentsByBatch[activeStudentBatchTab] &&
    studentsByBatch[activeStudentBatchTab].length > 0 &&
    studentsByBatch[activeStudentBatchTab].every((student) =>
      selectedStudentIds.includes(student._id)
    );

  return (
    <div className="min-h-screen bg-[#F0F0F0] p-0 font-mono">
      <div className="max-w-7xl mx-auto p-8">
        <div className="flex justify-between items-center mb-8 bg-white p-6 border-8 border-black rounded-none shadow-[8px_8px_0px_0px_rgba(0,0,0,1)]">
          <h1 className="text-4xl font-black text-black uppercase tracking-tighter flex items-center">
            <AcademicCapIcon className="w-10 h-10 mr-4 text-black" />
            ADMIN DASHBOARD
          </h1>
          <div className="flex items-center space-x-6">
            <p className="text-sm font-bold text-black uppercase tracking-tight">
              WELCOME,{" "}
              <span className="font-black">
                {user?.name}
              </span>{" "}
              ({user?.role})
            </p>
            <button
              onClick={onLogout}
              className="flex items-center px-6 py-3 bg-black text-white font-black uppercase tracking-tighter border-4 border-black rounded-none shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:bg-[#FFFF00] hover:text-black active:shadow-none active:translate-x-1 active:translate-y-1 transition-all duration-100"
            >
              <ArrowRightOnRectangleIcon className="w-5 h-5 mr-2" />
              LOGOUT
            </button>
          </div>
        </div>

        <div className="bg-black p-0 gap-0 grid grid-cols-1 lg:grid-cols-3 mb-8">
          {/* Create Batch Courses Form */}
          <div className="lg:col-span-2 bg-white p-8 border-8 border-black rounded-none shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] cursor-crosshair hover:shadow-[12px_12px_0px_0px_rgba(0,0,0,1)] transition-all">
            <h2 className="text-3xl font-black text-black uppercase tracking-tighter mb-6 flex items-center border-b-4 border-black pb-4">
              <BuildingOffice2Icon className="w-8 h-8 mr-4 text-black" />
              CREATE BATCH COURSES
            </h2>
            <form onSubmit={handleCreateBatchCourses} className="space-y-6">
              <div className="bg-black p-0 gap-0 grid grid-cols-1 md:grid-cols-2">
                <div className="bg-white p-4 border-4 border-black">
                  <label
                    htmlFor="batch"
                    className="block text-xs font-black text-black uppercase tracking-tighter mb-2"
                  >
                    BATCH YEAR
                  </label>
                  <input
                    type="text"
                    name="batch"
                    id="batch"
                    placeholder="2020"
                    className="w-full p-3 border-4 border-black rounded-none bg-white text-black font-bold focus:outline-none focus:border-[#3B82F6] transition-all"
                    value={newBatchCourseData.batch}
                    onChange={handleBatchCourseChange}
                    required
                  />
                </div>
                <div className="bg-white p-4 border-4 border-black">
                  <label
                    htmlFor="enrollmentTime"
                    className="block text-xs font-black text-black uppercase tracking-tighter mb-2"
                  >
                    ENROLLMENT OPEN TIME (IST)
                  </label>
                  <input
                    type="datetime-local"
                    name="enrollmentTime"
                    id="enrollmentTime"
                    className="w-full p-3 border-4 border-black rounded-none bg-white text-black font-bold focus:outline-none focus:border-[#3B82F6] transition-all"
                    value={newBatchCourseData.enrollmentTime}
                    onChange={handleBatchCourseChange}
                    required
                  />
                </div>
              </div>
              <div className="flex items-center gap-4 bg-white p-4 border-4 border-black">
                <input
                  type="checkbox"
                  id="isEnrollmentActive"
                  name="isEnrollmentActive"
                  checked={newBatchCourseData.isEnrollmentActive}
                  onChange={handleBatchCourseChange}
                  className="h-6 w-6 border-4 border-black rounded-none accent-black"
                />
                <label
                  htmlFor="isEnrollmentActive"
                  className="text-black text-sm font-black uppercase tracking-tight"
                >
                  ACTIVATE ENROLLMENT FOR THIS BATCH
                </label>
              </div>

              <h3 className="text-2xl font-black text-black uppercase tracking-tighter pt-4 pb-2 border-t-4 border-black">
                INDIVIDUAL COURSES:
              </h3>
              {newBatchCourseData.courses.map((course, index) => (
                <div
                  key={index}
                  className="bg-black p-0 gap-0 grid grid-cols-1 md:grid-cols-5 items-end"
                >
                  <div className="md:col-span-2 bg-white p-4 border-4 border-black">
                    <label
                      htmlFor={`courseName-${index}`}
                      className="block text-xs font-black text-black uppercase tracking-tighter mb-2"
                    >
                      COURSE NAME
                    </label>
                    <input
                      type="text"
                      name="courseName"
                      id={`courseName-${index}`}
                      placeholder="DATA STRUCTURES"
                      className="w-full p-3 border-4 border-black rounded-none bg-white text-black font-bold uppercase focus:outline-none focus:border-[#3B82F6]"
                      value={course.courseName}
                      onChange={(e) => handleIndividualCourseChange(index, e)}
                      required
                    />
                  </div>
                  <div className="md:col-span-2 bg-white p-4 border-4 border-black">
                    <label
                      htmlFor={`intakeCapacity-${index}`}
                      className="block text-xs font-black text-black uppercase tracking-tighter mb-2"
                    >
                      INTAKE CAPACITY
                    </label>
                    <input
                      type="number"
                      name="intakeCapacity"
                      id={`intakeCapacity-${index}`}
                      placeholder="60"
                      className="w-full p-3 border-4 border-black rounded-none bg-white text-black font-bold focus:outline-none focus:border-[#3B82F6]"
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
                      className="flex items-center justify-center px-4 py-3 bg-black text-white font-black uppercase tracking-tighter border-4 border-black rounded-none shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:bg-[#FFFF00] hover:text-black active:shadow-none active:translate-x-1 active:translate-y-1 transition-all duration-100 text-xs mt-auto"
                    >
                      <MinusCircleIcon className="w-5 h-5 mr-2" />
                      REMOVE
                    </button>
                  )}
                </div>
              ))}
              <button
                type="button"
                onClick={handleAddIndividualCourseField}
                className="flex items-center px-6 py-4 bg-black text-white font-black uppercase tracking-tighter border-4 border-black rounded-none shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:bg-[#3B82F6] hover:text-white active:shadow-none active:translate-x-1 active:translate-y-1 transition-all duration-100"
              >
                <PlusCircleIcon className="w-6 h-6 mr-2" />
                ADD ANOTHER COURSE
              </button>

              <button
                type="submit"
                className="w-full flex items-center justify-center px-8 py-5 bg-black text-white font-black uppercase tracking-tighter border-4 border-black rounded-none shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] hover:bg-[#FFFF00] hover:text-black active:shadow-none active:translate-x-2 active:translate-y-2 transition-all duration-100 mt-6 text-lg"
              >
                <AcademicCapIcon className="w-8 h-8 mr-3" />
                CREATE BATCH COURSES
              </button>
            </form>
          </div>

          {/* Add Student Form */}
          <div className="bg-white p-8 border-8 border-black rounded-none shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] cursor-crosshair hover:shadow-[12px_12px_0px_0px_rgba(0,0,0,1)] transition-all">
            <h2 className="text-3xl font-black text-black uppercase tracking-tighter mb-6 flex items-center border-b-4 border-black pb-4">
              <UserPlusIcon className="w-8 h-8 mr-4 text-black" />
              ADD NEW STUDENT
            </h2>
            <form onSubmit={handleAddStudent} className="space-y-5">
              <div>
                <label
                  htmlFor="studentName"
                  className="block text-xs font-black text-black uppercase tracking-tighter mb-2"
                >
                  STUDENT NAME
                </label>
                <input
                  type="text"
                  id="studentName"
                  name="name"
                  placeholder="JOHN DOE"
                  className="w-full p-3 border-4 border-black rounded-none bg-white text-black font-bold uppercase focus:outline-none focus:border-[#3B82F6]"
                  value={newStudent.name}
                  onChange={handleNewStudentChange}
                  required
                />
              </div>
              <div>
                <label
                  htmlFor="studentEmail"
                  className="block text-xs font-black text-black uppercase tracking-tighter mb-2"
                >
                  STUDENT EMAIL
                </label>
                <input
                  type="email"
                  id="studentEmail"
                  name="email"
                  placeholder="JOHN.DOE@EXAMPLE.COM"
                  className="w-full p-3 border-4 border-black rounded-none bg-white text-black font-bold focus:outline-none focus:border-[#3B82F6]"
                  value={newStudent.email}
                  onChange={handleNewStudentChange}
                  required
                />
              </div>
              <div>
                <label
                  htmlFor="studentBatch"
                  className="block text-xs font-black text-black uppercase tracking-tighter mb-2"
                >
                  BATCH YEAR
                </label>
                <input
                  type="text"
                  id="studentBatch"
                  name="batch"
                  placeholder="2020"
                  className="w-full p-3 border-4 border-black rounded-none bg-white text-black font-bold uppercase focus:outline-none focus:border-[#3B82F6]"
                  value={newStudent.batch}
                  onChange={handleNewStudentChange}
                  required
                />
              </div>
              <button
                type="submit"
                className="w-full flex items-center justify-center px-6 py-4 bg-black text-white font-black uppercase tracking-tighter border-4 border-black rounded-none shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:bg-[#FFFF00] hover:text-black active:shadow-none active:translate-x-1 active:translate-y-1 transition-all duration-100"
              >
                <UserPlusIcon className="w-6 h-6 mr-3" />
                ADD STUDENT
              </button>
            </form>
            <BulkUploadStudents
              user={user}
              config={config}
              onUploadSuccess={fetchAllStudents}
            />
          </div>
        </div>

        {/* View All Students Button */}
        <div className="bg-black p-0 gap-0 flex flex-col sm:flex-row justify-center mb-8">
          <button
            onClick={openStudentsModal}
            className="flex items-center px-8 py-4 bg-black text-white font-black uppercase tracking-tighter border-4 border-black rounded-none shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:bg-[#3B82F6] hover:text-white active:shadow-none active:translate-x-1 active:translate-y-1 transition-all duration-100"
          >
            <UserGroupIcon className="w-6 h-6 mr-3" />
            VIEW ALL STUDENTS
          </button>
          <EnrollmentStatsModal user={user} />
          {/* Render the new ClearSessionButton component */}
          <ClearSessionButton
            user={user}
            onSessionCleared={handleSessionCleared}
          />
          <DownloadReportsButton user={user} config={config} />{" "}
        </div>

        {/* Courses List (for Admin to see all courses) - Now with Batch Tabs */}
        <div className="bg-white p-8 border-8 border-black rounded-none shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] mb-8 cursor-crosshair">
          <h2 className="text-3xl font-black text-black uppercase tracking-tighter mb-6 flex items-center border-b-4 border-black pb-4">
            <ClipboardDocumentListIcon className="w-8 h-8 mr-4 text-black" />
            AVAILABLE COURSES
          </h2>
          {courses.length === 0 ? (
            <p className="text-black font-bold text-center py-8 uppercase tracking-tight">
              NO COURSES AVAILABLE. START BY CREATING COURSES FOR A BATCH!
            </p>
          ) : (
            <div>
              {/* Batch Tabs for Courses */}
              <div className="border-b-4 border-black mb-6">
                <nav className="-mb-1 bg-black p-0 gap-0 flex" aria-label="Tabs">
                  {sortedCourseBatches.map((batch) => (
                    <button
                      key={batch}
                      onClick={() => setActiveCourseBatchTab(batch)}
                      className={`${
                        activeCourseBatchTab === batch
                          ? "bg-white text-black border-4 border-black border-b-0"
                          : "bg-[#F0F0F0] text-black border-4 border-black border-b-0 hover:bg-[#FFFF00]"
                      } whitespace-nowrap py-4 px-6 font-black text-sm uppercase tracking-tighter transition-all`}
                    >
                      BATCH {batch} ({coursesByBatch[batch].length})
                    </button>
                  ))}
                </nav>
              </div>

              {/* Course List for Active Batch */}
              {activeCourseBatchTab && (
                <div className="overflow-x-auto">
                  <table className="min-w-full border-4 border-black">
                    <thead className="bg-black">
                      <tr>
                        {/* NEW: Checkbox for bulk delete */}
                        <th
                          scope="col"
                          className="px-6 py-4 text-left text-xs font-black text-white uppercase tracking-tighter border-4 border-black"
                        >
                          <input
                            type="checkbox"
                            className="h-5 w-5 border-4 border-white rounded-none accent-[#FFFF00]"
                            onChange={handleSelectAllCourses}
                            checked={areAllCoursesInCurrentBatchSelected}
                          />
                        </th>
                        <th
                          scope="col"
                          className="px-6 py-4 text-left text-xs font-black text-white uppercase tracking-tighter border-4 border-black"
                        >
                          COURSE NAME
                        </th>
                        <th
                          scope="col"
                          className="px-6 py-4 text-left text-xs font-black text-white uppercase tracking-tighter border-4 border-black"
                        >
                          BATCH
                        </th>
                        <th
                          scope="col"
                          className="px-6 py-4 text-left text-xs font-black text-white uppercase tracking-tighter border-4 border-black"
                        >
                          INTAKE
                        </th>
                        <th
                          scope="col"
                          className="px-6 py-4 text-left text-xs font-black text-white uppercase tracking-tighter border-4 border-black"
                        >
                          ENROLLED
                        </th>
                        <th
                          scope="col"
                          className="px-6 py-4 text-left text-xs font-black text-white uppercase tracking-tighter border-4 border-black"
                        >
                          OPEN TIME (IST)
                        </th>
                        <th
                          scope="col"
                          className="px-6 py-4 text-left text-xs font-black text-white uppercase tracking-tighter border-4 border-black"
                        >
                          ACTIVE
                        </th>
                        <th
                          scope="col"
                          className="px-6 py-4 text-left text-xs font-black text-white uppercase tracking-tighter border-4 border-black"
                        >
                          ACTIONS
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white">
                      {coursesByBatch[activeCourseBatchTab].map((course) => {
                        const isFull =
                          course.enrolledStudentsCount >= course.intakeCapacity;
                        let statusIcon = course.isEnrollmentActive ? (
                          <CheckCircleIcon className="w-6 h-6 text-black inline-block align-middle mr-2" />
                        ) : (
                          <XCircleIcon className="w-6 h-6 text-black inline-block align-middle mr-2" />
                        );
                        let statusText = course.isEnrollmentActive
                          ? "YES"
                          : "NO";
                        let statusClass = "text-black font-black";

                        if (isFull && course.isEnrollmentActive) {
                          statusIcon = (
                            <XCircleIcon className="w-6 h-6 text-black inline-block align-middle mr-2" />
                          );
                          statusText = "FULL (INACTIVE)";
                        } else if (isFull) {
                          statusIcon = (
                            <XCircleIcon className="w-6 h-6 text-black inline-block align-middle mr-2" />
                          );
                          statusText = "FULL";
                        }

                        return (
                          <tr key={course._id} className="hover:bg-[#FFFF00] transition-colors border-4 border-black">
                            {/* NEW: Checkbox for individual course */}
                            <td className="px-6 py-4 whitespace-nowrap text-sm font-black text-black border-4 border-black">
                              <input
                                type="checkbox"
                                className="h-5 w-5 border-4 border-black rounded-none accent-black"
                                checked={selectedCourseIds.includes(course._id)}
                                onChange={() =>
                                  handleCourseCheckboxChange(course._id)
                                }
                              />
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm font-black text-black uppercase tracking-tight border-4 border-black">
                              {course.courseName}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm font-bold text-black border-4 border-black">
                              {course.batch}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm font-bold text-black border-4 border-black">
                              {course.intakeCapacity}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm font-bold text-black border-4 border-black">
                              {course.enrolledStudentsCount}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-xs font-bold text-black border-4 border-black">
                              {course.enrollmentOpenTime
                                ? new Date(
                                    course.enrollmentOpenTime
                                  ).toLocaleString("en-IN", {
                                    timeZone: "Asia/Kolkata",
                                    dateStyle: "short",
                                    timeStyle: "short",
                                  })
                                : "NOT SET"}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm border-4 border-black">
                              {statusIcon}
                              <span className={`${statusClass} uppercase tracking-tight`}>
                                {statusText}
                              </span>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-black bg-black p-0 gap-0 flex space-x-0 border-4 border-black">
                              <button
                                onClick={() =>
                                  openEnrollmentModal(
                                    course._id,
                                    course.courseName
                                  )
                                }
                                className="flex-1 items-center justify-center px-3 py-3 text-white bg-black border-4 border-black hover:bg-[#3B82F6] font-black text-xs uppercase tracking-tighter transition-all"
                              >
                                <EyeIcon className="w-4 h-4 mr-1 inline" />
                                VIEW
                              </button>
                              {/* NEW: Edit Course Button */}
                              <button
                                onClick={() => openEditCourseModal(course)}
                                className="flex-1 items-center justify-center px-3 py-3 text-white bg-black border-4 border-black hover:bg-[#FFFF00] hover:text-black font-black text-xs uppercase tracking-tighter transition-all"
                              >
                                <PencilSquareIcon className="w-4 h-4 mr-1 inline" />
                                EDIT
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                  {/* NEW: Delete Selected Courses Button */}
                  {selectedCourseIds.length > 0 && (
                    <div className="mt-6 flex justify-end">
                      <button
                        onClick={handleDeleteSelectedCourses}
                        className="flex items-center px-6 py-4 bg-black text-white font-black uppercase tracking-tighter border-4 border-black rounded-none shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:bg-[#FFFF00] hover:text-black active:shadow-none active:translate-x-1 active:translate-y-1 transition-all duration-100"
                      >
                        <TrashIcon className="w-6 h-6 mr-2" />
                        DELETE SELECTED ({selectedCourseIds.length})
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Course Enrollments Modal (Existing) */}
        <Modal
          isOpen={isEnrollmentModalOpen}
          onClose={closeEnrollmentModal}
          title={`ENROLLMENTS FOR ${selectedCourseName}`}
        >
          {isLoadingEnrollments ? (
            <div className="text-center py-12 text-black font-black uppercase tracking-tight text-xl">
              LOADING ENROLLMENTS...
            </div>
          ) : courseEnrollments.length === 0 ? (
            <p className="text-black font-bold text-center py-8 uppercase tracking-tight">
              NO STUDENTS ENROLLED IN THIS COURSE YET.
            </p>
          ) : (
            <div className="overflow-x-auto max-h-96">
              <table className="min-w-full border-4 border-black">
                <thead className="bg-black">
                  <tr>
                    <th
                      scope="col"
                      className="px-6 py-4 text-left text-xs font-black text-white uppercase tracking-tighter border-4 border-black"
                    >
                      STUDENT NAME
                    </th>
                    <th
                      scope="col"
                      className="px-6 py-4 text-left text-xs font-black text-white uppercase tracking-tighter border-4 border-black"
                    >
                      STUDENT EMAIL
                    </th>
                    <th
                      scope="col"
                      className="px-6 py-4 text-left text-xs font-black text-white uppercase tracking-tighter border-4 border-black"
                    >
                      BATCH
                    </th>
                    <th
                      scope="col"
                      className="px-6 py-4 text-left text-xs font-black text-white uppercase tracking-tighter border-4 border-black"
                    >
                      ENROLLMENT DATE (IST)
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white">
                  {courseEnrollments.map((enrollment) => (
                    <tr key={enrollment._id} className="hover:bg-[#FFFF00] transition-colors border-4 border-black">
                      {/* Student Name */}
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-black text-black uppercase border-4 border-black">
                        <div className="flex items-center">
                          <IdentificationIcon className="w-5 h-5 mr-2 text-black" />
                          <span>{enrollment.student.name}</span>
                        </div>
                      </td>

                      {/* Student Email */}
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-bold text-black border-4 border-black">
                        <div className="flex items-center">
                          <EnvelopeIcon className="w-5 h-5 mr-2 text-black" />
                          <span>{enrollment.student.email}</span>
                        </div>
                      </td>

                      {/* Batch */}
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-bold text-black border-4 border-black">
                        <div className="flex items-center">
                          <TagIcon className="w-5 h-5 mr-1 text-black" />
                          <span>{enrollment.student.batch}</span>
                        </div>
                      </td>

                      {/* Enrollment Date (IST) */}
                      <td className="px-6 py-4 whitespace-nowrap text-xs font-bold text-black border-4 border-black">
                        <div className="flex items-center">
                          <CalendarIcon className="w-5 h-5 mr-2 text-black" />
                          <span>
                            {new Date(enrollment.enrollmentDate).toLocaleString(
                              "en-IN",
                              {
                                timeZone: "Asia/Kolkata",
                                dateStyle: "short",
                                timeStyle: "short",
                              }
                            )}
                          </span>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Modal>

        {/* All Students Modal (Existing) */}
        <Modal
          isOpen={isStudentsModalOpen}
          onClose={closeStudentsModal}
          title="ALL STUDENTS BY BATCH"
        >
          {isLoadingStudents ? (
            <div className="text-center py-12 text-black font-black uppercase tracking-tight text-xl">
              LOADING STUDENTS...
            </div>
          ) : sortedBatches.length === 0 ? (
            <p className="text-black font-bold text-center py-8 uppercase tracking-tight">NO STUDENTS FOUND.</p>
          ) : (
            <div>
              {/* Batch Tabs */}
              <div className="border-b-4 border-black">
                <nav className="-mb-1 bg-black p-0 gap-0 flex" aria-label="Tabs">
                  {sortedBatches.map((batch) => (
                    <button
                      key={batch}
                      onClick={() => {
                        setActiveStudentBatchTab(batch);
                        setSelectedStudentIds([]);
                      }}
                      className={`${
                        activeStudentBatchTab === batch
                          ? "bg-white text-black border-4 border-black border-b-0"
                          : "bg-[#F0F0F0] text-black border-4 border-black border-b-0 hover:bg-[#FFFF00]"
                      } whitespace-nowrap py-4 px-6 font-black text-sm uppercase tracking-tighter transition-all`}
                    >
                      BATCH {batch} ({studentsByBatch[batch].length})
                    </button>
                  ))}
                </nav>
              </div>

              {/* Student List for Active Tab */}
              {activeStudentBatchTab && (
                <div className="mt-6 overflow-x-auto max-h-96">
                  <div className="flex justify-end p-4 bg-black">
                    <button
                      onClick={() =>
                        handleDeleteStudentConfirmation(null, "bulk")
                      }
                      disabled={selectedStudentIds.length === 0}
                      className={`inline-flex items-center px-6 py-3 border-4 border-black text-sm font-black uppercase tracking-tighter rounded-none shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] text-white ${
                        selectedStudentIds.length > 0
                          ? "bg-black hover:bg-[#FFFF00] hover:text-black cursor-pointer active:shadow-none active:translate-x-1 active:translate-y-1"
                          : "bg-[#888888] cursor-not-allowed"
                      } transition-all duration-100`}
                    >
                      <TrashIcon className="w-5 h-5 mr-2" />
                      DELETE SELECTED ({selectedStudentIds.length})
                    </button>
                  </div>
                  <table className="min-w-full border-4 border-black">
                    <thead className="bg-black">
                      <tr>
                        <th
                          scope="col"
                          className="px-6 py-4 text-left text-xs font-black text-white uppercase tracking-tighter border-4 border-black"
                        >
                          <input
                            type="checkbox"
                            className="h-5 w-5 border-4 border-white rounded-none accent-[#FFFF00]"
                            checked={areAllStudentsInCurrentBatchSelected}
                            onChange={handleSelectAllStudents}
                          />
                        </th>
                        <th
                          scope="col"
                          className="px-6 py-4 text-left text-xs font-black text-white uppercase tracking-tighter border-4 border-black"
                        >
                          NAME
                        </th>
                        <th
                          scope="col"
                          className="px-6 py-4 text-left text-xs font-black text-white uppercase tracking-tighter border-4 border-black"
                        >
                          EMAIL
                        </th>
                        <th
                          scope="col"
                          className="px-6 py-4 text-right text-xs font-black text-white uppercase tracking-tighter border-4 border-black"
                        >
                          ACTIONS
                        </th>
                      </tr>
                    </thead>

                    <tbody className="bg-white">
                      {studentsByBatch[activeStudentBatchTab]?.map(
                        (student) => (
                          <tr key={student._id} className="hover:bg-[#FFFF00] transition-colors border-4 border-black">
                            {/* NEW: Checkbox for individual student */}
                            <td className="px-6 py-4 whitespace-nowrap border-4 border-black">
                              <input
                                type="checkbox"
                                className="h-5 w-5 border-4 border-black rounded-none accent-black"
                                checked={selectedStudentIds.includes(
                                  student._id
                                )}
                                onChange={() =>
                                  handleStudentCheckboxChange(student._id)
                                }
                              />
                            </td>
                            {/* Name cell stays a table-cell */}
                            <td className="px-6 py-4 whitespace-nowrap text-sm font-black text-black uppercase border-4 border-black">
                              <div className="flex items-center">
                                <IdentificationIcon className="w-5 h-5 mr-2 text-black" />
                                <span>{student.name}</span>
                              </div>
                            </td>

                            {/* Email cell stays a table-cell */}
                            <td className="px-6 py-4 whitespace-nowrap text-sm font-bold text-black border-4 border-black">
                              <div className="flex items-center">
                                <EnvelopeIcon className="w-5 h-5 mr-2 text-black" />
                                <span>{student.email}</span>
                              </div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-black text-right border-4 border-black">
                              <button
                                onClick={() =>
                                  handleDeleteStudentConfirmation(
                                    student._id,
                                    "single"
                                  )
                                }
                                className="text-black hover:text-white hover:bg-black p-2 border-4 border-black transition-all"
                                title="Delete Student"
                              >
                                <TrashIcon className="w-6 h-6" />
                              </button>
                            </td>
                          </tr>
                        )
                      )}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}
        </Modal>

        {/* NEW: Edit Course Modal */}
        <Modal
          isOpen={isEditCourseModalOpen}
          onClose={closeEditCourseModal}
          title={`EDIT COURSE: ${editingCourse?.courseName}`}
        >
          {editingCourse && (
            <form onSubmit={handleUpdateCourse} className="space-y-6 p-6">
              <div>
                <label
                  htmlFor="editCourseName"
                  className="block text-xs font-black text-black uppercase tracking-tighter mb-2"
                >
                  COURSE NAME
                </label>
                <input
                  type="text"
                  name="courseName"
                  id="editCourseName"
                  className="w-full p-3 border-4 border-black rounded-none bg-white text-black font-bold uppercase focus:outline-none focus:border-[#3B82F6]"
                  value={editFormData.courseName}
                  onChange={handleEditFormChange}
                  required
                />
              </div>
              <div>
                <label
                  htmlFor="editBatch"
                  className="block text-xs font-black text-black uppercase tracking-tighter mb-2"
                >
                  BATCH
                </label>
                <input
                  type="text"
                  name="batch"
                  id="editBatch"
                  className="w-full p-3 border-4 border-black rounded-none bg-white text-black font-bold uppercase focus:outline-none focus:border-[#3B82F6]"
                  value={editFormData.batch}
                  onChange={handleEditFormChange}
                  required
                />
              </div>
              <div>
                <label
                  htmlFor="editIntakeCapacity"
                  className="block text-xs font-black text-black uppercase tracking-tighter mb-2"
                >
                  INTAKE CAPACITY
                </label>
                <input
                  type="number"
                  name="intakeCapacity"
                  id="editIntakeCapacity"
                  className="w-full p-3 border-4 border-black rounded-none bg-white text-black font-bold focus:outline-none focus:border-[#3B82F6]"
                  value={editFormData.intakeCapacity}
                  onChange={handleEditFormChange}
                  min="1"
                  required
                />
              </div>
              <div>
                <label
                  htmlFor="editEnrollmentOpenTime"
                  className="block text-xs font-black text-black uppercase tracking-tighter mb-2"
                >
                  ENROLLMENT OPEN TIME (IST)
                </label>
                <input
                  type="datetime-local"
                  name="enrollmentOpenTime"
                  id="editEnrollmentOpenTime"
                  className="w-full p-3 border-4 border-black rounded-none bg-white text-black font-bold focus:outline-none focus:border-[#3B82F6]"
                  value={editFormData.enrollmentOpenTime}
                  onChange={handleEditFormChange}
                />
                <p className="mt-2 text-xs text-black font-bold uppercase tracking-tight">
                  LEAVE BLANK TO CLEAR TIME.
                </p>
              </div>
              <div className="flex items-center gap-4 bg-white p-4 border-4 border-black">
                <input
                  type="checkbox"
                  id="editIsEnrollmentActive"
                  name="isEnrollmentActive"
                  checked={editFormData.isEnrollmentActive}
                  onChange={handleEditFormChange}
                  className="h-6 w-6 border-4 border-black rounded-none accent-black"
                />
                <label
                  htmlFor="editIsEnrollmentActive"
                  className="text-black text-sm font-black uppercase tracking-tight"
                >
                  ENROLLMENT ACTIVE
                </label>
              </div>
              <button
                type="submit"
                className="w-full flex items-center justify-center px-8 py-5 bg-black text-white font-black uppercase tracking-tighter border-4 border-black rounded-none shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] hover:bg-[#FFFF00] hover:text-black active:shadow-none active:translate-x-2 active:translate-y-2 transition-all duration-100 mt-6 text-lg"
              >
                <PencilSquareIcon className="w-6 h-6 mr-2" />
                SAVE CHANGES
              </button>
            </form>
          )}
        </Modal>

        {/* Delete Confirmation Modal (Place this after all other modals) */}
        <Modal
          isOpen={isDeleteConfirmationModalOpen}
          onClose={handleCancelDeleteStudent}
          title="CONFIRM DELETION"
        >
          <p className="text-black text-base font-bold uppercase tracking-tight mb-8 p-4 border-4 border-black bg-[#FFFF00]">
            {getDeleteStudentConfirmationMessage()}
          </p>
          <div className="bg-black p-0 gap-0 flex justify-end">
            <button
              onClick={handleCancelDeleteStudent}
              className="px-6 py-3 border-4 border-black bg-white text-black font-black uppercase tracking-tighter rounded-none hover:bg-[#F0F0F0] transition-all"
            >
              CANCEL
            </button>
            <button
              onClick={handleConfirmDeleteStudent}
              className="px-6 py-3 bg-black text-white font-black uppercase tracking-tighter border-4 border-black rounded-none shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:bg-[#FFFF00] hover:text-black active:shadow-none active:translate-x-1 active:translate-y-1 transition-all duration-100"
            >
              CONFIRM DELETE
            </button>
          </div>
        </Modal>
      </div>
    </div>
  );
}

export default AdminDashboard;
