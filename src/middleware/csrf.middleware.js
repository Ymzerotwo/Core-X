import crypto from 'crypto';
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
    sameSite: 'Lax',
    path: '/',
    signed: true,
    priority: 'High',
};

export const setCookie = (res, name, value, maxAgeMs) => {
    const options = { ...cookieOptions };
    if (maxAgeMs) {
        options.maxAge = maxAgeMs;
    }
    res.cookie(name, value, options);
};

export const clearCookie = (res, name) => {
    res.clearCookie(name, cookieOptions);
};

export const rotateCsrfToken = (res) => {
    const token = crypto.randomBytes(32).toString('hex');
    
    const csrfCookieOptions = {
        ...cookieOptions,
        httpOnly: false,
    };

    res.cookie('csrf_token', token, {
        ...csrfCookieOptions,
        maxAge: 24 * 60 * 60 * 1000
    });

    res.setHeader('X-CSRF-Token', token);
    return token;
};

export const csrfProtection = (req, res, next) => {
    if (['GET', 'HEAD', 'OPTIONS'].includes(req.method) || process.env.NODE_ENV === 'test') {
        return next();
    }

    const cookieToken = req.signedCookies.csrf_token;
    const headerToken = req.headers['x-csrf-token'];
    const bodyToken = req.body?._csrf;
    const submittedToken = headerToken || bodyToken;

    if (!cookieToken || !submittedToken || cookieToken !== submittedToken) {
        logThreat({
            event: 'CSRF_TOKEN_MISMATCH',
            ip: req.ip,
            severity: 'HIGH',
            details: {
                cookiePresent: !!cookieToken,
                submittedPresent: !!submittedToken
            }
        });
        return sendResponse(
            res,
            req,
            HTTP_CODES.FORBIDDEN,
            RESPONSE_KEYS.PERMISSION_DENIED,
            null,
            null,
            { reason: 'Invalid or Missing CSRF Token' }
        );
    }

    const origin = req.headers['origin'];
    const referer = req.headers['referer'];
    const source = origin || referer;

    if (isProduction && !source) {
        logThreat({ event: 'CSRF_MISSING_SOURCE', ip: req.ip, severity: 'MEDIUM' });
        return sendResponse(
            res,
            req,
            HTTP_CODES.FORBIDDEN,
            RESPONSE_KEYS.PERMISSION_DENIED,
            null,
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
                null,
                { reason: 'Invalid Source Header Format' }
            );
        }
    }

    next();
};

/*
 * ==============================================================================
 * 🛡️ CSRF Protection & Cookie Security (Updated for 2025/2026 Standards)
 * ==============================================================================
 *
 * This middleware secures the application against Cross-Site Request Forgery (CSRF)
 * using the "Double Submit Cookie" pattern combined with strict Origin checks.
 *
 * 🔒 Security Features:
 * - Double Submit Cookie:
 * - Uses a signed, cookie ('csrf_token').
 * - Requires the client to send the same token in 'X-CSRF-Token' header or body.
 * - Stateless yet secure against cross-site posting.
 * * - Cookie Security:
 * - HttpOnly: False for CSRF token (to allow JS read), True for Auth tokens.
 * - Secure: HTTPS only (in Production).
 * - SameSite=Lax: Balances security with usability (e.g. magic links).
 * - Signed: Tamper-proof.
 *
 * - Origin/Referer Check (Layer 2):
 * - Validates request source against trusted domains.
 *
 * 🚀 Usage:
 * - `csrfProtection` is applied globally or on mutating routes.
 * - `rotateCsrfToken(res)` should be called on Login/Refresh.
 * - Client must read `X-CSRF-Token` from response headers OR cookies and send it in requests.
 */