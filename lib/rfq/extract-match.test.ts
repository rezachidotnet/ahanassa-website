import { test } from "node:test";
import assert from "node:assert/strict";
import type { PublicRfqCatalogItem } from "./catalog-selector.ts";
import { matchLine, variantForDims } from "./extract/match.ts";
import type { ExtractedLine } from "./extract/lines.ts";
import { textToLines, transcriptToLines } from "./extract/lines.ts";
import { completeExtractedRow, composeItemNote, EDITED_SUFFIX, FROM_FILE_PREFIX, isEditedByCustomer, lineToRow, MAX_ITEM_DESCRIPTION, mergeExtractedRows, type ExtractedRfqRow } from "./extract/to-rows.ts";
import { createEmptyCatalogRow, MAX_ITEMS, type RfqRow } from "./item-row-validation.ts";

/**
 * W13.3 matching against the published catalog (the form's own /data/rfq-catalog.<locale>.json shape).
 * A small catalog with the same templates, slugs, groups and size labels as the live one (2026-10-13).
 */
let n = 0;
function items(groupCode: string, publicCategoryCode: string, templateXid: string, templateSlug: string, productLabel: string, sizes: string[]): PublicRfqCatalogItem[] {
  return sizes.map((variantSpecLabel) => ({ variantXid: `CVAR-${++n}`, templateXid, sku: `SKU-${n}`, variantSpecLabel, productLabel, templateSlug, categoryCode: "X", groupCode, publicCategoryCode, publicCategoryLabel: publicCategoryCode }));
}
const CATALOG: PublicRfqCatalogItem[] = [
  ...items("REBAR", "REBAR", "T-AJ400", "rebar-aj400", "میلگرد آجدار A3 (Aj400)", ["Ø12", "Ø14", "Ø16"]),
  ...items("REBAR", "REBAR", "T-AJ500", "rebar-aj500", "میلگرد آجدار A4 (Aj500)", ["Ø14", "Ø16"]),
  ...items("REBAR", "REBAR", "T-AJ340", "rebar-aj340", "میلگرد آجدار Aj340 (A2)", ["Ø14", "Ø16"]),
  ...items("REBAR", "REBAR", "T-S240", "rebar-s240", "میلگرد ساده A1 (S240)", ["Ø14", "Ø16", "Ø28"]),
  ...items("BEAMS", "BEAMS", "T-IPE", "ipe-beam", "تیرآهن IPE", ["IPE 160", "IPE 180"]),
  ...items("BEAMS", "BEAMS", "T-IPN", "ipn-inp-beam", "تیرآهن IPN / INP", ["IPN 160", "IPN 180"]),
  ...items("ANGLE", "ANGLE", "T-ANG", "equal-angle", "نبشی مساوی‌الاضلاع", ["50X50X5", "80X80X8"]),
  ...items("CHANNEL", "CHANNEL", "T-UPN", "channel-upn", "ناودانی UPN", ["UPN 120"]),
  ...items("CHANNEL", "CHANNEL", "T-UPE", "channel-upe", "ناودانی UPE", ["UPE 120"]),
  ...items("RHS", "HOLLOW", "T-RHS", "rectangular-hollow-section-rhs", "قوطی مستطیل (RHS)", ["100×50×4"]),
  ...items("SHS", "HOLLOW", "T-SHS", "square-hollow-section-shs", "پروفیل مربعی توخالی (SHS)", ["100×100×4"]),
  ...items("SHEET_PLATE", "SHEET", "T-PL235", "hot-rolled-plate-s235jr", "ورق سیاه ضخیم (پلیت) S235JR", ["10×1500×6000", "10×2000×6000"]),
  ...items("SHEET_PLATE", "SHEET", "T-PL355", "hot-rolled-plate-s355jr", "ورق گرم‌نورد S355JR", ["10×1500×6000"]),
  ...items("SEAMLESS_PIPE", "PIPE", "T-PIPE", "seamless-pipe-a106-grade-b", "لوله بدون درز (مانیسمان) ASTM A106 گرید B", ["114.3×6.02 SCH40", "60.325×3.912 SCH40"]),
];
const label = (m: ReturnType<typeof matchLine>) => (m.variant ? `${m.variant.templateSlug} ${m.variant.variantSpecLabel}` : m.templateXid ?? m.categoryCode ?? null);
const line = (text: string): ExtractedLine => textToLines(text)[0];
const read = (text: string) => matchLine(line(text), CATALOG);

