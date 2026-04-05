import React, { useState, useEffect, useCallback } from "react";
import { toast } from "react-hot-toast";
import { studentAPI } from '../services/apiService';
import { useNavigate } from "react-router-dom";

// Import components
import Modal from "../components/Modal";
import ConfirmationModal from "../components/ConfirmationModal";
import BulkUploadStudents from "../components/BulkUploadStudents";

// Heroicon Imports
import {
  UserPlusIcon,
  UserGroupIcon,
  ArrowLeftIcon,
  MagnifyingGlassIcon,
  PencilSquareIcon,
  TrashIcon,
  IdentificationIcon,
  EnvelopeIcon,
  TagIcon,
  ShieldCheckIcon,
  AcademicCapIcon,
} from "@heroicons/react/24/solid";

function UserManagement({ user }) {
  const navigate = useNavigate();
  const [allUsers, setAllUsers] = useState([]);
  const [activeTab, setActiveTab] = useState("students"); // 'students' or 'admins'
  const [activeBatchTab, setActiveBatchTab] = useState("");
  const [isLoadingUsers, setIsLoadingUsers] = useState(false);
  const [selectedUserIds, setSelectedUserIds] = useState([]);
  const [userSearchQuery, setUserSearchQuery] = useState("");

  // State for Add User Form
  const [newUser, setNewUser] = useState({
    name: "",
    email: "",
    batch: "",
    role: "student",
  });

  // State for Edit User Modal
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState(null);
  const [editFormData, setEditFormData] = useState({
    name: "",
    email: "",
    batch: "",
    role: "student",
  });

  // State for Confirmation Modal
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

  // Fetch all users
  const fetchAllUsers = useCallback(async () => {
    setIsLoadingUsers(true);
    try {
      const res = await studentAPI.getAll(config());
      setAllUsers(res.data);
      
      // Set initial active batch tab for students
      if (activeTab === "students") {
        const students = res.data.filter(u => u.role === 'student');
        const uniqueBatches = [...new Set(students.map(s => s.batch))].sort();
        if (uniqueBatches.length > 0 && !activeBatchTab) {
          setActiveBatchTab(uniqueBatches[0]);
        }
      }
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to fetch users");
    } finally {
      setIsLoadingUsers(false);
    }
  }, [config, activeTab, activeBatchTab]);

  useEffect(() => {
    fetchAllUsers();
  }, [fetchAllUsers]);

  // Handle new user input change
  const handleNewUserChange = (e) => {
    const { name, value } = e.target;
    setNewUser((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  // Handle add user
  const handleAddUser = async (e) => {
    e.preventDefault();
    
    // Validation
    if (newUser.role === 'student' && !newUser.batch) {
      toast.error("Batch year is required for students");
      return;
    }

    try {
      toast.loading("Adding user...", { id: "addUserToast" });
      await studentAPI.create(newUser, config());
      toast.success(`${newUser.role === 'student' ? 'Student' : 'Admin'} added successfully!`, { id: "addUserToast" });
      setNewUser({ name: "", email: "", batch: "", role: "student" });
      fetchAllUsers();
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to add user", {
        id: "addUserToast",
      });
    }
  };

  // Open edit modal
  const openEditModal = (userToEdit) => {
    setEditingUser(userToEdit);
    setEditFormData({
      name: userToEdit.name,
      email: userToEdit.email,
      batch: userToEdit.batch || "",
      role: userToEdit.role,
    });
    setIsEditModalOpen(true);
  };

  // Close edit modal
  const closeEditModal = () => {
    setIsEditModalOpen(false);
    setEditingUser(null);
    setEditFormData({
      name: "",
      email: "",
      batch: "",
      role: "student",
    });
  };

  // Handle edit form change
  const handleEditFormChange = (e) => {
    const { name, value } = e.target;
    setEditFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  // Handle update user
  const handleUpdateUser = async (e) => {
    e.preventDefault();
    if (!editingUser) return;

    // Validation
    if (editFormData.role === 'student' && !editFormData.batch) {
      toast.error("Batch year is required for students");
      return;
    }

    try {
      toast.loading("Updating user...", { id: "updateUserToast" });
      await studentAPI.update(editingUser._id, editFormData, config());
      toast.success("User updated successfully!", { id: "updateUserToast" });
      closeEditModal();
      fetchAllUsers();
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to update user", {
        id: "updateUserToast",
      });
    }
  };

  // Handle user checkbox change
  const handleUserCheckboxChange = (userId) => {
    setSelectedUserIds((prevSelected) =>
      prevSelected.includes(userId)
        ? prevSelected.filter((id) => id !== userId)
        : [...prevSelected, userId]
    );
  };

  // Handle select all users
  const handleSelectAllUsers = (e) => {
    const isChecked = e.target.checked;
    const usersInScope = activeTab === 'students' 
      ? (activeBatchTab ? usersByBatch[activeBatchTab] : [])
      : admins;
    const normalizedQuery = userSearchQuery.trim().toLowerCase();
    const usersToSelect = usersInScope.filter((u) => {
      if (!normalizedQuery) return true;
      const name = (u.name || "").toLowerCase();
      const email = (u.email || "").toLowerCase();
      return name.includes(normalizedQuery) || email.includes(normalizedQuery);
    });

    if (isChecked) {
      const allIds = usersToSelect.map(u => u._id);
      setSelectedUserIds(allIds);
    } else {
      setSelectedUserIds([]);
    }
  };

  const handleUserSearchChange = (e) => {
    setUserSearchQuery(e.target.value);
    setSelectedUserIds([]);
  };

  // Handle delete single user
  const handleDeleteUser = (userId, userName) => {
    setConfirmationModal({
      isOpen: true,
      title: 'Delete User',
      message: `Are you sure you want to delete "${userName}"? All associated enrollments will also be deleted. This action cannot be undone.`,
      variant: 'danger',
      onConfirm: async () => {
        try {
          toast.loading("Deleting user...", { id: "deleteUserToast" });
          await studentAPI.delete(userId, config());
          toast.success("User deleted successfully!", { id: "deleteUserToast" });
          fetchAllUsers();
        } catch (error) {
          toast.error(error.response?.data?.message || "Failed to delete user", {
            id: "deleteUserToast",
          });
        }
      }
    });
  };

  // Handle bulk delete
  const handleBulkDelete = () => {
    if (selectedUserIds.length === 0) {
      toast.error("Please select at least one user to delete");
      return;
    }

    setConfirmationModal({
      isOpen: true,
      title: 'Delete Selected Users',
      message: `Are you sure you want to delete ${selectedUserIds.length} selected user(s)? All associated enrollments will also be deleted. This action cannot be undone.`,
      variant: 'danger',
      onConfirm: async () => {
        try {
          toast.loading("Deleting users...", { id: "bulkDeleteToast" });
          await studentAPI.bulkDelete({
            ...config(),
            data: { ids: selectedUserIds },
          });
          toast.success(`${selectedUserIds.length} users deleted successfully!`, {
            id: "bulkDeleteToast",
          });
          setSelectedUserIds([]);
          fetchAllUsers();
        } catch (error) {
          toast.error(error.response?.data?.message || "Failed to delete users", {
            id: "bulkDeleteToast",
          });
        }
      }
    });
  };

  // Separate students and admins
  const students = allUsers.filter(u => u.role === 'student');
  const admins = allUsers.filter(u => u.role === 'admin');

  // Group students by batch
  const usersByBatch = students.reduce((acc, student) => {
    (acc[student.batch] = acc[student.batch] || []).push(student);
    return acc;
  }, {});

  const sortedBatches = Object.keys(usersByBatch).sort();

  // Check if all users in current view are selected
  const currentUsers = activeTab === 'students' 
    ? (activeBatchTab ? usersByBatch[activeBatchTab] : [])
    : admins;
  const normalizedSearchQuery = userSearchQuery.trim().toLowerCase();
  const filteredCurrentUsers = currentUsers.filter((currentUser) => {
    if (!normalizedSearchQuery) return true;

    const name = (currentUser.name || "").toLowerCase();
    const email = (currentUser.email || "").toLowerCase();
    return name.includes(normalizedSearchQuery) || email.includes(normalizedSearchQuery);
  });
  const areAllSelected =
    filteredCurrentUsers.length > 0 &&
    filteredCurrentUsers.every((u) => selectedUserIds.includes(u._id));

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Montserrat:wght@400;500;600;700;800&display=swap');

        .user-shell {
          --auth-bg: #efeee9;
          --auth-bg-deep: #e4e2dc;
          --auth-ink: #1f2428;
          --auth-muted: #5d676f;
          --auth-line: #d8d6cf;
          --auth-card: #fbfaf7;
          --auth-accent: #24546f;
          --auth-accent-soft: #d9e6ed;
          --auth-accent-strong: #1f465d;
          --auth-button-ink: #f7fbfd;

          position: relative;
          min-height: 100svh;
          color: var(--auth-ink);
          font-family: 'Montserrat', sans-serif;
          background:
            radial-gradient(1200px 800px at -10% -10%, #f7f6f2 0%, transparent 65%),
            radial-gradient(900px 550px at 110% 10%, #dfe6e2 0%, transparent 70%),
            linear-gradient(160deg, var(--auth-bg) 0%, var(--auth-bg-deep) 100%);
          overflow: hidden;
        }

        .user-shell::before {
          content: '';
          position: absolute;
          inset: 0;
          pointer-events: none;
          background-image:
            linear-gradient(to right, rgba(31, 36, 40, 0.03) 1px, transparent 1px),
            linear-gradient(to bottom, rgba(31, 36, 40, 0.03) 1px, transparent 1px);
          background-size: 34px 34px;
          mask-image: radial-gradient(circle at 45% 30%, black 10%, transparent 85%);
          z-index: 0;
        }

        .user-shell h1,
        .user-shell h2,
        .user-shell h3 {
          font-family: 'Montserrat', sans-serif;
          letter-spacing: -0.01em;
        }

        .user-fade-up {
          opacity: 0;
          animation: userFadeUp 650ms cubic-bezier(0.18, 0.68, 0.24, 0.98) forwards;
        }

        @keyframes userFadeUp {
          from {
            opacity: 0;
            transform: translateY(14px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        .user-surface {
          background: var(--auth-card);
          border: 1px solid var(--auth-line);
          box-shadow: 0 14px 42px rgba(31, 36, 40, 0.08);
        }

        .user-soft-surface {
          background: rgba(251, 250, 247, 0.72);
          border: 1px solid rgba(216, 214, 207, 0.85);
        }

        .user-shell .user-table thead tr {
          background: rgba(148, 163, 184, 0.12);
        }

        .user-shell .user-table tbody tr:hover {
          background: rgba(148, 163, 184, 0.07);
        }

        .user-shell [class*="bg-indigo-600"],
        .user-shell [class*="bg-blue-600"],
        .user-shell [class*="bg-purple-600"] {
          background-color: var(--auth-accent) !important;
        }

        .user-shell [class*="hover:bg-indigo-700"]:hover,
        .user-shell [class*="hover:bg-blue-700"]:hover,
        .user-shell [class*="hover:bg-purple-700"]:hover {
          background-color: var(--auth-accent-strong) !important;
        }

        .user-shell [class*="text-indigo-600"],
        .user-shell [class*="text-indigo-700"],
        .user-shell [class*="text-blue-600"],
        .user-shell [class*="text-purple-600"],
        .user-shell [class*="text-emerald-600"] {
          color: var(--auth-accent) !important;
        }

        .user-shell [class*="border-indigo-500"],
        .user-shell [class*="border-purple-500"] {
          border-color: var(--auth-accent) !important;
        }

        .user-shell [class*="bg-indigo-100"],
        .user-shell [class*="bg-blue-100"],
        .user-shell [class*="bg-purple-100"] {
          background-color: var(--auth-accent-soft) !important;
        }

        .user-shell [class*="focus:ring-indigo-500"]:focus,
        .user-shell [class*="focus:ring-purple-500"]:focus,
        .user-shell [class*="focus:ring-blue-500"]:focus {
          --tw-ring-color: rgba(36, 84, 111, 0.45) !important;
        }

        .user-shell [class*="focus:border-indigo-500"]:focus,
        .user-shell [class*="focus:border-purple-500"]:focus,
        .user-shell [class*="focus:border-blue-500"]:focus {
          border-color: var(--auth-accent) !important;
        }
      `}</style>

    <div className="user-shell px-4 py-4 sm:min-h-screen sm:px-6 sm:py-8 lg:px-8">
      <div className="pointer-events-none absolute -left-24 top-8 z-0 h-72 w-72 rounded-full border border-white/55 bg-white/20 blur-[2px]" aria-hidden="true" />
      <div className="pointer-events-none absolute -right-20 bottom-10 z-0 h-56 w-56 rounded-full border border-slate-400/20 bg-slate-300/20 blur-[1px]" aria-hidden="true" />

      <div className="relative z-10 mx-auto max-w-[1600px]">
        {/* Header */}
        <div className="user-fade-up user-surface mb-6 rounded-2xl p-5 sm:p-6" style={{ animationDelay: '60ms' }}>
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex items-start gap-3 sm:items-center">
              <button
                onClick={() => navigate('/admin')}
                className="mt-1 rounded-md border border-slate-300 bg-white p-2 text-slate-600 shadow-sm transition-colors hover:bg-slate-50 hover:text-slate-900 sm:mt-0"
              >
                <ArrowLeftIcon className="h-5 w-5" />
              </button>
              <div>
                <p className="inline-flex items-center rounded-full border border-slate-300/80 bg-slate-100/85 px-3 py-1 text-[11px] font-semibold tracking-[0.08em] text-slate-600">
                  PRASAD INSTITUTE OF MEDICAL SCIENCES
                </p>
                <h1 className="mt-3 text-3xl font-semibold text-slate-900 sm:text-4xl">User Management</h1>
                <p className="mt-2 text-sm text-slate-600 sm:text-base">
                  Manage students and admins with cleaner controls and fast bulk actions.
                </p>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <div className="user-soft-surface rounded-full px-4 py-2 text-sm text-slate-700">
                Total Users: <span className="font-semibold text-slate-900">{allUsers.length}</span>
              </div>
              <div className="user-soft-surface rounded-full px-4 py-2 text-sm text-slate-700">
                Students: <span className="font-semibold text-slate-900">{students.length}</span>
              </div>
              <div className="user-soft-surface rounded-full px-4 py-2 text-sm text-slate-700">
                Admins: <span className="font-semibold text-slate-900">{admins.length}</span>
              </div>
            </div>
          </div>
        </div>

        <div className="user-fade-up mb-8 grid grid-cols-1 gap-6 lg:grid-cols-3" style={{ animationDelay: '110ms' }}>
          {/* Add User Form */}
          <div className="user-surface rounded-2xl p-6">
            <h2 className="mb-5 flex items-center text-2xl font-semibold text-slate-900">
              <UserPlusIcon className="w-6 h-6 mr-3 text-purple-600" />
              Add New User
            </h2>
            <form onSubmit={handleAddUser} className="space-y-4">
              <div>
                <label htmlFor="role" className="block text-sm font-medium text-gray-700 mb-1">
                  User Role
                </label>
                <select
                  id="role"
                  name="role"
                  className="w-full rounded-md border border-slate-300 bg-white p-3 text-sm text-slate-700 shadow-sm transition duration-150 focus:ring-purple-500 focus:border-purple-500"
                  value={newUser.role}
                  onChange={handleNewUserChange}
                  required
                >
                  <option value="student">Student</option>
                  <option value="admin">Admin</option>
                </select>
              </div>
              <div>
                <label htmlFor="userName" className="block text-sm font-medium text-gray-700 mb-1">
                  Name
                </label>
                <input
                  type="text"
                  id="userName"
                  name="name"
                  placeholder="e.g., John Doe"
                  className="w-full rounded-md border border-slate-300 bg-white p-3 text-sm text-slate-700 shadow-sm transition duration-150 focus:ring-purple-500 focus:border-purple-500"
                  value={newUser.name}
                  onChange={handleNewUserChange}
                  required
                />
              </div>
              <div>
                <label htmlFor="userEmail" className="block text-sm font-medium text-gray-700 mb-1">
                  Email
                </label>
                <input
                  type="email"
                  id="userEmail"
                  name="email"
                  placeholder="e.g., john.doe@example.com"
                  className="w-full rounded-md border border-slate-300 bg-white p-3 text-sm text-slate-700 shadow-sm transition duration-150 focus:ring-purple-500 focus:border-purple-500"
                  value={newUser.email}
                  onChange={handleNewUserChange}
                  required
                />
              </div>
              {newUser.role === 'student' && (
                <div>
                  <label htmlFor="userBatch" className="block text-sm font-medium text-gray-700 mb-1">
                    Batch Year
                  </label>
                  <input
                    type="text"
                    id="userBatch"
                    name="batch"
                    placeholder="e.g., 2020"
                    className="w-full rounded-md border border-slate-300 bg-white p-3 text-sm text-slate-700 shadow-sm transition duration-150 focus:ring-purple-500 focus:border-purple-500"
                    value={newUser.batch}
                    onChange={handleNewUserChange}
                    required={newUser.role === 'student'}
                  />
                </div>
              )}
              <button
                type="submit"
                className="w-full inline-flex items-center justify-center rounded-md bg-purple-600 px-6 py-3 text-sm font-semibold text-white shadow-sm transition duration-300 ease-in-out hover:bg-purple-700"
              >
                <UserPlusIcon className="h-5 w-5 mr-2" />
                Add User
              </button>
            </form>

            {/* Bulk Upload Component */}
            <div className="mt-6 border-t border-slate-200 pt-6">
              <BulkUploadStudents
                user={user}
                config={config}
                onUploadSuccess={fetchAllUsers}
              />
            </div>
          </div>

          {/* User Statistics */}
          <div className="user-surface lg:col-span-2 rounded-2xl p-6">
            <h2 className="mb-5 text-2xl font-semibold text-slate-900">User Statistics</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="user-soft-surface rounded-xl p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="mb-1 text-sm font-medium text-slate-600">Total Students</p>
                    <p className="text-3xl font-semibold text-slate-900">{students.length}</p>
                  </div>
                  <AcademicCapIcon className="h-10 w-10 text-indigo-600 opacity-50" />
                </div>
              </div>
              <div className="user-soft-surface rounded-xl p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="mb-1 text-sm font-medium text-slate-600">Total Admins</p>
                    <p className="text-3xl font-semibold text-slate-900">{admins.length}</p>
                  </div>
                  <ShieldCheckIcon className="h-10 w-10 text-indigo-600 opacity-50" />
                </div>
              </div>
              {sortedBatches.length > 0 && (
                <div className="user-soft-surface md:col-span-2 rounded-xl p-6">
                  <p className="mb-3 text-sm font-medium text-slate-600">Students by Batch</p>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    {sortedBatches.map(batch => (
                      <div key={batch} className="rounded-lg border border-slate-200 bg-white/75 p-3 text-center">
                        <p className="text-xs text-slate-600">Batch {batch}</p>
                        <p className="text-xl font-semibold text-slate-900">{usersByBatch[batch].length}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Users List */}
        <div className="user-fade-up user-surface rounded-2xl p-6" style={{ animationDelay: '160ms' }}>
          <h2 className="mb-5 flex items-center text-2xl font-semibold text-slate-900">
            <UserGroupIcon className="w-6 h-6 mr-3 text-emerald-600" />
            All Users
          </h2>

          {isLoadingUsers ? (
            <div className="py-8 text-center text-slate-600">Loading users...</div>
          ) : allUsers.length === 0 ? (
            <p className="py-4 text-center text-slate-600">No users found.</p>
          ) : (
            <div>
              {/* Main Tabs: Students / Admins */}
              <div className="mb-6 border-b border-slate-200">
                <nav className="-mb-px flex space-x-8 overflow-x-auto" aria-label="Tabs">
                  <button
                    onClick={() => {
                      setActiveTab('students');
                      setSelectedUserIds([]);
                      if (sortedBatches.length > 0) {
                        setActiveBatchTab(sortedBatches[0]);
                      }
                    }}
                    className={`${
                      activeTab === 'students'
                        ? "border-indigo-500 text-indigo-600"
                        : "border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700"
                    } flex items-center whitespace-nowrap border-b-2 px-1 py-4 text-sm font-medium transition duration-150`}
                  >
                    <AcademicCapIcon className="w-5 h-5 mr-2" />
                    Students ({students.length})
                  </button>
                  <button
                    onClick={() => {
                      setActiveTab('admins');
                      setSelectedUserIds([]);
                      setActiveBatchTab('');
                    }}
                    className={`${
                      activeTab === 'admins'
                        ? "border-indigo-500 text-indigo-600"
                        : "border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700"
                    } flex items-center whitespace-nowrap border-b-2 px-1 py-4 text-sm font-medium transition duration-150`}
                  >
                    <ShieldCheckIcon className="w-5 h-5 mr-2" />
                    Admins ({admins.length})
                  </button>
                </nav>
              </div>

              {/* Search */}
              <div className="mb-4">
                <label htmlFor="userSearch" className="sr-only">Search users by name or email</label>
                <div className="relative">
                  <MagnifyingGlassIcon className="w-5 h-5 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    id="userSearch"
                    type="text"
                    value={userSearchQuery}
                    onChange={handleUserSearchChange}
                    placeholder="Search by name or email"
                    className="w-full rounded-md border border-slate-300 bg-white py-2 pl-10 pr-3 text-sm text-slate-700 shadow-sm md:w-96 focus:ring-indigo-500 focus:border-indigo-500"
                  />
                </div>
              </div>

              {/* Students View with Batch Tabs */}
              {activeTab === 'students' && sortedBatches.length > 0 && (
                <div>
                  <div className="mb-6 border-b border-slate-200">
                    <nav className="-mb-px flex space-x-8 overflow-x-auto" aria-label="Batch Tabs">
                      {sortedBatches.map((batch) => (
                        <button
                          key={batch}
                          onClick={() => {
                            setActiveBatchTab(batch);
                            setSelectedUserIds([]);
                          }}
                          className={`${
                            activeBatchTab === batch
                              ? "border-purple-500 text-purple-600"
                              : "border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700"
                          } whitespace-nowrap border-b-2 px-1 py-4 text-sm font-medium transition duration-150`}
                        >
                          Batch {batch} ({usersByBatch[batch].length})
                        </button>
                      ))}
                    </nav>
                  </div>
                </div>
              )}

              {/* Action Buttons */}
              {filteredCurrentUsers.length > 0 && (
                <div className="flex justify-end mb-4">
                  {selectedUserIds.length > 0 && (
                    <button
                      onClick={handleBulkDelete}
                      className="inline-flex items-center rounded-md border border-red-300 bg-red-50 px-4 py-2 text-sm font-semibold text-red-700 shadow-sm transition duration-300 ease-in-out hover:bg-red-100"
                    >
                      <TrashIcon className="mr-2 h-5 w-5" />
                      Delete Selected ({selectedUserIds.length})
                    </button>
                  )}
                </div>
              )}

              {/* Users Table */}
              {filteredCurrentUsers.length > 0 ? (
                <div className="overflow-x-auto">
                  <table className="user-table min-w-full divide-y divide-slate-200">
                    <thead>
                      <tr>
                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-slate-600">
                          <input
                            type="checkbox"
                            className="h-4 w-4 text-indigo-600 border-gray-300 rounded focus:ring-indigo-500"
                            checked={areAllSelected}
                            onChange={handleSelectAllUsers}
                          />
                        </th>
                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-slate-600">
                          Name
                        </th>
                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-slate-600">
                          Email
                        </th>
                        {activeTab === 'students' && (
                          <th scope="col" className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-slate-600">
                            Batch
                          </th>
                        )}
                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-slate-600">
                          Role
                        </th>
                        <th scope="col" className="px-6 py-3 text-right text-xs font-medium uppercase tracking-wider text-slate-600">
                          Actions
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200 bg-white/85">
                      {filteredCurrentUsers.map((currentUser) => (
                        <tr key={currentUser._id}>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <input
                              type="checkbox"
                              className="h-4 w-4 text-indigo-600 border-gray-300 rounded focus:ring-indigo-500"
                              checked={selectedUserIds.includes(currentUser._id)}
                              onChange={() => handleUserCheckboxChange(currentUser._id)}
                            />
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-slate-900">
                            <div className="flex items-center">
                              <IdentificationIcon className="mr-2 h-4 w-4 text-slate-500" />
                              <span>{currentUser.name}</span>
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-600">
                            <div className="flex items-center">
                              <EnvelopeIcon className="mr-2 h-4 w-4 text-slate-500" />
                              <span>{currentUser.email}</span>
                            </div>
                          </td>
                          {activeTab === 'students' && (
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-600">
                              <div className="flex items-center">
                                <TagIcon className="mr-2 h-4 w-4 text-slate-500" />
                                <span>{currentUser.batch}</span>
                              </div>
                            </td>
                          )}
                          <td className="px-6 py-4 whitespace-nowrap text-sm">
                            <span className={`inline-flex rounded-full px-2 py-1 text-xs font-semibold leading-5 ${
                              currentUser.role === 'admin' 
                                ? 'bg-purple-100 text-slate-800 border border-slate-300' 
                                : 'bg-blue-100 text-slate-700 border border-slate-300'
                            }`}>
                              {currentUser.role}
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                            <button
                              onClick={() => openEditModal(currentUser)}
                              className="mr-4 text-indigo-600 hover:text-indigo-900"
                              title="Edit User"
                            >
                              <PencilSquareIcon className="w-5 h-5 inline" />
                            </button>
                            <button
                              onClick={() => handleDeleteUser(currentUser._id, currentUser.name)}
                              className="text-red-600 hover:text-red-900"
                              title="Delete User"
                            >
                              <TrashIcon className="w-5 h-5 inline" />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <p className="py-4 text-center text-slate-600">
                  {userSearchQuery.trim()
                    ? (activeTab === 'students' ? 'No matching students found.' : 'No matching admins found.')
                    : (activeTab === 'students' ? 'No students found in this batch.' : 'No admins found.')}
                </p>
              )}
            </div>
          )}
        </div>

        {/* Edit User Modal */}
        <Modal
          isOpen={isEditModalOpen}
          onClose={closeEditModal}
          title={`Edit User: ${editingUser?.name}`}
        >
          {editingUser && (
            <form onSubmit={handleUpdateUser} className="space-y-4 p-4">
              <div>
                <label htmlFor="editRole" className="mb-1 block text-sm font-medium text-slate-700">
                  User Role
                </label>
                <select
                  id="editRole"
                  name="role"
                  className="w-full rounded-md border border-slate-300 bg-white p-3 text-sm text-slate-700 shadow-sm transition duration-150 focus:ring-blue-500 focus:border-blue-500"
                  value={editFormData.role}
                  onChange={handleEditFormChange}
                  required
                >
                  <option value="student">Student</option>
                  <option value="admin">Admin</option>
                </select>
              </div>
              <div>
                <label htmlFor="editName" className="mb-1 block text-sm font-medium text-slate-700">
                  Name
                </label>
                <input
                  type="text"
                  name="name"
                  id="editName"
                  className="w-full rounded-md border border-slate-300 bg-white p-3 text-sm text-slate-700 shadow-sm transition duration-150 focus:ring-blue-500 focus:border-blue-500"
                  value={editFormData.name}
                  onChange={handleEditFormChange}
                  required
                />
              </div>
              <div>
                <label htmlFor="editEmail" className="mb-1 block text-sm font-medium text-slate-700">
                  Email
                </label>
                <input
                  type="email"
                  name="email"
                  id="editEmail"
                  className="w-full rounded-md border border-slate-300 bg-white p-3 text-sm text-slate-700 shadow-sm transition duration-150 focus:ring-blue-500 focus:border-blue-500"
                  value={editFormData.email}
                  onChange={handleEditFormChange}
                  required
                />
              </div>
              {editFormData.role === 'student' && (
                <div>
                  <label htmlFor="editBatch" className="mb-1 block text-sm font-medium text-slate-700">
                    Batch Year
                  </label>
                  <input
                    type="text"
                    name="batch"
                    id="editBatch"
                    className="w-full rounded-md border border-slate-300 bg-white p-3 text-sm text-slate-700 shadow-sm transition duration-150 focus:ring-blue-500 focus:border-blue-500"
                    value={editFormData.batch}
                    onChange={handleEditFormChange}
                    required={editFormData.role === 'student'}
                  />
                </div>
              )}
              <button
                type="submit"
                className="mt-6 inline-flex w-full items-center justify-center rounded-md bg-blue-600 px-6 py-3 text-sm font-semibold text-white shadow-sm transition duration-300 ease-in-out hover:bg-blue-700"
              >
                <PencilSquareIcon className="mr-2 h-5 w-5" />
                Save Changes
              </button>
            </form>
          )}
        </Modal>

        {/* Confirmation Modal */}
        <ConfirmationModal
          isOpen={confirmationModal.isOpen}
          onClose={() => setConfirmationModal({ ...confirmationModal, isOpen: false })}
          onConfirm={confirmationModal.onConfirm}
          title={confirmationModal.title}
          message={confirmationModal.message}
          variant={confirmationModal.variant}
        />
      </div>
    </div>
    </>
  );
}

export default UserManagement;
