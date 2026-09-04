import type { Metadata } from "next";
import { notFound } from "next/navigation";
import "../globals.css";
import { locales, isLocale, getDirection, type Locale } from "@/config/locales";
import { estedad } from "@/lib/fonts/estedad";
import { siteConfig } from "@/lib/metadata/site";
import { SkipLink } from "@/components/layout/SkipLink";
import { SiteHeader } from "@/components/layout/SiteHeader";
import { SiteFooter } from "@/components/layout/SiteFooter";
import { listHeaderProductFamilyShortcuts, type HeaderProductFamilyShortcut } from "@/lib/catalog/editorial-repository";
import { listPublicProcessingGroups, type PublicProcessingGroup } from "@/lib/processing/public-repository";

export function generateStaticParams() {
  return locales.map((locale) => ({ locale }));
}

export const dynamicParams = false;

export const metadata: Metadata = {
  metadataBase: new URL(siteConfig.baseUrl),
  title: {
    default: siteConfig.name,
    template: `%s | ${siteConfig.name}`,
  },
};

const skipLinkLabel: Record<Locale, string> = {
  fa: "رفتن به محتوای اصلی",
  en: "Skip to main content",
  ar: "الانتقال إلى المحتوى الرئيسي",
};

export default async function LocaleLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale: rawLocale } = await params;

  if (!isLocale(rawLocale)) {
    notFound();
  }

  const locale = rawLocale;
  const direction = getDirection(locale);

  // Real Odoo -> Public Product Projection -> Header data source
  // (AHANASSA_HEADER_FINAL_FROZEN_V2.0.md §4.3/§58.2), fetched once per
  // request here (server-rendered, never on Header dropdown open/hover —
  // §52.8/§58.4) and passed down as a prop. A query failure must never
  // break every page on the site (this layout wraps all of them) — falls
  // back to an empty list, which the Header itself already renders
  // gracefully (the Products label stays a plain functional link, no empty
  // dropdown — §52.10/§58.11).
  let productFamilies: HeaderProductFamilyShortcut[] = [];
  try {
    productFamilies = await listHeaderProductFamilyShortcuts(locale);
  } catch (error) {
    console.error("HEADER_PRODUCT_FAMILIES_READ_ERROR", JSON.stringify({ message: error instanceof Error ? error.message : String(error) }));
  }

  // Real Odoo -> Public Processing Projection -> Header data source (P5/P6,
  // AHANASSA_HEADER_FINAL_FROZEN_V2.0.md §26/§52.6/§58.3) — same
  // fetched-once-per-request/server-rendered/graceful-empty-fallback
  // pattern as `productFamilies` immediately above, deliberately not
  // consolidated into one call: the two read models are independent
  // DB_PUBLIC projections (`lib/catalog/` vs `lib/processing/`) with
  // independent failure modes, so one query failing must never affect the
  // other. An empty result is a valid, non-error outcome the Header
  // already renders gracefully (the Services label stays a plain
  // functional link, no empty dropdown — §52.10/§58.11) — never
  // backfilled with a hardcoded fallback list (P6 §6/§7).
  let serviceGroups: PublicProcessingGroup[] = [];
  try {
    serviceGroups = await listPublicProcessingGroups(locale);
  } catch (error) {
    console.error("HEADER_SERVICE_GROUPS_READ_ERROR", JSON.stringify({ message: error instanceof Error ? error.message : String(error) }));
  }

  return (
    <html lang={locale} dir={direction} className={estedad.variable}>
      <body>
        <SkipLink label={skipLinkLabel[locale]} />
        <SiteHeader locale={locale} productFamilies={productFamilies} serviceGroups={serviceGroups} />
        <main id="main-content">{children}</main>
        <SiteFooter locale={locale} />
      </body>
    </html>
  );
}
