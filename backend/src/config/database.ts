import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import { config } from './index';

let mongoMemoryServer: MongoMemoryServer | null = null;

export async function connectDatabase(): Promise<typeof mongoose> {
  // If already connected, reuse
  if (mongoose.connection.readyState === 1) {
    return mongoose;
  }

  // Attempt real MongoDB connection
  try {
    console.log(`[DB] Attempting connection to MongoDB at ${config.mongoUri}...`);
    await mongoose.connect(config.mongoUri, {
      serverSelectionTimeoutMS: 2500, // Quick timeout before fallback
    });
    console.log('✅ [DB] Connected to MongoDB database successfully.');
    return mongoose;
  } catch (err: any) {
    console.warn(`⚠️ [DB] Could not connect to primary MongoDB (${err.message}). Initializing isolated In-Memory MongoDB engine...`);

    try {
      mongoMemoryServer = await MongoMemoryServer.create();
      const inMemoryUri = mongoMemoryServer.getUri();
      console.log(`[DB] In-Memory MongoDB created at: ${inMemoryUri}`);
      await mongoose.connect(inMemoryUri);
      console.log('✅ [DB] Connected to In-Memory MongoDB successfully.');
      return mongoose;
    } catch (memErr: any) {
      console.error('❌ [DB] Failed to connect to both Primary and In-Memory MongoDB:', memErr);
      throw memErr;
    }
  }
}

export async function disconnectDatabase(): Promise<void> {
  if (mongoose.connection.readyState !== 0) {
    await mongoose.disconnect();
  }
  if (mongoMemoryServer) {
    await mongoMemoryServer.stop();
    mongoMemoryServer = null;
  }
  console.log('[DB] Database disconnected.');
}
