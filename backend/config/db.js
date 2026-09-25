import mongoose from 'mongoose';
import { env } from './env.js';

/**
 * Connect to MongoDB database instance.
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
 * Gracefully disconnect from MongoDB.
 */
export async function disconnectDB() {
  await mongoose.disconnect();
}
