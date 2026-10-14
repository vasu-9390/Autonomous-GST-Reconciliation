import mongoose from 'mongoose';
import { config } from './index';

export async function connectDatabase(): Promise<typeof mongoose> {
  if (mongoose.connection.readyState === 1) {
    return mongoose;
  }

  try {
    console.log('[DB] Connecting to MongoDB Atlas...');

    if (!config.mongoUri) {
      throw new Error(
        'MongoDB URI is missing. Check your .env configuration.'
      );
    }

    await mongoose.connect(config.mongoUri, {
      serverSelectionTimeoutMS: 10000,
    });

    console.log(
      `✅ [DB] Connected successfully to database: ${
        mongoose.connection.db?.databaseName ?? 'unknown'
      }`
    );

    return mongoose;
  } catch (error: unknown) {
    const message =
      error instanceof Error ? error.message : String(error);

    console.error('[DB] MongoDB connection failed:', message);
    console.error(
      '[DB] Server startup stopped. Fix the connection before continuing.'
    );

    throw error;
  }
}

export async function disconnectDatabase(): Promise<void> {
  if (mongoose.connection.readyState !== 0) {
    await mongoose.disconnect();
  }

  console.log('[DB] Database disconnected.');
}