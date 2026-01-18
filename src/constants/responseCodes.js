
export const HTTP_CODES = {
  OK: 200,
  CREATED: 201,
  NO_CONTENT: 204,
  BAD_REQUEST: 400,
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  CONFLICT: 409,
  UNPROCESSABLE_ENTITY: 422,
  TOO_MANY_REQUESTS: 429,
  INTERNAL_SERVER_ERROR: 500,
  SERVICE_UNAVAILABLE: 503
};

export const RESPONSE_KEYS = {
  // --- General Success ---
  OPERATION_SUCCESS: 'OPERATION_SUCCESS',
  DATA_RETRIEVED: 'DATA_RETRIEVED',

  // Registration (Sign Up)
  USER_REGISTERED: 'USER_REGISTERED',
  USER_REGISTERED_VERIFICATION_PENDING: 'USER_REGISTERED_VERIFICATION_PENDING',

  // Login (Sign In)
  LOGIN_SUCCESS: 'LOGIN_SUCCESS',
  LOGOUT_SUCCESS: 'LOGOUT_SUCCESS',

  // Account Verification (Email/Phone)
  ACCOUNT_VERIFIED: 'ACCOUNT_VERIFIED',
  VERIFICATION_EMAIL_RESENT: 'VERIFICATION_EMAIL_RESENT',

  // Password Management (Reset & Update)
  PASSWORD_RESET_LINK_SENT: 'PASSWORD_RESET_LINK_SENT',
  PASSWORD_RESET_SUCCESS: 'PASSWORD_RESET_SUCCESS',
  PASSWORD_UPDATED: 'PASSWORD_UPDATED', // For logged-in users changing password


  // General Errors
  SERVER_ERROR: 'SERVER_ERROR',
  VALIDATION_ERROR: 'VALIDATION_ERROR',
  MISSING_FIELDS: 'MISSING_FIELDS',
  INVALID_ID: 'INVALID_ID',
  NOT_FOUND: 'NOT_FOUND',
  TOO_MANY_ATTEMPTS: 'TOO_MANY_ATTEMPTS', // Rate limit hit

  // Registration Errors
  EMAIL_ALREADY_EXISTS: 'EMAIL_ALREADY_EXISTS',
  USERNAME_ALREADY_EXISTS: 'USERNAME_ALREADY_EXISTS',
  WEAK_PASSWORD: 'WEAK_PASSWORD',
  INVALID_EMAIL_FORMAT: 'INVALID_EMAIL_FORMAT',

  // Login Errors
  INVALID_CREDENTIALS: 'INVALID_CREDENTIALS', // Email or Password wrong
  ACCOUNT_NOT_VERIFIED: 'ACCOUNT_NOT_VERIFIED', // User tries to login before verifying
  ACCOUNT_LOCKED: 'ACCOUNT_LOCKED', // After too many failed attempts
  ACCOUNT_SUSPENDED: 'ACCOUNT_SUSPENDED', // Admin ban

  // Verification Errors
  INVALID_VERIFICATION_TOKEN: 'INVALID_VERIFICATION_TOKEN',
  VERIFICATION_TOKEN_EXPIRED: 'VERIFICATION_TOKEN_EXPIRED',
  ACCOUNT_ALREADY_VERIFIED: 'ACCOUNT_ALREADY_VERIFIED',

  // Password Reset Errors
  INVALID_RESET_TOKEN: 'INVALID_RESET_TOKEN',
  RESET_TOKEN_EXPIRED: 'RESET_TOKEN_EXPIRED',
  SAME_PASSWORD_ERROR: 'SAME_PASSWORD_ERROR', // New password matches the old one
  USER_NOT_FOUND_FOR_RESET: 'USER_NOT_FOUND_FOR_RESET', // Optional (Security risk: implies email existence)

  // Authorization Errors
  UNAUTHORIZED_ACCESS: 'UNAUTHORIZED_ACCESS',
  TOKEN_EXPIRED: 'TOKEN_EXPIRED',
  INVALID_TOKEN: 'INVALID_TOKEN',
  PERMISSION_DENIED: 'PERMISSION_DENIED',

  // Validation Specific Keys (For Frontend Translation)
  FIELD_REQUIRED: 'FIELD_REQUIRED',
  EMAIL_INVALID: 'EMAIL_INVALID',
  PASSWORD_TOO_SHORT: 'PASSWORD_TOO_SHORT',
  PASSWORD_TOO_LONG: 'PASSWORD_TOO_LONG',
  PASSWORD_MISSING_UPPERCASE: 'PASSWORD_MISSING_UPPERCASE',
  PASSWORD_MISSING_LOWERCASE: 'PASSWORD_MISSING_LOWERCASE',
  PASSWORD_MISSING_NUMBER: 'PASSWORD_MISSING_NUMBER',
  PASSWORD_MISSING_SPECIAL: 'PASSWORD_MISSING_SPECIAL',
  USERNAME_INVALID: 'USERNAME_INVALID',
  USERNAME_TOO_SHORT: 'USERNAME_TOO_SHORT',
  USERNAME_TOO_LONG: 'USERNAME_TOO_LONG',
  PHONE_INVALID: 'PHONE_INVALID',
  UUID_INVALID: 'UUID_INVALID',
  URL_INVALID: 'URL_INVALID',
  INVALID_TYPE: 'INVALID_TYPE',
  TOO_SMALL: 'TOO_SMALL',
  TOO_BIG: 'TOO_BIG'
};

