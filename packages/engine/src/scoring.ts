import type { Finding, RiskResult, Severity } from '@trustveil/shared';
import { defaultRules, type RulesConfig } from './rules';

function dedupe(findings: Finding[]): Finding[] {
  const byId = new Map<string, Finding>();
  for (const f of findings) {
    const prev = byId.get(f.id);
    if (!prev || f.weight > prev.weight) byId.set(f.id, f);
  }
  return [...byId.values()];
}

/**
 * Merge findings into low / medium / high.
 * A single weak signal can never reach "high": high needs score >= threshold AND 2+ distinct findings.
 */
export function scoreFindings(findings: Finding[], rules: RulesConfig = defaultRules): RiskResult {
  const unique = dedupe(findings).sort((a, b) => b.weight - a.weight);
  const score = Math.min(100, unique.reduce((sum, f) => sum + f.weight, 0));
  const scoring = unique.filter((f) => f.weight > 0);

  let level: Severity = 'low';
  if (score >= rules.thresholds.medium) level = 'medium';
  if (score >= rules.thresholds.high && scoring.length >= 2) level = 'high';

  return { level, score, findings: unique };
}

/** Add Layer 2 / Deep Check findings to an existing list and re-score. */
export function mergeFindings(existing: Finding[], extra: Finding[], rules: RulesConfig = defaultRules): RiskResult {
  return scoreFindings([...existing, ...extra], rules);
}
