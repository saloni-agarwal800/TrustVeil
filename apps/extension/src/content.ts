import type { Finding, Lang, RiskResult, Severity } from '@trustveil/shared';
import { analyze, mergeFindings, noopClassifier } from '@trustveil/engine';
import { extractSnapshot } from './extract';
import { renderBanner, removeBanner, type DeepState } from './ui/banner';
import { bumpStats, getSettings, saveSettings } from './storage';
import type { DeepCheckMessage, DeepCheckReply } from './messages';

const RANK: Record<Severity, number> = { low: 0, medium: 1, high: 2 };

let lang: Lang = 'en';
let showSafe = true;

let deepFindings: Finding[] = [];
let deepState: DeepState = 'idle';
let deepNote = '';

let current: RiskResult | null = null;
let dismissedRank = -1;
let lastKey = '';
let lastPage = '';
let counted = false;
let warnedCounted = false;

function pageId(): string {
  return location.origin + location.pathname;
}

function show(force = false): void {
  if (!current) return;
  const result = current;

  const key = [result.level, deepState, lang, result.findings.map((f) => f.id).join(',')].join('|');
  if (!force && key === lastKey) return;
  lastKey = key;

  if (RANK[result.level] <= dismissedRank) return; // user closed this level already
  if (result.level === 'low' && !showSafe) {
    removeBanner();
    return;
  }

  renderBanner(result, {
    lang,
    deepState,
    deepNote,
    onDeepCheck: runDeepCheck,
    onDismiss: () => {
      dismissedRank = RANK[result.level];
      removeBanner();
    },
    onLang: (next) => {
      lang = next;
      void saveSettings({ lang: next });
      show(true);
    }
  });
}

async function analyzePage(): Promise<void> {
  // New page in a single-page app: forget the old Deep Check.
  if (pageId() !== lastPage) {
    lastPage = pageId();
    deepFindings = [];
    deepState = 'idle';
    deepNote = '';
    dismissedRank = -1;
    lastKey = '';
  }

  const snapshot = extractSnapshot();
  let result = analyze(snapshot); // Layer 1: rules, milliseconds, fully local

  if (result.level !== 'low') {
    // Layer 2 hook: only suspicious pages go to the local classifier (no-op in the prototype).
    const ml = await noopClassifier.classify(snapshot.text);
    if (ml.length) result = mergeFindings(result.findings, ml);
  }
  if (deepFindings.length) result = mergeFindings(result.findings, deepFindings);

  current = result;

  const warn = result.level !== 'low';
  const scannedDelta = counted ? 0 : 1;
  const warnedDelta = warn && !warnedCounted ? 1 : 0;
  counted = true;
  if (warn) warnedCounted = true;
  if (scannedDelta || warnedDelta) void bumpStats(scannedDelta, warnedDelta);

  show();
}

async function runDeepCheck(): Promise<void> {
  deepState = 'loading';
  deepNote = '';
  show(true);

  const message: DeepCheckMessage = { type: 'DEEP_CHECK', url: location.href };
  let reply: DeepCheckReply | undefined;
  try {
    reply = (await chrome.runtime.sendMessage(message)) as DeepCheckReply | undefined;
  } catch {
    reply = undefined;
  }

  if (reply && reply.ok) {
    deepFindings = reply.findings;
    deepState = 'done';
  } else {
    deepState = 'error';
    deepNote = reply && !reply.ok ? reply.error : 'Deep Check could not start. Reload the page and try again.';
  }
  await analyzePage();
  show(true);
}

// Re-run (debounced) when popups or late content are added. Text-only changes (like a ticking timer) are ignored.
let timer: number | undefined;
function watchPage(): void {
  const observer = new MutationObserver((mutations) => {
    const addedElement = mutations.some((m) =>
      Array.from(m.addedNodes).some((n) => n.nodeType === Node.ELEMENT_NODE)
    );
    if (!addedElement) return;
    window.clearTimeout(timer);
    timer = window.setTimeout(() => void analyzePage(), 1200);
  });
  observer.observe(document.body, { childList: true, subtree: true });
}

async function init(): Promise<void> {
  const settings = await getSettings();
  lang = settings.lang;
  showSafe = settings.showSafe;

  chrome.storage.onChanged.addListener((changes) => {
    if (changes.settings?.newValue) {
      lang = changes.settings.newValue.lang ?? lang;
      showSafe = changes.settings.newValue.showSafe ?? showSafe;
      show(true);
    }
  });

  await analyzePage();
  if (document.body) watchPage();
}

void init();