export const DEFAULT_MESSAGES = {
  // General
  [RESPONSE_KEYS.OPERATION_SUCCESS]: 'Operation completed successfully.',
  [RESPONSE_KEYS.DATA_RETRIEVED]: 'Data retrieved successfully.',
  [RESPONSE_KEYS.SERVER_ERROR]: 'An internal server error occurred.',
  [RESPONSE_KEYS.VALIDATION_ERROR]: 'The provided data is invalid.',
  [RESPONSE_KEYS.MISSING_FIELDS]: 'Required fields are missing.',
  [RESPONSE_KEYS.NOT_FOUND]: 'Resource not found.',
  [RESPONSE_KEYS.TOO_MANY_ATTEMPTS]: 'Too many requests. Please try again later.',

  // --- Registration ---
  [RESPONSE_KEYS.USER_REGISTERED]: 'Account created successfully.',
  [RESPONSE_KEYS.USER_REGISTERED_VERIFICATION_PENDING]: 'Account created. Please check your email to verify your account.',
  [RESPONSE_KEYS.EMAIL_ALREADY_EXISTS]: 'This email address is already registered.',
  [RESPONSE_KEYS.USERNAME_ALREADY_EXISTS]: 'This username is already taken.',
  [RESPONSE_KEYS.WEAK_PASSWORD]: 'Password is too weak. It must be at least 8 characters long.',
  [RESPONSE_KEYS.INVALID_EMAIL_FORMAT]: 'Invalid email format.',

  // --- Login ---
  [RESPONSE_KEYS.LOGIN_SUCCESS]: 'Logged in successfully.',
  [RESPONSE_KEYS.LOGOUT_SUCCESS]: 'Logged out successfully.',
  [RESPONSE_KEYS.INVALID_CREDENTIALS]: 'Invalid email or password.',
  [RESPONSE_KEYS.ACCOUNT_NOT_VERIFIED]: 'Your account is not verified. Please check your email.',
  [RESPONSE_KEYS.ACCOUNT_LOCKED]: 'Your account has been temporarily locked due to multiple failed login attempts.',
  [RESPONSE_KEYS.ACCOUNT_SUSPENDED]: 'Your account has been suspended by the administrator.',

  // --- Verification ---
  [RESPONSE_KEYS.ACCOUNT_VERIFIED]: 'Email verified successfully. You can now log in.',
  [RESPONSE_KEYS.VERIFICATION_EMAIL_RESENT]: 'Verification email has been resent.',
  [RESPONSE_KEYS.INVALID_VERIFICATION_TOKEN]: 'Invalid verification token.',
  [RESPONSE_KEYS.VERIFICATION_TOKEN_EXPIRED]: 'Verification token has expired. Please request a new one.',
  [RESPONSE_KEYS.ACCOUNT_ALREADY_VERIFIED]: 'This account is already verified.',

  // --- Password Management ---
  [RESPONSE_KEYS.PASSWORD_RESET_LINK_SENT]: 'If an account exists with this email, a password reset link has been sent.',
  [RESPONSE_KEYS.PASSWORD_RESET_SUCCESS]: 'Password has been reset successfully.',
  [RESPONSE_KEYS.PASSWORD_UPDATED]: 'Password updated successfully.',
  [RESPONSE_KEYS.INVALID_RESET_TOKEN]: 'Invalid or used password reset token.',
  [RESPONSE_KEYS.RESET_TOKEN_EXPIRED]: 'Password reset token has expired.',
  [RESPONSE_KEYS.SAME_PASSWORD_ERROR]: 'New password cannot be the same as the old password.',
  [RESPONSE_KEYS.USER_NOT_FOUND_FOR_RESET]: 'No user found with this email address.',



  // --- Auth General ---
  [RESPONSE_KEYS.UNAUTHORIZED_ACCESS]: 'You are not authorized to perform this action.',
  [RESPONSE_KEYS.TOKEN_EXPIRED]: 'Session expired. Please log in again.',
  [RESPONSE_KEYS.INVALID_TOKEN]: 'Invalid authentication token.',
  [RESPONSE_KEYS.PERMISSION_DENIED]: 'You do not have permission to access this resource.'
};
/*
 * ==============================================================================
 * 📖 Constant Definitions (by Ym_zerotwo)
 * ==============================================================================
 * * This file serves as the single source of truth for API response codes.
 * * 🛠️ Why use this?
 * 1. Consistency: Ensures the Frontend and Backend speak the exact same language.
 * 2. Magic Strings: Avoids hardcoding strings like "User not found" inside controllers.
 * 3. Internationalization (i18n): The Frontend uses `RESPONSE_KEYS` to lookup 
 * translations (e.g., Arabic/English), while `DEFAULT_MESSAGES` acts as a 
 * safety net (fallback) for developers or tools like Postman.
 * * 📦 Usage:
 * Import these constants into your controllers or the `responseHandler.js` utility.
 */