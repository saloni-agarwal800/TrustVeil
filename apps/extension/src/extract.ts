import type { ButtonInfo, CheckboxInfo, PageSnapshot } from '@trustveil/shared';

const MAX_TEXT = 20_000;

/** Walk up the tree until we find a visible background colour. */
function effectiveBg(el: Element): string {
  let cur: Element | null = el;
  while (cur) {
    const bg = getComputedStyle(cur).backgroundColor;
    const m = bg.match(/rgba?\(([^)]+)\)/);
    if (m) {
      const parts = m[1].split(/[,\s/]+/).filter(Boolean);
      const alpha = parts.length >= 4 ? parseFloat(parts[3]) : 1;
      if (alpha > 0.05) return bg;
    }
    cur = cur.parentElement;
  }
  return 'rgb(255, 255, 255)';
}

function collectButtons(): ButtonInfo[] {
  const nodes = document.querySelectorAll<HTMLElement>(
    'button, input[type="button"], input[type="submit"], [role="button"], a[class*="btn"], a[class*="button"]'
  );
  const out: ButtonInfo[] = [];
  for (const el of Array.from(nodes).slice(0, 60)) {
    const rect = el.getBoundingClientRect();
    if (rect.width < 1 || rect.height < 1) continue; // not rendered
    const text = (el.innerText || (el as HTMLInputElement).value || el.getAttribute('aria-label') || '').trim();
    if (!text) continue;
    const cs = getComputedStyle(el);
    out.push({
      text: text.slice(0, 80),
      width: Math.round(rect.width),
      height: Math.round(rect.height),
      fontSize: parseFloat(cs.fontSize) || 0,
      color: cs.color,
      bg: effectiveBg(el)
    });
  }
  return out;
}

function collectCheckboxes(): CheckboxInfo[] {
  const boxes = document.querySelectorAll<HTMLInputElement>('input[type="checkbox"]');
  return Array.from(boxes)
    .slice(0, 30)
    .map((el) => {
      const label =
        el.labels?.[0]?.innerText ||
        el.closest('label')?.innerText ||
        el.getAttribute('aria-label') ||
        el.parentElement?.innerText ||
        '';
      return { label: label.trim().slice(0, 200), checked: el.checked };
    });
}

function collectTimers(): string[] {
  const found = new Set<string>();
  const byName = document.querySelectorAll<HTMLElement>(
    '[class*="countdown" i], [id*="countdown" i], [class*="timer" i], [id*="timer" i]'
  );
  byName.forEach((el) => {
    const t = el.innerText?.trim();
    if (t && t.length <= 40 && /\d/.test(t)) found.add(t);
  });

  const clock = /^\d{1,2}:\d{2}(:\d{2})?$/;
  const leaves = document.querySelectorAll<HTMLElement>('span, div, strong, b, p, time');
  let scanned = 0;
  for (const el of Array.from(leaves)) {
    if (++scanned > 400) break;
    if (el.childElementCount === 0) {
      const t = el.textContent?.trim() ?? '';
      if (clock.test(t)) found.add(t);
    }
  }
  return Array.from(found).slice(0, 5);
}

/** Text that is rendered very small or very faint - a common place to hide billing terms. */
function collectFineprint(): string[] {
  const out: string[] = [];
  const nodes = document.querySelectorAll<HTMLElement>('p, span, small, div, li, label, a');
  let scanned = 0;
  for (const el of Array.from(nodes)) {
    if (++scanned > 1500 || out.length >= 10) break;
    if (el.childElementCount !== 0) continue;
    const text = el.textContent?.trim() ?? '';
    if (text.length < 20 || text.length > 500) continue;
    const cs = getComputedStyle(el);
    if (parseFloat(cs.fontSize) < 11 || parseFloat(cs.opacity) < 0.5) out.push(text.slice(0, 300));
  }
  return out;
}

export function extractSnapshot(): PageSnapshot {
  const { href, hostname, protocol } = window.location;
  return {
    url: href,
    hostname,
    title: document.title ?? '',
    isHttps: protocol === 'https:',
    text: (document.body?.innerText ?? '').slice(0, MAX_TEXT),
    hasPasswordField: !!document.querySelector('input[type="password"]'),
    hasPaymentField: !!document.querySelector(
      'input[autocomplete^="cc-"], input[name*="card" i], input[id*="card" i], input[name*="cvv" i], input[name*="cvc" i]'
    ),
    checkboxes: collectCheckboxes(),
    buttons: collectButtons(),
    timers: collectTimers(),
    fineprint: collectFineprint()
  };
}
