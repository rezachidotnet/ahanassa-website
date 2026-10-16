import { test } from "node:test";
import assert from "node:assert/strict";
import { validatePricingHistory, withPreviousDay } from "./pricing-history.ts";
import { factoryRowAsPriceRow, type PublishedFactoryPriceRow, type PublishedPriceRow } from "../contracts/snapshot-prices.ts";
import { priceStampLabel, priceTimeLabel } from "../pricing/price-locale.ts";
import { latestPricedAt, type PriceTableRow } from "../pricing/price-page.ts";
import { presentCompactChange, priceBlockDataFromRow } from "../pricing/product-page-price.ts";

/**
 * W20.7 add-on (owner 2026-10-16): prices publish twice a day (≈11:30 and ≈13:30 Tehran). The update time shows
 * next to the date; ▲/▼ % stays versus the previous DAY; the chart keeps one point per day (that day's last price).
 * Synthetic data only. 08:00Z = 11:30 Tehran, 10:00Z = 13:30 Tehran.
 */
const XID = "CVAR-000031";
const FETCHED = "2026-10-16T10:05:00Z";
const point = (price: number | null, at: string) => ({ price_irr_per_kg: price, price_on_request: price === null, published_at_utc: at, factory: null, location: null });
const history = (points: ReturnType<typeof point>[]) => ({
  status: "ok" as const,
  http_status: 200,
  etag: null,
  body: { data: [{ canonical_id: XID, unit: "kg", currency: "IRR", vat_included: true, price_at_window_start: null, prices: points }], meta: { days: 30, total_prices: points.length, updated_at_utc: FETCHED, unit: "kg", currency: "IRR", vat_included: true } },
});
/** The 13:30 price, whose v1 `previous` is the same day's 11:30 price. */
const row = (previous: { price: number; at: string } | null): PublishedPriceRow => ({
  canonical_variant_id: XID,
  price_irr_per_kg: 510_000,
  vat_included: 1,
  factory_name_fa: "کارخانه آزمایشی الف",
  location_fa: "درب کارخانه",
  published_at: "2026-10-16T10:00:00Z",
  previous_price_irr_per_kg: previous?.price ?? null,
  previous_published_at: previous?.at ?? null,
});
const SAME_DAY = row({ price: 505_000, at: "2026-10-16T08:00:00Z" });
const POINTS = [point(490_000, "2026-10-14T08:00:00Z"), point(495_000, "2026-10-15T08:00:00Z"), point(500_000, "2026-10-15T10:00:00Z"), point(505_000, "2026-10-16T08:00:00Z"), point(510_000, "2026-10-16T10:00:00Z")];

test("chart: two publications a day give one daily point, the day's last price", () => {
  const h = validatePricingHistory(history(POINTS), [SAME_DAY], FETCHED);
  assert.deepEqual(h.warnings, []);
  assert.deepEqual(h.rows.map((r) => [r.day, r.price_irr_per_kg]), [["2026-10-14", 490_000], ["2026-10-15", 500_000], ["2026-10-16", 510_000]]);
});

test("▲/▼: a same-day previous (11:30) is replaced by the previous day's closing price (yesterday 13:30)", () => {
  const h = validatePricingHistory(history(POINTS), [SAME_DAY], FETCHED);
  assert.deepEqual(h.previousDay.get(XID), { price: 500_000, at: "2026-10-15T10:00:00Z" });
  const [out] = withPreviousDay([SAME_DAY], h.previousDay);
  assert.equal(out.previous_price_irr_per_kg, 500_000);
  assert.equal(out.previous_published_at, "2026-10-15T10:00:00Z");
  // 510 000 vs 500 000 = ▲ 2 %, shown (before the add-on a same-day previous showed nothing).
  assert.deepEqual(presentCompactChange("fa", priceBlockDataFromRow(out)), { direction: "up", glyph: "▲", label: "۲٪", word: "افزایش" });
  assert.equal(presentCompactChange("fa", priceBlockDataFromRow(SAME_DAY)), null);
});

test("▲/▼: an earlier-day previous, no previous, or no usable history leave the row unchanged", () => {
  const h = validatePricingHistory(history(POINTS), [SAME_DAY], FETCHED);
  const earlier = row({ price: 500_000, at: "2026-10-15T10:00:00Z" });
  assert.deepEqual(withPreviousDay([earlier], h.previousDay), [earlier]);
  const none = row(null);
  assert.deepEqual(withPreviousDay([none], h.previousDay), [none]);
  assert.deepEqual(withPreviousDay([SAME_DAY], new Map()), [SAME_DAY]);
});

