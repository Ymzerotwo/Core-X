import http from 'http';
import 'dotenv/config';
import app from './app.js';
import { logger } from './config/logger.js';
import { testSupabaseConnection } from './config/supabase.js';
import { redis } from './config/redis.js';
import { requestsService } from './services/requests.service.js';
import { banningService } from './services/banning.service.js';
type Environment = 'development' | 'production' | 'test';

const PORT: number = parseInt(process.env.PORT || '5000', 10);
const ENV: Environment = (process.env.NODE_ENV as Environment) || 'development';
const requiredEnv = ['SUPABASE_URL', 'SUPABASE_SERVICE_ROLE_KEY'];
const missing = requiredEnv.filter((key) => !process.env[key]);

if (missing.length > 0) {
  logger.error('❌ CRITICAL: Missing required environment variables:', missing.join(', '));
  process.exit(1);
}

const startServer = async () => {
  try {
    const dbConnected = await testSupabaseConnection();
    if (dbConnected) {
      // Restore bans from DB to Redis on startup
      await banningService.restoreFromDb();
      // Restore requests stats from local file to Redis
      await requestsService.restoreFromLocal();
    } else {
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
      logger.info(`   Server-status: http://localhost:${PORT}/admin/core-x-state`);
    });
    const gracefulShutdown = (signal: string) => {
      logger.info(`\n${signal} received. Initiating graceful shutdown...`);
      server.close(async () => {
        logger.info('HTTP server closed. Exiting process...');
        await requestsService.dispose(); // Save stats before exit (Now Async)
        await banningService.syncToDb(); // Backup bans to DB
        await redis.quit(); // Close Redis connection
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
    const errorMessage = err instanceof Error ? err.message : 'Unknown error';
    logger.error('❌ FATAL: Server startup failed:', errorMessage);
    process.exit(1);
  }
};

process.on('unhandledRejection', (reason, promise) => {
  logger.error('Unhandled Rejection:', { promise, reason });
});

process.on('uncaughtException', (error: Error) => {
  logger.error('Uncaught Exception:', error);
  process.exit(1);
});

startServer();

/*
 * ==============================================================================
 * 🔌 Server Entry Point (by Ym_zerotwo)
 * ==============================================================================
 *
 * This file is the bootstrapper for the Node.js process. It handles the lifecycle
 * of the server from environment validation to graceful shutdown.
 *
 * ⚙️ How it Works:
 * 1. Environment Check: Scans `.env` for critical keys (`SUPABASE_URL`, etc.). If missing, it kills the process immediately (`process.exit(1)`).
 * 2. Dependency Check: Tries to connect to Supabase.
 *    - In Development: Fails fast if DB is down.
 *    - In Production: Warns but proceeds (Fail-Open) to allow the app to serve non-DB endpoints (e.g., Health checks).
 * 3. HTTP Server: Wraps the Express `app` in a native Node.js HTTP server.
 * 4. Graceful Shutdown:
 *    - Listens for `SIGTERM` and `SIGINT` signals (e.g., from Kubernetes or Docker).
 *    - Stops accepting new connections.
 *    - Force kills the process after 10 seconds if connections are stuck (Zombie protection).
 *
 * 📂 External Dependencies:
 * - `http`: Native Node.js module.
 * - `./app.js`: The Express application logic.
 * - `./config/logger.js`: For startup/shutdown logs.
 *
 * 🔒 Security Features:
 * - **Fail-Safe Startup**: Prevents the app from running in a broken state (missing config).
 * - **Uncaught Exception Handling**: Global catch-all for unhandled promises/errors to log them before crashing.
 *
 * 🚀 Usage:
 * - `npm start` or `node src/server.js`
 */
