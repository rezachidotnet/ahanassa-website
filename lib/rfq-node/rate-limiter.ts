import type { RateLimiter } from "../rfq-worker/config.ts";

/**
 * W32 (W29 P2 §3.1): the RFQ_RATE_LIMITER binding for the domestic intake — an in-process sliding window with the
 * Worker's numbers (workers/rfq/wrangler.jsonc: 20 per 60 s per key; files use their own `files:` key space, as on
 * the Worker). One intake process per environment, so no shared store is needed. The key is already a SHA-256 of the
 * client IP (lib/security/rate-limit.ts); the raw IP is never kept here.
 *
 * Unlike Cloudflare's eventually-consistent counter this one is exact. nginx `limit_req` and Arvan's WAF rule sit in
 * front of it (deploy/iran/nginx).
 */
export class SlidingWindowLimiter implements RateLimiter {
  private readonly hits = new Map<string, number[]>();
  private sweeps = 0;
  readonly limitCount: number;
  readonly periodMs: number;
  private readonly now: () => number;
  constructor(limitCount = 20, periodMs = 60_000, now: () => number = Date.now) {
    this.limitCount = limitCount;
    this.periodMs = periodMs;
    this.now = now;
  }

  async limit({ key }: { key: string }): Promise<{ success: boolean }> {
    const t = this.now();
    const from = t - this.periodMs;
    const list = (this.hits.get(key) ?? []).filter((x) => x > from);
    const success = list.length < this.limitCount;
    if (success) list.push(t);
    this.hits.set(key, list);
    if (++this.sweeps % 500 === 0) this.sweep(from);
    return { success };
  }

  private sweep(from: number): void {
    for (const [key, list] of this.hits) if (!list.some((x) => x > from)) this.hits.delete(key);
  }

  get size(): number {
    return this.hits.size;
  }
}
