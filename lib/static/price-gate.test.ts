import { test } from "node:test";
import assert from "node:assert/strict";
import { priceGateInput, priceElements, residue, scanPrices } from "./price-gate.ts";
import { scanPublicFile } from "./leak-scan.ts";
import { scanPublication } from "./publication-gate.ts";
import { PRICE_BLOCK_COPY, presentPriceBlock } from "../pricing/price-block-presentation.ts";
import { presentPriceCell, priceBlockDataFromRow, PRICE_COLUMN_COPY } from "../pricing/product-page-price.ts";
import type { PublishedPriceRow } from "../contracts/snapshot-prices.ts";

/** W9.4 price gate. SYNTHETIC rows only (no real price, factory or market source). */

const ROW: PublishedPriceRow = {
  canonical_variant_id: "CVAR-000053",
  price_irr_per_kg: 552000,
  vat_included: 1,
  factory_name_fa: "کارخانه آزمایشی ج",
  location_fa: "انبار تهران",
  published_at: "2026-10-07T07:15:00Z",
  previous_price_irr_per_kg: 540000,
  previous_published_at: "2026-10-01T07:15:00Z",
};
const SNAPSHOT = {
  tables: {
    published_prices: [ROW],
    product_variants: [
      { xid: "CVAR-000052", commercial_size: "IPE 100", sku: "AA-BM-IPE-S100-L12" },
      { xid: "CVAR-000053", commercial_size: "IPE 120", sku: "AA-BM-IPE-S120-L12" },
    ],
  },
};

function block(row: PublishedPriceRow | null, title: string): string {
  const v = presentPriceBlock("fa", row ? priceBlockDataFromRow(row) : null)!;
  const t = PRICE_BLOCK_COPY;
  const body =
    v.kind === "missing"
      ? `<p>${t.missing}</p>`
      : `<p><span>${v.amount}</span><span>${v.unit}</span></p><span>${v.vat}</span>${v.change ? `<span><svg aria-hidden="true"></svg>${v.change.percent ?? t.unchanged} ${v.change.since}</span>` : ""}<dl><dt>${t.factory}</dt><dd>${v.factoryName}</dd><dt>${t.delivery}</dt><dd>${v.deliveryLocation}</dd><dt>${t.updated}</dt><dd><time dateTime="${v.datetime}">${v.dateLabel}</time></dd></dl><p><svg></svg>${t.askToday}</p>`;
  return `<div data-aa-price-block="${row?.canonical_variant_id ?? "request"}" class="mt-6"><section aria-label="${title}"><div><h2>${title}</h2></div><div>${body}<a href="/contact">${t.cta}</a></div></section></div>`;
}

function cell(xid: string, row: PublishedPriceRow | null): string {
  const v = presentPriceCell("fa", row ? priceBlockDataFromRow(row) : null)!;
  return `<td data-aa-price-cell="${xid}" class="x">${v.kind === "missing" ? `<span>${v.label}</span>` : `<span>${v.amount}</span><span>${v.place}</span><time dateTime="${v.datetime}">${v.dateLabel}</time>`}</td>`;
}

const page = (inner: string) => `<html><body><h1 class="t">IPE Beam</h1>${inner}<p>${PRICE_COLUMN_COPY.note}</p><script>self.__next_f.push([1,"\\"data-aa-price-cell\\":\\"CVAR-000053\\""])</script></body></html>`;
const CLEAN = page(`${block(ROW, "قیمت روز IPE Beam IPE 120")}<table><tr><th>IPE 100</th>${cell("CVAR-000052", null)}</tr><tr><th>IPE 120</th>${cell("CVAR-000053", ROW)}</tr></table>`);
const scan = (files: { path: string; content: string }[], snapshot: unknown = SNAPSHOT) => scanPrices(files, priceGateInput(snapshot));
const kinds = (files: { path: string; content: string }[], snapshot?: unknown) => scan(files, snapshot).map((f) => `${f.kind}:${f.match}`);

test("a Persian product page whose price markup shows exactly the snapshot's allow-listed fields passes", () => {
  assert.deepEqual(kinds([{ path: "products/ipe-beam.html", content: CLEAN }]), []);
  assert.equal(priceElements(CLEAN).length, 3);
});

test("missing-price variant: the block for a template with no priced variant and «استعلام قیمت» cells pass", () => {
  const html = page(`${block(null, "قیمت روز IPE Beam")}<table><tr>${cell("CVAR-000052", null)}</tr></table>`);
  assert.deepEqual(kinds([{ path: "products/ipe-beam.html", content: html }]), []);
});

test("allow-list: any other text inside price markup fails (factory code, en name, a note, a source, a wrong amount)", () => {
  for (const extra of ["FAC-9003", "Test Mill C", "یادداشت آزمایشی", "منبع: بازار", "۹۹٬۹۹۹", "فقط امروز"]) {
    const html = CLEAN.replace(`<span>انبار تهران</span>`, `<span>انبار تهران</span><span>${extra}</span>`).replace("کارخانه آزمایشی ج، انبار تهران</span>", `کارخانه آزمایشی ج، انبار تهران ${extra}</span>`);
    assert.ok(kinds([{ path: "products/ipe-beam.html", content: html }]).some((k) => k.startsWith("price_text_not_allowed")), extra);
  }
  // A price shown for a variant that has no published price.
  const wrong = CLEAN.replace(`<td data-aa-price-cell="CVAR-000052" class="x"><span>استعلام قیمت</span>`, `<td data-aa-price-cell="CVAR-000052" class="x"><span>۵۵٬۲۰۰</span>`);
  assert.ok(kinds([{ path: "products/ipe-beam.html", content: wrong }]).some((k) => k.startsWith("price_text_not_allowed:data-aa-price-cell=\"CVAR-000052\"")));
});

