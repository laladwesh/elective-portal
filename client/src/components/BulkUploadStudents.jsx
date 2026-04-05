import React, { useState, useCallback } from 'react';
import axios from 'axios';
import { toast } from 'react-hot-toast';
import * as XLSX from 'xlsx';
import { saveAs } from 'file-saver';
import { CloudArrowUpIcon, DocumentArrowDownIcon } from '@heroicons/react/24/solid'; // Icons
import { studentAPI } from '../services/apiService';

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
            const res = await studentAPI.bulkUpload(formData, {
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
        <div className="rounded-xl border border-slate-200 bg-white/70 p-5">
            <h2 className="mb-4 flex items-center text-xl font-semibold text-slate-900">
                <CloudArrowUpIcon className="mr-2 h-5 w-5 text-indigo-600" />
                Bulk Upload Students
            </h2>
            <p className="mb-4 text-sm text-slate-600">
                Upload student data using an Excel file. The file must contain 'Name', 'Email', and 'Batch' columns.
            </p>
            <div className="flex flex-col space-y-4">
                <input
                    type="file"
                    accept=".xlsx, .xls"
                    onChange={handleFileChange}
                    className="block w-full text-sm text-slate-600
                               file:mr-3 file:rounded-md file:border file:border-slate-300
                               file:bg-white file:px-3 file:py-2
                               file:text-sm file:font-medium file:text-slate-700
                               hover:file:bg-slate-50"
                />
                <button
                    onClick={handleUpload}
                    disabled={!selectedFile || isUploading}
                    className={`w-full inline-flex items-center justify-center rounded-md px-6 py-3 text-sm font-semibold shadow-sm transition duration-300 ease-in-out
                                ${!selectedFile || isUploading ? 'cursor-not-allowed bg-slate-300 text-slate-600' : 'bg-indigo-600 text-white hover:bg-indigo-700'}`}
                >
                    <CloudArrowUpIcon className="mr-2 h-5 w-5" />
                    {isUploading ? 'Uploading...' : 'Upload Students'}
                </button>
                <button
                    onClick={handleDownloadTemplate}
                    className="w-full inline-flex items-center justify-center rounded-md border border-slate-300 bg-white px-6 py-3 text-sm font-semibold text-slate-700 shadow-sm transition duration-300 ease-in-out hover:bg-slate-50"
                >
                    <DocumentArrowDownIcon className="mr-2 h-5 w-5" />
                    Download Template
                </button>
            </div>
        </div>
    );
}

export default BulkUploadStudents;