test("matched: family + grade/type + every stated size, whatever the spelling", () => {
  const cases: [string, string][] = [
    ["میلگرد آجدار ۱۶ A3 - ۲۰ تن", "rebar-aj400 Ø16"],
    ["مبلگرد ۱۴ آجدار A3 ۵ تن", "rebar-aj400 Ø14"], // one-letter slip
    ["ميلگرد ١٦ AIII ٢٠ تن", "rebar-aj400 Ø16"], // Arabic ي and digits
    ["حديد تسليح 16 A3 15 طن", "rebar-aj400 Ø16"],
    ["میل گرد ساده ۲۸ - ۲ تن", "rebar-s240 Ø28"],
    ["تیرآهن IPE ۱۸ - ۴۰ شاخه", "ipe-beam IPE 180"], // «۱۸» is the height in cm
    ["تیر آهن IPE180 ۱۰ تن", "ipe-beam IPE 180"],
    ["ناودانی UPN ۱۲ - ۳۰ شاخه", "channel-upn UPN 120"],
    ["نبشی ۵۰×۵۰ ضخامت ۵ - ۲ تن", "equal-angle 50X50X5"],
    ["نبشی ۸×۸۰×۸۰ - ۲ تن", "equal-angle 80X80X8"], // read in another order
    ["قوطی ۱۰۰×۵۰×۴ ۲ تن", "rectangular-hollow-section-rhs 100×50×4"],
    ["پروفیل ۱۰۰*۱۰۰*۴ - ۱ تن", "square-hollow-section-shs 100×100×4"],
    ["ورق ۱۰ ST37 ۱۵۰۰×۶۰۰۰ ۳ تن", "hot-rolled-plate-s235jr 10×1500×6000"],
    ["لوله مانیسمان ۴ اینچ ۲۰ شاخه", "seamless-pipe-a106-grade-b 114.3×6.02 SCH40"],
    ["seamless pipe DN50 sch40 3 ton", "seamless-pipe-a106-grade-b 60.325×3.912 SCH40"],
    ["لوله بدون درز 2\" - ۱ تن", "seamless-pipe-a106-grade-b 60.325×3.912 SCH40"],
  ];
  for (const [text, want] of cases) {
    const m = read(text);
    assert.equal(m.status, "matched", text);
    assert.equal(label(m), want, text);
  }
  assert.equal(read("میلگرد آجدار ۱۶ A3 - ۲۰ تن").confidence, 0.95);
  assert.equal(read("نبشی ۵۰×۵۰ - ۲ تن").confidence, 0.75, "the thickness was not stated: matched, but not sure");
});

test("partial: the row gets only as far as is certain — grade or type not stated, or no size", () => {
  const rebar = read("میلگرد ۱۶ - ۲۰ تن");
  assert.equal(rebar.status, "partial");
  assert.equal(rebar.categoryCode, "REBAR");
  assert.equal(rebar.templateXid, null, "four rebar grades have Ø16 — none is picked for the customer");
  assert.deepEqual(rebar.dims, [16]);
  const beam = read("تیرآهن ۱۸ - ۴۰ شاخه");
  assert.equal(beam.status, "partial", "IPE or IPN");
  const plate = read("ورق ۱۰ S235 ۲ تن");
  assert.equal(plate.status, "partial");
  assert.equal(plate.templateXid, "T-PL235", "the grade fixes the product; the width is the customer's choice");
  const noSize = read("نبشی ۳ تن");
  assert.equal(noSize.status, "partial");
  assert.equal(noSize.templateXid, "T-ANG");
});

