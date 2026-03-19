import React, { useState, useEffect, useRef } from 'react';
import { useParams } from 'react-router-dom';
import { adminApi } from '../../services/api';
import { io } from 'socket.io-client';
import toast from 'react-hot-toast';
import { Play, SkipForward, Square, Users, Trophy } from 'lucide-react';

export default function LiveHostPage() {
  const { sessionId } = useParams();
  const [session, setSession] = useState(null);
  const [participants, setParticipants] = useState([]);
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [isActive, setIsActive] = useState(false);
  const socketRef = useRef(null);

  useEffect(() => {
    // Connect to socket
    const socket = io({ path: '/live-quiz' });
    socketRef.current = socket;

    socket.on('participant-joined', (data) => {
      setParticipants(prev => [...prev, data]);
      toast(`${data.nickname} joined!`, { icon: '👋' });
    });

    socket.on('participant-left', (data) => {
      setParticipants(prev => prev.filter(p => p.participantId !== data.participantId));
    });

    return () => socket.disconnect();
  }, []);

  const handleStart = async () => {
    try {
      await adminApi.startLiveSession(sessionId);
      setIsActive(true);
      toast.success('Session started!');
    } catch (err) {
      toast.error('Failed to start session');
    }
  };

  const handleNextQuestion = async () => {
    try {
      const { data } = await adminApi.nextLiveQuestion(sessionId);
      setCurrentQuestion(data.questionIndex);
      socketRef.current?.emit('show-question', {
        sessionCode: session?.sessionCode,
        questionIndex: data.questionIndex,
        timeLimit: 30
      });
    } catch (err) {
      toast.error('Failed to advance question');
    }
  };

  const handleEnd = async () => {
    try {
      await adminApi.endLiveSession(sessionId);
      socketRef.current?.emit('end-session', {
        sessionCode: session?.sessionCode,
        finalLeaderboard: participants
      });
      toast.success('Session ended');
      setIsActive(false);
    } catch (err) {
      toast.error('Failed to end session');
    }
  };

  return (
    <div className="max-w-3xl mx-auto">
      <div className="bg-white rounded-xl shadow-sm border p-6 mb-6">
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Live Quiz Host</h2>
        <div className="flex items-center gap-4 text-sm text-gray-500">
          <span>Session: {sessionId?.substring(0, 8)}</span>
          <span className="flex items-center gap-1">
            <Users size={14} /> {participants.length} participants
          </span>
        </div>
      </div>

      {/* Session code display */}
      <div className="bg-primary-600 text-white rounded-xl p-8 text-center mb-6">
        <p className="text-sm opacity-75 mb-2">Share this code with participants</p>
        <p className="text-5xl font-bold font-mono tracking-wider">{session?.sessionCode || '------'}</p>
        <p className="text-sm opacity-75 mt-2">Go to /live/join to enter</p>
      </div>

      {/* Controls */}
      <div className="flex gap-3 mb-6">
        {!isActive ? (
          <button onClick={handleStart}
            className="flex items-center gap-2 px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition font-medium">
            <Play size={18} /> Start Session
          </button>
        ) : (
          <>
            <button onClick={handleNextQuestion}
              className="flex items-center gap-2 px-6 py-3 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition font-medium">
              <SkipForward size={18} /> Next Question (Q{currentQuestion + 1})
            </button>
            <button onClick={handleEnd}
              className="flex items-center gap-2 px-6 py-3 bg-red-600 text-white rounded-lg hover:bg-red-700 transition font-medium">
              <Square size={18} /> End Session
            </button>
          </>
        )}
      </div>

      {/* Participants list */}
      <div className="bg-white rounded-xl shadow-sm border p-6">
        <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
          <Trophy size={18} className="text-yellow-500" /> Leaderboard
        </h3>
        {participants.length === 0 ? (
          <p className="text-gray-400 text-sm text-center py-4">Waiting for participants...</p>
        ) : (
          <div className="space-y-2">
            {participants
              .sort((a, b) => (b.totalScore || 0) - (a.totalScore || 0))
              .map((p, i) => (
                <div key={p.participantId} className="flex items-center gap-3 px-4 py-2 rounded-lg bg-gray-50">
                  <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
                    i === 0 ? 'bg-yellow-400 text-yellow-900' :
                    i === 1 ? 'bg-gray-300 text-gray-700' :
                    i === 2 ? 'bg-orange-300 text-orange-800' :
                    'bg-gray-100 text-gray-500'
                  }`}>{i + 1}</span>
                  <span className="font-medium text-gray-900 flex-1">{p.nickname}</span>
                  <span className="font-semibold text-gray-600">{p.totalScore || 0} pts</span>
                </div>
              ))}
          </div>
        )}
      </div>
    </div>
  );
}
