import { loadPriceTableRows } from "./price-page-data.ts";
import { listDailyPriceHistory } from "./product-page-price-repository.ts";
import { tehranDay } from "./price-history.ts";
import { chartSeries, PRICE_CHART_WINDOW_DAYS, selectChartProducts, type PriceChartProduct } from "./price-charts.ts";

/**
 * W18.2 — the build-time read behind the fa chart pages (`/prices/chart/<slug>`) and every link to them (product
 * pages, /prices, the sitemap). Snapshot only: outside the static export build there are no price rows, so no
 * chart page exists. One read per build process.
 */
let cached: Promise<PriceChartProduct[]> | null = null;

export function listPriceChartProducts(): Promise<PriceChartProduct[]> {
  cached ??= readPriceChartProducts();
  return cached;
}

/** W34: the charts draw the domestic lowest's history only; an imported row never stands for a chart product. */
async function domesticRows() {
  return (await loadPriceTableRows("fa")).filter((r) => r.origin === "domestic");
}

async function readPriceChartProducts(): Promise<PriceChartProduct[]> {
  const rows = await domesticRows();
  const counts = new Map<string, number>();
  const firstPerTemplate = new Map<string, (typeof rows)[number]>();
  for (const r of rows) if (!firstPerTemplate.has(r.productPagePath)) firstPerTemplate.set(r.productPagePath, r);
  for (const r of firstPerTemplate.values()) {
    const day = tehranDay(r.price.pricedAt);
    counts.set(r.xid, day ? chartSeries(await listDailyPriceHistory(r.xid), day, PRICE_CHART_WINDOW_DAYS).length : 0);
  }
  return selectChartProducts(rows, (xid) => counts.get(xid) ?? 0);
}

/** The chart page of a product page slug, or null (no chart page for it this build). */
export async function priceChartForSlug(slug: string): Promise<PriceChartProduct | null> {
  return (await listPriceChartProducts()).find((p) => p.slug === slug) ?? null;
}

/**
 * A chart page's data: the product, its /prices row (the lowest price of the reference size), the Tehran day of that
 * price and the 90-day series, or null (no chart page for this slug this build). Shared by the page and the build's
 * share image (W18.3), so both show the same price, date and line.
 */
export async function loadPriceChart(slug: string) {
  const product = await priceChartForSlug(slug);
  if (!product) return null;
  const row = (await domesticRows()).find((r) => r.xid === product.xid);
  const currentDay = row ? tehranDay(row.price.pricedAt) : null;
  if (!row || !currentDay) return null;
  const series = chartSeries(await listDailyPriceHistory(product.xid), currentDay);
  return series.length ? { product, row, currentDay, series } : null;
}
