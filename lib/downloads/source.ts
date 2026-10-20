import type { Locale } from "../../config/locales.ts";
import { getPublishedCatalogTemplateBySlug, listPublicCatalogCategories, listPublishedCatalogTemplates } from "../catalog/editorial-repository.ts";
import { categoryPathSegment, resolveCategoryFilter } from "../catalog/public-categories.ts";
import type { DownloadCatalog, DownloadCategory, DownloadTemplate } from "./model.ts";

/**
 * W17.2 — the Download Center's catalog for one locale, read through the same repository and publication
 * rule as /products and the category pages (the static build reads the snapshot). The /downloads page and the
 * build's generators (scripts/static/build.ts) both call this, so the page lists exactly the files the build
 * writes.
 */
export async function loadDownloadCatalog(locale: Locale): Promise<DownloadCatalog> {
  const categories = await listPublicCatalogCategories(locale);
  const faNames = new Map((locale === "fa" ? categories : await listPublicCatalogCategories("fa")).map((c) => [c.code, c.name]));
  const templateCache = new Map<string, DownloadTemplate | null>();
  const dates: string[] = [];
  const loadTemplate = async (slug: string): Promise<DownloadTemplate | null> => {
    if (!templateCache.has(slug)) {
      const detail = await getPublishedCatalogTemplateBySlug(locale, slug);
      if (detail) dates.push(detail.product.updatedAt, detail.seo.updatedAt);
      templateCache.set(
        slug,
        detail && detail.variants.length
          ? {
              slug,
              name: detail.seo.h1 ?? detail.product.commercialTemplateName,
              updatedAt: [detail.product.updatedAt, detail.seo.updatedAt].reduce((a, b) => (b > a ? b : a)),
              variants: detail.variants.map((v) => ({
                sku: v.sku,
                xid: v.xid,
                size: v.commercialSize ?? v.sectionSize ?? v.sku,
                formCode: v.form.code,
                dimensions: v.dimensions,
                nominalWeight: v.nominalWeight,
                standard: v.standard.name ?? v.standard.code,
                grade: v.grade.name ?? v.grade.code,
              })),
            }
          : null,
      );
    }
    return templateCache.get(slug) ?? null;
  };
  const out: DownloadCategory[] = [];
  for (const category of categories) {
    const listed = await listPublishedCatalogTemplates(locale, { categoryCode: category.code, ...resolveCategoryFilter(categories, category.code) });
    const templates: DownloadTemplate[] = [];
    for (const t of listed) {
      const template = await loadTemplate(t.seo.slug);
      if (template) templates.push(template);
    }
    if (templates.length) out.push({ code: category.code, segment: categoryPathSegment(category.code), name: category.name, nameFa: faNames.get(category.code) ?? category.name, templates });
  }
  return { locale, categories: out, contentDate: dates.reduce((a, b) => (b > a ? b : a), "1970-01-01T00:00:00.000Z") };
}
