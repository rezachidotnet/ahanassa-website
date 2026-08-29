/**
 * RFQ submission rate limiting — pure core (no `cloudflare:workers` import,
 * so it can run under plain `node --test`; see lib/security/rate-limit-binding.ts
 * for the real Cloudflare Workers Rate Limiting binding wrapper used by the
 * route handler, mirroring the split lib/odoo/client.ts already uses between
 * protocol mechanics and env-sourced config).
 *
 * The `RFQ_RATE_LIMITER` binding (wrangler.jsonc `ratelimits`) is
 * intentionally permissive and eventually-consistent — Cloudflare's own
 * documented behavior for the "simple" rate limiting binding is a
 * best-effort counter local to each Cloudflare location, not an exact
 * global ledger. Treat it as an abuse-reduction layer that runs ahead of
 * the mandatory, fail-closed Turnstile check (lib/security/turnstile.ts) —
 * never as the sole or authoritative gate.
 */

const KEY_PREFIX = "rfq:";
const UNKNOWN_IP = "unknown";

export interface RateLimiterBinding {
  limit(options: { key: string }): Promise<{ success: boolean }>;
}

export interface RateLimitCheck {
  allowed: boolean;
}

/**
 * Cloudflare's own edge-injected client IP — never trust a client-supplied
 * X-Forwarded-For for this purpose (CLAUDE.md "Client IP").
 */
export function getClientIp(request: Request): string {
  return request.headers.get("cf-connecting-ip") ?? UNKNOWN_IP;
}

/**
 * The rate-limit binding key is derived, not the raw IP, per CLAUDE.md
 * "Rate Limit Key" — avoids sending/persisting the plain address anywhere,
 * using the platform-native Web Crypto API already used for idempotency-key
 * hashing (lib/rfq/idempotency.ts) rather than a new dependency.
 */
export async function hashRateLimitKey(ip: string): Promise<string> {
  const bytes = new TextEncoder().encode(`${KEY_PREFIX}${ip}`);
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

/**
 * Pure, dependency-injectable core. Fails OPEN when the binding itself is
 * absent (e.g. before `wrangler.jsonc` wires it up in a given environment)
 * so it never becomes a hard local-dev blocker on its own; the mandatory
 * Turnstile check remains the fail-closed layer regardless.
 */
export async function evaluateRateLimit(limiter: RateLimiterBinding | undefined, ip: string): Promise<RateLimitCheck> {
  if (!limiter) return { allowed: true };
  const key = await hashRateLimitKey(ip);
  const outcome = await limiter.limit({ key });
  return { allowed: outcome.success };
}
