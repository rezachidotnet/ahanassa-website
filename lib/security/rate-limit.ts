/**
 * RFQ submission rate limiting — pure core (no `cloudflare:workers` import,
 * so it can run under plain `node --test`; see lib/security/rate-limit-binding.ts
 * for the real Cloudflare Workers Rate Limiting binding wrapper used by the
 * route handler, mirroring the split the former lib/odoo/client.ts (removed in V1.1 W2) used between
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

import { ARVAN_CLIENT_IP_HEADER, ARVAN_IP_RANGES } from "../../config/arvan-ip-ranges.ts";

const KEY_PREFIX = "rfq:";
const UNKNOWN_IP = "unknown";

export interface RateLimiterBinding {
  limit(options: { key: string }): Promise<{ success: boolean }>;
}

export interface RateLimitCheck {
  allowed: boolean;
}

/** Dotted-quad IPv4 → 32-bit unsigned number, or null. */
function ipv4ToNumber(ip: string): number | null {
  const parts = ip.split(".");
  if (parts.length !== 4) return null;
  let n = 0;
  for (const part of parts) {
    if (!/^(0|[1-9]\d{0,2})$/.test(part) || Number(part) > 255) return null;
    n = n * 256 + Number(part);
  }
  return n;
}

/** Whether an IPv4 address is inside one of the IPv4 CIDRs (an IPv6 address never is — the Arvan list has none). */
export function ipv4InRanges(ip: string, cidrs: readonly string[]): boolean {
  const addr = ipv4ToNumber(ip);
  if (addr === null) return false;
  return cidrs.some((cidr) => {
    const [base, bits] = cidr.split("/");
    const network = ipv4ToNumber(base);
    const prefix = Number(bits);
    if (network === null || !Number.isInteger(prefix) || prefix < 0 || prefix > 32) return false;
    const size = 2 ** (32 - prefix);
    return Math.floor(addr / size) === Math.floor(network / size);
  });
}

/** A bare IPv4 or IPv6 literal (no port, no list) — anything else in the forwarded header is ignored. */
const isIpLiteral = (value: string) => ipv4ToNumber(value) !== null || (/^[0-9a-f:.]+$/i.test(value) && value.split(":").length >= 3 && value.length <= 45);

/**
 * Cloudflare's own edge-injected client IP — never trust a client-supplied
 * X-Forwarded-For for this purpose (CLAUDE.md "Client IP").
 *
 * W27 Iran mirror: a request through ArvanCloud (*.ahanassa.ir → api.ahanassa.com) connects to Cloudflare from an
 * Arvan edge, so CF-Connecting-IP is that edge for every Iranian visitor. Only when CF-Connecting-IP is inside
 * Arvan's published ranges (config/arvan-ip-ranges.ts) is Arvan's X-Real-IP used instead; from any other address
 * the header is ignored, so a visitor cannot pick their own rate-limit key by sending it.
 */
export function getClientIp(request: Request, trustedProxyRanges: readonly string[] = ARVAN_IP_RANGES): string {
  const connecting = request.headers.get("cf-connecting-ip");
  if (!connecting) return UNKNOWN_IP;
  if (ipv4InRanges(connecting, trustedProxyRanges)) {
    const forwarded = request.headers.get(ARVAN_CLIENT_IP_HEADER)?.trim();
    if (forwarded && isIpLiteral(forwarded)) return forwarded;
  }
  return connecting;
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
