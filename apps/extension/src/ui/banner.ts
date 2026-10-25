import type { Lang, RiskResult, Severity } from '@trustveil/shared';
import { explain, headline, levelLabel } from '@trustveil/engine';

export type DeepState = 'idle' | 'loading' | 'done' | 'error';

export interface BannerOptions {
  lang: Lang;
  deepState: DeepState;
  deepNote?: string;
  onDeepCheck: () => void;
  onDismiss: () => void;
  onLang: (lang: Lang) => void;
}

const HOST_ID = 'phishradar-host';
const MAX_REASONS = 6;

const COLORS: Record<Severity, string> = { high: '#b3261e', medium: '#b26a00', low: '#1e7a4f' };

const CSS = `
  :host { all: initial; }
  .card {
    position: fixed; top: 16px; right: 16px; width: min(400px, calc(100vw - 32px));
    box-sizing: border-box; z-index: 2147483647;
    background: #f6f7fb; color: #1f2d5c; border-radius: 10px; overflow: hidden;
    border: 1px solid #c9cfe6; box-shadow: 0 8px 30px rgba(31, 45, 92, 0.25);
    font: 14px/1.45 system-ui, "Segoe UI", Roboto, sans-serif;
    display: flex;
  }
  .rail { width: 8px; flex: none; background: var(--c); }
  .body { padding: 14px 16px 12px; flex: 1; min-width: 0; }
  .top { display: flex; align-items: baseline; justify-content: space-between; gap: 8px; }
  .level { font-size: 20px; font-weight: 700; color: var(--c); }
  .close { all: unset; cursor: pointer; padding: 2px 8px; font-size: 20px; line-height: 1; border-radius: 4px; color: #5b6784; }
  .headline { margin: 4px 0 10px; font-weight: 600; }
  ul { margin: 0 0 10px; padding-left: 18px; }
  li { margin: 4px 0; }
  li.more { list-style: none; margin-left: -18px; }
  .linkbtn { all: unset; cursor: pointer; color: #2a1b6b; text-decoration: underline; }
  .linkbtn:focus-visible { outline: 2px solid #2a1b6b; outline-offset: 2px; }
  .actions { display: flex; gap: 8px; align-items: center; flex-wrap: wrap; }
  button.act {
    font: inherit; font-weight: 600; cursor: pointer; padding: 7px 12px; border-radius: 6px;
    border: 1px solid #1f2d5c; background: #1f2d5c; color: #fff;
  }
  button.act:disabled { opacity: 0.7; cursor: default; }
  button.ghost { background: transparent; color: #1f2d5c; border-color: #b9c0dc; font-weight: 500; }
  button:focus-visible, .close:focus-visible { outline: 2px solid #2a1b6b; outline-offset: 2px; }
  .note { margin: 8px 0 0; font-size: 12px; color: #5b6784; }
  .note.err { color: #b3261e; }
  .compact .body { padding: 10px 14px; }
  .compact .headline { margin: 0; }
  @media (prefers-reduced-motion: no-preference) {
    .card { animation: slide 180ms ease-out; }
    @keyframes slide { from { transform: translateY(-8px); opacity: 0; } to { transform: none; opacity: 1; } }
  }
`;

const UI = {
  deep: {
    idle: { en: 'Deep Check', hinglish: 'Deep Check' },
    loading: { en: 'Checking the signup flow...', hinglish: 'Signup flow check ho raha hai...' },
    done: { en: 'Deep Check done', hinglish: 'Deep Check ho gaya' },
    error: { en: 'Try Deep Check again', hinglish: 'Deep Check dobara karein' }
  },
  privacy: {
    en: 'Deep Check sends only this page address, without the part after "?".',
    hinglish: 'Deep Check sirf is page ka address bhejta hai, "?" ke baad ka hissa nahi.'
  },
  more: { en: '+{n} more', hinglish: '+{n} aur' },
  less: { en: 'Show fewer', hinglish: 'Kam dikhayein' },
  close: { en: 'Close warning', hinglish: 'Warning band karein' },
  langBtn: { en: 'Hinglish', hinglish: 'English' }
} as const;

