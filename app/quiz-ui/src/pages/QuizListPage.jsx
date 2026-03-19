import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { quizApi } from '../services/api';
import { Clock, Award, Hash, ArrowRight } from 'lucide-react';

export default function QuizListPage() {
  const [quizzes, setQuizzes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    quizApi.getAvailable()
      .then(res => setQuizzes(res.data?.value || []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const filtered = quizzes.filter(q =>
    q.title.toLowerCase().includes(filter.toLowerCase()) ||
    q.category?.toLowerCase().includes(filter.toLowerCase())
  );

  const difficultyColors = {
    easy: 'bg-green-100 text-green-700',
    medium: 'bg-yellow-100 text-yellow-700',
    hard: 'bg-red-100 text-red-700',
    expert: 'bg-purple-100 text-purple-700'
  };

  if (loading) return <div className="text-center py-12 text-gray-400">Loading quizzes...</div>;

  return (
    <div>
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <h2 className="text-2xl font-bold text-gray-900">Available Quizzes</h2>
        <input
          type="search"
          placeholder="Search quizzes..."
          value={filter}
          onChange={e => setFilter(e.target.value)}
          className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 w-full sm:w-64"
          aria-label="Search quizzes"
        />
      </div>

      {filtered.length === 0 ? (
        <div className="text-center py-16 text-gray-400">
          <p className="text-lg">No quizzes available</p>
          <p className="text-sm mt-1">Check back later or join by code</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filtered.map(quiz => (
            <div key={quiz.ID} className="bg-white rounded-xl shadow-sm border hover:shadow-md transition group">
              <div className="p-5">
                <div className="flex items-start justify-between mb-3">
                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${difficultyColors[quiz.difficulty] || 'bg-gray-100 text-gray-600'}`}>
                    {quiz.difficulty || 'N/A'}
                  </span>
                  {quiz.category && (
                    <span className="text-xs text-gray-400">{quiz.category}</span>
                  )}
                </div>
                <h3 className="font-semibold text-gray-900 mb-2 group-hover:text-primary-600 transition">
                  {quiz.title}
                </h3>
                <p className="text-sm text-gray-500 mb-4 line-clamp-2">
                  {quiz.description || 'No description'}
                </p>
                <div className="flex items-center gap-4 text-xs text-gray-400 mb-4">
                  {quiz.timeLimitMinutes && (
                    <span className="flex items-center gap-1">
                      <Clock size={14} aria-hidden="true" />
                      {quiz.timeLimitMinutes} min
                    </span>
                  )}
                  <span className="flex items-center gap-1">
                    <Award size={14} aria-hidden="true" />
                    Pass: {quiz.passingScorePct}%
                  </span>
                  <span className="flex items-center gap-1">
                    <Hash size={14} aria-hidden="true" />
                    {quiz.attemptsAllowed === 0 ? 'Unlimited' : `${quiz.attemptsAllowed} attempts`}
                  </span>
                </div>
                <button
                  onClick={() => navigate(`/quiz/${quiz.ID}`)}
                  className="w-full flex items-center justify-center gap-2 py-2.5 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition font-medium text-sm"
                >
                  Start Quiz <ArrowRight size={16} aria-hidden="true" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
