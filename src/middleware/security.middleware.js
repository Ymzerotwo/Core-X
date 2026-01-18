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
    return sendResponse(res, req, HTTP_CODES.FORBIDDEN, RESPONSE_KEYS.PERMISSION_DENIED, null, { reason: 'Suspicious Client via WAF' });
  }

  const payloadCheck = SecurityValidator.deepScan({
    body: req.body,
    query: req.query,
    params: req.params
  });

  if (payloadCheck.hasThreats) {
    logThreat({
      event: 'MALICIOUS_PAYLOAD_DETECTED',
      ip: req.ip,
      method: req.method,
      url: req.originalUrl,
      threats: payloadCheck.threats,
      riskScore: payloadCheck.totalRisk,
      severity: payloadCheck.totalRisk >= 100 ? 'CRITICAL' : 'HIGH'
    });

    if (payloadCheck.totalRisk >= 75) {
      return sendResponse(
        res,
        req,
        HTTP_CODES.OK, 
        RESPONSE_KEYS.OPERATION_SUCCESS,
        null 
      );
    }

    return sendResponse(
      res,
      req,
      HTTP_CODES.BAD_REQUEST,
      RESPONSE_KEYS.VALIDATION_ERROR,
      null,
      { message: 'Security policy violation' }
    );
  }

  next();
};

/*
 * ==============================================================================
 * 🛡️ Global Security Middleware (WAF) (by Ym_zerotwo)
 * ==============================================================================
 *
 * This middleware acts as the first line of defense (Firewall) for the application.
 * It runs on EVERY request before it reaches any route or controller.
 *
 * 🧠 Logic:
 * 1. User-Agent Analysis: Directly blocks known hacking tools (sqlmap, nessus, etc.).
 * 2. Pre-emptive Deep Scan: Analyzes the entire request payload (body, query, params)
 *    for malicious patterns using the SecurityValidator engine.
 *
 * 🚦 Defense Strategy:
 * - Bot/Scanner -> 403 Forbidden.
 * - Critical Payload (SQLi, XSS) -> Honeypot (200 OK) to deceive attacker.
 * - Medium Payload -> 400 Bad Request with generic error.
 *
 */