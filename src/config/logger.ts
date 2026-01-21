import winston from 'winston';
import DailyRotateFile from 'winston-daily-rotate-file';
import fs from 'fs';
import path from 'path';
import chalk from 'chalk';

const logsDirectory = path.join(process.cwd(), 'logs');
const isProduction = process.env.NODE_ENV === 'production';
const serviceName = process.env.SERVICE_NAME || process.env.npm_package_name || 'Core-X-Service';
const securityLogsDir = path.join(logsDirectory, 'security');

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

interface AugmentedLogger extends winston.Logger {
  stream: any;
}

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
}) as AugmentedLogger;

if (!isProduction || process.env.ENABLE_CONSOLE_LOGS === 'true') {
  logger.add(
    new winston.transports.Console({
      format: consoleFormat,
    })
  );
  console.log(chalk.green(`[Logger] ✅ Console logging enabled (Level: ${logger.level})`));
}

logger.stream = {
  write: (message: string) => {
    logger.http(message.trim());
  },
};

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

export const logThreat = (event: Record<string, any>) => {
  securityLogger.log({
    level: event.severity === 'CRITICAL' || event.severity === 'HIGH' ? 'warn' : 'info',
    message: event.description || 'Security Event',
    ...event,
  });
};

export { logger };

/*
 * ==============================================================================
 * 📝 Logger System Configuration (by Ym_zerotwo)
 * ==============================================================================
 *
 * This file establishes a centralized logging system based on Winston, replacing
 * standard console.log to ensure all events are captured, formatted, and persisted.
 *
 * ⚙️ How it Works:
 * 1. Log Levels: Configured to use standard npm levels (error, warn, info, http, verbose, debug, silly).
 * 2. Transports (Outputs):
 *    - **Console**: Active in Development; colored output to `stdout`.
 *    - **Files**: Active in all environments; rotates daily to manage disk space.
 *      - `logs/error-%DATE%.log`: Purely for errors (stack traces included).
 *      - `logs/combined-%DATE%.log`: All activity (good for tracing flow).
 * 3. Security Logger: A separate instance dedicated to recording `logThreat` events into a distinct folder (`logs/security/`).
 *
 * 📂 External Dependencies:
 * - `winston`: The core logging library.
 * - `winston-daily-rotate-file`: Manages log rotation (e.g., keeps logs for 14-30 days then deletes them).
 * - `chalk`: Used for coloring console output in development.
 *
 * 🔒 Security Features:
 * - **Isolation**: Security threats are stored separately from application noise.
 * - **Sanitization**: Designed to be extended with formatters that strip PIIm (though not implemented here yet).
 * - **Persistence**: Ensures critical errors aren't lost if the process crashes.
 *
 * 🚀 Usage:
 * - Direct: `logger.info('User logged in');`
 * - Security: `logThreat({ event: 'SQLI', severity: 'CRITICAL', ip: '1.2.3.4' });`
 * */