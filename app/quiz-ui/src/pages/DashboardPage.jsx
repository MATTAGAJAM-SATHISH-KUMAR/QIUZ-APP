import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { quizApi, adminApi } from '../services/api';
import { BookOpen, Trophy, Users, BarChart3, Clock } from 'lucide-react';

export default function DashboardPage() {
  const { user } = useAuth();
  const [stats, setStats] = useState({ quizzes: 0, attempts: 0, avgScore: 0 });
  const [recentAttempts, setRecentAttempts] = useState([]);
  const isAdmin = user?.role === 'Admin' || user?.role === 'Instructor';

  useEffect(() => {
    loadDashboard();
  }, []);

  async function loadDashboard() {
    try {
      const attemptsRes = await quizApi.getMyAttempts();
      const attempts = attemptsRes.data?.value || [];
      setRecentAttempts(attempts.slice(0, 5));

      const graded = attempts.filter(a => a.status === 'graded');
      const avg = graded.length > 0
        ? graded.reduce((s, a) => s + parseFloat(a.scorePercentage || 0), 0) / graded.length
        : 0;

      const quizzesRes = await quizApi.getAvailable();
      setStats({
        quizzes: quizzesRes.data?.value?.length || 0,
        attempts: attempts.length,
        avgScore: Math.round(avg)
      });
    } catch { /* ignore initial load errors */ }
  }

  return (
    <div>
      <h2 className="text-2xl font-bold text-gray-900 mb-6">
        Welcome back, {user?.firstName || 'User'}!
      </h2>

      {/* Stats cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <StatCard icon={BookOpen} label="Available Quizzes" value={stats.quizzes} color="blue" />
        <StatCard icon={Trophy} label="Total Attempts" value={stats.attempts} color="green" />
        <StatCard icon={BarChart3} label="Avg. Score" value={`${stats.avgScore}%`} color="purple" />
        <StatCard icon={Clock} label="Role" value={user?.role} color="orange" />
      </div>

      {/* Quick actions */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
        <div className="bg-white rounded-xl shadow-sm border p-6">
          <h3 className="font-semibold text-gray-900 mb-4">Quick Actions</h3>
          <div className="space-y-2">
            <Link to="/quizzes" className="block px-4 py-3 bg-primary-50 text-primary-700 rounded-lg hover:bg-primary-100 transition font-medium">
              Browse Available Quizzes
            </Link>
            <Link to="/join" className="block px-4 py-3 bg-gray-50 text-gray-700 rounded-lg hover:bg-gray-100 transition font-medium">
              Join Quiz by Code
            </Link>
            {isAdmin && (
              <Link to="/admin/quiz" className="block px-4 py-3 bg-success-500/10 text-success-600 rounded-lg hover:bg-success-500/20 transition font-medium">
                Create New Quiz
              </Link>
            )}
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border p-6">
          <h3 className="font-semibold text-gray-900 mb-4">Recent Activity</h3>
          {recentAttempts.length === 0 ? (
            <p className="text-gray-400 text-sm">No quiz attempts yet. Start your first quiz!</p>
          ) : (
            <div className="space-y-2">
              {recentAttempts.map(a => (
                <Link key={a.ID} to={`/results/${a.ID}`}
                  className="flex items-center justify-between px-3 py-2 rounded-lg hover:bg-gray-50 transition">
                  <div>
                    <p className="text-sm font-medium text-gray-900">{a.quizTitle || 'Quiz'}</p>
                    <p className="text-xs text-gray-400">{new Date(a.createdAt).toLocaleDateString()}</p>
                  </div>
                  <span className={`text-sm font-semibold ${a.passed ? 'text-success-600' : 'text-danger-500'}`}>
                    {a.scorePercentage != null ? `${a.scorePercentage}%` : a.status}
                  </span>
                </Link>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function StatCard({ icon: Icon, label, value, color }) {
  const colors = {
    blue: 'bg-blue-50 text-blue-600',
    green: 'bg-green-50 text-green-600',
    purple: 'bg-purple-50 text-purple-600',
    orange: 'bg-orange-50 text-orange-600'
  };
  return (
    <div className="bg-white rounded-xl shadow-sm border p-5">
      <div className="flex items-center gap-3">
        <div className={`p-2.5 rounded-lg ${colors[color]}`}>
          <Icon size={20} aria-hidden="true" />
        </div>
        <div>
          <p className="text-2xl font-bold text-gray-900">{value}</p>
          <p className="text-xs text-gray-500">{label}</p>
        </div>
      </div>
    </div>
  );
}
