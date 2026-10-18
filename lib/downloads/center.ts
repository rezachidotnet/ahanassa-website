import type { Locale } from "../../config/locales.ts";
import { catalogChapters, planDrawings, type DownloadCatalog } from "./model.ts";
import { drawingPath, familyZipPath, rawMaterialsCatalogPath, sectionsCatalogPath, specSheetPath } from "./paths.ts";
import { SECTION_SHAPES } from "./sections.ts";
import { outlinePreview } from "./outline-path.ts";
import { sizeParts } from "./search.ts";
import type { DownloadSizes } from "./file-sizes.ts";

/**
 * W20.8 — the one-page Download Center's model: what /downloads renders, from the same catalog plan the build's
 * generators use (planDrawings), so every listed file is a file the build writes.
 *
 *   - families: each public category with section drawings, in catalog order (BEAM = IPE/IPN, CHANNEL = UPE/UPN,
 *     ANGLE, BOX_SECTION = SHS/RHS, PIPE — whatever the data holds), one row per drawn size;
 *   - otherSheets: the spec sheet of every other category (rebar, sheet, coil…), which has no drawing;
 *   - catalogs: the two catalog PDFs of the page's locale.
 *
 * No price field: the fa price link is decided by the caller's set of priced variant ids, never an amount.
 */

export interface DownloadFile {
  href: string;
  /** null = unknown (dev server/tests without the build's manifest). */
  bytes: number | null;
}

export interface CenterRow {
  slug: string;
  /** Odoo's commercial size, as the catalog prints it. */
  size: string;
  formCode: string;
  kgPerM: number | null;
  sku: string;
  xid: string;
  templateSlug: string;
  preview: { viewBox: string; d: string };
  /**
   * Search keys (lib/downloads/search.ts): sizeParts joined by "x", and the row's own text, lower-cased only —
   * the browser normalises it (normalizeSearchText), so an ar page never carries Persian letter forms.
   */
  sizeKey: string;
  searchText: string;
  dxf: DownloadFile;
  pdf: DownloadFile;
  priced: boolean;
}

export interface CenterFamily {
  code: string;
  segment: string;
  name: string;
  /** Form labels present, catalog order: "IPN / IPE". */
  forms: string;
  standards: string[];
  /** Newest template update of the family, ISO. */
  updatedAt: string;
  rows: CenterRow[];
  zip: DownloadFile;
  specSheet: DownloadFile;
}

export interface DownloadCenter {
  families: CenterFamily[];
  otherSheets: Array<{ code: string; name: string; file: DownloadFile }>;
  catalogs: { sections: DownloadFile; raw: DownloadFile };
  /** Every drawn size, all families. */
  total: number;
}

export function buildDownloadCenter(catalog: DownloadCatalog, options: { sizes?: DownloadSizes; pricedXids?: ReadonlySet<string> } = {}): DownloadCenter {
  const sizes = options.sizes ?? new Map<string, number>();
  const file = (href: string): DownloadFile => ({ href, bytes: sizes.get(href) ?? null });
  const locale: Locale = catalog.locale;
  const plan = planDrawings(catalog);
  const families: CenterFamily[] = [];
  const drawnCodes = new Set<string>();
  for (const chapter of catalogChapters(catalog)) {
    const drawn = plan.drawn.filter((d) => d.categoryCode === chapter.code);
    if (!drawn.length) continue;
    drawnCodes.add(chapter.code);
    const templates = new Map(chapter.templates.map((t) => [t.slug, t]));
    const rows = drawn.map((d): CenterRow => {
      const template = templates.get(d.templateSlug);
      return {
        slug: d.slug,
        size: d.variant.size,
        formCode: d.variant.formCode ?? "",
        kgPerM: d.variant.nominalWeight?.kg_m ?? null,
        sku: d.variant.sku,
        xid: d.variant.xid,
        templateSlug: d.templateSlug,
        preview: outlinePreview(d),
        sizeKey: sizeParts(d.variant.size).join("x"),
        searchText: `${d.variant.size} ${template?.name ?? ""}`.toLowerCase(),
        dxf: file(drawingPath(d.slug, "dxf")),
        pdf: file(drawingPath(d.slug, "pdf")),
        priced: options.pricedXids?.has(d.variant.xid) ?? false,
      };
    });
    const forms = [...new Set(drawn.map((d) => SECTION_SHAPES[d.variant.formCode ?? ""]?.label).filter((l): l is string => Boolean(l)))];
    const standards = [...new Set(drawn.map((d) => d.variant.standard).filter((s): s is string => Boolean(s)))];
    families.push({
      code: chapter.code,
      segment: chapter.segment,
      name: chapter.name,
      forms: forms.join(" / "),
      standards,
      updatedAt: chapter.templates.map((t) => t.updatedAt).reduce((a, b) => (b > a ? b : a), "1970-01-01T00:00:00.000Z"),
      rows,
      zip: file(familyZipPath(chapter.segment)),
      specSheet: file(specSheetPath(chapter.segment, locale)),
    });
  }
  return {
    families,
    otherSheets: catalog.categories.filter((c) => !drawnCodes.has(c.code)).map((c) => ({ code: c.code, name: c.name, file: file(specSheetPath(c.segment, locale)) })),
    catalogs: { sections: file(sectionsCatalogPath(locale)), raw: file(rawMaterialsCatalogPath(locale)) },
    total: families.reduce((n, f) => n + f.rows.length, 0),
  };
}

/** "18 KB" / «۱۸ کیلوبایت» / «١٨ كيلوبايت»; one decimal under 10 MB-units, whole numbers above. */
export function formatFileSize(locale: Locale, bytes: number): string {
  const units = { fa: ["بایت", "کیلوبایت", "مگابایت"], en: ["B", "KB", "MB"], ar: ["بايت", "كيلوبايت", "ميغابايت"] }[locale];
  const tag = locale === "fa" ? "fa-IR" : locale === "ar" ? "ar-EG" : "en-US";
  let v = bytes;
  let u = 0;
  while (v >= 1024 && u < 2) {
    v /= 1024;
    u++;
  }
  const digits = u === 0 || v >= 10 ? 0 : 1;
  return `${new Intl.NumberFormat(tag, { maximumFractionDigits: digits, minimumFractionDigits: 0 }).format(v)} ${units[u]}`;
}
