import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { indicatorsPath, validateIndicators, type IndicatorsSource } from "./indicators.ts";
import type { PricingSource } from "./pricing.ts";
import { snapshotV1 } from "../contracts/snapshot-v1.ts";
import { buildSnapshot, readSnapshotFile } from "../static/snapshot-io.ts";

/**
 * W18.2 — market indicators in the content pipeline: fetch → validate → snapshot. SYNTHETIC data only
 * (fixtures/indicators/synthetic-indicators.json: invented values, the series' real names and sources).
 */

const REPO = path.resolve(import.meta.dirname, "../..");
const FIXTURE = JSON.parse(fs.readFileSync(path.join(REPO, "fixtures/indicators/synthetic-indicators.json"), "utf8")) as { synthetic: boolean; fetched_at: string; responses: Record<"fa" | "en" | "ar", { data: Record<string, unknown>[]; meta: Record<string, unknown> }> };
const ok = (body: unknown): PricingSource => ({ status: "ok", http_status: 200, etag: '"x"', body });
type Bodies = typeof FIXTURE.responses;
const bodies = (): Bodies => structuredClone(FIXTURE.responses);
const source = (b: Bodies = bodies()): IndicatorsSource => ({ fa: ok(b.fa), en: ok(b.en), ar: ok(b.ar) });
const run = (b: Bodies = bodies(), names: string[] | null = null) => validateIndicators(source(b), FIXTURE.fetched_at, names);
/** Applies `edit` to the entry `code` of every locale. */
const each = (b: Bodies, code: string, edit: (e: Record<string, unknown>, locale: "fa" | "en" | "ar") => void) => {
  for (const l of ["fa", "en", "ar"] as const) edit(b[l].data.find((e) => e.code === code)!, l);
  return b;
};

test("fixture is synthetic, and the documented request is one GET per locale with a year of history", () => {
  assert.equal(FIXTURE.synthetic, true);
  assert.equal(indicatorsPath("fa"), "/api/v1/catalog/indicators?locale=fa&days=365");
  assert.equal(indicatorsPath("ar"), "/api/v1/catalog/indicators?locale=ar&days=365");
});

test("valid responses: one row per indicator with its fa/en/ar texts, every history point, nothing else stored", () => {
  const r = run();
  assert.equal(r.outcome, "published");
  assert.deepEqual(r.warnings, []);
  assert.deepEqual(r.rows.map((x) => x.code), ["usd_irr_official_cbi", "iron_ore_wb", "us_ppi_hot_rolled"]);
  const usd = r.rows[0];
  assert.equal(usd.label_kind, "official");
  assert.equal(usd.name_fa, "دلار آمریکا – نرخ مرکز مبادله");
  assert.equal(usd.name_en, "US dollar – Exchange Center rate");
  assert.equal(usd.attribution_ar, "المصدر: البنك المركزي للجمهورية الإسلامية الإيرانية (سعر مركز التبادل)");
  for (const row of r.rows) assert.deepEqual(Object.keys(row).sort(), ["attribution_ar", "attribution_en", "attribution_fa", "code", "frequency", "is_fallback", "kind", "label_kind", "name_ar", "name_en", "name_fa", "series_code", "source_url", "unit"]);
  const bls = r.points.filter((p) => p.code === "us_ppi_hot_rolled");
  assert.equal(bls.length, 12);
  assert.deepEqual(bls.at(-1), { code: "us_ppi_hot_rolled", date: "2026-08-01", value: 312.467, preliminary: 1 });
  // licence, label.text, last/previous/change and group are read, never stored.
  assert.ok(!/licence|SYNTHETIC|"group"|"fx"/.test(JSON.stringify(r)));
});

