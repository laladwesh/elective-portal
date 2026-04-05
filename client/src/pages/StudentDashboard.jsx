import React, { useState, useEffect, useCallback } from 'react';
import { toast } from 'react-hot-toast';
import { courseAPI } from '../services/apiService';

// Heroicon Imports - Solid Icons
import {
    AcademicCapIcon,
    ArrowRightOnRectangleIcon,
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
            const res = await courseAPI.getMyEnrollments(config());
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
            const res = await courseAPI.getAll(config());
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
            await courseAPI.enroll(courseId, {}, config());
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

    const openCoursesCount = availableCourses.filter((course) => {
        const isFull = course.enrolledStudentsCount >= course.intakeCapacity;
        return course.isEnrollmentActive && !isFull;
    }).length;

    const upcomingCoursesCount = availableCourses.filter((course) => {
        if (course.isEnrollmentActive || !course.enrollmentOpenTime) return false;
        const openDate = new Date(course.enrollmentOpenTime);
        return !Number.isNaN(openDate.getTime()) && new Date() < openDate;
    }).length;

    return (
        <>
            <style>{`
                @import url('https://fonts.googleapis.com/css2?family=Montserrat:wght@400;500;600;700;800&display=swap');

                .student-shell {
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

                .student-shell::before {
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

                .student-shell h1,
                .student-shell h2,
                .student-shell h3 {
                    font-family: 'Montserrat', sans-serif;
                    letter-spacing: -0.01em;
                }

                .student-fade-up {
                    opacity: 0;
                    animation: studentFadeUp 650ms cubic-bezier(0.18, 0.68, 0.24, 0.98) forwards;
                }

                @keyframes studentFadeUp {
                    from {
                        opacity: 0;
                        transform: translateY(14px);
                    }
                    to {
                        opacity: 1;
                        transform: translateY(0);
                    }
                }

                .student-surface {
                    background: var(--auth-card);
                    border: 1px solid var(--auth-line);
                    box-shadow: 0 14px 42px rgba(31, 36, 40, 0.08);
                }

                .student-soft-surface {
                    background: rgba(251, 250, 247, 0.7);
                    border: 1px solid rgba(216, 214, 207, 0.85);
                }

                .student-badge-accent {
                    background: var(--auth-accent-soft);
                    color: var(--auth-accent);
                    border: 1px solid rgba(36, 84, 111, 0.22);
                }

                .student-badge-neutral {
                    background: #f1f5f9;
                    color: #475569;
                    border: 1px solid #dbe1e8;
                }

                .student-btn-primary {
                    background: var(--auth-accent);
                    border: 1px solid transparent;
                    color: var(--auth-button-ink);
                }

                .student-btn-primary:hover {
                    background: var(--auth-accent-strong);
                }

                .student-btn-primary:focus-visible {
                    outline: none;
                    box-shadow: 0 0 0 2px rgba(36, 84, 111, 0.4);
                }

                .student-btn-disabled {
                    background: #dfe3e8;
                    border: 1px solid #cfd6dd;
                    color: #64707d;
                    cursor: not-allowed;
                }

                .student-logout-btn {
                    background: white;
                    border: 1px solid #cbd5e1;
                    color: #334155;
                    transition: all 0.2s ease;
                }

                .student-logout-btn:hover {
                    background: #f8fafc;
                    color: var(--auth-accent);
                }

                .student-logout-btn:focus-visible {
                    outline: none;
                    box-shadow: 0 0 0 2px rgba(36, 84, 111, 0.35);
                }

                .student-table thead tr {
                    background: rgba(148, 163, 184, 0.12);
                }

                .student-table tbody tr:hover {
                    background: rgba(148, 163, 184, 0.07);
                }
            `}</style>

            <div className="student-shell px-4 py-4 sm:min-h-screen sm:px-6 sm:py-8 lg:px-8">
                <div className="pointer-events-none absolute -left-24 top-8 z-0 h-72 w-72 rounded-full border border-white/55 bg-white/20 blur-[2px]" aria-hidden="true" />
                <div className="pointer-events-none absolute -right-20 bottom-10 z-0 h-56 w-56 rounded-full border border-slate-400/20 bg-slate-300/20 blur-[1px]" aria-hidden="true" />

                <div className="relative z-10 mx-auto w-full max-w-[1600px] space-y-6">
                    <header className="student-fade-up student-surface rounded-2xl p-5 sm:p-6" style={{ animationDelay: '60ms' }}>
                        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                            <div>
                                <p className="inline-flex items-center rounded-full border border-slate-300/80 bg-slate-100/85 px-3 py-1 text-[11px] font-semibold tracking-[0.08em] text-slate-600">
                                    PRASAD INSTITUTE OF MEDICAL SCIENCES
                                </p>
                                <h1 className="mt-3 text-3xl font-semibold text-slate-900 sm:text-4xl">Student Dashboard</h1>
                                <p className="mt-2 text-sm text-slate-600 sm:text-base">
                                    Review elective availability and complete your enrollment in one focused workspace.
                                </p>
                            </div>

                            <div className="flex flex-wrap items-center gap-3">
                                <div className="student-soft-surface rounded-full px-4 py-2 text-sm text-slate-700">
                                    Student: <span className="font-semibold text-slate-900">{user?.name}</span>
                                </div>
                                <div className="student-soft-surface rounded-full px-4 py-2 text-sm text-slate-700">
                                    Batch: <span className="font-semibold text-slate-900">{user?.batch}</span>
                                </div>
                                <button
                                    onClick={onLogout}
                                    className="student-logout-btn inline-flex items-center rounded-md px-4 py-2 text-sm font-medium"
                                >
                                    <ArrowRightOnRectangleIcon className="mr-2 h-4 w-4" />
                                    Sign out
                                </button>
                            </div>
                        </div>
                    </header>

                    <div className="student-fade-up grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3" style={{ animationDelay: '110ms' }}>
                        <div className="student-surface rounded-xl p-4">
                            <p className="text-xs font-medium uppercase tracking-wide text-slate-500">Courses Available</p>
                            <p className="mt-2 text-2xl font-semibold text-slate-900">{availableCourses.length}</p>
                        </div>
                        <div className="student-surface rounded-xl p-4">
                            <p className="text-xs font-medium uppercase tracking-wide text-slate-500">Open Right Now</p>
                            <p className="mt-2 text-2xl font-semibold text-[var(--auth-accent)]">{openCoursesCount}</p>
                        </div>
                        <div className="student-surface rounded-xl p-4">
                            <p className="text-xs font-medium uppercase tracking-wide text-slate-500">Enrollment Status</p>
                            <p className="mt-2 text-lg font-semibold text-slate-900">{hasEnrolled ? 'Completed' : 'Pending'}</p>
                            <p className="mt-1 text-xs text-slate-500">Upcoming windows: {upcomingCoursesCount}</p>
                        </div>
                    </div>

                    <section className="student-fade-up student-surface rounded-2xl p-6" style={{ animationDelay: '160ms' }}>
                        <h2 className="mb-5 flex items-center gap-2 text-2xl font-semibold text-slate-900">
                            <AcademicCapIcon className="h-6 w-6 text-[var(--auth-accent)]" />
                            Available Elective Courses (Batch {user?.batch})
                        </h2>

                        {availableCourses.length === 0 ? (
                            <p className="py-6 text-center text-sm text-slate-600 sm:text-base">
                                No courses are available for your batch at the moment. Please check back after the enrollment window opens.
                            </p>
                        ) : (
                            <div className="overflow-x-auto">
                                <table className="student-table min-w-full divide-y divide-slate-200">
                                    <thead>
                                        <tr>
                                            <th scope="col" className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-600">Course Name</th>
                                            <th scope="col" className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-600">Department</th>
                                            <th scope="col" className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-600">Professor</th>
                                            <th scope="col" className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-600">Block</th>
                                            <th scope="col" className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-600">Intake</th>
                                            <th scope="col" className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-600">Status</th>
                                            <th scope="col" className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-600 sm:text-right">Action</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-200 bg-white/85">
                                        {availableCourses.map((course) => {
                                            const isFull = course.enrolledStudentsCount >= course.intakeCapacity;
                                            const enrollmentOpenDate = course.enrollmentOpenTime ? new Date(course.enrollmentOpenTime) : null;
                                            const isEnrollmentOpenTimeInFuture = enrollmentOpenDate && new Date() < enrollmentOpenDate;
                                            const isEnrollmentActiveByAdmin = course.isEnrollmentActive;
                                            const isEnrolledByUserInThisCourse = myEnrollments.some((enrollment) => enrollment.course._id === course._id);

                                            let statusText = '';
                                            let statusClass = 'student-badge-neutral';
                                            let buttonDisabled = false;
                                            let buttonText = 'Enroll';
                                            let buttonClass = 'student-btn-primary';
                                            let buttonIcon = <CheckIcon className="mr-1 h-4 w-4" />;

                                            if (isEnrolledByUserInThisCourse) {
                                                statusText = 'Enrolled';
                                                statusClass = 'student-badge-accent';
                                                buttonText = 'Enrolled';
                                                buttonDisabled = true;
                                                buttonClass = 'student-btn-disabled';
                                                buttonIcon = <ClipboardDocumentCheckIcon className="mr-1 h-4 w-4" />;
                                            } else if (hasEnrolled) {
                                                statusText = 'Already enrolled in another course';
                                                buttonDisabled = true;
                                                buttonClass = 'student-btn-disabled';
                                                buttonIcon = <LockClosedIcon className="mr-1 h-4 w-4" />;
                                            } else if (isFull) {
                                                statusText = 'Full';
                                                buttonDisabled = true;
                                                buttonClass = 'student-btn-disabled';
                                                buttonIcon = <XCircleIcon className="mr-1 h-4 w-4" />;
                                            } else if (isEnrollmentActiveByAdmin) {
                                                statusText = 'Open';
                                                statusClass = 'student-badge-accent';
                                            } else if (isEnrollmentOpenTimeInFuture) {
                                                statusText = `Opens: ${new Date(course.enrollmentOpenTime).toLocaleString('en-IN', { dateStyle: 'short', timeStyle: 'short', timeZone: 'Asia/Kolkata' })}`;
                                                buttonDisabled = true;
                                                buttonClass = 'student-btn-disabled';
                                                buttonIcon = <ClockIcon className="mr-1 h-4 w-4" />;
                                            } else {
                                                statusText = 'Closed by admin';
                                                buttonDisabled = true;
                                                buttonClass = 'student-btn-disabled';
                                                buttonIcon = <LockClosedIcon className="mr-1 h-4 w-4" />;
                                            }

                                            return (
                                                <tr key={course._id}>
                                                    <td className="whitespace-nowrap px-6 py-4 text-sm font-medium text-slate-900">
                                                        <div className="flex items-center">
                                                            <TicketIcon className="mr-2 h-4 w-4 text-[var(--auth-accent)]" />
                                                            {course.courseName}
                                                        </div>
                                                    </td>
                                                    <td className="whitespace-nowrap px-6 py-4 text-sm text-slate-600">{course.department || '—'}</td>
                                                    <td className="whitespace-nowrap px-6 py-4 text-sm text-slate-600">{course.professorName || '—'}</td>
                                                    <td className="whitespace-nowrap px-6 py-4 text-sm text-slate-600">{course.block || '—'}</td>
                                                    <td className="whitespace-nowrap px-6 py-4 text-sm text-slate-600">{course.intakeCapacity}</td>
                                                    <td className="whitespace-nowrap px-6 py-4 text-sm">
                                                        <span className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium ${statusClass}`}>
                                                            {statusText}
                                                        </span>
                                                    </td>
                                                    <td className="whitespace-nowrap px-6 py-4 text-sm font-medium sm:text-right">
                                                        <button
                                                            onClick={() => handleEnroll(course._id)}
                                                            disabled={buttonDisabled}
                                                            className={`inline-flex items-center justify-center rounded-md px-3 py-2 text-sm font-medium transition-colors ${buttonClass}`}
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
                    </section>

                    <section className="student-fade-up student-surface rounded-2xl p-6" style={{ animationDelay: '210ms' }}>
                        <h2 className="mb-5 flex items-center gap-2 text-2xl font-semibold text-slate-900">
                            <ClipboardDocumentCheckIcon className="h-6 w-6 text-[var(--auth-accent)]" />
                            My Enrolled Course
                        </h2>

                        {myEnrollments.length === 0 ? (
                            <p className="py-6 text-center text-sm text-slate-600 sm:text-base">
                                You are not currently enrolled in any elective course.
                            </p>
                        ) : (
                            <div className="overflow-x-auto">
                                <table className="student-table min-w-full divide-y divide-slate-200">
                                    <thead>
                                        <tr>
                                            <th scope="col" className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-600">Course Name</th>
                                            <th scope="col" className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-600">Department</th>
                                            <th scope="col" className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-600">Professor</th>
                                            <th scope="col" className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-600">Batch</th>
                                            <th scope="col" className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-600">Block</th>
                                            <th scope="col" className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-600">Enrollment Date (IST)</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-200 bg-white/85">
                                        {myEnrollments.map((enrollment) => (
                                            <tr key={enrollment._id}>
                                                <td className="whitespace-nowrap px-6 py-4 text-sm font-medium text-slate-900">
                                                    <div className="flex items-center">
                                                        <AcademicCapIcon className="mr-2 h-4 w-4 text-[var(--auth-accent)]" />
                                                        {enrollment.course.courseName}
                                                    </div>
                                                </td>
                                                <td className="whitespace-nowrap px-6 py-4 text-sm text-slate-600">{enrollment.course.department || '—'}</td>
                                                <td className="whitespace-nowrap px-6 py-4 text-sm text-slate-600">{enrollment.course.professorName || '—'}</td>
                                                <td className="whitespace-nowrap px-6 py-4 text-sm text-slate-600">{enrollment.course.batch}</td>
                                                <td className="whitespace-nowrap px-6 py-4 text-sm text-slate-600">{enrollment.course.block || '—'}</td>
                                                <td className="whitespace-nowrap px-6 py-4 text-sm text-slate-600">
                                                    <div className="flex items-center">
                                                        <CalendarDaysIcon className="mr-2 h-4 w-4 text-slate-500" />
                                                        {new Date(enrollment.enrollmentDate).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata', dateStyle: 'medium', timeStyle: 'short' })}
                                                    </div>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </section>
                </div>
            </div>
        </>
    );
}

export default StudentDashboard;