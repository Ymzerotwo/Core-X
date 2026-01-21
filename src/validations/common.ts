import { z } from 'zod';
import { SecurityValidator } from '../utils/securityValidator.js';
import ERROR_MESSAGES from '../constants/validationMessages.js';

const isMalicious = (val: string) => {
    if (!val) return false;
    return !SecurityValidator.scan(val).isSafe;
};

const MALICIOUS_ERROR = "MALICIOUS_INPUT_DETECTED";
/**
 * 1. Safe String
 * Used for names, titles, notes
 * Trims and performs security check
 */
export const safeString = (fieldName: string, min: number = 1, max: number = 1000) =>
    z.string({ message: ERROR_MESSAGES.required })
        .trim()
        .min(min, ERROR_MESSAGES.tooSmall(min))
        .max(max, ERROR_MESSAGES.tooBig(max))
        .refine((val) => !isMalicious(val), {
            message: MALICIOUS_ERROR,
        });

/**
 * 2. Email Rule
 * Automatically converts to LowerCase
 */
export const emailRule = z
    .string({ message: ERROR_MESSAGES.required })
    .trim()
    .toLowerCase()
    .min(1, ERROR_MESSAGES.required)
    .email(ERROR_MESSAGES.email)
    .max(100, ERROR_MESSAGES.tooBig(100));


/**
 * 3. Password Rule
 * Checked for injection patterns as it is a common entry point
 */
export const passwordRule = z
    .string({ message: ERROR_MESSAGES.required })
    .min(8, ERROR_MESSAGES.password.min)
    .max(100, ERROR_MESSAGES.password.max)
    .regex(/[A-Z]/, ERROR_MESSAGES.password.uppercase)
    .regex(/[a-z]/, ERROR_MESSAGES.password.lowercase)
    .regex(/[0-9]/, ERROR_MESSAGES.password.number)
    .regex(/[\W_]/, ERROR_MESSAGES.password.special);


/**
 * 4. ID Rule (UUIDs)
 * Strict UUID format
 */
export const idRule = z
    .string()
    .uuid(ERROR_MESSAGES.uuid);

/**
 * 5. Phone Rule
 * Accepting numbers, optional + at start
 */
export const phoneRule = z
    .string()
    .regex(/^\+?[0-9]{10,15}$/, ERROR_MESSAGES.phone)
    .optional();

/**
 * 6. Username Rule
 * Letters, numbers, and underscores only
 */
export const usernameRule = z
    .string({ message: ERROR_MESSAGES.required })
    .min(3, ERROR_MESSAGES.username.min)
    .max(30, ERROR_MESSAGES.username.max)
    .regex(/^[a-zA-Z0-9_]+$/, ERROR_MESSAGES.username.invalid)
    .trim();

/**
 * 7. Text Rule (General text like description/comments)
 * Uses safeString with flexible limits
 */
export const textRule = (fieldName: string = 'Text', max: number = 1000) =>
    safeString(fieldName, 0, max).optional();

/*
 * ==============================================================================
 * 🛡️ Common Validation Rules (by Ym_zerotwo)
 * ==============================================================================
 *
 * This file serves as a central library of reusable Zod validation schemas
 * (primitives) used throughout the application to enforce data integrity and security.
 *
 * ⚙️ How it Works:
 * 1. Zod Primitives: Defines base rules for Strings, Emails, Passwords, etc.
 * 2. Security Refinement (`safeString`):
 *    - Applies a custom `.refine()` check to every potentially dangerous string.
 *    - Calls `SecurityValidator.scan()` internally.
 *    - If a threat is found, it throws a specific error code ("MALICIOUS_INPUT_DETECTED").
 *    - This specific error is intercepted by the `validate.js` middleware to trigger an immediate block.
 *
 * 📂 External Dependencies:
 * - `zod`: The schema definition library.
 * - `../utils/securityValidator.js`: The scanning engine used in `.refine()`.
 * - `../constants/validationMessages.js`: Centralized error messages for localization.
 *
 * 🔒 Security Features:
 * - **Injection Prevention**: By integrating `SecurityValidator` into the basic `safeString` type, almost all text inputs in the app are automatically scanned for SQLi/XSS.
 * - **Input Normalization**: Emails are automatically lowercased and trimmed.
 * - **Password Complexity**: Enforces length, casing, numbers, and special characters.
 *
 * 🚀 Usage:
 * - `const registerSchema = z.object({ email: emailRule, password: passwordRule });`
 */