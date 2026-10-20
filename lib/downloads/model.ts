import type { Locale } from "../../config/locales.ts";
import { planSectionDrawing, type SectionDrawing, type SectionPlan } from "./sections.ts";
import { compareCommercialSize } from "../catalog/specification-presenter.ts";

/**
 * W17.2 — the Download Center's data: the published public catalog of one locale (categories in Odoo's
 * order, the templates the site publishes in that locale, their public variants), as the /downloads page and
 * the build's generators both read it (lib/downloads/source.ts fills it from the catalog repository). No price
 * field exists here, so no download can carry one.
 */
export interface DownloadVariant {
  sku: string;
  /** W20.8: canonical variant id, only for the RFQ hand-off link (`/contact?variant=`) and the price lookup. */
  xid: string;
  /** Odoo's commercial size, the table's first column. */
  size: string;
  formCode: string | null;
  dimensions: Record<string, number> | null;
  nominalWeight: Record<string, number> | null;
  standard: string | null;
  grade: string | null;
}

export interface DownloadTemplate {
  slug: string;
  /** The template's published h1 in this locale. */
  name: string;
  /** W20.8: the newest product / editorial update of this template, ISO (the family's "last updated" line). */
  updatedAt: string;
  variants: DownloadVariant[];
}

export interface DownloadCategory {
  code: string;
  /** Listing segment (e.g. "box-section"): the spec sheet's file name. */
  segment: string;
  /** Odoo's name in this locale (fa: the owner's market name for the W9.8 flat categories). */
  name: string;
  /** The fa market name, shown on en/ar documents for buyers who order in Iran. */
  nameFa: string;
  templates: DownloadTemplate[];
}

export interface DownloadCatalog {
  locale: Locale;
  categories: DownloadCategory[];
  /** Content date (the newest product/editorial update), ISO. */
  contentDate: string;
}

const distinct = (values: Array<string | null>) => [...new Set(values.filter((v): v is string => Boolean(v)))];

/** A template's standards / grades as one display string each ("EN 10219-2"; "S235JR, S355JR"), or null. */
export function templateStandard(t: DownloadTemplate): string | null {
  return distinct(t.variants.map((v) => v.standard)).join(", ") || null;
}
export function templateGrade(t: DownloadTemplate): string | null {
  return distinct(t.variants.map((v) => v.grade)).join(", ") || null;
}

export function sortBySize<T extends { size: string; sku: string }>(variants: readonly T[]): T[] {
  return [...variants].sort((a, b) => compareCommercialSize(a.size, b.size) || (a.sku < b.sku ? -1 : a.sku > b.sku ? 1 : 0));
}

/** Each template once, in the first category (Odoo order) that lists it: the catalog's chapters. */
export function catalogChapters(catalog: DownloadCatalog): DownloadCategory[] {
  const seen = new Set<string>();
  return catalog.categories
    .map((c) => ({ ...c, templates: c.templates.filter((t) => !seen.has(t.slug) && seen.add(t.slug)) }))
    .filter((c) => c.templates.length > 0);
}

/** W20.8: the catalog row a drawing was made from (the /downloads row, the per-size PDF sheet). */
export interface DrawnSize {
  categoryCode: string;
  templateSlug: string;
  variant: DownloadVariant;
}

export interface DrawingPlan {
  drawn: Array<SectionDrawing & DrawnSize>;
  skipped: Array<Extract<SectionPlan, { status: "skipped" }> & { categoryCode: string; size: string }>;
}

/** Every section size of the catalog, drawn or skipped (with the reason), each slug once, in catalog order. */
export function planDrawings(catalog: DownloadCatalog): DrawingPlan {
  const plan: DrawingPlan = { drawn: [], skipped: [] };
  const seen = new Set<string>();
  for (const category of catalogChapters(catalog)) {
    for (const t of category.templates) {
      for (const v of sortBySize(t.variants)) {
        const p = planSectionDrawing({ formCode: v.formCode, commercialSize: v.size, dimensions: v.dimensions, standard: v.standard, kgPerM: v.nominalWeight?.kg_m ?? null });
        if (!p) continue;
        const slug = p.status === "drawn" ? p.drawing.slug : p.slug;
        if (seen.has(slug)) continue;
        seen.add(slug);
        if (p.status === "drawn") plan.drawn.push({ ...p.drawing, categoryCode: category.code, templateSlug: t.slug, variant: v });
        else plan.skipped.push({ ...p, categoryCode: category.code, size: v.size });
      }
    }
  }
  return plan;
}

/** The skipped sizes grouped by form and reason, for the build log and the /downloads "pending" note. */
export function summarizeSkipped(skipped: DrawingPlan["skipped"]): Array<{ formCode: string; categoryCode: string; reason: string; sizes: string[] }> {
  const groups = new Map<string, { formCode: string; categoryCode: string; reason: string; sizes: string[] }>();
  for (const s of skipped) {
    const key = `${s.formCode}\u0000${s.reason}`;
    const g = groups.get(key) ?? { formCode: s.formCode, categoryCode: s.categoryCode, reason: s.reason, sizes: [] };
    g.sizes.push(s.size);
    groups.set(key, g);
  }
  return [...groups.values()];
}
