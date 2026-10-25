import { test } from 'node:test';
import assert from 'node:assert/strict';
import { checkUrl } from '../src/sanitize';
import { analyzeAudit, parseAudit } from '../src/analyzer';
import { RateLimiter } from '../src/limits';

const open = { allowPrivate: false, allowedHosts: [] as string[] };

test('sanitizer strips query, hash and credentials', () => {
  const r = checkUrl('https://user:pw@shop.example.com/signup?email=a@b.com&token=1#frag', open);
  assert.deepEqual(r, { ok: true, url: 'https://shop.example.com/signup' });
});

test('sanitizer rejects non-http, private hosts, and bad input', () => {
  assert.equal(checkUrl('ftp://example.com', open).ok, false);
  assert.equal(checkUrl('javascript:alert(1)', open).ok, false);
  assert.equal(checkUrl('http://localhost:3000/x', open).ok, false);
  assert.equal(checkUrl('http://192.168.1.5/', open).ok, false);
  assert.equal(checkUrl(42, open).ok, false);
});

test('private hosts are allowed only when explicitly enabled (mock mode)', () => {
  assert.equal(checkUrl('http://localhost:5000/trial-scam.html', { ...open, allowPrivate: true }).ok, true);
});

test('allowlist is enforced including subdomains', () => {
  const o = { allowPrivate: false, allowedHosts: ['example.com'] };
  assert.equal(checkUrl('https://shop.example.com/', o).ok, true);
  assert.equal(checkUrl('https://evil.com/', o).ok, false);
});

test('analyzer turns an audit into the demo findings', () => {
  const findings = analyzeAudit({
    steps: [{ step: 1, charge: 'Rs 1' }, { step: 3, charge: 'Rs 999/month' }],
    recurring_charge: 'Rs 999/month',
    asks_for_card_before_trial: true,
    cancellation: 'Cancel link only inside the Terms page'
  });
  const ids = findings.map((f) => f.id);
  assert.ok(ids.includes('deep-recurring-charge'));
  assert.ok(ids.includes('deep-card-first'));
  assert.ok(ids.includes('deep-cancel-hidden'));
  const step = findings.find((f) => f.id === 'deep-step-charge');
  assert.equal(step?.message.en, 'Step 3 charges Rs 999/month.');
});

test('analyzer accepts JSON inside a string or fenced block', () => {
  assert.ok(parseAudit('```json\n{"recurring_charge":"Rs 499/month"}\n```'));
  assert.ok(parseAudit({ result: { recurring_charge: 'Rs 499/month' } }));
});

test('analyzer returns an inconclusive finding when the agent failed', () => {
  const f = analyzeAudit({ status: 'failure', reason: 'could not find signup' });
  assert.equal(f[0].id, 'deep-inconclusive');
  assert.equal(f[0].weight, 0);
});

test('rate limiter blocks after the max', () => {
  const l = new RateLimiter(2, 1000);
  assert.equal(l.allow('a', 0), true);
  assert.equal(l.allow('a', 1), true);
  assert.equal(l.allow('a', 2), false);
  assert.equal(l.allow('a', 2000), true);
});
