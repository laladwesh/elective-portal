// client/src/components/EnrollmentStatsModal.jsx
import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import { toast } from 'react-hot-toast';
import Modal from './Modal'; // Assuming your Modal component is in the same directory
import { courseAPI } from '../services/apiService';

// Heroicon Imports - Solid Icons
import {
  ChartBarIcon, // For stats
  ArrowDownTrayIcon, // For download
  FunnelIcon, // For filter/batch selection
} from '@heroicons/react/24/solid';

// PDF Generation Imports
import { PDFDownloadLink, Document, Page, Text, View, StyleSheet, Font } from '@react-pdf/renderer';
import { saveAs } from 'file-saver'; // For saving Excel files

// Excel (XLSX) Import
import * as XLSX from 'xlsx';

// IMPORTANT: Font Registration for @react-pdf/renderer
// You CANNOT use the Google Fonts CSS link directly here.
// You need direct URLs to the .ttf font files.
//
// If you want to use "Libertinus Mono" or "Red Hat Text", you must:
// 1. Download their .ttf files from Google Fonts.
// 2. Host them (e.g., in your public/fonts folder) or find a CDN that provides direct .ttf links.
// 3. Then, register them like this (replace with your actual .ttf URLs):

/*
// Example for Red Hat Text (replace with actual TTF URL for each weight/style you want)
Font.register({
  family: 'Red Hat Text',
  src: 'https://example.com/fonts/RedHatText-Regular.ttf', // THIS IS A PLACEHOLDER. GET REAL TTF URL.
});

// Example for Libertinus Mono (replace with actual TTF URL)
Font.register({
  family: 'Libertinus Mono',
  src: 'https://example.com/fonts/LibertinusMono-Regular.ttf', // THIS IS A PLACEHOLDER. GET REAL TTF URL.
});
*/

// Using Helvetica as per your latest style preference.
// Helvetica is generally built-in and doesn't require explicit registration.
// If you uncomment the font registrations above, you can change 'Helvetica' below.