test("not in the catalog: steel we do not carry, sizes that do not exist, other goods — never a near miss", () => {
  for (const text of [
    "قوطی ۴۰×۴۰ ضخامت ۲ مقدار ۲٫۵ تن", // size not in the catalog
    "نبشی ۵۵×۵۵×۵ ۳ تن",
    "میلگرد آجدار A3 ۳۲ - ۵ تن",
    "ورق گالوانیزه ۰.۵ ۲ تن",
    "ورق روغنی ۱ میل ۲ تن",
    "لوله گالوانیزه ۲ اینچ ۱۰ شاخه",
    "لوله ۲ اینچ ۱۰ شاخه", // welded pipe: the catalog has seamless only
    "تیرآهن هاش ۲۰۰ - ۵ تن",
    "HEA 200 beam 3 ton",
    "stainless steel sheet 2mm 1 ton",
    "سنگ آهن کنسانتره ۱۰۰۰ تن",
    "شمش ۵ هزار تن ۵۰۰۰ تن",
  ]) {
    assert.equal(read(text).status, "not_in_catalog", text);
  }
  assert.equal(read("heavy duty angle 50x50x5 2 ton").status, "matched", "«heavy» is not HEA");
  assert.equal(read("ورق پلیت ۱۰ ST37 ۱۵۰۰×۶۰۰۰ ۱ تن").status, "matched", "«پلیت» is not «پلی…»");
});

test("variantForDims: the size read from the file picks the variant once the product is known", () => {
  assert.equal(variantForDims(CATALOG, "T-AJ500", [16])?.variantSpecLabel, "Ø16");
  assert.equal(variantForDims(CATALOG, "T-AJ500", [12]), null);
  assert.equal(variantForDims(CATALOG, "T-PL235", [10]), null, "two widths: still the customer's choice");
  assert.equal(variantForDims(CATALOG, "T-AJ500", []), null);
});

test("rows: catalog / partial / free text; Launch units respected — «۱۲۰ شاخه» is never turned into kg", () => {
  const matched = lineToRow(line("میلگرد آجدار ۱۶ A3 - ۲۰ تن"), CATALOG, "spreadsheet", "f1");
  assert.equal(matched.fields.mode, "catalog");
  assert.ok(matched.fields.mode === "catalog" && matched.fields.variantXid && matched.fields.quantityValue === "20" && matched.fields.unit === "ton");
  assert.equal(matched.extract.review, false);

  const branchRebar = lineToRow(line("میلگرد آجدار ۱۶ A3 - ۱۲۰ شاخه"), CATALOG, "spreadsheet", "f1");
  assert.ok(branchRebar.fields.quantityValue === "120" && branchRebar.fields.unit === "branch", "rebar offers branch");

  const branchBeam = lineToRow(line("تیرآهن IPE ۱۸ - ۴۰ شاخه"), CATALOG, "spreadsheet", "f1");
  assert.equal(branchBeam.fields.quantityValue, "", "beams offer kg/ton only: the quantity is left to the visitor");
  assert.deepEqual(branchBeam.extract.reasons, ["unit_not_offered"]);
  assert.equal(branchBeam.extract.review, true);

  const free = lineToRow(line("سنگ آهن کنسانتره ۱۰۰۰ تن"), CATALOG, "spreadsheet", "f1");
  assert.ok(free.fields.mode === "custom" && free.fields.productTitle === "سنگ آهن کنسانتره" && free.fields.quantityValue === "1000");
  assert.deepEqual(free.extract.reasons, ["not_in_catalog"]);
  assert.equal(free.extract.review, false, "outside the catalog is not «uncertain»");

  const freeBranch = lineToRow(line("لوله ۲ اینچ ۱۰ شاخه"), CATALOG, "spreadsheet", "f1");
  assert.ok(freeBranch.fields.mode === "custom" && freeBranch.fields.quantityValue === "");
  assert.equal(freeBranch.extract.review, true);

  const partial = lineToRow(line("میلگرد ۱۶ - ۵۰ شاخه"), CATALOG, "spreadsheet", "f1");
  assert.ok(partial.fields.mode === "catalog" && partial.fields.categoryCode === "REBAR" && !partial.fields.templateXid && !partial.fields.variantXid);
  assert.ok(partial.extract.reasons.includes("check_product") && partial.extract.reasons.includes("unit_not_offered"));
  assert.deepEqual(partial.extract.wanted, { quantityValue: "50", unit: "branch" });

  const missing = lineToRow({ ...line("میلگرد آجدار ۱۶ A3 - ۲۰ تن"), quantity: null }, CATALOG, "spreadsheet", "f1");
  assert.deepEqual(missing.extract.reasons, ["quantity_missing"]);

  const picture = lineToRow(line("میلگرد آجدار ۱۶ A3 - ۲۰ تن"), CATALOG, "image", "f2");
  assert.equal(picture.extract.review, true, "a picture's numbers are always checked");
  assert.ok(picture.extract.confidence < 0.8);
});

