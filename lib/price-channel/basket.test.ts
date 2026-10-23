import { test } from "node:test";
import assert from "node:assert/strict";
import { BASKET, CHANNEL_CONFIG } from "../../config/price-channel.ts";
import { change, evaluateBasket, exceptionMoves, jumpsConfirmed, prePublishCheck, suspiciousJumps, type DayObservation } from "./basket.ts";
import { dayKind, persianDayLabel, tehranDate } from "./calendar.ts";
import { parsePersianInteger, parsePricePage } from "./source.ts";
import { basePrice, basketRows, pageHtml } from "./test-fixtures.ts";

const TUE = "2026-10-20";
const MON = "2026-10-19";
const AT = (day: string, hhmm = "07:50") => `${day}T${hhmm}:00.000Z`;
const evaluate = (html: string, date = TUE, history: DayObservation[] = [], weekly = false) => evaluateBasket({ page: parsePricePage(html), date, history, snapshotVersion: "snap-1", weekly });
const historyFrom = (html: string, date: string): DayObservation => {
  const e = evaluate(html, date);
  return { date, data_version: e.data_version, snapshot_version: "snap-0", fetched_at: AT(date), rows: e.rows };
};

test("source: Persian integers with ٬ separators; anything else is refused", () => {
  assert.equal(parsePersianInteger("۱۲۵٬۳۰۱"), 125301);
  assert.equal(parsePersianInteger("١٢٣"), 123);
  assert.equal(parsePersianInteger("۱۲۵٫۳"), null);
  assert.equal(parsePersianInteger("قیمت"), null);
});

test("source: a live-markup row parses to variant, factory, delivery place, Toman, time and size", () => {
  const p = parsePricePage(pageHtml([{ variant: "CVAR-000001", name: "میلگرد آجدار A3 (Aj400)", size: "Ø16", factory: "کارخانه الف", location: "انبار تهران", toman: 112200, at: AT(TUE) }]));
  assert.equal(p.unitTomanPerKg, true);
  assert.equal(p.skipped, 0);
  assert.deepEqual(p.rows[0], { variant: "CVAR-000001", family: "REBAR", productName: "میلگرد آجدار A3 (Aj400)", size: "Ø16", factory: "کارخانه الف", location: "انبار تهران", toman: 112200, publishedAt: AT(TUE), rank: 0 });
});

test("source: a broken row is skipped, never half-read; a missing unit header is reported", () => {
  const html = pageHtml([{ variant: "CVAR-000001", name: "x", size: "Ø16", factory: "الف", location: "درب کارخانه", toman: 1, at: AT(TUE) }], { unit: false }).replace("<time dateTime", "<time data-x");
  const p = parsePricePage(html);
  assert.equal(p.rows.length, 0);
  assert.equal(p.skipped, 1);
  assert.equal(p.unitTomanPerKg, false);
});

test("calendar: Tehran day, Friday and fixed holidays", () => {
  assert.equal(tehranDate("2026-10-20T20:29:00Z"), "2026-10-20");
  assert.equal(tehranDate("2026-10-20T20:31:00Z"), "2026-10-21");
  assert.equal(dayKind("2026-10-23"), "friday");
  assert.equal(dayKind("2027-02-11"), "holiday"); // 22 Bahman 1405
  assert.equal(dayKind(TUE), "price-day");
  assert.equal(persianDayLabel(TUE), "سه‌شنبه ۲۸ مهر ۱۴۰۵");
});

test("basket: each item takes the lowest price of the day; rows of an earlier day are ignored", () => {
  const rows = basketRows(AT(TUE), basePrice);
  rows.push({ ...rows[0], factory: "کارخانه قدیمی", toman: 50_000, at: AT("2026-10-17") });
  const e = evaluate(pageHtml(rows));
  assert.equal(e.validCount, 10);
  assert.equal(e.lines[0].row?.factory, "کارخانه الف");
  assert.equal(e.lines[0].row?.toman, 100_000);
  assert.ok(!e.rows.some((r) => r.factory === "کارخانه قدیمی"));
});

