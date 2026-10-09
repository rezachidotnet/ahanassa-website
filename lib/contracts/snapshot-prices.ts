import { z } from "zod";

/**
 * snapshot.v1 extension — `published_prices` (W9.4, owner decisions D-PRICE-DISPLAY / D-PRICE-AGE,
 * docs/OWNER_DECISIONS.md 2026-10-07/08; docs/contracts/SNAPSHOT_V1.md §published_prices).
 *
 * One row per catalog variant that has a numeric published price in Odoo's public pricing API
 * (`GET /api/v1/pricing/current`). The row holds EXACTLY the fields the Persian product page renders —
 * nothing else from the pricing API is ever stored (lib/content-pipeline/pricing.ts is the allow-list):
 *
 *   canonical_variant_id        the catalog variant (`CVAR-…`, = product_variants.xid)
 *   price_irr_per_kg            integer IRR per kg, > 0 (the page shows Toman = IRR ÷ 10)
 *   vat_included                always 1 (the API serves VAT-included prices only)
 *   factory_name_fa             the factory's Persian name
 *   location_fa                 the delivery location, Persian
 *   published_at                when the price was published (ISO 8601 UTC)
 *   previous_price_irr_per_kg   the superseded numeric price, or null
 *   previous_published_at       its publication time, or null (both set or both null)
 *
 * BUILD-ONLY table: it is loaded into the static build's in-memory DB_PUBLIC (lib/static/build-runtime/
 * snapshot-d1.ts) and NEVER into the remote D1 databases — there is no migrations_public file for it,
 * the content pipeline never mirrors it, and scripts/static/snapshot-load-sql.ts skips it. Prices are
 * rendered into the static HTML at build time; no Worker and no /data file reads them.
 */
export const PUBLISHED_PRICES_TABLE = "published_prices" as const;

const isoUtc = z.string().regex(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d{3})?Z$/);
const positiveIrr = z.number().int().positive().max(Number.MAX_SAFE_INTEGER);

export const publishedPriceRow = z
  .object({
    canonical_variant_id: z.string().regex(/^CVAR-[A-Za-z0-9-]+$/),
    price_irr_per_kg: positiveIrr,
    vat_included: z.literal(1),
    factory_name_fa: z.string().trim().min(1),
    location_fa: z.string().trim().min(1),
    published_at: isoUtc,
    previous_price_irr_per_kg: positiveIrr.nullable(),
    previous_published_at: isoUtc.nullable(),
  })
  .strict()
  .refine((r) => (r.previous_price_irr_per_kg === null) === (r.previous_published_at === null), { message: "previous price and previous_published_at must both be set or both be null" })
  .refine((r) => r.previous_published_at === null || r.previous_published_at < r.published_at, { message: "previous_published_at must be before published_at" });

export type PublishedPriceRow = z.infer<typeof publishedPriceRow>;

/** The exact column set — the publication gate checks the private snapshot against it (defence in depth). */
export const PUBLISHED_PRICE_COLUMNS = ["canonical_variant_id", "price_irr_per_kg", "vat_included", "factory_name_fa", "location_fa", "published_at", "previous_price_irr_per_kg", "previous_published_at"] as const;

/** Build-time schema for the in-memory snapshot database (NOT a DB_PUBLIC migration — see above). */
export const PUBLISHED_PRICES_BUILD_DDL = `CREATE TABLE IF NOT EXISTS published_prices (
  canonical_variant_id TEXT PRIMARY KEY,
  price_irr_per_kg INTEGER NOT NULL CHECK (price_irr_per_kg > 0),
  vat_included INTEGER NOT NULL CHECK (vat_included = 1),
  factory_name_fa TEXT NOT NULL,
  location_fa TEXT NOT NULL,
  published_at TEXT NOT NULL,
  previous_price_irr_per_kg INTEGER CHECK (previous_price_irr_per_kg IS NULL OR previous_price_irr_per_kg > 0),
  previous_published_at TEXT
);`;

/** Toman per kg as shown on the page: IRR ÷ 10, rounded to a whole Toman. */
export function irrToToman(irr: number): number {
  return Math.round(irr / 10);
}

/**
 * snapshot.v1 extension — `published_price_history` (W9.6, owner-approved 2026-10-09): the daily price
 * points the product page's 30-day sparkline draws. From Odoo `GET /api/v1/pricing/history?days=30` in the
 * same CI fetch as `/current` (lib/content-pipeline/pricing-history.ts is the allow-list). One row per
 * (priced variant, Tehran calendar day): the price in effect at the END of that day — the day's last
 * published point. Only variants with a `published_prices` row have history, and a variant's newest
 * point is always its current price. Nothing else is stored (no factory, no location, no source).
 *
 *   canonical_variant_id   the catalog variant (`CVAR-…`)
 *   day                    the Tehran calendar day, YYYY-MM-DD (Gregorian)
 *   price_irr_per_kg       integer IRR per kg, > 0
 *   published_at           the publication time of that day's last point (ISO 8601 UTC)
 *
 * BUILD-ONLY, like published_prices: never a DB_PUBLIC table, never mirrored or loaded into D1.
 */
export const PUBLISHED_PRICE_HISTORY_TABLE = "published_price_history" as const;

export const publishedPriceHistoryRow = z
  .object({
    canonical_variant_id: z.string().regex(/^CVAR-[A-Za-z0-9-]+$/),
    day: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
    price_irr_per_kg: positiveIrr,
    published_at: isoUtc,
  })
  .strict();

export type PublishedPriceHistoryRow = z.infer<typeof publishedPriceHistoryRow>;

export const PUBLISHED_PRICE_HISTORY_COLUMNS = ["canonical_variant_id", "day", "price_irr_per_kg", "published_at"] as const;

export const PUBLISHED_PRICE_HISTORY_BUILD_DDL = `CREATE TABLE IF NOT EXISTS published_price_history (
  canonical_variant_id TEXT NOT NULL,
  day TEXT NOT NULL,
  price_irr_per_kg INTEGER NOT NULL CHECK (price_irr_per_kg > 0),
  published_at TEXT NOT NULL,
  PRIMARY KEY (canonical_variant_id, day)
);`;
