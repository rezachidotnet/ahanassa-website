import { livechatFrameOrigin } from "../../config/livechat.ts";

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
 * W16.4 (D-SEO): Google Tag Manager + GA4 (GA4 runs only as the Google tag inside GTM). No
 * 'unsafe-inline'/'unsafe-eval': the site loads GTM from its own bundle (lib/analytics/gtm.ts).
 * Owner decision 2026-10-13 (DAR-066 item 3, amends architecture V1.1 §6.1): `connect-src` also allows
 * GA4's collection endpoints, so switching this policy from Report-Only to enforced does not stop
 * analytics. The origins are Google's documented CSP for GTM + GA4 (Google signals stay off, so no
 * doubleclick origin). GTM Preview's own UI (tagmanager.google.com) is not allowed: Preview is a
 * debugging tool and works while the policy is Report-Only.
 */
export const GTM_SCRIPT_ORIGIN = "https://*.googletagmanager.com";
export const GA4_IMG_ORIGINS = ["https://*.google-analytics.com", "https://*.googletagmanager.com"] as const;
export const GA4_CONNECT_ORIGINS = ["https://*.google-analytics.com", "https://*.analytics.google.com", "https://*.googletagmanager.com"] as const;

/**
 * W21.2: the Odoo live chat (config/livechat.ts) is an iframe of Odoo's support page — so, ONLY while live chat is
 * on, frame-src gains https://odoo.ahanassa.com and nothing else changes (no Odoo script, style, font, image or
 * connection on the site itself; owner decision 2026-10-17: no 'unsafe-eval'). While off: no Odoo origin at all.
 */
export function buildCspReportOnly(connectSrc: readonly string[] = [], livechatFrame: string | null = livechatFrameOrigin()): string {
  return [
    "default-src 'self'",
    "base-uri 'self'",
    "object-src 'none'",
    "frame-ancestors 'none'",
    "form-action 'self'",
    // W35: the domestic intake's captcha (ALTCHA) needs NO origin here — its widget and proof-of-work worker are our
    // own assets ('self'; worker-src falls back to script-src), its challenge comes from the RFQ API host already in
    // connect-src. Cloudflare Turnstile (RFQ form) requires its own script/frame/connect
    // origin — the narrowest addition that unblocks it, not a broad
    // relaxation (CLAUDE.md "CSP / Security Headers").
    `script-src 'self' https://challenges.cloudflare.com ${GTM_SCRIPT_ORIGIN}`,
    "style-src 'self' 'unsafe-inline'",
    ["img-src 'self' data:", ...GA4_IMG_ORIGINS].join(" "),
    "font-src 'self'",
    ["connect-src 'self' https://challenges.cloudflare.com", ...connectSrc, ...GA4_CONNECT_ORIGINS].join(" "),
    // W20.2: /about office maps — OpenStreetMap's own embed, loaded only after the visitor clicks «نمایش نقشه».
    ["frame-src 'self' https://challenges.cloudflare.com https://www.openstreetmap.org", ...(livechatFrame ? [livechatFrame] : [])].join(" "),
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
