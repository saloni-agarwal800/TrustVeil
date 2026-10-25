import { stripUrl } from '@trustveil/shared';
import type { DeepCheckResponse } from '@trustveil/shared';
import type { DeepCheckMessage, DeepCheckReply } from './messages';
import { getSettings } from './storage';

// Deep Check is the ONLY thing that leaves the device, and only when the user presses the button.
async function deepCheck(rawUrl: string): Promise<DeepCheckReply> {
  const url = stripUrl(rawUrl); // remove ?query, #hash and credentials before sending
  if (!url) return { ok: false, error: 'This page cannot be checked.' };

  const { backendUrl } = await getSettings();
  try {
    const res = await fetch(`${backendUrl.replace(/\/$/, '')}/deep-check`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ url }),
      signal: AbortSignal.timeout(120_000)
    });
    const data = (await res.json()) as DeepCheckResponse & { error?: string };
    if (!res.ok) return { ok: false, error: data.error ?? `Server error (${res.status}).` };
    return { ok: true, findings: data.findings, mock: data.mock };
  } catch {
    return { ok: false, error: 'Could not reach the Deep Check server. Is the backend running?' };
  }
}

chrome.runtime.onMessage.addListener((msg: DeepCheckMessage, _sender, sendResponse) => {
  if (msg?.type === 'DEEP_CHECK') {
    deepCheck(msg.url).then(sendResponse);
    return true; // keep the channel open for the async reply
  }
  return false;
});
