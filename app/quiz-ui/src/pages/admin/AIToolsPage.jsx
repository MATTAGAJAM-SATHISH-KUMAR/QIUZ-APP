import React, { useState, useEffect } from 'react';
import { adminApi } from '../../services/api';
import toast from 'react-hot-toast';
import { Brain, CheckCircle, XCircle, Clock, Sparkles } from 'lucide-react';

export default function AIToolsPage() {
  const [requests, setRequests] = useState([]);
  const [genForm, setGenForm] = useState({
    topic: '', difficulty: 'medium', count: 5, questionType: 'mcq_single'
  });
  const [generating, setGenerating] = useState(false);

  useEffect(() => { loadRequests(); }, []);

  async function loadRequests() {
    try {
      const { data } = await adminApi.getAIRequests();
      setRequests(data?.value || []);
    } catch { /* ignore */ }
  }

  async function handleGenerate(e) {
    e.preventDefault();
    setGenerating(true);
    try {
      const { data } = await adminApi.generateQuestions(genForm);
      toast.success(`Generation started (ID: ${data.requestId?.substring(0, 8)})`);
      setTimeout(loadRequests, 2000); // Refresh after a delay
    } catch (err) {
      toast.error(err.response?.data?.error?.message || 'Generation failed');
    } finally {
      setGenerating(false);
    }
  }

  async function handleApprove(requestId) {
    await adminApi.approveAIContent(requestId);
    toast.success('Content approved');
    loadRequests();
  }

  async function handleReject(requestId) {
    await adminApi.rejectAIContent(requestId);
    toast.success('Content rejected');
    loadRequests();
  }

  const statusConfig = {
    pending: { color: 'bg-yellow-100 text-yellow-700', icon: Clock },
    processing: { color: 'bg-blue-100 text-blue-700', icon: Clock },
    completed: { color: 'bg-green-100 text-green-700', icon: CheckCircle },
    failed: { color: 'bg-red-100 text-red-700', icon: XCircle }
  };

  return (
    <div>
      <h2 className="text-2xl font-bold text-gray-900 mb-6">AI Tools</h2>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Generation Form */}
        <div className="lg:col-span-1">
          <div className="bg-white rounded-xl shadow-sm border p-6">
            <div className="flex items-center gap-2 mb-4">
              <Sparkles size={20} className="text-purple-600" />
              <h3 className="font-semibold text-gray-900">Generate Questions</h3>
            </div>
            <p className="text-sm text-gray-500 mb-4">
              AI-generated content requires human review before publishing.
            </p>
            <form onSubmit={handleGenerate} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Topic</label>
                <input type="text" required value={genForm.topic}
                  onChange={e => setGenForm(p => ({ ...p, topic: e.target.value }))}
                  placeholder="e.g., JavaScript Promises"
                  className="w-full px-3 py-2 border rounded-lg text-sm" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Difficulty</label>
                <select value={genForm.difficulty}
                  onChange={e => setGenForm(p => ({ ...p, difficulty: e.target.value }))}
                  className="w-full px-3 py-2 border rounded-lg text-sm">
                  <option value="easy">Easy</option>
                  <option value="medium">Medium</option>
                  <option value="hard">Hard</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Question Type</label>
                <select value={genForm.questionType}
                  onChange={e => setGenForm(p => ({ ...p, questionType: e.target.value }))}
                  className="w-full px-3 py-2 border rounded-lg text-sm">
                  <option value="mcq_single">MCQ (Single)</option>
                  <option value="mcq_multi">MCQ (Multi)</option>
                  <option value="true_false">True/False</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Number of Questions</label>
                <input type="number" min={1} max={20} value={genForm.count}
                  onChange={e => setGenForm(p => ({ ...p, count: parseInt(e.target.value) }))}
                  className="w-full px-3 py-2 border rounded-lg text-sm" />
              </div>
              <button type="submit" disabled={generating}
                className="w-full py-2.5 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50 transition font-medium text-sm">
                {generating ? 'Generating...' : 'Generate with AI'}
              </button>
            </form>
          </div>
        </div>

        {/* Requests list */}
        <div className="lg:col-span-2">
          <div className="bg-white rounded-xl shadow-sm border p-6">
            <h3 className="font-semibold text-gray-900 mb-4">Generation History</h3>
            {requests.length === 0 ? (
              <p className="text-gray-400 text-sm text-center py-8">No AI generation requests yet</p>
            ) : (
              <div className="space-y-4">
                {requests.map(r => {
                  const cfg = statusConfig[r.status] || statusConfig.pending;
                  const StatusIcon = cfg.icon;
                  return (
                    <div key={r.ID} className="border rounded-lg p-4">
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${cfg.color}`}>
                            {r.status}
                          </span>
                          <span className="text-sm font-medium text-gray-900">{r.requestType}</span>
                        </div>
                        <span className="text-xs text-gray-400">
                          {new Date(r.createdAt).toLocaleString()}
                        </span>
                      </div>

                      {r.topic && (
                        <p className="text-sm text-gray-600 mb-2">
                          Topic: {r.topic} | Difficulty: {r.difficulty} | Count: {r.numberOfItems}
                        </p>
                      )}

                      {r.status === 'completed' && r.outputData && (
                        <details className="mb-3">
                          <summary className="text-sm text-primary-600 cursor-pointer">View generated content</summary>
                          <pre className="mt-2 text-xs bg-gray-50 p-3 rounded overflow-x-auto max-h-60">
                            {JSON.stringify(JSON.parse(r.outputData), null, 2)}
                          </pre>
                        </details>
                      )}

                      {r.status === 'failed' && r.errorMessage && (
                        <p className="text-sm text-red-600 mb-2">{r.errorMessage}</p>
                      )}

                      {r.status === 'completed' && r.reviewStatus === 'pending' && (
                        <div className="flex gap-2 mt-2">
                          <button onClick={() => handleApprove(r.ID)}
                            className="flex items-center gap-1 px-3 py-1.5 bg-green-100 text-green-700 rounded text-sm hover:bg-green-200">
                            <CheckCircle size={14} /> Approve
                          </button>
                          <button onClick={() => handleReject(r.ID)}
                            className="flex items-center gap-1 px-3 py-1.5 bg-red-100 text-red-700 rounded text-sm hover:bg-red-200">
                            <XCircle size={14} /> Reject
                          </button>
                        </div>
                      )}

                      {r.reviewStatus !== 'pending' && (
                        <span className={`text-xs ${r.reviewStatus === 'approved' ? 'text-green-600' : 'text-red-500'}`}>
                          Review: {r.reviewStatus}
                        </span>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
