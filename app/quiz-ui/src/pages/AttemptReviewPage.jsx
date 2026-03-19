import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { quizApi } from '../services/api';
import { CheckCircle, XCircle, ArrowLeft, Lightbulb } from 'lucide-react';

export default function AttemptReviewPage() {
  const { attemptId } = useParams();
  const [answers, setAnswers] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    quizApi.getAttemptReview(attemptId)
      .then(res => setAnswers(res.data?.value || []))
      .finally(() => setLoading(false));
  }, [attemptId]);

  if (loading) return <div className="text-center py-12 text-gray-400">Loading review...</div>;

  return (
    <div className="max-w-3xl mx-auto">
      <Link to="/results" className="flex items-center gap-2 text-gray-500 hover:text-gray-700 mb-6">
        <ArrowLeft size={16} /> Back to Results
      </Link>

      <h2 className="text-2xl font-bold text-gray-900 mb-6">Attempt Review</h2>

      <div className="space-y-6">
        {answers.map((a, i) => (
          <div key={a.ID} className={`bg-white rounded-xl shadow-sm border p-6 ${
            a.isCorrect ? 'border-l-4 border-l-green-500' : 'border-l-4 border-l-red-500'
          }`}>
            <div className="flex items-start justify-between mb-3">
              <span className="text-sm text-gray-400">Question {i + 1}</span>
              <div className="flex items-center gap-2">
                {a.isCorrect ? (
                  <span className="flex items-center gap-1 text-green-600 text-sm font-medium">
                    <CheckCircle size={16} /> Correct
                  </span>
                ) : (
                  <span className="flex items-center gap-1 text-red-600 text-sm font-medium">
                    <XCircle size={16} /> Incorrect
                  </span>
                )}
                <span className="text-sm text-gray-400">
                  {a.pointsAwarded}/{a.points} pts
                </span>
              </div>
            </div>

            <p className="font-medium text-gray-900 mb-4">{a.questionText}</p>

            {a.timeSpentSeconds && (
              <p className="text-xs text-gray-400 mb-3">Time spent: {a.timeSpentSeconds}s</p>
            )}

            {/* Explanation */}
            {a.explanation && (
              <div className="bg-blue-50 rounded-lg p-4 mt-4">
                <div className="flex items-center gap-2 text-blue-700 mb-1">
                  <Lightbulb size={16} />
                  <span className="font-medium text-sm">Explanation</span>
                </div>
                <p className="text-sm text-blue-800">{a.explanation}</p>
              </div>
            )}
          </div>
        ))}
      </div>

      {answers.length === 0 && (
        <div className="text-center py-12 text-gray-400">
          Review not available for this attempt.
        </div>
      )}
    </div>
  );
}
