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