import fs from "node:fs";
import path from "node:path";
import type { Locale } from "../../config/locales.ts";
import { writeDxf } from "./dxf.ts";
import { writeSvg } from "./svg.ts";
import { planDrawings, type DownloadCatalog, type DrawingPlan } from "./model.ts";
import { MAX_PDF_BYTES, drawingPath, rawMaterialsCatalogPath, sectionsCatalogPath, specSheetPath } from "./paths.ts";
import { renderRawMaterialsCatalog, renderSectionsCatalog, renderSpecSheet, type RenderedPdf } from "./pdf/render.ts";
import { scanSourceNames } from "../static/source-name-scan.ts";

/**
 * W17.2 — the static build's Download Center step (scripts/static/build.ts): writes every DXF + SVG section
 * drawing, spec sheet and catalog PDF of the snapshot into public-assets/downloads/. Pure function of the
 * catalog data (no clock, no network), so the same snapshot gives byte-identical files.
 *
 * Refuses (throws) when a PDF is over MAX_PDF_BYTES, or when any drawn text has a price/currency token or a
 * private price-source name: no download may carry either.
 */

/** Currency and price-amount words that must never be drawn into a download (the PDFs have no price field). */
export const PRICE_TOKENS = /(ریال|تومان|﷼|\bIRR\b|\bIRT\b|\btoman\b|\brial\b|ريال|تومان|\$|\bUSD\b|\bEUR\b)/i;

export function checkDownloadTexts(texts: readonly string[], sourceNames: readonly string[] | null): string[] {
  const failures: string[] = [];
  for (const t of texts) if (PRICE_TOKENS.test(t)) failures.push(`price/currency token in a download text: ${t.slice(0, 80)}`);
  if (sourceNames?.length) for (const f of scanSourceNames([{ path: "downloads", content: texts.join("\n") }], sourceNames)) failures.push(`price source name in a download (name #${f.index} of the private list)`);
  return failures;
}

export interface DownloadsReport {
  files: Array<{ path: string; bytes: number }>;
  drawings: DrawingPlan["drawn"];
  skipped: DrawingPlan["skipped"];
  specSheets: number;
  catalogs: number;
}

export async function generateDownloads(publicDir: string, catalogs: readonly DownloadCatalog[], options: { sourceNames?: readonly string[] | null } = {}): Promise<DownloadsReport> {
  const files: DownloadsReport["files"] = [];
  const texts: string[] = [];
  const write = (urlPath: string, data: string | Uint8Array) => {
    const file = path.join(publicDir, urlPath.slice(1));
    fs.mkdirSync(path.dirname(file), { recursive: true });
    fs.writeFileSync(file, data);
    files.push({ path: urlPath, bytes: typeof data === "string" ? Buffer.byteLength(data) : data.byteLength });
  };
  const writePdf = (urlPath: string, pdf: RenderedPdf) => {
    if (pdf.bytes.byteLength > MAX_PDF_BYTES) throw new Error(`${urlPath}: ${pdf.bytes.byteLength} bytes is over the ${MAX_PDF_BYTES}-byte PDF limit`);
    texts.push(...pdf.texts);
    write(urlPath, pdf.bytes);
  };

  // Drawings: locale-independent; each slug once across the locales' catalogs.
  const drawn = new Map<string, DrawingPlan["drawn"][number]>();
  const skipped = new Map<string, DrawingPlan["skipped"][number]>();
  for (const catalog of catalogs) {
    const plan = planDrawings(catalog);
    for (const d of plan.drawn) drawn.set(d.slug, drawn.get(d.slug) ?? d);
    for (const s of plan.skipped) skipped.set(s.slug, skipped.get(s.slug) ?? s);
  }
  for (const d of drawn.values()) {
    write(drawingPath(d.slug, "dxf"), writeDxf(d));
    write(drawingPath(d.slug, "svg"), writeSvg(d));
    texts.push(d.title, ...d.layers.TEXT.flatMap((p) => (p.kind === "text" ? [p.text] : [])));
  }

  let specSheets = 0;
  let catalogCount = 0;
  const newest = catalogs.map((c) => c.contentDate).reduce((a, b) => (b > a ? b : a), "1970-01-01T00:00:00.000Z");
  for (const catalog of catalogs) {
    const locale: Locale = catalog.locale;
    const date = new Date(catalog.contentDate);
    for (const category of catalog.categories) {
      writePdf(specSheetPath(category.segment, locale), await renderSpecSheet(category, locale, date));
      specSheets++;
    }
    writePdf(sectionsCatalogPath(locale), await renderSectionsCatalog(catalog));
    writePdf(rawMaterialsCatalogPath(locale), await renderRawMaterialsCatalog(locale, new Date(newest)));
    catalogCount += 2;
  }

  const failures = checkDownloadTexts(texts, options.sourceNames ?? null);
  if (failures.length) throw new Error(`download center gate:\n  ${failures.join("\n  ")}`);
  return { files, drawings: [...drawn.values()], skipped: [...skipped.values()], specSheets, catalogs: catalogCount };
}
