import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { quizApi } from '../services/api';
import { Trophy, Clock, Eye } from 'lucide-react';

export default function ResultsPage() {
  const [attempts, setAttempts] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    quizApi.getMyAttempts()
      .then(res => setAttempts(res.data?.value || []))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="text-center py-12 text-gray-400">Loading results...</div>;

  return (
    <div>
      <h2 className="text-2xl font-bold text-gray-900 mb-6">My Results</h2>

      {attempts.length === 0 ? (
        <div className="text-center py-16 text-gray-400">
          <Trophy size={48} className="mx-auto mb-4 opacity-30" />
          <p>No quiz attempts yet</p>
          <Link to="/quizzes" className="text-primary-600 hover:underline mt-2 inline-block">Browse Quizzes</Link>
        </div>
      ) : (
        <div className="bg-white rounded-xl shadow-sm border overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full" role="table">
              <thead>
                <tr className="border-b bg-gray-50">
                  <th className="text-left px-6 py-3 text-xs font-semibold text-gray-500 uppercase">Quiz</th>
                  <th className="text-left px-6 py-3 text-xs font-semibold text-gray-500 uppercase">Attempt</th>
                  <th className="text-left px-6 py-3 text-xs font-semibold text-gray-500 uppercase">Score</th>
                  <th className="text-left px-6 py-3 text-xs font-semibold text-gray-500 uppercase">Status</th>
                  <th className="text-left px-6 py-3 text-xs font-semibold text-gray-500 uppercase">Time</th>
                  <th className="text-left px-6 py-3 text-xs font-semibold text-gray-500 uppercase">Date</th>
                  <th className="px-6 py-3"></th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {attempts.map(a => (
                  <tr key={a.ID} className="hover:bg-gray-50 transition">
                    <td className="px-6 py-4 font-medium text-gray-900">
                      {a.quizTitle || 'Quiz'}
                    </td>
                    <td className="px-6 py-4 text-gray-500">#{a.attemptNumber}</td>
                    <td className="px-6 py-4">
                      {a.scorePercentage != null ? (
                        <span className={`font-semibold ${a.passed ? 'text-success-600' : 'text-danger-500'}`}>
                          {a.scorePercentage}%
                        </span>
                      ) : (
                        <span className="text-gray-400">—</span>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      <span className={`text-xs px-2 py-1 rounded-full font-medium ${
                        a.status === 'graded'
                          ? a.passed ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                          : 'bg-yellow-100 text-yellow-700'
                      }`}>
                        {a.status === 'graded' ? (a.passed ? 'Passed' : 'Failed') : a.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-gray-500 text-sm">
                      {a.timeTakenSeconds ? `${Math.round(a.timeTakenSeconds / 60)}m` : '—'}
                    </td>
                    <td className="px-6 py-4 text-gray-400 text-sm">
                      {a.submittedAt ? new Date(a.submittedAt).toLocaleDateString() : '—'}
                    </td>
                    <td className="px-6 py-4">
                      <Link to={`/results/${a.ID}`}
                        className="flex items-center gap-1 text-sm text-primary-600 hover:underline">
                        <Eye size={14} /> Review
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
