/**
 * Cadence — Express server entry point.
 *
 * Startup sequence:
 *   1. Load .env into process.env
 *   2. Import centralised config
 *   3. Build and configure the Express app
 *   4. Register API routes
 *   5. Register 404 and error-handling middleware (must be last)
 *   6. Connect to MongoDB
 *   7. Start the HTTP server
 */

import 'dotenv/config';

import cors from 'cors';
import express from 'express';

import { connectDB } from './config/db.js';
import { env, isDev } from './config/env.js';
import { errorHandler } from './middleware/errorHandler.js';
import { notFound } from './middleware/notFound.js';
import aiRouter from './routes/ai.js';
import authRouter from './routes/auth.js';
import habitsRouter from './routes/habits.js';
import healthRouter from './routes/health.js';
import logsRouter from './routes/logs.js';

// ---------------------------------------------------------------------------
// CORS
// ---------------------------------------------------------------------------
const allowedOrigins = new Set(
  env.CLIENT_URL.split(',')
    .map((url) => url.trim().replace(/\/$/, ''))
    .filter(Boolean),
);

if (isDev) {
  allowedOrigins.add('http://localhost:5173');
  allowedOrigins.add('http://localhost:5174');
  allowedOrigins.add('http://127.0.0.1:5173');
  allowedOrigins.add('http://127.0.0.1:5174');
}

const corsOptions = {
  origin(origin, callback) {
    if (!origin) return callback(null, true);
    const normalizedOrigin = origin.replace(/\/$/, '');
    if (allowedOrigins.has(normalizedOrigin)) return callback(null, true);
    callback(new Error(`CORS: origin '${origin}' is not allowed.`));
  },
  credentials: true,
  optionsSuccessStatus: 204,
};

// ---------------------------------------------------------------------------
// Express app
// ---------------------------------------------------------------------------
const app = express();

app.use(cors(corsOptions));
app.use(express.json({ limit: '1mb' }));

// ---------------------------------------------------------------------------
// Routes
// ---------------------------------------------------------------------------
app.use('/api/health', healthRouter);
app.use('/api/auth', authRouter);
app.use('/api/habits', habitsRouter);
app.use('/api/logs', logsRouter);
app.use('/api/ai', aiRouter);

// ---------------------------------------------------------------------------
// Error handlers — registered after all routes.
// ---------------------------------------------------------------------------
app.use(notFound);
app.use(errorHandler);

// ---------------------------------------------------------------------------
// Boot: connect DB then start server.
// ---------------------------------------------------------------------------
async function start() {
  await connectDB();
  const server = app.listen(env.PORT, '0.0.0.0', () => {
    console.log(`Cadence API running on port ${env.PORT} [${env.NODE_ENV}]`);
  });

  process.on('unhandledRejection', (reason) => {
    console.error('Unhandled rejection:', reason);
    server.close(() => process.exit(1));
  });
}

start().catch((err) => {
  console.error('Failed to start server:', err.message);
  process.exit(1);
});
