# Quiz App — SAP BTP CAPM + React

A production-ready, multi-tenant quiz platform built on **SAP BTP Cloud Application Programming Model (CAPM)** with a **React** frontend. Authentication via **SAP XSUAA**, deployed with **MTA** to Cloud Foundry. Supports quiz creation, real-time live quizzes, AI-powered question generation, analytics, and certificate generation.

---

## Architecture Overview

```
┌─────────────────────────────────────────────────────────┐
│                  SAP BTP App Router                       │
│  (XSUAA Authentication + Static UI + API Proxy)          │
├─────────────────────────────────────────────────────────┤
│                FRONTEND (React + Vite)                    │
│  ┌──────────┐ ┌──────────┐ ┌───────────┐ ┌──────────┐  │
│  │Dashboard │ │ Take Quiz│ │  Results  │ │  Admin   │  │
│  │          │ │ Timer    │ │  Review   │ │ Quiz CRUD│  │
│  └──────────┘ └──────────┘ └───────────┘ │ Analytics│  │
│                                           │ AI Tools │  │
│                                           └──────────┘  │
├─────────────────────────────────────────────────────────┤
│              SAP CAP Backend (Node.js)                    │
│  ┌──────────────┐ ┌──────────────┐ ┌────────────────┐  │
│  │ UserService   │ │ QuizService  │ │ AdminService   │  │
│  │ /api/user     │ │ /api/quiz    │ │ /api/admin     │  │
│  │ Profile mgmt  │ │ Take/Submit  │ │ CRUD/Analytics │  │
│  └──────────────┘ └──────────────┘ └────────────────┘  │
│  ┌──────────────────────────────────────────────────┐   │
│  │  Auth: XSUAA (prod) / Mocked (dev)               │   │
│  │  Middleware: Helmet, Rate Limiter, HPP            │   │
│  │  Socket.IO: Live quiz real-time sessions          │   │
│  └──────────────────────────────────────────────────┘   │
├─────────────────────────────────────────────────────────┤
│                   Data Layer (CDS)                        │
│  SQLite (dev) → SAP HANA Cloud (prod via HDI)            │
│  Multi-tenant via @sap/cds-mtxs                          │
│  Quiz versioning for immutable attempt records            │
└─────────────────────────────────────────────────────────┘
```

## Database Schema (Entity-Relationship)

```
Tenants 1──* Users 1──* QuizAttempts *──1 Quizzes
                │                            │
                *                            │
           GroupMembers                 QuizVersions
                │                            │
                *                            *
             Groups                      Questions
                │                            │
                *                            *
         QuizAssignments             QuestionOptions
                                         MatchPairs
Quizzes 1──* LiveSessions 1──* LiveParticipants
                              1──* LeaderboardEntries

QuestionBank (standalone reusable pool)
Certificates ──1 QuizAttempts
AuditLogs (append-only security log)
AIGenerationRequests (tracked AI content with review workflow)
```

## Tech Stack

| Layer | Technology |
|-------|-----------|
| **Data Model** | SAP CDS (Core Data Services) |
| **Backend** | SAP CAP Node.js runtime (@sap/cds ^9) |
| **Frontend** | React 18 + Vite + Tailwind CSS |
| **Auth** | SAP XSUAA (prod) / Mocked auth (dev) |
| **Real-time** | Socket.IO |
| **AI** | OpenAI GPT-4 (pluggable) |
| **PDF** | PDFKit (certificates) |
| **Database** | SQLite (dev) / SAP HANA Cloud (prod) |
| **Deployment** | MTA (Multi-Target Application) to Cloud Foundry |
| **App Router** | @sap/approuter (UI serving + auth proxy) |
| **Tests** | Jest (63 tests) |

## Project Structure