test("▲/▼: when the previous day closed on request there is no previous (no % against an older price)", () => {
  const points = [point(495_000, "2026-10-14T08:00:00Z"), point(null, "2026-10-15T08:00:00Z"), point(505_000, "2026-10-16T08:00:00Z"), point(510_000, "2026-10-16T10:00:00Z")];
  const h = validatePricingHistory(history(points), [SAME_DAY], FETCHED);
  assert.equal(h.previousDay.get(XID), null);
  const [out] = withPreviousDay([SAME_DAY], h.previousDay);
  assert.equal(out.previous_price_irr_per_kg, null);
  assert.equal(out.previous_published_at, null);
});

test("the first price of a variant (only today's points) keeps no previous-day reference", () => {
  const h = validatePricingHistory(history([point(505_000, "2026-10-16T08:00:00Z"), point(510_000, "2026-10-16T10:00:00Z")]), [SAME_DAY], FETCHED);
  assert.equal(h.previousDay.has(XID), false);
});

test("▲/▼ factory rows: Odoo W20.9 serves the previous day's price (shown); an older Odoo's same-day one shows nothing", () => {
  const factory = (previous: { price: number; at: string } | null): PublishedFactoryPriceRow => ({
    canonical_variant_id: XID,
    factory_name_fa: "کارخانه آزمایشی ب",
    location_fa: "درب کارخانه",
    price_irr_per_kg: 520_000,
    published_at: "2026-10-16T10:00:00Z",
    previous_price_irr_per_kg: previous?.price ?? null,
    previous_published_at: previous?.at ?? null,
    is_lowest: 0,
  });
  const w209 = factoryRowAsPriceRow(factory({ price: 530_000, at: "2026-10-15T10:00:00Z" }));
  assert.deepEqual(presentCompactChange("fa", priceBlockDataFromRow(w209)), { direction: "down", glyph: "▼", label: "۱٫۹٪", word: "کاهش" });
  const sameDay = factoryRowAsPriceRow(factory({ price: 515_000, at: "2026-10-16T08:00:00Z" }));
  assert.equal(presentCompactChange("fa", priceBlockDataFromRow(sameDay)), null);
});

test("▲/▼ lowest: an Odoo W20.9 previous-day `previous` is kept as served", () => {
  const w209 = row({ price: 500_000, at: "2026-10-15T10:00:00Z" });
  const h = validatePricingHistory(history(POINTS), [w209], FETCHED);
  assert.deepEqual(withPreviousDay([w209], h.previousDay), [w209]);
});

test("time label: Tehran 24 h next to the date, fa «به‌روزرسانی ۱۳:۳۰», ar «تحديث ١٣:٣٠»", () => {
  assert.equal(priceTimeLabel("fa", "2026-10-16T10:00:00Z"), "۱۳:۳۰");
  assert.equal(priceTimeLabel("ar", "2026-10-16T08:00:00Z"), "١١:٣٠");
  assert.equal(priceStampLabel("fa", "2026-10-16T10:00:00Z"), "۲۴ مهر ۱۴۰۵ · به‌روزرسانی ۱۳:۳۰");
  assert.equal(priceStampLabel("ar", "2026-10-16T10:00:00Z"), "١٦ أكتوبر ٢٠٢٦ · تحديث ١٣:٣٠");
  assert.doesNotMatch(priceStampLabel("ar", "2026-10-16T10:00:00Z"), /[پچژگکی]/, "Arabic letters only on ar");
});

test("fa /prices update line: the newest time of every factory row shown, not only the lowest", () => {
  const data = (pricedAt: string) => ({ tomanPerKg: 51_000, factoryName: "الف", deliveryLocation: "درب کارخانه", pricedAt });
  const rows = [{ price: data("2026-10-16T08:00:00Z"), factoryPrices: [{ data: data("2026-10-16T08:00:00Z"), lowest: true }, { data: data("2026-10-16T10:00:00Z"), lowest: false }] }] as unknown as PriceTableRow[];
  assert.equal(latestPricedAt(rows), "2026-10-16T08:00:00Z");
  assert.equal(latestPricedAt(rows, true), "2026-10-16T10:00:00Z");
});
