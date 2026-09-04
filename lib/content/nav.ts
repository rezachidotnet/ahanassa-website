import type { Locale } from "@/config/locales";

/**
 * Primary Header navigation — AHANASSA_HEADER_FINAL_FROZEN_V2.0.md §58.1.
 * Frozen routes: محصولات→/products, خدمات→/services, صنایع→/industries,
 * درباره ما→/about, تماس با ما→/contact. Products/Services are hybrid
 * (real link + separate disclosure control, §49.7/§58.9); Industries/About/
 * Contact are plain direct links, no dropdown (§32.4/§34.2/§37.2).
 *
 * `/industries` supersedes `/markets` as the canonical destination for this
 * intent (§32.1-32.2) — `/markets`'s own page/content is left untouched
 * (still reachable at its URL), it is simply no longer the primary-nav
 * target.
 */
export interface NavLink {
  path: string;
  label: string;
  hasDropdown?: boolean;
}

export const navLinks: Record<Locale, NavLink[]> = {
  fa: [
    { path: "/products", label: "محصولات", hasDropdown: true },
    { path: "/services", label: "خدمات", hasDropdown: true },
    { path: "/industries", label: "صنایع" },
    { path: "/about", label: "درباره ما" },
    { path: "/contact", label: "تماس با ما" },
  ],
  en: [
    { path: "/products", label: "Products", hasDropdown: true },
    { path: "/services", label: "Services", hasDropdown: true },
    { path: "/industries", label: "Industries" },
    { path: "/about", label: "About" },
    { path: "/contact", label: "Contact" },
  ],
  ar: [
    { path: "/products", label: "المنتجات", hasDropdown: true },
    { path: "/services", label: "الخدمات", hasDropdown: true },
    { path: "/industries", label: "الصناعات" },
    { path: "/about", label: "من نحن" },
    { path: "/contact", label: "تواصل معنا" },
  ],
};

/**
 * "مشاهده همه…" — the dropdown's own low-weight footer link (§52.11), not
 * a second CTA. `viewAllProducts`/`viewAllServices` reuse the exact same
 * `/products`/`/services` destinations as the hybrid label itself.
 */
export const dropdownViewAllLabel: Record<Locale, { products: string; services: string }> = {
  fa: { products: "مشاهده همه محصولات", services: "مشاهده همه خدمات" },
  en: { products: "View all products", services: "View all services" },
  ar: { products: "مشاهدة جميع المنتجات", services: "مشاهدة جميع الخدمات" },
};

/**
 * Global primary Header CTA — frozen text (§40.1, Persian only frozen):
 * **ارسال لیست خرید**, route `/request` (§40.2, §58.1). English/Arabic
 * wording is explicitly NOT fully frozen (§40.8 — "should not be assumed to
 * be a literal translation," left for a later localization/UX review) —
 * the values below are a faithful, non-literal best-effort rendering, not
 * an owner-approved final translation. The label describes an entry
 * concept, not an input-format restriction (§40.3) — unchanged by this
 * task, since implementing the broader intake formats themselves is
 * explicitly out of scope here (§40.4 "do not implement speculative AI
 * functionality in this task").
 */
export const primaryCta: Record<Locale, { full: string; compact: string }> = {
  fa: { full: "ارسال لیست خرید", compact: "ارسال لیست خرید" },
  en: { full: "Send purchase list", compact: "Send list" },
  ar: { full: "إرسال قائمة الشراء", compact: "إرسال القائمة" },
};

/**
 * Header phone utility (§37.3-37.4, §46.13) — a single verified phone
 * number/label, uniform across fa/en/ar (unlike the previous
 * locale-conditional phone-vs-WhatsApp pattern this supersedes). WhatsApp
 * is explicitly NOT a Header utility (§37.5) — it remains wherever it
 * already lives outside the Header (e.g. the homepage hero CTA,
 * `components/home/hero.tsx`, untouched by this task).
 */
export const headerPhoneLabel: Record<Locale, { srLabel: string }> = {
  fa: { srLabel: "تماس تلفنی" },
  en: { srLabel: "Call us" },
  ar: { srLabel: "اتصل بنا" },
};

// Frozen Services Header grouping (§27, §52.3, §58.3) used to live here as a
// hardcoded `headerServiceGroups` constant — a deliberate, disclosed interim
// stand-in while no Odoo Processing Domain / Public Processing Projection
// existed. P5 (`lib/processing/`) built that real projection into DB_PUBLIC,
// and P6 replaced this constant as the Header's runtime Services data
// source: `app/[locale]/layout.tsx` now calls
// `listPublicProcessingGroups(locale)` (`lib/processing/public-repository.ts`)
// and passes the result to `SiteHeader` as a `serviceGroups` prop, exactly
// mirroring how `productFamilies` already flows in from the real Product
// Catalog projection. Deleted entirely rather than kept as a fallback —
// "No fake/hardcoded fallback service groups" (P6 §6/§7): if DB_PUBLIC ever
// returns zero groups, the Header must degrade to a plain `/services` link
// (already the existing, generic, no-children behavior of
// `HeaderNavDisclosure`/`MobileNavDrawer` — see `SiteHeader.tsx`), never
// silently resurrect this old static list.
