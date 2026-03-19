import React, { useState, useEffect, useRef } from 'react';
import { quizApi } from '../../services/api';
import { io } from 'socket.io-client';
import toast from 'react-hot-toast';
import { Radio, Trophy, Clock } from 'lucide-react';

export default function LiveJoinPage() {
  const [sessionCode, setSessionCode] = useState('');
  const [nickname, setNickname] = useState('');
  const [joined, setJoined] = useState(false);
  const [currentQuestion, setCurrentQuestion] = useState(null);
  const [leaderboard, setLeaderboard] = useState([]);
  const [sessionEnded, setSessionEnded] = useState(false);
  const [participantId, setParticipantId] = useState(null);
  const socketRef = useRef(null);

  const handleJoin = async (e) => {
    e.preventDefault();
    try {
      const { data } = await quizApi.joinLiveSession(sessionCode.toUpperCase(), nickname);
      setParticipantId(data.participantId);

      const socket = io({ path: '/live-quiz' });
      socketRef.current = socket;

      socket.emit('join-session', {
        sessionCode: sessionCode.toUpperCase(),
        participantId: data.participantId,
        nickname
      });

      socket.on('question-shown', (data) => {
        setCurrentQuestion(data);
      });

      socket.on('leaderboard-update', (data) => {
        setLeaderboard(data.leaderboard || []);
      });

      socket.on('session-ended', (data) => {
        setSessionEnded(true);
        setLeaderboard(data.finalLeaderboard || []);
      });

      setJoined(true);
      toast.success('Joined session!');
    } catch (err) {
      toast.error(err.response?.data?.error?.message || 'Failed to join');
    }
  };

  const handleAnswer = (optionIndex) => {
    socketRef.current?.emit('submit-answer', {
      sessionCode: sessionCode.toUpperCase(),
      participantId,
      questionIndex: currentQuestion?.questionIndex,
      selectedOption: optionIndex,
      answeredInMs: Date.now() - (currentQuestion?.timestamp || Date.now())
    });
    setCurrentQuestion(prev => prev ? { ...prev, answered: true } : null);
  };

  useEffect(() => {
    return () => socketRef.current?.disconnect();
  }, []);

  // Join form
  if (!joined) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-purple-50 to-purple-100 px-4">
        <form onSubmit={handleJoin} className="bg-white shadow-lg rounded-xl p-8 max-w-md w-full text-center">
          <div className="w-16 h-16 bg-purple-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <Radio size={32} className="text-purple-600" />
          </div>
          <h2 className="text-xl font-bold text-gray-900 mb-6">Join Live Quiz</h2>
          <input type="text" required value={sessionCode}
            onChange={e => setSessionCode(e.target.value)}
            placeholder="Session code"
            className="w-full px-4 py-3 text-center text-2xl font-mono tracking-wider border-2 rounded-lg mb-4 uppercase"
            aria-label="Session code" />
          <input type="text" required value={nickname}
            onChange={e => setNickname(e.target.value)}
            placeholder="Your nickname"
            maxLength={20}
            className="w-full px-4 py-2.5 border rounded-lg mb-4"
            aria-label="Nickname" />
          <button type="submit"
            className="w-full py-3 bg-purple-600 text-white font-medium rounded-lg hover:bg-purple-700 transition">
            Join
          </button>
        </form>
      </div>
    );
  }

  // Session ended
  if (sessionEnded) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-50 to-purple-100 p-6">
        <div className="max-w-md mx-auto text-center">
          <Trophy size={64} className="mx-auto text-yellow-400 mb-4" />
          <h2 className="text-2xl font-bold text-gray-900 mb-6">Session Ended!</h2>
          <div className="bg-white rounded-xl shadow-lg p-6">
            {leaderboard.map((p, i) => (
              <div key={i} className="flex items-center gap-3 py-2">
                <span className="w-8 text-lg font-bold text-gray-400">#{i + 1}</span>
                <span className="flex-1 text-gray-900 font-medium">{p.nickname}</span>
                <span className="font-semibold">{p.totalScore || 0} pts</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  // Waiting or active
  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 to-purple-100 p-6">
      <div className="max-w-lg mx-auto">
        {!currentQuestion ? (
          <div className="text-center py-20">
            <div className="animate-pulse">
              <Clock size={48} className="mx-auto text-purple-400 mb-4" />
              <h2 className="text-xl font-semibold text-gray-700">Waiting for host to start...</h2>
              <p className="text-gray-400 mt-2">You're in! Sit tight, {nickname}.</p>
            </div>
          </div>
        ) : (
          <div className="bg-white rounded-xl shadow-lg p-6">
            <div className="flex justify-between items-center mb-4">
              <span className="text-sm text-gray-400">Question {currentQuestion.questionIndex}</span>
              {currentQuestion.timeLimit && (
                <span className="text-sm bg-purple-100 text-purple-700 px-2 py-1 rounded">
                  {currentQuestion.timeLimit}s
                </span>
              )}
            </div>
            <p className="text-lg font-medium text-gray-900 mb-6">
              {currentQuestion.question?.questionText || 'Question loading...'}
            </p>
            {currentQuestion.answered ? (
              <div className="text-center py-8 text-purple-600 font-medium">
                Answer submitted! Waiting for next question...
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-3">
                {(currentQuestion.question?.options || []).map((opt, i) => {
                  const colors = ['bg-red-500', 'bg-blue-500', 'bg-green-500', 'bg-yellow-500'];
                  return (
                    <button key={i} onClick={() => handleAnswer(i)}
                      className={`${colors[i % 4]} text-white p-4 rounded-xl text-sm font-medium hover:opacity-90 transition`}>
                      {opt.optionText}
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