test("IME is never stored, whatever Odoo serves; other unknown codes are ignored too (a note, not a warning)", () => {
  const b = bodies();
  for (const l of ["fa", "en", "ar"] as const) {
    b[l].data.push({ ...structuredClone(b[l].data[1]), code: "ime_billet", series: "ime_billet", group: "ime", latest_session: [{ producer: "x" }] });
    b[l].data.push({ ...structuredClone(b[l].data[0]), code: "usd_irr_free_market", series: "usd_irr_free_market", label: { kind: "free_market", text: "free market" } });
  }
  const r = run(b);
  assert.deepEqual(r.rows.map((x) => x.code), ["usd_irr_official_cbi", "iron_ore_wb", "us_ppi_hot_rolled"]);
  assert.ok(!/ime_|"ime"/.test(JSON.stringify([r.rows, r.points])));
  assert.match(r.summary, /IME indicator ime_billet ignored/);
  assert.match(r.summary, /usd_irr_free_market ignored/);
  assert.deepEqual(r.warnings, []);
});

test("unknown fields anywhere are ignored and reported, never stored", () => {
  const b = each(bodies(), "iron_ore_wb", (e) => {
    e.forecast = "up";
    (e.label as Record<string, unknown>).color = "red";
    (e.history as Record<string, unknown>[])[0].source = "x";
  });
  b.fa.meta.extra = 1;
  const r = run(b);
  assert.equal(r.outcome, "published");
  assert.deepEqual(r.ignored, ["indicator.forecast", "indicator.label.color", "indicator.point.source", "indicators.meta.extra"]);
  assert.match(r.warnings.join("\n"), /ignored 4 field\(s\)/);
  assert.ok(!JSON.stringify(r.rows).includes("forecast"));
});

test("an invalid indicator is dropped ALONE with a warning; the others publish", () => {
  const breakers: Array<[string, (e: Record<string, unknown>) => void, RegExp]> = [
    ["a negative value", (e) => ((e.history as Record<string, unknown>[])[3].value = -1), /not a positive number/],
    ["history not in order", (e) => (e.history as unknown[]).reverse(), /oldest first/],
    ["last is not the newest point", (e) => ((e.last as Record<string, unknown>).value = 1), /last is not the newest/],
    ["a monthly value not on the 1st", (e) => ((e.history as Record<string, unknown>[])[2].date = "2025-11-15"), /1st of its period/],
    ["the free-market label", (e) => (e.label = { kind: "free_market", text: "x" }), /label\.kind/],
    ["an unknown series", (e) => (e.series = "iron_ore_lme"), /not a known series/],
    ["fallback flag wrong", (e) => (e.fallback = true), /fallback/],
    ["a source host not approved", (e) => (e.source_url = "https://example.com/ore"), /not an allowed source/],
    ["an http source", (e) => (e.source_url = "http://www.worldbank.org/x"), /not https/],
    ["no values yet", (e) => ((e.history = []), (e.last = null)), /no values yet/],
    ["an old newest value", (e) => ((e.history as Record<string, unknown>[]).splice(2), (e.last = (e.history as unknown[]).at(-1))), /older than 200 days/],
    ["an empty name", (e) => (e.name = " "), /name is empty/],
  ];
  for (const [what, edit, why] of breakers) {
    const r = run(each(bodies(), "iron_ore_wb", edit));
    assert.deepEqual(r.rows.map((x) => x.code), ["usd_irr_official_cbi", "us_ppi_hot_rolled"], what);
    assert.equal(r.outcome, "published", what);
    assert.match(r.warnings.join("\n"), new RegExp(`iron_ore_wb: .*${why.source}.*not shown`), what);
    assert.ok(!r.points.some((p) => p.code === "iron_ore_wb"), what);
  }
});

test("the fallback series is accepted and recorded (iron ore served from the IMF)", () => {
  const r = run(each(bodies(), "iron_ore_wb", (e) => Object.assign(e, { series: "iron_ore_imf", fallback: true, unit: "USD/t", source_url: "https://www.imf.org/en/Research/commodity-prices" })));
  const ore = r.rows.find((x) => x.code === "iron_ore_wb")!;
  assert.deepEqual([ore.series_code, ore.is_fallback, ore.unit], ["iron_ore_imf", 1, "USD/t"]);
});

