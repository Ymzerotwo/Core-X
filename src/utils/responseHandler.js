import { DEFAULT_MESSAGES } from '../constants/responseCodes.js';

/**
 * @param {Object} res - The Express response object.
 * @param {Object} req - The Express request object (used to extract Request ID).
 * @param {Number} statusCode - HTTP status code.
 * @param {String} responseKey - The application specific key (e.g., 'USER_CREATED').
 * @param {Object|Array|null} data - The payload to return to the client.
 * @param {Object|null} pagination - Optional pagination metadata (page, limit, total).
 * @param {Object|Error|null} errorDetails - Internal error details for debugging.
 * @returns {Object} Express JSON response.
 */
export const sendResponse = (
  res,
  req,
  statusCode,
  responseKey,
  data = null,
  pagination = null,
  errorDetails = null
) => {
  const isSuccess = statusCode >= 200 && statusCode < 300;
  const message = DEFAULT_MESSAGES[responseKey] || responseKey;

  const meta = {
    requestId: req.id || 'unknown-id',
    timestamp: new Date().toISOString(),
  };

  if (pagination) {
    meta.pagination = {
      page: pagination.page,
      limit: pagination.limit,
      total: pagination.total,
      totalPages: Math.ceil(pagination.total / pagination.limit)
    };
  }


  const response = {
    success: isSuccess,
    code: statusCode,        // HTTP Status (e.g., 200, 404)
    slug: responseKey,       // Application Code for Frontend i18n (Renamed from errorCode)
    message: message,        // Human-readable English message
    data: data,              // The actual payload
    meta: meta               // Traceability & Pagination
  };

  if (errorDetails && process.env.NODE_ENV === 'development') {
    response.debug = {
      error_message: errorDetails.message || errorDetails,
      stack: errorDetails.stack || undefined,
      raw: errorDetails // sometimes helpful to see the full raw object
    };
  }

  return res.status(statusCode).json(response);
};
/*
 * ==============================================================================
 * 📤 Unified Response Handler (by Ym_zerotwo)
 * ==============================================================================
 *
 * This utility function enforces a strict, consistent API response structure across
 * the entire application, ensuring that the frontend always receives data in a
 * predictable format regardless of success or failure.
 *
 * ⚙️ How it Works:
 * 1. Parameters: Receives request context (`req`, `res`), status code, application-specific key (`slug`), data, and errors.
 * 2. Message Lookup: Resolves the human-readable English message from `DEFAULT_MESSAGES` using the provided key.
 * 3. Meta Data Construction: Automatically generates request ID and timestamp for traceability.
 * 4. Pagination (Optional): Formats pagination metadata (total pages, limit) into the `meta` object if provided.
 * 5. Environment Check:
 *    - **Development**: Attaches a `debug` field with stack traces and raw error details.
 *    - **Production**: Strips all sensitive error details, returning only the user-friendly message.
 *
 * 🏗️ Output Structure:
 * {
 *   "success": boolean,      // true for 2xx, false otherwise
 *   "code": number,          // HTTP Status Code (e.g., 200, 400)
 *   "slug": string,          // Stable error/success key for Frontend i18n (e.g., 'USER_NOT_FOUND')
 *   "message": string,       // Fallback English text
 *   "data": any,             // The actual payload (user object, list, etc.)
 *   "meta": {
 *     "requestId": string,
 *     "timestamp": string,
 *     "pagination": { ... }  // Optional
 *   },
 *   "debug": { ... }         // ONLY in Development
 * }
 *
 * 📂 External Dependencies:
 * - `../constants/responseCodes.js`: Source of truth for `DEFAULT_MESSAGES` mapping.
 *
 * 🔒 Security Features:
 * - **Information Hiding**: Automatically suppresses stack traces and internal error details in production to prevent leakage.
 * - **Consistency**: Prevents accidental exposure of raw database errors by forcing a structured response.
 *
 * 🚀 Usage:
 * - `return sendResponse(res, req, 200, 'USER_LOGIN_SUCCESS', { token: ... });`
 */