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
      toast.error("Batch is required for students");
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
      toast.error("Batch is required for students");
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
    const currentUsers = activeTab === 'students' 
      ? (activeBatchTab ? usersByBatch[activeBatchTab] : [])
      : admins;

    if (isChecked) {
      const allIds = currentUsers.map(u => u._id);
      setSelectedUserIds(allIds);
    } else {
      setSelectedUserIds([]);
    }
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
  const areAllSelected = currentUsers.length > 0 && currentUsers.every(u => selectedUserIds.includes(u._id));

  return (
    <div className="min-h-screen bg-gray-50 p-4 sm:p-6 lg:p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex justify-between items-center mb-6 bg-white p-4 rounded-lg shadow-sm">
          <div className="flex items-center">
            <button
              onClick={() => navigate('/admin')}
              className="mr-4 p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition"
            >
              <ArrowLeftIcon className="w-6 h-6" />
            </button>
            <h1 className="text-3xl font-extrabold text-gray-900 flex items-center">
              <UserGroupIcon className="w-8 h-8 mr-3 text-indigo-600" />
              User Management
            </h1>
          </div>
          <div className="flex items-center space-x-4">
            <p className="text-lg text-gray-700">
              Total Users: <span className="font-semibold text-indigo-700">{allUsers.length}</span>
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
          {/* Add User Form */}
          <div className="bg-white p-6 rounded-lg shadow-lg border border-gray-100">
            <h2 className="text-2xl font-bold text-gray-800 mb-5 flex items-center">
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
                  className="w-full p-3 border border-gray-300 rounded-md focus:ring-purple-500 focus:border-purple-500 transition duration-150"
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
                  className="w-full p-3 border border-gray-300 rounded-md focus:ring-purple-500 focus:border-purple-500 transition duration-150"
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
                  className="w-full p-3 border border-gray-300 rounded-md focus:ring-purple-500 focus:border-purple-500 transition duration-150"
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
                    className="w-full p-3 border border-gray-300 rounded-md focus:ring-purple-500 focus:border-purple-500 transition duration-150"
                    value={newUser.batch}
                    onChange={handleNewUserChange}
                    required={newUser.role === 'student'}
                  />
                </div>
              )}
              <button
                type="submit"
                className="w-full flex items-center justify-center px-6 py-3 bg-purple-600 text-white font-semibold rounded-lg shadow-lg hover:bg-purple-700 transition duration-300 ease-in-out"
              >
                <UserPlusIcon className="w-6 h-6 mr-3" />
                Add User
              </button>
            </form>

            {/* Bulk Upload Component */}
            <div className="mt-6 pt-6 border-t border-gray-200">
              <BulkUploadStudents
                user={user}
                config={config}
                onUploadSuccess={fetchAllUsers}
              />
            </div>
          </div>

          {/* User Statistics */}
          <div className="lg:col-span-2 bg-white p-6 rounded-lg shadow-lg border border-gray-100">
            <h2 className="text-2xl font-bold text-gray-800 mb-5">User Statistics</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="bg-gradient-to-br from-blue-50 to-blue-100 p-6 rounded-lg border border-blue-200">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-blue-600 mb-1">Total Students</p>
                    <p className="text-3xl font-bold text-blue-900">{students.length}</p>
                  </div>
                  <AcademicCapIcon className="w-12 h-12 text-blue-500 opacity-50" />
                </div>
              </div>
              <div className="bg-gradient-to-br from-purple-50 to-purple-100 p-6 rounded-lg border border-purple-200">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-purple-600 mb-1">Total Admins</p>
                    <p className="text-3xl font-bold text-purple-900">{admins.length}</p>
                  </div>
                  <ShieldCheckIcon className="w-12 h-12 text-purple-500 opacity-50" />
                </div>
              </div>
              {sortedBatches.length > 0 && (
                <div className="md:col-span-2 bg-gradient-to-br from-green-50 to-green-100 p-6 rounded-lg border border-green-200">
                  <p className="text-sm font-medium text-green-600 mb-3">Students by Batch</p>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    {sortedBatches.map(batch => (
                      <div key={batch} className="bg-white/70 p-3 rounded text-center">
                        <p className="text-xs text-gray-600">Batch {batch}</p>
                        <p className="text-xl font-bold text-green-900">{usersByBatch[batch].length}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Users List */}
        <div className="bg-white p-6 rounded-lg shadow-lg border border-gray-100">
          <h2 className="text-2xl font-bold text-gray-800 mb-5 flex items-center">
            <UserGroupIcon className="w-6 h-6 mr-3 text-emerald-600" />
            All Users
          </h2>

          {isLoadingUsers ? (
            <div className="text-center py-8 text-indigo-600">Loading users...</div>
          ) : allUsers.length === 0 ? (
            <p className="text-gray-600 text-center py-4">No users found.</p>
          ) : (
            <div>
              {/* Main Tabs: Students / Admins */}
              <div className="border-b border-gray-200 mb-6">
                <nav className="-mb-px flex space-x-8" aria-label="Tabs">
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
                    } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm transition duration-150 flex items-center`}
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
                    } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm transition duration-150 flex items-center`}
                  >
                    <ShieldCheckIcon className="w-5 h-5 mr-2" />
                    Admins ({admins.length})
                  </button>
                </nav>
              </div>

              {/* Students View with Batch Tabs */}
              {activeTab === 'students' && sortedBatches.length > 0 && (
                <div>
                  <div className="border-b border-gray-200 mb-6">
                    <nav className="-mb-px flex space-x-8" aria-label="Batch Tabs">
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
                          } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm transition duration-150`}
                        >
                          Batch {batch} ({usersByBatch[batch].length})
                        </button>
                      ))}
                    </nav>
                  </div>
                </div>
              )}

              {/* Action Buttons */}
              {currentUsers.length > 0 && (
                <div className="flex justify-end mb-4">
                  {selectedUserIds.length > 0 && (
                    <button
                      onClick={handleBulkDelete}
                      className="flex items-center px-4 py-2 bg-red-600 text-white font-semibold rounded-lg shadow-md hover:bg-red-700 transition duration-300 ease-in-out"
                    >
                      <TrashIcon className="w-5 h-5 mr-2" />
                      Delete Selected ({selectedUserIds.length})
                    </button>
                  )}
                </div>
              )}

              {/* Users Table */}
              {currentUsers.length > 0 ? (
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          <input
                            type="checkbox"
                            className="h-4 w-4 text-indigo-600 border-gray-300 rounded focus:ring-indigo-500"
                            checked={areAllSelected}
                            onChange={handleSelectAllUsers}
                          />
                        </th>
                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Name
                        </th>
                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Email
                        </th>
                        {activeTab === 'students' && (
                          <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Batch
                          </th>
                        )}
                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Role
                        </th>
                        <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Actions
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {currentUsers.map((currentUser) => (
                        <tr key={currentUser._id} className="hover:bg-gray-50">
                          <td className="px-6 py-4 whitespace-nowrap">
                            <input
                              type="checkbox"
                              className="h-4 w-4 text-indigo-600 border-gray-300 rounded focus:ring-indigo-500"
                              checked={selectedUserIds.includes(currentUser._id)}
                              onChange={() => handleUserCheckboxChange(currentUser._id)}
                            />
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                            <div className="flex items-center">
                              <IdentificationIcon className="w-4 h-4 mr-2 text-gray-500" />
                              <span>{currentUser.name}</span>
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            <div className="flex items-center">
                              <EnvelopeIcon className="w-4 h-4 mr-2 text-gray-500" />
                              <span>{currentUser.email}</span>
                            </div>
                          </td>
                          {activeTab === 'students' && (
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                              <div className="flex items-center">
                                <TagIcon className="w-4 h-4 mr-2 text-gray-500" />
                                <span>{currentUser.batch}</span>
                              </div>
                            </td>
                          )}
                          <td className="px-6 py-4 whitespace-nowrap text-sm">
                            <span className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${
                              currentUser.role === 'admin' 
                                ? 'bg-purple-100 text-purple-800' 
                                : 'bg-blue-100 text-blue-800'
                            }`}>
                              {currentUser.role}
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                            <button
                              onClick={() => openEditModal(currentUser)}
                              className="text-indigo-600 hover:text-indigo-900 mr-4"
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
                <p className="text-gray-600 text-center py-4">
                  {activeTab === 'students' ? 'No students found in this batch.' : 'No admins found.'}
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
                <label htmlFor="editRole" className="block text-sm font-medium text-gray-700 mb-1">
                  User Role
                </label>
                <select
                  id="editRole"
                  name="role"
                  className="w-full p-3 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500 transition duration-150"
                  value={editFormData.role}
                  onChange={handleEditFormChange}
                  required
                >
                  <option value="student">Student</option>
                  <option value="admin">Admin</option>
                </select>
              </div>
              <div>
                <label htmlFor="editName" className="block text-sm font-medium text-gray-700 mb-1">
                  Name
                </label>
                <input
                  type="text"
                  name="name"
                  id="editName"
                  className="w-full p-3 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500 transition duration-150"
                  value={editFormData.name}
                  onChange={handleEditFormChange}
                  required
                />
              </div>
              <div>
                <label htmlFor="editEmail" className="block text-sm font-medium text-gray-700 mb-1">
                  Email
                </label>
                <input
                  type="email"
                  name="email"
                  id="editEmail"
                  className="w-full p-3 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500 transition duration-150"
                  value={editFormData.email}
                  onChange={handleEditFormChange}
                  required
                />
              </div>
              {editFormData.role === 'student' && (
                <div>
                  <label htmlFor="editBatch" className="block text-sm font-medium text-gray-700 mb-1">
                    Batch
                  </label>
                  <input
                    type="text"
                    name="batch"
                    id="editBatch"
                    className="w-full p-3 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500 transition duration-150"
                    value={editFormData.batch}
                    onChange={handleEditFormChange}
                    required={editFormData.role === 'student'}
                  />
                </div>
              )}
              <button
                type="submit"
                className="w-full flex items-center justify-center px-6 py-3 bg-blue-600 text-white font-semibold rounded-lg shadow-lg hover:bg-blue-700 transition duration-300 ease-in-out mt-6"
              >
                <PencilSquareIcon className="w-5 h-5 mr-2" />
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
  );
}

export default UserManagement;
