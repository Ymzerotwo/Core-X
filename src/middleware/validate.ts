import { z, ZodSchema } from 'zod';
import { Request, Response, NextFunction } from 'express';
import { sendResponse } from '../utils/responseHandler.js';
import { HTTP_CODES, RESPONSE_KEYS } from '../constants/responseCodes.js';
import { logThreat } from '../config/logger.js';
import { banningService } from '../services/banning.service.js';

export const validate = (schema: ZodSchema<any>) => async (req: Request, res: Response, next: NextFunction) => {
    try {
        schema.parse({
            body: req.body,
            query: req.query,
            params: req.params,
        });
        next();
    } catch (error) {
        if (error instanceof z.ZodError) {
            const zodErrors = error.issues;
            const isMalicious = zodErrors.some((err: z.ZodIssue) => err.message === "MALICIOUS_INPUT_DETECTED");
            if (isMalicious) {
                const threatDetails = zodErrors
                    .filter((err: z.ZodIssue) => err.message === "MALICIOUS_INPUT_DETECTED")
                    .map((err: z.ZodIssue) => ({ field: err.path.join('.'), input: "HIDDEN_FOR_SECURITY" }));
                logThreat({
                    event: 'MALICIOUS_INPUT_BLOCKED',
                    ip: req.ip,
                    method: req.method,
                    url: req.originalUrl,
                    details: threatDetails,
                    severity: 'CRITICAL'
                });
                // Auto-Ban IP on Critical Threats
                const ip = req.ip || req.connection.remoteAddress || 'unknown';
                await banningService.banIp(ip, 'CRITICAL: Malicious Input Detected (SQLi/XSS)');
                return sendResponse(
                    res,
                    req,
                    HTTP_CODES.FORBIDDEN,
                    RESPONSE_KEYS.PERMISSION_DENIED,
                    null,
                    null,
                    { reason: 'Security Policy Violation' }
                );
            }
            const formattedErrors = zodErrors.reduce((acc: Record<string, string>, curr: z.ZodIssue) => {
                const field = String(curr.path[1] || curr.path[0]);
                acc[field] = curr.message;
                return acc;
            }, {});
            return sendResponse(
                res,
                req,
                HTTP_CODES.BAD_REQUEST,
                RESPONSE_KEYS.VALIDATION_ERROR,
                formattedErrors,
                null,
                error
            );
        }
        next(error);
    }
};

/*
 * ==============================================================================
 * 🛡️ Validation & Security Middleware (by Ym_zerotwo)
 * ==============================================================================
 *
 * This middleware acts as a dual-layer filter for incoming requests, combining
 * structural validation (Zod) with deep security scanning to prevent malformed
 * or malicious data from processing.
 *
 * ⚙️ How it Works:
 * 1. Schema Parsing (`schema.parse`):
 *    - Validates `req.body`, `req.query`, and `req.params` against the provided Zod schema.
 *    - The Zod schemas (defined elsewhere) include custom "refinements" that trigger the `SecurityValidator`.
 *
 * 2. Threat Detection:
 *    - If Zod throws an error, we inspect the error messages.
 *    - If a specific error "MALICIOUS_INPUT_DETECTED" is found:
 *      - **Action**: Immediate Block (403 Forbidden).
 *      - **Logging**: A CRITICAL threat is logged via `logThreat` with details hidden for security.
 *      - **Response**: A generic "Security Policy Violation" message is returned.
 *
 * 3. Validation Errors:
 *    - If errors are standard validation issues (e.g., missing field, invalid email):
 *    - **Action**: Return 400 Bad Request.
 *    - **Format**: Errors are formatted into a clean `{ field: message }` object for the frontend.
 *
 * 📂 External Dependencies:
 * - `zod`: The validation library used for defining schemas and parsing data.
 * - `../utils/responseHandler.js`: For sending standardized Success/Error responses.
 * - `../config/logger.js`: For logging security incidents.
 *
 * 🔒 Security Features:
 * - **Deep Inspection**: Catch SQL Injection, XSS, and Shell Injection patterns within the validation layer.
 * - **Fail-Fast**: Invalid or dangerous requests are stopped before reaching controllers.
 * - **Error Sanitization**: Detailed security error info is NOT returned to the client (Security by Obscurity).
 *
 * 🚀 Usage:
 * - `router.post('/login', validate(loginSchema), loginController);`
 */