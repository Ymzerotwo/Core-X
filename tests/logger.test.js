import { test, describe } from 'node:test'; // استخدم نظام اختبار Node.js الأصلي
import assert from 'node:assert';
import fs from 'fs';
import path from 'path';
import { logger, logThreat } from '../src/config/logger.js';

describe('📝 System Logger & Security Audit', () => {
  const logsDir = path.join(process.cwd(), 'logs');
  const securityLogsDir = path.join(logsDir, 'security');

  test('1️⃣ Should write standard application logs', (t, done) => {
    logger.info('Test Info Log: System initialized');
    logger.warn('Test Warn Log: Resource usage high');
    logger.error('Test Error Log: Database timeout');

    setTimeout(() => {
      assert.ok(fs.existsSync(logsDir), 'Logs directory should exist');

      const files = fs.readdirSync(logsDir);
      const logFiles = files.filter(f => f.endsWith('.log'));

      assert.ok(logFiles.length > 0, 'Should have standard log files (combined/error)');

      const hasStandardLogs = logFiles.some(f => f.includes('combined') || f.includes('error'));
      assert.ok(hasStandardLogs, 'Should find standard log files');

      done();
    }, 500);
  });

  test('2️⃣ Should write security threats to dedicated audit folder', (t, done) => {
    logThreat({
      event: 'SQL_INJECTION_TEST',
      severity: 'CRITICAL',
      ip: '127.0.0.1',
      description: 'Testing security logger integration'
    });

    logThreat({
      event: 'SUSPICIOUS_ACTIVITY',
      severity: 'MEDIUM',
      ip: '192.168.0.1',
      description: 'Testing audit trail'
    });

    setTimeout(() => {
      assert.ok(fs.existsSync(securityLogsDir), 'Security logs directory should exist');
      const securityFiles = fs.readdirSync(securityLogsDir);

      const threatLogs = securityFiles.filter(f => f.includes('threats') && f.endsWith('.log'));
      assert.ok(threatLogs.length > 0, 'Should create threats log file for CRITICAL events');

      const auditLogs = securityFiles.filter(f => f.includes('audit') && f.endsWith('.log'));
      assert.ok(auditLogs.length > 0, 'Should create audit log file for all security events');

      done();
    }, 500);
  });
});