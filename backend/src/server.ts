import * as dns from 'node:dns';

// Configure DNS before connecting to MongoDB Atlas.
// Your DNS test succeeded using Google's DNS resolver.
dns.setServers(['8.8.8.8', '8.8.4.4']);

import app from './app';
import { config } from './config';
import { connectDatabase } from './config/database';

async function bootstrap() {
  try {
    console.log(
      '🚀 Starting Autonomous GST Reconciliation & Mismatch Copilot Server...'
    );

    await connectDatabase();

    const server = app.listen(config.port, () => {
      console.log(
        `✅ Server running on http://localhost:${config.port}`
      );
      console.log(
        `📡 REST API Base: http://localhost:${config.port}/api/v1`
      );
      console.log(
        `🩺 Health check: http://localhost:${config.port}/api/v1/health`
      );
    });

    const shutdown = (signal: string) => {
      console.log(
        `\n🛑 Received ${signal}. Shutting down gracefully...`
      );

      server.close(() => {
        console.log('HTTP server closed.');
        process.exit(0);
      });
    };

    process.once('SIGINT', () => shutdown('SIGINT'));
    process.once('SIGTERM', () => shutdown('SIGTERM'));
  } catch (err) {
    console.error('❌ Failed to start server:', err);
    process.exit(1);
  }
}

bootstrap();