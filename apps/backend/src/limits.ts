/** Tiny in-memory rate limiter (per key, sliding window). Fine for a prototype. */
export class RateLimiter {
  private hits = new Map<string, number[]>();
  constructor(private max: number, private windowMs: number) {}

  allow(key: string, now = Date.now()): boolean {
    const recent = (this.hits.get(key) ?? []).filter((t) => now - t < this.windowMs);
    if (recent.length >= this.max) {
      this.hits.set(key, recent);
      return false;
    }
    recent.push(now);
    this.hits.set(key, recent);
    return true;
  }
}

/** Tiny TTL cache so repeated Deep Checks of the same URL are instant (and cheap). */
export class TtlCache<T> {
  private store = new Map<string, { at: number; value: T }>();
  constructor(private ttlMs: number) {}

  get(key: string, now = Date.now()): T | undefined {
    const hit = this.store.get(key);
    if (!hit) return undefined;
    if (now - hit.at > this.ttlMs) {
      this.store.delete(key);
      return undefined;
    }
    return hit.value;
  }

  set(key: string, value: T, now = Date.now()): void {
    this.store.set(key, { at: now, value });
  }
}
