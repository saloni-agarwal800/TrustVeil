import { stripUrl } from '@trustveil/shared';

export type UrlCheck = { ok: true; url: string } | { ok: false; error: string };

const PRIVATE_HOSTS = [
  /^localhost$/,
  /^127\./,
  /^10\./,
  /^192\.168\./,
  /^172\.(1[6-9]|2\d|3[01])\./,
  /^169\.254\./,
  /^0\./,
  /^\[?::1\]?$/,
  /\.local$/,
  /\.internal$/
];

export interface CheckOptions {
  allowPrivate: boolean; // true only in mock mode (so the local demo pages work)
  allowedHosts: string[]; // empty = any public host
}

/** Validate + clean the URL before anything leaves our server. */
export function checkUrl(raw: unknown, opts: CheckOptions): UrlCheck {
  const clean = stripUrl(raw); // http(s) only, no query / hash / credentials
  if (!clean) return { ok: false, error: 'Send a valid http(s) URL.' };

  const host = new URL(clean).hostname.toLowerCase();

  if (!opts.allowPrivate && PRIVATE_HOSTS.some((re) => re.test(host))) {
    return { ok: false, error: 'Private or local addresses cannot be checked.' };
  }

  if (opts.allowedHosts.length > 0) {
    const allowed = opts.allowedHosts.some((h) => host === h || host.endsWith('.' + h));
    if (!allowed) return { ok: false, error: 'This site is not on the allowlist.' };
  }

  return { ok: true, url: clean };
}
