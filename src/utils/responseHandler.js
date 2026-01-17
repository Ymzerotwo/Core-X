import {  DEFAULT_MESSAGES } from '../constants/responseCodes.js';

/**
 * Sends a standardized JSON response.
 * * @param {Object} res - The Express response object.
 * @param {Object} req - The Express request object (used to extract Request ID).
 * @param {Number} statusCode - HTTP status code (use HTTP_CODES constant).
 * @param {String} responseKey - The application specific key (use RESPONSE_KEYS constant).
 * @param {Object|Array|null} data - The payload to return to the client.
 * @param {Object|Error|null} errorDetails - Internal error details (stack trace) for debugging.
 * @returns {Object} Express JSON response.
 */
export const sendResponse = (res, req, statusCode, responseKey, data = null, errorDetails = null) => {
  // 1. Determine Success State based on HTTP Code
  const isSuccess = statusCode >= 200 && statusCode < 300;

  // 2. Get the English fallback message
  // If the key doesn't exist in DEFAULT_MESSAGES, use the key itself.
  const message = DEFAULT_MESSAGES[responseKey] || responseKey;

  // 3. Construct the Unified Response Object
  const response = {
    success: isSuccess,
    code: statusCode,        // e.g., 200, 400, 500
    errorCode: responseKey,  // e.g., 'USER_CREATED', 'INVALID_CREDENTIALS'
    message: message,        // e.g., 'User created successfully.'
    data: data,              // The actual payload (User object, List of items, etc.)
    meta: {
      requestId: req.id,                 // Trace ID for debugging
      timestamp: new Date().toISOString()
    }
  };

  // 4. Attach Debug Information (Development Mode Only)
  // We never want to expose stack traces or raw database errors in Production.
  if (errorDetails && process.env.NODE_ENV === 'development') {
    response.debug = {
      message: errorDetails.message || errorDetails,
      stack: errorDetails.stack || undefined,
    };
  }

  // 5. Send the Response
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