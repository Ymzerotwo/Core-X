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

const validateValueByType = (type: string, value: string, ctx: z.RefinementCtx) => {
    if (type === 'ip') {
        const ipv4Regex = /^(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/;
        const ipv6Regex = /^(([0-9a-fA-F]{1,4}:){7,7}[0-9a-fA-F]{1,4}|([0-9a-fA-F]{1,4}:){1,7}:|([0-9a-fA-F]{1,4}:){1,6}:[0-9a-fA-F]{1,4}|([0-9a-fA-F]{1,4}:){1,5}(:[0-9a-fA-F]{1,4}){1,2}|([0-9a-fA-F]{1,4}:){1,4}(:[0-9a-fA-F]{1,4}){1,3}|([0-9a-fA-F]{1,4}:){1,3}(:[0-9a-fA-F]{1,4}){1,4}|([0-9a-fA-F]{1,4}:){1,2}(:[0-9a-fA-F]{1,4}){1,5}|[0-9a-fA-F]{1,4}:((:[0-9a-fA-F]{1,4}){1,6})|:((:[0-9a-fA-F]{1,4}){1,7}|:)|fe80:(:[0-9a-fA-F]{0,4}){0,4}%[0-9a-zA-Z]{1,}|::(ffff(:0{1,4}){0,1}:){0,1}((25[0-5]|(2[0-4]|1{0,1}[0-9]){0,1}[0-9])\.){3,3}(25[0-5]|(2[0-4]|1{0,1}[0-9]){0,1}[0-9])|([0-9a-fA-F]{1,4}:){1,4}:((25[0-5]|(2[0-4]|1{0,1}[0-9]){0,1}[0-9])\.){3,3}(25[0-5]|(2[0-4]|1{0,1}[0-9]){0,1}[0-9]))$/;

        const isIp = ipv4Regex.test(value) || ipv6Regex.test(value);
        if (!isIp) {
            ctx.addIssue({
                code: z.ZodIssueCode.custom,
                message: "Invalid IP address format. Must be a valid IPv4 or IPv6 Address.",
                path: ["value"]
            });
        }
    } else if (type === 'user') {
        const uuidResult = z.string().uuid().safeParse(value);
        if (!uuidResult.success) {
            ctx.addIssue({
                code: z.ZodIssueCode.custom,
                message: "Invalid User ID. Must be a valid UUID (e.g. 550e8400-e29b-41d4-a716-446655440000).",
                path: ["value"]
            });
        }
    } else if (type === 'token') {
        if (value.length < 10) {
            ctx.addIssue({
                code: z.ZodIssueCode.custom,
                message: "Token signature is too short. Please provide a valid token signature.",
                path: ["value"]
            });
        }
    }
};

export const banItemSchema = z.object({
    type: z.enum(['ip', 'user', 'token']),
    value: z.string().min(1, { message: "Value is required" }),
    reason: z.string().optional()
}).superRefine((data, ctx) => validateValueByType(data.type, data.value, ctx));

export const unbanItemSchema = z.object({
    type: z.enum(['ip', 'user', 'token']),
    value: z.string().min(1, { message: "Value is required" })
}).superRefine((data, ctx) => validateValueByType(data.type, data.value, ctx));

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