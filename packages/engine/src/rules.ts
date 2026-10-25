import type { Finding, PageSnapshot, Severity } from '@trustveil/shared';
import rulesJson from './rules.json';
import { message } from './messages';

export interface BrandRule {
  name: string;
  names: string[];
  tokens: string[];
  officialDomains: string[];
}

export interface RulesConfig {
  thresholds: { medium: number; high: number };
  checks: Record<string, { weight: number; severity: Severity }>;
  urgency: { en: string[]; hinglish: string[] };
  subscriptionWords: string[];
  recurringWords: string[];
  fineprintWords: string[];
  acceptWords: string[];
  declineWords: string[];
  button: { minDeclineAreaRatio: number; minContrast: number; minFontPx: number };
  price: { trialMax: number; recurringMin: number };
  brands: BrandRule[];
}

export const defaultRules = rulesJson as unknown as RulesConfig;

type Vars = Record<string, string | number>;

/** Build a Finding using the weight/severity configured in rules.json. */
export function makeFinding(
  id: string,
  vars: Vars = {},
  evidence?: string,
  source: Finding['source'] = 'rule',
  rules: RulesConfig = defaultRules,
  overrideWeight?: number
): Finding {
  const cfg = rules.checks[id] ?? { weight: 10, severity: 'low' as Severity };
  return {
    id,
    source,
    severity: cfg.severity,
    weight: overrideWeight ?? cfg.weight,
    message: message(id, vars),
    evidence: evidence ? evidence.slice(0, 160) : undefined
  };
}

const lc = (s: string) => s.toLowerCase();
const hits = (text: string, list: string[]) => list.filter((p) => text.includes(p));

// ---------- colour helpers ----------
type RGB = [number, number, number];

function parseRgb(c: string): RGB | null {
  const m = c.match(/rgba?\(\s*(\d+)[,\s]+(\d+)[,\s]+(\d+)/i);
  return m ? [Number(m[1]), Number(m[2]), Number(m[3])] : null;
}

function luminance([r, g, b]: RGB): number {
  const f = (v: number) => {
    const x = v / 255;
    return x <= 0.03928 ? x / 12.92 : Math.pow((x + 0.055) / 1.055, 2.4);
  };
  return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b);
}

export function contrastRatio(a: RGB, b: RGB): number {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
}

// ---------- DOM checks ----------
function checkPreticked(s: PageSnapshot, r: RulesConfig): Finding[] {
  const bad = s.checkboxes.find((c) => c.checked && hits(lc(c.label), r.subscriptionWords).length > 0);
  return bad ? [makeFinding('preticked-consent', {}, bad.label, 'rule', r)] : [];
}

function checkDeclineButtons(s: PageSnapshot, r: RulesConfig): Finding[] {
  const isDecline = (t: string) => hits(lc(t), r.declineWords).length > 0;
  const accepts = s.buttons.filter((b) => !isDecline(b.text) && hits(lc(b.text), r.acceptWords).length > 0);
  const declines = s.buttons.filter((b) => isDecline(b.text));
  if (!accepts.length || !declines.length) return [];

  const area = (b: { width: number; height: number }) => b.width * b.height;
  const biggest = accepts.reduce((a, b) => (area(b) > area(a) ? b : a));

  for (const d of declines) {
    const ratio = area(d) / Math.max(1, area(biggest));
    const fg = parseRgb(d.color);
    const bg = parseRgb(d.bg);
    const contrast = fg && bg ? contrastRatio(fg, bg) : 21;

    if (ratio < r.button.minDeclineAreaRatio) {
      return [makeFinding('tiny-decline-button', {}, `"${d.text}" is ${Math.round(ratio * 100)}% the size of the accept button`, 'rule', r)];
    }
    if (contrast < r.button.minContrast) {
      return [makeFinding('tiny-decline-button', {}, `"${d.text}" has low contrast (${contrast.toFixed(1)}:1)`, 'rule', r)];
    }
    if (d.fontSize < r.button.minFontPx) {
      return [makeFinding('tiny-decline-button', {}, `"${d.text}" text is only ${d.fontSize}px`, 'rule', r)];
    }
  }
  return [];
}

