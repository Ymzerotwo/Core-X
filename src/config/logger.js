import winston from 'winston';
import DailyRotateFile from 'winston-daily-rotate-file';
import fs from 'fs';
import path from 'path';
import chalk from 'chalk';

const logsDirectory = path.join(process.cwd(), 'logs');
const isProduction = process.env.NODE_ENV === 'production';
const serviceName = process.env.SERVICE_NAME || process.env.npm_package_name || 'Core-X-Service';

try {
  if (!fs.existsSync(logsDirectory)) {
    fs.mkdirSync(logsDirectory, { recursive: true });
    console.log(chalk.blue(`[Logger] 📁 Created logs directory at: ${logsDirectory}`));
  }
} catch (error) {
  console.error(chalk.red('[Logger] ❌ CRITICAL: Could not create logs directory!'), error);
  if (isProduction) {
    console.warn(chalk.yellow('[Logger] ⚠️ Continuing without persistent logs...'));
  } else {
    process.exit(1);
  }
}

const fileFormat = winston.format.combine(
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
  winston.format.errors({ stack: true }),
  winston.format.splat(),
  winston.format.json()
);

const consoleFormat = winston.format.combine(
  winston.format.timestamp({ format: 'HH:mm:ss' }),
  winston.format.printf(({ timestamp, level, message, service, stack }) => {
    let levelColored = level.toUpperCase();
    if (level === 'error') levelColored = chalk.red.bold(levelColored);
    else if (level === 'warn') levelColored = chalk.yellow.bold(levelColored);
    else if (level === 'info') levelColored = chalk.green(levelColored);
    else if (level === 'http') levelColored = chalk.magenta(levelColored);
    else if (level === 'debug') levelColored = chalk.blue(levelColored);

    return `${chalk.gray(timestamp)} [${chalk.cyan(service)}] ${levelColored}: ${message} ${stack ? '\n' + chalk.red(stack) : ''}`;
  })
);

const logger = winston.createLogger({
  levels: winston.config.npm.levels,
  level: process.env.LOG_LEVEL || (isProduction ? 'http' : 'debug'),
  defaultMeta: { service: serviceName },
  format: fileFormat,
  transports: [
    new DailyRotateFile({
      filename: path.join(logsDirectory, 'error-%DATE%.log'),
      datePattern: 'YYYY-MM-DD',
      zippedArchive: true,
      maxSize: '20m',
      maxFiles: '30d',
      level: 'error',
      handleExceptions: true,
      handleRejections: true,
    }),

    new DailyRotateFile({
      filename: path.join(logsDirectory, 'combined-%DATE%.log'),
      datePattern: 'YYYY-MM-DD',
      zippedArchive: true,
      maxSize: '20m',
      maxFiles: '14d',
    }),
  ],
  exitOnError: false,
});


if (!isProduction || process.env.ENABLE_CONSOLE_LOGS === 'true') {
  logger.add(
    new winston.transports.Console({
      format: consoleFormat,
    })
  );
  console.log(chalk.green(`[Logger] ✅ Console logging enabled (Level: ${logger.level})`));
}


logger.stream = {
  write: (message) => {
    logger.http(message.trim());
  },
};

export { logger };

/*
 * ==============================================================================
 * 📝 Logger System Documentation (by Ym_zerotwo)
 * ==============================================================================
 *
 * This file establishes a centralized logging system based on Winston, replacing
 * standard console.log for better persistence and debugging.
 *
 * 📂 Log Storage:
 * - Logs are automatically saved in the root `logs/` directory.
 * - `error-YYYY-MM-DD.log`: Contains only error-level logs (critical for debugging).
 * - `combined-YYYY-MM-DD.log`: Contains all log levels (info, warn, error).
 * - Files are rotated daily and kept for 14-30 days to manage disk space.
 *
 * 🚀 Usage Examples:
 * ------------------
 * 1. Import the logger:
 * import { logger } from '../config/logger.js';
 *
 * 2. Log messages at different levels:
 * logger.info('Server started successfully');         // General info
 * logger.warn('Unauthorized access attempt detected'); // Warnings
 * logger.error('Database connection failed', err);     // Errors (pass error object)
 * logger.debug('User ID is: 12345');                   // Dev only (hidden in prod)
 *
 * 🔗 Integration with Morgan (HTTP Logs):
 * ---------------------------------------
 * In your `app.js`, connect Morgan to this logger to capture HTTP requests:
 * app.use(morgan('combined', { stream: logger.stream }));
 *
 * 💡 Environment Behavior:
 * - Development: Logs are printed to the console with colors for readability.
 * - Production: Logs are written to files only (or external services) for performance.
 */