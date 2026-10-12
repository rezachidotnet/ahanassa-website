import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { locales } from "../../config/locales.ts";
import { buildItemListTemplate, ITEM_LIST_COLUMNS, ITEM_LIST_TEMPLATE_PATH } from "./item-list-template.ts";
import { checkFileBytes } from "./attachment-policy.ts";

const ROOT = path.resolve(import.meta.dirname, "../..");

test("item-list templates: committed public/downloads files equal the generator (node scripts/rfq/build-item-list-template.ts)", () => {
  for (const locale of locales) {
    const file = path.join(ROOT, "public", ITEM_LIST_TEMPLATE_PATH(locale));
    assert.ok(fs.existsSync(file), `${file} missing`);
    assert.deepEqual(new Uint8Array(fs.readFileSync(file)), buildItemListTemplate(locale), `${locale}: re-run the generator`);
  }
});

test("item-list templates: deterministic, the six owner-specified columns, RTL for fa/ar, no macro — and accepted by the upload policy when sent back", () => {
  for (const locale of locales) {
    const bytes = buildItemListTemplate(locale);
    assert.deepEqual(buildItemListTemplate(locale), bytes);
    const text = new TextDecoder().decode(bytes);
    for (const label of ITEM_LIST_COLUMNS[locale]) assert.ok(text.includes(`<t>${label.replace(/&/g, "&amp;")}</t>`), `${locale}: ${label}`);
    assert.equal(text.includes('rightToLeft="1"'), locale !== "en");
    assert.equal(/vbaProject|macroEnabled|<f>/.test(text), false);
    assert.deepEqual(checkFileBytes(bytes, `list.xlsx`), { ok: true, ext: "xlsx" });
  }
  assert.deepEqual(ITEM_LIST_COLUMNS.en, ["Product", "Size", "Thickness", "Grade / standard", "Quantity", "Unit"]);
});