function checkTimers(s: PageSnapshot, r: RulesConfig): Finding[] {
  return s.timers.length ? [makeFinding('countdown-timer', {}, s.timers[0], 'rule', r)] : [];
}

// ---------- text checks ----------
function checkUrgency(s: PageSnapshot, r: RulesConfig): Finding[] {
  const t = lc(s.text);
  const found = [...hits(t, r.urgency.en), ...hits(t, r.urgency.hinglish)];
  if (!found.length) return [];
  const base = r.checks['urgency-language']?.weight ?? 15;
  const weight = found.length >= 3 ? base + 10 : base;
  const phrases = found.slice(0, 3).join('", "');
  return [makeFinding('urgency-language', { phrases }, found.join(', '), 'rule', r, weight)];
}

function checkPriceTrap(s: PageSnapshot, r: RulesConfig): Finding[] {
  const t = lc(s.text);
  const amounts = [...t.matchAll(/(?:₹|\b(?:rs\.?|inr))\s?(\d[\d,]*(?:\.\d+)?)/g)]
    .map((m) => parseFloat(m[1].replace(/,/g, '')))
    .filter((n) => Number.isFinite(n));
  if (amounts.length < 2) return [];
  const low = Math.min(...amounts);
  const high = Math.max(...amounts);
  const recurring = hits(t, r.recurringWords).length > 0;
  if (low <= r.price.trialMax && high >= r.price.recurringMin && recurring) {
    return [makeFinding('price-trap', { low, high }, `Rs ${low} -> Rs ${high}`, 'rule', r)];
  }
  return [];
}

function checkFineprint(s: PageSnapshot, r: RulesConfig): Finding[] {
  const hit = s.fineprint.find((f) => hits(lc(f), r.fineprintWords).length > 0);
  return hit ? [makeFinding('hidden-fineprint', {}, hit, 'rule', r)] : [];
}

// ---------- URL checks ----------
function hostMatches(host: string, domain: string): boolean {
  return host === domain || host.endsWith('.' + domain);
}

const normalise = (x: string) =>
  x.replace(/0/g, 'o').replace(/1/g, 'l').replace(/3/g, 'e').replace(/5/g, 's').replace(/rn/g, 'm').replace(/vv/g, 'w');

const escapeRe = (x: string) => x.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

function checkUrlAndBrand(s: PageSnapshot, r: RulesConfig): Finding[] {
  const out: Finding[] = [];
  const host = s.hostname.toLowerCase().replace(/^www\./, '');
  const parts = host.split(/[.\-]/);
  const sensitive = s.hasPasswordField || s.hasPaymentField;

  if (!s.isHttps && sensitive) {
    out.push(makeFinding('no-https-sensitive', {}, host, 'rule', r));
  }
  if (host.includes('xn--')) {
    out.push(makeFinding('punycode-domain', {}, host, 'rule', r));
  }

  const pageText = lc(`${s.title} ${s.text.slice(0, 3000)}`);
  for (const b of r.brands) {
    if (b.officialDomains.some((d) => hostMatches(host, d))) continue;

    const lookalike = parts.some((p) => {
      const n = normalise(p);
      return b.tokens.some((t) => n === t || (t.length >= 5 && n.includes(t)));
    });
    if (lookalike) {
      out.push(makeFinding('lookalike-domain', { brand: b.name }, host, 'rule', r));
    }

    const mentionsBrand = b.names.some((n) => new RegExp(`\\b${escapeRe(n)}\\b`).test(pageText));
    if (mentionsBrand && sensitive) {
      out.push(makeFinding('brand-mismatch', { brand: b.name }, host, 'rule', r));
    }
  }
  return out;
}

export const LAYER1_CHECKS: Array<(s: PageSnapshot, r: RulesConfig) => Finding[]> = [
  checkPreticked,
  checkDeclineButtons,
  checkTimers,
  checkUrgency,
  checkPriceTrap,
  checkFineprint,
  checkUrlAndBrand
];
