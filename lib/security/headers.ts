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
/**
 * CSP (Report-Only). `connectSrc` lists the extra origins the page may call
 * besides 'self' and Turnstile — the static build passes exactly the
 * target's RFQ API origin (architecture V1.1 §6.1: connect-src limited to
 * that host). The SSR Worker posts same-origin and passes none.
 */
/**
 * W16.4 (D-SEO): Google Tag Manager + GA4 (configured inside GTM) — the GTM script and GA4's image
 * beacons. No 'unsafe-inline'/'unsafe-eval': the site loads GTM from its own bundle (lib/analytics/gtm.ts).
 * connect-src is deliberately NOT widened: architecture V1.1 §6.1 (W2 gate) pins it to 'self', Turnstile
 * and the RFQ API. GA4's fetch/sendBeacon hits are therefore REPORTED by this Report-Only policy; before
 * any enforced CSP the owner must decide §6.1 vs GA4 (docs/analytics/GTM_SETUP.md §8).
 */
export const GTM_SCRIPT_ORIGIN = "https://www.googletagmanager.com";
export const GA4_IMG_ORIGINS = ["https://*.google-analytics.com", "https://www.googletagmanager.com"] as const;

export function buildCspReportOnly(connectSrc: readonly string[] = []): string {
  return [
    "default-src 'self'",
    "base-uri 'self'",
    "object-src 'none'",
    "frame-ancestors 'none'",
    "form-action 'self'",
    // Cloudflare Turnstile (RFQ form) requires its own script/frame/connect
    // origin — the narrowest addition that unblocks it, not a broad
    // relaxation (CLAUDE.md "CSP / Security Headers").
    `script-src 'self' https://challenges.cloudflare.com ${GTM_SCRIPT_ORIGIN}`,
    "style-src 'self' 'unsafe-inline'",
    ["img-src 'self' data:", ...GA4_IMG_ORIGINS].join(" "),
    "font-src 'self'",
    ["connect-src 'self' https://challenges.cloudflare.com", ...connectSrc].join(" "),
    "frame-src 'self' https://challenges.cloudflare.com",
    "upgrade-insecure-requests",
  ].join("; ");
}

export const CSP_REPORT_ONLY = buildCspReportOnly();


export function buildSecurityHeaders(connectSrc: readonly string[] = []): ReadonlyArray<readonly [name: string, value: string]> {
  return [
    ["X-Content-Type-Options", "nosniff"],
    ["Referrer-Policy", "strict-origin-when-cross-origin"],
    ["X-Frame-Options", "DENY"],
    ["Permissions-Policy", "camera=(), microphone=(), geolocation=(), payment=(), usb=(), interest-cohort=()"],
    ["Content-Security-Policy-Report-Only", buildCspReportOnly(connectSrc)],
  ];
}

export const SECURITY_HEADERS = buildSecurityHeaders();

export function applySecurityHeaders(headers: Headers): void {
  for (const [name, value] of SECURITY_HEADERS) headers.set(name, value);
}
