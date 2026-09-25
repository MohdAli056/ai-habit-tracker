# Cadence — System Architecture & Technical Specification

This document details the architectural design, data modeling, algorithms, and security guarantees implemented in the Cadence AI Habit Tracker.

---

## 1. Architectural Overview

Cadence is structured as a decoupled, multi-tier web application designed for high availability, deterministic data integrity, and strict tenant isolation.

```text
┌─────────────────────────────────────────────────────────────┐
│                    Client Layer (Browser)                   │
│   • React 19 SPA (Vite)                                     │
│   • State: React Context (AuthContext)                      │
│   • UI: Token-based design system + Tailwind utility layer  │
│   • Charts: Recharts (Trend & Category distributions)       │
└──────────────────────────────┬──────────────────────────────┘
                               │ HTTPS (JSON + Bearer Token)
                               ▼
┌─────────────────────────────────────────────────────────────┐
│                     API Gateway / Express                   │
│   • CORS Origin validation & normalization                  │
│   • JWT Authentication middleware                           │
│   • Input validation & sanitization                         │
│   • Centralized error handling & status mapping             │
└──────────────┬───────────────────────────────┬──────────────┘
               │                               │
               ▼                               ▼
┌─────────────────────────────┐ ┌─────────────────────────────┐
│       Database Layer        │ │       AI Service Layer      │
│   • MongoDB Atlas           │ │   • Provider Resolver       │
│   • Mongoose 9 ODM          │ │   • Google GenAI SDK        │
│   • Compound Unique Indexes │ │   • MockProvider Fallback   │
│   • Timestamped Event Logs  │ │   • JSON Schema Sanitizer   │
└─────────────────────────────┘ └─────────────────────────────┘
```

---

## 2. Core Design Principles

1. **Deterministic Analytics**: Metrics (streaks, completion rates, best days) are calculated through pure functions, never estimated or hallucinated by AI.
2. **Context-Grounded AI**: The Google Gemini models only receive aggregate behavioral facts, never raw credentials, passwords, or personally identifiable information.
3. **Optimistic & Resilient UI**: Client-side state transitions update optimistically for instantaneous user feedback, synchronizing with the backend via idempotent APIs.
4. **Graceful Degradation**: If third-party AI services experience temporary demand spikes or rate limits, core habit tracking remains 100% operational.

---

## 3. Database Schema & Indexing Strategy

The data layer uses four primary collections in MongoDB Atlas:

### `User` Collection
Stores user identity and profile preferences.
- `_id`: ObjectId
- `name`: String (trimmed)
- `email`: String (lowercase, unique)
- `password`: String (bcrypt hash, 12 rounds, excluded from default JSON serialization)
- `morningMotivation`: Boolean (user preference toggle)
- `timestamps`: `createdAt`, `updatedAt`

### `Habit` Collection
Defines habit templates and configurations.
- `userId`: ObjectId (indexed)
- `name`: String (trimmed, required)
- `description`: String (optional)
- `category`: String (enum: `health`, `fitness`, `learning`, `mindfulness`, `productivity`, `social`, `finance`, `creative`, `other`)
- `frequency`: String (`daily` | `weekly`)
- `targetDays`: Number (1–7)
- `color`: String (hex code)
- `icon`: String (identifier for curated icon set)
- `order`: Number (integer for custom sequencing)
- `isArchived`: Boolean (default `false`)
- **Compound Index**: `{ userId: 1, isArchived: 1, order: 1 }`

### `HabitLog` Collection
Records discrete habit completion events.
- `userId`: ObjectId (indexed)
- `habitId`: ObjectId (indexed)
- `completedDate`: String (`YYYY-MM-DD` normalized date string)
- `notes`: String (optional)
- **Compound Unique Index**: `{ userId: 1, habitId: 1, completedDate: 1 }` (guarantees idempotency)
- **Range Query Index**: `{ userId: 1, completedDate: 1 }`

### `AIInsight` Collection
Serves as an intelligent persistent cache for AI outputs to prevent redundant API calls.
- `userId`: ObjectId
- `type`: String (enum: `weekly`, `suggestion`, `recovery`, `chat`, `morning`)
- `content`: Mixed / Object (structured response)
- `meta`: Object (generation parameters, e.g., `weekStart`, `productiveTime`)
- `generatedAt`: Date (defaults to `now`)
- **Compound Query Index**: `{ userId: 1, type: 1, generatedAt: -1 }`

---

## 4. Deterministic Streak Engine

Streak calculation is implemented in `backend/utils/streak.js` and adheres to the following algorithmic rules:

1. **Date Key Normalization**: All completions are stored as local calendar date strings (`YYYY-MM-DD`).
2. **Current Streak Continuity**:
   - A streak is **active** if the habit was completed **today** or **yesterday**.
   - If completed today, the streak counts consecutive preceding completed days.
   - If completed yesterday but not yet today, yesterday's streak is preserved as current (allowing the user until midnight to maintain continuity).
   - If the habit was not completed today OR yesterday, the current streak resets to `0`.
3. **Longest Streak**: Computes the maximum contiguous segment of consecutive completion days over the entire history of the habit.

---

## 5. AI Architecture & Provider Pattern

The AI subsystem is decoupled from specific model vendors using the **Provider Pattern**:

```text
[ Controller / Service ]
            │
            ▼
[ providerResolver.js ]
      │             │
      │ (API Key)   │ (Test / Offline)
      ▼             ▼
[ GeminiProvider ]  [ MockProvider ]
      │                     │
      ▼                     ▼
Google GenAI SDK     Deterministic JSON
(gemini-3.6-flash)   (No Network Cost)
```

- **`GeminiProvider`**: Utilizes the official `@google/genai` SDK, applying strict timeout promises, JSON response schemas, and error normalization.
- **`MockProvider`**: Used in unit and integration test suites to ensure predictable assertions without consuming API quota.
- **Error Normalization**: Maps upstream API states (rate limits, timeouts, demand spikes) into domain `AIError` instances, preventing internal stack trace leaks to the client.

---

## 6. Multi-Tenant Security Model

1. **Authentication**: Stateless signed JSON Web Tokens (JWT) verified on every protected route via `middleware/auth.js`.
2. **Query Scoping**: Every database lookup, insertion, update, and deletion strictly injects `userId: req.user._id`.
3. **Cross-User Protection**: Attempting to query, mutate, or complete a habit belonging to another user returns a clean `404 Not Found`, revealing no information about the existence of the resource.
4. **Environment Isolation**: All credentials (`MONGODB_URI`, `JWT_SECRET`, `GEMINI_API_KEY`) reside exclusively in git-ignored `.env` files and are never committed.
