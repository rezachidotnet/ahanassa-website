import type { Metadata } from "next";
import { isLocale, localizedPath, type Locale } from "@/config/locales";
import { buildPageMetadata, buildLanguageAlternatesFromEntries } from "@/lib/metadata/resolve";
import { publicPageIndexable } from "@/lib/seo/indexing-policy";
import { ALLOY_CALCULATOR_ANCHOR, ALLOY_GRADES } from "@/lib/alloy/grades";
import { ALLOY_GRADE_COPY, ALLOY_STEEL_LOCALES, ALLOY_STEEL_ROUTE, ALLOY_UI, alloyGradePath, alloyGradesOf } from "@/lib/content/alloy-steel";
import { WEIGHT_CALCULATOR_ROUTE } from "@/lib/weight-calculator/publication";
import { PageHero } from "@/components/ui/page-hero";
import Link from "@/components/ui/link";
import { cardVariants } from "@/components/ui/surface-variants";
import { AlloyRfqBanner } from "@/components/alloy/alloy-parts";

interface PageProps {
  params: Promise<{ locale: string }>;
}

export function generateStaticParams(): { locale: Locale }[] {
  return ALLOY_STEEL_LOCALES.map((locale) => ({ locale }));
}

const pageLocale = (raw: string): Locale => (isLocale(raw) ? raw : "fa");

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const locale = pageLocale((await params).locale);
  const t = ALLOY_UI[locale];
  return buildPageMetadata({
    locale,
    path: ALLOY_STEEL_ROUTE,
    title: t.hubTitle,
    description: t.hubDescription,
    indexable: publicPageIndexable(),
    languageAlternates: buildLanguageAlternatesFromEntries(ALLOY_STEEL_LOCALES.map((l) => ({ locale: l, path: ALLOY_STEEL_ROUTE }))),
  });
}

/**
 * W43 (D-ALLOY-7) — the «فولاد آلیاژی و ابزار» hub: one card per wave-1 grade, grouped engineering / tool steel,
 * the «قیمت با استعلام» banner. No price anywhere (lib/content/alloy-steel.ts).
 */
export default async function AlloySteelPage({ params }: PageProps) {
  const locale = pageLocale((await params).locale);
  const t = ALLOY_UI[locale];
  return (
    <>
      <PageHero locale={locale} eyebrow={t.eyebrow} title={t.hubH1} body={t.hubIntro} breadcrumb={[{ path: ALLOY_STEEL_ROUTE, label: t.eyebrow }]} />
      <section className="border-border bg-background border-b section-y">
        <div className="container-x grid gap-12">
          {(["engineering", "tool"] as const).map((group) => (
            <div key={group} className="grid gap-6">
              <div className="max-w-3xl">
                <h2 className="text-navy text-2xl font-extrabold">{t.groups[group].title}</h2>
                <p className="text-muted-foreground mt-3 leading-relaxed">{t.groups[group].body}</p>
              </div>
              <div className="grid gap-6 md:grid-cols-2">
                {alloyGradesOf(group).map((slug) => {
                  const c = ALLOY_GRADE_COPY[slug][locale];
                  const g = ALLOY_GRADES[slug];
                  return (
                    <div key={slug} className={cardVariants({ variant: "panel" })}>
                      <h3 className="text-navy text-lg font-bold">
                        <Link href={localizedPath(locale, alloyGradePath(slug))} className="hover:text-copper underline-offset-4 hover:underline">
                          {c.h1}
                        </Link>
                      </h3>
                      <p className="text-muted-foreground mt-2 text-xs font-semibold" dir="ltr">
                        <bdi>
                          {g.wnr} · {g.enName} · AISI {g.aisi}
                        </bdi>
                      </p>
                      <p className="text-muted-foreground mt-3 text-sm leading-relaxed">{c.summary}</p>
                      <Link href={localizedPath(locale, alloyGradePath(slug))} className="text-navy hover:text-copper mt-4 inline-flex min-h-11 items-center text-sm font-semibold underline underline-offset-4">
                        {t.more}
                      </Link>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
          <div className="grid gap-6 lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)] lg:items-start">
            <div className="grid content-start gap-4">
              <p className="text-muted-foreground max-w-3xl leading-relaxed">{t.moreGrades}</p>
              <Link href={`${localizedPath(locale, WEIGHT_CALCULATOR_ROUTE)}#${ALLOY_CALCULATOR_ANCHOR}`} className="text-navy hover:text-copper inline-flex min-h-11 items-center text-sm font-semibold underline underline-offset-4">
                {t.calculatorHubLink}
              </Link>
            </div>
            <AlloyRfqBanner locale={locale} />
          </div>
        </div>
      </section>
    </>
  );
}
