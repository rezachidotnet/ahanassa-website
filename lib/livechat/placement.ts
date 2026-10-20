/**
 * W21.2 — the floating «چت با کارشناس» button's placement and teaser rules (owner decision 2026-10-17), pure and
 * import-free so the client button (components/livechat/livechat-button.tsx) stays small and the rules are
 * unit-testable. Paths are public pathnames (fa has no locale prefix; the floating button is fa only).
 */

/**
 * Where the floating button shows (owner decision 2026-10-17), by public pathname (fa has no prefix):
 * - `home`: hidden while the hero is on screen, fades in after the first scroll, hidden again while the expert
 *   section (which has its own chat button) is on screen;
 * - `article`: after ~30 % of the page is scrolled;
 * - `never`: /contact (its own form and contact options);
 * - `always`: everything else, from load — /prices, product and chart pages among them.
 */
export type StickyLivechatMode = "home" | "article" | "never" | "always";

export function stickyLivechatMode(pathname: string): StickyLivechatMode {
  const path = pathname.replace(/\/+$/, "") || "/";
  if (path === "/") return "home";
  if (path === "/contact" || path.startsWith("/contact/")) return "never";
  if (path.startsWith("/articles/")) return "article";
  return "always";
}

/** The pages that start the 45-second teaser timer: /prices (and its chart pages) and the product pages. */
export function isTeaserDwellPage(pathname: string): boolean {
  return /^\/(?:prices|products)(?:\/|$)/.test(pathname);
}

/** A product detail page's slug (the "2nd product page view" teaser trigger), else null. */
export function productPageSlug(pathname: string): string | null {
  const m = /^\/products\/([^/]+)\/?$/.exec(pathname);
  return m && m[1] !== "category" ? m[1] : null;
}

/** The teaser's dwell time on a price/product/chart page. */
export const TEASER_DWELL_MS = 45_000;
/** The share of an article that must be scrolled before the floating button shows. */
export const ARTICLE_SCROLL_SHARE = 0.3;
