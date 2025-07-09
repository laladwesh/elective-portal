import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast'; // Correct import for react-hot-toast

function Auth({ setUser }) {
  const navigate = useNavigate();

  // Redirect if user is already logged in
  useEffect(() => {
    const storedUser = localStorage.getItem('user');
    if (storedUser) {
      try {
        const parsedUser = JSON.parse(storedUser);
        if (parsedUser.role === 'admin') {
          navigate('/admin-dashboard');
        } else if (parsedUser.role === 'student') {
          navigate('/student-dashboard');
        }
      } catch (e) {
        console.error("Failed to parse user from localStorage on Auth page:", e);
        localStorage.removeItem('user');
      }
    }
  }, [navigate]);

  // This is the correct way for your current backend-driven OAuth flow:
  // Directly navigating to your backend's Google auth initiation route.
  const handleGoogleLoginClick = () => {
    // Show a loading toast while redirecting
    toast.loading("Redirecting to Google…", { id: "oauth" }); //
    if (process.env.NODE_ENV === "development") {
      // In development, redirect to local server
      window.location.href = `http://localhost:5000/api/auth/google`;
      return;
    }
    // In production, rely on a relative path assuming a reverse proxy or
    // similar setup maps /api to the backend.
    window.location.href = `/api/auth/google`; //
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-100 to-purple-200 p-4">
      <div className="bg-white p-8 sm:p-10 rounded-xl shadow-2xl text-center max-w-sm w-full border border-gray-100">
        <div className="mb-8">
          <svg className="mx-auto h-16 w-16 text-indigo-600 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6.253v13.5m0-13.5c-4.148 0-7.5 3.352-7.5 7.5s3.352 7.5 7.5 7.5 7.5-3.352 7.5-7.5-3.352-7.5-7.5-7.5zM12 6.253c-1.895 0-3.69 0.738-5.05 2.098S4.952 12.005 4.952 13.899c0 1.895 0.738 3.69 2.098 5.05S10.101 21.005 12 21.005c1.895 0 3.69-0.738 5.05-2.098S19.048 15.794 19.048 13.899c0-1.895-0.738-3.69-2.098-5.05S13.899 6.253 12 6.253z" />
          </svg>
          <h1 className="text-3xl font-extrabold text-gray-900 mb-2">Welcome to PIMS Elective Portal</h1>
          <p className="text-gray-600">Sign in to manage or choose your courses.</p>
        </div>
        <button
          onClick={handleGoogleLoginClick}
          className="w-full bg-white border border-gray-300 text-gray-700 font-semibold py-2 px-4 rounded-lg shadow-sm hover:shadow-md transition-all duration-200 flex items-center justify-center text-lg"
        >
          <img src="https://www.svgrepo.com/show/355037/google.svg" alt="Google logo" className="w-6 h-6 mr-3" />
          Sign in with Google
        </button>
      </div>
    </div>
  );
}

export default Auth;