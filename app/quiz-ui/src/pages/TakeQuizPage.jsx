import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { quizApi } from '../services/api';
import { useQuizTimer } from '../hooks/useQuizTimer';
import toast from 'react-hot-toast';
import { ChevronLeft, ChevronRight, Send, Clock, AlertTriangle } from 'lucide-react';

export default function TakeQuizPage() {
  const { quizId } = useParams();
  const navigate = useNavigate();
  const [attempt, setAttempt] = useState(null);
  const [currentIdx, setCurrentIdx] = useState(0);
  const [answers, setAnswers] = useState({});
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const questionStartRef = useRef(Date.now());

  // Start or resume the attempt
  useEffect(() => {
    startQuiz();
  }, [quizId]);

  async function startQuiz() {
    try {
      const { data } = await quizApi.startAttempt(quizId);
      setAttempt(data);

      // Load saved answers
      const saved = {};
      for (const q of data.questions || []) {
        if (q.savedAnswer) {
          try {
            saved[q.id] = JSON.parse(q.savedAnswer);
          } catch {
            saved[q.id] = q.savedAnswer;
          }
        }
      }
      setAnswers(saved);
    } catch (err) {
      toast.error(err.response?.data?.error?.message || 'Failed to start quiz');
      navigate('/quizzes');
    } finally {
      setLoading(false);
    }
  }

  // Auto-submit on time up
  const handleTimeUp = useCallback(async () => {
    toast('Time is up! Submitting...', { icon: '⏰' });
    await handleSubmit(true);
  }, [attempt]);

  const { formatTime, isWarning, isDanger } = useQuizTimer(
    attempt?.timeLimit,
    attempt?.startedAt,
    handleTimeUp
  );

  // Save answer for current question (auto-save)
  const saveCurrentAnswer = useCallback(async (questionId, answer) => {
    const timeSpent = Math.round((Date.now() - questionStartRef.current) / 1000);
    try {
      const payload = {
        attemptId: attempt.attemptId,
        questionId,
        timeSpentSeconds: timeSpent
      };

      if (Array.isArray(answer)) {
        payload.selectedOptions = answer;
      } else if (typeof answer === 'string') {
        payload.fillBlankAnswer = answer;
      }

      await quizApi.saveAnswer(payload);
    } catch {
      // Silent fail — student can still re-submit
    }
  }, [attempt]);

  const handleOptionSelect = (questionId, optionId, questionType) => {
    setAnswers(prev => {
      let newAnswer;
      if (questionType === 'mcq_multi') {
        const current = Array.isArray(prev[questionId]) ? prev[questionId] : [];
        newAnswer = current.includes(optionId)
          ? current.filter(id => id !== optionId)
          : [...current, optionId];
      } else {
        newAnswer = [optionId];
      }
      // Auto-save
      saveCurrentAnswer(questionId, newAnswer);
      return { ...prev, [questionId]: newAnswer };
    });
  };

  const handleFillBlank = (questionId, value) => {
    setAnswers(prev => ({ ...prev, [questionId]: value }));
    // Debounced save handled on navigation
  };

  const goToQuestion = (idx) => {
    // Save fill-blank on navigate
    const currentQ = attempt?.questions?.[currentIdx];
    if (currentQ?.questionType === 'fill_blank' && answers[currentQ.id]) {
      saveCurrentAnswer(currentQ.id, answers[currentQ.id]);
    }
    setCurrentIdx(idx);
    questionStartRef.current = Date.now();
  };

  const handleSubmit = async (forced = false) => {
    if (!forced) {
      const unanswered = attempt.questions.filter(q => !answers[q.id]);
      if (unanswered.length > 0) {
        setShowConfirm(true);
        return;
      }
    }
    setSubmitting(true);
    try {
      const { data } = await quizApi.submitAttempt(attempt.attemptId);
      toast.success(`Quiz submitted! Score: ${data.scorePercentage}%`);
      navigate(`/results/${attempt.attemptId}`);
    } catch (err) {
      toast.error(err.response?.data?.error?.message || 'Submission failed');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) return <div className="flex items-center justify-center h-64">Loading quiz...</div>;
  if (!attempt) return null;

  const questions = attempt.questions || [];
  const currentQ = questions[currentIdx];
  const totalQuestions = questions.length;
  const answeredCount = Object.keys(answers).length;

  return (
    <div className="max-w-4xl mx-auto">
      {/* Header with timer and progress */}
      <div className="bg-white rounded-xl shadow-sm border p-4 mb-6 sticky top-0 z-10">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="font-semibold text-gray-900">{attempt.quizTitle}</h2>
            <p className="text-sm text-gray-400">
              Question {currentIdx + 1} of {totalQuestions} | {answeredCount} answered
            </p>
          </div>
          {attempt.timeLimit && (
            <div className={`flex items-center gap-2 px-4 py-2 rounded-lg font-mono text-lg font-bold ${
              isDanger ? 'bg-red-100 text-red-700 animate-pulse' :
              isWarning ? 'bg-yellow-100 text-yellow-700' :
              'bg-gray-100 text-gray-700'
            }`} role="timer" aria-label="Time remaining">
              <Clock size={18} aria-hidden="true" />
              {formatTime()}
            </div>
          )}
        </div>

        {/* Question navigation dots */}
        <div className="flex flex-wrap gap-1.5 mt-3" role="navigation" aria-label="Question navigation">
          {questions.map((q, i) => (
            <button
              key={q.id}
              onClick={() => goToQuestion(i)}
              aria-label={`Go to question ${i + 1}${answers[q.id] ? ' (answered)' : ''}`}
              aria-current={i === currentIdx ? 'step' : undefined}
              className={`w-8 h-8 rounded text-xs font-medium transition ${
                i === currentIdx
                  ? 'bg-primary-600 text-white'
                  : answers[q.id]
                    ? 'bg-green-100 text-green-700'
                    : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
              }`}
            >
              {i + 1}
            </button>
          ))}
        </div>
      </div>

      {/* Question card */}
      {currentQ && (
        <div className="bg-white rounded-xl shadow-sm border p-6 mb-6">
          <div className="flex items-start justify-between mb-4">
            <span className="text-xs bg-gray-100 text-gray-500 px-2 py-1 rounded">
              {currentQ.questionType.replace('_', ' ').toUpperCase()}
            </span>
            <span className="text-xs text-gray-400">{currentQ.points} pts</span>
          </div>

          <p className="text-lg font-medium text-gray-900 mb-6 whitespace-pre-wrap">
            {currentQ.questionText}
          </p>

          {currentQ.mediaUrl && (
            <img src={currentQ.mediaUrl} alt="Question media" className="max-w-full rounded-lg mb-4" />
          )}

          {/* Answer options */}
          {(currentQ.questionType === 'mcq_single' || currentQ.questionType === 'mcq_multi' || currentQ.questionType === 'true_false') && (
            <div className="space-y-3" role="group" aria-label="Answer options">
              {currentQ.questionType === 'mcq_multi' && (
                <p className="text-sm text-gray-400 mb-2">Select all that apply</p>
              )}
              {currentQ.options.map(opt => {
                const isSelected = Array.isArray(answers[currentQ.id])
                  ? answers[currentQ.id].includes(opt.id)
                  : false;
                return (
                  <button
                    key={opt.id}
                    onClick={() => handleOptionSelect(currentQ.id, opt.id, currentQ.questionType)}
                    className={`w-full text-left px-4 py-3 rounded-lg border-2 transition ${
                      isSelected
                        ? 'border-primary-500 bg-primary-50 text-primary-700'
                        : 'border-gray-200 hover:border-gray-300 text-gray-700'
                    }`}
                    role={currentQ.questionType === 'mcq_multi' ? 'checkbox' : 'radio'}
                    aria-checked={isSelected}
                  >
                    <span className="flex items-center gap-3">
                      <span className={`w-5 h-5 rounded-${currentQ.questionType === 'mcq_multi' ? 'sm' : 'full'} border-2 flex items-center justify-center ${
                        isSelected ? 'border-primary-500 bg-primary-500' : 'border-gray-300'
                      }`}>
                        {isSelected && <span className="w-2 h-2 rounded-full bg-white" />}
                      </span>
                      {opt.optionText}
                    </span>
                  </button>
                );
              })}
            </div>
          )}

          {currentQ.questionType === 'fill_blank' && (
            <div>
              <label htmlFor="fill-blank" className="sr-only">Your answer</label>
              <input
                id="fill-blank"
                type="text"
                value={answers[currentQ.id] || ''}
                onChange={e => handleFillBlank(currentQ.id, e.target.value)}
                placeholder="Type your answer..."
                className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg focus:border-primary-500 focus:ring-0 text-lg"
              />
            </div>
          )}
        </div>
      )}

      {/* Navigation buttons */}
      <div className="flex items-center justify-between">
        <button
          onClick={() => goToQuestion(currentIdx - 1)}
          disabled={currentIdx === 0}
          className="flex items-center gap-2 px-4 py-2.5 bg-white border rounded-lg text-gray-600 hover:bg-gray-50 disabled:opacity-30 transition"
        >
          <ChevronLeft size={18} /> Previous
        </button>

        <div className="flex gap-3">
          {currentIdx < totalQuestions - 1 ? (
            <button
              onClick={() => goToQuestion(currentIdx + 1)}
              className="flex items-center gap-2 px-4 py-2.5 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition"
            >
              Next <ChevronRight size={18} />
            </button>
          ) : (
            <button
              onClick={() => handleSubmit()}
              disabled={submitting}
              className="flex items-center gap-2 px-6 py-2.5 bg-success-500 text-white rounded-lg hover:bg-success-600 disabled:opacity-50 transition font-medium"
            >
              <Send size={16} /> {submitting ? 'Submitting...' : 'Submit Quiz'}
            </button>
          )}
        </div>
      </div>

      {/* Confirmation modal */}
      {showConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" role="dialog" aria-modal="true">
          <div className="bg-white rounded-xl shadow-xl p-6 max-w-md mx-4">
            <div className="flex items-center gap-3 mb-4 text-warning-500">
              <AlertTriangle size={24} />
              <h3 className="text-lg font-semibold text-gray-900">Unanswered Questions</h3>
            </div>
            <p className="text-gray-600 mb-6">
              You have {totalQuestions - answeredCount} unanswered question(s). Submit anyway?
            </p>
            <div className="flex gap-3 justify-end">
              <button onClick={() => setShowConfirm(false)}
                className="px-4 py-2 border rounded-lg text-gray-600 hover:bg-gray-50">
                Review Answers
              </button>
              <button onClick={() => { setShowConfirm(false); handleSubmit(true); }}
                className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700">
                Submit Anyway
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
