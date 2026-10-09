import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ArrowUpRight, ChevronRight } from "lucide-react";
import Link from "@/components/ui/link";
import { ButtonLink } from "@/components/ui/button";
import { cardVariants } from "@/components/ui/surface-variants";
import { ArticleBody } from "@/components/articles/article-body";
import { ArticleCard } from "@/components/articles/article-card";
import { isLocale, localizedPath } from "@/config/locales";
import { buildLanguageAlternatesFromEntries, buildPageMetadata, robotsMetaContent } from "@/lib/metadata/resolve";
import { siteConfig } from "@/lib/metadata/site";
import { publicPageIndexable } from "@/lib/seo/indexing-policy";
import { listPublishedCatalogTemplates } from "@/lib/catalog/editorial-repository";
import { ARTICLE_COPY, formatArticleDate } from "@/lib/articles/copy";
import { categoryLabel, getArticle, listArticles, listRelatedArticles, type Article } from "@/lib/articles/repository";
import { ARTICLE_COVER_SIZE, ARTICLE_TEXT_ATTRIBUTE, ARTICLES_ROUTE, articleCoverPath, articleListingPath, articlePath } from "@/lib/articles/routes";
import { ARTICLE_LOCALES, type ArticleLocale } from "@/lib/contracts/snapshot-articles";

interface PageProps {
  params: Promise<{ locale: string; slug: string }>;
}

/** Every article of the locale in this build's snapshot. */
export async function generateStaticParams({ params }: { params: { locale: string } }) {
  return isLocale(params.locale) ? (await listArticles(params.locale)).map((a) => ({ slug: a.slug })) : [];
}

async function load(params: PageProps["params"]): Promise<Article> {
  const { locale, slug } = await params;
  const article = isLocale(locale) ? await getArticle(locale, slug) : null;
  if (!article) notFound();
  return article;
}

/** hreflang between the published translations only (lib/articles/validate.ts keeps reciprocal pairs only). */
const alternates = (a: Article) => buildLanguageAlternatesFromEntries(ARTICLE_LOCALES.filter((l) => a.translations[l]).map((l) => ({ locale: l, path: articlePath(a.translations[l]!) })));

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const a = await load(params);
  return buildPageMetadata({
    locale: a.locale,
    path: articlePath(a.slug),
    title: a.title,
    description: a.description,
    indexable: publicPageIndexable(),
    languageAlternates: alternates(a),
    image: { url: `${siteConfig.baseUrl}${articleCoverPath(a.locale, a.slug, "png")}`, ...ARTICLE_COVER_SIZE, alt: a.title },
    article: { publishedTime: a.date, modifiedTime: a.updated },
    // r4: the robots <meta> is the last element of ArticleContent's own row (see buildPageMetadata).
    robotsInPage: true,
  });
}

const CRUMB = "inline-flex min-h-11 items-center transition-colors hover:text-white hover:underline underline-offset-4";
const HOME: Record<ArticleLocale, string> = { fa: "خانه", en: "Home", ar: "الرئيسية" };
/** A source is linked only when it is a web page; an API endpoint is named, not linked. */
const linkableSource = (url: string) => /^https?:\/\//i.test(url) && !/\/api\//i.test(new URL(url).pathname);

function RfqBox({ locale, className }: { locale: ArticleLocale; className?: string }) {
  const t = ARTICLE_COPY[locale];
  return (
    <div className={cardVariants({ variant: "panel", tone: "subtle", className })}>
      <p className="text-navy font-bold">{t.rfq}</p>
      <p className="text-muted-foreground mt-2 text-sm leading-relaxed">{t.rfqBody}</p>
      <ButtonLink href={localizedPath(locale, "/contact")} variant="primary" className="mt-4 w-full">
        {t.rfq}
      </ButtonLink>
    </div>
  );
}

/**
 * W11.1 — one article (docs/ARTICLES.md): title, dates («به‌روزرسانی»), reading time, cover, table of
 * contents, body, FAQ, sources, related product cards (`related_products`), «استعلام قیمت», related
 * articles and the author line. No JSON-LD yet (SEO phase). Build-time snapshot only.
 */
export default async function ArticlePage({ params }: PageProps) {
  return <ArticleContent a={await load(params)} />;
}

/**
 * r4 isolation (as ProductSpecs on the product page): this async boundary always suspends once, so the
 * article gets its own Flight row, away from the page row that carries the target-specific robots value;
 * the article's length can then never move the point where React splits that row (lib/static/target-diff-gate.ts).
 */
