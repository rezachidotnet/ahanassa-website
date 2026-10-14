import { localizedPath, type Locale } from "@/config/locales";
import Link from "@/components/ui/link";
import { cardVariants } from "@/components/ui/surface-variants";
import { listPublicCatalogCategories, listPublishedCatalogTemplates } from "@/lib/catalog/editorial-repository";
import { categoryListingPath, findCategoryForVariant, resolveCategoryFilter } from "@/lib/catalog/public-categories";
import { CATEGORIES_WITHOUT_CALCULATOR, CATEGORY_SEO } from "@/lib/content/category-seo";
import { listPublishedHubFamilies } from "@/lib/pricing/price-page-data";
import { priceHubPath } from "@/lib/pricing/price-hubs";
import { isWeightCalculatorPublished, WEIGHT_CALCULATOR_ROUTE } from "@/lib/weight-calculator/publication";
import { listArticlesForProduct } from "@/lib/articles/repository";
import { articlePath } from "@/lib/articles/routes";

const COPY: Record<Locale, { title: string; category: (name: string) => string; siblings: string; hub: (name: string) => string; calculator: (name: string) => string; articles: string }> = {
  fa: { title: "صفحه‌های مرتبط", category: (n) => `همه انواع ${n}`, siblings: "گریدها و انواع دیگر این گروه", hub: (n) => `قیمت روز همه انواع ${n}`, calculator: (n) => `محاسبه وزن ${n}`, articles: "مقاله‌های مرتبط" },
  ar: { title: "صفحات ذات صلة", category: (n) => `جميع أنواع ${n}`, siblings: "درجات وأنواع أخرى في هذه الفئة", hub: (n) => `أسعار ${n} اليوم`, calculator: (n) => `حساب وزن ${n}`, articles: "مقالات ذات صلة" },
  en: { title: "Related pages", category: (n) => `All ${n}`, siblings: "Other grades and types in this category", hub: () => "", calculator: (n) => `Weight calculator for ${n}`, articles: "Related articles" },
};

const LINK = "text-navy hover:text-copper underline-offset-4 hover:underline";

/**
 * W16.3 (D-SEO, keyword map §8 item 3) — the product page's internal links, below the specifications: its
 * category, the other published templates of that category (sibling grades, e.g. A2 ↔ A3 ↔ A4), the family
 * price hub (fa/ar, only on a day it is published), the weight calculator (its published locales) and up to
 * three articles that list this product. Anchor text names the target, never another page's head term.
 *
 * Its own async boundary (as ProductSpecs): it reads the price snapshot, so its markup never shares the page
 * row that carries the target-specific robots value (lib/static/target-diff-gate.ts).
 */
export async function ProductRelatedLinks({ locale, templateXid, slug, groupCode, formCode }: { locale: Locale; templateXid: string; slug: string; groupCode: string | null; formCode: string | null }) {
  await Promise.resolve();
  const categories = await listPublicCatalogCategories(locale);
  const category = groupCode ? findCategoryForVariant(categories, groupCode, formCode) : undefined;
  const t = COPY[locale];
  const name = category ? (CATEGORY_SEO[category.code]?.[locale]?.name ?? category.name) : null;
  const siblings = category ? (await listPublishedCatalogTemplates(locale, { categoryCode: category.code, ...resolveCategoryFilter(categories, category.code) })).filter((p) => p.seo.slug !== slug) : [];
  const hub = category && (await listPublishedHubFamilies(locale)).some((f) => f === category.code);
  const articles = await listArticlesForProduct(locale, templateXid);

  const links: { href: string; label: string }[] = [];
  if (category && name) links.push({ href: categoryListingPath(category.code), label: t.category(name) });
  if (hub && category && name) links.push({ href: priceHubPath(category.code), label: t.hub(name) });
  if (isWeightCalculatorPublished(locale) && name && !(category && CATEGORIES_WITHOUT_CALCULATOR.has(category.code))) links.push({ href: WEIGHT_CALCULATOR_ROUTE, label: t.calculator(name) });
  if (links.length === 0 && siblings.length === 0 && articles.length === 0) return null;

  return (
    <section aria-labelledby="product-related" className="border-border bg-surface border-b section-y">
      <div className="container-x grid gap-6 lg:grid-cols-3">
        <div className={cardVariants({ variant: "panel" })}>
          <h2 id="product-related" className="text-navy text-lg font-bold">
            {t.title}
          </h2>
          <ul className="mt-4 grid gap-2 text-sm">
            {links.map((l) => (
              <li key={l.href}>
                <Link href={localizedPath(locale, l.href)} className={LINK}>
                  {l.label}
                </Link>
              </li>
            ))}
          </ul>
        </div>
        {siblings.length > 0 && (
          <div className={cardVariants({ variant: "panel" })}>
            <h2 className="text-navy text-lg font-bold">{t.siblings}</h2>
            <ul className="mt-4 grid gap-2 text-sm">
              {siblings.map((p) => (
                <li key={p.seo.slug}>
                  <Link href={localizedPath(locale, `/products/${p.seo.slug}`)} className={LINK}>
                    {p.seo.h1 ?? p.product.commercialTemplateName}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        )}
        {articles.length > 0 && (
          <div className={cardVariants({ variant: "panel" })}>
            <h2 className="text-navy text-lg font-bold">{t.articles}</h2>
            <ul className="mt-4 grid gap-2 text-sm">
              {articles.map((a) => (
                <li key={a.slug}>
                  <Link href={localizedPath(locale, articlePath(a.slug))} className={LINK}>
                    {a.title}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </section>
  );
}