let shadow: ShadowRoot | null = null;
let hideTimer: number | undefined;
let expanded = false;

function el<K extends keyof HTMLElementTagNameMap>(tag: K, cls?: string, text?: string): HTMLElementTagNameMap[K] {
  const node = document.createElement(tag);
  if (cls) node.className = cls;
  if (text !== undefined) node.textContent = text; // always textContent: page-derived strings are never HTML
  return node;
}

function ensureRoot(): ShadowRoot {
  if (shadow && document.getElementById(HOST_ID)) return shadow;
  const host = document.createElement('div');
  host.id = HOST_ID;
  document.documentElement.appendChild(host);
  shadow = host.attachShadow({ mode: 'closed' }); // page scripts and CSS cannot reach inside
  return shadow;
}

export function removeBanner(): void {
  window.clearTimeout(hideTimer);
  document.getElementById(HOST_ID)?.remove();
  shadow = null;
  expanded = false;
}

export function renderBanner(result: RiskResult, opts: BannerOptions): void {
  window.clearTimeout(hideTimer);
  const root = ensureRoot();
  root.replaceChildren();

  const style = document.createElement('style');
  style.textContent = CSS;

  const compact = result.level === 'low';
  const card = el('div', compact ? 'card compact' : 'card');
  card.style.setProperty('--c', COLORS[result.level]);
  card.setAttribute('role', compact ? 'status' : 'alertdialog');
  card.setAttribute('aria-label', 'PhishRadar');

  card.append(el('div', 'rail'));
  const body = el('div', 'body');

  const top = el('div', 'top');
  top.append(el('span', 'level', levelLabel(result.level, opts.lang)));
  const close = el('button', 'close', '\u00d7');
  close.setAttribute('aria-label', UI.close[opts.lang]);
  close.addEventListener('click', opts.onDismiss);
  top.append(close);
  body.append(top);

  body.append(el('p', 'headline', headline(result.level, opts.lang)));

  if (!compact) {
    const list = el('ul');
    // Deep Check findings first (they show what happens after the click), then by weight.
    const visible = result.findings
      .filter((f) => f.weight > 0)
      .sort((a, b) => Number(b.source === 'deepcheck') - Number(a.source === 'deepcheck') || b.weight - a.weight);
    const shown = expanded ? visible : visible.slice(0, MAX_REASONS);
    for (const f of shown) list.append(el('li', undefined, explain(f, opts.lang)));

    if (visible.length > MAX_REASONS) {
      const label = expanded
        ? UI.less[opts.lang]
        : UI.more[opts.lang].replace('{n}', String(visible.length - MAX_REASONS));
      const toggle = el('button', 'linkbtn', label);
      toggle.addEventListener('click', () => {
        expanded = !expanded;
        renderBanner(result, opts);
      });
      const item = el('li', 'more');
      item.append(toggle);
      list.append(item);
    }
    body.append(list);

    const actions = el('div', 'actions');
    const deep = el('button', 'act', UI.deep[opts.deepState][opts.lang]);
    deep.disabled = opts.deepState === 'loading' || opts.deepState === 'done';
    deep.addEventListener('click', opts.onDeepCheck);
    actions.append(deep);

    const langBtn = el('button', 'act ghost', UI.langBtn[opts.lang]);
    langBtn.addEventListener('click', () => opts.onLang(opts.lang === 'en' ? 'hinglish' : 'en'));
    actions.append(langBtn);
    body.append(actions);

    if (opts.deepState === 'error' && opts.deepNote) {
      body.append(el('p', 'note err', opts.deepNote));
    } else if (opts.deepState === 'idle') {
      body.append(el('p', 'note', UI.privacy[opts.lang]));
    }
  }

  card.append(body);
  root.append(style, card);

  if (compact) hideTimer = window.setTimeout(removeBanner, 4000);
}
