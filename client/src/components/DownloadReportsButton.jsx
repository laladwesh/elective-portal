import React, { useCallback } from 'react';
import axios from 'axios';
import { toast } from 'react-hot-toast';
import { ArrowDownTrayIcon, DocumentTextIcon, TableCellsIcon } from '@heroicons/react/24/solid'; // Icons for download, PDF, Excel

// PDF Libraries
import { Document, Page, Text, View, StyleSheet, Font, pdf } from '@react-pdf/renderer';

// Excel Libraries
import * as XLSX from 'xlsx';
import { saveAs } from 'file-saver';

// Register a font if you want custom fonts in your PDF
// Font.register({ family: 'Inter', src: 'https://fonts.gstatic.com/s/inter/v12/UcC73FwrK3iLTeHuS_fvQtMwCp50KnMa1ZL7W0Q5nw.ttf' });

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
        width: '33.33%',
        borderStyle: 'solid',
        borderBottomWidth: 1,
        borderColor: '#bfbfbf',
        backgroundColor: '#f2f2f2',
        padding: 5,
    },
    tableCol: {
        width: '33.33%',
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

/**
 * PDF Document Component
 * This component defines the structure and content of the PDF report.
 */
const EnrolledStudentsPDF = ({ data }) => (
    <Document>
        <Page size="A4" style={styles.page}>
            <Text style={styles.header}>Enrolled Students Report</Text>
            <Text style={styles.subheader}>Generated on: {new Date().toLocaleString()}</Text>

            {Object.keys(data).length === 0 ? (
                <Text style={styles.noData}>No enrollment data available.</Text>
            ) : (
                Object.keys(data).sort().map(courseName => (
                    Object.keys(data[courseName]).sort().map(batch => (
                        <View key={`${courseName}-${batch}`} style={styles.section} break>
                            <Text style={styles.sectionTitle}>Course: {courseName} (Batch: {batch})</Text>
                            <View style={styles.table}>
                                <View style={styles.tableRow}>
                                    <View style={styles.tableColHeader}>
                                        <Text style={styles.tableCellHeader}>Name</Text>
                                    </View>
                                    <View style={styles.tableColHeader}>
                                        <Text style={styles.tableCellHeader}>Email</Text>
                                    </View>
                                    <View style={styles.tableColHeader}>
                                        <Text style={styles.tableCellHeader}>Enrollment Date</Text>
                                    </View>
                                </View>
                                {data[courseName][batch].map((enrollment, index) => (
                                    <View style={styles.tableRow} key={enrollment._id || index}>
                                        <View style={styles.tableCol}>
                                            <Text style={styles.tableCell}>{enrollment.student?.name || 'N/A'}</Text>
                                        </View>
                                        <View style={styles.tableCol}>
                                            <Text style={styles.tableCell}>{enrollment.student?.email || 'N/A'}</Text>
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

    // Function to fetch all enrollments with student and course details
    const fetchAllEnrollments = useCallback(async () => {
        try {
            // IMPORTANT: This endpoint needs to exist on your backend.
            // It should return ALL enrollments and populate both 'student' and 'course' fields.
            // Example structure:
            // GET /api/enrollments/all-details
            // Response: [ { _id: 'e1', student: {name, email, batch}, course: {courseName, batch}, enrollmentDate }, ... ]
            const res = await axios.get('/api/courses/all-details', config());
            return res.data;
        } catch (error) {
            toast.error(error.response?.data?.message || "Failed to fetch enrollment data for reports.");
            console.error("Error fetching enrollments for reports:", error.response?.data || error);
            return [];
        }
    }, [config]);

    // Helper to group enrollments by Course and then by Batch
    const groupEnrollments = (enrollments) => {
        const grouped = {};
        enrollments.forEach(enrollment => {
            const courseName = enrollment.course?.courseName || 'Unknown Course';
            const batch = enrollment.course?.batch || 'Unknown Batch';

            if (!grouped[courseName]) {
                grouped[courseName] = {};
            }
            if (!grouped[courseName][batch]) {
                grouped[courseName][batch] = [];
            }
            grouped[courseName][batch].push(enrollment);
        });
        return grouped;
    };

    // --- PDF Report Generation ---
    const handleDownloadPdf = async () => {
        toast.loading("Preparing PDF report...", { id: "pdfReportToast" });
        const enrollments = await fetchAllEnrollments();

        if (enrollments.length === 0) {
            toast.error("No enrollment data found to generate PDF report.", { id: "pdfReportToast" });
            return;
        }

        const groupedData = groupEnrollments(enrollments);

        try {
            // Generate the PDF document as a Blob
            const blob = await pdf(<EnrolledStudentsPDF data={groupedData} />).toBlob();
            saveAs(blob, `Enrolled_Students_Report_${new Date().toISOString().slice(0, 10)}.pdf`);
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

        const groupedData = groupEnrollments(enrollments);
        const workbook = XLSX.utils.book_new();

        for (const courseName in groupedData) {
            for (const batch in groupedData[courseName]) {
                const studentsInBatch = groupedData[courseName][batch];

                // Create a sheet for each Course-Batch combination
                const sheetName = `${courseName.substring(0, 15)} - ${batch}`; // Limit sheet name length
                const sheetData = [
                    ["Student Name", "Student Email", "Course Name", "Batch", "Enrollment Date"], // Headers
                ];

                studentsInBatch.forEach(enrollment => {
                    sheetData.push([
                        enrollment.student?.name || 'N/A',
                        enrollment.student?.email || 'N/A',
                        enrollment.course?.courseName || 'N/A',
                        enrollment.course?.batch || 'N/A',
                        new Date(enrollment.enrollmentDate).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata', dateStyle: 'medium', timeStyle: 'short' })
                    ]);
                });

                const worksheet = XLSX.utils.aoa_to_sheet(sheetData);
                XLSX.utils.book_append_sheet(workbook, worksheet, sheetName);
            }
        }

        try {
            const excelBuffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });
            const data = new Blob([excelBuffer], { type: 'application/octet-stream' });
            saveAs(data, `Enrolled_Students_Report_${new Date().toISOString().slice(0, 10)}.xlsx`);
            toast.success("Excel report generated and downloaded!", { id: "excelReportToast" });
        } catch (error) {
            toast.error("Failed to generate Excel report.", { id: "excelReportToast" });
            console.error("Error generating Excel:", error);
        }
    };

    return (
        <div className="flex space-x-3">
            <button
                onClick={handleDownloadPdf}
                className="flex items-center px-4 py-2 bg-purple-600 text-white font-medium rounded-lg shadow-md hover:bg-purple-700 transition duration-300 ease-in-out"
            >
                <DocumentTextIcon className="w-5 h-5 mr-2" />
                Download PDF
            </button>
            <button
                onClick={handleDownloadExcel}
                className="flex items-center px-4 py-2 bg-green-600 text-white font-medium rounded-lg shadow-md hover:bg-green-700 transition duration-300 ease-in-out"
            >
                <TableCellsIcon className="w-5 h-5 mr-2" />
                Download Excel
            </button>
        </div>
    );
}

export default DownloadReportsButton;