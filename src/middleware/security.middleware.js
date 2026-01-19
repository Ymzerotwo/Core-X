import { SecurityValidator } from '../utils/securityValidator.js';
import { logThreat } from '../config/logger.js';
import { sendResponse } from '../utils/responseHandler.js';
import { HTTP_CODES, RESPONSE_KEYS } from '../constants/responseCodes.js';


export const securityMiddleware = (req, res, next) => {
  const userAgent = req.headers['user-agent'] || '';
  const uaCheck = SecurityValidator.scan(userAgent);

  if (!uaCheck.isSafe && uaCheck.action === 'BLOCK') {
    logThreat({
      event: 'SUSPICIOUS_USER_AGENT',
      ip: req.ip,
      ua: userAgent,
      severity: 'MEDIUM'
    });
    return sendResponse(res, req, HTTP_CODES.FORBIDDEN, RESPONSE_KEYS.PERMISSION_DENIED, null, null, { reason: 'Suspicious Client via WAF' });
  }



  next();
};

/*
 * ==============================================================================
 * 🛡️ Global Security Middleware (WAF) (by Ym_zerotwo)
 * ==============================================================================
 *
 * This middleware acts as the FIRST line of defense (Perimeter Firewall).
 * It runs on EVERY request before it reaches any route or controller.
 *
 * 🧠 Logic:
 * 1. User-Agent Analysis: Directly blocks known hacking tools (sqlmap, nessus, etc.)
 * using the SecurityValidator engine.
 *
 * 🚀 Performance Note:
 * - This middleware is intentionally lightweight.
 * - Deep Payload Analysis (SQLi, XSS checks) is delegated to the Validation Layer (Zod)
 * to ensure maximum throughput and avoid scanning invalid data.
 *
 * 🚦 Defense Strategy:
 * - Bot/Scanner -> 403 Forbidden (Immediate Block).
 * - Valid User-Agent -> Passed to Zod Validation.
 *
 */