```
QUIZ-APP/
├── package.json              # Root CAP project
├── mta.yaml                  # MTA deployment descriptor
├── xs-security.json          # XSUAA security configuration
├── .cdsrc.json               # CDS configuration
├── approuter/
│   ├── package.json          # App Router dependencies
│   └── xs-app.json           # Routing rules (UI + API proxy)
├── db/
│   ├── schema.cds            # Complete data model (20+ entities)
│   ├── data/                 # CSV seed data (tenants, users, tags, groups)
│   └── seed/
│       └── seed-quizzes.js   # Seed script: 2 quizzes, 20 questions
├── srv/
│   ├── auth-service.cds      # User profile API definitions (XSUAA auth)
│   ├── quiz-service.cds      # Student quiz API definitions
│   ├── admin-service.cds     # Admin/Instructor API definitions
│   ├── user-service.js       # User profile handler (CAP standard pattern)
│   ├── quiz-service.js       # Quiz taking handler (CAP standard pattern)
│   ├── admin-service.js      # Admin CRUD handler (CAP standard pattern)
│   ├── server.js             # Server bootstrap (middleware + Socket.IO)
│   └── handlers/
│       └── lib/
│           ├── scoring-engine.js      # All question types + negative marking
│           ├── audit-logger.js        # Audit trail
│           ├── csv-handler.js         # Import/export
│           ├── certificate-generator.js # PDF certificates
│           └── ai-service.js          # OpenAI integration
├── app/quiz-ui/              # React frontend
│   ├── src/
│   │   ├── App.jsx           # Router + role-based route guards
│   │   ├── hooks/            # useAuth (XSUAA-based), useQuizTimer
│   │   ├── services/api.js   # Axios client (App Router session auth)
│   │   ├── components/       # Layout (sidebar nav)
│   │   └── pages/            # Dashboard, Quiz, Admin, Live pages
│   └── index.html
└── test/
    ├── scoring.test.js        # 22 tests for scoring engine
    ├── access-control.test.js # 20 tests for RBAC + tenant isolation
    ├── attempts.test.js       # 15 tests for attempt policy
    └── csv-handler.test.js    # 7 tests for import/export
```

## Setup Instructions

### Prerequisites
- Node.js 18+
- npm 9+
- SAP BTP account (for cloud deployment)
- Cloud Foundry CLI + MBT build tool (for deployment)

### 1. Install dependencies
```bash
cd QUIZ-APP
npm install
cd app/quiz-ui && npm install && cd ../..
```

### 2. Start development server (local)
```bash
npm run dev
# CAP server runs at http://localhost:4004
# Uses mocked XSUAA auth (see package.json cds.requires.auth)
# Frontend: cd app/quiz-ui && npm run dev (runs at http://localhost:3000)
```

### 3. Dev login credentials (mocked auth)
| Role | Email | Password |
|------|-------|----------|
| Admin | admin@quiz.app | admin |
| Instructor | instructor@quiz.app | instructor |
| Student | student@quiz.app | student |

### 4. Run tests
```bash
npm test
# 63 tests across 4 test suites
```

### 5. Deploy to SAP BTP Cloud Foundry

```bash
# Build the MTA archive
npm run build:mta
# or: mbt build

# Deploy to Cloud Foundry
cf deploy mta_archives/quiz-app_1.0.0.mtar

# After deployment, assign role collections to users in SAP BTP Cockpit:
# - QuizApp_Admin → Admin users
# - QuizApp_Instructor → Instructor users
# - QuizApp_Student → Student users
```

### 6. XSUAA Role Configuration
After deploying, go to SAP BTP Cockpit → Security → Role Collections:
1. **QuizApp_Admin** — Full administrative access
2. **QuizApp_Instructor** — Quiz creation and management
3. **QuizApp_Student** — Quiz taking and results viewing

Assign users to the appropriate role collection.

## API Endpoints

### User Profile (`/api/user`) — requires XSUAA auth
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/me()` | Current user profile (auto-provisions from XSUAA) |
| POST | `/updateProfile` | Update name/avatar |

### Quiz — Student (`/api/quiz`) — requires XSUAA auth
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/AvailableQuizzes` | List published quizzes |
| POST | `/startAttempt` | Start or resume a quiz |
| POST | `/saveAnswer` | Auto-save per question |
| POST | `/submitAttempt` | Submit quiz for grading |
| GET | `/MyAttempts` | User's attempt history |
| GET | `/AttemptReview` | Question-by-question review |
| POST | `/joinByCode` | Join quiz via share code |
| POST | `/joinLiveSession` | Join live session |

