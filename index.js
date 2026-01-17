import cluster from 'cluster';
import os from 'os';
import { logger } from './src/config/logger.js';

const isProduction = process.env.NODE_ENV === 'production';
const numCPUs = os.cpus().length;
const desiredWorkers = parseInt(process.env.WORKERS_COUNT || numCPUs, 10);

const MAX_RESTARTS = 10;
let restartCount = 0;

if (cluster.isPrimary) {
  if (!isProduction) console.clear();
  logger.info(`[Cluster] 🚀 Primary process ${process.pid} is running`);
  logger.info(`[Cluster] 🖥️  Detected ${numCPUs} CPU cores → Forking ${desiredWorkers} workers`);
  for (let i = 0; i < desiredWorkers; i++) {
    cluster.fork();
  }
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
  let onlineWorkers = 0;
  cluster.on('online', (worker) => {
    onlineWorkers++;
    if (onlineWorkers === desiredWorkers) {
      logger.info(`[Cluster] ✅ All ${desiredWorkers} workers are online and ready.`);
    }
  });

} else {
  logger.info(`[Worker] 🔧 Worker ${process.pid} starting...`);
  import('./src/server.js')
    .then(() => {
      logger.info(`[Worker] ✅ Worker ${process.pid} initialized successfully`);
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