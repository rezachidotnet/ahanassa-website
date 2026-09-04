import { siteConfig } from "@/lib/metadata/site";
import { CONTACT_PHONE_E164 } from "@/lib/content/contact-channels";

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

export function organizationSchema() {
  return {
    "@type": "Organization",
    "@id": organizationId(),
    name: siteConfig.name,
    alternateName: siteConfig.alternateName,
    url: siteConfig.baseUrl,
    logo: `${siteConfig.baseUrl}/icon.jpg`,
    // Confirmed address (PROJECT_OVERRIDES.md §7 item 6), now rendered in
    // the footer and contact page — safe to add per this file's own rule.
    address: {
      "@type": "PostalAddress",
      streetAddress: "خیابان هزارجریب، کوی آزادگان",
      addressLocality: "اصفهان",
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

/** Wraps one or more schema nodes in a top-level @graph with shared @context. */
export function jsonLdGraph(nodes: object[]) {
  return {
    "@context": "https://schema.org",
    "@graph": nodes,
  };
}