async function ArticleContent({ a }: { a: Article }) {
  await Promise.resolve();
  const locale = a.locale;
  const t = ARTICLE_COPY[locale];
  const category = categoryLabel(a.category, locale);
  const published = await listPublishedCatalogTemplates(locale);
  const products = a.relatedProducts.map((id) => published.find((p) => p.product.templateXid === id)).filter((p) => p !== undefined);
  const related = await listRelatedArticles(a);

  return (
    <article>
      <header className="bg-navy on-inverse relative isolate overflow-hidden">
        <div className="hairline-grid absolute inset-0" aria-hidden="true" />
        <div className="container-x relative py-14 lg:py-20">
          <nav aria-label={HOME[locale]} className="mb-6">
            <ol className="text-on-inverse-muted flex flex-wrap items-center gap-x-1.5 text-xs">
              {[
                { href: localizedPath(locale, "/"), label: HOME[locale] },
                { href: localizedPath(locale, ARTICLES_ROUTE), label: t.nav },
                { href: localizedPath(locale, articleListingPath(1, a.category)), label: category },
              ].map((c, i) => (
                <li key={c.href} className="flex items-center gap-1.5">
                  {i > 0 && <ChevronRight className="size-3.5 rtl:-scale-x-100" aria-hidden="true" />}
                  <Link href={c.href} className={CRUMB}>
                    {c.label}
                  </Link>
                </li>
              ))}
            </ol>
          </nav>
          <p className="eyebrow text-accent-on-inverse flex items-center gap-3">
            <span className="h-px w-8 bg-current" aria-hidden="true" />
            {category}
          </p>
          <h1 {...{ [ARTICLE_TEXT_ATTRIBUTE]: "title" }} className="mt-5 max-w-4xl text-3xl leading-[1.25] font-extrabold text-white sm:text-4xl lg:text-[2.75rem]">
            {a.title}
          </h1>
          <p {...{ [ARTICLE_TEXT_ATTRIBUTE]: "description" }} className="text-on-inverse-muted mt-5 max-w-3xl text-lg leading-relaxed">
            {a.description}
          </p>
          <dl className="text-on-inverse-muted mt-8 flex flex-wrap gap-x-6 gap-y-2 text-sm">
            <div className="flex gap-1.5">
              <dt>{t.published}:</dt>
              <dd className="font-semibold text-white">
                <time dateTime={a.date}>{formatArticleDate(a.date, locale)}</time>
              </dd>
            </div>
            <div className="flex gap-1.5">
              <dt>{t.updated}:</dt>
              <dd className="font-semibold text-white">
                <time dateTime={a.updated}>{formatArticleDate(a.updated, locale)}</time>
              </dd>
            </div>
            <div>
              <dt className="sr-only">{t.readingTime}</dt>
              <dd className="font-semibold text-white">{t.minutes(a.readingMinutes)}</dd>
            </div>
          </dl>
        </div>
      </header>

      <div className="border-border bg-background border-b section-y">
        <div className="container-x grid gap-10 lg:grid-cols-[minmax(0,1fr)_18rem] lg:gap-14">
          <div className="min-w-0">
            <picture>
              <source srcSet={articleCoverPath(locale, a.slug, "webp")} type="image/webp" />
              <img src={articleCoverPath(locale, a.slug, "png")} alt="" width={ARTICLE_COVER_SIZE.width} height={ARTICLE_COVER_SIZE.height} decoding="async" className="bg-navy aspect-[1200/630] h-auto w-full rounded-[var(--aa-radius-card)] object-cover" />
            </picture>

            {a.body.toc.length > 1 && (
              <details className="border-border bg-surface mt-8 rounded-[var(--aa-radius-card)] border p-5 lg:hidden">
                <summary className="text-navy min-h-11 cursor-pointer content-center font-bold">{t.toc}</summary>
                <ol className="mt-3 list-decimal space-y-2 ps-5 text-sm">
                  {a.body.toc.map((h) => (
                    <li key={h.id}>
                      <a href={`#${h.id}`} className="text-neutral-700 hover:text-copper underline-offset-4 hover:underline">
                        {h.text}
                      </a>
                    </li>
                  ))}
                </ol>
              </details>
            )}

            <div className="mt-10">
              <ArticleBody blocks={a.body.blocks} />
            </div>

            {a.faq.length > 0 && (
              <section aria-labelledby="article-faq" className="mt-14" {...{ [ARTICLE_TEXT_ATTRIBUTE]: "faq" }}>
                <h2 id="article-faq" className="text-navy text-2xl font-extrabold">
                  {t.faq}
                </h2>
                <div className="mt-6 grid gap-3">
                  {a.faq.map((f) => (
                    <details key={f.q} className="border-border group rounded-[var(--aa-radius-card)] border bg-background px-5 py-4 open:bg-surface">
                      <summary className="text-navy min-h-11 cursor-pointer content-center font-bold">{f.q}</summary>
                      <p className="mt-3 leading-[1.9] text-neutral-800">{f.a}</p>
                    </details>
                  ))}
                </div>
              </section>
            )}

            {a.sources.length > 0 && (
              <section aria-labelledby="article-sources" className="border-border mt-12 border-t pt-8" {...{ [ARTICLE_TEXT_ATTRIBUTE]: "sources" }}>
                <h2 id="article-sources" className="text-navy text-lg font-bold">
                  {t.sources}
                </h2>
                <ul className="text-muted-foreground mt-4 list-disc space-y-2 ps-5 text-sm">
                  {a.sources.map((s) => (
                    <li key={`${s.title}|${s.url}`}>
                      {linkableSource(s.url) ? (
                        <a href={s.url} target="_blank" rel="nofollow noopener noreferrer" className="hover:text-copper underline underline-offset-4">
                          {s.title}
                        </a>
                      ) : (
                        s.title
                      )}
                      {s.publisher && <span> — {s.publisher}</span>}
                    </li>
                  ))}
                </ul>
              </section>
            )}

            <p className="text-muted-foreground border-border mt-10 border-t pt-6 text-sm">
              {t.author} <span className="text-navy font-semibold">{a.author}</span>
            </p>
          </div>

          <aside className="grid content-start gap-6 lg:sticky lg:top-28 lg:self-start">
            {a.body.toc.length > 1 && (
              <nav aria-label={t.toc} className="hidden lg:block">
                <p className="text-navy font-bold">{t.toc}</p>
                <ol className="border-border mt-3 space-y-2 border-s ps-4 text-sm">
                  {a.body.toc.map((h) => (
                    <li key={h.id}>
                      <a href={`#${h.id}`} className="text-neutral-700 hover:text-copper underline-offset-4 hover:underline">
                        {h.text}
                      </a>
                    </li>
                  ))}
                </ol>
              </nav>
            )}
            <RfqBox locale={locale} />
          </aside>
        </div>
      </div>

      {products.length > 0 && (
        <section aria-labelledby="article-products" className="border-border bg-surface border-b section-y">
          <div className="container-x">
            <h2 id="article-products" className="text-navy text-2xl font-extrabold">
              {t.relatedProducts}
            </h2>
            <ul className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {products.map(({ product, seo }) => (
                <li key={product.templateXid} className="flex">
                  <Link href={localizedPath(locale, `/products/${seo.slug}`)} className={cardVariants({ variant: "interactive", className: "group w-full gap-3 p-6" })}>
                    <div className="flex items-start justify-between gap-3">
                      <h3 className="text-navy text-lg font-bold">{seo.h1}</h3>
                      <ArrowUpRight className="text-copper mt-1 size-4 shrink-0 opacity-0 transition-opacity group-hover:opacity-100 group-focus-visible:opacity-100 rtl:-scale-x-100" aria-hidden="true" />
                    </div>
                    {seo.intro && <p className="text-muted-foreground line-clamp-3 text-sm leading-relaxed">{seo.intro}</p>}
                  </Link>
                </li>
              ))}
            </ul>
            <ButtonLink href={localizedPath(locale, "/contact")} variant="primary" className="mt-8">
              {t.rfq}
            </ButtonLink>
          </div>
        </section>
      )}

      {related.length > 0 && (
        <section aria-labelledby="article-related" className="border-border bg-background border-b section-y">
          <div className="container-x">
            <h2 id="article-related" className="text-navy text-2xl font-extrabold">
              {t.relatedArticles}
            </h2>
            <ul className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {related.map((r) => (
                <li key={r.slug} className="flex">
                  <ArticleCard article={r} headingLevel={3} />
                </li>
              ))}
            </ul>
          </div>
        </section>
      )}
      {/* Last on purpose (r4, lib/metadata/resolve.ts robotsInPage); React hoists it into <head>. */}
      <meta name="robots" content={robotsMetaContent(publicPageIndexable())} />
    </article>
  );
}
