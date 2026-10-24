import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { isLocale, localeConfig, localizedPath, type Locale } from "@/config/locales";
import { buildPageMetadata, buildLanguageAlternatesFromEntries } from "@/lib/metadata/resolve";
import { publicPageIndexable } from "@/lib/seo/indexing-policy";
import { siteConfig } from "@/lib/metadata/site";
import { articleSchema, faqPageSchema, jsonLdGraph } from "@/lib/seo/schema";
import { ALLOY_CALCULATOR_ANCHOR, ALLOY_CALCULATOR_PARAM, ALLOY_GRADE_SLUGS, ALLOY_GRADES, isAlloyGradeSlug, type AlloyGradeSlug } from "@/lib/alloy/grades";
import { ALLOY_FACTS, ALLOY_GRADE_COPY, ALLOY_GUIDES_UPDATED, ALLOY_STEEL_LOCALES, ALLOY_STEEL_ROUTE, ALLOY_UI, alloyDensityLabel, alloyFaq, alloyGradePath, localizeNumbers } from "@/lib/content/alloy-steel";
import { WEIGHT_CALCULATOR_ROUTE } from "@/lib/weight-calculator/publication";
import { hasArticles, listArticles } from "@/lib/articles/repository";
import { ARTICLES_ROUTE, articlePath } from "@/lib/articles/routes";
import type { ArticleLocale } from "@/lib/contracts/snapshot-articles";
import { PageHero } from "@/components/ui/page-hero";
import Link from "@/components/ui/link";
import { cardVariants } from "@/components/ui/surface-variants";
import { JsonLd } from "@/components/seo/JsonLd";
import { AlloyRfqBanner, AlloyWeightTables } from "@/components/alloy/alloy-parts";

interface PageProps {
  params: Promise<{ locale: string; grade: string }>;
}

export function generateStaticParams({ params }: { params: { locale: string } }) {
  if (!isLocale(params.locale) || !ALLOY_STEEL_LOCALES.includes(params.locale)) return [];
  return ALLOY_GRADE_SLUGS.map((grade) => ({ grade }));
}

function resolve(rawLocale: string, grade: string) {
  if (!isLocale(rawLocale) || !ALLOY_STEEL_LOCALES.includes(rawLocale) || !isAlloyGradeSlug(grade)) return null;
  return { locale: rawLocale as Locale, slug: grade };
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { locale: rawLocale, grade } = await params;
  const page = resolve(rawLocale, grade);
  if (!page) return {};
  const c = ALLOY_GRADE_COPY[page.slug][page.locale];
  const path = alloyGradePath(page.slug);
  return buildPageMetadata({
    locale: page.locale,
    path,
    title: c.title,
    description: c.description,
    indexable: publicPageIndexable(),
    languageAlternates: buildLanguageAlternatesFromEntries(ALLOY_STEEL_LOCALES.map((l) => ({ locale: l, path }))),
  });
}

const H2 = "text-navy text-2xl font-extrabold";
const LINK = "text-navy hover:text-copper underline-offset-4 hover:underline";
const HEAD = "border-border text-muted-foreground border-b bg-surface px-4 py-3 text-start text-xs font-bold";
const CELL = "border-b border-[var(--aa-color-neutral-100)] px-4 py-2.5 text-start align-top group-last:border-b-0";

/**
 * W43 (D-ALLOY-7) — one alloy/tool steel grade guide, price on request: equivalents, composition, delivery state,
 * heat treatment, uses, delivery forms and size ranges, the nominal weight tables at the grade's density, what to
 * put in a request, FAQ, and the RFQ banner whose button opens /contact with this grade (lib/alloy/rfq.ts).
 * Never a price (lib/content/alloy-steel.ts).
 */
export default async function AlloyGradePage({ params }: PageProps) {
  const { locale: rawLocale, grade } = await params;
  const page = resolve(rawLocale, grade);
  if (!page) notFound();
  const { locale, slug } = page;
  const c = ALLOY_GRADE_COPY[slug][locale];
  const t = ALLOY_UI[locale];
  return (
    <>
      <PageHero
        locale={locale}
        eyebrow={t.eyebrow}
        title={c.h1}
        body={c.summary}
        breadcrumb={[
          { path: ALLOY_STEEL_ROUTE, label: t.eyebrow },
          { path: alloyGradePath(slug), label: c.name },
        ]}
      />
      <GuideContent locale={locale} slug={slug} />
    </>
  );
}

