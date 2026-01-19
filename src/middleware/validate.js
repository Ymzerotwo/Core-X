import { z } from 'zod';
import { sendResponse } from '../utils/responseHandler.js';
import { HTTP_CODES, RESPONSE_KEYS } from '../constants/responseCodes.js';
import { logThreat } from '../config/logger.js';

export const validate = (schema) => (req, res, next) => {
    try {
        schema.parse({
            body: req.body,
            query: req.query,
            params: req.params,
        });

        next();
    } catch (error) {
        if (error instanceof z.ZodError) {
            const zodErrors = error.errors || error.issues || [];


            const isMalicious = zodErrors.some(err => err.message === "MALICIOUS_INPUT_DETECTED");

            if (isMalicious) {
                const threatDetails = zodErrors
                    .filter(err => err.message === "MALICIOUS_INPUT_DETECTED")
                    .map(err => ({ field: err.path.join('.'), input: "HIDDEN_FOR_SECURITY" }));

                logThreat({
                    event: 'MALICIOUS_INPUT_BLOCKED',
                    ip: req.ip,
                    method: req.method,
                    url: req.originalUrl,
                    details: threatDetails,
                    severity: 'CRITICAL'
                });
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

            const formattedErrors = zodErrors.reduce((acc, curr) => {
                const field = curr.path[1] || curr.path[0];
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
 * This middleware acts as a dual-layer filter for incoming requests.
 *
 * 🔄 Flow:
 * 1. Deep Security Scan: Recursively scans `req.body` for malicious patterns
 *    (SQLi, XSS, NoSQLi, etc.) using `SecurityValidator`.
 *    - If threat detected: Logs the threat (Critical/High), returns a Honeypot
 *      (Fake 200 OK) response to confuse attackers.,
 *
 * 2. Schema Validation: Uses `Zod` to validate data structure and types.
 *    - If invalid: Returns a standard 400 Bad Request with field-specific error messages.
 *
 * 🚀 Usage:
 * app.post('/register', validate(registerSchema), registerController);
 *
 */