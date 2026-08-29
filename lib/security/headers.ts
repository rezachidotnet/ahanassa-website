/**
 * Baseline security headers, applied to every response from middleware.
 *
 * CSP ships in Report-Only mode for now — enforcing it before real content,
 * scripts, and third-party embeds (GTM, fonts, images) exist would risk
 * breaking the app untested (explicit instruction: do not ship an untested
 * enforced CSP). Tighten and switch to enforced Content-Security-Policy once
 * the actual script/style/font/image origins for the built site are known.
 */
export function applySecurityHeaders(headers: Headers): void {
  headers.set("X-Content-Type-Options", "nosniff");
  headers.set("Referrer-Policy", "strict-origin-when-cross-origin");
  headers.set("X-Frame-Options", "DENY");
  headers.set(
    "Permissions-Policy",
    "camera=(), microphone=(), geolocation=(), payment=(), usb=(), interest-cohort=()",
  );
  headers.set(
    "Content-Security-Policy-Report-Only",
    [
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
    ].join("; "),
  );
}
