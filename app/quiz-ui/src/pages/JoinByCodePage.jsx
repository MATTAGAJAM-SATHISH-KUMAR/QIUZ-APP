import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { quizApi } from '../services/api';
import toast from 'react-hot-toast';
import { Hash } from 'lucide-react';

export default function JoinByCodePage() {
  const [code, setCode] = useState('');
  const [accessCode, setAccessCode] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleJoin = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const { data } = await quizApi.joinByCode(code.toUpperCase(), accessCode);
      toast.success(`Found: ${data.title}`);
      navigate(`/quiz/${data.quizId}`);
    } catch (err) {
      toast.error(err.response?.data?.error?.message || 'Quiz not found');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary-50 to-primary-100 px-4">
      <form onSubmit={handleJoin} className="bg-white shadow-lg rounded-xl p-8 max-w-md w-full">
        <div className="text-center mb-6">
          <div className="w-16 h-16 bg-primary-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <Hash size={32} className="text-primary-600" />
          </div>
          <h2 className="text-xl font-bold text-gray-900">Join Quiz by Code</h2>
        </div>
        <div className="space-y-4">
          <input
            type="text"
            value={code}
            onChange={e => setCode(e.target.value)}
            placeholder="Enter quiz code (e.g., JS101X)"
            required
            maxLength={20}
            className="w-full px-4 py-3 text-center text-2xl font-mono tracking-wider border-2 border-gray-200 rounded-lg focus:border-primary-500 focus:ring-0 uppercase"
            aria-label="Quiz code"
          />
          <input
            type="text"
            value={accessCode}
            onChange={e => setAccessCode(e.target.value)}
            placeholder="Access code (if required)"
            className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
            aria-label="Access code"
          />
          <button type="submit" disabled={loading}
            className="w-full py-3 bg-primary-600 text-white font-medium rounded-lg hover:bg-primary-700 disabled:opacity-50 transition">
            {loading ? 'Joining...' : 'Join Quiz'}
          </button>
        </div>
      </form>
    </div>
  );
}
