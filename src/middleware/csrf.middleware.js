
import { HTTP_CODES, RESPONSE_KEYS } from '../constants/responseCodes.js';
import { sendResponse } from '../utils/responseHandler.js';
import { logThreat } from '../config/logger.js';

const isProduction = process.env.NODE_ENV === 'production';

const ALLOWED_ORIGINS = (process.env.CORS_ORIGINS || '')
    .split(',')
    .map(o => o.trim())
    .filter(Boolean);


export const cookieOptions = {
    httpOnly: true,
    secure: isProduction,
    sameSite: 'Strict',
    path: '/',
    signed: true,
    priority: 'High',
};

/**
 * Sets a secure cookie on the response
 * @param {import('express').Response} res 
 * @param {string} name - Cookie name
 * @param {string} value - Cookie value
 * @param {number} [maxAgeMs] - Optional expiration in milliseconds
 */
export const setCookie = (res, name, value, maxAgeMs) => {
    const options = { ...cookieOptions };
    if (maxAgeMs) {
        options.maxAge = maxAgeMs;
    }
    res.cookie(name, value, options);
};

/**
 * Clears a cookie from the response
 * @param {import('express').Response} res 
 * @param {string} name 
 */
export const clearCookie = (res, name) => {
    res.clearCookie(name, cookieOptions);
};


export const csrfProtection = (req, res, next) => {
    if (['GET', 'HEAD', 'OPTIONS'].includes(req.method)) {
        return next();
    }

    const origin = req.headers['origin'];
    const referer = req.headers['referer'];
    const source = origin || referer;

    if (isProduction && !source) {
        logThreat({ event: 'CSRF_MISSING_SOURCE', ip: req.ip, severity: 'HIGH' });
        return sendResponse(
            res,
            req,
            HTTP_CODES.FORBIDDEN,
            RESPONSE_KEYS.PERMISSION_DENIED,
            null,
            { reason: 'Missing Origin/Referer' }
        );
    }

    if (source) {
        try {
            const sourceUrl = new URL(source);
            const sourceOrigin = sourceUrl.origin;
            const isAllowed = ALLOWED_ORIGINS.includes(sourceOrigin);

            if (ALLOWED_ORIGINS.length > 0 && !isAllowed) {
                logThreat({
                    event: 'CSRF_ORIGIN_MISMATCH',
                    ip: req.ip,
                    origin: source,
                    severity: 'HIGH'
                });
                return sendResponse(
                    res,
                    req,
                    HTTP_CODES.FORBIDDEN,
                    RESPONSE_KEYS.PERMISSION_DENIED,
                    null,
                    { reason: 'Cross-Origin Request Blocked' }
                );
            }
        } catch (error) {
            logThreat({
                event: 'CSRF_INVALID_SOURCE_FORMAT',
                ip: req.ip,
                sourceHeader: source,
                severity: 'MEDIUM'
            });
            return sendResponse(
                res,
                req,
                HTTP_CODES.FORBIDDEN,
                RESPONSE_KEYS.PERMISSION_DENIED,
                null,
                { reason: 'Invalid Source Header Format' }
            );
        }
    }

    next();
};

/*
 * ==============================================================================
 * 🛡️ CSRF Protection & Cookie Security (by Ym_zerotwo)
 * ==============================================================================
 *
 * This middleware secures the application against Cross-Site Request Forgery (CSRF)
 * and manages secure, signed cookies.
 *
 * 🔒 Security Features:
 * - Cookie Security:
 *   - HttpOnly: Prevents XSS access to cookies.
 *   - Secure: Ensures transmission over HTTPS only (in Production).
 *   - SameSite=Strict: Blocks cross-site cookie sending.
 *   - Signed: Tamper-proof cookies using a secret.
 *   - Priority=High: Prioritizes cookie delivery.
 *
 * - CSRF Prevention:
 *   - Origin/Referer Check: Verifies that state-changing requests (POST, PUT, DELETE)
 *     originate from trusted domains.
 *   - Safe Methods Skip: GET, HEAD, OPTIONS are exempted as they should be read-only.
 *
 * 🚀 Usage:
 * - Use `setCookie` to securely store tokens.
 * - Use `csrfProtection` globally or on specific routes.
 *
 */
