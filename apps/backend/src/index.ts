import 'dotenv/config';
import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { serve } from '@hono/node-server';
import type { DeepCheckResponse } from '@trustveil/shared';
import { checkUrl } from './sanitize';
import { runSignupAudit } from './tinyfish';
import { mockAudit } from './mock';
import { analyzeAudit } from './analyzer';
import { RateLimiter, TtlCache } from './limits';

const API_KEY = process.env.TINYFISH_API_KEY ?? '';
const MOCK = process.env.MOCK_TINYFISH === 'true' || !API_KEY;
const PORT = Number(process.env.PORT ?? 8787);
const ALLOWED_HOSTS = (process.env.ALLOWED_HOSTS ?? '')
  .split(',')
  .map((h) => h.trim().toLowerCase())
  .filter(Boolean);

const limiter = new RateLimiter(10, 60_000); // 10 Deep Checks per minute per client
const cache = new TtlCache<DeepCheckResponse>(10 * 60_000); // 10 minutes

const app = new Hono();
app.use('*', cors({ origin: '*' }));

app.get('/health', (c) => c.json({ ok: true, mock: MOCK }));

app.post('/deep-check', async (c) => {
  const client = c.req.header('x-forwarded-for') ?? 'local';
  if (!limiter.allow(client)) {
    return c.json({ error: 'Too many Deep Checks. Try again in a minute.' }, 429);
  }

  let body: { url?: unknown };
  try {
    body = await c.req.json();
  } catch {
    return c.json({ error: 'Send JSON like {"url":"https://example.com"}.' }, 400);
  }

  const checked = checkUrl(body?.url, { allowPrivate: MOCK, allowedHosts: ALLOWED_HOSTS });
  if (!checked.ok) return c.json({ error: checked.error }, 400);

  const cached = cache.get(checked.url);
  if (cached) return c.json({ ...cached, cached: true });

  try {
    const audit = MOCK ? await mockAudit(checked.url) : await runSignupAudit(checked.url, API_KEY);
    const response: DeepCheckResponse = { findings: analyzeAudit(audit), mock: MOCK };
    cache.set(checked.url, response);
    return c.json(response);
  } catch (err) {
    console.error('[deep-check] failed:', err instanceof Error ? err.message : err);
    return c.json({ error: 'Deep Check could not finish. Try again in a moment.' }, 502);
  }
});

serve({ fetch: app.fetch, port: PORT }, () => {
  console.log(`TrustVeil backend on http://localhost:${PORT}  (${MOCK ? 'MOCK mode, no TinyFish call' : 'live TinyFish'})`);
});