// Create styles for PDF document - Using your provided styles
const styles = StyleSheet.create({
  page: {
    flexDirection: 'column',
    backgroundColor: '#FFFFFF',
    padding: 30,
    fontFamily: 'Helvetica', // Default font as specified by you. Change if you register others.
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


// PDF Document Component
const UnenrolledStudentsPDF = ({ students, batch }) => (
  <Document>
    <Page size="A4" style={styles.page}>
      <Text style={styles.header}>Unenrolled Students Report</Text>
      <Text style={styles.subheader}>Batch: {batch}</Text>
      <View style={styles.table}>
        <View style={styles.tableRow}>
          <View style={styles.tableColHeader}>
            <Text style={styles.tableCellHeader}>Name</Text>
          </View>
          <View style={styles.tableColHeader}>
            <Text style={styles.tableCellHeader}>Email</Text>
          </View>
          <View style={styles.tableColHeader}>
            <Text style={styles.tableCellHeader}>Batch</Text>
          </View>
        </View>
        {students.map((student, index) => (
          <View style={styles.tableRow} key={index}>
            <View style={styles.tableCol}>
              <Text style={styles.tableCell}>{student.name}</Text>
            </View>
            <View style={styles.tableCol}>
              <Text style={styles.tableCell}>{student.email}</Text>
            </View>
            <View style={styles.tableCol}>
              <Text style={styles.tableCell}>{student.batch}</Text>
            </View>
          </View>
        ))}
      </View>
    </Page>
  </Document>
);


function EnrollmentStatsModal({ user }) {
  const [isStatsModalOpen, setIsStatsModalOpen] = useState(false);
  const [enrollmentStats, setEnrollmentStats] = useState([]); // Stores batch-wise stats
  const [batches, setBatches] = useState([]); // Stores all available batches
  const [selectedBatch, setSelectedBatch] = useState(''); // For filtering unenrolled students
  const [unenrolledStudentsData, setUnenrolledStudentsData] = useState([]); // Data for PDF/Excel

  const config = useCallback(() => ({
    headers: {
      Authorization: `Bearer ${user?.token}`,
    },
  }), [user?.token]);

  // Function to fetch all available batches (assuming an API endpoint for this)
  const fetchBatches = useCallback(async () => {
    try {
      const res = await courseAPI.getBatches(config());
      setBatches(res.data);
      if (res.data.length > 0) {
        setSelectedBatch(res.data[0]);
      }
    } catch (error) {
      console.error('Error fetching batches:', error);
      toast.error('Failed to load batches.');
    }
  }, [config]);

  // Function to fetch enrollment statistics
  const fetchEnrollmentStats = useCallback(async () => {
    if (!user?.token) return;
    try {
      const res = await courseAPI.getEnrollmentStats(config());
      setEnrollmentStats(res.data);
    } catch (error) {
      console.error('Error fetching enrollment stats:', error);
      toast.error('Failed to load enrollment statistics.');
    }
  }, [user?.token, config]);

  // Function to fetch unenrolled students data (JSON)
  const fetchUnenrolledStudents = useCallback(async (batch) => {
    if (!batch) return;
    try {
      const res = await courseAPI.getUnenrolledStudents(batch, config());
      setUnenrolledStudentsData(res.data);
      toast.success(`Fetched unenrolled students for batch ${batch}.`);
    } catch (error) {
      console.error(`Error fetching unenrolled students for batch ${batch}:`, error);
      const errorMessage = error.response?.data?.message || 'Failed to fetch unenrolled students data.';
      toast.error(errorMessage);
      setUnenrolledStudentsData([]);
    }
  }, [config]);

  // Callbacks for opening/closing modal and fetching data
  const handleOpenStatsModal = () => {
    setIsStatsModalOpen(true);
    fetchBatches();
    fetchEnrollmentStats();
  };

  const handleCloseStatsModal = () => {
    setIsStatsModalOpen(false);
    setSelectedBatch('');
    setEnrollmentStats([]);
    setUnenrolledStudentsData([]); // Clear data on close
  };

  // Effect to fetch unenrolled students data when selectedBatch changes
  useEffect(() => {
    if (selectedBatch && isStatsModalOpen) {
      fetchUnenrolledStudents(selectedBatch);
    }
  }, [selectedBatch, isStatsModalOpen, fetchUnenrolledStudents]);

  // --- Download Logic ---
  const handleDownloadExcel = () => {
    if (!unenrolledStudentsData || unenrolledStudentsData.length === 0) {
      toast.error('No unenrolled student data to download for the selected batch.');
      return;
    }

    const ws = XLSX.utils.json_to_sheet(unenrolledStudentsData.map(s => ({
      Name: s.name,
      Email: s.email,
      Batch: s.batch,
    })));
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Unenrolled Students");
    const excelBuffer = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
    const data = new Blob([excelBuffer], { type: 'application/octet-stream' });
    saveAs(data, `unenrolled_students_batch_${selectedBatch}.xlsx`);
    toast.success('Excel download complete!');
  };

  return (
    <>
      <button
        onClick={handleOpenStatsModal}
        className="flex items-center px-4 py-2 bg-purple-600 text-white font-semibold rounded-lg shadow-md hover:bg-purple-700 transition duration-300 ease-in-out"
      >
        <ChartBarIcon className="w-5 h-5 mr-2" />
        Show Stats
      </button>

      <Modal isOpen={isStatsModalOpen} onClose={handleCloseStatsModal} title="Enrollment Statistics">
        <div className="space-y-6">
          {enrollmentStats.length === 0 ? (
            <p className="text-gray-600 text-center">Loading statistics...</p>
          ) : (
            <div>
              <h3 className="text-lg font-semibold text-gray-800 mb-4">Batch-wise Enrollment Summary</h3>
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Batch</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Total Students</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Enrolled</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Not Enrolled</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {enrollmentStats.map((stat) => (
                      <tr key={stat.batch}>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{stat.batch}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">{stat.totalStudents}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">{stat.enrolledStudents}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">{stat.notEnrolledStudents}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          <div className="mt-8 pt-6 border-t border-gray-200">
            <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center">
              <ArrowDownTrayIcon className="w-5 h-5 mr-2 text-gray-600" />
              Download Unenrolled Students List
            </h3>
            <div className="flex flex-col sm:flex-row items-center gap-4">
              <div className="relative w-full sm:w-auto">
                <FunnelIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 pointer-events-none" />
                <select
                  value={selectedBatch}
                  onChange={(e) => setSelectedBatch(e.target.value)}
                  className="pl-10 pr-4 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 block w-full sm:text-sm"
                >
                  <option value="">Select Batch</option>
                  {batches.map((batch) => (
                    <option key={batch} value={batch}>{batch}</option>
                  ))}
                </select>
              </div>
              <button
                onClick={handleDownloadExcel}
                disabled={!selectedBatch || unenrolledStudentsData.length === 0}
                className="flex-grow sm:flex-grow-0 flex items-center justify-center px-4 py-2 bg-green-600 text-white font-semibold rounded-lg shadow-md hover:bg-green-700 transition duration-300 ease-in-out disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <ArrowDownTrayIcon className="w-5 h-5 mr-2" />
                Download Excel
              </button>

              {/* PDF Download Link */}
              <PDFDownloadLink
                document={<UnenrolledStudentsPDF students={unenrolledStudentsData} batch={selectedBatch} />}
                fileName={`unenrolled_students_batch_${selectedBatch}.pdf`}
              >
                {({ blob, url, loading, error }) => {
                  // Log any errors during PDF generation for debugging
                  if (error) {
                    console.error("PDF generation error:", error);
                    toast.error("Failed to generate PDF. Check console for details.");
                  }
                  return (
                    <button
                      disabled={!selectedBatch || loading || unenrolledStudentsData.length === 0}
                      className="flex-grow sm:flex-grow-0 flex items-center justify-center px-4 py-2 bg-red-600 text-white font-semibold rounded-lg shadow-md hover:bg-red-700 transition duration-300 ease-in-out disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <ArrowDownTrayIcon className="w-5 h-5 mr-2" />
                      {loading ? 'Generating PDF...' : 'Download PDF'}
                    </button>
                  );
                }}
              </PDFDownloadLink>
            </div>
            {!selectedBatch && (
              <p className="mt-2 text-sm text-gray-500">Please select a batch to enable download buttons.</p>
            )}
            {selectedBatch && unenrolledStudentsData.length === 0 && (
              <p className="mt-2 text-sm text-gray-500">No unenrolled students found for the selected batch.</p>
            )}
          </div>
        </div>
      </Modal>
    </>
  );
}

export default EnrollmentStatsModal;