test("unknown variant, a block for an unpriced variant, and an amount outside the price markup fail", () => {
  const unknown = CLEAN.replace(`data-aa-price-cell="CVAR-000052"`, `data-aa-price-cell="CVAR-123456"`);
  assert.ok(kinds([{ path: "products/ipe-beam.html", content: unknown }]).some((k) => k.startsWith("price_unknown_variant")));
  const unpricedBlock = page(block(null, "قیمت روز IPE Beam").replace(`data-aa-price-block="request"`, `data-aa-price-block="CVAR-000052"`));
  assert.ok(kinds([{ path: "products/ipe-beam.html", content: unpricedBlock }]).some((k) => /has no published price/.test(k)));
  const outside = CLEAN.replace(`<h1 class="t">IPE Beam</h1>`, `<h1 class="t">IPE Beam</h1><p>۵۵٬۲۰۰ تومان</p>`);
  assert.ok(kinds([{ path: "products/ipe-beam.html", content: outside }]).includes("price_outside_markup:۵۵٬۲۰۰"));
});

test("fa only: en/ar pages and locale JSON carry no price markup, copy, amount, factory or location", () => {
  const offenders = ['<td data-aa-price-cell="CVAR-000053">', PRICE_BLOCK_COPY.unit, PRICE_BLOCK_COPY.missing, PRICE_BLOCK_COPY.askToday, "۵۵٬۲۰۰", "کارخانه آزمایشی ج", "انبار تهران", '\\"data-aa-price-block\\":\\"request\\"'];
  for (const loc of ["en", "ar"]) {
    for (const o of offenders) {
      const findings = kinds([{ path: `${loc}/products/ipe-beam.html`, content: `<html><h1>IPE Beam</h1><p>${o}</p></html>` }]);
      assert.ok(findings.some((k) => k.startsWith("price_on_non_persian_page")), `${loc}: ${o}`);
    }
    assert.deepEqual(kinds([{ path: `${loc}/products/ipe-beam.html`, content: "<html><h1>IPE Beam</h1><table><tr><td>IPE 120</td></tr></table></html>" }]), []);
  }
  assert.ok(kinds([{ path: "data/rfq-catalog.en.json", content: '{"label":"۵۵٬۲۰۰"}' }]).some((k) => k.startsWith("price_on_non_persian_page")));
});

test("private snapshot: a published_prices row with any field beyond the rendered ones fails", () => {
  const extra = structuredClone(SNAPSHOT) as { tables: { published_prices: Record<string, unknown>[] } };
  extra.tables.published_prices[0].source_code = "x";
  extra.tables.published_prices[0].factory_code = "FAC-9003";
  const k = kinds([], extra);
  assert.ok(k.includes("price_field_not_allowed:source_code") && k.includes("price_field_not_allowed:factory_code"), k.join(" | "));
});

test("leak scan: pricing-API / snapshot field names (also escaped in the RSC payload) and factory codes fail in every public file", () => {
  const cases = [
    ["data/rfq-catalog.fa.json", '{"items":[{"price_irr_per_kg":552000}]}'],
    ["products/ipe-beam.html", '<script>self.__next_f.push([1,"{\\"tomanPerKg\\":55200}"])</script>'],
    ["products/ipe-beam.html", '<script>x={\\"basis_note\\":null}</script>'],
    ["assets/app.js", '{"published_at_utc":"2026-10-07T07:15:00Z"}'],
    ["products/ipe-beam.html", "<p>FAC-9003</p>"],
  ] as const;
  for (const [file, content] of cases) assert.ok(scanPublicFile(file, content).some((f) => f.kind === "pricing_field"), `${file}: ${content}`);
  assert.deepEqual(scanPublicFile("products/ipe-beam.html", CLEAN).filter((f) => f.kind === "pricing_field"), [], "the rendered page itself carries no field names");
});

test("no JSON-LD offers on a priced product page (publication gate)", () => {
  const ld = (graph: unknown) => `<script type="application/ld+json">${JSON.stringify({ "@context": "https://schema.org", "@graph": [graph] })}</script>`;
  const product = { "@type": "Product", name: "IPE Beam", url: "https://www.ahanassa.com/products/ipe-beam" };
  assert.deepEqual(scanPublication([{ path: "products/ipe-beam.html", content: CLEAN.replace("</body>", `${ld(product)}</body>`) }], new Set()), []);
  const offered = { ...product, offers: { "@type": "Offer", price: "55200", priceCurrency: "IRR" } };
  const found = scanPublication([{ path: "products/ipe-beam.html", content: CLEAN.replace("</body>", `${ld(offered)}</body>`) }], new Set()).map((f) => f.match);
  for (const m of ["offers", "Offer", "price", "priceCurrency"]) assert.ok(found.includes(m), m);
});

test("residue keeps anything that is not an allowed string or punctuation", () => {
  assert.equal(residue("کارخانه آزمایشی ج، انبار تهران", ["کارخانه آزمایشی ج", "انبار تهران"]), "");
  assert.equal(residue("کارخانه آزمایشی ج (منبع)", ["کارخانه آزمایشی ج"]), "منبع");
});
