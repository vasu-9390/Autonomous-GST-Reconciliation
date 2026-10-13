import app from './app';
import { config } from './config';
import { connectDatabase } from './config/database';

async function bootstrap() {
  try {
    console.log('🚀 Starting Autonomous GST Reconciliation & Mismatch Copilot Server...');
    await connectDatabase();

    const server = app.listen(config.port, () => {
      console.log(`✅ Server running on http://localhost:${config.port}`);
      console.log(`📡 REST API Base: http://localhost:${config.port}/api/v1`);
      console.log(`🩺 Health check: http://localhost:${config.port}/api/v1/health`);
    });

    // Graceful shutdown handling
    const shutdown = async (signal: string) => {
      console.log(`\n🛑 Received ${signal}. Shutting down gracefully...`);
      server.close(() => {
        console.log('HTTP server closed.');
        process.exit(0);
      });
    };

    process.on('SIGINT', () => shutdown('SIGINT'));
    process.on('SIGTERM', () => shutdown('SIGTERM'));
  } catch (err) {
    console.error('❌ Failed to start server:', err);
    process.exit(1);
  }
}

bootstrap();
