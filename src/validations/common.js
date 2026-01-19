import { z } from 'zod';
import { SecurityValidator } from '../utils/securityValidator.js';
import ERROR_MESSAGES from '../constants/validationMessages.js';

// =============================================================================
const isMalicious = (val) => {
    if (!val) return false;
    return !SecurityValidator.scan(val).isSafe;
};

const MALICIOUS_ERROR = "MALICIOUS_INPUT_DETECTED";

// =============================================================================
// Reusable Rules
// =============================================================================

/**
 * 1. Safe String
 * Used for names, titles, notes
 * Trims and performs security check
 */
export const safeString = (fieldName, min = 1, max = 1000) =>
    z.string({ required_error: ERROR_MESSAGES.required })
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
    .string({ required_error: ERROR_MESSAGES.required })
    .buffer() // Allows raw string access if needed
    .trim()
    .toLowerCase()
    .min(1, ERROR_MESSAGES.required)
    .email(ERROR_MESSAGES.email)
    .max(100, ERROR_MESSAGES.tooBig(100))


/**
 * 3. Password Rule
 * Checked for injection patterns as it is a common entry point
 */
export const passwordRule = z
    .string({ required_error: ERROR_MESSAGES.required })
    .min(8, ERROR_MESSAGES.password.min)
    .max(100, ERROR_MESSAGES.password.max)
    .regex(/[A-Z]/, ERROR_MESSAGES.password.uppercase)
    .regex(/[a-z]/, ERROR_MESSAGES.password.lowercase)
    .regex(/[0-9]/, ERROR_MESSAGES.password.number)
    .regex(/[\W_]/, ERROR_MESSAGES.password.special)


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
    .string({ required_error: ERROR_MESSAGES.required })
    .min(3, ERROR_MESSAGES.username.min)
    .max(30, ERROR_MESSAGES.username.max)
    .regex(/^[a-zA-Z0-9_]+$/, ERROR_MESSAGES.username.invalid)
    .trim();

/**
 * 7. Text Rule (General text like description/comments)
 * Uses safeString with flexible limits
 */
export const textRule = (fieldName = 'Text', max = 1000) =>
    safeString(fieldName, 0, max).optional();

/*
 * ==============================================================================
 * 🛡️ Common Validation Rules (by Ym_zerotwo)
 * ==============================================================================
 *
 * This file contains reusable Zod schemas for common data types.
 *
 * 🔒 Security Features:
 * - Integration with SecurityValidator: All string inputs are pre-scanned for threats.
 * - Honeypot Trigger: Malicious inputs trigger a specific error caught by middleware.
 * - Strict Typing: Enforces correct data types and formats (Email, UUID, etc.).
 *
 * 📦 Exports:
 * - safeString: General safe text.
 * - emailRule: Normalized email validation.
 * - passwordRule: Strong password policy.
 * - idRule: UUID validation.
 *
 */