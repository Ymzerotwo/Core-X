import { Response, Request } from 'express';
import { DEFAULT_MESSAGES } from '../constants/responseCodes.js';

interface Pagination {
  page: number;
  limit: number;
  total: number;
}

interface ErrorDetails {
  message?: string;
  stack?: string;
  [key: string]: any;
}

export const sendResponse = (
  res: Response,
  req: Request,
  statusCode: number,
  responseKey: string,
  data: any = null,
  pagination: Pagination | null = null,
  errorDetails: ErrorDetails | null | unknown = null
) => {
  const isSuccess = statusCode >= 200 && statusCode < 300;
  const message = DEFAULT_MESSAGES[responseKey] || responseKey;
  const meta: any = {
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

  const response: any = {
    success: isSuccess,
    code: statusCode,        // HTTP Status (e.g., 200, 404)
    slug: responseKey,       // Application Code for Frontend i18n (Renamed from errorCode)
    message: message,        // Human-readable English message
    data: data,              // The actual payload
    meta: meta               // Traceability & Pagination
  };

  if (errorDetails && process.env.NODE_ENV === 'development') {
    const err = errorDetails as ErrorDetails;
    response.debug = {
      error_message: err.message || err,
      stack: err.stack || undefined,
      raw: err
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