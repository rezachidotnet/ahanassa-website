import fs from "node:fs";
import path from "node:path";
import type { Locale } from "../../config/locales.ts";
import { categoryContainsVariant, categoryPathSegment, claimedFormCodes, parseCategoryRow } from "../catalog/public-categories.ts";
import { withMarketName } from "../content/category-nav.ts";
import type { DownloadCatalog, DownloadCategory } from "./model.ts";

/**
 * Tests only: a DownloadCatalog straight from a snapshot file, with the publication rule of the catalog
 * repository written out in JS (template active + public with an approved, published, titled product row in
 * the locale; variants active + public; category membership by group/form). The build itself reads the same
 * data through lib/downloads/source.ts and the repository.
 */
interface Row extends Record<string, unknown> {}

/** A variant's dimensions / nominal weight by SKU, replacing the snapshot's (W20.5 fixture, see catalogFromSnapshot). */
export type VariantOverlay = Readonly<Record<string, { dimensions?: Record<string, number>; nominal_weight?: Record<string, number> }>>;

/**
 * `overlay` (W20.5): per SKU, the dimensions / nominal weight that replace the snapshot's — e.g. the full section
 * geometry of lib/downloads/fixtures/w205-sections.json, which Odoo serves since ahanassa_marketplace 19.0.54.
 */
export function catalogFromSnapshot(file: string, locale: Locale, overlay: VariantOverlay = {}): DownloadCatalog {
  const s = JSON.parse(fs.readFileSync(path.resolve(file), "utf8")) as { tables: Record<string, Row[]> };
  const t = s.tables;
  const categoriesAll = (loc: Locale) =>
    t.catalog_public_categories
      .filter((c) => c.locale === loc)
      .sort((a, b) => Number(a.position) - Number(b.position))
      .map((c) => parseCategoryRow(c as never))
      .filter((c) => c !== null)
      .map((c) => withMarketName(c, loc));
  const categories = categoriesAll(locale);
  const faNames = new Map(categoriesAll("fa").map((c) => [c.code, c.name]));
  const claimed = claimedFormCodes(categories);
  const dates: string[] = [];
  const templates = t.catalog_products
    .filter((p) => p.is_active === 1 && p.is_public === 1)
    .flatMap((p) => {
      const seo = t.product_seo_contents.find((r) => r.entity_type === "product" && r.entity_id === p.id && r.locale === locale && r.content_quality_status === "approved" && r.published_at && r.h1);
      if (!seo) return [];
      dates.push(String(p.updated_at), String(seo.updated_at));
      const variants = t.product_variants.filter((v) => v.product_id === p.id && v.is_active === 1 && v.is_public === 1);
      return [{ p, seo, variants }];
    });
  const out: DownloadCategory[] = categories.map((c) => ({
    code: c.code,
    segment: categoryPathSegment(c.code),
    name: c.name,
    nameFa: faNames.get(c.code) ?? c.name,
    templates: templates
      .filter(({ variants }) => variants.some((v) => categoryContainsVariant(c, claimed, v.group_code as string, v.form_code as string)))
      .map(({ p, seo, variants }) => ({
        slug: String(seo.slug),
        name: String(seo.h1),
        updatedAt: [String(p.updated_at), String(seo.updated_at)].sort().at(-1) as string,
        variants: variants.map((v) => ({
          sku: String(v.sku),
          xid: String(v.xid),
          size: String(v.commercial_size ?? v.section_size ?? v.sku),
          formCode: (v.form_code as string) ?? null,
          dimensions: overlay[String(v.sku)]?.dimensions ?? (v.dimensions_json ? JSON.parse(String(v.dimensions_json)) : null),
          nominalWeight: overlay[String(v.sku)]?.nominal_weight ?? (v.nominal_weight_json ? JSON.parse(String(v.nominal_weight_json)) : null),
          standard: (v.standard_name as string) ?? null,
          grade: (v.grade_name as string) ?? null,
        })),
      })),
  }));
  return { locale, categories: out.filter((c) => c.templates.length), contentDate: dates.sort().at(-1) ?? "2026-01-01T00:00:00.000Z" };
}
