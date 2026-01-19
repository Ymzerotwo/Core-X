# Core-X Backend Boilerplate 🚀
![Status](https://img.shields.io/badge/Status-In%20Development-orange?style=flat-square)
![License](https://img.shields.io/badge/License-MIT-blue?style=flat-square)
![Node](https://img.shields.io/badge/Node.js-v18%2B-green?style=flat-square)

> **⚠️ Note: This project is currently in the active development phase.**

## 📖 Overview

**Core-X** is not just another boilerplate; it is a **production-ready backend foundation** designed for developers who want to skip the repetitive setup of authentication, security, and logging.

Instead of writing a backend from scratch, **Core-X** provides a robust, secure, and scalable starting point. It integrates industry-standard security practices (CSRF, WAF, Rate Limiting) and a powerful authentication system powered by **Supabase**, allowing you to focus immediately on building your business logic.

---

## ✨ Why Core-X?

*   **🛡️ Battle-Tested Security**: Comes with a built-in Web Application Firewall (WAF) Lite, CSRF protection using "Double Submit Cookie", and strict Helmet headers.
*   **🔌 Supabase Integration**: Pre-configured authentication middleware supporting both Cloud verification and highly optimized Local JWT verification.
*   **⚡ Multi-Core Scalability**: Built-in Cluster support that automatically utilizes all available CPU cores for maximum performance.
*   **📝 Advanced Logging**: Centralized Winston logger with daily file rotation and separate security threat logs.
*   **✅ Strict Validation**: Integrated Zod validation with automatic deep security scanning for malicious payloads (SQLi, XSS).

---

## 🛠️ Tech Stack

*   **Runtime**: Node.js (ES Modules)
*   **Framework**: Express.js
*   **Database & Auth**: Supabase (PostgreSQL)
*   **Validation**: Zod
*   **Security**: Helmet, HPP, CSURF (Custom Implementation), Express-Rate-Limit
*   **Logging**: Winston & Winston-Daily-Rotate-File

---

## 📂 Project Structure

```bash
core-x/
├── logs/
├── src/
│   ├── config/
│   │   ├── logger.js
│   │   └── supabase.js
│   ├── constants/
│   │   ├── responseCodes.js
│   │   ├── securityPatterns.js
│   │   └── validationMessages.js
│   ├── controllers/        # (Coming Soon)
│   ├── db/                 # (Coming Soon)
│   ├── middleware/
│   │   ├── auth.middleware.js
│   │   ├── csrf.middleware.js
│   │   ├── security.middleware.js
│   │   └── validate.js
│   ├── routes/             # (Coming Soon)
│   ├── services/           # (Coming Soon)
│   ├── utils/
│   │   ├── responseHandler.js
│   │   └── securityValidator.js
│   ├── validations/
│   │   └── common.js
│   ├── app.js
│   └── server.js
├── tests/
│   ├── logger.test.js
│   ├── responses.test.js
│   └── security.test.js
├── .env
├── .env.example
├── .gitignore
├── index.js
├── LICENSE
├── package-lock.json
├── package.json
└── README.md
```

---

## 🚀 Getting Started

### 1. Prerequisites
*   Node.js (v18 or higher)
*   Supabase Account (for URL and Keys)

### 2. Installation
Clone the repository and install dependencies:

```bash
git clone https://github.com/your-repo/core-x.git
cd core-x
npm install
```

### 3. Configuration
Create a `.env` file in the root directory:

```env
NODE_ENV=development
PORT=5000
SERVICE_NAME=Core-X-Backend

# Security
COOKIE_SECRET=super_secure_random_string_at_least_32_chars
CORS_ORIGINS=http://localhost:3000,http://localhost:5173

# Supabase
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
# SUPABASE_JWT_SECRET=your-jwt-secret (Optional for Local Verification)
```

### 4. Run Locally

```bash
# Development Mode (Console Logs + Hot Reload)
npm run dev

# Production Mode (File Logs + Cluster Optimization)
npm start
```

---

## 📡 API Response Structure

Core-X enforces a strict, unified JSON response format for all endpoints, ensuring the frontend always knows what to expect.

### Success Response (200 OK)
```json
{
  "success": true,
  "code": 200,
  "slug": "LOGIN_SUCCESS",
  "message": "Logged in successfully.",
  "data": {
    "user": { "id": "123", "email": "dev@example.com" },
  },
  "meta": {
    "requestId": "req_a1b2c3d4",
    "timestamp": "2026-01-19T12:00:00.000Z"
  }
}
```

### Operational Error (401 Unauthorized)
```json
{
  "success": false,
  "code": 401,
  "slug": "INVALID_CREDENTIALS",
  "message": "Invalid email or password.",
  "data": null,
  "meta": {
    "requestId": "req_992100", 
    "timestamp": "2026-01-19T10:35:00.000Z"
  }
}
```

### System Error (500 - Development Mode Only)
*Includes a `debug` field with stack traces to help developers fix issues fast.*

```json
{
  "success": false,
  "code": 500,
  "slug": "DB_CONNECTION_ERROR",
  "message": "Internal Server Error",
  "data": null,
  "meta": {
    "requestId": "req_555123",
    "timestamp": "2026-01-19T10:40:00.000Z"
  },
  "debug": {
    "error_message": "Connection to Supabase timed out",
    "stack": "Error: Connection to Supabase timed out\n    at Client.connect (/app/node_modules/pg/lib/client.js:52)...",
    "raw": {
        "errno": -110,
        "code": "ETIMEDOUT",
        "syscall": "connect"
    }
  }
}
```

---

## 🛡️ Security Features Details

| Feature | Description |
| :--- | :--- |
| **Double Submit Cookie** | Protects against CSRF by requiring a token in both the cookie and the header. |
| **WAF Lite** | Blocks known malicious User-Agents (scanners like SQLMap, Nessus) instantly. |
| **Deep Input Scan** | Recursively scans all incoming JSON bodies for SQL Injection, XSS, and Prototype Pollution attacks. |
| **Secure Headers** | Implements HSTS, CSP, NoSniff, and Frameguard via Helmet. |
| **Rate Limiting** | Limits requests to 200 per 15 minutes per IP to prevent Brute Force / DDoS. |

---

## 📝 Advanced Logging System

Core-X eschews standard console logging in production for a robust, persistent file-based system powered by **Winston**.

### 📂 Log Structure (`/logs`)
*   **`combined-%DATE%.log`**: Records all server activity (Request paths, Response times, Info messages). Good for general debugging.
*   **`error-%DATE%.log`**: Strictly records errors and stack traces. Check this first when something breaks.
*   **`security/threats-%DATE%.log`**: 🚨 **The Alert Channel**. Only contains confirmed security threats (like SQL Injection attempts).

> **Rotation Policy**: Logs are automatically rotated daily and kept for 14 days (Combined) or 30 days (Errors/Security) to manage disk space efficiently.

---

## 🪤 Threat Detection Engine (The "Trap")

Core-X doesn't just block attacks; it **identifies and logs them** using a custom engine (`SecurityValidator.js`) that acts as a trap for malicious actors.

### How it works:
1.  **Perimeter Scan**: The `security.middleware` first checks the visitor's **User-Agent**. Known scanning tools (like *SQLMap*, *Nessus*, *Burp Suite*) are instantly blocked before they can touch your API.
2.  **Deep Payload Inspection**: Every time data is sent to your API (via `req.body`, `query`, or `params`), it passes through the **Zod Validation Layer**.
3.  **The Trap**: Inside Zod, a custom `.refine()` rule runs the `SecurityValidator.scan()`. It looks for:
    *   💉 **SQL Injection** (`UNION SELECT`, `OR 1=1`)
    *   📜 **XSS Scripts** (`<script>`, `javascript:`)
    *   📂 **Path Traversal** (`../../etc/passwd`)
4.  **Reaction**: If a threat is detected:
    *   The request is **terminated** immediately (403 Forbidden).
    *   The user receives a generic "Security Policy Violation" message (Security by Obscurity).
    *   **Crucially**, the system logs the incident to `logs/security/threats-*.log` with the Attacker's IP, the malicious payload, and the threat type.

> This allows you to passively monitor who is trying to hack your application without risking your data.

---

## 🌍 Internationalization (i18n) Ready

Core-X is designed from the ground up to support multi-language applications without cluttering the backend with translation logic.

### The Strategy:
Instead of sending hardcoded text (which forces the backend to know the user's language), the API returns a **dual-layer response**:

1.  **The `slug` (Primary Layer)**:
    *   A stable, machine-readable string code (e.g., `"INVALID_CREDENTIALS"`).
    *   **Frontend Role**: The frontend receives this slug and uses it as a key to look up the correct translation from its own language files (e.g., `en.json`, `ar.json`).
    *   *Example*: `slug: "LOGIN_SUCCESS"` ➔ Frontend looks up key and displays "تم تسجيل الدخول بنجاح" (if Arabic is selected).

2.  **The `message` (Fallback Layer)**:
    *   A default English string provided by the server.
    *   **Purpose**: Acts as a safety net. If the frontend forgets to define a translation for a specific slug, or if a new error code is introduced, this message can be displayed directly to the user so they aren't left with an empty screen.

---

## 🤝 Contributing

This project is intended to be a community-driven starting point. Pull requests are welcome!

1.  Fork the Project
2.  Create your Feature Branch (`git checkout -b feature/AmazingFeature`)
3.  Commit your Changes (`git commit -m 'Add some AmazingFeature'`)
4.  Push to the Branch (`git push origin feature/AmazingFeature`)
5.  Open a Pull Request

---

## 📬 Contact

Have questions or want to collaborate? I'd love to hear from you!

- **linktr.ee**: [Connect with me](https://linktr.ee/Ym_zerotwo)

---

*Built with ❤️ for Developers by [Ymzerotwo]*