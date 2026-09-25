# Cadence — Intelligent AI Habit Tracker

<div align="center">

![Cadence Banner](https://img.shields.io/badge/Cadence-AI%20Habit%20Tracker-6366f1?style=for-the-badge&logo=target)

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg?style=flat-square)](LICENSE)
[![Node.js Version](https://img.shields.io/badge/node-%3E%3D18.0.0-brightgreen.svg?style=flat-square&logo=node.js)](https://nodejs.org/)
[![React Version](https://img.shields.io/badge/react-19.3.0-61dafb.svg?style=flat-square&logo=react)](https://react.dev/)
[![Express Version](https://img.shields.io/badge/express-5.2.1-lightgrey.svg?style=flat-square&logo=express)](https://expressjs.com/)
[![MongoDB Atlas](https://img.shields.io/badge/MongoDB-Atlas-47A248.svg?style=flat-square&logo=mongodb)](https://www.mongodb.com/atlas)
[![Google Gemini](https://img.shields.io/badge/AI-Google%20Gemini-orange.svg?style=flat-square&logo=google)](https://ai.google.dev/)
[![Vite](https://img.shields.io/badge/bundler-Vite%208-purple.svg?style=flat-square&logo=vite)](https://vitejs.dev/)

**A production-ready full-stack MERN habit-tracking application powered by Google Gemini AI, designed to help users build consistency through actionable analytics, streak resilience, and personalized AI coaching.**

[Key Features](#key-features) • [System Architecture](#system-architecture) • [Tech Stack](#tech-stack) • [Quick Start](#quick-start) • [API Reference](#api-reference) • [Deployment](#deployment)

</div>

---

## Overview

**Cadence** is a modern habit tracking platform that combines deterministic behavioral metrics with generative AI coaching. Rather than relying on generic motivational quotes, Cadence grounds its insights strictly in the user's authentic habit history: streaks, completion frequencies, category balance, and recovery patterns.

Whether tracking daily meditation, fitness goals, or study routines, Cadence provides the visual feedback and AI-guided scaffolding necessary to maintain lifelong positive routines.

---

## Key Features

### 1. Habit Management & Organization
- **Full Habit Lifecycle**: Create, edit, reorder, archive, and permanently delete habits.
- **Categorization & Styling**: Assign color accents and 12 expressive icons across 9 standard life categories (*Health, Fitness, Learning, Mindfulness, Productivity, Social, Finance, Creative, Other*).
- **Flexible Scheduling**: Daily habits or custom weekly targets (e.g., 3 days per week).
- **Non-Destructive Archiving**: Hide inactive habits without deleting their historical streak and completion data.

### 2. Deterministic Streak Engine
- **Accurate Continuity Logic**: Calculates current and longest lifetime streaks accurately, accounting for today's pending state and yesterday's completion.
- **Instant Reactive Updates**: Real-time optimistic UI toggles with celebratory micro-animations on milestone completions.
- **Historical Immutability**: All habit completions are recorded as discrete timestamped records with compound unique index guarantees.

### 3. Visual Analytics & Insights
- **90-Day Activity Heatmap**: Interactive GitHub-style visual contribution grid displaying daily consistency and velocity.
- **Period Comparisons**: 7-day and 30-day completion rate comparisons with percentage deltas.
- **Trend Visualization**: Dynamic interactive line charts and category distribution breakdowns powered by Recharts.
- **Smart Pattern Detection**: Automatically detects your best completion day of the week and flags habits that need attention.

### 4. Five Specialized Gemini AI Features
- **AI Weekly Reflection**: Synthesizes the previous week's performance into a cohesive headline, summary, key wins, and targeted focus areas.
- **AI Habit Suggestions Wizard**: Interactive wizard analyzing user goals, peak energy hours, and blockers to suggest 3 tailored, balanced habits.
- **AI Streak Recovery Coach**: Detects broken streaks (&ge; 3 days) and provides compassionate, realistic 1–3 step recovery protocols.
- **AI Habit-Data Chat Assistant**: Conversational assistant strictly grounded in the user's authentic habit data, deflecting out-of-scope or medical inquiries.
- **AI Morning Motivation**: Daily personalized briefing highlighting today's scheduled habits, streak status, and inspiring focus habit.
- **Resilient AI Fallback**: Automatic offline mock provider support when running without API keys or during upstream service spikes.

### 5. Production Security & Data Isolation
- **Strict Multi-Tenant Isolation**: Every database query is strictly scoped by the authenticated user's ID.
- **Zero Credential Exposure**: Passwords are encrypted with bcrypt (12 salt rounds) and stripped from all JSON representations.
- **Stateless JWT Authentication**: Secure HTTP authorization headers with automatic 401 expiration handling.
- **Private AI Contexts**: Prompts never include user emails, database IDs, or passwords.

---

## System Architecture

```text
┌─────────────────────────────────────────────────────────────┐
│                    React 19 SPA (Vite)                      │
│   Dashboard • Habits • Weekly • Analytics • Settings • Chat  │
└──────────────────────────────┬──────────────────────────────┘
                               │ HTTPS / JSON (Bearer JWT)
                               ▼
┌─────────────────────────────────────────────────────────────┐
│                 Express 5 API Server (Node)                 │
│   Auth • Habit Management • Logging & Analytics • AI Router │
└──────────────┬───────────────────────────────┬──────────────┘
               │                               │
               ▼                               ▼
┌─────────────────────────────┐ ┌─────────────────────────────┐
│      MongoDB Atlas          │ │      Google Gemini AI       │
│  Users • Habits • Logs      │ │  gemini-3.6-flash           │
│  AIInsights (Cached)        │ │  (MockProvider Fallback)    │
└─────────────────────────────┘ └─────────────────────────────┘
```

---

## Tech Stack

| Domain | Technology | Description |
| :--- | :--- | :--- |
| **Frontend** | **React 19** | Component-driven user interface |
| | **Vite 8** | Next-generation frontend tooling and fast HMR |
| | **Vanilla CSS & Tokens** | High-performance custom design system with dark mode |
| | **Tailwind CSS v4** | Modern utility enhancements |
| | **React Router 7** | Client-side SPA routing and navigation guards |
| | **Recharts 3** | Data visualization for trends and category distribution |
| | **Lucide React** | Clean, modern iconography |
| | **Axios** | HTTP client with automatic token attachment and 401 handling |
| **Backend** | **Node.js 18+** | JavaScript runtime environment |
| | **Express 5** | REST API framework |
| | **MongoDB Atlas** | Cloud database with compound indexes and schema validation |
| | **Mongoose 9** | ODM with strict data typing and lifecycle hooks |
| | **jsonwebtoken** | Stateless JWT authentication |
| | **bcryptjs** | Password hashing with 12 salt rounds |
| | **date-fns** | Deterministic UTC/local calendar utilities |
| **Artificial Intelligence** | **Google GenAI SDK** | `@google/genai` integration with Gemini models |
| | **Gemini 3.6 Flash** | Ultra-fast multimodal reasoning and structured JSON output |
| | **MockProvider** | Deterministic offline test double and zero-quota fallback |
| **Deployment** | **Render** | Node.js web service container with health check monitoring |
| | **Vercel** | Edge-optimized frontend static hosting with SPA rewrites |

---

## Project Structure

```text
ai-habit-tracker/
├── backend/
│   ├── config/             # Environment variables and database connection
│   │   ├── db.js           # Mongoose MongoDB Atlas connection
│   │   └── env.js          # Centralized configuration parser
│   ├── controllers/        # Request handling and business logic
│   │   ├── aiController.js # AI features orchestrator
│   │   ├── authController.js# Registration, login, profile management
│   │   ├── habitController.js# Habit CRUD and reordering
│   │   └── logController.js# Completion tracking, heatmap, and analytics
│   ├── middleware/         # Auth verification and error handling
│   │   ├── auth.js         # JWT verification middleware
│   │   ├── errorHandler.js # Centralized JSON error normalizer
│   │   └── notFound.js     # 404 handler
│   ├── models/             # Mongoose schemas with compound indexes
│   │   ├── AIInsight.js    # Persistent cache for AI reports
│   │   ├── Habit.js        # Habit definitions and order
│   │   ├── HabitLog.js     # Completion events with unique day compound index
│   │   └── User.js         # User model with bcrypt pre-save hashing
│   ├── routes/             # REST endpoint definitions
│   │   ├── ai.js           # /api/ai endpoints
│   │   ├── auth.js         # /api/auth endpoints
│   │   ├── habits.js       # /api/habits endpoints
│   │   ├── health.js       # /api/health health check
│   │   └── logs.js         # /api/logs endpoints
│   ├── scripts/            # Database seeders and regression tests
│   │   ├── seed-demo.js    # 90-day deterministic demo data generator
│   │   └── test-*.js       # Automated integration test suites
│   ├── services/ai/        # AI provider abstraction layer
│   │   ├── aiService.js    # High-level structured and text AI API
│   │   ├── geminiProvider.js# Real Google Gemini SDK implementation
│   │   ├── mockProvider.js # Deterministic offline test double
│   │   └── providerResolver.js# Dynamic provider selection
│   ├── utils/              # Pure utility functions
│   │   ├── date.js         # Date formatting, ranges, and validation
│   │   ├── jwt.js          # JWT signing and verification
│   │   └── streak.js       # Deterministic streak calculation algorithm
│   └── server.js           # Express app bootstrap and HTTP listener
├── frontend/
│   ├── src/
│   │   ├── api/            # Axios API client and feature endpoints
│   │   ├── components/     # Modular UI components
│   │   │   ├── chat/       # Floating AI habit-data chat widget
│   │   │   ├── dashboard/  # Summary cards, recovery prompt, morning motivation
│   │   │   ├── habits/     # Habit card, forms, suggestion wizard
│   │   │   ├── layout/     # Sidebar navigation, header, page container
│   │   │   └── ui/         # Button, Card, Badge, Modal, LoadingSpinner
│   │   ├── context/        # React context providers (AuthContext)
│   │   ├── pages/          # Full page views
│   │   │   ├── DashboardPage.jsx  # Daily overview, quick completions, KPIs
│   │   │   ├── HabitsPage.jsx     # Habit list, filtering, CRUD operations
│   │   │   ├── WeeklyPage.jsx     # 7-day matrix grid and AI weekly report
│   │   │   ├── InsightsPage.jsx   # Trend charts, completion rate, top habits
│   │   │   ├── StatisticsPage.jsx # 90-day heatmap, lifetime stats, table
│   │   │   ├── LoginPage.jsx      # Authentication sign-in
│   │   │   ├── RegisterPage.jsx   # New user sign-up
│   │   │   └── SettingsPage.jsx   # Account preferences & AI toggles
│   │   ├── index.css       # Complete CSS design system and tokens
│   │   ├── App.jsx         # Routing and authentication guards
│   │   └── main.jsx        # React root entry point
│   ├── vercel.json         # Vercel SPA routing fallback rules
│   └── vite.config.js      # Vite build configuration
├── render.yaml             # Render infrastructure blueprint
└── README.md
```

---

## Quick Start

### Prerequisites
- **Node.js** &ge; 18.0.0
- **npm** &ge; 9.0.0
- **MongoDB Atlas** account (or local MongoDB instance)
- *(Optional)* **Google Gemini API Key** ([Get a key](https://aistudio.google.com/))

---

### 1. Clone the Repository
```bash
git clone https://github.com/MohdAli056/ai-habit-tracker.git
cd ai-habit-tracker
```

---

### 2. Backend Setup
```bash
cd backend
npm install
```

Create a `.env` file in the `backend/` folder:
```env
PORT=8000
MONGODB_URI=your_mongodb_connection_string
JWT_SECRET=your_super_secret_jwt_key
GEMINI_API_KEY=your_gemini_api_key_optional
GEMINI_MODEL=gemini-3.6-flash
CLIENT_URL=http://localhost:5173
```

Seed the database with a 90-day realistic demo account:
```bash
npm run seed
```

Start the backend server:
```bash
npm run dev
# API running on http://localhost:8000
```

---

### 3. Frontend Setup
In a new terminal window:
```bash
cd frontend
npm install
```

Create a `.env` file in the `frontend/` folder:
```env
VITE_API_URL=http://localhost:8000/api
```

Start the Vite development server:
```bash
npm run dev
# App running on http://localhost:5173
```

---

### 4. Log in with Demo Credentials
You can immediately explore the app using the pre-seeded account:
- **Email**: `demo@cadence.local`
- **Password**: `Demo@12345`

*Includes 8 active habits, 506 completion logs, a 27-day active streak, and populated analytics.*

---

## API Reference

All requests expect and return JSON payloads. Protected endpoints require the header `Authorization: Bearer <token>`.

### Authentication (`/api/auth`)
| Method | Endpoint | Description | Auth Required |
| :--- | :--- | :--- | :--- |
| `POST` | `/api/auth/register` | Register new user account | No |
| `POST` | `/api/auth/login` | Authenticate user & issue JWT | No |
| `GET` | `/api/auth/me` | Retrieve authenticated user profile | Yes |
| `PUT` | `/api/auth/profile` | Update profile preferences | Yes |

### Habits (`/api/habits`)
| Method | Endpoint | Description | Auth Required |
| :--- | :--- | :--- | :--- |
| `GET` | `/api/habits` | List habits (supports `?archived=true/false&category=&search=`) | Yes |
| `GET` | `/api/habits/:id` | Get single habit by ID | Yes |
| `POST` | `/api/habits` | Create new habit | Yes |
| `PUT` | `/api/habits/:id` | Update existing habit | Yes |
| `PUT` | `/api/habits/reorder` | Update habit display sequence | Yes |
| `DELETE` | `/api/habits/:id` | Permanently delete habit | Yes |

### Logs & Analytics (`/api/logs`)
| Method | Endpoint | Description | Auth Required |
| :--- | :--- | :--- | :--- |
| `POST` | `/api/logs` | Mark habit completed for date (`completedDate?: YYYY-MM-DD`) | Yes |
| `DELETE` | `/api/logs/:habitId` | Unmark habit completion (`?date=YYYY-MM-DD`) | Yes |
| `GET` | `/api/logs/today` | List completions recorded for today | Yes |
| `GET` | `/api/logs/range` | List completions within `?start=YYYY-MM-DD&end=YYYY-MM-DD` | Yes |
| `GET` | `/api/logs/heatmap` | Aggregated daily completions for heatmap (`?days=90`) | Yes |
| `GET` | `/api/logs/stats` | Dashboard KPI summary across all habits | Yes |
| `GET` | `/api/logs/stats/habit/:id` | Detailed metrics and streak history for a single habit | Yes |
| `GET` | `/api/logs/insights` | Comprehensive analytics, trend line, and category breakdown | Yes |
| `GET` | `/api/logs/statistics` | Long-term performance data, 7d/30d comparison, habit stats | Yes |

### AI Features (`/api/ai`)
| Method | Endpoint | Description | Auth Required |
| :--- | :--- | :--- | :--- |
| `GET` | `/api/ai/weekly-report` | Check for existing cached weekly report (`?weekStart=YYYY-MM-DD`) | Yes |
| `POST` | `/api/ai/weekly-report` | Generate or retrieve cached weekly AI reflection | Yes |
| `POST` | `/api/ai/suggestions` | Generate 3 tailored habit suggestions based on user goals | Yes |
| `POST` | `/api/ai/recovery` | Generate streak recovery advice for broken streak | Yes |
| `POST` | `/api/ai/chat` | Query habit data using natural language | Yes |
| `POST` | `/api/ai/morning-motivation`| Generate daily morning briefing and focus habit | Yes |

---

## Deployment

The application is structured for production deployment with separate backend and frontend hosting.

### Deploy Backend to Render
1. Create a new **Web Service** on [Render](https://render.com) connected to your GitHub repository (or use the included `render.yaml`).
2. Set **Root Directory**: `backend`
3. Set **Build Command**: `npm install`
4. Set **Start Command**: `npm start`
5. Configure Environment Variables:
   - `NODE_ENV`: `production`
   - `PORT`: `10000`
   - `MONGODB_URI`: *Your MongoDB Atlas connection URI*
   - `JWT_SECRET`: *A secure random string*
   - `GEMINI_API_KEY`: *Your Google Gemini API key*
   - `GEMINI_MODEL`: `gemini-3.6-flash`
   - `CLIENT_URL`: *Your Vercel frontend URL*

---

### Deploy Frontend to Vercel
1. Import the repository on [Vercel](https://vercel.com).
2. Set **Root Directory**: `frontend`
3. Set **Framework Preset**: `Vite`
4. Configure Environment Variable:
   - `VITE_API_URL`: `https://your-backend-app.onrender.com/api`
5. Deploy. The repository contains `frontend/vercel.json` to handle client-side route rewrites automatically.

---

## License

This project is licensed under the **MIT License** — see the [LICENSE](LICENSE) file for details.
