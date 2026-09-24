/**
 * Centralised environment configuration.
 *
 * All process.env access happens here. The rest of the application
 * imports from this module rather than reading process.env directly,
 * which makes it easy to see what configuration the app depends on
 * and to swap sources later if needed.
 *
 * No variable is treated as hard-required at this stage — the server
 * must be able to start for a basic health check even when optional
 * credentials (MongoDB, Gemini, JWT) are absent.
 */

export const env = {
  /** Node environment — 'development' | 'production' | 'test' */
  NODE_ENV: process.env.NODE_ENV || 'development',

  /** HTTP port the Express server listens on. */
  PORT: Number(process.env.PORT) || 8000,

  /** MongoDB connection string. Optional at boot time. */
  MONGODB_URI: process.env.MONGODB_URI || '',

  /** Secret used to sign/verify JWTs. Required in auth phase. */
  JWT_SECRET: process.env.JWT_SECRET || '',

  /** Google Gemini API key. Required only for AI features. */
  GEMINI_API_KEY: process.env.GEMINI_API_KEY || '',

  /** Gemini model identifier. Falls back to a sensible default. */
  GEMINI_MODEL: process.env.GEMINI_MODEL || 'gemini-2.5-flash',

  /** Allowed frontend origin(s). Comma-separated if multiple. */
  CLIENT_URL: process.env.CLIENT_URL || 'http://localhost:5173',
};

export const isDev = env.NODE_ENV !== 'production';
