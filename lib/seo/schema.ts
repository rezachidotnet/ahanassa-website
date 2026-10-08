import { siteConfig } from "@/lib/metadata/site";
import { CONTACT_PHONE_E164 } from "@/lib/content/contact-channels";
import type { Locale } from "@/config/locales";

/**
 * The confirmed office address (PROJECT_OVERRIDES.md §7 item 6) in each
 * locale — the same wording the footer and /contact render for that locale
 * (components/layout/SiteFooter.tsx, app/[locale]/contact/page.tsx), split
 * into street and locality. Architecture V1.1 §7.1 (A6): an en/ar page's
 * structured data is in its own language, not Persian.
 */
export const ORGANIZATION_ADDRESS: Record<Locale, { streetAddress: string; addressLocality: string }> = {
  fa: { streetAddress: "خیابان هزارجریب، کوی آزادگان، پلاک 6", addressLocality: "اصفهان" },
  en: { streetAddress: "Hezar Jarib Street, Kooy Azadegan, No. 6", addressLocality: "Isfahan" },
  ar: { streetAddress: "شارع هزار جريب، حي آزادگان، رقم 6", addressLocality: "أصفهان" },
};

/**
 * Foundation-level structured data only: Organization, WebSite, BreadcrumbList.
 * Product/Offer schema is deferred to the catalog/pricing phase (out of
 * Phase 1 scope — PROJECT_OVERRIDES.md §4).
 *
 * Fields are limited to what Phase 1 actually renders. Structured data must
 * describe visible, verified content (CLAUDE.md §14) — do not add
 * address/telephone/sameAs here until the UI actually displays them.
 *
 * `contactPoint.telephone` added as part of the Header accessibility/SEO
 * hardening addendum (§6, "keep aligned with the Central Verified Business
 * Identity source") — this file's own rule above ("until the UI actually
 * displays it") is now satisfied, since the Header itself displays this
 * exact verified number. Reuses `CONTACT_PHONE_E164` directly — no new
 * value invented, no divergence from the Header/contact-page source.
 * `BreadcrumbList` remains explicitly out of Header scope (§6) — it belongs
 * to the page-level Breadcrumb architecture (see `breadcrumbListSchema`
 * below, called from individual pages, never from the Header).
 */

export function organizationId(): string {
  return `${siteConfig.baseUrl}/#organization`;
}

export function websiteId(): string {
  return `${siteConfig.baseUrl}/#website`;
}

export function organizationSchema(locale: Locale = "fa") {
  return {
    "@type": "Organization",
    "@id": organizationId(),
    name: siteConfig.name,
    alternateName: siteConfig.alternateName,
    url: siteConfig.baseUrl,
    // The full brand mark (byte-identical to the former app/icon.jpg, which W10.2 replaced with sized favicons).
    logo: `${siteConfig.baseUrl}/brand/ahan-asa-mark.jpg`,
    // Confirmed address (PROJECT_OVERRIDES.md §7 item 6), now rendered in
    // the footer and contact page — safe to add per this file's own rule.
    address: {
      "@type": "PostalAddress",
      ...ORGANIZATION_ADDRESS[locale],
      addressCountry: "IR",
    },
    // Same verified number the Header/contact page render — no separate value.
    contactPoint: {
      "@type": "ContactPoint",
      telephone: CONTACT_PHONE_E164,
      contactType: "sales",
      areaServed: "IR",
    },
  };
}

export function websiteSchema() {
  return {
    "@type": "WebSite",
    "@id": websiteId(),
    name: siteConfig.name,
    url: siteConfig.baseUrl,
    publisher: { "@id": organizationId() },
  };
}

export interface BreadcrumbItem {
  name: string;
  url: string;
}

export function breadcrumbListSchema(items: BreadcrumbItem[]) {
  return {
    "@type": "BreadcrumbList",
    itemListElement: items.map((item, index) => ({
      "@type": "ListItem",
      position: index + 1,
      name: item.name,
      item: item.url,
    })),
  };
}

/**
 * `Product` WITHOUT price/offer (architecture V1.1 §12; 01-sources/STRUCTURED_DATA.md §7.3, §12.2,
 * §12.4) for a published product (template) detail page only — never on category pages. Only fields
 * the page visibly renders: the heading (`name`), the intro (`description`) and the page URL. No `sku`
 * (the page lists many variants), no `brand`/`manufacturer` (Ahan Asa procures, it does not make), no
 * internal id as `@id`, and never `offers`/`price` (public pricing is off, §8.4).
 */
export function productSchema(input: { url: string; name: string; description: string | null }) {
  return {
    "@type": "Product",
    "@id": `${input.url}#product`,
    name: input.name,
    ...(input.description ? { description: input.description } : {}),
    url: input.url,
  };
}

/** Wraps one or more schema nodes in a top-level @graph with shared @context. */
export function jsonLdGraph(nodes: object[]) {
  return {
    "@context": "https://schema.org",
    "@graph": nodes,
  };
}
