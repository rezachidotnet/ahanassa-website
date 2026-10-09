import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { buildRfqRowPrefillQuery, parseRfqRowPrefill, RFQ_PREFILL_PARAMS } from "./rfq-prefill.ts";
import { buildRfqItemInput, createCatalogRowFromSelection } from "./item-row-validation.ts";

/** W10.1 — RFQ row pre-fill from the weight calculator: existing row model only, each value policy-checked. */

const q = (s: string) => new URLSearchParams(s);
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");

test("valid unit + quantity for the group are applied", () => {
  assert.deepEqual(parseRfqRowPrefill(q("variant=CVAR-1&qty=100&unit=branch"), "REBAR"), { unit: "branch", quantityValue: "100" });
  assert.deepEqual(parseRfqRowPrefill(q("qty=4.512&unit=ton"), "BEAMS"), { unit: "ton", quantityValue: "4.512" });
  assert.deepEqual(parseRfqRowPrefill(q("qty=3&unit=sheet"), "SHEET_PLATE"), { unit: "sheet", quantityValue: "3" });
});

test("a unit the group does not allow, an unknown unit, or a bad quantity drops the quantity entirely", () => {
  assert.deepEqual(parseRfqRowPrefill(q("qty=10&unit=branch"), "BEAMS"), {}, "BEAMS: kg/ton only");
  assert.deepEqual(parseRfqRowPrefill(q("qty=10&unit=piece"), "REBAR"), {}, "Launch-deferred unit");
  assert.deepEqual(parseRfqRowPrefill(q("qty=10&unit=gram"), "REBAR"), {});
  for (const bad of ["0", "-5", "abc", "1e3", "۱۰", "", "10kg"]) assert.deepEqual(parseRfqRowPrefill(q(`qty=${encodeURIComponent(bad)}&unit=kg`), "REBAR"), {}, bad);
  assert.deepEqual(parseRfqRowPrefill(q("unit=kg"), "REBAR"), {});
});

test("length only for groups with a length input (ANGLE/CHANNEL), whole positive millimetres", () => {
  assert.deepEqual(parseRfqRowPrefill(q("qty=5&unit=kg&length=6000"), "CHANNEL"), { unit: "kg", quantityValue: "5", lengthMm: "6000" });
  assert.deepEqual(parseRfqRowPrefill(q("length=6000"), "ANGLE"), { lengthMm: "6000" });
  assert.deepEqual(parseRfqRowPrefill(q("qty=5&unit=kg&length=6000"), "REBAR"), { unit: "kg", quantityValue: "5" }, "REBAR's length is product identity");
  assert.deepEqual(parseRfqRowPrefill(q("length=6.5"), "ANGLE"), {});
  assert.deepEqual(parseRfqRowPrefill(q("length=0"), "ANGLE"), {});
});

test("build → parse round trip; parameter names are the documented ones", () => {
  assert.deepEqual(RFQ_PREFILL_PARAMS, { quantity: "qty", unit: "unit", lengthMm: "length" });
  const query = buildRfqRowPrefillQuery("CVAR-000019", { quantity: 912.3, unit: "kg", lengthMm: 12000 });
  assert.equal(query, "variant=CVAR-000019&qty=912.3&unit=kg&length=12000");
  assert.deepEqual(parseRfqRowPrefill(q(query), "CHANNEL"), { unit: "kg", quantityValue: "912.3", lengthMm: "12000" });
});

test("the pre-filled row is the same row model and produces the same existing wire shape (no new API field)", () => {
  const row = createCatalogRowFromSelection({ categoryCode: "rebar", templateXid: "CTMPL-1", variantXid: "CVAR-1" }, { unit: "branch", quantityValue: "100" });
  assert.deepEqual(row.fields, { mode: "catalog", categoryCode: "rebar", templateXid: "CTMPL-1", variantXid: "CVAR-1", quantityValue: "100", unit: "branch", notes: "", lengthMm: "" });
  assert.deepEqual(buildRfqItemInput(row.fields, "fa"), { catalogVariantXid: "CVAR-1", quantityText: "100 شاخه", unit: "branch", description: undefined, lengthMm: undefined });
  const plain = createCatalogRowFromSelection({ categoryCode: null, templateXid: "CTMPL-1", variantXid: "CVAR-1" });
  assert.deepEqual(plain.fields, { mode: "catalog", categoryCode: null, templateXid: "CTMPL-1", variantXid: "CVAR-1", quantityValue: "", unit: "kg", notes: "", lengthMm: "" }, "no pre-fill: unchanged");
});

test("the static /contact form pre-fills only the resolved preselection, through parseRfqRowPrefill", () => {
  const src = fs.readFileSync(path.join(ROOT, "components/contact/static-enquiry-form.tsx"), "utf8");
  assert.match(src, /const prefill = preselection && query \? parseRfqRowPrefill\(query, preselection\.groupCode\) : undefined;/);
  assert.match(src, /catalogPreselectionPrefill=\{prefill\}/);
  const form = fs.readFileSync(path.join(ROOT, "components/contact/enquiry-form.tsx"), "utf8");
  assert.match(form, /\}, catalogPreselectionPrefill\)\n\s*: createEmptyCatalogRow\(\),/);
});
