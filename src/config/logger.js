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


const securityLogsDir = path.join(logsDirectory, 'security');

export const securityLogger = winston.createLogger({
  format: fileFormat,
  defaultMeta: { service: 'security-guard' },
  transports: [
    new DailyRotateFile({
      filename: path.join(securityLogsDir, 'threats-%DATE%.log'),
      datePattern: 'YYYY-MM-DD',
      level: 'warn', 
      maxSize: '20m',
      maxFiles: '30d',
      zippedArchive: true,
    }),
    new DailyRotateFile({
      filename: path.join(securityLogsDir, 'audit-%DATE%.log'),
      datePattern: 'YYYY-MM-DD',
      level: 'info',
      maxSize: '20m',
      maxFiles: '14d',
      zippedArchive: true,
    }),
  ],
});


export const logThreat = (event) => {
  securityLogger.log({
    level: event.severity === 'CRITICAL' || event.severity === 'HIGH' ? 'warn' : 'info',
    message: event.description || 'Security Event',
    ...event,
  });
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
 *
 * 🛡️ Security Logging (New):
 * - `logs/security/threats-*.log`: Critical & High severity threats (SQL Injection, XSS).
 * - `logs/security/audit-*.log`: Full security trail for auditing purposes.
 *
 * 🚀 Usage Examples:
 * ------------------
 * 1. Import:
 *    import { logger, logThreat } from '../config/logger.js';
 *
 * 2. General Logging:
 *    logger.info('Server started successfully');
 *    logger.error('Database connection failed', err);
 *
 * 3. Security Logging:
 *    logThreat({
 *      event: 'SQL_INJECTION_ATTEMPT',
 *      severity: 'CRITICAL',
 *      ip: req.ip,
 *      description: 'System blocked suspicious input'
 *    });
 *
 * 🔗 Integration with Morgan (HTTP Logs):
 * ---------------------------------------
 * app.use(morgan('combined', { stream: logger.stream }));
 *
 * 💡 Environment Behavior:
 * - Development: Logs are printed to the console with colors for readability.
 * - Production: Logs are written to files only for performance.
 */