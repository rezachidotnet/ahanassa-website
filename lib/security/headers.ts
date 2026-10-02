/**
 * Baseline security headers — the single source for both runtimes:
 * `proxy.ts` (legacy SSR Worker) applies them per response via
 * `applySecurityHeaders`, and the static build writes the same list into
 * `public-assets/_headers` (lib/static/static-rules.ts; architecture V1.1
 * §4.2 — no middleware at visit time).
 *
 * CSP ships in Report-Only mode for now — enforcing it before real content,
 * scripts, and third-party embeds (GTM, fonts, images) exist would risk
 * breaking the app untested (explicit instruction: do not ship an untested
 * enforced CSP). Tighten and switch to enforced Content-Security-Policy once
 * the actual script/style/font/image origins for the built site are known.
 */
export const CSP_REPORT_ONLY = [
  "default-src 'self'",
  "base-uri 'self'",
  "object-src 'none'",
  "frame-ancestors 'none'",
  "form-action 'self'",
  // Cloudflare Turnstile (RFQ form) requires its own script/frame/connect
  // origin — the narrowest addition that unblocks it, not a broad
  // relaxation (CLAUDE.md "CSP / Security Headers").
  "script-src 'self' https://challenges.cloudflare.com",
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data:",
  "font-src 'self'",
  "connect-src 'self' https://challenges.cloudflare.com",
  "frame-src 'self' https://challenges.cloudflare.com",
  "upgrade-insecure-requests",
].join("; ");

export const SECURITY_HEADERS: ReadonlyArray<readonly [name: string, value: string]> = [
  ["X-Content-Type-Options", "nosniff"],
  ["Referrer-Policy", "strict-origin-when-cross-origin"],
  ["X-Frame-Options", "DENY"],
  ["Permissions-Policy", "camera=(), microphone=(), geolocation=(), payment=(), usb=(), interest-cohort=()"],
  ["Content-Security-Policy-Report-Only", CSP_REPORT_ONLY],
];

export function applySecurityHeaders(headers: Headers): void {
  for (const [name, value] of SECURITY_HEADERS) headers.set(name, value);
}
