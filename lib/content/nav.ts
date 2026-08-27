import type { Locale } from "@/config/locales";

/**
 * Primary navigation. Route slugs follow the working set already used
 * across this integration (`/products`, `/services`, `/markets`, `/about`,
 * `/contact`); final hub naming/hierarchy is an open decision — see
 * DOCUMENT_AUDIT_REPORT.md DAR-016. Labels are locale-neutral direct
 * translations, not owner-approved marketing copy.
 */
export interface NavLink {
  path: string;
  label: string;
}

export const navLinks: Record<Locale, NavLink[]> = {
  fa: [
    { path: "/products", label: "محصولات" },
    { path: "/services", label: "خدمات" },
    { path: "/markets", label: "بازارها" },
    { path: "/about", label: "درباره ما" },
    { path: "/contact", label: "تماس با ما" },
  ],
  en: [
    { path: "/products", label: "Products" },
    { path: "/services", label: "Services" },
    { path: "/markets", label: "Markets" },
    { path: "/about", label: "About" },
    { path: "/contact", label: "Contact" },
  ],
  ar: [
    { path: "/products", label: "المنتجات" },
    { path: "/services", label: "الخدمات" },
    { path: "/markets", label: "الأسواق" },
    { path: "/about", label: "من نحن" },
    { path: "/contact", label: "تواصل معنا" },
  ],
};

/** Global primary CTA — CTA_STRATEGY.md §5.1. */
export const primaryCta: Record<Locale, { full: string; compact: string }> = {
  fa: { full: "ارسال فاکتور یا لیست خرید", compact: "ارسال فاکتور" },
  en: { full: "Send invoice or purchase list", compact: "Send invoice" },
  ar: { full: "إرسال الفاتورة أو قائمة الشراء", compact: "إرسال الفاتورة" },
};
