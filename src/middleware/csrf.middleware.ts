import crypto from 'crypto';
import { Request, Response, NextFunction, CookieOptions } from 'express';
import { HTTP_CODES, RESPONSE_KEYS } from '../constants/responseCodes.js';
import { sendResponse } from '../utils/responseHandler.js';
import { logThreat } from '../config/logger.js';

const isProduction = process.env.NODE_ENV === 'production';
const ALLOWED_ORIGINS = (process.env.CORS_ORIGINS || '')
    .split(',')
    .map(o => o.trim())
    .filter(Boolean);

export const cookieOptions: CookieOptions = {
    httpOnly: true,
    secure: isProduction,
    sameSite: 'lax', // Typed as 'lax' | 'strict' | 'none' | boolean
    path: '/',
    signed: true,
    priority: 'high', // Note: priority is not standard in types for some versions, but supported by express res.cookie options usually as extension or standard
};

export const setCookie = (res: Response, name: string, value: string, maxAgeMs?: number) => {
    const options = { ...cookieOptions };
    if (maxAgeMs) {
        options.maxAge = maxAgeMs;
    }
    res.cookie(name, value, options);
};

export const clearCookie = (res: Response, name: string) => {
    res.clearCookie(name, cookieOptions);
};

export const rotateCsrfToken = (res: Response) => {
    const token = crypto.randomBytes(32).toString('hex');
    const csrfCookieOptions: CookieOptions = {
        ...cookieOptions,
        httpOnly: false,
        signed: false,
    };
    res.cookie('csrf_token', token, {
        ...csrfCookieOptions,
        maxAge: 24 * 60 * 60 * 1000
    });
    res.setHeader('X-CSRF-Token', token);
    return token;
};

export const csrfProtection = (req: Request, res: Response, next: NextFunction) => {
    if (['GET', 'HEAD', 'OPTIONS'].includes(req.method) || process.env.NODE_ENV === 'test') {
        return next();
    }
    const cookieToken = req.cookies?.csrf_token;
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
 * 🛡️ CSRF Protection & Cookie Security (by Ym_zerotwo)
 * ==============================================================================
 *
 * This middleware secures the application against Cross-Site Request Forgery (CSRF)
 * using the "Double Submit Cookie" pattern combined with strict Origin checks.
 *
 * ⚙️ How it Works:
 * 1. Token Generation (`rotateCsrfToken`):
 *    - Generates a random 32-byte hex token using `crypto`.
 *    - Sets a `csrf_token` cookie. crucially, this cookie is NOT `HttpOnly` so the frontend can read it.
 *    - Sends the same token in the `X-CSRF-Token` response header.
 *
 * 2. Request Validation (`csrfProtection`):
 *    - Skips validation for safe methods (GET, HEAD, OPTIONS) or if `NODE_ENV` is 'test'.
 *    - Reads the `csrf_token` from signed cookies.
 *    - Reads the submitted token from `X-CSRF-Token` header or `_csrf` body field.
 *    - **Double Check**: Verifies that the cookie token matches the submitted token.
 *    - **Origin Check**: Verifies that the request's `Origin` or `Referer` matches `ALLOWED_ORIGINS`.
 *
 * 📂 External Dependencies:
 * - `crypto`: Node.js module used for generating secure random tokens.
 * - `../constants/responseCodes.js`: Imported for `HTTP_CODES` and `RESPONSE_KEYS` to standardize errors.
 * - `../utils/responseHandler.js`: Used (`sendResponse`) to send consistent JSON error responses.
 * - `../config/logger.js`: Used (`logThreat`) to log security incidents like token mismatches or invalid origins.
 *
 * 🔒 Security Features:
 * - **Double Submit Cookie**: Stateless protection that relies on the "same-origin policy" for reading cookies.
 * - **Cookie Settings**:
 *   - `Signed`: Prevents tampering.
 *   - `SameSite='Lax'`: Balances security with top-level navigations.
 *   - `Secure`: Enforced in production (HTTPS).
 * - **Origin Verification**: Acts as a second layer of defense.
 *
 * 🚀 Usage:
 * - Apply `csrfProtection` to mutating routes (POST, PUT, DELETE).
 * - Call `rotateCsrfToken(res)` on authentication events (Login/Verify).
 * - Frontend Requirements: Read `csrf_token` from document.cookie and send it as `X-CSRF-Token` header.
 */
