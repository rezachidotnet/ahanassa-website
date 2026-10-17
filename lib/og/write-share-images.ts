import fs from "node:fs";
import path from "node:path";
import { rasterizeSvg } from "../articles/cover-raster.ts";
import { priceGateInput } from "../static/price-gate.ts";
import type { DailyPoint } from "../pricing/price-history.ts";
import type { Indicator } from "../indicators/presentation.ts";
import { MARKET_INDICATORS_LOCALES } from "../indicators/page.ts";
import { checkShareImage, indicatorsShareImage, priceChartShareImage, type ShareImage, type ShareImageCheck } from "./share-images.ts";
import { chartShareImagePath, indicatorsShareImagePath, SHARE_IMAGE_SIZE, type ShareImageFormat } from "./share-image-paths.ts";

/**
 * W18.3 — the static build's share-image step (scripts/static/build.ts): one image per fa chart page and one per
 * en/ar market indicators page, PNG + WebP under public-assets/images/og/. Every image's texts pass
 * `checkShareImage` against the private snapshot first; any failure throws and nothing is written (a raster cannot
 * be scanned by the artifact gate later). Build tooling only — never bundled into a page.
 */
export interface ChartShareSource {
  slug: string;
  xid: string;
  productName: string;
  size: string;
  tomanPerKg: number;
  day: string;
  series: readonly DailyPoint[];
}

export async function writeShareImages(
  publicDir: string,
  input: { charts: readonly ChartShareSource[]; indicators: readonly Indicator[]; snapshot: unknown; logoFile: string; sourceNames: readonly string[] | null },
): Promise<{ files: Array<{ path: string; bytes: number }> }> {
  const logoDataUri = `data:image/jpeg;base64,${fs.readFileSync(input.logoFile).toString("base64")}`;
  const rows = priceGateInput(input.snapshot).rows;
  const planned: Array<{ image: ShareImage; check: Omit<ShareImageCheck, "sourceNames">; path: (f: ShareImageFormat) => string }> = [];
  for (const c of input.charts) {
    planned.push({
      image: priceChartShareImage({ productName: c.productName, size: c.size, tomanPerKg: c.tomanPerKg, day: c.day, series: c.series, logoDataUri }),
      check: { price: { xid: c.xid, rows, productName: c.productName, size: c.size } },
      path: (f) => chartShareImagePath(c.slug, f),
    });
  }
  if (input.indicators.length) {
    for (const locale of MARKET_INDICATORS_LOCALES) planned.push({ image: indicatorsShareImage(locale, input.indicators, logoDataUri), check: { indicators: input.indicators }, path: (f) => indicatorsShareImagePath(locale, f) });
  }
  const failures = planned.flatMap((p) => checkShareImage(p.image, p.path("png"), { ...p.check, sourceNames: input.sourceNames }));
  if (failures.length) throw new Error(`share image gate:\n  ${failures.join("\n  ")}`);

  const files: Array<{ path: string; bytes: number }> = [];
  for (const p of planned) {
    const raster = await rasterizeSvg(p.image.svg, SHARE_IMAGE_SIZE, p.path("png"));
    for (const format of ["png", "webp"] as const) {
      const urlPath = p.path(format);
      const file = path.join(publicDir, urlPath.slice(1));
      fs.mkdirSync(path.dirname(file), { recursive: true });
      fs.writeFileSync(file, raster[format]);
      files.push({ path: urlPath, bytes: raster[format].byteLength });
    }
  }
  return { files };
}
