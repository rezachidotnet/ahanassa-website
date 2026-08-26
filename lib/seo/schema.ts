import { siteConfig } from "@/lib/metadata/site";

/**
 * Foundation-level structured data only: Organization, WebSite, BreadcrumbList.
 * Product/Offer schema is deferred to the catalog/pricing phase (out of
 * Phase 1 scope — PROJECT_OVERRIDES.md §4).
 *
 * Fields are limited to what Phase 1 actually renders. Structured data must
 * describe visible, verified content (CLAUDE.md §14) — do not add
 * address/telephone/sameAs here until the UI actually displays them.
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
