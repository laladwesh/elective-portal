import React, { useState, useCallback } from 'react';
import axios from 'axios';
import { toast } from 'react-hot-toast';
import * as XLSX from 'xlsx';
import { saveAs } from 'file-saver';
import { CloudArrowUpIcon, DocumentArrowDownIcon } from '@heroicons/react/24/solid'; // Icons

/**
 * BulkUploadStudents Component
 * Allows administrators to upload student data via an Excel file.
 * The Excel file should have 'Name', 'Email', and 'Batch' columns.
 *
 * @param {object} props - Component props.
 * @param {object} props.user - The authenticated user object, containing the token.
 * @param {function} props.config - Memoized Axios config for authenticated requests.
 * @param {function} props.onUploadSuccess - Callback function to refresh student list after successful upload.
 */
function BulkUploadStudents({ user, config, onUploadSuccess }) {
    const [selectedFile, setSelectedFile] = useState(null);
    const [isUploading, setIsUploading] = useState(false);

    // Handle file selection
    const handleFileChange = (event) => {
        const file = event.target.files[0];
        if (file && (file.type === "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" || file.type === "application/vnd.ms-excel")) {
            setSelectedFile(file);
        } else {
            setSelectedFile(null);
            toast.error("Please select a valid Excel file (.xlsx or .xls).");
        }
    };

    // Handle the upload process
    const handleUpload = async () => {
        if (!selectedFile) {
            toast.error("Please select an Excel file to upload.");
            return;
        }

        setIsUploading(true);
        toast.loading("Uploading students...", { id: "bulkUploadToast" });

        const formData = new FormData();
        formData.append("excelFile", selectedFile); // 'excelFile' must match the backend's multer field name

        try {
            const res = await axios.post('/api/students/bulk-upload', formData, {
                headers: {
                    'Content-Type': 'multipart/form-data', // Important for file uploads
                    ...config().headers, // Include authorization token
                },
            });

            toast.success(res.data.message || "Students uploaded successfully!", { id: "bulkUploadToast" });
            setSelectedFile(null); // Clear selected file
            if (onUploadSuccess) {
                onUploadSuccess(); // Trigger refresh of student list in AdminDashboard
            }
        } catch (error) {
            toast.error(error.response?.data?.message || "Failed to upload students.", { id: "bulkUploadToast" });
            console.error("Bulk upload error:", error.response?.data || error);
        } finally {
            setIsUploading(false);
        }
    };

    // Handle downloading the Excel template
    const handleDownloadTemplate = useCallback(() => {
        const ws = XLSX.utils.aoa_to_sheet([["Name", "Email", "Batch"]]);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, "StudentTemplate");
        const wbout = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
        saveAs(new Blob([wbout], { type: 'application/octet-stream' }), 'Student_Upload_Template.xlsx');
        toast.success("Excel template downloaded!");
    }, []);

    return (
        <div className="bg-white p-6 rounded-lg shadow-lg border border-gray-100">
            <h2 className="text-2xl font-bold text-gray-800 mb-5 flex items-center">
                <CloudArrowUpIcon className="w-6 h-6 mr-3 text-blue-600" />
                Bulk Upload Students
            </h2>
            <p className="text-gray-600 mb-4">
                Upload student data using an Excel file. The file must contain 'Name', 'Email', and 'Batch' columns.
            </p>
            <div className="flex flex-col space-y-4">
                <input
                    type="file"
                    accept=".xlsx, .xls"
                    onChange={handleFileChange}
                    className="block w-full text-sm text-gray-500
                               file:mr-4 file:py-2 file:px-4
                               file:rounded-full file:border-0
                               file:text-sm file:font-semibold
                               file:bg-blue-50 file:text-blue-700
                               hover:file:bg-blue-100"
                />
                <button
                    onClick={handleUpload}
                    disabled={!selectedFile || isUploading}
                    className={`w-full flex items-center justify-center px-6 py-3 font-semibold rounded-lg shadow-lg transition duration-300 ease-in-out
                                ${!selectedFile || isUploading ? 'bg-gray-400 cursor-not-allowed' : 'bg-blue-600 text-white hover:bg-blue-700'}`}
                >
                    <CloudArrowUpIcon className="w-5 h-5 mr-2" />
                    {isUploading ? 'Uploading...' : 'Upload Students'}
                </button>
                <button
                    onClick={handleDownloadTemplate}
                    className="w-full flex items-center justify-center px-6 py-3 bg-indigo-100 text-indigo-700 font-semibold rounded-lg shadow-lg hover:bg-indigo-200 transition duration-300 ease-in-out"
                >
                    <DocumentArrowDownIcon className="w-5 h-5 mr-2" />
                    Download Template
                </button>
            </div>
        </div>
    );
}

export default BulkUploadStudents;