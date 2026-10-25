// The contract every part of TrustVeil talks through.
// Change this file only after telling the whole team.

export type Severity = 'low' | 'medium' | 'high';
export type Lang = 'en' | 'hinglish';

export interface LocalizedText {
  en: string;
  hinglish: string;
}

/** One reason a page looks risky. Layer 1, Layer 2 and Deep Check all produce this. */
export interface Finding {
  id: string; // e.g. "preticked-consent"
  source: 'rule' | 'ml' | 'deepcheck';
  severity: Severity;
  weight: number; // used by scoring
  message: LocalizedText;
  evidence?: string; // short text from the page (never rendered as HTML)
}

export interface ButtonInfo {
  text: string;
  width: number;
  height: number;
  fontSize: number;
  color: string; // computed text colour, e.g. "rgb(10, 10, 10)"
  bg: string; // effective background colour
}

export interface CheckboxInfo {
  label: string;
  checked: boolean;
}

/** What the content script reads from the live page. */
export interface PageSnapshot {
  url: string;
  hostname: string;
  title: string;
  isHttps: boolean;
  text: string;
  hasPasswordField: boolean;
  hasPaymentField: boolean;
  checkboxes: CheckboxInfo[];
  buttons: ButtonInfo[];
  timers: string[];
  fineprint: string[]; // text rendered very small or very faint
}

export interface RiskResult {
  level: Severity;
  score: number; // 0-100
  findings: Finding[];
}

export interface DeepCheckRequest {
  url: string;
}

export interface DeepCheckResponse {
  findings: Finding[];
  cached?: boolean;
  mock?: boolean;
}

export interface ApiError {
  error: string;
}

export { stripUrl } from './url';