test("basket: a pinned factory wins over a lower price; the page showing another product for a variant = missing", () => {
  const basket = BASKET.map((b, i) => (i === 0 ? { ...b, factories: [{ factory: "کارخانه ب" }] } : b));
  const html = pageHtml(basketRows(AT(TUE), basePrice).map((r) => (r.variant === BASKET[1].variant ? { ...r, size: "Ø18" } : r)));
  const e = evaluateBasket({ page: parsePricePage(html), date: TUE, history: [], snapshotVersion: null, basket });
  assert.equal(e.lines[0].row?.factory, "کارخانه ب");
  assert.equal(e.lines[1].status, "missing");
  assert.match(e.lines[1].reason ?? "", /another product/);
});

test("basket: a price outside the plausible Toman/kg range (unit or data error) is not valid", () => {
  const e = evaluate(pageHtml(basketRows(AT(TUE), (id, i) => (id === "ipe-140" ? 1_150 : basePrice(id, i)))));
  assert.equal(e.lines.find((l) => l.item.id === "ipe-140")?.status, "missing");
});

test("% change: against the last business day with data for the same factory + place + unit only", () => {
  const mon = historyFrom(pageHtml(basketRows(AT(MON), basePrice)), MON);
  // Today «الف» is gone for item 0: «ب» is the lowest, and yesterday's «ب» price is the base (not «الف»'s).
  const today = basketRows(AT(TUE), (id, i) => Math.round(basePrice(id, i) * 1.012)).filter((r) => !(r.variant === BASKET[0].variant && r.factory === "کارخانه الف"));
  const e = evaluate(pageHtml(today), TUE, [mon]);
  const first = e.lines[0];
  assert.equal(first.row?.factory, "کارخانه ب");
  assert.deepEqual(first.dailyBase, { date: MON, toman: 102_000 });
  assert.equal(first.daily?.direction, "up");
  assert.equal(e.lines[1].daily?.percent, 1.2);
  // A factory with no history → nothing comparable (no arrow), never "no change".
  const fresh = evaluate(pageHtml(basketRows(AT(TUE), basePrice).map((r) => ({ ...r, factory: `${r.factory} نو` }))), TUE, [mon]);
  assert.equal(fresh.lines[0].daily, null);
});

test("% change: the base skips days without data (last business day WITH valid data) and stops at the lookback", () => {
  const sat = historyFrom(pageHtml(basketRows(AT("2026-10-17"), basePrice)), "2026-10-17");
  assert.equal(evaluate(pageHtml(basketRows(AT(TUE), basePrice)), TUE, [sat]).lines[0].dailyBase?.date, "2026-10-17");
  const old = historyFrom(pageHtml(basketRows(AT("2026-10-01"), basePrice)), "2026-10-01");
  assert.equal(evaluate(pageHtml(basketRows(AT(TUE), basePrice)), TUE, [old]).lines[0].daily, null);
});

test("% change: rounding to 0.1 and direction none", () => {
  assert.deepEqual(change(101_000, 100_000), { direction: "up", percent: 1, exact: 1 });
  assert.equal(change(100_040, 100_000)?.direction, "none");
  assert.equal(change(98_500, 100_000)?.direction, "down");
  assert.equal(change(100, 0), null);
});

test("weekly review: the oldest price of the last 7 days for the same key", () => {
  const sat = "2026-10-24";
  const hist = ["2026-10-17", "2026-10-18", "2026-10-22"].map((d, k) => historyFrom(pageHtml(basketRows(AT(d), (id, i) => basePrice(id, i) + k * 1000)), d));
  const e = evaluate(pageHtml(basketRows(AT(sat), (id, i) => basePrice(id, i) + 5000)), sat, hist, true);
  assert.equal(e.lines[0].weeklyBase?.date, "2026-10-17");
  assert.equal(e.lines[0].weekly?.percent, 5);
  assert.equal(e.lines[0].dailyBase?.date, "2026-10-22");
});

