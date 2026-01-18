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
      }
    }
    return {
      isSafe: threats.length === 0,
      threats,
      riskScore,
      action: riskScore >= 75 ? 'BLOCK' : (riskScore >= 50 ? 'WARN' : 'ALLOW')
    };
  }

  static deepScan(obj) {
    let allThreats = [];
    let totalRisk = 0;
    const traverse = (value) => {
      if (typeof value === 'string') {
        const result = this.scan(value);
        if (!result.isSafe) {
          allThreats = [...allThreats, ...result.threats];
          totalRisk += result.riskScore;
        }
      } else if (typeof value === 'object' && value !== null) {
        Object.values(value).forEach(traverse);
      }
    };
    traverse(obj);
    return {
      hasThreats: allThreats.length > 0,
      threats: allThreats,
      totalRisk
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