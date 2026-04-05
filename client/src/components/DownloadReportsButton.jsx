import React, { useCallback, useEffect, useState } from 'react';
import { toast } from 'react-hot-toast';
import { DocumentTextIcon, TableCellsIcon, FunnelIcon } from '@heroicons/react/24/solid';
import { courseAPI } from '../services/apiService';

// PDF Libraries
import { Document, Page, Text, View, StyleSheet, pdf } from '@react-pdf/renderer';

// Excel Libraries
import * as XLSX from 'xlsx';
import { saveAs } from 'file-saver';

// Create styles for the PDF document
const styles = StyleSheet.create({
    page: {
        flexDirection: 'column',
        backgroundColor: '#FFFFFF',
        padding: 30,
        fontFamily: 'Helvetica', // Default font, can be 'Inter' if registered
    },
    header: {
        fontSize: 24,
        marginBottom: 10,
        textAlign: 'center',
        color: '#333333',
        fontWeight: 'bold',
    },
    subheader: {
        fontSize: 12,
        marginBottom: 20,
        textAlign: 'center',
        color: '#666666',
    },
    section: {
        marginBottom: 15,
        padding: 10,
        borderWidth: 1,
        borderColor: '#EEEEEE',
        borderRadius: 8,
    },
    sectionTitle: {
        fontSize: 16,
        marginBottom: 8,
        color: '#0056B3',
        fontWeight: 'bold',
    },
    table: {
        display: 'table',
        width: 'auto',
        marginBottom: 10,
        borderStyle: 'solid',
        borderWidth: 1,
        borderColor: '#bfbfbf',
    },
    tableRow: {
        margin: 'auto',
        flexDirection: 'row',
    },
    tableColHeader: {
        width: '25%',
        borderStyle: 'solid',
        borderBottomWidth: 1,
        borderColor: '#bfbfbf',
        backgroundColor: '#f2f2f2',
        padding: 5,
    },
    tableCol: {
        width: '25%',
        borderStyle: 'solid',
        borderBottomWidth: 1,
        borderColor: '#bfbfbf',
        padding: 5,
    },
    tableCellHeader: {
        margin: 2,
        fontSize: 10,
        fontWeight: 'bold',
    },
    tableCell: {
        margin: 2,
        fontSize: 9,
    },
    noData: {
        fontSize: 12,
        textAlign: 'center',
        color: '#888888',
        marginTop: 20,
    }
});

const formatCourseBatchWithBlock = (batch, block) => {
    if (!batch && !block) return 'N/A';
    return `${batch || 'N/A'} - ${block || 'N/A'}`;
};

/**
 * PDF Document Component
 * This component defines the structure and content of the PDF report.
 */
