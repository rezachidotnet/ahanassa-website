import { siteConfig } from "../metadata/site.ts";
import { CONTACT_PHONE_E164 } from "../content/contact-channels.ts";
import { PARENT_ORGANIZATION, WORKING_HOURS } from "../content/company.ts";
import type { Locale } from "../../config/locales.ts";
import { BRAND_MARK_LOGO_PATH } from "../media/image-sources.ts";

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
 * Decision D-COMPANY-INFO (owner, 2026-10-13): the Tehran coordination office — a second location of the
 * same company, with its own postal code and no separate phone. Same wording /contact renders
 * (app/[locale]/contact/page.tsx). Isfahan stays the official (LocalBusiness) address.
 */
export const TEHRAN_OFFICE: Record<Locale, { name: string; streetAddress: string; addressLocality: string; postalCode: string }> = {
  fa: { name: "آهن آسا — دفتر هماهنگی تهران", streetAddress: "خیابان ستارخان، پلاک 660", addressLocality: "تهران", postalCode: "1454954166" },
  en: { name: "Ahan Asa — Tehran coordination office", streetAddress: "Sattarkhan Street, No. 660", addressLocality: "Tehran", postalCode: "1454954166" },
  ar: { name: "آهن آسا — مكتب التنسيق في طهران", streetAddress: "شارع ستارخان، رقم 660", addressLocality: "طهران", postalCode: "1454954166" },
};

/** D-COMPANY-INFO: Iran, plus export to Iraq as an approved business line (ISO 3166-1 codes). */
export const AREA_SERVED = ["IR", "IQ"] as const;

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

/**
 * The parent group (owner, 2026-10-13; lib/content/company.ts, shown on /about). `url` is the group site's
 * canonical host: https://www.fazasazeh.ir answers 301 to https://fazasazeh.ir.
 */
export function parentOrganizationSchema(locale: Locale = "fa") {
  return {
    "@type": "Organization",
    name: PARENT_ORGANIZATION.name[locale],
    url: PARENT_ORGANIZATION.url,
    foundingDate: PARENT_ORGANIZATION.foundingDate,
  };
}

/** Working hours (owner, 2026-10-13; lib/content/company.ts, shown on /contact and /about), Iran time. */
export function openingHoursSchema() {
  return WORKING_HOURS.map((h) => ({ "@type": "OpeningHoursSpecification", dayOfWeek: [...h.dayOfWeek], opens: h.opens, closes: h.closes }));
}

export function organizationSchema(locale: Locale = "fa") {
  return {
    "@type": "Organization",
    "@id": organizationId(),
    name: siteConfig.name,
    alternateName: siteConfig.alternateName,
    url: siteConfig.baseUrl,
    parentOrganization: parentOrganizationSchema(locale),
    // The full brand mark (the former app/icon.jpg, which W10.2 replaced with sized favicons), as the
    // 512 px JPEG the image pipeline publishes (W16.5; the 4500 px original is no longer served).
    logo: `${siteConfig.baseUrl}${BRAND_MARK_LOGO_PATH}`,
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
      areaServed: [...AREA_SERVED],
    },
  };
}

export function localBusinessId(): string {
  return `${siteConfig.baseUrl}/#localbusiness`;
}

/**
 * W16.2 (D-SEO): the office as a `LocalBusiness` — the official address (PROJECT_OVERRIDES.md §7.1:
 * Isfahan, no postal code confirmed for it) and the one verified phone, exactly as the footer and /contact
 * render them, and the confirmed working hours. D-COMPANY-INFO: `withTehranOffice` adds the Tehran
 * coordination office as a `department` (its own address and postal code, no separate phone) — only on
 * /contact, the page that renders it. Its `parentOrganization` is Ahan Asa's Organization node, whose own
 * parent is the group (parentOrganizationSchema). Never ratings, price range or geo coordinates (not
 * confirmed, PROJECT_OVERRIDES.md §10).
 */
