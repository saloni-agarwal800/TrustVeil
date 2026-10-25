import type { Finding } from '@trustveil/shared';
import { makeFinding } from '@trustveil/engine';

interface AuditStep {
  step?: number;
  description?: string;
  charge?: string;
}

export interface Audit {
  steps?: AuditStep[];
  recurring_charge?: string;
  asks_for_card_before_trial?: boolean;
  auto_renews?: boolean;
  cancellation?: string;
  hidden_fees?: string[];
}

/** The agent should return JSON, but be forgiving: string, fenced string, or wrapped object. */
export function parseAudit(raw: unknown): Audit | null {
  let v: unknown = raw;
  if (typeof v === 'string') {
    const cleaned = v.replace(/```json|```/gi, '').trim();
    try {
      v = JSON.parse(cleaned);
    } catch {
      const m = cleaned.match(/\{[\s\S]*\}/);
      if (!m) return null;
      try {
        v = JSON.parse(m[0]);
      } catch {
        return null;
      }
    }
  }
  if (!v || typeof v !== 'object') return null;
  const obj = v as Record<string, unknown>;
  for (const key of ['result', 'data', 'audit']) {
    if (obj[key] && typeof obj[key] === 'object') return parseAudit(obj[key]);
  }
  if (obj.status === 'failure') return null;
  return obj as Audit;
}

const str = (x: unknown) => (typeof x === 'string' ? x.trim() : '');
const firstNumber = (s: string) => {
  const m = s.replace(/,/g, '').match(/\d+(?:\.\d+)?/);
  return m ? parseFloat(m[0]) : 0;
};
const HARD_CANCEL = /not found|hidden|only in|terms|fine print|email|call|phone|support|difficult|no way/i;

/** Turn the agent's audit into the same Finding format the local engine uses. */
export function analyzeAudit(raw: unknown): Finding[] {
  const audit = parseAudit(raw);
  if (!audit) return [makeFinding('deep-inconclusive', {}, undefined, 'deepcheck')];

  const out: Finding[] = [];

  const recurring = str(audit.recurring_charge);
  if (recurring) {
    out.push(makeFinding('deep-recurring-charge', { detail: recurring }, recurring, 'deepcheck'));
  }

  const steps = Array.isArray(audit.steps) ? audit.steps : [];
  const charged = steps
    .map((s, i) => ({ n: s.step ?? i + 1, charge: str(s.charge) }))
    .filter((s) => s.charge && firstNumber(s.charge) > 0);
  if (charged.length) {
    const worst = charged.reduce((a, b) => (firstNumber(b.charge) > firstNumber(a.charge) ? b : a));
    out.push(makeFinding('deep-step-charge', { n: worst.n, amount: worst.charge }, worst.charge, 'deepcheck'));
  }

  if (audit.asks_for_card_before_trial === true) {
    out.push(makeFinding('deep-card-first', {}, undefined, 'deepcheck'));
  }

  const cancel = str(audit.cancellation);
  if (cancel && HARD_CANCEL.test(cancel)) {
    out.push(makeFinding('deep-cancel-hidden', { detail: cancel }, cancel, 'deepcheck'));
  }

  const fees = Array.isArray(audit.hidden_fees) ? audit.hidden_fees.map(str).filter(Boolean) : [];
  if (fees.length) {
    out.push(makeFinding('deep-hidden-fees', { detail: fees.join('; ') }, fees[0], 'deepcheck'));
  }

  return out;
}
