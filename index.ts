import 'dotenv/config';
import cluster, { Worker } from 'cluster';
import os from 'os';
import { logger } from './src/config/logger.js';

const isProduction = process.env.NODE_ENV === 'production';
const numCPUs = os.cpus().length;
const requestedWorkers = process.env.WORKERS_COUNT || 'full';
const desiredWorkers = requestedWorkers === 'full' ? numCPUs : parseInt(requestedWorkers, 10);
const MAX_RESTARTS = 10;
let restartCount = 0;
const validateEnv = () => {
  const REQUIRED_VARS = [
    'NODE_ENV',
    'PORT',
    'SERVICE_NAME',
    'LOG_LEVEL',
    'ENABLE_CONSOLE_LOGS',
    'SUPABASE_URL',
    'SUPABASE_SERVICE_ROLE_KEY',
    'SUPABASE_ANON_KEY',
    'TEST_SUPABASE_ON_START',
    'COOKIE_SECRET',
    'WORKERS_COUNT',
    // 'SUPABASE_JWT_SECRET' // Not strictly required if using Cloud Auth
  ];
  const missingVars = REQUIRED_VARS.filter(key => !process.env[key]);
  if (missingVars.length > 0) {
    logger.error('\n❌ CRITICAL ERROR: Missing Required Environment Variables!');
    logger.error('-------------------------------------------------------');
    missingVars.forEach(key => logger.error(`   - ${key}`));
    logger.error('-------------------------------------------------------');
    logger.error('Please check your .env file or configuration.\n');
    process.exit(1);
  }
};

if (cluster.isPrimary) {
  validateEnv();
  if (!isProduction) console.clear();
  logger.info(`[Cluster] 🚀 Primary process ${process.pid} is running`);
  logger.info(`[Cluster] 🖥️  Detected ${numCPUs} CPU cores → Forking ${desiredWorkers} workers sequentially...`);
  const spawnWorkers = async () => {
    for (let i = 0; i < desiredWorkers; i++) {
      await new Promise<void>((resolve) => {
        const worker = cluster.fork();
        const messageHandler = (msg: string) => {
          if (msg === 'READY') {
            worker.off('message', messageHandler);
            resolve();
          }
        };
        worker.on('message', messageHandler);
      });
    }
    logger.info(`[Cluster] ✅ All ${desiredWorkers} workers have started and are fully operational.`);
  };

  spawnWorkers();
  cluster.on('exit', (worker: Worker, code: number, signal: string) => {
    restartCount++;
    logger.warn(
      `[Cluster] ⚠️ Worker ${worker.process.pid} died (Code: ${code}, Signal: ${signal}). ` +
      `Restart attempt ${restartCount}/${MAX_RESTARTS}`
    );
    if (restartCount <= MAX_RESTARTS) {
      cluster.fork();
    } else {
      logger.error('[Cluster] ❌ CRITICAL: Too many restarts detected. Shutting down primary process to prevent CPU spike.');
      process.exit(1);
    }
  });

} else {
  logger.info(`[Worker] 🔧 Worker ${process.pid} starting...`);
  import('./src/server.js')
    .then(() => {
      logger.info(`[Worker] ✅ Worker ${process.pid} initialized successfully`);
      if (process.send) process.send('READY');
    })
    .catch(err => {
      logger.error(`[Worker] ❌ Failed to start worker ${process.pid}`, err);
      process.exit(1);
    });
  process.on('SIGTERM', () => {
    logger.info(`[Worker] 🛑 ${process.pid} received SIGTERM. Shutting down gracefully...`);
    setTimeout(() => {
      logger.info(`[Worker] 👋 ${process.pid} has shut down.`);
      process.exit(0);
    }, 3000);
  });
}

/*
 * ==============================================================================
 * 🚀 Application Entry Point (Cluster Manager) (by Ym_zerotwo)
 * ==============================================================================
 *
 * This file acts as the Process Manager for the application. It creates a cluster of
 * Node.js processes (Workers) to fully utilize multi-core CPUs, ensuring high
 * availability and performance.
 *
 * ⚙️ How it Works:
 * 1. Environment Validation (`validateEnv`):
 *    - Checks for the presence of critical `.env` variables (PORT, SUPABASE_URL, etc.).
 *    - If any are missing, the process terminates immediately to prevent unstable startups.
 *
 * 2. Clustering (Primary Process):
 *    - Detects the number of CPU cores (`numCPUs`).
 *    - Forks a worker process for each core used.
 *    - **Sequencing**: Waits for a worker to send a 'READY' signal before starting the next one. This prevents CPU spikes during massive startups.
 *    - **Self-Healing**: Listens for 'exit' events. If a worker dies, it replaces it automatically.
 *
 * 3. Worker Process:
 *    - Imports `src/server.js` which initializes the actual Express app and HTTP server.
 *    - Signals 'READY' back to the primary process when initialization is complete.
 *
 * 📂 External Dependencies:
 * - `cluster`: Native Node.js module for multi-processing.
 * - `./src/server.js`: The worker logic file.
 * - `dotenv`: Loads environment variables.
 *
 * 🔒 Security Features:
 * - **Pre-flight Check**: Validates identifying configuration secrets (like COOKIE_SECRET) before running.
 * - **Crash Loop Protection**: The `MAX_RESTARTS` counter prevents the server from infinitely restarting if there is a fundamental bug, saving system resources.
 * - **Isolation**: A crash in one worker does not bring down the entire application; other workers continue serving requests.
 *
 * � Usage:
 * - `npm start` -> Runs this file.
 */