test("completeExtractedRow: picking the product picks the size read with it and restores a held-back quantity", () => {
  const partial = lineToRow(line("میلگرد ۱۶ - ۵۰ شاخه"), CATALOG, "spreadsheet", "f1");
  assert.equal(partial.fields.mode, "catalog");
  if (partial.fields.mode !== "catalog") return;
  const picked = completeExtractedRow(partial.fields, { ...partial.fields, templateXid: "T-AJ500", variantXid: null }, partial.extract, CATALOG);
  assert.ok(picked.mode === "catalog" && picked.variantXid === CATALOG.find((c) => c.templateXid === "T-AJ500" && c.variantSpecLabel === "Ø16")?.variantXid);
  assert.deepEqual([picked.quantityValue, picked.unit], ["50", "branch"]);
  // Nothing the visitor typed is overwritten, and a row not from a file is left alone.
  const typed = completeExtractedRow(partial.fields, { ...partial.fields, templateXid: "T-AJ500", quantityValue: "7", unit: "ton" }, partial.extract, CATALOG);
  assert.deepEqual([typed.quantityValue, typed.unit], ["7", "ton"]);
  const plain = createEmptyCatalogRow().fields;
  assert.deepEqual(completeExtractedRow(plain, { ...plain, templateXid: "T-AJ500" } as typeof plain, undefined, CATALOG), { ...plain, templateXid: "T-AJ500" });
});

test("merging: empty rows are replaced, filled rows kept first, MAX_ITEMS respected and the rest counted", () => {
  const rows = (k: number) => Array.from({ length: k }, (_, i) => lineToRow(line(`میلگرد آجدار ۱۶ A3 - ${i + 1} تن`), CATALOG, "spreadsheet", "f"));
  const empty = [createEmptyCatalogRow()];
  const first = mergeExtractedRows(empty, rows(3));
  assert.deepEqual([first.rows.length, first.added, first.overflow], [3, 3, 0]);
  const typed: RfqRow = { ...createEmptyCatalogRow(), fields: { ...createEmptyCatalogRow().fields, quantityValue: "5" } };
  const second = mergeExtractedRows([typed, createEmptyCatalogRow()], rows(25));
  assert.equal(second.rows[0], typed);
  assert.deepEqual([second.rows.length, second.added, second.overflow], [MAX_ITEMS, MAX_ITEMS - 1, 25 - (MAX_ITEMS - 1)]);
  assert.equal(mergeExtractedRows(empty, []).rows.length, 1, "never an empty form");
});

