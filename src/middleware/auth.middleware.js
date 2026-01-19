import supabaseAdmin from '../config/supabase.js';
import { setCookie, clearCookie, rotateCsrfToken } from './csrf.middleware.js';
import { HTTP_CODES, RESPONSE_KEYS } from '../constants/responseCodes.js';
import { sendResponse } from '../utils/responseHandler.js';
import { logger, logThreat } from '../config/logger.js';
// import jwt from 'jsonwebtoken'; // Uncomment if using Local Verification

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

const coreAuth = async (req, res, next) => {
    try {
        let accessToken = req.signedCookies['access_token'];
        const refreshToken = req.signedCookies['refresh_token'];
        let shouldRefresh = false;

        if (!accessToken && !refreshToken) {
            return sendResponse(res, req, HTTP_CODES.UNAUTHORIZED, RESPONSE_KEYS.UNAUTHORIZED_ACCESS);
        }

        if (accessToken) {
            // ☁️ Cloud Verification (Default)
            const { data: { user }, error } = await supabaseAdmin.auth.getUser(accessToken);

            if (user && !error) {
                req.user = standardizeUser(user, false);
                return next();
            }

            // If token is invalid/expired on server, try to refresh
            shouldRefresh = true;
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

export const requireAuth = (req, res, next) => coreAuth(req, res, next);
// Strict auth is same as normal auth in Cloud-only mode
//export const requireStrictAuth = (req, res, next) => coreAuth(req, res, next);

/*
 * ==============================================================================
 * 🔐 Authentication Middleware (by Ym_zerotwo)
 * ==============================================================================
 *
 * This middleware manages the security lifecycle of User Sessions.
 *
 * 🔄 Lifecycle:
 * 1. Verify Access Token (Remote check via Supabase).
 * 2. If Expired/Invalid -> ⏳ Trigger Refresh Flow.
 * 3. Refresh Session -> ♻️ Rotate Tokens & Update Cookies.
 * 4. Sanitize User Data -> Provide clean `req.user`.
 *
 */

/*
 * ==============================================================================
 * � Local JWT Verification (Alternative Method / الطريقة الأخرى)
 * ==============================================================================
 * 
 * لاستخدام التحقق المحلي بدلاً من السحابي (لتوفير الطلبات للخادم):
 * 1. تأكد من وجود SUPABASE_JWT_SECRET في ملف .env
 * 2. قم بإلغاء التعليق عن import jwt في الأعلى.
 * 3. استبدل بلوك "Cloud Verification" في دالة coreAuth بالكود التالي:
 *
 * if (process.env.SUPABASE_JWT_SECRET) {
 *     try {
 *         const decoded = jwt.verify(accessToken, process.env.SUPABASE_JWT_SECRET);
 *         req.user = standardizeUser(decoded, true);
 *         return next();
 *     } catch (err) {
 *         if (err.name === 'TokenExpiredError') {
 *             shouldRefresh = true;
 *         } else if (err.name === 'JsonWebTokenError') {
 *             logThreat({ event: 'INVALID_JWT_SIGNATURE', ip: req.ip, severity: 'HIGH', message: err.message });
 *             clearCookie(res, 'access_token');
 *             clearCookie(res, 'refresh_token');
 *             return sendResponse(res, req, HTTP_CODES.FORBIDDEN, RESPONSE_KEYS.INVALID_TOKEN);
 *         } else {
 *             throw err;
 *         }
 *     }
 * }
 */
