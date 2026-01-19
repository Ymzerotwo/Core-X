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
 * * This utility function enforces a strict API response structure across the entire application.
 * * 🏗️ Structure Output:
 * {
 * "success": boolean,
 * "code": number,
 * "errorCode": string,  <-- Used by Frontend for translation
 * "message": string,    <-- Fallback English message
 * "data": any,
 * "meta": { ... }
 * }
 * * 🛡️ Benefits:
 * 1. Predictability: The Frontend always knows what structure to expect.
 * 2. Tracing: Automatically attaches `req.id` to every response for easier debugging.
 * 3. Security: Hides sensitive error details in Production mode automatically.
 */