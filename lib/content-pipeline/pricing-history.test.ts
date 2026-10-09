import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { validatePricingHistory, PRICING_HISTORY_PATH } from "./pricing-history.ts";
import { validatePricing } from "./pricing.ts";
import { snapshotV1 } from "../contracts/snapshot-v1.ts";
import { readSnapshotFile } from "../static/snapshot-io.ts";
import { publishedPriceHistoryRow, type PublishedPriceRow } from "../contracts/snapshot-prices.ts";

/** W9.6 — /api/v1/pricing/history → published_price_history. SYNTHETIC fixtures only. */

const REPO = path.resolve(import.meta.dirname, "../..");
const read = (f: string) => JSON.parse(fs.readFileSync(path.join(REPO, f), "utf8"));
const CURRENT = read("fixtures/pricing/synthetic-pricing-current.json");
const HISTORY = read("fixtures/pricing/synthetic-pricing-history.json");
const BASE = readSnapshotFile(path.join(REPO, "fixtures/snapshot/staging-2026-10-01.snapshot.json"));
const templateOf = new Map(BASE.tables.catalog_products.map((p) => [p.id, p.template_xid]));
const CATALOG = BASE.tables.product_variants.filter((v) => v.is_active === 1).map((v) => ({ canonical_id: v.xid, canonical_template_id: templateOf.get(v.product_id) ?? "", sku: v.sku }));
const PRICES: PublishedPriceRow[] = validatePricing({ status: "ok", http_status: 200, etag: null, body: CURRENT.response }, CATALOG, CURRENT.fetched_at).rows;
const ok = (body: unknown) => ({ status: "ok" as const, http_status: 200, etag: null, body });
const clone = () => structuredClone(HISTORY.response) as { data: Record<string, unknown>[]; meta: Record<string, unknown> };

test("fixtures are synthetic and the documented request is ?days=30", () => {
  assert.equal(HISTORY.synthetic, true);
  assert.equal(PRICING_HISTORY_PATH, "/api/v1/pricing/history?days=30");
});

test("valid history: one row per (priced variant, Tehran day) = the day's last numeric point; nothing else stored", () => {
  const r = validatePricingHistory(ok(HISTORY.response), PRICES, HISTORY.fetched_at);
  assert.deepEqual(r.warnings, []);
  const a = r.rows.filter((x) => x.canonical_variant_id === "CVAR-000031");
  assert.equal(a.length, 9, "window start + 8 days (2026-10-05 has two points)");
  assert.deepEqual(a.find((x) => x.day === "2026-10-05"), { canonical_variant_id: "CVAR-000031", day: "2026-10-05", price_irr_per_kg: 495610, published_at: "2026-10-05T07:20:00Z" }, "the later point of the day wins");
  assert.deepEqual(a.at(-1), { canonical_variant_id: "CVAR-000031", day: "2026-10-08", price_irr_per_kg: 489470, published_at: "2026-10-08T07:20:00Z" }, "newest = the current price");
  assert.equal(r.rows.filter((x) => x.canonical_variant_id === "CVAR-000054").length, 1, "an on-request day is not a point");
  assert.ok(!r.rows.some((x) => x.canonical_variant_id === "CVAR-000033"), "a price-on-request variant has no history");
  for (const row of r.rows) assert.ok(publishedPriceHistoryRow.safeParse(row).success);
  assert.ok(!JSON.stringify(r.rows).match(/FAC-|factory|location|کارخانه|درب/), "no factory, location or code is stored");
});

