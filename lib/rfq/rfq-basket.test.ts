import { test } from "node:test";
import assert from "node:assert/strict";
import {
  addCatalogItemToRows,
  clearRfqBasket,
  countRfqBasketItems,
  EMPTY_RFQ_CUSTOMER,
  parseRfqBasket,
  readRfqBasket,
  resolveContinueBrowsingHref,
  restoreRfqBasketRows,
  RFQ_BACK_STORAGE_KEY,
  rfqBasketStorageKey,
  safeBackPath,
  serializeRfqBasket,
  writeRfqBasket,
  type RfqBasket,
} from "./rfq-basket.ts";
import { buildRfqItemInput, createCatalogRowFromSelection, createEmptyCatalogRow, MAX_ITEMS, type RfqCatalogRowFields, type RfqRow } from "./item-row-validation.ts";
import type { PublicRfqCatalogItem } from "./catalog-selector.ts";
import { readFileSync } from "node:fs";

/** W10.5 — RFQ basket: add/merge/dedupe, storage (incl. unavailable), the «ادامه انتخاب محصول» target, success clear. */

const ORIGIN = "https://www.ahanassa.com";

class MemoryStorage implements Storage {
  map = new Map<string, string>();
  get length() {
    return this.map.size;
  }
  clear() {
    this.map.clear();
  }
  getItem(key: string) {
    return this.map.get(key) ?? null;
  }
  key(i: number) {
    return [...this.map.keys()][i] ?? null;
  }
  removeItem(key: string) {
    this.map.delete(key);
  }
  setItem(key: string, value: string) {
    this.map.set(key, value);
  }
}

/** Private mode / blocked site data: every call throws. */
const throwingStorage = new Proxy({} as Storage, {
  get() {
    return () => {
      throw new DOMException("blocked", "SecurityError");
    };
  },
});

const sel = (variantXid: string) => ({ categoryCode: "REBAR", templateXid: `T-${variantXid}`, variantXid });
const catalog = (fields: RfqRow["fields"]) => fields as RfqCatalogRowFields;
const item = (variantXid: string, templateXid = `T-${variantXid}`, publicCategoryCode = "REBAR"): PublicRfqCatalogItem =>
  ({ variantXid, templateXid, publicCategoryCode, publicCategoryLabel: "میلگرد", sku: "", variantSpecLabel: "Ø16", productLabel: "میلگرد", templateSlug: "rebar", categoryCode: "REBAR", groupCode: "REBAR" }) as unknown as PublicRfqCatalogItem;

test("add: a new variant is appended to the existing rows, never replacing them", () => {
  const first = createCatalogRowFromSelection(sel("A"), { quantityValue: "5", unit: "ton" });
  const { rows, rowId, outcome } = addCatalogItemToRows([first], sel("B"), { quantityValue: "100", unit: "branch" });
  assert.equal(outcome, "added");
  assert.equal(rows.length, 2);
  assert.equal(rows[0], first);
  assert.equal(rows[1].id, rowId);
  assert.deepEqual([catalog(rows[1].fields).variantXid, rows[1].fields.quantityValue, rows[1].fields.unit], ["B", "100", "branch"]);
});

test("add: the blank starting row is replaced, so it cannot block the submit", () => {
  const { rows, outcome } = addCatalogItemToRows([createEmptyCatalogRow()], sel("A"));
  assert.equal(outcome, "added");
  assert.equal(rows.length, 1);
  assert.equal(catalog(rows[0].fields).variantXid, "A");
});

test("add: the fa factory note travels with the item (W9.6 prefill)", () => {
  const { rows } = addCatalogItemToRows([], sel("A"), { notes: "کارخانه: ذوب آهن" });
  assert.equal(rows[0].fields.notes, "کارخانه: ذوب آهن");
});

test("dedupe: the same variant again adds no row and returns the existing row to focus", () => {
  const a = createCatalogRowFromSelection(sel("A"), { quantityValue: "5", unit: "ton" });
  const b = createCatalogRowFromSelection(sel("B"));
  const { rows, rowId, outcome } = addCatalogItemToRows([a, b], sel("A"), { quantityValue: "9", unit: "kg", notes: "کارخانه: X" });
  assert.equal(outcome, "existing");
  assert.equal(rowId, a.id);
  assert.equal(rows.length, 2);
  // What the visitor typed is kept; only empty fields are filled.
  assert.deepEqual([rows[0].fields.quantityValue, rows[0].fields.unit, rows[0].fields.notes], ["5", "ton", "کارخانه: X"]);
});

test("dedupe: an existing row with no quantity takes the hand-off quantity", () => {
  const a = createCatalogRowFromSelection(sel("A"));
  const { rows } = addCatalogItemToRows([a], sel("A"), { quantityValue: "12", unit: "branch", lengthMm: "6000" });
  assert.deepEqual([rows[0].fields.quantityValue, rows[0].fields.unit, catalog(rows[0].fields).lengthMm], ["12", "branch", "6000"]);
});

