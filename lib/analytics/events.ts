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
  /** A click on any `tel:` link. `link_location`: header | footer | mobile_menu | main | home_expert (W20.3 homepage expert section). */
  phone_click: ["link_location"],
  /** A click on any WhatsApp (`wa.me`) link; `link_location` as phone_click, or `sticky` for the floating en/ar button (W20.1). */
  whatsapp_click: ["link_location"],
  /** The first time a visitor changes an input of the weight calculator on this page view. */
  calculator_use: ["calculator_product_group", "calculator_mode"],
  /** The daily price page was viewed; `price_date` = the newest price date shown (YYYY-MM-DD). */
  price_page_view: ["price_date"],
  /**
   * A product was added to the RFQ basket (W10.5): the basket size after the add, the variant's catalog family
   * (public category code) and product page slug, and where the visitor came from (`add_source`: product | price |
   * calculator, from the same-origin referrer; omitted otherwise) (components/contact/static-enquiry-form.tsx).
   */
  basket_add: ["basket_size", "product_family", "product_slug", "add_source"],
  /** A product page was loaded (app/[locale]/products/[slug]/page.tsx). */
  product_view: ["product_family", "product_slug"],
  /** An RFQ link (`/contact`, `/request`) outside an article was clicked; `cta_location`: product | price | category | home | header | calculator | home_expert. */
  rfq_cta_click: ["cta_location", "product_family"],
  /** The weight calculator page was loaded; `calculator_entry`: home_cta | category | product | price | direct (same-origin referrer path only). */
  calculator_open: ["calculator_entry"],
  /** A file passed the attachment checks (W13.1): count and the policy's extension only, never the name (components/contact/enquiry-form.tsx). */
  file_upload: ["file_count", "file_type"],
  /** D-ARTICLE-METRICS: the reader reached 75% of the article body, once per page view (components/analytics/article-analytics.tsx). The slug, never the title. */
  article_read: ["article_slug", "article_lang"],
  /** D-ARTICLE-METRICS: an RFQ («استعلام قیمت») button or link inside an article was clicked; `cta_location`: inline | product_card | bottom. */
  article_cta_click: ["article_slug", "article_lang", "cta_location"],
  /**
   * W20.3 redesign: an action in the homepage expert section (components/home/expert-contact.tsx) was clicked;
   * `expert_variant`: A | B (the build's layout). Sent in addition to the site-wide phone_click / whatsapp_click /
   * rfq_cta_click, which keep counting every channel with location home_expert.
   */
  expert_call_click: ["expert_variant"],
  expert_whatsapp_click: ["expert_variant"],
  expert_rfq_click: ["expert_variant"],
  expert_chat_click: ["expert_variant"],
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
export function linkLocation(element: Element): "header" | "footer" | "mobile_menu" | "main" | "sticky" | "home_expert" | "other" {
  // W20.1: the floating WhatsApp button of the en/ar pages (components/layout/sticky-whatsapp.tsx).
  if (element.closest("[data-sticky-whatsapp]")) return "sticky";
  // W20.3: the homepage «با کارشناس فروش صحبت کنید» section (components/home/expert-contact.tsx).
  if (element.closest("[data-home-expert]")) return "home_expert";
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

export const EXPERT_ACTIONS = { call: "expert_call_click", whatsapp: "expert_whatsapp_click", rfq: "expert_rfq_click", chat: "expert_chat_click" } as const;
export type ExpertClickEvent = (typeof EXPERT_ACTIONS)[keyof typeof EXPERT_ACTIONS];

/** The expert-section event for a link's `data-expert-action` value, or null (any other link). */
export function expertClickEvent(action: string | null | undefined): ExpertClickEvent | null {
  return action && Object.hasOwn(EXPERT_ACTIONS, action) ? EXPERT_ACTIONS[action as keyof typeof EXPERT_ACTIONS] : null;
}

/** The kind of public page a path is, for the funnel events; null for every other page. */
export type FunnelPage = "home" | "product" | "category" | "price" | "calculator";

/** The page kind of a pathname: the locale prefix, `.html` and a trailing slash are ignored. */
export function funnelPage(pathname: string): FunnelPage | null {
  const path = pathname.replace(/\.html$/i, "").replace(/^\/(?:fa|en|ar)(?=\/|$)/i, "").replace(/\/+$/, "") || "/";
  if (path === "/" || path === "/index") return "home";
  if (/^\/products(?:\/category\/[^/]+)?$/.test(path)) return "category";
  if (/^\/products\/[^/]+$/.test(path)) return "product";
  if (/^\/prices(?:\/[^/]+)?$/.test(path)) return "price";
  if (path === "/tools/weight-calculator") return "calculator";
  return null;
}

/** The path of a same-origin referrer, or null (no referrer, another site, or not a URL). Never the query or fragment. */
export function sameOriginReferrerPath(referrer: string, origin: string): string | null {
  try {
    const url = new URL(referrer);
    return url.origin === origin ? url.pathname : null;
  } catch {
    return null;
  }
}

/** basket_add `add_source`: the page the visitor came from, when it is a product, price or calculator page. */
export function basketAddSource(referrerPath: string | null): "product" | "price" | "calculator" | null {
  const page = referrerPath ? funnelPage(referrerPath) : null;
  return page === "product" || page === "price" || page === "calculator" ? page : null;
}

/** calculator_open `calculator_entry`: home_cta | category | product | price, else direct (no, foreign or another page's referrer). */
export function calculatorEntry(referrerPath: string | null): "home_cta" | "category" | "product" | "price" | "direct" {
  const page = referrerPath ? funnelPage(referrerPath) : null;
  if (page === "home") return "home_cta";
  return page === "category" || page === "product" || page === "price" ? page : "direct";
}

/**
 * The catalog family (public category code, e.g. `REBAR`, `BOX_SECTION`) a category listing or price hub URL
 * names (`/products/category/box-section`, `/prices/rebar`; lib/catalog/public-categories.ts#categoryPathSegment).
 */
export function familyFromPath(pathname: string): string | null {
  const m = /^(?:\/(?:fa|en|ar))?\/(?:products\/category|prices)\/([a-z0-9-]+)(?:\.html)?\/?$/i.exec(pathname);
  return m ? m[1].toUpperCase().replace(/-/g, "_") : null;
}

/** rfq_cta_click `cta_location`: the header (or the mobile menu), the homepage expert section, else the kind of page; null in the footer or on other pages. */
export function rfqCtaLocation(link: Element, pathname: string): FunnelPage | "header" | "home_expert" | null {
  const where = linkLocation(link);
  if (where === "header" || where === "mobile_menu") return "header";
  if (where === "home_expert") return "home_expert";
  return where === "main" ? funnelPage(pathname) : null;
}

/** True for an RFQ destination: `/contact` or `/request` in any locale, with an optional query or fragment. */
export function isRfqHref(href: string): boolean {
  return /^(?:https:\/\/(?:www\.)?ahanassa\.com)?(?:\/(?:fa|en|ar))?\/(?:contact|request)\/?(?:[?#].*)?$/i.test(href);
}

/** Where an article marks its RFQ CTAs (`data-article-cta`); an RFQ link without a mark sits in the body. */
export const ARTICLE_CTA_LOCATIONS = ["inline", "product_card", "bottom"] as const;
export type ArticleCtaLocation = (typeof ARTICLE_CTA_LOCATIONS)[number];

/** The `cta_location` of a clicked RFQ link inside an article: its nearest `data-article-cta` mark, else `inline`. */
export function articleCtaLocation(link: Element): ArticleCtaLocation {
  const mark = link.closest("[data-article-cta]")?.getAttribute("data-article-cta") ?? "";
  return (ARTICLE_CTA_LOCATIONS as readonly string[]).includes(mark) ? (mark as ArticleCtaLocation) : "inline";
}
