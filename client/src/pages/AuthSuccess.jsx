// client/src/pages/AuthSuccess.js
import React, { useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { toast } from 'react-hot-toast';

function AuthSuccess({ setUser }) {
  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const token = params.get('token');
    const name = params.get('name');
    const email = params.get('email');
    const role = params.get('role');
    const batch = params.get('batch');
    const error = params.get('error');

    if (error) {
        toast.error(`Authentication failed: ${decodeURIComponent(error)}`);
        navigate('/'); // Redirect to login page on error
        return;
    }

    if (token && name && email && role) {
      const userData = {
        token,
        name: decodeURIComponent(name),
        email: decodeURIComponent(email),
        role: decodeURIComponent(role),
        batch: batch ? decodeURIComponent(batch) : '', // Batch might be empty for new users or admins
      };
      localStorage.setItem('user', JSON.stringify(userData));
      setUser(userData);
      toast.success('Login successful!');

      if (userData.role === 'admin') {
        navigate('/admin-dashboard');
      } else {
        navigate('/student-dashboard');
      }
    } else {
      toast.error('Authentication successful, but missing user data. Please try again.');
      navigate('/');
    }
  }, [location, navigate, setUser]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100">
      <div className="bg-white p-8 rounded-lg shadow-md text-center">
        <h1 className="text-2xl font-bold mb-6">Processing login...</h1>
        <p>Please wait while we redirect you.</p>
      </div>
    </div>
  );
}

export default AuthSuccess;