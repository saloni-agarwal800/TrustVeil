/**
 * Returns the URL with query string, hash and credentials removed,
 * or null if it is not a plain http(s) URL.
 * Used on BOTH sides: the extension strips before sending, the backend strips again.
 */
export function stripUrl(raw: unknown): string | null {
  if (typeof raw !== 'string' || raw.length > 2048) return null;
  let u: URL;
  try {
    u = new URL(raw.trim());
  } catch {
    return null;
  }
  if (u.protocol !== 'http:' && u.protocol !== 'https:') return null;
  u.username = '';
  u.password = '';
  u.search = '';
  u.hash = '';
  return u.toString();
}
