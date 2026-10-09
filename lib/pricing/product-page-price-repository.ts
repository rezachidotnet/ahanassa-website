import { getPublicDb } from "../db/public.ts";
import { isStaticExportBuild } from "../static/locale-params.ts";
import type { PublishedPriceRow } from "../contracts/snapshot-prices.ts";
import type { PriceBlockData } from "./price-block-presentation.ts";
import { priceBlockDataFromRow } from "./product-page-price.ts";

/**
 * W9.4: the published prices of one product page's variants, keyed by canonical variant id (xid).
 *
 * Prices are rendered into the static HTML at build time from the snapshot's build-only
 * `published_prices` table (lib/contracts/snapshot-prices.ts). Outside the static export build there is
 * no such table and no price data: `null` = render no price UI at all (never a guessed or empty price).
 */
export async function listProductPagePrices(variantXids: readonly string[]): Promise<Map<string, PriceBlockData> | null> {
  if (!isStaticExportBuild()) return null;
  const prices = new Map<string, PriceBlockData>();
  if (variantXids.length === 0) return prices;
  const wanted = new Set(variantXids);
  const { results } = await getPublicDb().prepare("SELECT * FROM published_prices ORDER BY canonical_variant_id").all<PublishedPriceRow>();
  for (const row of results ?? []) if (wanted.has(row.canonical_variant_id)) prices.set(row.canonical_variant_id, priceBlockDataFromRow(row));
  return prices;
}