test("provenance for Odoo: «از فایل: …» in the existing item note, «ویرایش‌شده توسط مشتری» when changed, ≤ 1000 characters", () => {
  const row: ExtractedRfqRow = lineToRow(line("میلگرد آجدار ۱۶ A3 - ۲۰ تن"), CATALOG, "spreadsheet", "f1");
  assert.equal(isEditedByCustomer(row), false);
  assert.equal(composeItemNote("", row.extract, false), `${FROM_FILE_PREFIX}میلگرد آجدار ۱۶ A3 - ۲۰ تن`);
  const edited = { ...row, fields: { ...row.fields, quantityValue: "25" } };
  assert.equal(isEditedByCustomer(edited), true);
  assert.equal(isEditedByCustomer({ ...row, fields: { ...row.fields, notes: "تحویل اصفهان" } }), false, "their own note is not an edit of what was read");
  assert.equal(composeItemNote("تحویل اصفهان", row.extract, true), `تحویل اصفهان | ${FROM_FILE_PREFIX}میلگرد آجدار ۱۶ A3 - ۲۰ تن${EDITED_SUFFIX}`);
  assert.equal(composeItemNote(" own ", undefined, false), "own");
  const long = composeItemNote("ن".repeat(700), { ...row.extract, rawText: "ر".repeat(300) }, true);
  assert.ok([...long].length <= MAX_ITEM_DESCRIPTION && long.startsWith("ن".repeat(700)) && long.endsWith(EDITED_SUFFIX));
  assert.equal(composeItemNote("ن".repeat(990), row.extract, false), "ن".repeat(990), "no room: the customer's own note wins");
});

test("recorded vision transcripts of the photo fixtures → rows (fake AI; real outputs of 2026-10-13, digit misreads included)", () => {
  // phone-photo.fa.jpg (scripts/rfq/build-extract-fixtures.ts) after enhance.ts, @cf/meta/llama-4-scout-17b-16e-instruct
  const phone = "لیست اقلام درخواستی\nردیف شرح کالا | سایز | مقدار | واحد\n۱ میلگرد آجدار A3 | ۱۶ | ۲۰ | تن\n۲ تیرآهن IPE | ۱۸ | ۴۰ | شاخه\n۳ نبشی | ۵۰×۵۰×۵ | ۲۵۰۰ | کیلوگرم\n۴ ورق سیاه ST37 | ۶۰۰۰×۱۵۰۰×۱۰ | ۵ | تن\n۵ قوطی | ۲×۴۰×۴۰ | ۲.۵ | تن";
  const rows = transcriptToLines(phone).map((l) => lineToRow(l, CATALOG, "image", "photo"));
  assert.deepEqual(rows.map((r) => [r.extract.status, r.fields.quantityValue]), [
    ["matched", "20"],
    ["matched", ""], // IPE 180 (the «۱۸۰» read as «۱۸» = 180 by the cm rule); branch not offered for beams
    ["matched", "2500"], // the photo says ۳۵۰۰ — the misread is why every picture row says «لطفاً بررسی کنید»
    ["matched", "5"],
    ["not_in_catalog", "2.5"],
  ]);
  assert.ok(rows.every((r) => r.extract.review));
  // handwritten-photo.fa.jpg (handwriting-style, same script), same model
  const hand = "لیست خرید\nمیله گرد ۱۲ آجدار A3 - ۱۲تن\nناودانی ۱۲-۳۰ UPN شاخه\nلوله مانیسمان ۲ اینچ ۲۰ شاخه\nنبشی -۸×۸۰×۸۰ - ۲تن";
  const handRows = transcriptToLines(hand).map((l) => lineToRow(l, CATALOG, "image", "hand"));
  assert.equal(handRows.length, 4);
  assert.equal(handRows[3].extract.status, "matched");
  assert.ok(handRows.every((r) => r.extract.review && r.extract.rawText.length > 0));
});
