import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, readdirSync, statSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";
import { presentPriceBlock, formatPriceAge, PRICE_BLOCK_COPY, type PriceBlockData } from "./price-block-presentation.ts";

/** W10.2 — Price block (owner decision D-W10-4). Sample values only; no real price, factory or source. */

const REPO_ROOT = path.resolve(fileURLToPath(new URL(".", import.meta.url)), "../..");
const SAMPLE: PriceBlockData = { tomanPerKg: 42300, factoryName: "کارخانه نمونه", deliveryLocation: "درب کارخانه", pricedAt: "2026-10-07T06:00:00Z" };

test("fa: amount in Persian digits with ٬, Toman per kg, VAT always included, factory, delivery, Tehran-time Persian date", () => {
  const v = presentPriceBlock("fa", SAMPLE);
  assert.ok(v && v.kind === "price");
  assert.equal(v.amount, "۴۲٬۳۰۰");
  assert.equal(v.unit, "تومان / کیلوگرم");
  assert.equal(v.vat, "شامل ارزش افزوده");
  assert.equal(v.factoryName, "کارخانه نمونه");
  assert.equal(v.deliveryLocation, "درب کارخانه");
  assert.equal(v.datetime, "2026-10-07T06:00:00.000Z");
  assert.equal(v.dateLabel, "۱۵ مهر ۱۴۰۵ ساعت ۹:۳۰");
  assert.equal(v.change, null, "no previous price -> no change line");
});

test("en/ar: the block renders nothing (Persian pages only)", () => {
  assert.equal(presentPriceBlock("en", SAMPLE), null);
  assert.equal(presentPriceBlock("ar", SAMPLE), null);
  assert.equal(presentPriceBlock("en", null), null);
});

test("missing or incomplete data -> the missing-price variant, never an empty/0/NaN value", () => {
  const bad: (PriceBlockData | null | undefined)[] = [
    null,
    undefined,
    { ...SAMPLE, tomanPerKg: 0 },
    { ...SAMPLE, tomanPerKg: Number.NaN },
    { ...SAMPLE, tomanPerKg: -5 },
    { ...SAMPLE, factoryName: "  " },
    { ...SAMPLE, deliveryLocation: "" },
    { ...SAMPLE, pricedAt: "not a date" },
    { ...SAMPLE, pricedAt: "" },
  ];
  for (const data of bad) assert.deepEqual(presentPriceBlock("fa", data), { kind: "missing" }, JSON.stringify(data));
  assert.equal(PRICE_BLOCK_COPY.missing, "استعلام قیمت");
});

test("change since the previous price: up/down with a Persian percent, unchanged, and hidden when incomplete", () => {
  const up = presentPriceBlock("fa", { ...SAMPLE, previousTomanPerKg: 41800, previousPricedAt: "2026-10-04T06:00:00Z" });
  assert.ok(up?.kind === "price");
  assert.deepEqual(up.change, { direction: "up", percent: "۱٫۲٪", since: "نسبت به ۱۲ مهر ۱۴۰۵" });
  const down = presentPriceBlock("fa", { ...SAMPLE, previousTomanPerKg: 43000, previousPricedAt: "2026-10-04T06:00:00Z" });
  assert.ok(down?.kind === "price" && down.change?.direction === "down");
  const same = presentPriceBlock("fa", { ...SAMPLE, previousTomanPerKg: 42300, previousPricedAt: "2026-10-04T06:00:00Z" });
  assert.ok(same?.kind === "price" && same.change?.direction === "none" && same.change.percent === null);
  for (const partial of [{ previousTomanPerKg: 41800 }, { previousPricedAt: "2026-10-04T06:00:00Z" }, { previousTomanPerKg: 0, previousPricedAt: "2026-10-04T06:00:00Z" }]) {
    const v = presentPriceBlock("fa", { ...SAMPLE, ...partial });
    assert.ok(v?.kind === "price" && v.change === null);
  }
});

test("age is relative to the browser clock; future/invalid timestamps give no age", () => {
  const now = new Date("2026-10-07T09:00:00Z");
  assert.equal(formatPriceAge("2026-10-07T06:00:00Z", now), "۳ ساعت پیش");
  assert.equal(formatPriceAge("2026-10-07T08:50:00Z", now), "۱۰ دقیقه پیش");
  assert.equal(formatPriceAge("2026-10-04T09:00:00Z", now), "۳ روز پیش");
  assert.equal(formatPriceAge("2026-10-08T09:00:00Z", now), null);
  assert.equal(formatPriceAge("x", now), null);
});

test("the component: no JSON-LD offers, no source field, the fixed 'ask for today's price' line, and it is not rendered on any page yet", () => {
  const component = readFileSync(path.join(REPO_ROOT, "components/products/price-block.tsx"), "utf8").replace(/\/\*[\s\S]*?\*\//g, "");
  assert.ok(!/ld\+json|offers|JsonLd/i.test(component));
  assert.match(component, /\{t\.askToday\}/);
  assert.equal(PRICE_BLOCK_COPY.askToday, "برای قیمت روز استعلام بگیرید");
  const presenter = readFileSync(path.join(REPO_ROOT, "lib/pricing/price-block-presentation.ts"), "utf8");
  const dataType = presenter.slice(presenter.indexOf("export interface PriceBlockData"), presenter.indexOf("export const PRICE_BLOCK_COPY"));
  assert.ok(!/source|url|site|provider/i.test(dataType.replace(/\/\*\*[\s\S]*?\*\//g, "")), "the data type must not carry a price source");
  const walk = (dir: string): string[] => readdirSync(dir).flatMap((f) => (statSync(path.join(dir, f)).isDirectory() ? walk(path.join(dir, f)) : [path.join(dir, f)]));
  const users = walk(path.join(REPO_ROOT, "app")).filter((f) => /\.tsx?$/.test(f) && /PriceBlock|price-block"/.test(readFileSync(f, "utf8")));
  assert.deepEqual(users, [], "D-W10-4: built now, rendered on no page until the pricing data task");
});

test("D-W10-5: the calculator CTA block exists, links to /tools/weight-calculator, carries no price, and is not rendered yet", () => {
  const source = readFileSync(path.join(REPO_ROOT, "components/home/calculator-cta.tsx"), "utf8");
  assert.match(source, /export const WEIGHT_CALCULATOR_PATH = "\/tools\/weight-calculator";/);
  assert.ok(!/تومان|Toman|price/i.test(source.replace(/\/\*[\s\S]*?\*\//g, "")), "a procurement tool, not a cart: no price in the block");
  const page = readFileSync(path.join(REPO_ROOT, "app/[locale]/page.tsx"), "utf8");
  assert.ok(!/CalculatorCta|calculator-cta/.test(page), "rendered only once the calculator ships");
});
