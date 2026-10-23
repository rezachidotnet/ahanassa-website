/**
 * W23 — the daily price bulletin on Telegram + Bale (lib/price-channel/). The ONE place its fixed basket, times and
 * thresholds live. Nothing of the public site reads this file: the bulletin only READS what www.ahanassa.com already
 * serves (the fa price table at /prices) and never changes the site.
 *
 * Owner rule: keep the basket unchanged for at least a month, so the daily and weekly changes compare like with like.
 * It is a selected basket — the posts always say so and never call it "the whole market".
 *
 * Each item names the site's catalog variant (CVAR) and what the page must show for it (`expect`): when the page
 * shows another product or size for that variant, the item is treated as missing («به‌روزرسانی نشده»), never guessed.
 * `factories` pins the factory/delivery rows in order of preference (the first one with a price of the day wins);
 * empty = the lowest price of the day among all factory rows of the variant (the page's own rank breaks ties). A
 * change is only ever computed against the SAME variant + factory + delivery place + unit.
 */
export interface BasketItem {
  /** Stable id: state, tests, UTM content. Never change it while the basket runs. */
  id: string;
  /** Catalog variant on www (the price table's data-aa-price-cell). */
  variant: string;
  /** What the bulletin shows. Only facts the site itself shows; no grade where the site shows none. */
  label: { product: string; grade: string | null; size: string };
  /** The page row must show these for `variant` (product name contains `name`, size equals `size` ignoring case). */
  expect: { name: string; size: string };
  /** Preferred factory rows: exact factory name, optionally the delivery place (the text after «، » on the page). */
  factories: ReadonlyArray<{ factory: string; location?: string }>;
}

/**
 * The basket (owner brief, W23). SHS 40×40×2 is CVAR-000456 (W9.12, ahanassa-odoo #33; public and priced since
 * 2026-10-23); W36 (owner OK 2026-10-23, before any post, so the one-month freeze had not started) moved the item
 * from the stand-in 40×40×2.5. Change `variant`/`expect`/`label` together if the owner picks another.
 * «ST37» is sold on the site as S235JR (same steel); the 10 mm plate is the 1500×6000 sheet.
 */
export const BASKET: readonly BasketItem[] = [
  { id: "rebar-a3-12", variant: "CVAR-000032", label: { product: "میلگرد آجدار", grade: "A3", size: "Ø12" }, expect: { name: "A3", size: "Ø12" }, factories: [] },
  { id: "rebar-a3-14", variant: "CVAR-000033", label: { product: "میلگرد آجدار", grade: "A3", size: "Ø14" }, expect: { name: "A3", size: "Ø14" }, factories: [] },
  { id: "rebar-a3-16", variant: "CVAR-000001", label: { product: "میلگرد آجدار", grade: "A3", size: "Ø16" }, expect: { name: "A3", size: "Ø16" }, factories: [] },
  { id: "rebar-a3-20", variant: "CVAR-000035", label: { product: "میلگرد آجدار", grade: "A3", size: "Ø20" }, expect: { name: "A3", size: "Ø20" }, factories: [] },
  { id: "ipe-140", variant: "CVAR-000054", label: { product: "تیرآهن", grade: null, size: "IPE 140" }, expect: { name: "IPE", size: "IPE 140" }, factories: [] },
  { id: "ipe-160", variant: "CVAR-000055", label: { product: "تیرآهن", grade: null, size: "IPE 160" }, expect: { name: "IPE", size: "IPE 160" }, factories: [] },
  { id: "ipe-200", variant: "CVAR-000056", label: { product: "تیرآهن", grade: null, size: "IPE 200" }, expect: { name: "IPE", size: "IPE 200" }, factories: [] },
  { id: "plate-st37-10", variant: "CVAR-000172", label: { product: "ورق سیاه", grade: "ST37", size: "10 mm" }, expect: { name: "S235JR", size: "10×1500×6000" }, factories: [] },
  { id: "shs-40x40", variant: "CVAR-000456", label: { product: "قوطی مربع", grade: null, size: "40×40×2" }, expect: { name: "SHS", size: "40×40×2" }, factories: [] },
  { id: "angle-50x50x5", variant: "CVAR-000242", label: { product: "نبشی", grade: null, size: "50×50×5" }, expect: { name: "نبشی", size: "50X50X5" }, factories: [] },
];

/** The basket item whose RFQ link the morning bulletin carries (an exception post uses its largest mover). */
export const LEAD_ITEM_ID = "rebar-a3-16";

export const CHANNEL_CONFIG = {
  /** The page the bulletin reads (fa is the unprefixed default locale: /fa/prices redirects here). */
  origin: "https://www.ahanassa.com",
  pricesPath: "/prices",
  requestPath: "/request",
  /** The short site URL printed inside the card. */
  cardUrl: "ahanassa.com/prices",
  /** Tehran times (HH:MM). The site publishes at ~11:30; the bulletin goes out from 11:35 until the deadline. */
  bulletinFrom: "11:35",
  /** Still no validated prices of the day at this time → no bulletin today (status notice / owner alert). */
  bulletinDeadline: "12:40",
  /** Before this time a run is a bulletin run; from it, an exception check. */
  exceptionFrom: "13:35",
  exceptionUntil: "17:00",
  /** Pre-publish: at least this many basket items must carry a validated price of the day. */
  minValidItems: 8,
  /** Plausible Toman/kg for every basket item; outside = invalid (unit or data error). */
  priceRange: { min: 10_000, max: 2_000_000 },
  /** |daily change| at or above this (percent) is re-checked with a second fetch before anything is posted. */
  suspiciousJumpPercent: 5,
  /** Exception post: at least `items` basket items moved at least `percent` against the morning bulletin. */
  exception: { percent: 1, items: 3, maxPerDay: 2 },
  /** A row change older than this many days is not "the last business day" any more (no arrow shown). */
  compareLookbackDays: 10,
  /** History kept in the state (days). */
  historyDays: 120,
  /** A failed (definite API error) delivery is retried on the next runs up to this many attempts. */
  maxAttempts: 3,
} as const;

/** Days without a bulletin besides Fridays: the shared holiday list (W31 moved it to config/iran-holidays.ts). */
export { HOLIDAYS } from "./iran-holidays.ts";
