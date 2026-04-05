import React, { useState, useEffect, useCallback } from "react";
import { toast } from "react-hot-toast";
import { useNavigate } from "react-router-dom";
import { courseAPI, studentAPI } from '../services/apiService';

// Components
import Modal from "../components/Modal";
import ConfirmationModal from "../components/ConfirmationModal";
import ClearSessionButton from "../components/ClearSessionButton"; 
import DownloadReportsButton from "../components/DownloadReportsButton";
import EnrollmentStatsModal from "../components/EnrollmentStatsModal";

// Icons
import {
  PlusIcon,
  MinusIcon,
  UserGroupIcon,
  AcademicCapIcon,
  MagnifyingGlassIcon,
  FunnelIcon,
  EyeIcon,
  ArrowRightOnRectangleIcon,
  CheckCircleIcon,
  XCircleIcon,
  CalendarIcon,
  IdentificationIcon,
  EnvelopeIcon,
  BuildingLibraryIcon,
  TableCellsIcon,
  TagIcon,
  PencilSquareIcon,
  TrashIcon,
} from "@heroicons/react/24/outline";

const BLOCK_OPTIONS = ["Block 1", "Block 2"];

function AdminDashboard({ user, onLogout }) {
  const navigate = useNavigate();
  const [courses, setCourses] = useState([]);
  const [newBatchCourseData, setNewBatchCourseData] = useState({
    batch: "",
    block: "",
    enrollmentTime: "",
    isEnrollmentActive: false,
    courses: [{ courseName: "", department: "", professorName: "", intakeCapacity: "" }],
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
  const [activeStudentBatchTab, setActiveStudentBatchTab] = useState(""); 
  const [isLoadingStudents, setIsLoadingStudents] = useState(false);

  // State for Edit Course Modal
  const [isEditCourseModalOpen, setIsEditCourseModalOpen] = useState(false);
  const [editingCourse, setEditingCourse] = useState(null); 
  const [editFormData, setEditFormData] = useState({
    courseName: "",
    batch: "",
    block: "",
    department: "",
    professorName: "",
    intakeCapacity: "",
  });
  const [isBatchEnrollmentModalOpen, setIsBatchEnrollmentModalOpen] = useState(false);
  const [batchEnrollmentFormData, setBatchEnrollmentFormData] = useState({
    batch: "",
    block: "",
    enrollmentOpenTime: "",
    isEnrollmentActive: false,
  });

  // State for Course Batch Tabs
  const [activeCourseBatchTab, setActiveCourseBatchTab] = useState("");
  const [selectedCourseIds, setSelectedCourseIds] = useState([]);
  const [courseSearchQuery, setCourseSearchQuery] = useState("");
  const [courseStatusFilter, setCourseStatusFilter] = useState("all");

  // STATES FOR STUDENT DELETION
  const [selectedStudentIds, setSelectedStudentIds] = useState([]);
  const [isDeleteConfirmationModalOpen, setIsDeleteConfirmationModalOpen] = useState(false);
  const [studentToDelete, setStudentToDelete] = useState(null); 
  const [deleteMode, setDeleteMode] = useState(""); 

  // STATES FOR CONFIRMATION MODALS
  const [confirmationModal, setConfirmationModal] = useState({
    isOpen: false,
    title: '',
    message: '',
    onConfirm: null,
    variant: 'danger' 
  });

  // Memoize config for API calls
  const config = useCallback(
    () => ({
      headers: {
        Authorization: `Bearer ${user?.token}`,
      },
    }),
    [user?.token]
  );

  const fetchCourses = useCallback(async () => {
    try {
      const res = await courseAPI.getAll(config());
      setCourses(res.data);
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
  }, [config, activeCourseBatchTab]);

  const fetchAllStudents = useCallback(async () => {
    setIsLoadingStudents(true);
    try {
      const res = await studentAPI.getAll(config());
      setAllStudents(res.data);
      if (res.data.length > 0 && !activeStudentBatchTab) {
        const uniqueBatches = [
          ...new Set(res.data.map((student) => student.batch)),
        ].sort();
        if (uniqueBatches.length > 0) {
          setActiveStudentBatchTab(uniqueBatches[0]);
        }
      } else if (res.data.length === 0) {
        setActiveStudentBatchTab("");
      }
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to fetch students");
    } finally {
      setIsLoadingStudents(false);
    }
  }, [config, activeStudentBatchTab]);

  useEffect(() => {
    fetchCourses();
  }, [fetchCourses]);

  const formatDateForISTInput = (dateValue) => {
    if (!dateValue) return "";

    const dateObj = new Date(dateValue);
    if (dateObj.toString() === "Invalid Date") return "";

    const options = {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      hourCycle: "h23",
      timeZone: "Asia/Kolkata",
    };

    const parts = new Intl.DateTimeFormat("en-CA", options).formatToParts(dateObj);
    const year = parts.find((p) => p.type === "year")?.value;
    const month = parts.find((p) => p.type === "month")?.value;
    const day = parts.find((p) => p.type === "day")?.value;
    const hour = parts.find((p) => p.type === "hour")?.value;
    const minute = parts.find((p) => p.type === "minute")?.value;

    if (!year || !month || !day || !hour || !minute) return "";
    return `${year}-${month}-${day}T${hour}:${minute}`;
  };

  const formatDateTimeForApi = (dateTimeLocalValue) => {
    if (!dateTimeLocalValue) return null;

    let normalizedValue = dateTimeLocalValue;
    if (!normalizedValue.match(/:[0-5]\d([+-]\d{2}:\d{2}|Z)$/)) normalizedValue += ":00";
    if (!normalizedValue.match(/[+-]\d{2}:\d{2}$/)) normalizedValue += "+05:30";

    return normalizedValue;
  };

  const handleBatchCourseChange = (e) => {
    const { name, value, type, checked } = e.target;
    setNewBatchCourseData((prev) => {
      const next = {
        ...prev,
        [name]: type === "checkbox" ? checked : value,
      };

      if (name === "isEnrollmentActive" && checked) {
        next.enrollmentTime = "";
      }

      return next;
    });
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
      courses: [...prev.courses, { courseName: "", department: "", professorName: "", intakeCapacity: "" }],
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
    const { batch, block, enrollmentTime, isEnrollmentActive, courses: individualCourses } = newBatchCourseData;

    if (!batch || !block || individualCourses.length === 0) {
      toast.error("Please fill batch, block, and add at least one course.");
      return;
    }

    if (!BLOCK_OPTIONS.includes(block)) {
      toast.error("Please select a valid block (Block 1 or Block 2).");
      return;
    }

    if (!isEnrollmentActive && !enrollmentTime) {
      toast.error("Please either activate enrollment now or set an enrollment open time.");
      return;
    }

    for (const course of individualCourses) {
      if (!course.courseName || !course.department || !course.professorName || !course.intakeCapacity || course.intakeCapacity <= 0) {
        toast.error("All courses must have a name, department, professor name, and a positive intake capacity.");
        return;
      }
    }

    const timeToSend = formatDateTimeForApi(enrollmentTime);
    
    try {
      toast.loading("Creating courses...", { id: "createCourseToast" });
      await courseAPI.createBatchCourses(
        {
          batch,
          block,
          enrollmentOpenTime: timeToSend || null,
          isEnrollmentActive,
          courses: individualCourses,
        },
        config()
      );
      toast.success(`Courses for batch ${batch}, ${block} created successfully!`, { id: "createCourseToast" });
      setNewBatchCourseData({
        batch: "",
        block: "",
        enrollmentTime: "",
        isEnrollmentActive: false,
        courses: [{ courseName: "", department: "", professorName: "", intakeCapacity: "" }],
      });
      fetchCourses();
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to create batch courses", { id: "createCourseToast" });
    }
  };

  const handleSessionCleared = () => {
    fetchCourses(); 
    setSelectedCourseIds([]); 
    fetchAllStudents(); 
  };

  const openEnrollmentModal = async (courseId, courseName) => {
    setSelectedCourseId(courseId);
    setSelectedCourseName(courseName);
    setCourseEnrollments([]); 
    setIsEnrollmentModalOpen(true);
    setIsLoadingEnrollments(true);
    try {
      const res = await courseAPI.getEnrollments(courseId, config());
      setCourseEnrollments(res.data);
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to fetch enrollments");
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

  const openStudentsModal = () => {
    setIsStudentsModalOpen(true);
    fetchAllStudents();
  };

  const closeStudentsModal = () => {
    setIsStudentsModalOpen(false);
    setAllStudents([]); 
    setActiveStudentBatchTab("");
    setSelectedStudentIds([]); 
  };

  const openEditCourseModal = (course) => {
    setEditingCourse(course);

    setEditFormData({
      courseName: course.courseName,
      batch: course.batch,
      block: course.block || "",
      department: course.department || "",
      professorName: course.professorName || "",
      intakeCapacity: course.intakeCapacity,
    });
    setIsEditCourseModalOpen(true);
  };

  const closeEditCourseModal = () => {
    setIsEditCourseModalOpen(false);
    setEditingCourse(null);
    setEditFormData({ courseName: "", batch: "", block: "", department: "", professorName: "", intakeCapacity: "" });
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

    const payload = {
      courseName: editFormData.courseName,
      batch: editFormData.batch,
      block: editFormData.block,
      department: editFormData.department,
      professorName: editFormData.professorName,
      intakeCapacity: editFormData.intakeCapacity,
    };

    try {
      toast.loading("Updating course...", { id: "updateCourseToast" });
      await courseAPI.update(
        editingCourse._id,
        payload,
        config()
      );
      toast.success("Course updated successfully!", { id: "updateCourseToast" });
      closeEditCourseModal();
      fetchCourses(); 
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to update course", { id: "updateCourseToast" });
    }
  };

  const getBatchBlockEnrollmentSnapshot = (batch, block) => {
    const coursesInBlock = (coursesByBatch[batch] || []).filter((course) => course.block === block);

    if (coursesInBlock.length === 0) {
      return {
        hasCourses: false,
        enrollmentOpenTime: "",
        isEnrollmentActive: false,
      };
    }

    const uniqueOpenTimes = [
      ...new Set(
        coursesInBlock.map((course) =>
          course.enrollmentOpenTime ? new Date(course.enrollmentOpenTime).toISOString() : ""
        )
      ),
    ];

    const allCoursesActive = coursesInBlock.every((course) => course.isEnrollmentActive);
    const commonOpenTime = uniqueOpenTimes.length === 1 ? uniqueOpenTimes[0] : "";

    return {
      hasCourses: true,
      enrollmentOpenTime: formatDateForISTInput(commonOpenTime),
      isEnrollmentActive: allCoursesActive,
    };
  };

  const openBatchEnrollmentModal = (batch) => {
    if (!batch || !coursesByBatch[batch] || coursesByBatch[batch].length === 0) {
      toast.error("No courses found for the selected batch.");
      return;
    }

    const coursesInBatch = coursesByBatch[batch];
    const availableBlocks = BLOCK_OPTIONS.filter((block) =>
      coursesInBatch.some((course) => course.block === block)
    );

    if (availableBlocks.length === 0) {
      toast.error("No block-wise courses found for this batch.");
      return;
    }

    const initialBlock = availableBlocks[0];
    const snapshot = getBatchBlockEnrollmentSnapshot(batch, initialBlock);

    setBatchEnrollmentFormData({
      batch,
      block: initialBlock,
      enrollmentOpenTime: snapshot.enrollmentOpenTime,
      isEnrollmentActive: snapshot.isEnrollmentActive,
    });
    setIsBatchEnrollmentModalOpen(true);
  };

  const closeBatchEnrollmentModal = () => {
    setIsBatchEnrollmentModalOpen(false);
    setBatchEnrollmentFormData({
      batch: "",
      block: "",
      enrollmentOpenTime: "",
      isEnrollmentActive: false,
    });
  };

  const handleBatchEnrollmentFormChange = (e) => {
    const { name, value, type, checked } = e.target;

    if (name === "block") {
      setBatchEnrollmentFormData((prev) => {
        const snapshot = getBatchBlockEnrollmentSnapshot(prev.batch, value);
        return {
          ...prev,
          block: value,
          enrollmentOpenTime: snapshot.enrollmentOpenTime,
          isEnrollmentActive: snapshot.isEnrollmentActive,
        };
      });
      return;
    }

    setBatchEnrollmentFormData((prev) => {
      const next = {
        ...prev,
        [name]: type === "checkbox" ? checked : value,
      };

      if (name === "isEnrollmentActive" && checked) {
        next.enrollmentOpenTime = "";
      }

      return next;
    });
  };

  const handleUpdateBatchEnrollment = async (e) => {
    e.preventDefault();

    const { batch, block, enrollmentOpenTime, isEnrollmentActive } = batchEnrollmentFormData;
    if (!batch || !block) return;

    if (!BLOCK_OPTIONS.includes(block)) {
      toast.error("Please select a valid block (Block 1 or Block 2).");
      return;
    }

    const timeToSend = formatDateTimeForApi(enrollmentOpenTime);

    try {
      toast.loading("Updating batch enrollment...", { id: "updateBatchEnrollmentToast" });
      await courseAPI.setBatchEnrollment(
        {
          batch,
          block,
          enrollmentOpenTime: timeToSend,
          isEnrollmentActive,
        },
        config()
      );

      toast.success(`Enrollment settings updated for batch ${batch}, ${block}!`, { id: "updateBatchEnrollmentToast" });
      closeBatchEnrollmentModal();
      fetchCourses();
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to update batch enrollment settings.", {
        id: "updateBatchEnrollmentToast",
      });
    }
  };

  const handleCourseCheckboxChange = (courseId) => {
    setSelectedCourseIds((prevSelected) =>
      prevSelected.includes(courseId)
        ? prevSelected.filter((id) => id !== courseId)
        : [...prevSelected, courseId]
    );
  };

  const handleSelectAllCourses = (e) => {
    const isChecked = e.target.checked;
    if (isChecked) {
      const allIdsInCurrentBatch = filteredCoursesInActiveBatch.map((course) => course._id);
      setSelectedCourseIds(allIdsInCurrentBatch);
    } else {
      setSelectedCourseIds([]);
    }
  };

  const handleDeleteSelectedCourses = async () => {
    if (selectedCourseIds.length === 0) return;
    setConfirmationModal({
      isOpen: true,
      title: 'Delete Selected Courses',
      message: `Are you sure you want to delete ${selectedCourseIds.length} selected course(s) and all their associated enrollments? This action cannot be undone.`,
      variant: 'danger',
      onConfirm: async () => {
        try {
          toast.loading("Deleting courses...", { id: "deleteCoursesToast" });
          await courseAPI.bulkDelete({ data: { ids: selectedCourseIds }, ...config() });
          toast.success("Selected courses deleted successfully!", { id: "deleteCoursesToast" });
          setSelectedCourseIds([]); 
          fetchCourses(); 
        } catch (error) {
          toast.error(error.response?.data?.message || "Failed to delete courses.", { id: "deleteCoursesToast" });
        }
      }
    });
  };

  const handleCloseBatchEnrollment = async (batch) => {
    if (!batch) return;
    const coursesInBatch = coursesByBatch[batch] || [];
    const activeCourses = coursesInBatch.filter(course => course.isEnrollmentActive);
    
    if (activeCourses.length === 0) {
      toast(`Enrollment is already closed for all courses in batch "${batch}".`, { duration: 4000, icon: 'ℹ️' });
      return;
    }

    setConfirmationModal({
      isOpen: true,
      title: 'Close Batch Enrollment',
      message: `Are you sure you want to CLOSE enrollment for ${activeCourses.length} active course(s) in batch "${batch}"?`,
      variant: 'warning',
      onConfirm: async () => {
        try {
          toast.loading("Closing enrollment...", { id: "closeBatchToast" });
          await courseAPI.closeBatchEnrollment(batch, config());
          toast.success(`Enrollment closed for batch "${batch}"!`, { id: "closeBatchToast" });
          fetchCourses(); 
        } catch (error) {
          toast.error(error.response?.data?.message || "Failed to close enrollment.", { id: "closeBatchToast" });
        }
      }
    });
  };

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
        const allIdsInBatch = studentsByBatch[activeStudentBatchTab].map((student) => student._id);
        setSelectedStudentIds((prevSelected) => [...new Set([...prevSelected, ...allIdsInBatch])]);
      } else {
        const allIdsInBatch = studentsByBatch[activeStudentBatchTab].map((student) => student._id);
        setSelectedStudentIds((prevSelected) => prevSelected.filter((id) => !allIdsInBatch.includes(id)));
      }
    }
  };

  const handleDeleteStudentConfirmation = (studentId = null, mode = "single") => {
    setStudentToDelete(studentId); 
    setDeleteMode(mode);
    setIsDeleteConfirmationModalOpen(true);
  };

  const handleConfirmDeleteStudent = async () => {
    setIsDeleteConfirmationModalOpen(false); 
    try {
      if (deleteMode === "single" && studentToDelete) {
        await studentAPI.delete(studentToDelete, config());
        toast.success("Student deleted successfully!");
      } else if (deleteMode === "bulk" && selectedStudentIds.length > 0) {
        await studentAPI.bulkDelete({ ...config(), data: { ids: selectedStudentIds } });
        toast.success(`${selectedStudentIds.length} students deleted!`);
        setSelectedStudentIds([]); 
      }
      fetchAllStudents(); 
    } catch (error) {
      toast.error(error.response?.data?.message || `Failed to delete student(s)`);
    } finally {
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
      const student = studentsByBatch[activeStudentBatchTab]?.find((s) => s._id === studentToDelete);
      return `Are you sure you want to delete student "${student?.name || "Unknown"}"? All associated enrollments will also be deleted.`;
    } else if (deleteMode === "bulk" && selectedStudentIds.length > 0) {
      return `Are you sure you want to delete ${selectedStudentIds.length} selected students? All associated enrollments will also be deleted.`;
    }
    return "Are you sure you want to delete?";
  };

  const studentsByBatch = allStudents.reduce((acc, student) => {
    (acc[student.batch] = acc[student.batch] || []).push(student);
    return acc;
  }, {});
  const sortedBatches = Object.keys(studentsByBatch).sort();

  const coursesByBatch = courses.reduce((acc, course) => {
    (acc[course.batch] = acc[course.batch] || []).push(course);
    return acc;
  }, {});
  const sortedCourseBatches = Object.keys(coursesByBatch).sort();

  const totalCoursesCount = courses.length;
  const activeCoursesCount = courses.filter((course) => course.isEnrollmentActive).length;
  const fullCoursesCount = courses.filter((course) => course.enrolledStudentsCount >= course.intakeCapacity).length;
  const totalSeatCapacity = courses.reduce((sum, course) => sum + course.intakeCapacity, 0);
  const totalFilledSeats = courses.reduce((sum, course) => sum + course.enrolledStudentsCount, 0);
  const seatFillPercentage = totalSeatCapacity > 0 ? Math.round((totalFilledSeats / totalSeatCapacity) * 100) : 0;

  const coursesInActiveBatch = activeCourseBatchTab ? (coursesByBatch[activeCourseBatchTab] || []) : [];
  const normalizedCourseSearch = courseSearchQuery.trim().toLowerCase();
  const filteredCoursesInActiveBatch = coursesInActiveBatch.filter((course) => {
    const matchesSearch = normalizedCourseSearch.length === 0
      || course.courseName.toLowerCase().includes(normalizedCourseSearch)
      || (course.block || '').toLowerCase().includes(normalizedCourseSearch)
      || (course.department || '').toLowerCase().includes(normalizedCourseSearch)
      || (course.professorName || '').toLowerCase().includes(normalizedCourseSearch);

    const isFull = course.enrolledStudentsCount >= course.intakeCapacity;
    const matchesStatus =
      courseStatusFilter === "all"
      || (courseStatusFilter === "active" && course.isEnrollmentActive)
      || (courseStatusFilter === "closed" && !course.isEnrollmentActive)
      || (courseStatusFilter === "full" && isFull);

    return matchesSearch && matchesStatus;
  });

  const areAllCoursesInCurrentBatchSelected =
    filteredCoursesInActiveBatch.length > 0
    && filteredCoursesInActiveBatch.every((course) => selectedCourseIds.includes(course._id));
  const areAllStudentsInCurrentBatchSelected = activeStudentBatchTab && studentsByBatch[activeStudentBatchTab] && studentsByBatch[activeStudentBatchTab].length > 0 && studentsByBatch[activeStudentBatchTab].every((student) => selectedStudentIds.includes(student._id));
  const hasCoursesForSelectedBatchBlock = Boolean(
    batchEnrollmentFormData.batch
    && batchEnrollmentFormData.block
    && (coursesByBatch[batchEnrollmentFormData.batch] || []).some(
      (course) => course.block === batchEnrollmentFormData.block
    )
  );

  return (
    <div className="min-h-screen bg-slate-50 font-sans text-slate-900 flex flex-col">
      {/* Top Navigation */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-20">
        <div className="max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="bg-indigo-600 p-1.5 rounded-md shadow-sm">
              <BuildingLibraryIcon className="w-6 h-6 text-white" />
            </div>
            <h1 className="text-xl font-semibold tracking-tight text-slate-900">
              Admin Portal
            </h1>
          </div>
          <div className="flex items-center gap-6">
            <div className="hidden sm:flex flex-col text-right">
              <span className="text-sm font-medium text-slate-900">{user?.name}</span>
              <span className="text-xs text-slate-500 capitalize">{user?.role}</span>
            </div>
            <div className="h-8 w-px bg-slate-200 hidden sm:block"></div>
            <button
              onClick={onLogout}
              className="flex items-center gap-2 text-sm font-medium text-slate-600 hover:text-red-600 transition-colors"
            >
              <span className="hidden sm:block">Sign out</span>
              <ArrowRightOnRectangleIcon className="w-5 h-5" />
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 w-full max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8 py-8 flex flex-col gap-8">
        
        {/* Page Header & Global Action Toolbar */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <h2 className="text-2xl font-semibold text-slate-900">Dashboard Overview</h2>
            <p className="text-sm text-slate-500 mt-1">Manage system configurations, enrollments, and user data.</p>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <button
              onClick={() => navigate('/admin/users')}
              className="inline-flex items-center justify-center px-4 py-2 text-sm font-medium bg-white border border-slate-300 rounded-md text-slate-700 shadow-sm hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all"
            >
              <UserGroupIcon className="w-4 h-4 mr-2 text-slate-400" />
              Manage Users
            </button>
            <div className="inline-flex items-center justify-center">
                <EnrollmentStatsModal user={user} />
            </div>
            <div className="inline-flex items-center justify-center">
                <ClearSessionButton
                  user={user}
                  onSessionCleared={handleSessionCleared}
                  onRequestConfirmation={(modalConfig) => setConfirmationModal({ ...modalConfig, isOpen: true })}
                />
            </div>
            <div className="inline-flex items-center justify-center">
                <DownloadReportsButton user={user} config={config} />
            </div>
          </div>
        </div>

        {/* Quick Metrics */}
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
          <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm">
            <p className="text-xs font-medium uppercase tracking-wide text-slate-500">Total Courses</p>
            <p className="mt-2 text-2xl font-semibold text-slate-900">{totalCoursesCount}</p>
          </div>
          <div className="bg-white border border-emerald-200 rounded-xl p-4 shadow-sm">
            <p className="text-xs font-medium uppercase tracking-wide text-emerald-700">Enrollment Active</p>
            <p className="mt-2 text-2xl font-semibold text-emerald-700">{activeCoursesCount}</p>
          </div>
          <div className="bg-white border border-orange-200 rounded-xl p-4 shadow-sm">
            <p className="text-xs font-medium uppercase tracking-wide text-orange-700">Full Courses</p>
            <p className="mt-2 text-2xl font-semibold text-orange-700">{fullCoursesCount}</p>
          </div>
          <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm">
            <p className="text-xs font-medium uppercase tracking-wide text-slate-500">Seat Fill</p>
            <p className="mt-2 text-2xl font-semibold text-slate-900">{seatFillPercentage}%</p>
            <p className="text-xs text-slate-500 mt-1">{totalFilledSeats} of {totalSeatCapacity} seats</p>
          </div>
        </div>

        {/* Create Batch Card */}
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-200 bg-slate-50/50 flex items-center justify-between">
            <h3 className="text-base font-semibold text-slate-800 flex items-center gap-2">
              <AcademicCapIcon className="w-5 h-5 text-indigo-600" />
              Create Courses for a Batch
            </h3>
          </div>
          
          <div className="p-6">
            <form onSubmit={handleCreateBatchCourses} className="space-y-6">
              {/* Batch & Timing */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 pb-6 border-b border-slate-100">
                <div>
                  <label htmlFor="batch" className="block text-sm font-medium text-slate-700 mb-1">Batch Identifier</label>
                  <input
                    type="text"
                    name="batch"
                    id="batch"
                    placeholder="e.g., 2024"
                    className="block w-full rounded-md border-slate-300 py-2 px-3 text-sm shadow-sm focus:border-indigo-500 focus:ring-indigo-500 bg-white"
                    value={newBatchCourseData.batch}
                    onChange={handleBatchCourseChange}
                    required
                  />
                </div>
                <div>
                  <label htmlFor="block" className="block text-sm font-medium text-slate-700 mb-1">Block</label>
                  <select
                    name="block"
                    id="block"
                    className="block w-full rounded-md border-slate-300 py-2 px-3 text-sm shadow-sm focus:border-indigo-500 focus:ring-indigo-500 bg-white"
                    value={newBatchCourseData.block}
                    onChange={handleBatchCourseChange}
                    required
                  >
                    <option value="">Select Block</option>
                    {BLOCK_OPTIONS.map((blockOption) => (
                      <option key={blockOption} value={blockOption}>{blockOption}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label htmlFor="enrollmentTime" className="flex justify-between text-sm font-medium text-slate-700 mb-1">
                    <span>Enrollment Open Time (IST)</span>
                    <span className="text-xs text-slate-400 font-normal">Optional</span>
                  </label>
                  <input
                    type="datetime-local"
                    name="enrollmentTime"
                    id="enrollmentTime"
                    className="block w-full rounded-md border-slate-300 py-2 px-3 text-sm shadow-sm focus:border-indigo-500 focus:ring-indigo-500 bg-white disabled:bg-slate-50 disabled:text-slate-500"
                    value={newBatchCourseData.enrollmentTime}
                    onChange={handleBatchCourseChange}
                    disabled={newBatchCourseData.isEnrollmentActive}
                  />
                  <div className="mt-3 flex items-start">
                    <div className="flex h-5 items-center">
                      <input
                        id="isEnrollmentActive"
                        name="isEnrollmentActive"
                        type="checkbox"
                        checked={newBatchCourseData.isEnrollmentActive}
                        onChange={handleBatchCourseChange}
                        className="h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                      />
                    </div>
                    <div className="ml-3 text-sm">
                      <label htmlFor="isEnrollmentActive" className="font-medium text-slate-700">Activate Immediately</label>
                      <p className="text-slate-500">Overrides the scheduled time above.</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Individual Courses Setup */}
              <div>
                <div className="flex items-center justify-between mb-4">
                  <h4 className="text-sm font-medium text-slate-900 uppercase tracking-wide">Course Configuration</h4>
                </div>
                <div className="space-y-3">
                  {newBatchCourseData.courses.map((course, index) => (
                    <div key={index} className="flex flex-col gap-4 bg-slate-50 p-4 rounded-lg border border-slate-200">
                      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                        <div className="w-full">
                          <label htmlFor={`courseName-${index}`} className="block text-xs font-medium text-slate-500 mb-1">Course Name</label>
                          <input
                            type="text"
                            name="courseName"
                            id={`courseName-${index}`}
                            placeholder="e.g., Advanced Mathematics"
                            className="block w-full rounded-md border-slate-300 py-2 px-3 text-sm shadow-sm focus:border-indigo-500 focus:ring-indigo-500 bg-white"
                            value={course.courseName}
                            onChange={(e) => handleIndividualCourseChange(index, e)}
                            required
                          />
                        </div>
                        <div className="w-full">
                          <label htmlFor={`department-${index}`} className="block text-xs font-medium text-slate-500 mb-1">Department</label>
                          <input
                            type="text"
                            name="department"
                            id={`department-${index}`}
                            placeholder="e.g., ECE"
                            className="block w-full rounded-md border-slate-300 py-2 px-3 text-sm shadow-sm focus:border-indigo-500 focus:ring-indigo-500 bg-white"
                            value={course.department}
                            onChange={(e) => handleIndividualCourseChange(index, e)}
                            required
                          />
                        </div>
                      </div>
                      <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-end">
                        <div className="flex-1 w-full">
                          <label htmlFor={`professorName-${index}`} className="block text-xs font-medium text-slate-500 mb-1">Professor Name</label>
                          <input
                            type="text"
                            name="professorName"
                            id={`professorName-${index}`}
                            placeholder="e.g., Dr. Sharma"
                            className="block w-full rounded-md border-slate-300 py-2 px-3 text-sm shadow-sm focus:border-indigo-500 focus:ring-indigo-500 bg-white"
                            value={course.professorName}
                            onChange={(e) => handleIndividualCourseChange(index, e)}
                            required
                          />
                        </div>
                        <div className="w-full sm:w-48">
                          <label htmlFor={`intakeCapacity-${index}`} className="block text-xs font-medium text-slate-500 mb-1">Intake Capacity</label>
                          <input
                            type="number"
                            name="intakeCapacity"
                            id={`intakeCapacity-${index}`}
                            placeholder="0"
                            className="block w-full rounded-md border-slate-300 py-2 px-3 text-sm shadow-sm focus:border-indigo-500 focus:ring-indigo-500 bg-white"
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
                            className="mt-2 sm:mt-0 p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-md transition-colors border border-transparent sm:border-slate-200 sm:bg-white"
                            title="Remove Course"
                          >
                            <TrashIcon className="w-5 h-5" />
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
                <div className="mt-4 flex items-center justify-between">
                  <button
                    type="button"
                    onClick={handleAddIndividualCourseField}
                    className="inline-flex items-center text-sm font-medium text-indigo-600 hover:text-indigo-700"
                  >
                    <PlusIcon className="w-4 h-4 mr-1" />
                    Add Another Course
                  </button>
                  <button
                    type="submit"
                    className="inline-flex justify-center rounded-md border border-transparent bg-indigo-600 py-2 px-6 text-sm font-medium text-white shadow-sm hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 transition-all"
                  >
                    Publish Batch Courses
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>

        {/* Course Directory Table */}
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden flex flex-col">
          <div className="px-6 py-4 border-b border-slate-200 bg-slate-50/50 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <h3 className="text-base font-semibold text-slate-800 flex items-center gap-2">
              <TableCellsIcon className="w-5 h-5 text-indigo-600" />
              Course Directory
            </h3>
            <div className="flex gap-3">
              <button
                onClick={openStudentsModal}
                className="inline-flex items-center px-3 py-1.5 border border-slate-300 shadow-sm text-sm font-medium rounded-md text-slate-700 bg-white hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
              >
                <UserGroupIcon className="w-4 h-4 mr-2 text-slate-400" />
                View Student Roster
              </button>
              {selectedCourseIds.length > 0 && (
                <button
                  onClick={handleDeleteSelectedCourses}
                  className="inline-flex items-center px-3 py-1.5 border border-red-300 shadow-sm text-sm font-medium rounded-md text-red-700 bg-red-50 hover:bg-red-100 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
                >
                  <TrashIcon className="w-4 h-4 mr-1.5" />
                  Delete Selected ({selectedCourseIds.length})
                </button>
              )}
            </div>
          </div>

          {courses.length === 0 ? (
            <div className="px-6 py-12 text-center">
              <TableCellsIcon className="mx-auto h-12 w-12 text-slate-300" />
              <h3 className="mt-2 text-sm font-medium text-slate-900">No courses</h3>
              <p className="mt-1 text-sm text-slate-500">Get started by creating a new batch above.</p>
            </div>
          ) : (
            <div className="flex flex-col">
              {/* Tabs */}
              <div className="border-b border-slate-200 px-6">
                <nav className="-mb-px flex space-x-8 overflow-x-auto" aria-label="Tabs">
                  {sortedCourseBatches.map((batch) => (
                    <button
                      key={batch}
                      onClick={() => setActiveCourseBatchTab(batch)}
                      className={`
                        whitespace-nowrap py-4 border-b-2 font-medium text-sm transition-colors
                        ${activeCourseBatchTab === batch
                          ? "border-indigo-600 text-indigo-600"
                          : "border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300"
                        }
                      `}
                    >
                      Batch {batch}
                      <span className={`ml-2 py-0.5 px-2.5 rounded-full text-xs ${
                        activeCourseBatchTab === batch ? 'bg-indigo-100 text-indigo-600' : 'bg-slate-100 text-slate-600'
                      }`}>
                        {coursesByBatch[batch].length}
                      </span>
                    </button>
                  ))}
                </nav>
              </div>

              {/* Search & Filter Toolbar */}
              {activeCourseBatchTab && (
                <div className="px-6 py-4 border-b border-slate-200 bg-white">
                  <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3">
                    <div className="relative w-full lg:max-w-md">
                      <MagnifyingGlassIcon className="w-5 h-5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                      <input
                        type="text"
                        value={courseSearchQuery}
                        onChange={(e) => {
                          setCourseSearchQuery(e.target.value);
                          setSelectedCourseIds([]);
                        }}
                        placeholder="Search courses in this batch"
                        className="w-full pl-10 pr-3 py-2 rounded-md border border-slate-300 text-sm focus:border-indigo-500 focus:ring-indigo-500"
                      />
                    </div>

                    <div className="flex items-center gap-3">
                      <div className="relative">
                        <FunnelIcon className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                        <select
                          value={courseStatusFilter}
                          onChange={(e) => {
                            setCourseStatusFilter(e.target.value);
                            setSelectedCourseIds([]);
                          }}
                          className="pl-9 pr-8 py-2 rounded-md border border-slate-300 text-sm bg-white focus:border-indigo-500 focus:ring-indigo-500"
                        >
                          <option value="all">All Statuses</option>
                          <option value="active">Active</option>
                          <option value="closed">Closed</option>
                          <option value="full">Full</option>
                        </select>
                      </div>
                      <p className="text-xs text-slate-500 whitespace-nowrap">
                        Showing {filteredCoursesInActiveBatch.length} of {coursesInActiveBatch.length}
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* Data Table */}
              {activeCourseBatchTab && (
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-slate-200">
                    <thead className="bg-slate-50">
                      <tr>
                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider w-10">
                          <input
                            type="checkbox"
                            className="h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                            onChange={handleSelectAllCourses}
                            checked={areAllCoursesInCurrentBatchSelected}
                          />
                        </th>
                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Course Name</th>
                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Department</th>
                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Professor</th>
                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Batch</th>
                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Block</th>
                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Capacity</th>
                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Enrolled</th>
                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Open Time (IST)</th>
                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Status</th>
                        <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-slate-500 uppercase tracking-wider">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-slate-200">
                      {filteredCoursesInActiveBatch.length > 0 ? (
                        filteredCoursesInActiveBatch.map((course) => {
                          const isFull = course.enrolledStudentsCount >= course.intakeCapacity;
                          let statusColor = course.isEnrollmentActive ? "bg-green-100 text-green-800" : "bg-slate-100 text-slate-800";
                          let statusText = course.isEnrollmentActive ? "Active" : "Closed";
                          let dotColor = course.isEnrollmentActive ? "bg-green-500" : "bg-slate-400";

                          if (isFull) {
                            statusColor = "bg-orange-100 text-orange-800";
                            statusText = course.isEnrollmentActive ? "Full (Closed)" : "Full";
                            dotColor = "bg-orange-500";
                          }

                          return (
                            <tr key={course._id} className="hover:bg-slate-50/50 transition-colors">
                              <td className="px-6 py-4 whitespace-nowrap">
                                <input
                                  type="checkbox"
                                  className="h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                                  checked={selectedCourseIds.includes(course._id)}
                                  onChange={() => handleCourseCheckboxChange(course._id)}
                                />
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-slate-900">{course.courseName}</td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500">{course.department || '—'}</td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500">{course.professorName || '—'}</td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500">{course.batch}</td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500">{course.block || '—'}</td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500">{course.intakeCapacity}</td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-slate-700">{course.enrolledStudentsCount}</td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500">
                                {course.enrollmentOpenTime
                                  ? new Date(course.enrollmentOpenTime).toLocaleString("en-IN", { timeZone: "Asia/Kolkata", dateStyle: "medium", timeStyle: "short" })
                                  : "—"}
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap">
                                <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${statusColor}`}>
                                  <span className={`mr-1.5 h-1.5 w-1.5 rounded-full ${dotColor}`}></span>
                                  {statusText}
                                </span>
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                                <div className="flex justify-end gap-2">
                                  <button
                                    onClick={() => openEnrollmentModal(course._id, course.courseName)}
                                    className="text-slate-400 hover:text-indigo-600 transition-colors p-1"
                                    title="View Roster"
                                  >
                                    <EyeIcon className="w-5 h-5" />
                                  </button>
                                  <button
                                    onClick={() => openEditCourseModal(course)}
                                    className="text-slate-400 hover:text-indigo-600 transition-colors p-1"
                                    title="Edit Settings"
                                  >
                                    <PencilSquareIcon className="w-5 h-5" />
                                  </button>
                                </div>
                              </td>
                            </tr>
                          );
                        })
                      ) : (
                        <tr>
                          <td colSpan="11" className="px-6 py-10 text-center text-sm text-slate-500">
                            No courses match your current search/filter for this batch.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                  {/* Table Footer Actions */}
                  <div className="px-6 py-4 border-t border-slate-200 bg-slate-50 flex flex-col sm:flex-row sm:justify-end gap-3">
                    <button
                      onClick={() => openBatchEnrollmentModal(activeCourseBatchTab)}
                      className="inline-flex items-center px-3 py-1.5 border border-slate-300 shadow-sm text-sm font-medium rounded-md text-slate-700 bg-white hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                    >
                      <PencilSquareIcon className="w-4 h-4 mr-1.5 text-slate-400" />
                      Set Common Enrollment Time by Block
                    </button>
                    <button
                      onClick={() => handleCloseBatchEnrollment(activeCourseBatchTab)}
                      className="inline-flex items-center px-3 py-1.5 border border-slate-300 shadow-sm text-sm font-medium rounded-md text-slate-700 bg-white hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                    >
                      <XCircleIcon className="w-4 h-4 mr-1.5 text-slate-400" />
                      Close Enrollment for Batch {activeCourseBatchTab}
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

      </main>

      {/* Enrollments Modal */}
      <Modal isOpen={isEnrollmentModalOpen} onClose={closeEnrollmentModal} title={`Roster: ${selectedCourseName}`}>
        {isLoadingEnrollments ? (
          <div className="flex justify-center py-12">
             <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
          </div>
        ) : courseEnrollments.length === 0 ? (
          <div className="text-center py-12">
            <IdentificationIcon className="mx-auto h-12 w-12 text-slate-300" />
            <p className="mt-2 text-sm text-slate-500">No students are currently enrolled.</p>
          </div>
        ) : (
          <div className="overflow-x-auto max-h-[60vh]">
            <table className="min-w-full divide-y divide-slate-200">
              <thead className="bg-slate-50 sticky top-0">
                <tr>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Student Name</th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Email</th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Batch Year</th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Enrolled On (IST)</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-slate-200">
                {courseEnrollments.map((enrollment) => (
                  <tr key={enrollment._id}>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-slate-900">{enrollment.student.name}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500">{enrollment.student.email}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500">{enrollment.student.batch}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500">
                      {new Date(enrollment.enrollmentDate).toLocaleString("en-IN", { timeZone: "Asia/Kolkata", dateStyle: "medium", timeStyle: "short" })}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Modal>

      {/* All Students Modal */}
      <Modal isOpen={isStudentsModalOpen} onClose={closeStudentsModal} title="Student Directory">
        {isLoadingStudents ? (
          <div className="flex justify-center py-12">
             <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
          </div>
        ) : sortedBatches.length === 0 ? (
          <div className="text-center py-12">
             <UserGroupIcon className="mx-auto h-12 w-12 text-slate-300" />
             <p className="mt-2 text-sm text-slate-500">No students found in the system.</p>
          </div>
        ) : (
          <div className="flex flex-col">
            <div className="border-b border-slate-200 px-6">
              <nav className="-mb-px flex space-x-8 overflow-x-auto" aria-label="Tabs">
                {sortedBatches.map((batch) => (
                  <button
                    key={batch}
                    onClick={() => {
                      setActiveStudentBatchTab(batch);
                      setSelectedStudentIds([]); 
                    }}
                    className={`whitespace-nowrap py-4 border-b-2 font-medium text-sm transition-colors ${
                      activeStudentBatchTab === batch ? "border-indigo-600 text-indigo-600" : "border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300"
                    }`}
                  >
                    Batch {batch} <span className="ml-1 text-xs text-slate-400">({studentsByBatch[batch].length})</span>
                  </button>
                ))}
              </nav>
            </div>

            {activeStudentBatchTab && (
              <div className="overflow-x-auto max-h-[60vh]">
                <div className="px-6 py-3 bg-slate-50 border-b border-slate-200 flex justify-between items-center sticky top-0 z-10">
                  <span className="text-sm font-medium text-slate-700">Select students to manage</span>
                  <button
                    onClick={() => handleDeleteStudentConfirmation(null, "bulk")}
                    disabled={selectedStudentIds.length === 0}
                    className={`inline-flex items-center px-3 py-1.5 border border-transparent text-xs font-medium rounded shadow-sm text-white transition-colors ${
                      selectedStudentIds.length > 0 ? "bg-red-600 hover:bg-red-700" : "bg-slate-300 cursor-not-allowed"
                    }`}
                  >
                    <TrashIcon className="w-4 h-4 mr-1" />
                    Delete ({selectedStudentIds.length})
                  </button>
                </div>
                <table className="min-w-full divide-y divide-slate-200">
                  <thead className="bg-slate-50">
                    <tr>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider w-10">
                        <input
                          type="checkbox"
                          className="h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                          checked={areAllStudentsInCurrentBatchSelected}
                          onChange={handleSelectAllStudents}
                        />
                      </th>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Name</th>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Email</th>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Batch</th>
                      <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-slate-500 uppercase tracking-wider">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-slate-200">
                    {studentsByBatch[activeStudentBatchTab]?.map((student) => (
                      <tr key={student._id} className="hover:bg-slate-50/50 transition-colors">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <input
                            type="checkbox"
                            className="h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                            checked={selectedStudentIds.includes(student._id)}
                            onChange={() => handleStudentCheckboxChange(student._id)}
                          />
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-slate-900">{student.name}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500">{student.email}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500">{student.batch}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm">
                          <button
                            onClick={() => handleDeleteStudentConfirmation(student._id, "single")}
                            className="text-slate-400 hover:text-red-600 transition-colors"
                            title="Delete Student"
                          >
                            <TrashIcon className="w-5 h-5" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}
      </Modal>

      {/* Edit Course Modal */}
      <Modal isOpen={isEditCourseModalOpen} onClose={closeEditCourseModal} title="Edit Course Details">
        {editingCourse && (
          <form onSubmit={handleUpdateCourse} className="p-6 space-y-5">
            <div>
              <label htmlFor="editCourseName" className="block text-sm font-medium text-slate-700 mb-1">Course Name</label>
              <input
                type="text"
                name="courseName"
                id="editCourseName"
                className="block w-full rounded-md border-slate-300 py-2 px-3 text-sm shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                value={editFormData.courseName}
                onChange={handleEditFormChange}
                required
              />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label htmlFor="editBatch" className="block text-sm font-medium text-slate-700 mb-1">Batch</label>
                <input
                  type="text"
                  name="batch"
                  id="editBatch"
                  className="block w-full rounded-md border-slate-300 py-2 px-3 text-sm shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                  value={editFormData.batch}
                  onChange={handleEditFormChange}
                  required
                />
              </div>
              <div>
                <label htmlFor="editBlock" className="block text-sm font-medium text-slate-700 mb-1">Block</label>
                <select
                  name="block"
                  id="editBlock"
                  className="block w-full rounded-md border-slate-300 py-2 px-3 text-sm shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                  value={editFormData.block}
                  onChange={handleEditFormChange}
                  required
                >
                  <option value="">Select Block</option>
                  {BLOCK_OPTIONS.map((blockOption) => (
                    <option key={blockOption} value={blockOption}>{blockOption}</option>
                  ))}
                </select>
              </div>
              <div>
                <label htmlFor="editDepartment" className="block text-sm font-medium text-slate-700 mb-1">Department</label>
                <input
                  type="text"
                  name="department"
                  id="editDepartment"
                  className="block w-full rounded-md border-slate-300 py-2 px-3 text-sm shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                  value={editFormData.department}
                  onChange={handleEditFormChange}
                  required
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label htmlFor="editProfessorName" className="block text-sm font-medium text-slate-700 mb-1">Professor Name</label>
                <input
                  type="text"
                  name="professorName"
                  id="editProfessorName"
                  className="block w-full rounded-md border-slate-300 py-2 px-3 text-sm shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                  value={editFormData.professorName}
                  onChange={handleEditFormChange}
                  required
                />
              </div>
              <div>
                <label htmlFor="editIntakeCapacity" className="block text-sm font-medium text-slate-700 mb-1">Intake Capacity</label>
                <input
                  type="number"
                  name="intakeCapacity"
                  id="editIntakeCapacity"
                  className="block w-full rounded-md border-slate-300 py-2 px-3 text-sm shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                  value={editFormData.intakeCapacity}
                  onChange={handleEditFormChange}
                  min="1"
                  required
                />
              </div>
            </div>
            <div className="pt-4 flex justify-end gap-3 border-t border-slate-200">
               <button
                 type="button"
                 onClick={closeEditCourseModal}
                 className="px-4 py-2 border border-slate-300 text-slate-700 rounded-md text-sm font-medium hover:bg-slate-50 transition-colors"
               >
                 Cancel
               </button>
               <button
                 type="submit"
                 className="px-4 py-2 bg-indigo-600 text-white rounded-md text-sm font-medium hover:bg-indigo-700 transition-colors shadow-sm"
               >
                 Save Changes
               </button>
            </div>
          </form>
        )}
      </Modal>

      {/* Batch Enrollment Settings Modal */}
      <Modal
        isOpen={isBatchEnrollmentModalOpen}
        onClose={closeBatchEnrollmentModal}
        title={`Batch Enrollment Settings${batchEnrollmentFormData.batch ? `: ${batchEnrollmentFormData.batch}` : ""}`}
      >
        <form onSubmit={handleUpdateBatchEnrollment} className="p-6 space-y-5">
          <div className="rounded-md bg-slate-50 border border-slate-200 px-3 py-2 text-sm text-slate-700">
            This will apply the same enrollment opening settings to all courses in the selected batch and block.
          </div>
          <div>
            <label htmlFor="batchEnrollmentBlock" className="block text-sm font-medium text-slate-700 mb-1">Block</label>
            <select
              id="batchEnrollmentBlock"
              name="block"
              value={batchEnrollmentFormData.block}
              onChange={handleBatchEnrollmentFormChange}
              className="block w-full rounded-md border-slate-300 py-2 px-3 text-sm shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
              required
            >
              <option value="">Select Block</option>
              {BLOCK_OPTIONS.map((blockOption) => (
                <option key={blockOption} value={blockOption}>{blockOption}</option>
              ))}
            </select>
            {!hasCoursesForSelectedBatchBlock && batchEnrollmentFormData.block && (
              <p className="mt-2 text-xs text-amber-700">No courses found for this batch/block combination.</p>
            )}
          </div>
          <div>
            <label htmlFor="batchEnrollmentOpenTime" className="flex justify-between text-sm font-medium text-slate-700 mb-1">
              <span>Enrollment Open Time (IST)</span>
              <span className="text-xs text-slate-400 font-normal">Clear to close when not active</span>
            </label>
            <input
              type="datetime-local"
              id="batchEnrollmentOpenTime"
              name="enrollmentOpenTime"
              className="block w-full rounded-md border-slate-300 py-2 px-3 text-sm shadow-sm focus:border-indigo-500 focus:ring-indigo-500 disabled:bg-slate-50"
              value={batchEnrollmentFormData.enrollmentOpenTime}
              onChange={handleBatchEnrollmentFormChange}
              disabled={batchEnrollmentFormData.isEnrollmentActive}
            />
          </div>
          <div className="flex items-start bg-slate-50 p-3 rounded-md border border-slate-200">
            <div className="flex h-5 items-center">
              <input
                type="checkbox"
                id="batchIsEnrollmentActive"
                name="isEnrollmentActive"
                checked={batchEnrollmentFormData.isEnrollmentActive}
                onChange={handleBatchEnrollmentFormChange}
                className="h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
              />
            </div>
            <div className="ml-3 text-sm">
              <label htmlFor="batchIsEnrollmentActive" className="font-medium text-slate-900">Enrollment Active</label>
              <p className="text-slate-500">Allow students to enroll in all courses of this batch right now.</p>
            </div>
          </div>
          <div className="pt-4 flex justify-end gap-3 border-t border-slate-200">
            <button
              type="button"
              onClick={closeBatchEnrollmentModal}
              className="px-4 py-2 border border-slate-300 text-slate-700 rounded-md text-sm font-medium hover:bg-slate-50 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={!hasCoursesForSelectedBatchBlock}
              className="px-4 py-2 bg-indigo-600 text-white rounded-md text-sm font-medium hover:bg-indigo-700 transition-colors shadow-sm"
            >
              Save Batch Settings
            </button>
          </div>
        </form>
      </Modal>

      {/* Delete Confirmation Modal */}
      <Modal isOpen={isDeleteConfirmationModalOpen} onClose={handleCancelDeleteStudent} title="Confirm Deletion">
        <div className="p-6">
          <p className="text-slate-600 text-sm mb-6">
            {getDeleteStudentConfirmationMessage()}
          </p>
          <div className="flex justify-end gap-3 pt-4 border-t border-slate-200">
            <button
              onClick={handleCancelDeleteStudent}
              className="px-4 py-2 bg-white border border-slate-300 rounded-md text-sm font-medium text-slate-700 hover:bg-slate-50 transition-colors shadow-sm"
            >
              Cancel
            </button>
            <button
              onClick={handleConfirmDeleteStudent}
              className="px-4 py-2 bg-red-600 text-white text-sm font-medium rounded-md hover:bg-red-700 transition-colors shadow-sm"
            >
              Delete Permanently
            </button>
          </div>
        </div>
      </Modal>

      {/* Global Confirmation Modal */}
      <ConfirmationModal
        isOpen={confirmationModal.isOpen}
        onClose={() => setConfirmationModal({ ...confirmationModal, isOpen: false })}
        onConfirm={confirmationModal.onConfirm}
        title={confirmationModal.title}
        message={confirmationModal.message}
        variant={confirmationModal.variant}
      />
    </div>
  );
}

export default AdminDashboard;