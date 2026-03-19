import React, { useEffect, useState } from 'react';
import { adminApi } from '../../services/api';
import toast from 'react-hot-toast';
import { Upload, Download, Search } from 'lucide-react';

export default function QuestionBankPage() {
  const [questions, setQuestions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('');
  const [showImport, setShowImport] = useState(false);
  const [importData, setImportData] = useState('');
  const [importFormat, setImportFormat] = useState('json');

  useEffect(() => { loadBank(); }, []);

  async function loadBank() {
    try {
      const { data } = await adminApi.getQuestionBank();
      setQuestions(data?.value || []);
    } finally {
      setLoading(false);
    }
  }

  async function handleImport() {
    try {
      const { data } = await adminApi.importQuestions(importFormat, importData);
      toast.success(`Imported ${data.imported} questions`);
      if (data.errors?.length) toast.error(`${data.errors.length} errors`);
      setShowImport(false);
      setImportData('');
      loadBank();
    } catch (err) {
      toast.error(err.response?.data?.error?.message || 'Import failed');
    }
  }

  const filtered = questions.filter(q =>
    q.questionText?.toLowerCase().includes(filter.toLowerCase()) ||
    q.category?.toLowerCase().includes(filter.toLowerCase())
  );

  return (
    <div>
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <h2 className="text-2xl font-bold text-gray-900">Question Bank</h2>
        <div className="flex gap-2">
          <button onClick={() => setShowImport(!showImport)}
            className="flex items-center gap-2 px-4 py-2 border rounded-lg text-gray-600 hover:bg-gray-50">
            <Upload size={16} /> Import
          </button>
        </div>
      </div>

      {showImport && (
        <div className="bg-white rounded-xl shadow-sm border p-6 mb-6">
          <h3 className="font-semibold text-gray-900 mb-3">Import Questions</h3>
          <div className="flex gap-3 mb-3">
            <select value={importFormat} onChange={e => setImportFormat(e.target.value)}
              className="border rounded-lg px-3 py-2 text-sm">
              <option value="json">JSON</option>
              <option value="csv">CSV</option>
            </select>
          </div>
          <textarea value={importData} onChange={e => setImportData(e.target.value)}
            rows={6} placeholder={importFormat === 'json'
              ? '[{"questionText":"...","questionType":"mcq_single","options":[{"optionText":"...","isCorrect":true}]}]'
              : 'questionText,questionType,points,explanation,option1,option1_correct,...'}
            className="w-full border rounded-lg px-4 py-2 text-sm font-mono mb-3" />
          <button onClick={handleImport}
            className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 text-sm">
            Import
          </button>
        </div>
      )}

      <div className="mb-4">
        <div className="relative">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input type="search" value={filter} onChange={e => setFilter(e.target.value)}
            placeholder="Search questions..." aria-label="Search question bank"
            className="w-full pl-10 pr-4 py-2.5 border rounded-lg focus:ring-2 focus:ring-primary-500" />
        </div>
      </div>

      {loading ? (
        <div className="text-center py-12 text-gray-400">Loading...</div>
      ) : (
        <div className="space-y-3">
          {filtered.map(q => (
            <div key={q.ID} className="bg-white rounded-lg border p-4">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <p className="font-medium text-gray-900 mb-1">{q.questionText}</p>
                  <div className="flex gap-2 text-xs">
                    <span className="bg-gray-100 px-2 py-0.5 rounded">{q.questionType}</span>
                    {q.difficulty && <span className="bg-gray-100 px-2 py-0.5 rounded">{q.difficulty}</span>}
                    {q.category && <span className="bg-gray-100 px-2 py-0.5 rounded">{q.category}</span>}
                    {q.aiGenerated && <span className="bg-purple-100 text-purple-700 px-2 py-0.5 rounded">AI Generated</span>}
                  </div>
                </div>
                <span className="text-sm text-gray-400">{q.points} pts</span>
              </div>
            </div>
          ))}
          {filtered.length === 0 && (
            <div className="text-center py-8 text-gray-400">No questions found</div>
          )}
        </div>
      )}
    </div>
  );
}
