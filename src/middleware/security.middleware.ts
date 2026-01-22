import { Request, Response, NextFunction } from 'express';
import { SecurityValidator } from '../utils/securityValidator.js';
import { logThreat } from '../config/logger.js';
import { requestsService } from '../services/requests.service.js';
import { sendResponse } from '../utils/responseHandler.js';
import { HTTP_CODES, RESPONSE_KEYS } from '../constants/responseCodes.js';
import { banningService } from '../services/banning.service.js';

export const securityMiddleware = async (req: Request, res: Response, next: NextFunction) => {
  const userAgent = req.headers['user-agent'] || '';
  const uaCheck = SecurityValidator.scan(userAgent);
  if (!uaCheck.isSafe && uaCheck.action === 'BLOCK') {
    const isHighSeverity = uaCheck.threats.some(t => t.severity === 'HIGH');
    logThreat({
      event: 'SUSPICIOUS_USER_AGENT',
      ip: req.ip || 'unknown',
      ua: userAgent,
      severity: isHighSeverity ? 'HIGH' : 'MEDIUM'
    });
    requestsService.logIntrusion(req, {
      severity: isHighSeverity ? 'HIGH' : 'MEDIUM',
      type: 'SUSPICIOUS_USER_AGENT',
      details: uaCheck.threats.map(t => t.type).join(', ')
    });
    if (isHighSeverity) {
      const ip = req.ip || req.connection.remoteAddress || 'unknown';
      await banningService.banIp(ip, `High Severity Threat: ${uaCheck.threats.map(t => t.type).join(', ')}`);
    }
    return sendResponse(res, req, HTTP_CODES.FORBIDDEN, RESPONSE_KEYS.PERMISSION_DENIED, null, null, { reason: 'Suspicious Client via WAF' });
  }
  next();
};

/*
 * ==============================================================================
 * 🛡️ Global Security Middleware (WAF) (by Ym_zerotwo)
 * ==============================================================================
 *
 * This middleware acts as the FIRST line of defense (Web Application Firewall - Lite).
 * It intercepts EVERY request entering the application to filter out obvious threats
 * before they reach any business logic or heavy processing.
 *
 * ⚙️ How it Works:
 * 1. User-Agent Analysis (`SecurityValidator.scan`):
 *    - it extracts the `User-Agent` string from request headers.
 *    - Scans it against a blacklist of known malicious tools (e.g., sqlmap, Nikto, Burp Suite, Nessus).
 *    - If a match is found (`!isSafe` AND `action === 'BLOCK'`):
 *      - The request is immediately terminated.
 *      - A high-severity threat log is created.
 *      - A 403 Forbidden response is returned.
 *
 * 2. Pass-through:
 *    - If the check passes, `next()` is called immediately to minimize latency.
 *
 * 📂 External Dependencies:
 * - `../utils/securityValidator.js`: The core engine (`SecurityValidator`) that contains the regex patterns and logic for detection.
 * - `../config/logger.js`: Used to record blocked attempts (`logThreat`).
 * - `../utils/responseHandler.js`: Ensures the blocking response is consistent with the API standard.
 *
 * 🔒 Security Features:
 * - **Bot Mitigation**: Stops automated scanners and script kiddies at the door.
 * - **Performance**: Lightweight check prevents resource exhaustion by rejecting bad traffic early.
 * - **Stealth**: Provides generic "Forbidden" messages to avoid leaking implementation details to attackers.
 *
 * 🚀 Usage:
 * - Must be mounted in `app.js` or `index.js` **before** any other routes or body parsers.
 * - `app.use(securityMiddleware);`
 */