import { getPublicDb } from "../db/public.ts";
import { isStaticExportBuild } from "../static/locale-params.ts";
import { irrToToman, type PublishedPriceHistoryRow, type PublishedPriceRow } from "../contracts/snapshot-prices.ts";
import type { PriceBlockData } from "./price-block-presentation.ts";
import { priceBlockDataFromRow } from "./product-page-price.ts";
import { isDailyPriceEligible } from "./daily-price-eligibility.ts";
import type { DailyPoint } from "./price-history.ts";

/**
 * W9.4: the published prices of one product page's variants, keyed by canonical variant id (xid).
 *
 * Prices are rendered into the static HTML at build time from the snapshot's build-only
 * `published_prices` table (lib/contracts/snapshot-prices.ts). Outside the static export build there is
 * no such table and no price data: `null` = render no price UI at all (never a guessed or empty price).
 *
 * W9.6: a per-ton raw or semi-finished material never gets a daily price, whatever the snapshot holds
 * (lib/pricing/daily-price-eligibility.ts) — filtered here, the one read every price surface uses.
 */
type PriceRowWithCodes = PublishedPriceRow & { family_code: string | null; group_code: string | null; form_code: string | null };

async function eligiblePriceRows(): Promise<PublishedPriceRow[]> {
  const { results } = await getPublicDb()
    .prepare(
      `SELECT p.*, v.family_code, v.group_code, v.form_code FROM published_prices p
       JOIN product_variants v ON v.xid = p.canonical_variant_id
       GROUP BY p.canonical_variant_id ORDER BY p.canonical_variant_id`,
    )
    .all<PriceRowWithCodes>();
  return (results ?? [])
    .filter((r) => isDailyPriceEligible({ familyCode: r.family_code, groupCode: r.group_code, formCode: r.form_code }))
    .map(({ family_code: _f, group_code: _g, form_code: _c, ...row }) => row as PublishedPriceRow);
}

export async function listProductPagePrices(variantXids: readonly string[]): Promise<Map<string, PriceBlockData> | null> {
  if (!isStaticExportBuild()) return null;
  const prices = new Map<string, PriceBlockData>();
  if (variantXids.length === 0) return prices;
  const wanted = new Set(variantXids);
  for (const row of await eligiblePriceRows()) if (wanted.has(row.canonical_variant_id)) prices.set(row.canonical_variant_id, priceBlockDataFromRow(row));
  return prices;
}

/** W9.6 — the price page: every eligible published price, keyed by xid. `null` outside the static build. */
export async function listAllPublishedPrices(): Promise<Map<string, PriceBlockData> | null> {
  if (!isStaticExportBuild()) return null;
  return new Map((await eligiblePriceRows()).map((row) => [row.canonical_variant_id, priceBlockDataFromRow(row)]));
}

/** W9.6 — one variant's daily price points (Toman), oldest first, for the 30-day chart. `[]` outside the static build. */
export async function listDailyPriceHistory(variantXid: string): Promise<DailyPoint[]> {
  if (!isStaticExportBuild()) return [];
  const { results } = await getPublicDb().prepare("SELECT * FROM published_price_history WHERE canonical_variant_id = ? ORDER BY day").bind(variantXid).all<PublishedPriceHistoryRow>();
  return (results ?? []).map((r) => ({ day: r.day, price: irrToToman(r.price_irr_per_kg) }));
}
