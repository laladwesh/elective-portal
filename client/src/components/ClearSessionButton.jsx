import React from 'react';
import axios from 'axios';
import { toast } from 'react-hot-toast';
import { TrashIcon } from '@heroicons/react/24/solid'; // Using TrashIcon for this button too
import { courseAPI } from '../services/apiService';

/**
 * ClearSessionButton Component
 * A button that, when clicked, clears all courses and their associated enrollments.
 * It requires user confirmation and provides toast notifications for feedback.
 *
 * @param {object} props - Component props.
 * @param {object} props.user - The authenticated user object, containing the token.
 * @param {function} props.onSessionCleared - Callback function to be executed after a successful session clear.
 */
function ClearSessionButton({ user, onSessionCleared }) {

    const handleClearAllCourses = async () => {
        if (window.confirm("Are you absolutely sure you want to clear ALL courses and ALL student enrollments? This action cannot be undone!")) {
            try {
                toast.loading("Clearing all data...", { id: "clearSessionToast" });
                // Make a DELETE request to the new backend endpoint
                await courseAPI.clearAll({
                    headers: {
                        Authorization: `Bearer ${user?.token}`,
                    },
                });
                toast.success("All courses and enrollments cleared successfully!", { id: "clearSessionToast" });
                onSessionCleared(); // Notify parent component to refresh data
            } catch (error) {
                toast.error(error.response?.data?.message || "Failed to clear session.", { id: "clearSessionToast" });
                console.error("Error clearing session:", error.response?.data || error);
            }
        }
    };

    return (
        <button
            onClick={handleClearAllCourses}
            className="flex items-center justify-center px-6 py-4 bg-red-700 text-white font-semibold rounded-lg shadow-lg hover:bg-red-800 transition duration-300 ease-in-out"
        >
            <TrashIcon className="w-6 h-6 mr-3" />
            Clear All Courses & Enrollments
        </button>
    );
}

export default ClearSessionButton;