import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import toast from 'react-hot-toast';

/**
 * Development Login Page — Uses HTTP Basic Auth for CAP mocked auth.
 * In production, XSUAA via App Router handles authentication automatically.
 * This page is only shown when running locally with `cds watch`.
 */
export default function DevLoginPage() {
  const { login, user } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);

  // If already logged in, redirect
  if (user) {
    navigate('/dashboard', { replace: true });
    return null;
  }

  const handleLogin = async (email, password) => {
    setLoading(true);
    try {
      await login(email, password);
      toast.success('Welcome!');
      navigate('/dashboard');
    } catch (err) {
      toast.error('Login failed — check credentials');
    } finally {
      setLoading(false);
    }
  };

  const devUsers = [
    { label: 'Admin', email: 'admin@quiz.app', password: 'admin', color: 'bg-red-50 hover:bg-red-100 border-red-200 text-red-700' },
    { label: 'Instructor', email: 'instructor@quiz.app', password: 'instructor', color: 'bg-blue-50 hover:bg-blue-100 border-blue-200 text-blue-700' },
    { label: 'Student', email: 'student@quiz.app', password: 'student', color: 'bg-green-50 hover:bg-green-100 border-green-200 text-green-700' }
  ];

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary-50 to-primary-100 px-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-primary-700">Quiz App</h1>
          <p className="text-gray-500 mt-2">SAP BTP CAPM — Development Mode</p>
        </div>

        <div className="bg-white shadow-lg rounded-xl p-8">
          <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 mb-6">
            <p className="text-sm text-amber-800">
              <strong>Dev Mode:</strong> Uses CAP mocked auth (Basic Auth).
              In production, SAP XSUAA handles login automatically via the App Router.
            </p>
          </div>

          <h3 className="font-medium text-gray-700 mb-4">Quick Login</h3>
          <div className="space-y-3">
            {devUsers.map(u => (
              <button
                key={u.label}
                onClick={() => handleLogin(u.email, u.password)}
                disabled={loading}
                className={`w-full flex items-center justify-between px-4 py-3 border rounded-lg transition font-medium ${u.color} disabled:opacity-50`}
              >
                <span>{u.label}</span>
                <span className="text-xs opacity-60">{u.email}</span>
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
