import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { isLocale, localizedPath, type Locale } from "@/config/locales";
import { buildPageMetadata, buildLanguageAlternatesFromEntries } from "@/lib/metadata/resolve";
import { publicPageIndexable } from "@/lib/seo/indexing-policy";
import { listPublicCatalogCategories } from "@/lib/catalog/editorial-repository";
import { categoryListingPath } from "@/lib/catalog/public-categories";
import { EXPORT_LOCALES, EXPORT_ROUTE, exportCopy } from "@/lib/content/export";
import { RAW_MATERIAL_SLUGS, RAW_MATERIALS, RAW_MATERIALS_ROUTE, rawMaterialPath } from "@/lib/content/raw-materials";
import { isPricePagePublished, PRICE_PAGE_ROUTE } from "@/lib/pricing/price-page";
import { PageHero } from "@/components/ui/page-hero";
import { ButtonLink } from "@/components/ui/button";
import Link from "@/components/ui/link";
import { listIndicators } from "@/lib/indicators/repository";
import { isMarketIndicatorsLocale, MARKET_INDICATORS_COPY, MARKET_INDICATORS_ROUTE } from "@/lib/indicators/page";
import { cardVariants } from "@/components/ui/surface-variants";

interface PageProps {
  params: Promise<{ locale: string }>;
}

/** en and ar only (lib/content/export.ts) — the same list feeds hreflang, the sitemap and the fa redirect. */
export function generateStaticParams(): { locale: Locale }[] {
  return EXPORT_LOCALES.map((locale) => ({ locale }));
}

const LINK = "text-navy hover:text-copper underline-offset-4 hover:underline";

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { locale: rawLocale } = await params;
  const t = isLocale(rawLocale) ? exportCopy(rawLocale) : null;
  if (!t || !isLocale(rawLocale)) return {};
  return buildPageMetadata({
    locale: rawLocale,
    path: EXPORT_ROUTE,
    title: t.title,
    description: t.description,
    indexable: publicPageIndexable(),
    languageAlternates: buildLanguageAlternatesFromEntries(EXPORT_LOCALES.map((l) => ({ locale: l, path: EXPORT_ROUTE }))),
  });
}

/**
 * W16.3 (D-SEO; owner D-COMPANY-INFO: export to Iraq and other countries approved) — what Ahan Asa exports,
 * how to request, the RFQ link. en and ar; no price on either (lib/content/export.ts).
 */
export default async function ExportPage({ params }: PageProps) {
  const { locale: rawLocale } = await params;
  const t = isLocale(rawLocale) ? exportCopy(rawLocale) : null;
  if (!t || !isLocale(rawLocale)) notFound();
  const locale: Locale = rawLocale;
  const categories = (await listPublicCatalogCategories(locale)).filter((c) => t.categories[c.code]);
  return (
    <>
      <PageHero locale={locale} eyebrow={t.eyebrow} title={t.h1} body={t.intro[0]} breadcrumb={[{ path: EXPORT_ROUTE, label: t.eyebrow }]} />
      <section className="border-border bg-background border-b section-y">
        <div className="container-x grid gap-10">
          <p className="text-muted-foreground max-w-3xl leading-relaxed">{t.intro[1]}</p>
          <div>
            <h2 className="text-navy text-2xl font-extrabold">{t.productsTitle}</h2>
            <div className="mt-6 grid gap-6 md:grid-cols-2">
              <div className={cardVariants({ variant: "panel" })}>
                <h3 className="text-navy text-lg font-bold">{t.finishedTitle}</h3>
                <ul className="mt-4 grid gap-2 text-sm">
                  {categories.map((c) => (
                    <li key={c.code}>
                      <Link href={localizedPath(locale, categoryListingPath(c.code))} className={LINK}>
                        {t.categories[c.code]}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
              <div className={cardVariants({ variant: "panel" })}>
                <h3 className="text-navy text-lg font-bold">
                  <Link href={localizedPath(locale, RAW_MATERIALS_ROUTE)} className={LINK}>
                    {t.rawTitle}
                  </Link>
                </h3>
                <ul className="mt-4 grid gap-2 text-sm">
                  {RAW_MATERIAL_SLUGS.map((s) => (
                    <li key={s}>
                      <Link href={localizedPath(locale, rawMaterialPath(s))} className={LINK}>
                        {RAW_MATERIALS[s][locale].h1}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
          <div>
            <h2 className="text-navy text-2xl font-extrabold">{t.stepsTitle}</h2>
            <ol className="mt-6 grid gap-4 md:grid-cols-2">
              {t.steps.map((step, i) => (
                <li key={step.title} className={cardVariants({ variant: "panel" })}>
                  <p className="text-copper text-sm font-bold">{(i + 1).toLocaleString(locale === "ar" ? "ar-EG" : "en")}</p>
                  <h3 className="text-navy mt-1 text-lg font-bold">{step.title}</h3>
                  <p className="text-muted-foreground mt-2 text-sm leading-relaxed">{step.body}</p>
                </li>
              ))}
            </ol>
            <h3 className="text-navy mt-8 text-lg font-bold">{t.includeTitle}</h3>
            <ul className="text-muted-foreground mt-3 grid list-disc gap-1 ps-5 text-sm leading-relaxed">
              {t.include.map((line) => (
                <li key={line}>{line}</li>
              ))}
            </ul>
          </div>
          <div className="grid justify-items-start gap-4">
            <ButtonLink href={localizedPath(locale, "/contact")} variant="primary" size="md" className="h-auto min-h-12 py-3">
              {t.cta}
            </ButtonLink>
            {t.pricesNote && t.pricesLink && isPricePagePublished(locale) && (
              <p className="text-muted-foreground text-sm">
                {t.pricesNote}{" "}
                <Link href={localizedPath(locale, PRICE_PAGE_ROUTE)} className={LINK}>
                  {t.pricesLink}
                </Link>
              </p>
            )}
            {/* W18.2 (owner 2026-10-16): the market-indicators page, when this build publishes it. */}
            {isMarketIndicatorsLocale(locale) && (await listIndicators()).length > 0 && (
              <p className="text-muted-foreground text-sm">
                {MARKET_INDICATORS_COPY[locale].exportNote}{" "}
                <Link href={localizedPath(locale, MARKET_INDICATORS_ROUTE)} className={LINK}>
                  {MARKET_INDICATORS_COPY[locale].title}
                </Link>
              </p>
            )}
          </div>
        </div>
      </section>
    </>
  );
}
