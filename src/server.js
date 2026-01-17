import http from 'http';
import 'dotenv/config';
import app from './app.js';
import { logger } from './config/logger.js';
import { testSupabaseConnection } from './config/supabase.js';

const PORT = process.env.PORT || 5000;
const ENV = process.env.NODE_ENV || 'development';

const requiredEnv = ['SUPABASE_URL', 'SUPABASE_SERVICE_ROLE_KEY'];
const missing = requiredEnv.filter(key => !process.env[key]);

if (missing.length > 0) {
  logger.error('❌ CRITICAL: Missing required environment variables:', missing.join(', '));
  process.exit(1);
}

const startServer = async () => {
  try {
    const dbConnected = await testSupabaseConnection();
    
    if (!dbConnected) {
      if (ENV === 'production') {
        logger.warn('⚠️ Starting server without DB connection (Risk Mode - Production)');
      } else {
        logger.error('❌ Database connection failed. Exiting (Development Mode)...');
        process.exit(1);
      }
    }

    const server = http.createServer(app);

    server.listen(PORT, () => {
      const modeIcon = ENV === 'production' ? '🏭' : '🛠️';
      logger.info(`🚀 Server running on port ${PORT} [${ENV} ${modeIcon}]`);
      logger.info(`   Local:  http://localhost:${PORT}`);
      logger.info(`   Health: http://localhost:${PORT}/health`);
    });

    const gracefulShutdown = (signal) => {
      logger.info(`\n${signal} received. Initiating graceful shutdown...`);

      server.close(() => {
        logger.info('HTTP server closed. Exiting process...');
        process.exit(0);
      });

      setTimeout(() => {
        logger.error('Could not close connections in time → Force Exit');
        process.exit(1);
      }, 10000);
    };

    process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
    process.on('SIGINT', () => gracefulShutdown('SIGINT'));

  } catch (err) {
    logger.error('❌ FATAL: Server startup failed:', err);
    process.exit(1);
  }
};

process.on('unhandledRejection', (reason, promise) => {
  logger.error('Unhandled Rejection:', { promise, reason });
});

process.on('uncaughtException', (error) => {
  logger.error('Uncaught Exception:', error);
  process.exit(1); 
});

startServer();

/*
 * ==============================================================================
 * 🔌 Server Entry Point (by Ym_zerotwo)
 * ==============================================================================
 *
 * This file is responsible for:
 * 1. Validating critical environment variables before startup.
 * 2. Establishing and verifying database connections (Supabase).
 * 3. Creating the HTTP server instance using the Express app.
 * 4. Handling graceful shutdowns to prevent data loss during deployments.
 * 5. Catching global process-level errors (Uncaught Exceptions).
 *
 * 🔄 Flow:
 * index.js (Cluster) -> imports server.js (Worker) -> imports app.js (Express)
 */