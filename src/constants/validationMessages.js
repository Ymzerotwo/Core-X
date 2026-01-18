import { RESPONSE_KEYS } from './responseCodes.js';

// ===========================================
// 🛠️ Zod Messages Configuration (Mapped to Keys)
// ===========================================
// This file acts as the central dictionary for validation error messages.
// It ensures that all Zod errors (Invalid Type, Required, Too Small, etc.)
// return a clean, unified, and user-friendly message.

const ERROR_MESSAGES = {
    required: RESPONSE_KEYS.FIELD_REQUIRED,
    invalidType: RESPONSE_KEYS.INVALID_TYPE,
    email: RESPONSE_KEYS.EMAIL_INVALID,
    url: RESPONSE_KEYS.URL_INVALID,
    uuid: RESPONSE_KEYS.UUID_INVALID,

    // Dynamic keys can still be handled by frontend generic components
    // But for specific fields we use specific keys
    tooSmall: (min) => RESPONSE_KEYS.TOO_SMALL,
    tooBig: (max) => RESPONSE_KEYS.TOO_BIG,

    password: {
        min: RESPONSE_KEYS.PASSWORD_TOO_SHORT,
        max: RESPONSE_KEYS.PASSWORD_TOO_LONG,
        uppercase: RESPONSE_KEYS.PASSWORD_MISSING_UPPERCASE,
        lowercase: RESPONSE_KEYS.PASSWORD_MISSING_LOWERCASE,
        number: RESPONSE_KEYS.PASSWORD_MISSING_NUMBER,
        special: RESPONSE_KEYS.PASSWORD_MISSING_SPECIAL
    },
    username: {
        invalid: RESPONSE_KEYS.USERNAME_INVALID,
        min: RESPONSE_KEYS.USERNAME_TOO_SHORT,
        max: RESPONSE_KEYS.USERNAME_TOO_LONG
    },
    phone: RESPONSE_KEYS.PHONE_INVALID
};

export default ERROR_MESSAGES;
