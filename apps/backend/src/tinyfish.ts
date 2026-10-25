/**
 * TinyFish Agent client. The API key lives ONLY here, on the server.
 * Docs: https://docs.tinyfish.ai  (sync endpoint: POST /v1/automation/run, header X-API-Key)
 */
const ENDPOINT = process.env.TINYFISH_ENDPOINT ?? 'https://agent.tinyfish.ai/v1/automation/run';
const TIMEOUT_MS = 110_000;

export const AUDIT_GOAL = [
  'You are auditing a website for deceptive subscription or payment practices.',
  'Starting from this page, follow the signup or free-trial flow step by step.',
  "Use only obviously fake placeholder details (name 'Test User', email 'test@example.com').",
  'NEVER enter real card, UPI or bank details, and STOP before any payment is submitted.',
  'At every step, note any price or charge shown.',
  'Also open any linked Terms, Refund or Cancellation page and note how a user can cancel.',
  'Return ONLY valid JSON in exactly this shape:',
  '{"steps":[{"step":1,"description":"what happens","charge":"e.g. Rs 1 now, or empty string"}],',
  '"recurring_charge":"e.g. Rs 999/month, or empty string if none",',
  '"asks_for_card_before_trial":true,',
  '"auto_renews":true,',
  '"cancellation":"where or how cancelling is possible, or not found",',
  '"hidden_fees":["any extra fee shown late"]}'
].join(' ');

export async function runSignupAudit(url: string, apiKey: string): Promise<unknown> {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), TIMEOUT_MS);
  try {
    const res = await fetch(ENDPOINT, {
      method: 'POST',
      headers: { 'X-API-Key': apiKey, 'Content-Type': 'application/json' },
      body: JSON.stringify({ url, goal: AUDIT_GOAL }),
      signal: ctrl.signal
    });
    if (!res.ok) throw new Error(`TinyFish responded with HTTP ${res.status}`);

    const run = (await res.json()) as { status?: string; result?: unknown };
    if (run.status && run.status !== 'COMPLETED') {
      throw new Error(`TinyFish run ended as ${run.status}`);
    }
    return run.result;
  } finally {
    clearTimeout(timer);
  }
}
