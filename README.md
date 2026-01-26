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

*   **Runtime**: Node.js (TypeScript)
*   **Framework**: Express.js
*   **Database & Auth**: Supabase (PostgreSQL)
*   **Validation**: Zod
*   **Security**: Helmet, HPP, CSURF (Custom Implementation), Express-Rate-Limit
*   **Logging**: Winston & Winston-Daily-Rotate-File

---

## 📂 Project Structure

```bash
core-x/
├── data/
│   └── requests.json
├── dist/               # Compiled JavaScript (Production)
├── logs/
├── public/
│   ├── css/
│   │   └── stats.css
│   └── js/
│       └── stats.js
├── src/
│   ├── config/
│   │   ├── logger.ts
│   │   └── supabase.ts
│   ├── constants/
│   │   ├── responseCodes.ts
│   │   ├── securityPatterns.ts
│   │   └── validationMessages.ts
│   ├── controllers/
│   │   ├── admin/
│   │   │   ├── admin.controller.ts
│   │   │   └── banning.controller.ts
│   │   └── stats/
│   │       ├── req.controller.ts
│   │       └── stats.controller.ts
│   ├── db/
│   │   └── supabase_banning.sql
│   ├── middleware/
│   │   ├── auth.middleware.ts
│   │   ├── ban.middleware.ts
│   │   ├── csrf.middleware.ts
│   │   ├── ip.middleware.ts
│   │   ├── security.middleware.ts
│   │   ├── stats.middleware.ts
│   │   └── validate.ts
│   ├── routes/
│   │   ├── admin/
│   │   │   └── admin.routes.ts
│   │   └── state/
│   │       └── state.routes.ts
│   ├── services/
│   │   ├── banning.service.ts
│   │   └── requests.service.ts
│   ├── types/
│   │   └── express.d.ts
│   ├── utils/
│   │   ├── responseHandler.ts
│   │   └── securityValidator.ts
│   ├── validations/
│   │   └── common.ts
│   ├── views/
│   │   ├── admin/
│   │   │   └── banning.view.ts
│   │   └── stats.view.ts
│   ├── app.ts
│   └── server.ts
├── tests/              # (Coming Soon)
├── .env
├── .env.example
├── .gitignore
├── index.ts
├── LICENSE
├── package-lock.json
├── package.json
├── tsconfig.json
└── README.md
```

---

## 📊 System Monitoring

Core-X includes a built-in system monitoring dashboard that provides real-time insights into server performance and health.

### Features
- **CPU Usage**: Real-time processor utilization percentage
- **Memory (RAM)**: System and application memory usage with detailed breakdowns
- **Disk Usage**: Filesystem storage statistics with available space calculations
- **Uptime**: Node.js process uptime since server startup
- **Auto-Refresh**: Optimized polling with disk stats cached to prevent I/O wear

### Endpoints
- `GET /state/server-state` - Full system statistics (includes disk, CPU, RAM, uptime)
- `GET /state/server-state/realtime` - Lightweight realtime stats (CPU, RAM, uptime only)

### Frontend Integration
The monitoring dashboard is accessible at `/` and automatically fetches stats on load. Disk statistics are retrieved once on page load, while CPU, RAM, and uptime update every second for responsive monitoring.

### Configuration
No additional configuration required - monitoring is enabled by default with IP-based access control.

---

## 🚀 Getting Started

### 1. Prerequisites
*   Node.js (v18 or higher)
*   Supabase Account (for URL and Keys)

### 2. Installation
Clone the repository and install dependencies:

```bash
git clone https://github.com/Ymzerotwo/core-x.git
cd core-x
npm install
```

### 3. Configuration
Create a `.env` file in the root directory:

```env
PORT=5000 

# =============================================================================
# 🪵 Logger Configuration
# =============================================================================
NODE_ENV=development # development | production
SERVICE_NAME=Core-X-Backend
LOG_LEVEL=debug # debug | http | info | warn | error
ENABLE_CONSOLE_LOGS=false # Force console logs in production if true

# =============================================================================
# ⚡ Supabase Configuration
# =============================================================================
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
SUPABASE_ANON_KEY=your-anon-key # Optional for backend, but good to have
TEST_SUPABASE_ON_START=true

# =============================================================================
# 🔐 Security Configuration
# =============================================================================
# Generate a strong secret by running this in terminal: 
# node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
COOKIE_SECRET=super_secure_random_string_at_least_32_chars
# SUPABASE_JWT_SECRET=your-jwt-secret (Optional for Local Verification)
# SUPABASE_JWT_SECRET=your-jwt-secret (Optional for Local Verification)
CORS_ORIGINS=http://localhost:3000,http://localhost:5173

# =============================================================================
# 🚀 Cluster Configuration
# =============================================================================
WORKERS_COUNT=full # 'full' for all cores, or specific number (e.g. 2)
ALLOWED_IPS=127.0.0.1,::1,::ffff:127.0.0.1
```

### 4. Development & Production

Core-X is built with **TypeScript** for robustness but runs as **JavaScript** in production.

#### Development Mode (TypeScript)
Runs the project directly using `tsx` with hot reload.
```bash
npm run dev
```

#### Production Build (Generate JavaScript)
To generate the production-ready JavaScript version:
1.  **Compile**: Run the build script to transpile TS to JS in the `dist/` folder.
    ```bash
    npm run build
    ```
2.  **Run**: Start the optimized production server (Cluster Mode support).
    ```bash
    npm start
    ```
    > Note: This runs `node dist/index.js`. Ensure you have built the project first!

---

## 🔌 Frontend Integration Guide

Since Core-X uses **stateless CSRF protection**, your frontend client (React, Vue, etc.) must include the CSRF token in the headers of mutative requests (POST, PUT, DELETE).

### Using Axios?
It's handled automatically if configured correctly:

```javascript
import axios from 'axios';

const api = axios.create({
  baseURL: 'http://localhost:5000',
  withCredentials: true, // IMPORTANT: Allows cookies to be sent/received
  xsrfCookieName: 'csrf_token', // The name of the cookie sent by Core-X
  xsrfHeaderName: 'X-CSRF-Token', // The header Core-X expects
});

export default api;
```

### How the handshake works:
1.  On the first visit, make a GET request (e.g., to `/api/health` or `/auth/me`).
2.  **Core-X** will set the `csrf_token` cookie.
3.  **Axios** reads this cookie and attaches it to the `X-CSRF-Token` header for all subsequent requests.

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
> **⚠️ Important Note on Clustering & Rate Limiting:**
> Currently, the project is configured to use a single worker process (`WORKERS_COUNT=1`) by default in `.env`. This ensures that the in-memory Rate Limiting works accurately and strictly.
> If you wish to use multi-core Clustering (`WORKERS_COUNT=full`) in production, you **MUST** integrate **Redis** to share the rate limit state across all worker processes. Native Redis support is planned to be integrated into this project in future updates.

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