test("a failed, missing or malformed history never blocks: empty set + one warning (prices still publish)", () => {
  const cases = [
    validatePricingHistory(undefined, PRICES, HISTORY.fetched_at),
    validatePricingHistory({ status: "not_deployed", http_status: 404, etag: null, body: null }, PRICES, HISTORY.fetched_at),
    validatePricingHistory({ status: "failed", http_status: 500, etag: null, body: null, error: "HTTP 500" }, PRICES, HISTORY.fetched_at),
    validatePricingHistory(ok({ data: "x" }), PRICES, HISTORY.fetched_at),
    validatePricingHistory(ok({ ...clone(), meta: { ...clone().meta, currency: "USD" } }), PRICES, HISTORY.fetched_at),
  ];
  for (const r of cases) {
    assert.deepEqual(r.rows, []);
    assert.equal(r.warnings.length, 1, JSON.stringify(r.warnings));
    assert.match(r.summary, /^EMPTY PRICE HISTORY/);
  }
  assert.deepEqual(validatePricingHistory(undefined, [], HISTORY.fetched_at).warnings, [], "no prices: nothing to warn about");
});

test("a variant whose points do not end on its current price, or with a bad point, loses only its own history", () => {
  const moved = clone();
  (moved.data[0].prices as Record<string, unknown>[]).at(-1)!.price_irr_per_kg = 489000;
  const r = validatePricingHistory(ok(moved), PRICES, HISTORY.fetched_at);
  assert.ok(!r.rows.some((x) => x.canonical_variant_id === "CVAR-000031"));
  assert.ok(r.rows.some((x) => x.canonical_variant_id === "CVAR-000053"), "others keep theirs");
  assert.ok(r.warnings.some((w) => w.includes("CVAR-000031") && w.includes("current published price")));

  const bad = clone();
  (bad.data[3].prices as Record<string, unknown>[])[0].price_irr_per_kg = 12;
  const r2 = validatePricingHistory(ok(bad), PRICES, HISTORY.fetched_at);
  assert.ok(!r2.rows.some((x) => x.canonical_variant_id === "CVAR-000053"));
  assert.ok(r2.warnings.some((w) => w.includes("CVAR-000053")));

  const unordered = clone();
  (unordered.data[0].prices as unknown[]).reverse();
  assert.ok(!validatePricingHistory(ok(unordered), PRICES, HISTORY.fetched_at).rows.some((x) => x.canonical_variant_id === "CVAR-000031"));
});

test("unknown keys anywhere are ignored and reported, never stored (same rule as /current)", () => {
  const extra = clone();
  extra.data[0].source_url = "x";
  (extra.data[0].prices as Record<string, unknown>[])[0].observations = [];
  extra.meta.sources = 4;
  const r = validatePricingHistory(ok(extra), PRICES, HISTORY.fetched_at);
  assert.deepEqual(r.ignored, ["history.meta.sources", "history.point.observations", "history.row.source_url"]);
  assert.ok(r.warnings.some((w) => w.includes("ignored 3 field(s)")));
  assert.ok(!JSON.stringify(r.rows).includes("source"));
  assert.equal(r.rows.length, validatePricingHistory(ok(HISTORY.response), PRICES, HISTORY.fetched_at).rows.length);
});

test("snapshot.v1: history only for a priced variant, one row per day, newest point = the current price", () => {
  const history = validatePricingHistory(ok(HISTORY.response), PRICES, HISTORY.fetched_at).rows;
  const doc = (h: unknown[]) => ({ ...structuredClone(BASE), tables: { ...structuredClone(BASE.tables), published_prices: PRICES, published_price_history: h } });
  assert.ok(snapshotV1.safeParse(doc(history)).success);
  const issues = (h: unknown[]) => (snapshotV1.safeParse(doc(h)).error?.issues ?? []).map((i) => i.message).join(" | ");
  assert.match(issues([...history, { canonical_variant_id: "CVAR-000052", day: "2026-10-01", price_irr_per_kg: 500000, published_at: "2026-10-01T07:00:00Z" }]), /without a published price/);
  assert.match(issues([...history, { ...history[0] }]), /duplicate day/);
  assert.match(issues(history.filter((r) => !(r.canonical_variant_id === "CVAR-000031" && r.day === "2026-10-08"))), /CVAR-000031: the newest history point is not the current published price/);
  assert.equal(publishedPriceHistoryRow.safeParse({ ...history[0], factory: "x" }).success, false, "strict: no other field");
});
