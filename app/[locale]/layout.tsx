import type { Metadata } from "next";
import { notFound } from "next/navigation";
import "../globals.css";
import { locales, isLocale, getDirection, type Locale } from "@/config/locales";
import { estedad } from "@/lib/fonts/estedad";
import { siteConfig, titleBrand } from "@/lib/metadata/site";
import { SkipLink } from "@/components/layout/SkipLink";
import { SiteHeader } from "@/components/layout/SiteHeader";
import { SiteFooter } from "@/components/layout/SiteFooter";
import { AnalyticsRuntime } from "@/components/analytics/analytics-runtime";
import { StickyWhatsApp } from "@/components/layout/sticky-whatsapp";
import { SiteLivechat } from "@/components/livechat/site-livechat";
import { listHeaderProductFamilyShortcuts, type HeaderProductFamilyShortcut } from "@/lib/catalog/editorial-repository";
import { listPublicProcessingGroups, type PublicProcessingGroup } from "@/lib/processing/public-repository";
import { hasArticles } from "@/lib/articles/repository";
import { listIndicators } from "@/lib/indicators/repository";

export function generateStaticParams() {
  return locales.map((locale) => ({ locale }));
}

export const dynamicParams = false;

/** W16.3 (D-SEO): the title suffix is the locale's brand (lib/metadata/site.ts#titleBrand) — "Ahan Assa" on en. */
export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale: rawLocale } = await params;
  const brand = titleBrand(isLocale(rawLocale) ? rawLocale : "fa");
  return {
    metadataBase: new URL(siteConfig.baseUrl),
    title: {
      default: brand,
      template: `%s | ${brand}`,
    },
  };
}

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
  // (docs/navigation/AHANASSA_HEADER_FINAL_FROZEN_V2.1.md §4.3/§58.2), fetched once per
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
  // docs/navigation/AHANASSA_HEADER_FINAL_FROZEN_V2.1.md §26/§52.6/§58.3) — same
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

  // W11.1: the «مقالات» item only in a locale whose build publishes articles (lib/content/nav.ts).
  const articlesPublished = await hasArticles(locale);
  // W18.2 (owner 2026-10-16): the en/ar footer links the market-indicators page, only when this build publishes it.
  const indicatorsPublished = (await listIndicators()).length > 0;

  return (
    <html lang={locale} dir={direction} className={estedad.variable}>
      <body>
        <SkipLink label={skipLinkLabel[locale]} />
        <SiteHeader locale={locale} productFamilies={productFamilies} serviceGroups={serviceGroups} hasArticles={articlesPublished} />
        <main id="main-content">{children}</main>
        <SiteFooter locale={locale} hasArticles={articlesPublished} hasIndicators={indicatorsPublished} />
        {/* W20.1: floating WhatsApp button, en/ar only (renders nothing on fa). */}
        <StickyWhatsApp locale={locale} />
        {/* W21.2: the live-chat panel + the fa floating «چت با کارشناس», only while config/livechat.ts is on (renders nothing otherwise). */}
        <SiteLivechat locale={locale} />
        {/* W16.4: dataLayer + phone/WhatsApp clicks + GTM after load (config/analytics.ts); renders nothing. */}
        <AnalyticsRuntime locale={locale} />
      </body>
    </html>
  );
}