test("pre-publish: ≥ 8 of 10 valid passes, 7 fails; a page without the Toman/kg unit fails", () => {
  const drop = (n: number) => pageHtml(basketRows(AT(TUE), (id, i) => (i < n ? null : basePrice(id, i))));
  assert.equal(prePublishCheck(evaluate(drop(2))).ok, true);
  const seven = prePublishCheck(evaluate(drop(3)));
  assert.equal(seven.ok, false);
  assert.match(seven.problems[0], /only 7 of 10/);
  const noUnit = evaluate(pageHtml(basketRows(AT(TUE), basePrice), { unit: false }));
  assert.equal(prePublishCheck(noUnit).ok, false);
  assert.equal(noUnit.validCount, 0);
});

test("missing data: yesterday's prices are never today's — an all-stale page has no valid item", () => {
  const e = evaluate(pageHtml(basketRows(AT(MON), basePrice)));
  assert.equal(e.validCount, 0);
  assert.ok(e.lines.every((l) => l.status === "missing" && l.reason === "no validated price of the day" && l.daily === null));
});

test("suspicious jumps: ≥ 5 % needs a second fetch with the exact same price", () => {
  const mon = historyFrom(pageHtml(basketRows(AT(MON), basePrice)), MON);
  const jumpy = (id: string, i: number) => (id === "ipe-200" ? Math.round(basePrice(id, i) * 1.06) : basePrice(id, i));
  const e = evaluate(pageHtml(basketRows(AT(TUE), jumpy)), TUE, [mon]);
  const s = suspiciousJumps(e);
  assert.deepEqual(s.map((l) => l.item.id), ["ipe-200"]);
  assert.equal(jumpsConfirmed(s, evaluate(pageHtml(basketRows(AT(TUE), jumpy)), TUE, [mon])), true);
  assert.equal(jumpsConfirmed(s, evaluate(pageHtml(basketRows(AT(TUE), basePrice)), TUE, [mon])), false);
});

test("exception rule: ≥ 3 items moved ≥ 1 % against the morning bulletin (same key); 2 items do not", () => {
  const morning = evaluate(pageHtml(basketRows(AT(TUE), basePrice))).lines;
  const moved = (ids: string[], f = 1.01) => evaluate(pageHtml(basketRows(AT(TUE, "10:00"), (id, i) => (ids.includes(id) ? Math.round(basePrice(id, i) * f) : basePrice(id, i)))));
  assert.equal(exceptionMoves(morning, moved(["rebar-a3-12", "ipe-140"])).trigger, false);
  const three = exceptionMoves(morning, moved(["rebar-a3-12", "ipe-140", "plate-st37-10"]));
  assert.equal(three.trigger, true);
  assert.equal(three.moves.length, 3);
  assert.equal(exceptionMoves(morning, moved(["rebar-a3-12", "ipe-140", "plate-st37-10"], 1.009)).trigger, false);
  // A move on another factory than the morning's row does not count.
  const otherFactory = evaluate(pageHtml(basketRows(AT(TUE, "10:00"), basePrice).map((r) => (r.factory === "کارخانه ب" ? { ...r, toman: r.toman * 2 } : r))));
  assert.equal(exceptionMoves(morning, otherFactory).moves.length, 0);
  assert.equal(CHANNEL_CONFIG.exception.items, 3);
});

test("basket: the SHS item is 40×40×2 (CVAR-000456, W36 owner OK 2026-10-23) — variant, expect and label together", () => {
  const shs = BASKET.find((i) => i.id === "shs-40x40")!;
  assert.equal(shs.variant, "CVAR-000456");
  assert.deepEqual(shs.expect, { name: "SHS", size: "40×40×2" });
  assert.deepEqual(shs.label, { product: "قوطی مربع", grade: null, size: "40×40×2" });
  assert.equal(new Set(BASKET.map((i) => i.variant)).size, BASKET.length, "one item per variant");
});
