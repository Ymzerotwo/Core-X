import supabaseAdmin from '../config/supabase.js';
import { setCookie, clearCookie, rotateCsrfToken } from './csrf.middleware.js';
import { HTTP_CODES, RESPONSE_KEYS } from '../constants/responseCodes.js';
import { sendResponse } from '../utils/responseHandler.js';
import { logger, logThreat } from '../config/logger.js';
import jwt from 'jsonwebtoken';

if (!process.env.SUPABASE_JWT_SECRET && process.env.NODE_ENV === 'development') {
    logger.warn('⚠️ SUPABASE_JWT_SECRET is missing! Local JWT verification will be disabled.');
}

const standardizeUser = (source, isLocal = false) => {
    if (isLocal) {
        return {
            id: source.sub,
            email: source.email,
            role: source.role,
            app_metadata: source.app_metadata || {},
            user_metadata: source.user_metadata || {},
            aud: source.aud,
            created_at: source.created_at || new Date().toISOString() 
        };
    }
    return {
        id: source.id,
        email: source.email,
        role: source.role,
        app_metadata: source.app_metadata || {},
        user_metadata: source.user_metadata || {},
        aud: source.aud,
        created_at: source.created_at
    };
};

const coreAuth = async (req, res, next, isStrict = false) => {
    try {
        let accessToken = req.signedCookies['access_token'];
        const refreshToken = req.signedCookies['refresh_token'];
        let shouldRefresh = false;

        if (!accessToken && !refreshToken) {
            return sendResponse(res, req, HTTP_CODES.UNAUTHORIZED, RESPONSE_KEYS.UNAUTHORIZED_ACCESS);
        }

        if (accessToken) {
            if (!isStrict && process.env.SUPABASE_JWT_SECRET) {
                try {
                    const decoded = jwt.verify(accessToken, process.env.SUPABASE_JWT_SECRET);
                    req.user = standardizeUser(decoded, true);
                    return next();
                } catch (err) {
                    if (err.name === 'TokenExpiredError') {
                        logger.info('Access Token expired. Proceeding to refresh...');
                        shouldRefresh = true;
                    } else if (err.name === 'JsonWebTokenError') {
                        logThreat({
                            event: 'INVALID_JWT_SIGNATURE',
                            ip: req.ip,
                            severity: 'HIGH',
                            message: `Signature verification failed: ${err.message}`
                        });
                        clearCookie(res, 'access_token');
                        clearCookie(res, 'refresh_token');
                        return sendResponse(res, req, HTTP_CODES.FORBIDDEN, RESPONSE_KEYS.INVALID_TOKEN);
                    } else {
                        throw err;
                    }
                }
            } else {
                const { data: { user }, error } = await supabaseAdmin.auth.getUser(accessToken);
                if (user && !error) {
                    req.user = standardizeUser(user, false);
                    return next();
                }
                shouldRefresh = true;
            }
        } else {
            shouldRefresh = true;
        }

        if (shouldRefresh) {
            if (!refreshToken) {
                clearCookie(res, 'access_token');
                clearCookie(res, 'refresh_token');
                return sendResponse(res, req, HTTP_CODES.UNAUTHORIZED, RESPONSE_KEYS.TOKEN_EXPIRED);
            }

            const { data, error: refreshError } = await supabaseAdmin.auth.refreshSession({
                refresh_token: refreshToken
            });

            if (refreshError || !data.session) {
                clearCookie(res, 'access_token');
                clearCookie(res, 'refresh_token');
                logThreat({
                    event: 'AUTH_REFRESH_FAILED',
                    ip: req.ip,
                    severity: 'MEDIUM',
                    message: refreshError?.message
                });
                return sendResponse(res, req, HTTP_CODES.UNAUTHORIZED, RESPONSE_KEYS.TOKEN_EXPIRED);
            }
            const { access_token, refresh_token: newRefreshToken, expires_in, user } = data.session;

            const accessTokenMaxAge = expires_in ? expires_in * 1000 : 3600000;
            const refreshTokenMaxAge = 7 * 24 * 60 * 60 * 1000;

            setCookie(res, 'access_token', access_token, accessTokenMaxAge);
            setCookie(res, 'refresh_token', newRefreshToken, refreshTokenMaxAge);
            rotateCsrfToken(res);

            req.user = standardizeUser(user, false);
            next();
        }

    } catch (globalError) {
        logger.error('Auth Middleware Critical Error', { error: globalError.message });
        return sendResponse(res, req, HTTP_CODES.INTERNAL_SERVER_ERROR, RESPONSE_KEYS.SERVER_ERROR, null, null, globalError);
    }
};

export const requireAuth = (req, res, next) => coreAuth(req, res, next, false);
export const requireStrictAuth = (req, res, next) => coreAuth(req, res, next, true);

/*
 * ==============================================================================
 * 🔐 Authentication Middleware (by Ym_zerotwo)
 * ==============================================================================
 *
 * This middleware manages the security lifecycle of User Sessions.
 *
 * 🔄 Lifecycle:
 * 1. Verify Access Token (Local JWT or Remote).
 * 2. If Invalid Signature -> 🛑 BLOCK & LOG THREAT (HIGH).
 * 3. If Expired -> ⏳ Trigger Refresh Flow.
 * 4. Refresh Session -> ♻️ Rotate Tokens & Update Cookies.
 * 5. Sanitize User Data -> Provide clean `req.user`.
 *
 * 🛡️ Security Measures:
 * - Signature Verification blocks tampered tokens.
 * - Dynamic Expiration respects provider settings.
 * - Token Rotation prevents replay attacks.
 * - Least Privilege: `req.user` contains only essential data.
 * - Global Safety Net: Ensures no unhandled exceptions crash the request.
 *
 */
