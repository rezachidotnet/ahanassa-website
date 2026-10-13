import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { isLocale, localizedPath, type Locale } from "@/config/locales";
import { buildPageMetadata, buildLanguageAlternatesFromEntries } from "@/lib/metadata/resolve";
import { publicPageIndexable } from "@/lib/seo/indexing-policy";
import { isRawMaterialSlug, RAW_MATERIAL_LOCALES, RAW_MATERIAL_SLUGS, RAW_MATERIALS, RAW_MATERIALS_ROUTE, RAW_MATERIALS_UI, rawMaterialPath } from "@/lib/content/raw-materials";
import { EXPORT_ROUTE, isExportPublished } from "@/lib/content/export";
import { PageHero } from "@/components/ui/page-hero";
import Link from "@/components/ui/link";
import { cardVariants } from "@/components/ui/surface-variants";
import { RfqOnlyBanner } from "@/components/raw-materials/rfq-only-banner";

interface PageProps {
  params: Promise<{ locale: string; material: string }>;
}

export function generateStaticParams({ params }: { params: { locale: string } }) {
  if (!isLocale(params.locale) || !RAW_MATERIAL_LOCALES.includes(params.locale)) return [];
  return RAW_MATERIAL_SLUGS.map((material) => ({ material }));
}

function resolve(rawLocale: string, material: string) {
  if (!isLocale(rawLocale) || !isRawMaterialSlug(material)) return null;
  return { locale: rawLocale as Locale, slug: material };
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { locale: rawLocale, material } = await params;
  const page = resolve(rawLocale, material);
  if (!page) return {};
  const m = RAW_MATERIALS[page.slug][page.locale];
  const path = rawMaterialPath(page.slug);
  return buildPageMetadata({
    locale: page.locale,
    path,
    title: m.title,
    description: m.description,
    indexable: publicPageIndexable(),
    languageAlternates: buildLanguageAlternatesFromEntries(RAW_MATERIAL_LOCALES.map((l) => ({ locale: l, path }))),
  });
}

/**
 * W16.3 (D-SEO, keyword map §5.6, §6 P2-1) — one raw material, RFQ-only: what it is, what a buyer specifies,
 * the documents to ask for, the RFQ-only banner. Never a price (lib/content/raw-materials.ts).
 */
export default async function RawMaterialPage({ params }: PageProps) {
  const { locale: rawLocale, material } = await params;
  const page = resolve(rawLocale, material);
  if (!page) notFound();
  const { locale, slug } = page;
  const m = RAW_MATERIALS[slug][locale];
  const t = RAW_MATERIALS_UI[locale];
  return (
    <>
      <PageHero
        locale={locale}
        eyebrow={t.eyebrow}
        title={m.h1}
        body={m.summary}
        breadcrumb={[
          { path: RAW_MATERIALS_ROUTE, label: t.eyebrow },
          { path: rawMaterialPath(slug), label: m.name },
        ]}
      />
      <section className="border-border bg-background border-b section-y">
        <div className="container-x grid gap-10 lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
          <div className="grid content-start gap-8">
            <div>
              <h2 className="text-navy text-2xl font-extrabold">{t.whatTitle}</h2>
              {m.what.map((p) => (
                <p key={p} className="text-muted-foreground mt-4 max-w-3xl leading-relaxed">
                  {p}
                </p>
              ))}
            </div>
            <div>
              <h2 className="text-navy text-2xl font-extrabold">{t.specifyTitle}</h2>
              <ul className="text-muted-foreground mt-4 grid max-w-3xl list-disc gap-2 ps-5 leading-relaxed">
                {m.specify.map((line) => (
                  <li key={line}>{line}</li>
                ))}
              </ul>
            </div>
            <div>
              <h2 className="text-navy text-2xl font-extrabold">{t.documentsTitle}</h2>
              <ul className="text-muted-foreground mt-4 grid max-w-3xl list-disc gap-2 ps-5 leading-relaxed">
                {m.documents.map((line) => (
                  <li key={line}>{line}</li>
                ))}
              </ul>
            </div>
          </div>
          <div className="grid content-start gap-6">
            <RfqOnlyBanner locale={locale} />
            <div className={cardVariants({ variant: "panel" })}>
              <h2 className="text-navy text-lg font-bold">{t.others}</h2>
              <ul className="mt-4 grid gap-2 text-sm">
                {RAW_MATERIAL_SLUGS.filter((s) => s !== slug).map((s) => (
                  <li key={s}>
                    <Link href={localizedPath(locale, rawMaterialPath(s))} className="text-navy hover:text-copper underline-offset-4 hover:underline">
                      {RAW_MATERIALS[s][locale].h1}
                    </Link>
                  </li>
                ))}
                <li>
                  <Link href={localizedPath(locale, RAW_MATERIALS_ROUTE)} className="text-navy hover:text-copper underline-offset-4 hover:underline">
                    {t.eyebrow}
                  </Link>
                </li>
                {isExportPublished(locale) && (
                  <li>
                    <Link href={localizedPath(locale, EXPORT_ROUTE)} className="text-navy hover:text-copper underline-offset-4 hover:underline">
                      {t.exportLink}
                    </Link>
                  </li>
                )}
              </ul>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
