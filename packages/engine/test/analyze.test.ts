import { test } from 'node:test';
import assert from 'node:assert/strict';
import { analyze, mergeFindings, makeFinding } from '../src';
import { safePage, scamTrialPage, fakeBankPage } from './fixtures';

const ids = (r: ReturnType<typeof analyze>) => r.findings.map((f) => f.id);

test('safe page has no findings and is low risk', () => {
  const r = analyze(safePage);
  assert.equal(r.level, 'low');
  assert.equal(r.findings.length, 0);
});

test('scam trial page is high risk with the expected reasons', () => {
  const r = analyze(scamTrialPage);
  assert.equal(r.level, 'high');
  for (const id of ['preticked-consent', 'tiny-decline-button', 'countdown-timer', 'urgency-language', 'price-trap', 'hidden-fineprint']) {
    assert.ok(ids(r).includes(id), `missing ${id}`);
  }
});

test('fake bank page: lookalike domain, no https and brand mismatch', () => {
  const r = analyze(fakeBankPage);
  assert.equal(r.level, 'high');
  for (const id of ['lookalike-domain', 'no-https-sensitive', 'brand-mismatch']) {
    assert.ok(ids(r).includes(id), `missing ${id}`);
  }
});

test('official domain is not flagged as lookalike', () => {
  const r = analyze({ ...fakeBankPage, url: 'https://www.sbi.co.in/', hostname: 'www.sbi.co.in', isHttps: true });
  assert.equal(r.level, 'low');
});

test('a single weak signal can never reach high', () => {
  const r = analyze({ ...safePage, timers: ['01:00'] });
  assert.equal(r.level, 'low'); // 15 < medium threshold
  const lone = analyze({ ...safePage, hostname: 'sbi-secure-login.com', url: 'https://sbi-secure-login.com/' });
  assert.notEqual(lone.level, 'high'); // lookalike alone = 40 -> medium
});

test('Hinglish urgency phrases are detected', () => {
  const r = analyze({ ...safePage, text: 'Sirf aaj! Jaldi karo, offer khatam hone wala hai.' });
  assert.ok(ids(r).includes('urgency-language'));
});

test('merging a Deep Check finding raises a medium page to high', () => {
  const before = analyze({ ...safePage, text: 'Last chance! Hurry, offer ends soon.', timers: ['05:00'] });
  assert.equal(before.level, 'medium');
  const deep = [makeFinding('deep-step-charge', { n: 3, amount: 'Rs 999/month' }, undefined, 'deepcheck')];
  const after = mergeFindings(before.findings, deep);
  assert.equal(after.level, 'high');
  assert.equal(after.findings.find((f) => f.id === 'deep-step-charge')?.message.en, 'Step 3 charges Rs 999/month.');
});

test('merging the same finding twice does not double count', () => {
  const f = makeFinding('countdown-timer');
  const r = mergeFindings([f], [f]);
  assert.equal(r.findings.length, 1);
  assert.equal(r.score, f.weight);
});
