import { z } from 'zod';
import { SecurityValidator } from '../utils/securityValidator.js';

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
export const safeString = (fieldName, min = 1, max = 255) =>
    z.string({ required_error: `${fieldName} is required` })
        .refine((val) => !isMalicious(val), {
            message: MALICIOUS_ERROR,
        })
        .min(min, `${fieldName} must be at least ${min} character(s)`)
        .max(max, `${fieldName} cannot exceed ${max} characters`)
        .trim();

/**
 * 2. Email Rule
 * Automatically converts to LowerCase
 */
export const emailRule = z
    .string({ required_error: 'Email is required' })
    .refine((val) => !isMalicious(val), {
        message: MALICIOUS_ERROR,
    })
    .min(1, 'Email cannot be empty')
    .email('Invalid email format')
    .trim()
    .toLowerCase()
    .max(100, 'Email is too long');

/**
 * 3. Password Rule
 * Checked for injection patterns as it is a common entry point
 */
export const passwordRule = z
    .string({ required_error: 'Password is required' })
    .refine((val) => !isMalicious(val), {
        message: MALICIOUS_ERROR,
    })
    .min(8, 'Password must be at least 8 characters')
    .max(100, 'Password is too long')
    .regex(/[A-Z]/, 'Must contain at least one uppercase letter')
    .regex(/[a-z]/, 'Must contain at least one lowercase letter')
    .regex(/[0-9]/, 'Must contain at least one number')
    .regex(/[\W_]/, 'Must contain at least one special character');

/**
 * 4. ID Rule (UUIDs)
 * Strict UUID format
 */
export const idRule = z
    .string()
    .uuid('Invalid ID format');

/**
 * 5. Phone Rule
 * Accepting numbers, optional + at start
 */
export const phoneRule = z
    .string()
    .regex(/^\+?[0-9]{10,15}$/, 'Invalid phone number format')
    .optional();

/**
 * 6. Username Rule
 * Letters, numbers, and underscores only
 */
export const usernameRule = z
    .string({ required_error: 'Username is required' })
    .min(3, 'Username must be at least 3 characters')
    .max(30, 'Username cannot exceed 30 characters')
    .regex(/^[a-zA-Z0-9_]+$/, 'Username can only contain letters, numbers, and underscores')
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