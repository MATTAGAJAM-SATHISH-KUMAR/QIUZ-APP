import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { adminApi } from '../../services/api';
import toast from 'react-hot-toast';
import { Save, Plus, Trash2, GripVertical } from 'lucide-react';

export default function QuizEditorPage() {
  const { quizId } = useParams();
  const navigate = useNavigate();
  const isNew = !quizId;

  const [quiz, setQuiz] = useState({
    title: '', description: '', category: '', difficulty: 'medium',
    timeLimitMinutes: 30, passingScorePct: 60, attemptsAllowed: 1,
    scoringRule: 'best', negativeMarking: false, negativeMarkPct: 25,
    randomizeQuestions: false, randomizeOptions: false,
    showResultMode: 'immediate', showExplanations: true,
    allowResume: true, antiCheatCopyPaste: false, antiCheatFullScreen: false,
    scheduledStart: '', scheduledEnd: '', requiresAccessCode: false, accessCode: ''
  });
  const [questions, setQuestions] = useState([]);
  const [activeVersionId, setActiveVersionId] = useState(null);
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState('settings'); // settings | questions

  useEffect(() => {
    if (!isNew) loadQuiz();
  }, [quizId]);

  async function loadQuiz() {
    const { data } = await adminApi.getQuiz(quizId);
    setQuiz(data);
    const versions = data.versions || [];
    const active = versions.find(v => v.isActive) || versions[0];
    if (active) {
      setActiveVersionId(active.ID);
      const qRes = await adminApi.getQuestions(active.ID);
      setQuestions(qRes.data?.value || []);
    }
  }

  async function handleSaveQuiz(e) {
    e.preventDefault();
    setSaving(true);
    try {
      if (isNew) {
        const { data } = await adminApi.createQuiz({
          ...quiz,
          tenantId: 't1',
          status: 'draft',
          currentVersion: 1
        });
        toast.success('Quiz created');
        navigate(`/admin/quiz/${data.ID}`);
      } else {
        await adminApi.updateQuiz(quizId, quiz);
        toast.success('Quiz saved');
      }
    } catch (err) {
      toast.error(err.response?.data?.error?.message || 'Save failed');
    } finally {
      setSaving(false);
    }
  }

  async function addQuestion() {
    if (!activeVersionId) {
      toast.error('Save the quiz first to add questions');
      return;
    }
    const newQ = {
      quizVersion_ID: activeVersionId,
      tenantId: 't1',
      questionText: 'New question',
      questionType: 'mcq_single',
      points: 1,
      orderIndex: questions.length + 1,
      explanation: ''
    };
    try {
      const { data } = await adminApi.createQuestion(newQ);
      // Add default options
      for (let i = 0; i < 4; i++) {
        await adminApi.createOption({
          question_ID: data.ID,
          optionText: `Option ${i + 1}`,
          isCorrect: i === 0,
          orderIndex: i + 1
        });
      }
      await loadQuiz();
      toast.success('Question added');
    } catch (err) {
      toast.error('Failed to add question');
    }
  }

  async function updateQuestion(qId, field, value) {
    try {
      await adminApi.updateQuestion(qId, { [field]: value });
    } catch { /* debounced, ignore */ }
  }

  async function updateOption(optId, field, value) {
    try {
      await adminApi.updateOption(optId, { [field]: value });
    } catch { /* ignore */ }
  }

  async function deleteQuestion(qId) {
    await adminApi.deleteQuestion(qId);
    setQuestions(prev => prev.filter(q => q.ID !== qId));
    toast.success('Question deleted');
  }

  const handleChange = (field, value) => {
    setQuiz(prev => ({ ...prev, [field]: value }));
  };

  return (
    <div className="max-w-5xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold text-gray-900">
          {isNew ? 'Create Quiz' : 'Edit Quiz'}
        </h2>
        <button onClick={handleSaveQuiz} disabled={saving}
          className="flex items-center gap-2 px-4 py-2.5 bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:opacity-50 transition">
          <Save size={16} /> {saving ? 'Saving...' : 'Save Quiz'}
        </button>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 mb-6 bg-gray-100 rounded-lg p-1 w-fit">
        {['settings', 'questions'].map(tab => (
          <button key={tab} onClick={() => setActiveTab(tab)}
            className={`px-4 py-2 rounded-md text-sm font-medium transition ${
              activeTab === tab ? 'bg-white shadow-sm text-gray-900' : 'text-gray-500 hover:text-gray-700'
            }`}>
            {tab === 'settings' ? 'Settings' : `Questions (${questions.length})`}
          </button>
        ))}
      </div>

      {/* Settings Tab */}
      {activeTab === 'settings' && (
        <form onSubmit={handleSaveQuiz} className="bg-white rounded-xl shadow-sm border p-6 space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">Title *</label>
              <input type="text" required value={quiz.title} onChange={e => handleChange('title', e.target.value)}
                className="w-full px-4 py-2.5 border rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500" />
            </div>
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
              <textarea rows={3} value={quiz.description || ''} onChange={e => handleChange('description', e.target.value)}
                className="w-full px-4 py-2.5 border rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Category</label>
              <input type="text" value={quiz.category || ''} onChange={e => handleChange('category', e.target.value)}
                className="w-full px-4 py-2.5 border rounded-lg focus:ring-2 focus:ring-primary-500" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Difficulty</label>
              <select value={quiz.difficulty || 'medium'} onChange={e => handleChange('difficulty', e.target.value)}
                className="w-full px-4 py-2.5 border rounded-lg focus:ring-2 focus:ring-primary-500">
                <option value="easy">Easy</option>
                <option value="medium">Medium</option>
                <option value="hard">Hard</option>
                <option value="expert">Expert</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Time Limit (minutes)</label>
              <input type="number" min={0} value={quiz.timeLimitMinutes || ''} onChange={e => handleChange('timeLimitMinutes', parseInt(e.target.value) || null)}
                className="w-full px-4 py-2.5 border rounded-lg" placeholder="0 = unlimited" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Passing Score (%)</label>
              <input type="number" min={0} max={100} value={quiz.passingScorePct} onChange={e => handleChange('passingScorePct', parseFloat(e.target.value))}
                className="w-full px-4 py-2.5 border rounded-lg" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Attempts Allowed (0=unlimited)</label>
              <input type="number" min={0} value={quiz.attemptsAllowed} onChange={e => handleChange('attemptsAllowed', parseInt(e.target.value))}
                className="w-full px-4 py-2.5 border rounded-lg" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Scoring Rule</label>
              <select value={quiz.scoringRule} onChange={e => handleChange('scoringRule', e.target.value)}
                className="w-full px-4 py-2.5 border rounded-lg">
                <option value="best">Best Score</option>
                <option value="latest">Latest Attempt</option>
                <option value="average">Average</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Show Results</label>
              <select value={quiz.showResultMode} onChange={e => handleChange('showResultMode', e.target.value)}
                className="w-full px-4 py-2.5 border rounded-lg">
                <option value="immediate">Immediately after submission</option>
                <option value="after_review">After instructor review</option>
                <option value="after_end">After quiz ends</option>
              </select>
            </div>
          </div>

          <div className="border-t pt-6">
            <h3 className="font-semibold text-gray-900 mb-4">Options</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
              {[
                ['randomizeQuestions', 'Randomize Questions'],
                ['randomizeOptions', 'Randomize Options'],
                ['negativeMarking', 'Negative Marking'],
                ['showExplanations', 'Show Explanations'],
                ['allowResume', 'Allow Resume'],
                ['antiCheatCopyPaste', 'Disable Copy/Paste'],
                ['antiCheatFullScreen', 'Full-screen Mode'],
                ['requiresAccessCode', 'Require Access Code']
              ].map(([key, label]) => (
                <label key={key} className="flex items-center gap-3 cursor-pointer">
                  <input type="checkbox" checked={quiz[key] || false}
                    onChange={e => handleChange(key, e.target.checked)}
                    className="w-4 h-4 rounded text-primary-600 focus:ring-primary-500" />
                  <span className="text-sm text-gray-700">{label}</span>
                </label>
              ))}
            </div>
          </div>

          {quiz.requiresAccessCode && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Access Code</label>
              <input type="text" value={quiz.accessCode || ''} onChange={e => handleChange('accessCode', e.target.value)}
                className="w-full px-4 py-2.5 border rounded-lg max-w-xs" />
            </div>
          )}

          {quiz.negativeMarking && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Negative Mark % (deducted per wrong answer)</label>
              <input type="number" min={0} max={100} value={quiz.negativeMarkPct || 25} onChange={e => handleChange('negativeMarkPct', parseFloat(e.target.value))}
                className="w-full px-4 py-2.5 border rounded-lg max-w-xs" />
            </div>
          )}
        </form>
      )}

      {/* Questions Tab */}
      {activeTab === 'questions' && (
        <div className="space-y-4">
          {questions.map((q, idx) => (
            <div key={q.ID} className="bg-white rounded-xl shadow-sm border p-5">
              <div className="flex items-center gap-3 mb-4">
                <GripVertical size={16} className="text-gray-300" />
                <span className="text-sm font-medium text-gray-400">Q{idx + 1}</span>
                <select value={q.questionType} onChange={e => updateQuestion(q.ID, 'questionType', e.target.value)}
                  className="text-sm border rounded px-2 py-1">
                  <option value="mcq_single">MCQ (Single)</option>
                  <option value="mcq_multi">MCQ (Multi)</option>
                  <option value="true_false">True/False</option>
                  <option value="fill_blank">Fill in Blank</option>
                </select>
                <input type="number" value={q.points} min={0.5} step={0.5}
                  onChange={e => updateQuestion(q.ID, 'points', parseFloat(e.target.value))}
                  className="w-20 text-sm border rounded px-2 py-1" />
                <span className="text-xs text-gray-400">pts</span>
                <div className="flex-1" />
                <button onClick={() => deleteQuestion(q.ID)} className="p-1 text-gray-400 hover:text-red-500">
                  <Trash2 size={16} />
                </button>
              </div>

              <textarea value={q.questionText} rows={2}
                onChange={e => {
                  setQuestions(prev => prev.map(qq => qq.ID === q.ID ? { ...qq, questionText: e.target.value } : qq));
                  updateQuestion(q.ID, 'questionText', e.target.value);
                }}
                className="w-full px-3 py-2 border rounded-lg mb-3 text-sm"
                placeholder="Enter question text..." />

              {/* Options */}
              {q.options?.map((opt, oi) => (
                <div key={opt.ID} className="flex items-center gap-2 mb-2 ml-6">
                  <input type={q.questionType === 'mcq_multi' ? 'checkbox' : 'radio'}
                    name={`correct-${q.ID}`}
                    checked={opt.isCorrect}
                    onChange={() => updateOption(opt.ID, 'isCorrect', !opt.isCorrect)}
                    className="w-4 h-4" />
                  <input type="text" value={opt.optionText}
                    onChange={e => {
                      const newOpts = q.options.map(o => o.ID === opt.ID ? { ...o, optionText: e.target.value } : o);
                      setQuestions(prev => prev.map(qq => qq.ID === q.ID ? { ...qq, options: newOpts } : qq));
                      updateOption(opt.ID, 'optionText', e.target.value);
                    }}
                    className="flex-1 px-3 py-1.5 border rounded text-sm" />
                  <button onClick={() => adminApi.deleteOption(opt.ID).then(loadQuiz)}
                    className="p-1 text-gray-300 hover:text-red-400">
                    <Trash2 size={14} />
                  </button>
                </div>
              ))}

              <textarea value={q.explanation || ''} rows={1}
                onChange={e => {
                  setQuestions(prev => prev.map(qq => qq.ID === q.ID ? { ...qq, explanation: e.target.value } : qq));
                  updateQuestion(q.ID, 'explanation', e.target.value);
                }}
                className="w-full px-3 py-2 border rounded-lg text-sm mt-2 bg-blue-50"
                placeholder="Explanation (shown after answering)" />
            </div>
          ))}

          <button onClick={addQuestion}
            className="flex items-center gap-2 px-4 py-3 border-2 border-dashed rounded-xl text-gray-400 hover:text-primary-600 hover:border-primary-300 transition w-full justify-center">
            <Plus size={18} /> Add Question
          </button>
        </div>
      )}
    </div>
  );
}
