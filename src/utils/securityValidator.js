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
 * This utility provides the core logic for detecting malicious payloads.
 *
 * 🧠 Core Features:
 * 1. Pattern Matching: Uses regex from `securityPatterns.js` to identify threats.
 * 2. Scoring System: Calculates a risk score based on severity (Critical/High).
 * 3. Deep Scanning: Recursively analyzes complex JSON objects to find hidden threats
 *    nested deep within the request body.
 *
 * 🚦 Decision Making:
 * - High Risk Score (>= 75) -> Recommends BLOCK.
 * - Medium Risk -> Recommends WARN.
 *
 */