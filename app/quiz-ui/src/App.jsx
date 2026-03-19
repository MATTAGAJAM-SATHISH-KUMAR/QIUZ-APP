import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { AuthProvider, useAuth } from './hooks/useAuth';
import Layout from './components/Layout';
import DashboardPage from './pages/DashboardPage';
import QuizListPage from './pages/QuizListPage';
import TakeQuizPage from './pages/TakeQuizPage';
import ResultsPage from './pages/ResultsPage';
import AttemptReviewPage from './pages/AttemptReviewPage';
import AdminQuizListPage from './pages/admin/AdminQuizListPage';
import QuizEditorPage from './pages/admin/QuizEditorPage';
import QuestionBankPage from './pages/admin/QuestionBankPage';
import AnalyticsPage from './pages/admin/AnalyticsPage';
import UsersPage from './pages/admin/UsersPage';
import LiveHostPage from './pages/live/LiveHostPage';
import LiveJoinPage from './pages/live/LiveJoinPage';
import AIToolsPage from './pages/admin/AIToolsPage';
import JoinByCodePage from './pages/JoinByCodePage';
import DevLoginPage from './pages/DevLoginPage';

function ProtectedRoute({ children, roles }) {
  const { user, loading } = useAuth();
  if (loading) return <div className="flex items-center justify-center h-screen">Loading...</div>;
  // In dev mode user might not be set if basic auth not yet provided
  if (!user) return <Navigate to="/dev-login" replace />;
  if (roles && !roles.includes(user.role)) return <Navigate to="/dashboard" replace />;
  return children;
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Toaster position="top-right" />
        <Routes>
          {/* Dev login page (for local development with mocked CAP auth) */}
          <Route path="/dev-login" element={<DevLoginPage />} />

          {/* Public routes (served via App Router auth in production) */}
          <Route path="/join" element={<JoinByCodePage />} />
          <Route path="/live/join" element={<LiveJoinPage />} />

          {/* Protected routes */}
          <Route path="/" element={<ProtectedRoute><Layout /></ProtectedRoute>}>
            <Route index element={<Navigate to="/dashboard" replace />} />
            <Route path="dashboard" element={<DashboardPage />} />
            <Route path="quizzes" element={<QuizListPage />} />
            <Route path="quiz/:quizId" element={<TakeQuizPage />} />
            <Route path="results" element={<ResultsPage />} />
            <Route path="results/:attemptId" element={<AttemptReviewPage />} />

            {/* Admin/Instructor routes */}
            <Route path="admin/quizzes" element={
              <ProtectedRoute roles={['Admin', 'Instructor']}><AdminQuizListPage /></ProtectedRoute>
            } />
            <Route path="admin/quiz/:quizId?" element={
              <ProtectedRoute roles={['Admin', 'Instructor']}><QuizEditorPage /></ProtectedRoute>
            } />
            <Route path="admin/question-bank" element={
              <ProtectedRoute roles={['Admin', 'Instructor']}><QuestionBankPage /></ProtectedRoute>
            } />
            <Route path="admin/analytics/:quizId?" element={
              <ProtectedRoute roles={['Admin', 'Instructor']}><AnalyticsPage /></ProtectedRoute>
            } />
            <Route path="admin/users" element={
              <ProtectedRoute roles={['Admin']}><UsersPage /></ProtectedRoute>
            } />
            <Route path="admin/ai-tools" element={
              <ProtectedRoute roles={['Admin', 'Instructor']}><AIToolsPage /></ProtectedRoute>
            } />
            <Route path="live/host/:sessionId" element={
              <ProtectedRoute roles={['Admin', 'Instructor']}><LiveHostPage /></ProtectedRoute>
            } />
          </Route>

          <Route path="*" element={<Navigate to="/dashboard" replace />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
}