test("full: at MAX_ITEMS filled rows nothing is added", () => {
  const full = Array.from({ length: MAX_ITEMS }, (_, i) => createCatalogRowFromSelection(sel(`V${i}`)));
  const { rows, rowId, outcome } = addCatalogItemToRows(full, sel("NEW"));
  assert.equal(outcome, "full");
  assert.equal(rowId, null);
  assert.equal(rows, full);
  assert.equal(addCatalogItemToRows(full, sel("V3")).outcome, "existing", "an item already in a full list is still found");
});

test("the wire item of an added row is the existing RfqItemInput shape (payload unchanged)", () => {
  const { rows } = addCatalogItemToRows([], sel("A"), { quantityValue: "3", unit: "ton" });
  assert.deepEqual(buildRfqItemInput(rows[0].fields, "fa"), { catalogVariantXid: "A", quantityText: "3 تن", unit: "ton", description: undefined, lengthMm: undefined });
});

test("storage round trip: rows and customer fields survive; empty rows are not stored", () => {
  const store = new MemoryStorage();
  const rows = [createCatalogRowFromSelection(sel("A"), { quantityValue: "5", unit: "ton" }), createEmptyCatalogRow()];
  const customer = { ...EMPTY_RFQ_CUSTOMER, name: "رضا", email: "a@b.co", phoneCountry: "IR", phoneLocal: "9121234567", message: "فوری" };
  writeRfqBasket("fa", { rows: rows.map((r) => r.fields), customer }, store);
  const back = readRfqBasket("fa", store)!;
  assert.equal(back.rows.length, 1);
  assert.deepEqual(back.customer, customer);
  assert.equal(countRfqBasketItems(back), 1);
  assert.equal(readRfqBasket("en", store), null, "one basket per locale");
});

test("an empty basket removes the key instead of storing it", () => {
  const store = new MemoryStorage();
  store.setItem(rfqBasketStorageKey("fa"), "x");
  writeRfqBasket("fa", { rows: [createEmptyCatalogRow().fields], customer: { ...EMPTY_RFQ_CUSTOMER, phoneCountry: "IR" } }, store);
  assert.equal(store.getItem(rfqBasketStorageKey("fa")), null);
  assert.equal(serializeRfqBasket({ rows: [], customer: EMPTY_RFQ_CUSTOMER }), null);
});

test("storage unavailable: read/write/clear/back never throw and fall back to defaults", () => {
  const basket: RfqBasket = { rows: [createCatalogRowFromSelection(sel("A")).fields], customer: EMPTY_RFQ_CUSTOMER };
  assert.doesNotThrow(() => writeRfqBasket("fa", basket, throwingStorage));
  assert.equal(readRfqBasket("fa", throwingStorage), null);
  assert.doesNotThrow(() => clearRfqBasket("fa", throwingStorage));
  assert.equal(resolveContinueBrowsingHref("fa", "", ORIGIN, throwingStorage), "/products");
  assert.equal(resolveContinueBrowsingHref("ar", `${ORIGIN}/ar/prices`, ORIGIN, throwingStorage), "/ar/prices");
  // No storage at all (SSR, or window.sessionStorage itself throws).
  assert.equal(readRfqBasket("fa", null), null);
  assert.doesNotThrow(() => writeRfqBasket("fa", basket, null));
});

test("a tampered stored value is sanitized, never trusted", () => {
  assert.equal(parseRfqBasket("{not json"), null);
  assert.equal(parseRfqBasket(JSON.stringify({ v: 99, rows: [] })), null);
  const raw = JSON.stringify({
    v: 1,
    rows: [
      { mode: "catalog", variantXid: "A", quantityValue: "1", unit: "gram", notes: 5 },
      { mode: "evil", foo: 1 },
      ...Array.from({ length: 30 }, (_, i) => ({ mode: "custom", productTitle: `p${i}`, quantityValue: "1", unit: "kg" })),
    ],
    customer: { name: "x".repeat(5000), email: 7 },
  });
  const basket = parseRfqBasket(raw)!;
  assert.equal(basket.rows.length, MAX_ITEMS);
  assert.equal(basket.rows[0].unit, "kg", "unknown unit -> default");
  assert.equal(basket.rows[0].notes, "");
  assert.equal(basket.customer.name.length, 200);
  assert.equal(basket.customer.email, "");
});

test("restore re-resolves catalog rows against the published list", () => {
  const stored = [
    { ...createCatalogRowFromSelection({ categoryCode: "OLD", templateXid: "WRONG", variantXid: "A" }, { quantityValue: "2", unit: "ton" }).fields },
    { ...createCatalogRowFromSelection(sel("GONE"), { quantityValue: "4", unit: "kg" }).fields },
  ];
  const rows = restoreRfqBasketRows(stored, [item("A", "T-A", "REBAR_PUBLIC")]);
  assert.deepEqual([catalog(rows[0].fields).variantXid, catalog(rows[0].fields).templateXid, catalog(rows[0].fields).categoryCode], ["A", "T-A", "REBAR_PUBLIC"]);
  assert.deepEqual([catalog(rows[1].fields).variantXid, rows[1].fields.quantityValue], [null, "4"], "unpublished variant cleared, quantity kept");
  assert.equal(restoreRfqBasketRows([], []).length, 1, "nothing stored -> one blank row");
  assert.equal(catalog(restoreRfqBasketRows(stored, [])[1].fields).variantXid, "GONE", "no list loaded -> kept; the Worker re-validates");
});

