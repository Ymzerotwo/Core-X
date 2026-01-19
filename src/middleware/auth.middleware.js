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
 * This middleware manages the security lifecycle of User Sessions, ensuring that
 * only authenticated users can access protected routes. It handles token verification,
 * automatic session refreshing, and user data standardization.
 *
 * ⚙️ How it Works:
 * 1. Initial Check (`coreAuth`):
 *    - looks for `access_token` and `refresh_token` in signed cookies.
 *    - If no tokens are found, validation fails immediately (401 Unauthorized).
 *
 * 2. Token Verification:
 *    - **Cloud Mode (Default)**: Calls `supabaseAdmin.auth.getUser(token)` to verify the token validity directly with Supabase.
 *      - If valid: User is attached to `req.user` and request proceeds.
 *      - If invalid/expired: The logic proceeds to step 3 (Refresh).
 *
 * 3. Session Refresh (Auto-Renewal):
 *    - If `access_token` is missing or invalid, but `refresh_token` exists:
 *    - Calls `supabaseAdmin.auth.refreshSession` to exchange the refresh token for a new pair.
 *    - **On Success**:
 *      - Sets new `access_token` and `refresh_token` cookies.
 *      - Rotates the CSRF token (`rotateCsrfToken`) for added security.
 *      - Updates `req.user` with fresh data and allows the request to proceed.
 *    - **On Failure**:
 *      - Clears all auth cookies.
 *      - Logs the failure as a potential threat.
 *      - Denies access (401).
 *
 * 📂 External Dependencies:
 * - `../config/supabase.js`: Supabase Admin client for verification and refreshing.
 * - `./csrf.middleware.js`: Helper functions to manage cookies (`setCookie`, `clearCookie`) and rotate CSRF tokens.
 * - `../utils/responseHandler.js`: Standardized response format.
 * - `../config/logger.js`: Logging security events and errors.
 *
 * 🔒 Security Features:
 * - **HttpOnly Cookies**: Prevents XSS attacks from stealing tokens.
 * - **Automatic Refresh**: Maintains user session without manual re-login while keeping short-lived access tokens.
 * - **Token Rotation**: Both Access and Refresh tokens are rotated on generation.
 * - **CSRF Rotation**: CSRF tokens are rotated whenever the session is refreshed to prevent fixation attacks.
 *
 * 🚀 Usage:
 * - Import `requireAuth` and use it in routes: `router.get('/profile', requireAuth, profileController)`.
 *
 * 📝 note: Local JWT Verification (Optional Optimization)
 * To reduce API calls to Supabase, you can enable local JWT verification:
 * 1. Ensure `SUPABASE_JWT_SECRET` is set in `.env`.
 * 2. Uncomment `import jwt ...` at the top of this file.
 * 3. Replace the "Cloud Verification" block in `coreAuth` with `jwt.verify` logic (see previous versions or docs).
 */
