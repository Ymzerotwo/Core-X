import { SECURITY_PATTERNS, SEVERITY_LEVELS } from '../constants/securityPatterns.js';

export class SecurityValidator {
  /**
   * Scans input against known threat patterns
   * @param {String} input 
   * @returns Detection Result
   */
  static scan(input) {
    if (!input || typeof input !== 'string') return { isSafe: true, threats: [] };
    const threats = [];
    let riskScore = 0;
    for (const [key, config] of Object.entries(SECURITY_PATTERNS)) {
      if (config.pattern.test(input)) {
        const severityInfo = SEVERITY_LEVELS[config.severity];
        threats.push({
          type: key,
          severity: config.severity,
          desc: config.description
        });
        riskScore += severityInfo.score;
        break; // Stop checking other patterns if one is found
      }
    }
    return {
      isSafe: threats.length === 0,
      threats,
      riskScore,
      action: riskScore >= 75 ? 'BLOCK' : (riskScore >= 50 ? 'WARN' : 'ALLOW')
    };
  }

  static deepScan(obj, depth = 0, verified = new WeakSet()) {
    if (depth > 5) return { hasThreats: false, threats: [], totalRisk: 0 };
    if (!obj || typeof obj !== 'object') {
      if (typeof obj === 'string') {
        if (obj.length > 10000) { // Specify the expected text length
          return {
            hasThreats: true,
            threats: [{ type: 'PAYLOAD_TOO_LARGE', severity: 'HIGH', desc: 'Text too long (>10000 chars)' }],
            totalRisk: 75
          };
        }
        const result = this.scan(obj);
        return { hasThreats: !result.isSafe, threats: result.threats, totalRisk: result.riskScore };
      }
      return { hasThreats: false, threats: [], totalRisk: 0 };
    }

    if (verified.has(obj)) return { hasThreats: false, threats: [], totalRisk: 0 }; // Cycle detected
    verified.add(obj);

    for (const [key, value] of Object.entries(obj)) {
      const keyResult = this.scan(key);
      if (!keyResult.isSafe) {
        return {
          hasThreats: true,
          threats: keyResult.threats,
          totalRisk: keyResult.riskScore
        };
      }

      const valResult = this.deepScan(value, depth + 1, verified);
      if (valResult.hasThreats) {
        return valResult;
      }
    }

    return {
      hasThreats: false,
      threats: [],
      totalRisk: 0
    };
  }
}

/*
 * ==============================================================================
 * 🛡️ Security Validator Engine (by Ym_zerotwo)
 * ==============================================================================
 *
 * This utility serves as the core threat detection engine for the application.
 * It provides methods to scan strings and complex objects for malicious patterns
 * defined in the system's security rules.
 *
 * ⚙️ How it Works:
 * 1. String Scan (`scan`):
 *    - Iterates through `SECURITY_PATTERNS`.
 *    - Tests the input string against each regex pattern (SQLi, XSS, etc.).
 *    - **Immediate Exit**: Stops at the first match to maximize performance.
 *    - Calculates a `riskScore` based on the `SEVERITY_LEVELS` of the matched threat.
 *    - Determines an action (`BLOCK`, `WARN`, `ALLOW`) based on the score threshold (75+ blocks).
 *
 * 2. Deep Object Scan (`deepScan`):
 *    - Recursively traverses nested objects and arrays (up to depth 5).
 *    - Scans both **Keys** and **Values** to prevent prototype pollution or hidden payloads.
 *    - **DoS Protection**: Checks string length limit (10,000 chars) to prevent ReDoS or buffer overflow attacks.
 *    - **Cycle Detection**: Uses `WeakSet` to prevent infinite loops in circular references.
 *
 * 📂 External Dependencies:
 * - `../constants/securityPatterns.js`: Contains the regex definitions (`SECURITY_PATTERNS`) and scoring weights (`SEVERITY_LEVELS`).
 *
 * 🔒 Security Features:
 * - **Heuristic Scoring**: Doesn't just say "bad"; it quantifies the risk to allow nuanced decisions.
 * - **ReDoS Mitigation**: Implements string length caps to prevent regex denial of service.
 * - **Prototype Pollution Prevention**: Scans object keys to ensure no one tries to overwrite `__proto__`.
 *
 * 🚀 Usage:
 * - Direct: `const result = SecurityValidator.scan(userInput);`
 * - Via Middleware: Used implicitly by `validate.js` and `security.middleware.js`.
 */