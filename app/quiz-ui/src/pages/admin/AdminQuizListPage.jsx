import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { adminApi } from '../../services/api';
import toast from 'react-hot-toast';
import { Plus, Edit, Eye, Archive, Send, MoreVertical } from 'lucide-react';

export default function AdminQuizListPage() {
  const [quizzes, setQuizzes] = useState([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => { loadQuizzes(); }, []);

  async function loadQuizzes() {
    try {
      const { data } = await adminApi.getQuizzes();
      setQuizzes(data?.value || []);
    } finally {
      setLoading(false);
    }
  }

  const handlePublish = async (quizId) => {
    try {
      const { data } = await adminApi.publishQuiz(quizId);
      toast.success(data.message);
      loadQuizzes();
    } catch (err) {
      toast.error(err.response?.data?.error?.message || 'Publish failed');
    }
  };

  const handleArchive = async (quizId) => {
    await adminApi.archiveQuiz(quizId);
    toast.success('Quiz archived');
    loadQuizzes();
  };

  const statusColors = {
    draft: 'bg-gray-100 text-gray-600',
    published: 'bg-green-100 text-green-700',
    archived: 'bg-yellow-100 text-yellow-700'
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold text-gray-900">Manage Quizzes</h2>
        <Link to="/admin/quiz"
          className="flex items-center gap-2 px-4 py-2.5 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition font-medium">
          <Plus size={18} /> New Quiz
        </Link>
      </div>

      {loading ? (
        <div className="text-center py-12 text-gray-400">Loading...</div>
      ) : quizzes.length === 0 ? (
        <div className="text-center py-16 bg-white rounded-xl border">
          <p className="text-gray-400 mb-2">No quizzes created yet</p>
          <Link to="/admin/quiz" className="text-primary-600 hover:underline">Create your first quiz</Link>
        </div>
      ) : (
        <div className="bg-white rounded-xl shadow-sm border overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="border-b bg-gray-50">
                <th className="text-left px-6 py-3 text-xs font-semibold text-gray-500 uppercase">Title</th>
                <th className="text-left px-6 py-3 text-xs font-semibold text-gray-500 uppercase">Status</th>
                <th className="text-left px-6 py-3 text-xs font-semibold text-gray-500 uppercase">Category</th>
                <th className="text-left px-6 py-3 text-xs font-semibold text-gray-500 uppercase">Share Code</th>
                <th className="text-left px-6 py-3 text-xs font-semibold text-gray-500 uppercase">Created</th>
                <th className="px-6 py-3"></th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {quizzes.map(q => (
                <tr key={q.ID} className="hover:bg-gray-50">
                  <td className="px-6 py-4">
                    <Link to={`/admin/quiz/${q.ID}`} className="font-medium text-gray-900 hover:text-primary-600">
                      {q.title}
                    </Link>
                  </td>
                  <td className="px-6 py-4">
                    <span className={`text-xs px-2 py-1 rounded-full font-medium ${statusColors[q.status]}`}>
                      {q.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-gray-500 text-sm">{q.category || '—'}</td>
                  <td className="px-6 py-4">
                    {q.shareCode ? (
                      <code className="text-sm bg-gray-100 px-2 py-0.5 rounded">{q.shareCode}</code>
                    ) : '—'}
                  </td>
                  <td className="px-6 py-4 text-gray-400 text-sm">
                    {new Date(q.createdAt).toLocaleDateString()}
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2">
                      <button onClick={() => navigate(`/admin/quiz/${q.ID}`)} title="Edit"
                        className="p-1.5 text-gray-400 hover:text-primary-600 transition">
                        <Edit size={16} />
                      </button>
                      <button onClick={() => navigate(`/admin/analytics/${q.ID}`)} title="Analytics"
                        className="p-1.5 text-gray-400 hover:text-primary-600 transition">
                        <Eye size={16} />
                      </button>
                      {q.status === 'draft' && (
                        <button onClick={() => handlePublish(q.ID)} title="Publish"
                          className="p-1.5 text-gray-400 hover:text-green-600 transition">
                          <Send size={16} />
                        </button>
                      )}
                      {q.status !== 'archived' && (
                        <button onClick={() => handleArchive(q.ID)} title="Archive"
                          className="p-1.5 text-gray-400 hover:text-yellow-600 transition">
                          <Archive size={16} />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
