/**
 * dataLayer events (W16.4, decision D-SEO) — the site's whole measurement
 * vocabulary. GTM turns each one into a GA4 event (docs/analytics/GTM_SETUP.md).
 *
 * Privacy rule: no personal data ever reaches the dataLayer. Every event has
 * a fixed parameter allowlist; a string value must be a short token
 * (letters, digits, `_-.:`; no spaces, no `@`, no `+`), so a name, an email,
 * a phone number typed by a visitor, a message or a file name cannot pass —
 * `buildEvent` drops the value instead. rfq_submit carries the tracking
 * number only.
 */

export const ANALYTICS_EVENTS = {
  /** The RFQ was accepted by the RFQ API (success panel shown). */
  rfq_submit: ["rfq_tracking_number"],
  /** A click on any `tel:` link. `link_location`: header | footer | mobile_menu | main. */
  phone_click: ["link_location"],
  /** A click on any WhatsApp (`wa.me`) link. */
  whatsapp_click: ["link_location"],
  /** The first time a visitor changes an input of the weight calculator on this page view. */
  calculator_use: ["calculator_product_group", "calculator_mode"],
  /** The daily price page was viewed; `price_date` = the newest price date shown (YYYY-MM-DD). */
  price_page_view: ["price_date"],
  /** A product was added to the RFQ basket (W10.5, PR #44): the basket size after the add. */
  basket_add: ["basket_size"],
  /** A file was attached to the RFQ (W13.1, PR #45): count and lower-case extension only, never the name. */
  file_upload: ["file_count", "file_type"],
} as const satisfies Record<string, readonly string[]>;

export type AnalyticsEventName = keyof typeof ANALYTICS_EVENTS;
export type AnalyticsParams<E extends AnalyticsEventName> = Partial<Record<(typeof ANALYTICS_EVENTS)[E][number], string | number>>;

/** A short, PII-free token: no whitespace, `@` or `+`, at most 64 characters. */
export const SAFE_TOKEN = /^[A-Za-z0-9_.:-]{1,64}$/;

/** The dataLayer object for an event: allowlisted keys with safe values only (anything else is dropped). */
export function buildEvent<E extends AnalyticsEventName>(event: E, params: AnalyticsParams<E> = {}): Record<string, string | number> {
  const out: Record<string, string | number> = { event };
  const allowed: readonly string[] = ANALYTICS_EVENTS[event];
  for (const [key, value] of Object.entries(params as Record<string, unknown>)) {
    if (!allowed.includes(key)) continue;
    if (typeof value === "number" && Number.isFinite(value)) out[key] = value;
    else if (typeof value === "string" && SAFE_TOKEN.test(value)) out[key] = value;
  }
  return out;
}

type DataLayerWindow = { dataLayer?: unknown[] };

/** Pushes one event to `window.dataLayer` (created if missing). A no-op outside the browser; never throws. */
export function trackEvent<E extends AnalyticsEventName>(event: E, params?: AnalyticsParams<E>): void {
  if (typeof window === "undefined") return;
  try {
    const w = window as unknown as DataLayerWindow;
    (w.dataLayer ??= []).push(buildEvent(event, params));
  } catch {
    // Measurement must never break the page.
  }
}

/** Where a clicked link sits: the nearest landmark (the mobile drawer is a dialog). */
export function linkLocation(element: Element): "header" | "footer" | "mobile_menu" | "main" | "other" {
  if (element.closest('[role="dialog"]')) return "mobile_menu";
  // <main> first: an article's own <header> sits inside it.
  if (element.closest("main")) return "main";
  if (element.closest("header")) return "header";
  if (element.closest("footer")) return "footer";
  return "other";
}

/** The event a clicked href belongs to, if any. */
export function clickEventFor(href: string): "phone_click" | "whatsapp_click" | null {
  if (/^tel:/i.test(href)) return "phone_click";
  if (/^https:\/\/(?:wa\.me|api\.whatsapp\.com|wa\.link)\//i.test(href)) return "whatsapp_click";
  return null;
}
