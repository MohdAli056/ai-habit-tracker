/**
 * MongoDB connection utility.
 *
 * Exposes a single `connectDB()` function that other startup code
 * can call when it is ready to require a database connection.
 *
 * The server boots without calling this function in Phase 3, so
 * the health endpoint works even when MONGODB_URI is absent.
 * Later phases will call connectDB() before starting the server
 * when database-backed routes are registered.
 */

import mongoose from 'mongoose';
import { env } from './env.js';

/**
 * Connect to MongoDB using the URI from environment config.
 *
 * @throws {Error} if MONGODB_URI is not configured, or if Mongoose
 *   fails to establish a connection.
 */
export async function connectDB() {
  if (!env.MONGODB_URI) {
    throw new Error(
      'MONGODB_URI is not set. Add it to your .env file before starting the server.',
    );
  }

  await mongoose.connect(env.MONGODB_URI);
  console.log('MongoDB connected:', mongoose.connection.host);
}

/**
 * Gracefully close the Mongoose connection.
 * Useful for testing or graceful shutdown handlers.
 */
export async function disconnectDB() {
  await mongoose.disconnect();
}
