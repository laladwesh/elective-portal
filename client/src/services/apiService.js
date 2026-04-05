import axios from 'axios';

// ========================================
// API BASE URL CONFIGURATION
// ========================================
// In development: use '/api' (proxy forwards to backend)
// In production: use '/elective/api' (reverse proxy strips '/elective' prefix)
const API_BASE_PATH = process.env.NODE_ENV === 'production' 
  ? '/elective/api' 
  : '/api';

// ========================================
// AUTHENTICATION ENDPOINTS
// ========================================

export const authAPI = {
  /**
   * Get the Google OAuth login URL
   * @returns {string} The full URL to redirect to for Google OAuth
   */
  getGoogleAuthUrl: () => {
    if (process.env.NODE_ENV === 'development') {
      return `http://localhost:5000/api/auth/google`;
    }
    return `${API_BASE_PATH}/auth/google`;
  },
};

// ========================================
// COURSE ENDPOINTS
// ========================================

export const courseAPI = {
  /**
   * Get all courses
   * @param {object} config - Axios config with auth headers
   */
  getAll: (config) => axios.get(`${API_BASE_PATH}/courses`, config),

  /**
   * Create batch courses
   * @param {object} data - Course batch data
   * @param {object} config - Axios config with auth headers
   */
  createBatchCourses: (data, config) => axios.post(`${API_BASE_PATH}/courses/batch-courses`, data, config),

  /**
   * Update a course by ID
   * @param {string} courseId - Course ID
   * @param {object} data - Updated course data
   * @param {object} config - Axios config with auth headers
   */
  update: (courseId, data, config) => axios.put(`${API_BASE_PATH}/courses/${courseId}`, data, config),

  /**
   * Delete courses in bulk
   * @param {object} config - Axios config with auth headers and data
   */
  bulkDelete: (config) => axios.delete(`${API_BASE_PATH}/courses/bulk-delete`, config),

  /**
   * Clear all courses and enrollments
   * @param {object} config - Axios config with auth headers
   */
  clearAll: (config) => axios.delete(`${API_BASE_PATH}/courses/clear-all`, config),

  /**
   * Get course enrollments
   * @param {string} courseId - Course ID
   * @param {object} config - Axios config with auth headers
   */
  getEnrollments: (courseId, config) => axios.get(`${API_BASE_PATH}/courses/${courseId}/enrollments`, config),

  /**
   * Get my enrollments (student's own enrollments)
   * @param {object} config - Axios config with auth headers
   */
  getMyEnrollments: (config) => axios.get(`${API_BASE_PATH}/courses/my-enrollments`, config),

  /**
   * Enroll in a course
   * @param {string} courseId - Course ID
   * @param {object} data - Enrollment data
   * @param {object} config - Axios config with auth headers
   */
  enroll: (courseId, data, config) => axios.post(`${API_BASE_PATH}/courses/${courseId}/enroll`, data, config),

  /**
   * Get all batches
   * @param {object} config - Axios config with auth headers
   */
  getBatches: (config) => axios.get(`${API_BASE_PATH}/courses/batches`, config),

  /**
   * Get enrollment statistics
   * @param {object} config - Axios config with auth headers
   */
  getEnrollmentStats: (config) => axios.get(`${API_BASE_PATH}/courses/enrollment-stats`, config),

  /**
   * Get unenrolled students by batch
   * @param {string} batch - Batch year/number
   * @param {object} config - Axios config with auth headers
   */
  getUnenrolledStudents: (batch, config) => axios.get(`${API_BASE_PATH}/courses/unenrolled-students/${batch}`, config),

  /**
   * Get all enrollment details for reports
   * @param {object} config - Axios config with auth headers
   */
  getAllDetails: (config) => axios.get(`${API_BASE_PATH}/courses/all-details`, config),

  /**
   * Close enrollment for all courses in a specific batch
   * @param {string} batch - Batch year/number
   * @param {object} config - Axios config with auth headers
   */
  closeBatchEnrollment: (batch, config) => axios.put(`${API_BASE_PATH}/courses/close-batch-enrollment`, { batch }, config),

  /**
    * Set enrollment settings for all courses in a batch block
    * @param {object} data - { batch, block, enrollmentOpenTime, isEnrollmentActive }
   * @param {object} config - Axios config with auth headers
   */
  setBatchEnrollment: (data, config) => axios.put(`${API_BASE_PATH}/courses/set-batch-enrollment`, data, config),
};

// ========================================
// STUDENT ENDPOINTS
// ========================================

export const studentAPI = {
  /**
   * Get all students
   * @param {object} config - Axios config with auth headers
   */
  getAll: (config) => axios.get(`${API_BASE_PATH}/students`, config),

  /**
   * Create a new student
   * @param {object} data - Student data
   * @param {object} config - Axios config with auth headers
   */
  create: (data, config) => axios.post(`${API_BASE_PATH}/students`, data, config),

  /**
   * Update a student by ID
   * @param {string} studentId - Student ID
   * @param {object} data - Updated student data
   * @param {object} config - Axios config with auth headers
   */
  update: (studentId, data, config) => axios.put(`${API_BASE_PATH}/students/${studentId}`, data, config),

  /**
   * Bulk upload students via Excel file
   * @param {FormData} formData - Form data containing the Excel file
   * @param {object} config - Axios config with auth headers
   */
  bulkUpload: (formData, config) => axios.post(`${API_BASE_PATH}/students/bulk-upload`, formData, config),

  /**
   * Delete a student by ID
   * @param {string} studentId - Student ID
   * @param {object} config - Axios config with auth headers
   */
  delete: (studentId, config) => axios.delete(`${API_BASE_PATH}/students/${studentId}`, config),

  /**
   * Delete students in bulk
   * @param {object} config - Axios config with auth headers and data
   */
  bulkDelete: (config) => axios.delete(`${API_BASE_PATH}/students/bulk-delete`, config),
};

// ========================================
// HELPER FUNCTION
// ========================================

/**
 * Get the API base path (useful for debugging or displaying info)
 * @returns {string} The current API base path
 */
export const getApiBasePath = () => API_BASE_PATH;
