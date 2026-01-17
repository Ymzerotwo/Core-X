/*
 * File: tests/logger.test.js
 * Purpose: Manual verification of the logging system and file creation.
 * Usage: node tests/logger.test.js
 */

import { logger } from '../src/config/logger.js';
import fs from 'fs';
import path from 'path';
import chalk from 'chalk';

console.log(chalk.bold.white('\n🚀 --- Starting Logger System Test --- \n'));

// 1. Test printing all log levels (to verify console output and file writing)
console.log(chalk.cyan('1️⃣  Sending test logs...'));

logger.error('Test: This is an Error - should appear in error-*.log');
logger.warn('Test: This is a Warning');
logger.info('Test: This is Info');
logger.http('Test: This is an HTTP log request');
logger.debug('Test: Debug trace - Is this visible? (Check .env LOG_LEVEL)');

// 2. Simulate a real exception (to verify Stack Trace storage)
console.log(chalk.cyan('\n2️⃣  Simulating a real exception...'));
try {
  // Intentionally throwing an error to test the catcher
  throw new Error('Experimental error to test system resilience!');
} catch (err) {
  logger.error('Caught experimental error successfully', err);
}

// 3. Verify file system physically
console.log(chalk.cyan('\n3️⃣  Checking file system integrity...'));

// Small delay to ensure the OS has flushed buffers to disk
setTimeout(() => {
  const logsDir = path.join(process.cwd(), 'logs');

  if (fs.existsSync(logsDir)) {
    console.log(chalk.green('✅ "logs" directory exists.'));
    
    const files = fs.readdirSync(logsDir);
    if (files.length > 0) {
      console.log(chalk.green(`✅ Found ${files.length} log files:`));
      files.forEach(file => console.log(chalk.gray(`   - ${file}`)));
      console.log(chalk.bold.green('\n🎉 Test Successful! Logger system is operational.'));
    } else {
      console.log(chalk.red('❌ Directory exists but is empty! Write permission issue?'));
    }
  } else {
    console.log(chalk.red('❌ Test Failed: "logs" directory was not created!'));
  }
}, 500);