/**
 * r4 isolation (as ArticleContent and ProductSpecs): this async boundary always suspends once, so the guide gets
 * its own Flight row, away from the page row that carries the target-specific robots value
 * (lib/static/target-diff-gate.ts).
 */
async function GuideContent({ locale, slug }: { locale: Locale; slug: AlloyGradeSlug }) {
  await Promise.resolve();
  const g = ALLOY_GRADES[slug];
  const f = ALLOY_FACTS[slug];
  const c = ALLOY_GRADE_COPY[slug][locale];
  const t = ALLOY_UI[locale];
  const faq = alloyFaq(locale, slug);
  const url = `${siteConfig.baseUrl}${localizedPath(locale, alloyGradePath(slug))}`;
  const articlesPublished = await hasArticles(locale);
  const tokens = f.articleTokens.map((w) => w.toLowerCase());
  const articles = articlesPublished ? (await listArticles(locale as ArticleLocale)).filter((a) => tokens.some((w) => a.title.toLowerCase().includes(w))).slice(0, 3) : [];
  const n = (text: string) => localizeNumbers(locale, text);
  const equivalents: [string, string][] = [
    [t.equivalents.wnr, g.wnr],
    [t.equivalents.en, g.enName],
    [t.equivalents.standard, g.standard],
    [t.equivalents.aisi, g.aisi],
    [t.equivalents.market, c.market],
    [t.equivalents.density, `${alloyDensityLabel(locale, slug)} ${t.densityUnit}`],
  ];
  const jsonLd = jsonLdGraph([
    articleSchema({ url, headline: c.h1, description: c.description, inLanguage: localeConfig[locale].languageTag, datePublished: ALLOY_GUIDES_UPDATED, dateModified: ALLOY_GUIDES_UPDATED }),
    ...[faqPageSchema(faq)].filter((node) => node !== null),
  ]);

  return (
    <section className="border-border bg-background border-b section-y" data-aa-alloy-grade={slug}>
      <JsonLd data={jsonLd} />
      <div className="container-x grid gap-10 lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
        <div className="grid min-w-0 content-start gap-10">
          <div>
            {c.intro.map((p) => (
              <p key={p} className="text-muted-foreground mb-4 max-w-3xl leading-relaxed last:mb-0">
                {p}
              </p>
            ))}
          </div>

          <div>
            <h2 className={H2}>{t.equivalentsTitle}</h2>
            <dl className="divide-border border-border mt-4 grid max-w-3xl divide-y rounded-[var(--aa-radius-card)] border text-sm">
              {equivalents.map(([label, value]) => (
                <div key={label} className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1 px-4 py-3">
                  <dt className="text-muted-foreground">{label}</dt>
                  <dd className="text-navy font-semibold">
                    <bdi>{value}</bdi>
                  </dd>
                </div>
              ))}
            </dl>
          </div>

          <div>
            <h2 className={H2}>{t.chemistryTitle}</h2>
            <div role="region" aria-label={t.chemistryTitle} tabIndex={0} className="border-border relative mt-4 max-w-xl overflow-x-auto rounded-[var(--aa-radius-card)] border">
              <table className="text-ui w-full border-separate border-spacing-0 text-start text-sm">
                <thead>
                  <tr>
                    <th scope="col" className={HEAD}>
                      {t.element}
                    </th>
                    <th scope="col" className={HEAD}>
                      {t.range}
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {f.chemistry.map(([element, range]) => (
                    <tr key={element} className="group">
                      <th scope="row" className={`${CELL} font-semibold`}>
                        {element}
                      </th>
                      <td className={`${CELL} whitespace-nowrap`}>
                        <bdi>{n(range)}</bdi>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p className="text-muted-foreground mt-3 max-w-3xl text-xs leading-relaxed">{t.chemistryNote(g.standard)}</p>
          </div>

          <div>
            <h2 className={H2}>{t.deliveryTitle}</h2>
            <p className="text-muted-foreground mt-4 max-w-3xl leading-relaxed">{c.delivery}</p>
            <h3 className="text-navy mt-6 text-lg font-bold">{t.heatTitle}</h3>
            <p className="text-muted-foreground mt-3 max-w-3xl leading-relaxed">{c.heatTreatment}</p>
          </div>

          <div>
            <h2 className={H2}>{t.usesTitle}</h2>
            <ul className="text-muted-foreground mt-4 grid max-w-3xl list-disc gap-2 ps-5 leading-relaxed">
              {c.uses.map((line) => (
                <li key={line}>{line}</li>
              ))}
            </ul>
          </div>

          <div>
            <h2 className={H2}>{t.formsTitle}</h2>
            <dl className="divide-border border-border mt-4 grid max-w-3xl divide-y rounded-[var(--aa-radius-card)] border text-sm">
              {f.forms.map((form) => (
                <div key={form.kind} className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1 px-4 py-3">
                  <dt className="text-navy font-semibold">{t.forms[form.kind]}</dt>
                  <dd className="text-muted-foreground" dir="ltr">
                    <bdi>{n(form.range)}</bdi>
                  </dd>
                </div>
              ))}
            </dl>
            <p className="text-muted-foreground mt-3 max-w-3xl text-xs leading-relaxed">{t.formsNote}</p>
          </div>

          <div id="weights">
            <h2 className={H2}>{t.weightTitle}</h2>
            <div className="mt-4">
              <AlloyWeightTables locale={locale} slug={slug} />
            </div>
          </div>

          <div>
            <h2 className={H2}>{t.specifyTitle}</h2>
            <ul className="text-muted-foreground mt-4 grid max-w-3xl list-disc gap-2 ps-5 leading-relaxed">
              {t.specify.map((line) => (
                <li key={line}>{line}</li>
              ))}
            </ul>
            <h3 className="text-navy mt-6 text-lg font-bold">{t.documentsTitle}</h3>
            <ul className="text-muted-foreground mt-3 grid max-w-3xl list-disc gap-2 ps-5 leading-relaxed">
              {t.documents.map((line) => (
                <li key={line}>{line}</li>
              ))}
            </ul>
          </div>

          <div>
            <h2 className={H2}>{t.faqTitle}</h2>
            <div className="mt-6 grid max-w-3xl gap-3">
              {faq.map((item) => (
                <details key={item.q} className="border-border group bg-background open:bg-surface rounded-[var(--aa-radius-card)] border px-5 py-4">
                  <summary className="text-navy min-h-11 cursor-pointer content-center font-bold">{item.q}</summary>
                  <p className="mt-3 leading-[1.9] text-neutral-800">{item.a}</p>
                </details>
              ))}
            </div>
          </div>
        </div>

        <div className="grid content-start gap-6">
          <AlloyRfqBanner locale={locale} slug={slug} />
          <div className={cardVariants({ variant: "panel" })}>
            <h2 className="text-navy text-lg font-bold">{t.relatedTitle}</h2>
            <ul className="mt-4 grid gap-2 text-sm">
              {f.related.map((s) => (
                <li key={s}>
                  <Link href={localizedPath(locale, alloyGradePath(s))} className={LINK}>
                    {ALLOY_GRADE_COPY[s][locale].h1}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
          <div className={cardVariants({ variant: "panel" })}>
            <h2 className="text-navy text-lg font-bold">{t.linksTitle}</h2>
            <ul className="mt-4 grid gap-2 text-sm">
              <li>
                <Link href={localizedPath(locale, ALLOY_STEEL_ROUTE)} className={LINK}>
                  {t.hubLink}
                </Link>
              </li>
              <li>
                <Link href={`${localizedPath(locale, WEIGHT_CALCULATOR_ROUTE)}?${ALLOY_CALCULATOR_PARAM}=${slug}#${ALLOY_CALCULATOR_ANCHOR}`} className={LINK}>
                  {t.calculatorLink}
                </Link>
              </li>
              {articles.map((a) => (
                <li key={a.slug}>
                  <Link href={localizedPath(locale, articlePath(a.slug))} className={LINK}>
                    {a.title}
                  </Link>
                </li>
              ))}
              {articlesPublished && (
                <li>
                  <Link href={localizedPath(locale, ARTICLES_ROUTE)} className={LINK}>
                    {t.articlesLink}
                  </Link>
                </li>
              )}
            </ul>
          </div>
        </div>
      </div>
    </section>
  );
}
