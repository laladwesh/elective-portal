import React from 'react';
import { GoogleLogin } from '@react-oauth/google';
import axios from 'axios';
import { toast } from 'react-hot-toast';

function LoginPage({ onLogin }) {
  const handleSuccess = async (response) => {
    try {
      // Send the Google ID token to your backend for verification
      const res = await axios.post('/api/auth/google', { id_token: response.credential });
      onLogin(res.data); // Pass the user data (including your JWT) up to App.js
    } catch (error) {
      toast.error(error.response?.data?.message || 'Google login failed on backend');
      console.error('Login error:', error);
    }
  };

  const handleError = () => {
    toast.error('Google login failed. Please try again.');
    console.log('Google Login Failed');
  };

  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-100">
      <div className="bg-white p-8 rounded-lg shadow-md w-96 text-center">
        <h2 className="text-2xl font-bold mb-6">Login to Elective Portal</h2>
        <p className="mb-4 text-gray-600">Please sign in with your Google account.</p>
        <div className="flex justify-center">
          <GoogleLogin
            onSuccess={handleSuccess}
            onError={handleError}
            use
            text="signin_with" // Options: "signin_with", "continue_with", "signup_with"
            shape="rectangular" // Options: "rectangular", "pill"
            theme="filled_blue" // Options: "outline", "filled_blue", "filled_black"
          />
        </div>
        {/* You can add a manual admin login here if you intend for admins to not use Google OAuth */}
      </div>
    </div>
  );
}

export default LoginPage;