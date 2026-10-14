
import dotenv from 'dotenv';

dotenv.config();

export const config = {
  env: process.env.NODE_ENV || 'development',

  port: parseInt(process.env.PORT || '5000', 10),

  // Require MongoDB URI from .env
  mongoUri: process.env.MONGODB_URI || '',

  // Set a strong JWT_SECRET in .env
  jwtSecret: process.env.JWT_SECRET || '',

  jwtExpiresIn: process.env.JWT_EXPIRES_IN || '7d',

  geminiApiKey: process.env.GEMINI_API_KEY || '',

  corsOrigin: process.env.CORS_ORIGIN || 'http://localhost:5173',

  rateLimitMax: parseInt(
    process.env.RATE_LIMIT_MAX || '500',
    10
  ),

  rateLimitWindowMs: parseInt(
    process.env.RATE_LIMIT_WINDOW_MS || '900000',
    10
  ),

  maxUploadSizeBytes: parseInt(
    process.env.MAX_UPLOAD_SIZE_BYTES || '15728640',
    10
  ),
};
