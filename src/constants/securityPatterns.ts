export const SEVERITY_LEVELS = {
  CRITICAL: { score: 100, level: 'error', action: 'BLOCK' },
  HIGH: { score: 75, level: 'warn', action: 'BLOCK' },
  MEDIUM: { score: 50, level: 'info', action: 'WARN' },
  LOW: { score: 25, level: 'info', action: 'LOG' },
};


export const SECURITY_PATTERNS = {
  // ---------------------------------------------------------------------------
  // 1. SQL Injection (Classic & Blind)
  // ---------------------------------------------------------------------------
  SQL_INJECTION: {
    pattern: /(\b(SELECT|INSERT|UPDATE|DELETE|DROP|ALTER|CREATE|REPLACE)\b\s+([*(`'"]|FROM|INTO|TABLE|DATABASE|SET|VALUES))|(\b(UNION\s+SELECT|TRUNCATE\s+TABLE|EXEC(\s|\()|GRANT\s+\w+\s+TO|REVOKE\s+\w+\s+FROM)\b)/i,
    severity: 'CRITICAL',
    description: 'SQL Injection Attempt (Standard Keywords)',
  },
  SQL_BLIND: {
    pattern: /\b(WAITFOR\s+DELAY|BENCHMARK\(|SLEEP\(|PG_SLEEP\(|GENERATE_SERIES\()/i,
    severity: 'CRITICAL',
    description: 'Blind/Time-based SQL Injection Attempt',
  },
  SQL_LOGIC: {
    pattern: /(\b(OR|AND)\b\s+['"]?(\d+|\w+)['"]?\s*=\s*['"]?\3['"]?)/i,
    severity: 'HIGH',
    description: 'Logic Manipulation SQL Injection (OR 1=1)',
  },

  // ---------------------------------------------------------------------------
  // 2. XSS (Cross-Site Scripting) - Expanded
  // ---------------------------------------------------------------------------
  XSS_SCRIPT: {
    pattern: /<script[^>]*>[\s\S]*?<\/script>/gi,
    severity: 'CRITICAL',
    description: 'XSS Attack (Script Tag)',
  },
  XSS_EVENTS: {
    pattern: /\b(on(error|load|click|mouseover|mouseout|keydown|keyup|submit|change|focus|blur))\s*=\s*['"]/gi,
    severity: 'HIGH',
    description: 'XSS Attack (Event Handlers)',
  },
  XSS_VECTORS: {
    pattern: /(javascript:|vbscript:|data:text\/html|base64)/gi,
    severity: 'CRITICAL',
    description: 'XSS Attack (Protocol/Data URI)',
  },
  XSS_HTML_TAGS: {
    pattern: /<(iframe|object|embed|svg|applet|meta|link)[^>]*>/gi,
    severity: 'HIGH',
    description: 'XSS Attack (Dangerous HTML Tags)',
  },

  // ---------------------------------------------------------------------------
  // 3. Node.js Specific Attacks (Important!)
  // ---------------------------------------------------------------------------
  PROTOTYPE_POLLUTION: {
    pattern: /"(__proto__|constructor|prototype)"\s*:/g,
    severity: 'CRITICAL',
    description: 'Node.js Prototype Pollution Attempt',
  },

  // ---------------------------------------------------------------------------
  // 4. Command Injection (OS Level)
  // ---------------------------------------------------------------------------
  COMMAND_INJECTION: {
    // Removed common chars like > < | ; unless strictly needed context.
    // Focusing on explicit shell usage or sequences
    pattern: /(\$\(|`|\|\||&&|\/bin\/sh|\/bin\/bash|cmd\.exe|powershell)/g,
    severity: 'CRITICAL',
    description: 'OS Command Injection Attempt',
  },

  // ---------------------------------------------------------------------------
  // 5. Path Traversal (LFI/RFI)
  // ---------------------------------------------------------------------------
  PATH_TRAVERSAL: {
    pattern: /(\.\.\/|\.\.\\|%2e%2e%2f|%2e%2e%5c|\/etc\/passwd|\/windows\/win.ini)/i,
    severity: 'CRITICAL',
    description: 'Path Traversal / LFI Attempt',
  },

  // ---------------------------------------------------------------------------
  // 6. NoSQL Injection (For JSONB in Postgres or MongoDB)
  // ---------------------------------------------------------------------------
  NOSQL_INJECTION: {
    pattern: /"(\$where|\$ne|\$gt|\$lt|\$or|\$in|\$regex)"\s*:/g,
    severity: 'HIGH',
    description: 'NoSQL Injection Attempt',
  },

  // ---------------------------------------------------------------------------
  // 7. XML External Entity (XXE)
  // ---------------------------------------------------------------------------
  XXE_INJECTION: {
    pattern: /(\.\.\/|\.\.\\|%2e%2e%2f|\/etc\/passwd|\/windows\/win\.ini)/i,
    severity: 'HIGH',
    description: 'XML External Entity (XXE) Attempt',
  },

  // ---------------------------------------------------------------------------
  // 8. Suspicious Clients & Reconnaissance
  // ---------------------------------------------------------------------------
  SUSPICIOUS_UA: {
    pattern: /(sqlmap|nikto|nmap|masscan|burp|metasploit|nessus|acunetix|havij|netsparker)/i,
    severity: 'HIGH',
    description: 'Security Scanning Tool Detected',
  },
  BAD_BOTS: {
    pattern: /(libwww-perl|python-requests|curl|wget|python-urllib)/i,
    severity: 'LOW',
    description: 'Suspicious Bot/Script Detected',
  }
};

/*
 * ==============================================================================
 * 🛡️ Security Patterns Dictionary (by Ym_zerotwo)
 * ==============================================================================
 *
 * This file contains the Regular Expressions (Regex) and Severity Definitions used
 * by the `SecurityValidator` to identify malicious payloads.
 *
 * ⚙️ How it Works:
 * 1. `SEVERITY_LEVELS`: Defines the weight of each threat.
 *    - CRITICAL (100): Immediate Block.
 *    - HIGH (75): Immediate Block.
 *    - MEDIUM (50): Warn/Log (unless combined with others).
 * 2. `SECURITY_PATTERNS`: A dictionary of RegEx patterns for common attack vectors.
 *    - Each entry contains the raw regex, the severity, and a human-readable description.
 *
 * 🔒 Detection Scope:
 * - **SQL Injection**: Covers standard (`UNION SELECT`), blind (`SLEEP`), and logic-based (`OR 1=1`) attacks.
 * - **XSS**: Detects scripts tags, event handlers (`onload`), and dangerous protocols (`javascript:`).
 * - **Cmd Injection**: Looks for shell operators (`&&`, `|`) and binary calls (`/bin/sh`).
 * - **NoSQL Injection**: specific for Mongo/JSONB (`$where`, `$ne`).
 * - **Platform Attacks**: Node.js specific Prototype Pollution (`__proto__`).
 *
 * 🚀 Usage:
 * - Imported by `src/utils/securityValidator.js` to fuel the scanning engine.
 */