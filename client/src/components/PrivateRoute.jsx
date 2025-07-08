// client/src/components/PrivateRoute.js
import React from 'react';
import { Navigate } from 'react-router-dom';
import { toast } from 'react-hot-toast';

const PrivateRoute = ({ children, user, allowedRoles }) => {
  if (!user) {
    // toast.error('You need to be logged in to access this page.');
    return <Navigate to="/" replace />;
  }

  if (!allowedRoles.includes(user.role)) {
    toast.error('You do not have permission to access this page.');
    // Redirect based on role if they are logged in but not authorized for this specific page
    if (user.role === 'student') {
        return <Navigate to="/student-dashboard" replace />;
    } else if (user.role === 'admin') {
        return <Navigate to="/admin-dashboard" replace />;
    }
    return <Navigate to="/" replace />; // Fallback to login
  }

  return children;
};

export default PrivateRoute;