const EnrolledStudentsPDF = ({ sections, selectedBatch }) => (
    <Document>
        <Page size="A4" style={styles.page}>
            <Text style={styles.header}>Enrolled Students Report</Text>
            <Text style={styles.subheader}>Batch Filter: {selectedBatch === 'all' ? 'All Batch Years' : selectedBatch}</Text>
            <Text style={styles.subheader}>Generated on: {new Date().toLocaleString()}</Text>

            {sections.length === 0 ? (
                <Text style={styles.noData}>No enrollment data available.</Text>
            ) : (
                sections.map((section) => (
                    <View key={section.key} style={styles.section} break>
                        <Text style={styles.sectionTitle}>Course: {section.courseName}</Text>
                        <Text style={styles.tableCell}>Batch Year: {section.batch}</Text>
                        <Text style={styles.tableCell}>Block: {section.block || 'N/A'}</Text>
                        <Text style={styles.tableCell}>Department: {section.department || 'N/A'}</Text>
                        <Text style={styles.tableCell}>Professor: {section.professorName || 'N/A'}</Text>
                        <View style={styles.table}>
                            <View style={styles.tableRow}>
                                <View style={styles.tableColHeader}>
                                    <Text style={styles.tableCellHeader}>Name</Text>
                                </View>
                                <View style={styles.tableColHeader}>
                                    <Text style={styles.tableCellHeader}>Email</Text>
                                </View>
                                <View style={styles.tableColHeader}>
                                    <Text style={styles.tableCellHeader}>Course Batch / Block</Text>
                                </View>
                                <View style={styles.tableColHeader}>
                                    <Text style={styles.tableCellHeader}>Enrollment Date</Text>
                                </View>
                            </View>
                            {section.enrollments.map((enrollment, index) => (
                                <View style={styles.tableRow} key={enrollment._id || index}>
                                    <View style={styles.tableCol}>
                                        <Text style={styles.tableCell}>{enrollment.student?.name || 'N/A'}</Text>
                                    </View>
                                    <View style={styles.tableCol}>
                                        <Text style={styles.tableCell}>{enrollment.student?.email || 'N/A'}</Text>
                                    </View>
                                    <View style={styles.tableCol}>
                                        <Text style={styles.tableCell}>
                                            {formatCourseBatchWithBlock(enrollment.course?.batch, enrollment.course?.block)}
                                        </Text>
                                    </View>
                                    <View style={styles.tableCol}>
                                        <Text style={styles.tableCell}>
                                            {new Date(enrollment.enrollmentDate).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata', dateStyle: 'medium', timeStyle: 'short' })}
                                        </Text>
                                    </View>
                                </View>
                            ))}
                        </View>
                    </View>
                ))
            )}
        </Page>
    </Document>
);


/**
 * DownloadReportsButton Component
 * Provides buttons to download reports of all enrolled students
 * in PDF and Excel formats, grouped by course and batch.
 *
 * @param {object} props - Component props.
 * @param {object} props.user - The authenticated user object, containing the token.
 * @param {function} props.config - Memoized Axios config for authenticated requests.
 */
function DownloadReportsButton({ user, config }) {
    const [availableBatches, setAvailableBatches] = useState([]);
    const [selectedBatch, setSelectedBatch] = useState('all');

    const fetchBatches = useCallback(async () => {
        try {
            const res = await courseAPI.getBatches(config());
            setAvailableBatches(res.data || []);
        } catch (error) {
            console.error('Failed to fetch batches for reports:', error.response?.data || error);
        }
    }, [config]);

    useEffect(() => {
        if (user?.token) {
            fetchBatches();
        }
    }, [user?.token, fetchBatches]);

    // Function to fetch all enrollments with student and course details
    const fetchAllEnrollments = useCallback(async () => {
        try {
            // IMPORTANT: This endpoint needs to exist on your backend.
            // It should return ALL enrollments and populate both 'student' and 'course' fields.
            // Example structure:
            // GET /api/enrollments/all-details
            // Response: [ { _id: 'e1', student: {name, email, batch}, course: {courseName, batch}, enrollmentDate }, ... ]
            const res = await courseAPI.getAllDetails(config());
            return res.data;
        } catch (error) {
            toast.error(error.response?.data?.message || "Failed to fetch enrollment data for reports.");
            console.error("Error fetching enrollments for reports:", error.response?.data || error);
            return [];
        }
    }, [config]);

    // Helper to group enrollments by course metadata
    const groupEnrollments = (enrollments) => {
        const grouped = {};
        enrollments.forEach(enrollment => {
            const course = enrollment.course || {};
            const courseKey = course._id
                ? String(course._id)
                : `${course.courseName || 'Unknown Course'}__${course.batch || 'Unknown Batch'}`;

            if (!grouped[courseKey]) {
                grouped[courseKey] = {
                    key: courseKey,
                    courseName: course.courseName || 'Unknown Course',
                    batch: course.batch || 'Unknown Batch',
                    block: course.block || 'N/A',
                    department: course.department || 'N/A',
                    professorName: course.professorName || 'N/A',
                    enrollments: [],
                };
            }

            grouped[courseKey].enrollments.push(enrollment);
        });

        return Object.values(grouped).sort((a, b) => {
            if (a.courseName !== b.courseName) return a.courseName.localeCompare(b.courseName);
            if (a.batch !== b.batch) return a.batch.localeCompare(b.batch);
            return (a.block || '').localeCompare(b.block || '');
        });
    };

    const filterBySelectedBatch = (enrollments) => {
        if (selectedBatch === 'all') return enrollments;
        return enrollments.filter((enrollment) => enrollment.course?.batch === selectedBatch);
    };

    // --- PDF Report Generation ---
    const handleDownloadPdf = async () => {
        toast.loading("Preparing PDF report...", { id: "pdfReportToast" });
        const enrollments = await fetchAllEnrollments();

        if (enrollments.length === 0) {
            toast.error("No enrollment data found to generate PDF report.", { id: "pdfReportToast" });
            return;
        }

        const filteredEnrollments = filterBySelectedBatch(enrollments);
        if (filteredEnrollments.length === 0) {
            toast.error('No enrollment data found for the selected batch.', { id: 'pdfReportToast' });
            return;
        }

        const groupedData = groupEnrollments(filteredEnrollments);

        try {
            // Generate the PDF document as a Blob
            const blob = await pdf(<EnrolledStudentsPDF sections={groupedData} selectedBatch={selectedBatch} />).toBlob();
            const batchSuffix = selectedBatch === 'all' ? 'all_batches' : `batch_${selectedBatch}`;
            saveAs(blob, `Enrolled_Students_Report_${batchSuffix}_${new Date().toISOString().slice(0, 10)}.pdf`);
            toast.success("PDF report generated and downloaded!", { id: "pdfReportToast" });
        } catch (error) {
            toast.error("Failed to generate PDF report.", { id: "pdfReportToast" });
            console.error("Error generating PDF:", error);
        }
    };

    // --- Excel Report Generation ---
    const handleDownloadExcel = async () => {
        toast.loading("Preparing Excel report...", { id: "excelReportToast" });
        const enrollments = await fetchAllEnrollments();

        if (enrollments.length === 0) {
            toast.error("No enrollment data found to generate Excel report.", { id: "excelReportToast" });
            return;
        }

        const filteredEnrollments = filterBySelectedBatch(enrollments);
        if (filteredEnrollments.length === 0) {
            toast.error('No enrollment data found for the selected batch.', { id: 'excelReportToast' });
            return;
        }

        const workbook = XLSX.utils.book_new();
        const rows = filteredEnrollments.map((enrollment) => ({
            "Student Name": enrollment.student?.name || 'N/A',
            "Student Email": enrollment.student?.email || 'N/A',
            "Student Batch Year": enrollment.student?.batch || 'N/A',
            "Course Name": enrollment.course?.courseName || 'N/A',
            "Course Batch Year": enrollment.course?.batch || 'N/A',
            "Course Block": enrollment.course?.block || 'N/A',
            "Department": enrollment.course?.department || 'N/A',
            "Professor Name": enrollment.course?.professorName || 'N/A',
            "Enrollment Date (IST)": new Date(enrollment.enrollmentDate).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata', dateStyle: 'medium', timeStyle: 'short' }),
        }));

        const worksheet = XLSX.utils.json_to_sheet(rows);
        XLSX.utils.book_append_sheet(workbook, worksheet, 'Enrollments');

        try {
            const excelBuffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });
            const data = new Blob([excelBuffer], { type: 'application/octet-stream' });
            const batchSuffix = selectedBatch === 'all' ? 'all_batches' : `batch_${selectedBatch}`;
            saveAs(data, `Enrolled_Students_Report_${batchSuffix}_${new Date().toISOString().slice(0, 10)}.xlsx`);
            toast.success("Excel report generated and downloaded!", { id: "excelReportToast" });
        } catch (error) {
            toast.error("Failed to generate Excel report.", { id: "excelReportToast" });
            console.error("Error generating Excel:", error);
        }
    };

    return (
        <div className="flex flex-wrap items-center gap-3">
            <div className="relative">
                <FunnelIcon className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                <select
                    value={selectedBatch}
                    onChange={(e) => setSelectedBatch(e.target.value)}
                    className="block min-w-[190px] rounded-md border border-slate-300 bg-white pl-9 pr-8 py-2 text-sm text-slate-700 shadow-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                >
                    <option value="all">All Batch Years</option>
                    {availableBatches.map((batch) => (
                        <option key={batch} value={batch}>Batch {batch}</option>
                    ))}
                </select>
            </div>
            <button
                onClick={handleDownloadPdf}
                className="inline-flex items-center whitespace-nowrap rounded-md border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 shadow-sm transition-colors hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
                <DocumentTextIcon className="w-4 h-4 mr-2 text-slate-400" />
                Download PDF
            </button>
            <button
                onClick={handleDownloadExcel}
                className="inline-flex items-center whitespace-nowrap rounded-md border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 shadow-sm transition-colors hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
                <TableCellsIcon className="w-4 h-4 mr-2 text-slate-400" />
                Download Excel
            </button>
        </div>
    );
}

export default DownloadReportsButton;