test("success clears the basket, the typed fields and the back target", () => {
  const store = new MemoryStorage();
  writeRfqBasket("fa", { rows: [createCatalogRowFromSelection(sel("A"), { quantityValue: "1", unit: "kg" }).fields], customer: { ...EMPTY_RFQ_CUSTOMER, name: "x" } }, store);
  store.setItem(RFQ_BACK_STORAGE_KEY, "/products");
  store.setItem("unrelated", "keep");
  clearRfqBasket("fa", store);
  assert.equal(readRfqBasket("fa", store), null);
  assert.equal(store.getItem(RFQ_BACK_STORAGE_KEY), null);
  assert.equal(store.getItem("unrelated"), "keep");
});

test("back link: same-origin referrer only, never the form itself, fallback /products per locale", () => {
  assert.equal(safeBackPath(`${ORIGIN}/products/rebar?size=16#t`, ORIGIN), "/products/rebar?size=16#t");
  assert.equal(safeBackPath(`${ORIGIN}/`, ORIGIN), "/");
  for (const bad of ["https://evil.example/products", "javascript:alert(1)", "//evil.example/x", `${ORIGIN}/contact?variant=A`, `${ORIGIN}/en/contact`, `${ORIGIN}/ar/contact/`, `${ORIGIN}/request`, `${ORIGIN}/contact.html`, "", "http://www.ahanassa.com/products"]) {
    assert.equal(safeBackPath(bad, ORIGIN), null, bad);
  }
  const store = new MemoryStorage();
  assert.equal(resolveContinueBrowsingHref("fa", "", ORIGIN, store), "/products");
  assert.equal(resolveContinueBrowsingHref("en", "https://google.com/", ORIGIN, store), "/en/products");
  assert.equal(resolveContinueBrowsingHref("fa", `${ORIGIN}/prices`, ORIGIN, store), "/prices");
  // A reload of /contact (referrer is now /contact itself, or empty) keeps the remembered page.
  assert.equal(resolveContinueBrowsingHref("fa", `${ORIGIN}/contact`, ORIGIN, store), "/prices");
  assert.equal(resolveContinueBrowsingHref("fa", "", ORIGIN, store), "/prices");
  store.setItem(RFQ_BACK_STORAGE_KEY, "https://evil.example/");
  assert.equal(resolveContinueBrowsingHref("ar", "", ORIGIN, store), "/ar/products", "a tampered remembered value is ignored");
});

// ---- Wiring (source checks: the components are JSX, the node runner cannot render them) ----

const ROOT = new URL("../../", import.meta.url);
const read = (rel: string) => readFileSync(new URL(rel, ROOT), "utf8");

test("form: success clears the basket inside the ok branch; storage is written only after restore and never in the success state", () => {
  const form = read("components/contact/enquiry-form.tsx");
  assert.match(form, /if \(body\?\.ok\) \{\n(\s*\/\/.*\n)?\s*clearRfqBasket\(locale\);\n\s*setReference\(body\.reference\);/);
  assert.match(form, /if \(!persistBasket \|\| status === "success"\) return;\n\s*writeRfqBasket\(locale,/);
  assert.match(form, /<ButtonLink href=\{continueBrowsingHref\} variant="secondary"/);
  const wrapper = read("components/contact/static-enquiry-form.tsx");
  assert.match(wrapper, /persistBasket=\{Boolean\(ready\)\}/);
  assert.match(wrapper, /key=\{ready \? "ready" : "loading"\}/);
});

test("header: the badge is one inline pill below lg and one hanging tab at lg+ (hidden once scrolled), outside the bar's flex row; empty basket renders nothing", () => {
  const header = read("components/layout/SiteHeader.tsx");
  assert.match(header, /<RfqBasketBadge locale=\{locale\} variant="bar" className="lg:hidden" \/>/);
  assert.match(header, /"pointer-events-none absolute inset-x-0 top-full hidden [^"]*lg:block",\n\s*scrolled && "invisible opacity-0",\n\s*\)\}\n\s*>\n\s*<div className="container-x flex justify-end">\n\s*<RfqBasketBadge locale=\{locale\} variant="tab"/, "the desktop tab hides once the page is scrolled");
  const badge = read("components/layout/rfq-basket-badge.tsx");
  assert.match(badge, /if \(count === 0\) return null;/);
  assert.match(badge, /setCount\(onForm \? 0 : countRfqBasketItems/, "hidden on the form page itself");
  assert.match(badge, /useState\(0\)/, "prerendered with 0 -> no markup, no hydration difference");
});