test("the three locales must agree; en must hold no Arabic script and ar no Persian-only letters (the leak scan's rule)", () => {
  const disagree = bodies();
  const arUsd = disagree.ar.data[0];
  ((arUsd.history as Record<string, unknown>[]).at(-1) as Record<string, unknown>).value = 1;
  (arUsd.last as Record<string, unknown>).value = 1;
  assert.match(run(disagree).warnings.join("\n"), /usd_irr_official_cbi: the fa\/en\/ar responses disagree/);
  const persianOnEn = bodies();
  persianOnEn.en.data[2].name = "شاخص US PPI";
  assert.match(run(persianOnEn).warnings.join("\n"), /us_ppi_hot_rolled: the English name, attribution or unit holds Arabic-script text/);
  const persianOnAr = bodies();
  persianOnAr.ar.data[1].attribution = "بانک جهانی";
  assert.match(run(persianOnAr).warnings.join("\n"), /iron_ore_wb: the Arabic name or attribution holds Persian-only letters/);
  const missing = bodies();
  missing.en.data.splice(0, 1);
  assert.match(run(missing).warnings.join("\n"), /usd_irr_official_cbi: missing in en/);
});

test("a listed price-source website name drops the indicator, and the warning never repeats the name", () => {
  const b = each(bodies(), "us_ppi_hot_rolled", (e) => (e.attribution = `${String(e.attribution)} via examplemarket.ir`));
  const r = run(b, ["examplemarket.ir"]);
  assert.deepEqual(r.rows.map((x) => x.code), ["usd_irr_official_cbi", "iron_ore_wb"]);
  assert.match(r.warnings.join("\n"), /us_ppi_hot_rolled: a text or link names a listed price-source website/);
  assert.ok(!r.warnings.join("\n").includes("examplemarket"));
});

test("never blocks: not deployed, failed, malformed or empty gives NO indicators and one warning, never an error", () => {
  const cases: Array<[IndicatorsSource | undefined, string]> = [
    [undefined, "empty_not_deployed"],
    [{ ...source(), en: { status: "not_deployed", http_status: 404, etag: null, body: null } }, "empty_not_deployed"],
    [{ ...source(), ar: { status: "failed", http_status: 502, etag: null, body: null, error: "HTTP 502" } }, "empty_fetch_failed"],
    [{ ...source(), fa: ok({ items: [] }) }, "empty_invalid"],
    [{ ...source(), fa: ok({ data: [], meta: { locale: "en" } }) }, "empty_invalid"],
    [{ fa: ok({ data: [], meta: { locale: "fa" } }), en: ok({ data: [], meta: { locale: "en" } }), ar: ok({ data: [], meta: { locale: "ar" } }) }, "empty_none"],
  ];
  for (const [src, outcome] of cases) {
    const r = validateIndicators(src, FIXTURE.fetched_at);
    assert.equal(r.outcome, outcome);
    assert.deepEqual([r.rows, r.points], [[], []]);
    assert.equal(r.warnings.filter((w) => /NO MARKET INDICATORS/.test(w)).length, 1, outcome);
    assert.match(r.summary, /catalog and prices publish normally/);
  }
});

test("snapshot.v1: the indicator tables are optional, build-only and keep older snapshots' hashes; integrity is checked", () => {
  const base = readSnapshotFile(path.join(REPO, "fixtures/snapshot/staging-2026-10-01.snapshot.json"));
  const same = buildSnapshot({ ...base.tables, published_indicators: [], published_indicator_points: [] }, base.source, base.created_at);
  assert.equal(same.snapshot_version, base.snapshot_version, "empty indicator tables do not change the hash");
  const r = run();
  const withIndicators = buildSnapshot({ ...base.tables, published_indicators: r.rows, published_indicator_points: r.points }, base.source, base.created_at);
  assert.notEqual(withIndicators.snapshot_version, base.snapshot_version);
  assert.ok(snapshotV1.safeParse(withIndicators).success);
  const orphan = structuredClone(withIndicators);
  orphan.tables.published_indicators = orphan.tables.published_indicators.filter((x) => x.code !== "iron_ore_wb");
  assert.match(JSON.stringify(snapshotV1.safeParse(orphan).error?.issues), /unknown indicator/);
  const ime = structuredClone(withIndicators) as unknown as { tables: { published_indicators: Record<string, unknown>[] } };
  ime.tables.published_indicators[0].code = "ime_billet";
  assert.equal(snapshotV1.safeParse(ime).success, false, "an IME code can never enter a snapshot");
});
