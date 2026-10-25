import type { PageSnapshot, RiskResult } from '@trustveil/shared';
import { defaultRules, LAYER1_CHECKS, type RulesConfig } from './rules';
import { scoreFindings } from './scoring';

/** Layer 1: run every rule against the snapshot and score the result. Runs in milliseconds. */
export function analyze(snapshot: PageSnapshot, rules: RulesConfig = defaultRules): RiskResult {
  const findings = LAYER1_CHECKS.flatMap((check) => check(snapshot, rules));
  return scoreFindings(findings, rules);
}
