// client/src/App.js
import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, useNavigate } from 'react-router-dom';
import Auth from './pages/Auth';
import AdminDashboard from './pages/AdminDashboard';
import StudentDashboard from './pages/StudentDashboard';
import AuthSuccess from './pages/AuthSuccess';
import PrivateRoute from './components/PrivateRoute';
// REMOVE: import { ToastContainer } from 'react-toastify';
// REMOVE: import 'react-toastify/dist/ReactToastify.css';

import { Toaster } from 'react-hot-toast'; // Import react-hot-toast Toaster

function App() {
  const [user, setUser] = useState(null);

  useEffect(() => {
    const storedUser = localStorage.getItem('user');
    if (storedUser) {
      try {
        const parsedUser = JSON.parse(storedUser);
        setUser(parsedUser);
      } catch (e) {
        console.error("Failed to parse user from localStorage:", e);
        localStorage.removeItem('user');
      }
    }
  }, []);

  const handleLogout = () => {
    localStorage.removeItem('user');
    setUser(null);
  };

  const UserLogout = () => {
    const navigate = useNavigate();
    useEffect(() => {
      handleLogout();
      navigate('/');
    }, []); // eslint-disable-line react-hooks/exhaustive-deps
    return null;
  };

  return (
    <Router basename="/elective" >
      <Toaster position="top-center" reverseOrder={false} /> {/* ADD THIS LINE for centered toasts */}
      <Routes>
        <Route path="/" element={<Auth setUser={setUser} />} />
        <Route path="/auth-success" element={<AuthSuccess setUser={setUser} />} />
        <Route
          path="/admin-dashboard"
          element={
            <PrivateRoute user={user} allowedRoles={['admin']}>
              <AdminDashboard user={user} onLogout={handleLogout} />
            </PrivateRoute>
          }
        />
        <Route
          path="/student-dashboard"
          element={
            <PrivateRoute user={user} allowedRoles={['student']}>
              <StudentDashboard user={user} onLogout={handleLogout} />
            </PrivateRoute>
          }
        />
        <Route path="/logout" element={<UserLogout />} />
        <Route path="*" element={<h1 className="text-center text-red-500 text-3xl mt-20">404 - Page Not Found</h1>} />
      </Routes>
    </Router>
  );
}

export default App;