### Admin (`/api/admin`)
| Method | Endpoint | Description |
|--------|----------|-------------|
| CRUD | `/Quizzes` | Full quiz management |
| CRUD | `/Questions` | Question management |
| CRUD | `/QuestionOptions` | Option management |
| CRUD | `/QuestionBank` | Reusable question bank |
| CRUD | `/Tags` | Tag management |
| POST | `/publishQuiz` | Publish a quiz |
| POST | `/createQuizVersion` | Version a quiz for editing |
| POST | `/importQuestions` | Import from JSON/CSV |
| POST | `/exportQuestions` | Export to JSON/CSV |
| POST | `/assignQuiz` | Assign to group/user |
| POST | `/getQuizAnalytics` | Score distribution, Q accuracy |
| POST | `/exportResults` | Export results CSV |
| POST | `/generateCertificate` | PDF certificate |
| POST | `/createLiveSession` | Create live quiz session |
| POST | `/generateQuestions` | AI question generation |
| POST | `/approveAIContent` | Human review gate |
| GET | `/AuditLogs` | Security audit trail |

## Key Features

### Quiz Taking
- **Timer** with visual countdown, auto-submit on expiry
- **Auto-save** per question (resume later if allowed)
- **Question navigation** with answered/unanswered indicators
- **Anti-cheat options**: copy/paste disable, full-screen mode
- **Result modes**: immediate, after-review, after-end

### Scoring Engine
- **MCQ Single**: Full/zero points
- **MCQ Multi**: Partial credit per correct selection
- **True/False**: Binary scoring
- **Fill-in-blank**: Case-insensitive exact match
- **Negative marking**: Configurable penalty percentage
- **Scoring rules**: Best/latest/average across attempts

### Multi-tenancy
- Built-in CAP multitenancy via `@sap/cds-mtxs`
- Tenant isolation at the service/data layer
- XSUAA token carries tenant context automatically

### Security
- **Authentication**: SAP XSUAA with JWT (production), mocked users (development)
- **Authorization**: CDS `@requires` and `@restrict` annotations
- **App Router**: Session-based auth with CSRF protection
- Helmet security headers + CSP
- Rate limiting (API: 100/15min)
- HPP protection
- Audit logging for all sensitive operations
- Correct answers **never** sent to client before submission
- Tenant data isolation

### AI Features (requires OpenAI API key)
- **Generate questions** from topic + difficulty + count
- **Generate explanations** for existing questions
- **Quiz summary** with strengths/weaknesses analysis
- **Human review required** before AI content is published
- Mock responses available for development without API key

### Live Quiz Mode (Socket.IO)
- Host creates session with join code
- Participants join via code + nickname
- Real-time question display
- Leaderboard with scoring
- Anti-spam join controls (max participants)

## Assumptions Made

1. **Authentication**: SAP XSUAA handles all auth; user profiles auto-provisioned on first API call from XSUAA claims
2. **Database**: SQLite for dev, SAP HANA Cloud (HDI container) in production
3. **File storage**: Certificates stored locally; in production, use SAP Object Store or S3
4. **AI**: OpenAI GPT-4 used; interface is pluggable for other providers
5. **Multi-tenancy**: `@sap/cds-mtxs` for full BTP MTX support, `tenantId` field for backward compatibility
6. **Live quiz**: Questions are pushed from host; scoring is simplified for the MVP
7. **Deployment**: MTA-based deployment to Cloud Foundry; SAP BTP Cockpit for role assignment

## Future Enhancements

1. **AI Proctoring** — Webcam monitoring, tab-switch detection, browser lockdown
2. **AI Question Generation V2** — Generate from uploaded documents (PDF/DOCX)
3. **Plagiarism Detection** — Compare fill-in-blank/essay answers across students
4. **Advanced Analytics** — Item Response Theory (IRT), Bloom's taxonomy mapping
5. **Gamification** — XP points, badges, streaks, progress tracking
6. **Offline Mode** — PWA with service worker for taking quizzes without connectivity
7. **Accessibility V2** — Screen reader optimization, high-contrast theme, WCAG 2.1 AA
8. **LTI Integration** — Connect with LMS platforms (Moodle, Canvas, Blackboard)
9. **Question Media** — Rich text editor, image annotations, code syntax highlighting
10. **Essay Questions** — Manual grading workflow with rubrics
11. **SAP Integration** — SuccessFactors Learning, SAP Analytics Cloud dashboards
12. **Internationalization** — Multi-language support (i18n)
13. **Collaborative Editing** — Multiple instructors editing a quiz simultaneously
14. **Question Difficulty Calibration** — Auto-adjust difficulty based on student performance data