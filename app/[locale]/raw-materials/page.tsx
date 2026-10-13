import type { Metadata } from "next";
import { isLocale, localizedPath, type Locale } from "@/config/locales";
import { buildPageMetadata, buildLanguageAlternatesFromEntries } from "@/lib/metadata/resolve";
import { publicPageIndexable } from "@/lib/seo/indexing-policy";
import { RAW_MATERIAL_LOCALES, RAW_MATERIAL_SLUGS, RAW_MATERIALS, RAW_MATERIALS_ROUTE, RAW_MATERIALS_UI, rawMaterialPath } from "@/lib/content/raw-materials";
import { EXPORT_ROUTE, isExportPublished } from "@/lib/content/export";
import { PageHero } from "@/components/ui/page-hero";
import Link from "@/components/ui/link";
import { cardVariants } from "@/components/ui/surface-variants";
import { RfqOnlyBanner } from "@/components/raw-materials/rfq-only-banner";

interface PageProps {
  params: Promise<{ locale: string }>;
}

export function generateStaticParams(): { locale: Locale }[] {
  return RAW_MATERIAL_LOCALES.map((locale) => ({ locale }));
}

const pageLocale = (raw: string): Locale => (isLocale(raw) ? raw : "fa");

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const locale = pageLocale((await params).locale);
  const t = RAW_MATERIALS_UI[locale];
  return buildPageMetadata({
    locale,
    path: RAW_MATERIALS_ROUTE,
    title: t.hubTitle,
    description: t.hubDescription,
    indexable: publicPageIndexable(),
    languageAlternates: buildLanguageAlternatesFromEntries(RAW_MATERIAL_LOCALES.map((l) => ({ locale: l, path: RAW_MATERIALS_ROUTE }))),
  });
}

/**
 * W16.3 (D-SEO, keyword map §6 P2-1) — the raw-materials hub: billet, DRI, iron ore and briquette, RFQ-only
 * (lib/content/raw-materials.ts). No price anywhere.
 */
export default async function RawMaterialsPage({ params }: PageProps) {
  const locale = pageLocale((await params).locale);
  const t = RAW_MATERIALS_UI[locale];
  return (
    <>
      <PageHero locale={locale} eyebrow={t.eyebrow} title={t.hubH1} body={t.hubIntro} breadcrumb={[{ path: RAW_MATERIALS_ROUTE, label: t.eyebrow }]} />
      <section className="border-border bg-background border-b section-y">
        <div className="container-x grid gap-8">
          <div className="grid gap-6 md:grid-cols-2">
            {RAW_MATERIAL_SLUGS.map((slug) => {
              const m = RAW_MATERIALS[slug][locale];
              return (
                <div key={slug} className={cardVariants({ variant: "panel" })}>
                  <h2 className="text-navy text-lg font-bold">
                    <Link href={localizedPath(locale, rawMaterialPath(slug))} className="hover:text-copper underline-offset-4 hover:underline">
                      {m.h1}
                    </Link>
                  </h2>
                  <p className="text-muted-foreground mt-3 text-sm leading-relaxed">{m.summary}</p>
                  <Link href={localizedPath(locale, rawMaterialPath(slug))} className="text-navy hover:text-copper mt-4 inline-flex min-h-11 items-center text-sm font-semibold underline underline-offset-4">
                    {t.more}
                  </Link>
                </div>
              );
            })}
          </div>
          <div className="max-w-2xl">
            <RfqOnlyBanner locale={locale} />
          </div>
          {isExportPublished(locale) && (
            <Link href={localizedPath(locale, EXPORT_ROUTE)} className="text-navy hover:text-copper text-sm font-semibold underline underline-offset-4">
              {t.exportLink}
            </Link>
          )}
        </div>
      </section>
    </>
  );
}
