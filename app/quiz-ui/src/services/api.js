import axios from 'axios';

const api = axios.create({
  baseURL: '/api',
  headers: { 'Content-Type': 'application/json' }
});

// --- Basic Auth for development mode (CAP mocked auth) ---
let basicAuthHeader = null;

export function setBasicAuth(email, password) {
  basicAuthHeader = 'Basic ' + btoa(`${email}:${password}`);
}

export function clearBasicAuth() {
  basicAuthHeader = null;
}

// --- CSRF Token Management (required by CAP for state-changing requests) ---
let csrfToken = null;

async function fetchCsrfToken() {
  if (csrfToken) return csrfToken;
  try {
    const headers = { 'X-CSRF-Token': 'Fetch' };
    if (basicAuthHeader) headers['Authorization'] = basicAuthHeader;
    const res = await axios.head('/api/user/', { headers });
    csrfToken = res.headers['x-csrf-token'];
    return csrfToken;
  } catch {
    return null;
  }
}

// Attach auth + CSRF to requests
api.interceptors.request.use(async (config) => {
  // Basic auth for dev mode
  if (basicAuthHeader) {
    config.headers['Authorization'] = basicAuthHeader;
  }

  // CSRF token for state-changing requests
  const method = config.method?.toUpperCase();
  if (['POST', 'PUT', 'PATCH', 'DELETE'].includes(method)) {
    const token = await fetchCsrfToken();
    if (token) {
      config.headers['X-CSRF-Token'] = token;
    }
  }
  return config;
});

// Handle errors: CSRF expiry, auth failures
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const { config, response } = error;

    // CSRF token expired — refetch and retry once
    if (response?.status === 403 && response?.headers?.['x-csrf-token'] === 'Required') {
      csrfToken = null;
      const newToken = await fetchCsrfToken();
      if (newToken && config && !config._csrfRetry) {
        config._csrfRetry = true;
        config.headers['X-CSRF-Token'] = newToken;
        return api(config);
      }
    }

    // Auth session expired — in production, reload triggers App Router re-auth
    if (response?.status === 401 && window.location.hostname !== 'localhost') {
      window.location.reload();
    }

    return Promise.reject(error);
  }
);

export default api;

// ---- User API (profile management — auth handled by XSUAA/mocked auth) ----
export const authApi = {
  me: () => api.get('/user/me()'),
  updateProfile: (data) => api.post('/user/updateProfile', data)
};

// ---- Quiz API (Student) ----
export const quizApi = {
  getAvailable: () => api.get('/quiz/AvailableQuizzes'),
  startAttempt: (quizId, accessCode) => api.post('/quiz/startAttempt', { quizId, accessCode }),
  resumeAttempt: (attemptId) => api.post('/quiz/resumeAttempt', { attemptId }),
  saveAnswer: (data) => api.post('/quiz/saveAnswer', data),
  submitAttempt: (attemptId) => api.post('/quiz/submitAttempt', { attemptId }),
  getMyAttempts: () => api.get('/quiz/MyAttempts?$orderby=createdAt desc'),
  getAttemptReview: (attemptId) => api.get(`/quiz/AttemptReview?$filter=attempt_ID eq '${attemptId}'`),
  joinByCode: (shareCode, accessCode) => api.post('/quiz/joinByCode', { shareCode, accessCode }),
  joinLiveSession: (sessionCode, nickname) => api.post('/quiz/joinLiveSession', { sessionCode, nickname })
};

// ---- Admin API ----
export const adminApi = {
  // Quizzes
  getQuizzes: () => api.get('/admin/Quizzes?$orderby=createdAt desc'),
  getQuiz: (id) => api.get(`/admin/Quizzes('${id}')?$expand=versions`),
  createQuiz: (data) => api.post('/admin/Quizzes', data),
  updateQuiz: (id, data) => api.patch(`/admin/Quizzes('${id}')`, data),
  deleteQuiz: (id) => api.delete(`/admin/Quizzes('${id}')`),
  publishQuiz: (quizId) => api.post('/admin/publishQuiz', { quizId }),
  unpublishQuiz: (quizId) => api.post('/admin/unpublishQuiz', { quizId }),
  archiveQuiz: (quizId) => api.post('/admin/archiveQuiz', { quizId }),
  createVersion: (quizId) => api.post('/admin/createQuizVersion', { quizId }),

  // Questions
  getQuestions: (versionId) => api.get(`/admin/Questions?$filter=quizVersion_ID eq '${versionId}'&$expand=options&$orderby=orderIndex`),
  createQuestion: (data) => api.post('/admin/Questions', data),
  updateQuestion: (id, data) => api.patch(`/admin/Questions('${id}')`, data),
  deleteQuestion: (id) => api.delete(`/admin/Questions('${id}')`),

  // Options
  createOption: (data) => api.post('/admin/QuestionOptions', data),
  updateOption: (id, data) => api.patch(`/admin/QuestionOptions('${id}')`, data),
  deleteOption: (id) => api.delete(`/admin/QuestionOptions('${id}')`),

  // Question Bank
  getQuestionBank: () => api.get('/admin/QuestionBank?$expand=options&$orderby=createdAt desc'),
  importQuestions: (format, data) => api.post('/admin/importQuestions', { format, data }),
  exportQuestions: (quizId, format) => api.post('/admin/exportQuestions', { quizId, format }),

  // Tags
  getTags: () => api.get('/admin/Tags'),
  createTag: (data) => api.post('/admin/Tags', data),

  // Groups
  getGroups: () => api.get('/admin/Groups?$expand=members'),
  assignQuiz: (data) => api.post('/admin/assignQuiz', data),

  // Users
  getUsers: () => api.get('/admin/Users'),

  // Results
  getAttempts: (quizId) => api.get(`/admin/QuizAttempts?$filter=quiz_ID eq '${quizId}'&$orderby=createdAt desc`),
  getAnalytics: (quizId) => api.post('/admin/getQuizAnalytics', { quizId }),
  exportResults: (quizId, format) => api.post('/admin/exportResults', { quizId, format }),
  generateCertificate: (attemptId) => api.post('/admin/generateCertificate', { attemptId }),

  // Live Sessions
  createLiveSession: (quizId, maxParticipants) => api.post('/admin/createLiveSession', { quizId, maxParticipants }),
  startLiveSession: (sessionId) => api.post('/admin/startLiveSession', { sessionId }),
  nextLiveQuestion: (sessionId) => api.post('/admin/nextLiveQuestion', { sessionId }),
  endLiveSession: (sessionId) => api.post('/admin/endLiveSession', { sessionId }),

  // AI
  generateQuestions: (data) => api.post('/admin/generateQuestions', data),
  generateExplanations: (questionIds) => api.post('/admin/generateExplanations', { questionIds }),
  generateQuizSummary: (quizId) => api.post('/admin/generateQuizSummary', { quizId }),
  getAIRequests: () => api.get('/admin/AIGenerationRequests?$orderby=createdAt desc'),
  approveAIContent: (requestId) => api.post('/admin/approveAIContent', { requestId }),
  rejectAIContent: (requestId) => api.post('/admin/rejectAIContent', { requestId }),

  // Audit
  getAuditLogs: () => api.get('/admin/AuditLogs?$orderby=timestamp desc&$top=100')
};
