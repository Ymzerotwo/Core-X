import 'dotenv/config';
import cluster from 'cluster';
import os from 'os';
import { logger } from './src/config/logger.js';

const isProduction = process.env.NODE_ENV === 'production';
const numCPUs = os.cpus().length;
const desiredWorkers = parseInt(process.env.WORKERS_COUNT || numCPUs, 10);

const MAX_RESTARTS = 10;
let restartCount = 0;

const validateEnv = () => {
  const REQUIRED_VARS = [
    'NODE_ENV',
    'PORT',
    'SUPABASE_URL',
    'SUPABASE_SERVICE_ROLE_KEY',
    'COOKIE_SECRET',
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
      await new Promise((resolve) => {
        const worker = cluster.fork();
        const messageHandler = (msg) => {
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
  cluster.on('exit', (worker, code, signal) => {
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
 * 🚀 Application Entry Point (Cluster Manager)
 * ==============================================================================
 *
 * This file manages the Node.js Cluster to utilize all CPU cores.
 *
 * ⚙️ Features:
 * 1. Multi-Core Utilization: Spawns a worker for each CPU core.
 * 2. Self-Healing: Automatically restarts workers if they crash (up to a limit).
 * 3. Loop Protection: `MAX_RESTARTS` prevents infinite crash loops during startup.
 * 4. Graceful Shutdown: Listens for SIGTERM to allow clean exit in Docker/K8s.
 *
 * 📦 Usage:
 * - Run `npm start` to launch.
 */