export function localBusinessSchema(locale: Locale = "fa", options: { withTehranOffice?: boolean } = {}) {
  const { name: tehranName, ...tehranAddress } = TEHRAN_OFFICE[locale];
  return {
    "@type": "LocalBusiness",
    "@id": localBusinessId(),
    name: siteConfig.name,
    alternateName: siteConfig.alternateName,
    url: siteConfig.baseUrl,
    image: `${siteConfig.baseUrl}/brand/ahan-asa-mark.jpg`,
    telephone: CONTACT_PHONE_E164,
    address: {
      "@type": "PostalAddress",
      ...ORGANIZATION_ADDRESS[locale],
      addressCountry: "IR",
    },
    areaServed: [...AREA_SERVED],
    openingHoursSpecification: openingHoursSchema(),
    parentOrganization: { "@id": organizationId() },
    ...(options.withTehranOffice
      ? {
          department: {
            "@type": "LocalBusiness",
            "@id": `${siteConfig.baseUrl}/#tehran-office`,
            name: tehranName,
            address: { "@type": "PostalAddress", ...tehranAddress, addressCountry: "IR" },
          },
        }
      : {}),
  };
}

/**
 * A question or answer that talks money (a currency word). Prices in structured data are an open owner
 * decision (D-SEO: no price in JSON-LD), so such an item stays visible on the page but out of the FAQPage.
 */
export const FAQ_PRICE_TALK = /تومان|ریال|ريال|درهم|دلار|دولار|\btoman|\brials?\b|\bIRR\b|\bUSD\b|\$/i;

/**
 * W16.2: `FAQPage` for a page that visibly renders these questions and answers (never hidden-only copy),
 * minus any item that mentions a currency (FAQ_PRICE_TALK). null when nothing is left.
 */
export function faqPageSchema(items: readonly { q: string; a: string }[]) {
  const kept = items.filter((item) => !FAQ_PRICE_TALK.test(`${item.q} ${item.a}`));
  if (kept.length === 0) return null;
  return {
    "@type": "FAQPage",
    mainEntity: kept.map((item) => ({
      "@type": "Question",
      name: item.q,
      acceptedAnswer: { "@type": "Answer", text: item.a },
    })),
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
 * internal id as `@id`. Its daily prices are a separate block (productOffersSchema, W20.7).
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

/**
 * W20.7 (owner, 2026-10-16) — the product page's daily prices as `offers` of its `Product` node (same `@id`, a
 * separate JSON-LD block that merges into it): one `Offer` per priced variant with the variant's LOWEST published
 * price (never another factory's), per kg in IRR (the page shows Toman = IRR ÷ 10), VAT included. Nothing else:
 * no factory/seller, date, availability or validity — the price is indicative (D-PRICE-MEANING). fa and ar product
 * pages only; the price gate (lib/static/price-gate.ts rule 8) checks every value against the snapshot.
 */
export function productOffersSchema(input: { url: string; offers: ReadonlyArray<{ variantXid: string; priceIrrPerKg: number }> }) {
  return {
    "@type": "Product",
    "@id": `${input.url}#product`,
    offers: input.offers.map((o) => ({
      "@type": "Offer",
      "@id": `${input.url}#offer-${o.variantXid}`,
      price: o.priceIrrPerKg,
      priceCurrency: "IRR",
      priceSpecification: {
        "@type": "UnitPriceSpecification",
        price: o.priceIrrPerKg,
        priceCurrency: "IRR",
        referenceQuantity: { "@type": "QuantitativeValue", value: 1, unitCode: "KGM" },
        valueAddedTaxIncluded: true,
      },
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

/**
 * W20.2 — a past `Event` Ahan Asa took part in (/about «رویدادها»). Only the facts the page shows: name, the
 * dates (all-day, as the poster gives them), the venue and its city, the poster image, and Ahan Asa as an
 * attendee. It took place as scheduled, so `eventStatus` stays EventScheduled (schema.org has no "past" status).
 * No organizer, offers or performer — none was supplied.
 */
export function eventSchema(input: { id: string; name: string; description: string; startDate: string; endDate: string; venue: string; locality: string; image: string }) {
  return {
    "@type": "Event",
    "@id": input.id,
    name: input.name,
    description: input.description,
    startDate: input.startDate,
    endDate: input.endDate,
    eventStatus: "https://schema.org/EventScheduled",
    eventAttendanceMode: "https://schema.org/OfflineEventAttendanceMode",
    location: { "@type": "Place", name: input.venue, address: { "@type": "PostalAddress", addressLocality: input.locality, addressCountry: "IR" } },
    image: [input.image],
    attendee: { "@id": organizationId() },
  };
}
