import { z } from "zod";

/**
 * snapshot.v1 extension — W18.2 market indicators (Odoo W18.1 `GET /api/v1/catalog/indicators`, contract
 * ahanassa-odoo addons/ahanassa_market_indicators/docs/PUBLIC_INDICATORS_API_V1.md). REFERENCE indices only —
 * never an Ahan Asa selling price; every surface that shows one says so, with its source and date.
 *
 * Only the indicators the website knows are kept (INDICATOR_CODES; lib/content-pipeline/indicators.ts is the
 * allow-list). IME series are never stored, whatever Odoo's switch says (owner, W18.2: IME is off), and neither is
 * a free-market series.
 *
 * `published_indicators` — one row per indicator, with its fa/en/ar texts (one API call per locale):
 *
 *   code                 the indicator (INDICATOR_CODES)
 *   series_code          the series actually served (a fallback series when `is_fallback` = 1)
 *   is_fallback          1 when Odoo serves the fallback series (iron ore: IMF; BLS: steel mill products)
 *   kind                 rate | price | index
 *   label_kind           official | price | index (never free_market)
 *   unit                 Odoo's unit text (English, e.g. "IRR per USD"); the pages localize the known ones
 *   frequency            daily | monthly
 *   source_url           the source's public page (https, an allow-listed host)
 *   name_fa/en/ar        the series' name per locale
 *   attribution_fa/en/ar the required attribution per locale
 *
 * `published_indicator_points` — the history (Odoo's `history`, `days=365`), one row per (indicator, date):
 *
 *   code, date (YYYY-MM-DD; a monthly value is dated the 1st of its data month), value (> 0), preliminary (0/1)
 *
 * The newest point is the indicator's `last` value. BUILD-ONLY, like the price tables: never a DB_PUBLIC table,
 * never mirrored or loaded into D1; rendered into the static HTML at build time.
 */
export const PUBLISHED_INDICATORS_TABLE = "published_indicators" as const;
export const PUBLISHED_INDICATOR_POINTS_TABLE = "published_indicator_points" as const;

/** The indicators the website shows (W18.2). Any other code Odoo serves — IME included — is ignored. */
export const INDICATOR_CODES = ["usd_irr_official_cbi", "iron_ore_wb", "us_ppi_hot_rolled"] as const;
export type IndicatorCode = (typeof INDICATOR_CODES)[number];
export const isIndicatorCode = (code: unknown): code is IndicatorCode => (INDICATOR_CODES as readonly unknown[]).includes(code);

/** Per indicator: the only label kind, kind and frequency it may carry, and the series Odoo may serve for it. */
export const INDICATOR_RULES: Record<IndicatorCode, { labelKind: "official" | "price" | "index"; kind: "rate" | "price" | "index"; frequency: "daily" | "monthly"; series: readonly string[] }> = {
  usd_irr_official_cbi: { labelKind: "official", kind: "rate", frequency: "daily", series: ["usd_irr_official_cbi"] },
  iron_ore_wb: { labelKind: "price", kind: "price", frequency: "monthly", series: ["iron_ore_wb", "iron_ore_imf"] },
  us_ppi_hot_rolled: { labelKind: "index", kind: "index", frequency: "monthly", series: ["us_ppi_hot_rolled", "us_ppi_steel_mill"] },
};

/** Hosts a `source_url` may point to (the owner-approved sources, W18.0). Any other host drops the indicator. */
export const INDICATOR_SOURCE_HOSTS = ["www.cbi.ir", "cbi.ir", "www.worldbank.org", "worldbank.org", "www.imf.org", "imf.org", "data.bls.gov", "www.bls.gov", "bls.gov"] as const;

const text = z.string().trim().min(1).max(300);

export const publishedIndicatorRow = z
  .object({
    code: z.enum(INDICATOR_CODES),
    series_code: z.string().regex(/^[a-z0-9_]{1,64}$/),
    is_fallback: z.union([z.literal(0), z.literal(1)]),
    kind: z.enum(["rate", "price", "index"]),
    label_kind: z.enum(["official", "price", "index"]),
    unit: text,
    frequency: z.enum(["daily", "monthly"]),
    source_url: z.string().url().startsWith("https://"),
    name_fa: text,
    name_en: text,
    name_ar: text,
    attribution_fa: text,
    attribution_en: text,
    attribution_ar: text,
  })
  .strict()
  .refine((r) => INDICATOR_RULES[r.code].series.includes(r.series_code), { message: "series_code is not a series of this indicator" })
  .refine((r) => INDICATOR_RULES[r.code].labelKind === r.label_kind && INDICATOR_RULES[r.code].kind === r.kind && INDICATOR_RULES[r.code].frequency === r.frequency, { message: "label_kind/kind/frequency do not match the indicator" })
  .refine((r) => (INDICATOR_SOURCE_HOSTS as readonly string[]).includes(new URL(r.source_url).host), { message: "source_url host is not an allowed source" });

export type PublishedIndicatorRow = z.infer<typeof publishedIndicatorRow>;

export const publishedIndicatorPointRow = z
  .object({
    code: z.enum(INDICATOR_CODES),
    date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
    value: z.number().finite().positive(),
    preliminary: z.union([z.literal(0), z.literal(1)]),
  })
  .strict();

export type PublishedIndicatorPointRow = z.infer<typeof publishedIndicatorPointRow>;

export const PUBLISHED_INDICATOR_COLUMNS = ["code", "series_code", "is_fallback", "kind", "label_kind", "unit", "frequency", "source_url", "name_fa", "name_en", "name_ar", "attribution_fa", "attribution_en", "attribution_ar"] as const;
export const PUBLISHED_INDICATOR_POINT_COLUMNS = ["code", "date", "value", "preliminary"] as const;

export const PUBLISHED_INDICATORS_BUILD_DDL = `CREATE TABLE IF NOT EXISTS published_indicators (
  code TEXT PRIMARY KEY,
  series_code TEXT NOT NULL,
  is_fallback INTEGER NOT NULL CHECK (is_fallback IN (0, 1)),
  kind TEXT NOT NULL,
  label_kind TEXT NOT NULL,
  unit TEXT NOT NULL,
  frequency TEXT NOT NULL,
  source_url TEXT NOT NULL,
  name_fa TEXT NOT NULL,
  name_en TEXT NOT NULL,
  name_ar TEXT NOT NULL,
  attribution_fa TEXT NOT NULL,
  attribution_en TEXT NOT NULL,
  attribution_ar TEXT NOT NULL
);`;

export const PUBLISHED_INDICATOR_POINTS_BUILD_DDL = `CREATE TABLE IF NOT EXISTS published_indicator_points (
  code TEXT NOT NULL,
  date TEXT NOT NULL,
  value REAL NOT NULL CHECK (value > 0),
  preliminary INTEGER NOT NULL CHECK (preliminary IN (0, 1)),
  PRIMARY KEY (code, date)
);`;
