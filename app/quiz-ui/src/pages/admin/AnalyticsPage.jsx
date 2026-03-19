import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { adminApi } from '../../services/api';
import toast from 'react-hot-toast';
import { Download, BarChart3, Users, Clock, Award } from 'lucide-react';

export default function AnalyticsPage() {
  const { quizId } = useParams();
  const [quizzes, setQuizzes] = useState([]);
  const [selectedQuiz, setSelectedQuiz] = useState(quizId || '');
  const [analytics, setAnalytics] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    adminApi.getQuizzes().then(res => setQuizzes(res.data?.value || []));
  }, []);

  useEffect(() => {
    if (selectedQuiz) loadAnalytics(selectedQuiz);
  }, [selectedQuiz]);

  async function loadAnalytics(qId) {
    setLoading(true);
    try {
      const { data } = await adminApi.getAnalytics(qId);
      setAnalytics(data);
    } catch {
      setAnalytics(null);
    } finally {
      setLoading(false);
    }
  }

  async function handleExport() {
    try {
      const { data } = await adminApi.exportResults(selectedQuiz, 'csv');
      const blob = new Blob([data], { type: 'text/csv' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `results-${selectedQuiz}.csv`;
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      toast.error('Export failed');
    }
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold text-gray-900">Analytics</h2>
        {selectedQuiz && (
          <button onClick={handleExport}
            className="flex items-center gap-2 px-4 py-2 border rounded-lg text-gray-600 hover:bg-gray-50">
            <Download size={16} /> Export CSV
          </button>
        )}
      </div>

      <select value={selectedQuiz} onChange={e => setSelectedQuiz(e.target.value)}
        className="w-full max-w-md px-4 py-2.5 border rounded-lg mb-6 focus:ring-2 focus:ring-primary-500"
        aria-label="Select quiz">
        <option value="">Select a quiz...</option>
        {quizzes.map(q => (
          <option key={q.ID} value={q.ID}>{q.title}</option>
        ))}
      </select>

      {loading && <div className="text-center py-12 text-gray-400">Loading analytics...</div>}

      {analytics && !loading && (
        <div>
          {/* Summary cards */}
          <div className="grid grid-cols-2 lg:grid-cols-5 gap-4 mb-8">
            <StatCard icon={BarChart3} label="Total Attempts" value={analytics.totalAttempts} />
            <StatCard icon={Users} label="Unique Students" value={analytics.uniqueStudents} />
            <StatCard icon={Award} label="Avg Score" value={`${analytics.avgScore}%`} />
            <StatCard icon={Award} label="Pass Rate" value={`${analytics.passRate}%`} />
            <StatCard icon={Clock} label="Avg Time" value={`${Math.round(analytics.avgTimeTaken / 60)}m`} />
          </div>

          {/* Score distribution */}
          <div className="bg-white rounded-xl shadow-sm border p-6 mb-6">
            <h3 className="font-semibold text-gray-900 mb-4">Score Distribution</h3>
            <div className="flex items-end gap-2 h-40">
              {analytics.scoreDistribution?.map((bucket, i) => {
                const maxCount = Math.max(...analytics.scoreDistribution.map(b => b.count), 1);
                const height = (bucket.count / maxCount) * 100;
                return (
                  <div key={i} className="flex-1 flex flex-col items-center gap-1">
                    <span className="text-xs text-gray-500">{bucket.count}</span>
                    <div className="w-full bg-primary-500 rounded-t" style={{ height: `${height}%`, minHeight: bucket.count > 0 ? 4 : 0 }} />
                    <span className="text-xs text-gray-400">{bucket.rangeLabel}</span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Question accuracy */}
          <div className="bg-white rounded-xl shadow-sm border p-6">
            <h3 className="font-semibold text-gray-900 mb-4">Question-wise Accuracy</h3>
            <div className="space-y-3">
              {analytics.questionAccuracy?.map((q, i) => (
                <div key={q.questionId} className="flex items-center gap-4">
                  <span className="text-sm text-gray-400 w-8">Q{i + 1}</span>
                  <div className="flex-1">
                    <p className="text-sm text-gray-700 mb-1 truncate">{q.questionText}</p>
                    <div className="w-full bg-gray-100 rounded-full h-2">
                      <div className={`h-2 rounded-full ${q.correctPct >= 70 ? 'bg-green-500' : q.correctPct >= 40 ? 'bg-yellow-500' : 'bg-red-500'}`}
                        style={{ width: `${q.correctPct}%` }} />
                    </div>
                  </div>
                  <span className="text-sm font-medium text-gray-600 w-16 text-right">
                    {q.correctPct}%
                  </span>
                  <span className="text-xs text-gray-400 w-12 text-right">
                    {q.avgTime}s
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function StatCard({ icon: Icon, label, value }) {
  return (
    <div className="bg-white rounded-xl shadow-sm border p-4">
      <Icon size={18} className="text-gray-400 mb-2" aria-hidden="true" />
      <p className="text-xl font-bold text-gray-900">{value}</p>
      <p className="text-xs text-gray-500">{label}</p>
    </div>
  );
}
