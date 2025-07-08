import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import { toast } from 'react-hot-toast';

// Heroicon Imports - Solid Icons
import {
    UserCircleIcon,
    AcademicCapIcon,
    ArrowRightOnRectangleIcon,
    CheckCircleIcon,
    XCircleIcon,
    CalendarDaysIcon,
    ClipboardDocumentCheckIcon,
    ClockIcon,
    LockClosedIcon,
    CheckIcon,
    TicketIcon // Added for general elective/course representation
} from '@heroicons/react/24/solid';


function StudentDashboard({ user, onLogout }) {
    const [availableCourses, setAvailableCourses] = useState([]);
    const [myEnrollments, setMyEnrollments] = useState([]);
    const [hasEnrolled, setHasEnrolled] = useState(false); // New state to track if student has enrolled in ANY course

    // Memoize config as it's a dependency in useCallback
    const config = useCallback(() => ({
        headers: {
            Authorization: `Bearer ${user?.token}`,
        },
    }), [user?.token]);

    // Fetch user's own enrollments
    const fetchMyEnrollments = useCallback(async () => {
        try {
            const res = await axios.get(`/api/courses/my-enrollments`, config()); // Use process.env.REACT_APP_BACKEND_URL
            setMyEnrollments(res.data);
            // Update hasEnrolled state: true if student has at least one enrollment
            setHasEnrolled(res.data.length > 0);
        } catch (error) {
            toast.error(error.response?.data?.message || 'Failed to fetch your enrollments');
        }
    }, [config]);

    // Fetch available courses (backend filters by student's batch)
    const fetchAvailableCourses = useCallback(async () => {
        try {
            const res = await axios.get(`/api/courses`, config()); // Use process.env.REACT_APP_BACKEND_URL
            setAvailableCourses(res.data);
        } catch (error) {
            toast.error(error.response?.data?.message || 'Failed to fetch available courses');
        }
    }, [config]);

    useEffect(() => {
        const loadStudentData = async () => {
            // Fetch user's own enrollments first to determine if they've already enrolled
            await fetchMyEnrollments();
            // Then fetch available courses, which will be filtered by batch by the backend
            await fetchAvailableCourses();
        };
        loadStudentData();
    }, [fetchMyEnrollments, fetchAvailableCourses]); // Dependencies are now the memoized functions

    const handleEnroll = async (courseId) => {
        // Frontend check: if student is already enrolled in ANY course, prevent further action
        if (hasEnrolled) {
            toast.error('You are already enrolled in a course. You can only enroll in one elective course.');
            return;
        }

        try {
            toast.loading("Enrolling...", { id: "enrollToast" });
            await axios.post(`/api/courses/${courseId}/enroll`, {}, config()); // Use process.env.REACT_APP_BACKEND_URL
            toast.success('Successfully enrolled in the course!', { id: "enrollToast" });
            setHasEnrolled(true); // Mark as enrolled globally for UI updates
            fetchAvailableCourses(); // Refresh courses to update enrollment counts/statuses
            fetchMyEnrollments(); // Refresh "My Enrollments" section
        } catch (error) {
            // Display specific error message from backend if available
            toast.error(error.response?.data?.message || 'Failed to enroll in course', { id: "enrollToast" });
            console.error("Enrollment error:", error.response?.data || error);
        }
    };

    return (
        <div className="min-h-screen bg-gray-50 p-4 sm:p-6 lg:p-8">
            <div className="max-w-7xl mx-auto">
                {/* Header Section */}
                <div className="flex justify-between items-center mb-6 bg-white p-4 rounded-lg shadow-sm">
                    <h1 className="text-3xl font-extrabold text-gray-900 flex items-center">
                        <UserCircleIcon className="w-8 h-8 mr-3 text-indigo-600" />
                        Student Dashboard
                    </h1>
                    <div className="flex items-center space-x-4">
                        <p className="text-lg text-gray-700">
                            Welcome, <span className="font-semibold text-indigo-700">{user?.name}</span> (Batch: <span className="font-semibold text-indigo-700">{user?.batch}</span>)
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

                {/* Available Courses for Student's Batch */}
                <div className="bg-white p-6 rounded-lg shadow-lg border border-gray-100 mb-8">
                    <h2 className="text-2xl font-bold text-gray-800 mb-5 flex items-center">
                        <AcademicCapIcon className="w-7 h-7 mr-3 text-blue-600" />
                        Available Elective Courses for your Batch ({user?.batch})
                    </h2>
                    {availableCourses.length === 0 ? (
                        <p className="text-gray-600 py-4 text-center">
                            No courses available for your batch at the moment, or enrollment has not yet opened. Please check back later.
                        </p>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="min-w-full divide-y divide-gray-200">
                                <thead className="bg-gray-50">
                                    <tr>
                                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Course Name</th>
                                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Intake</th>
                                        {/* Removed Enrolled count column as per request */}
                                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                                    </tr>
                                </thead>
                                <tbody className="bg-white divide-y divide-gray-200">
                                    {availableCourses.map((course) => {
                                        const isFull = course.enrolledStudentsCount >= course.intakeCapacity;
                                        // Ensure Date objects are created from potentially string dates
                                        const enrollmentOpenDate = course.enrollmentOpenTime ? new Date(course.enrollmentOpenTime) : null;
                                        const now = new Date(); // Current time in UTC (server-side accurate)

                                        const isEnrollmentOpenTimePassed = enrollmentOpenDate && now >= enrollmentOpenDate;
                                        const isEnrollmentActiveByAdmin = course.isEnrollmentActive;
                                        const isEnrolledByUserInThisCourse = myEnrollments.some(enrollment => enrollment.course._id === course._id);

                                        let statusText = '';
                                        let statusColor = 'text-gray-600';
                                        let buttonDisabled = false;
                                        let buttonText = 'Enroll';
                                        let buttonClass = 'bg-blue-600 hover:bg-blue-700';
                                        let buttonIcon = <CheckIcon className="w-4 h-4 mr-1" />;

                                        if (isEnrolledByUserInThisCourse) {
                                            statusText = 'Enrolled';
                                            statusColor = 'text-green-600 font-semibold';
                                            buttonText = 'Enrolled';
                                            buttonDisabled = true;
                                            buttonClass = 'bg-green-600 cursor-not-allowed';
                                            buttonIcon = <ClipboardDocumentCheckIcon className="w-4 h-4 mr-1" />;
                                        } else if (hasEnrolled) {
                                            statusText = 'Already Enrolled in another course'; // More specific message
                                            statusColor = 'text-orange-600 font-semibold';
                                            buttonDisabled = true;
                                            buttonClass = 'bg-gray-400 cursor-not-allowed';
                                            buttonIcon = <LockClosedIcon className="w-4 h-4 mr-1" />;
                                        } else if (isFull) { // Moved "Full" check up, as it's a hard stop
                                            statusText = 'Full';
                                            statusColor = 'text-red-600 font-semibold';
                                            buttonDisabled = true;
                                            buttonClass = 'bg-red-600 cursor-not-allowed';
                                            buttonIcon = <XCircleIcon className="w-4 h-4 mr-1" />;
                                        } else if (!isEnrollmentActiveByAdmin) {
                                            statusText = 'Closed by Admin';
                                            statusColor = 'text-red-600 font-semibold';
                                            buttonDisabled = true;
                                            buttonClass = 'bg-gray-400 cursor-not-allowed';
                                            buttonIcon = <LockClosedIcon className="w-4 h-4 mr-1" />;
                                        } else if (!enrollmentOpenDate) { // If enrollment time is not set
                                            statusText = 'Enrollment Not Scheduled';
                                            statusColor = 'text-gray-500';
                                            buttonDisabled = true;
                                            buttonClass = 'bg-gray-400 cursor-not-allowed';
                                            buttonIcon = <ClockIcon className="w-4 h-4 mr-1" />;
                                        } else if (!isEnrollmentOpenTimePassed) {
                                            // Enrollment is active by admin, but time hasn't arrived yet
                                            statusText = `Opens: ${new Date(course.enrollmentOpenTime).toLocaleString('en-IN', { dateStyle: 'short', timeStyle: 'short', timeZone: 'Asia/Kolkata' })}`;
                                            statusColor = 'text-yellow-700 font-medium';
                                            buttonDisabled = true;
                                            buttonClass = 'bg-yellow-600 cursor-not-allowed';
                                            buttonIcon = <ClockIcon className="w-4 h-4 mr-1" />;
                                        } else {
                                            // All conditions met: Enrollment is Open
                                            statusText = 'Open';
                                            statusColor = 'text-green-600 font-semibold';
                                            buttonIcon = <CheckIcon className="w-4 h-4 mr-1" />;
                                        }


                                        return (
                                            <tr key={course._id} className="hover:bg-gray-50">
                                                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 flex items-center">
                                                    <TicketIcon className="w-5 h-5 mr-2 text-indigo-500" />
                                                    {course.courseName}
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{course.intakeCapacity}</td>
                                                {/* Removed Enrolled count column */}
                                                <td className={`px-6 py-4 whitespace-nowrap text-sm ${statusColor}`}>{statusText}</td>
                                                <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                                                    <button
                                                        onClick={() => handleEnroll(course._id)}
                                                        disabled={buttonDisabled}
                                                        className={`flex items-center justify-center ${buttonClass} text-white font-semibold py-2 px-4 rounded-md text-sm shadow-sm transition duration-200 ease-in-out`}
                                                    >
                                                        {buttonIcon}
                                                        {buttonText}
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

                {/* My Enrolled Courses (will show max 1 course) */}
                <div className="bg-white p-6 rounded-lg shadow-lg border border-gray-100">
                    <h2 className="text-2xl font-bold text-gray-800 mb-5 flex items-center">
                        <ClipboardDocumentCheckIcon className="w-7 h-7 mr-3 text-purple-600" />
                        My Enrolled Course
                    </h2>
                    {myEnrollments.length === 0 ? (
                        <p className="text-gray-600 py-4 text-center">You are not currently enrolled in any elective courses.</p>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="min-w-full divide-y divide-gray-200">
                                <thead className="bg-gray-50">
                                    <tr>
                                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Course Name</th>
                                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Batch</th>
                                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Enrollment Date (IST)</th>
                                    </tr>
                                </thead>
                                <tbody className="bg-white divide-y divide-gray-200">
                                    {myEnrollments.map((enrollment) => (
                                        <tr key={enrollment._id} className="hover:bg-gray-50">
                                            <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 flex items-center">
                                                <AcademicCapIcon className="w-5 h-5 mr-2 text-indigo-500" />
                                                {enrollment.course.courseName}
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{enrollment.course.batch}</td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 flex items-center">
                                                <CalendarDaysIcon className="w-5 h-5 mr-2 text-gray-500" />
                                                {new Date(enrollment.enrollmentDate).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata', dateStyle: 'medium', timeStyle: 'short' })}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}

export default StudentDashboard;