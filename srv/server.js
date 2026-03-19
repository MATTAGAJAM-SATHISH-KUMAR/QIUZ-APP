// ============================================================================
// CAP Server Bootstrap — Middleware + Socket.IO for live quiz
// Handlers are auto-discovered by CAP convention (service-name.js files)
// ============================================================================
const cds = require('@sap/cds');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const hpp = require('hpp');

cds.on('bootstrap', (app) => {
  // --- Security Middleware ---
  app.use(helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: ["'self'", "'unsafe-inline'", "'unsafe-eval'", "https://ui5.sap.com"],
        scriptSrcElem: ["'self'", "'unsafe-inline'", "https://ui5.sap.com"],
        styleSrc: ["'self'", "'unsafe-inline'", "https://ui5.sap.com", "https://fonts.googleapis.com"],
        fontSrc: ["'self'", "https://ui5.sap.com", "https://fonts.gstatic.com", "data:"],
        imgSrc: ["'self'", "data:", "https:"],
        connectSrc: ["'self'", "ws:", "wss:", "https://ui5.sap.com"],
        frameSrc: ["'self'"]
      }
    }
  }));

  app.use(hpp()); // Prevent HTTP parameter pollution

  // --- Rate Limiting ---
  const apiLimiter = rateLimit({
    windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000,
    max: parseInt(process.env.RATE_LIMIT_MAX) || 100,
    standardHeaders: true,
    legacyHeaders: false,
    message: { error: 'Too many requests, please try again later.' }
  });
  app.use('/api/', apiLimiter);

  // --- Static file serving for certificates ---
  const path = require('path');
  const express = require('express');
  app.use('/certificates', express.static(path.join(process.cwd(), 'gen', 'certificates')));

  // --- Health check ---
  app.get('/health', (req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
  });
});

// --- Socket.IO for Live Quiz Mode ---
cds.on('served', async () => {
  setupLiveQuizSocket();
});

function setupLiveQuizSocket() {
  try {
    const { Server } = require('socket.io');
    const cds = require('@sap/cds');
    const server = cds.server?.server || cds.app?.server;

    if (!server) {
      console.log('[LiveQuiz] HTTP server not available yet, skipping Socket.IO setup');
      return;
    }

    const io = new Server(server, {
      cors: { origin: '*', methods: ['GET', 'POST'] },
      path: '/live-quiz'
    });

    const MAX_PARTICIPANTS = parseInt(process.env.LIVE_QUIZ_MAX_PARTICIPANTS) || 500;

    io.on('connection', (socket) => {
      console.log(`[LiveQuiz] Client connected: ${socket.id}`);

      // Join a live session room
      socket.on('join-session', async (data) => {
        const { sessionCode, participantId, nickname } = data;
        if (!sessionCode || !participantId) return;

        const room = `session:${sessionCode}`;
        const roomSize = io.sockets.adapter.rooms.get(room)?.size || 0;

        if (roomSize >= MAX_PARTICIPANTS) {
          socket.emit('error', { message: 'Session is full' });
          return;
        }

        socket.join(room);
        socket.data = { sessionCode, participantId, nickname };

        io.to(room).emit('participant-joined', {
          participantId,
          nickname,
          totalParticipants: roomSize + 1
        });
      });

      // Host: show next question
      socket.on('show-question', (data) => {
        const { sessionCode, question, questionIndex, timeLimit } = data;
        io.to(`session:${sessionCode}`).emit('question-shown', {
          question,
          questionIndex,
          timeLimit,
          timestamp: Date.now()
        });
      });

      // Participant: submit answer
      socket.on('submit-answer', (data) => {
        const { sessionCode, participantId, questionIndex, selectedOption, answeredInMs } = data;
        io.to(`session:${sessionCode}`).emit('answer-received', {
          participantId,
          questionIndex,
          answeredInMs
        });
      });

      // Host: show leaderboard
      socket.on('show-leaderboard', (data) => {
        const { sessionCode, leaderboard } = data;
        io.to(`session:${sessionCode}`).emit('leaderboard-update', { leaderboard });
      });

      // Host: end session
      socket.on('end-session', (data) => {
        const { sessionCode, finalLeaderboard } = data;
        io.to(`session:${sessionCode}`).emit('session-ended', { finalLeaderboard });
      });

      socket.on('disconnect', () => {
        const { sessionCode, participantId, nickname } = socket.data || {};
        if (sessionCode) {
          io.to(`session:${sessionCode}`).emit('participant-left', {
            participantId,
            nickname
          });
        }
      });
    });

    console.log('[LiveQuiz] Socket.IO initialized on /live-quiz');
  } catch (err) {
    console.warn('[LiveQuiz] Socket.IO setup skipped:', err.message);
  }
}

module.exports = cds.server;
