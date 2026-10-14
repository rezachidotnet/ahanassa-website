import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { PDFDict, PDFDocument, PDFName, PDFRawStream } from "pdf-lib";
import { bidiRuns } from "./pdf/text.ts";
import { planSectionDrawing, SECTION_SHAPES, type SectionInput } from "./sections.ts";
import { writeDxf } from "./dxf.ts";
import { writeSvg } from "./svg.ts";
import { catalogChapters, planDrawings, summarizeSkipped } from "./model.ts";
import { catalogFromSnapshot } from "./test-fixtures.ts";
import { renderRawMaterialsCatalog, renderSectionsCatalog, renderSpecSheet } from "./pdf/render.ts";
import { checkDownloadTexts, generateDownloads } from "./generate.ts";
import { DOWNLOADS_ROUTE, MAX_PDF_BYTES, fullCatalogPath, rawMaterialsCatalogPath, sectionsCatalogPath, specSheetPath } from "./paths.ts";
import { DOWNLOADS_COPY } from "./copy.ts";
import { RAW_MATERIAL_TEMPLATES } from "./raw-materials-data.ts";
import { missingRawMaterialData, rawMaterialChapters } from "./raw-materials.ts";
import { BRAND_MARK_COPPER_POINTS, BRAND_MARK_NAVY_POINTS } from "./pdf/brand-mark.ts";
import { navLinks } from "../content/nav.ts";
import { STATIC_PUBLIC_PATHS } from "../seo/indexing-policy.ts";
import { OFFICES } from "../content/company.ts";
import { CONTACT_PHONE_DISPLAY } from "../content/contact-channels.ts";
import { locales } from "../../config/locales.ts";

const repo = path.resolve(import.meta.dirname, "../..");
const FIXTURE = path.join(repo, "fixtures/snapshot/w98-flat-2026-10-14.snapshot.json");
const read = (p: string) => fs.readFileSync(path.join(repo, p), "utf8");

const PIPE: SectionInput = { formCode: "SEAMLESS_PIPE_FORM", commercialSize: "114.3×6.02 SCH40", standard: "ASME B36.10M", dimensions: { outside_diameter_mm: 114.3, wall_thickness_mm: 6.02, length_mm: 6000 } };
const IPE_FULL: SectionInput = { formCode: "IPE", commercialSize: "IPE 200", standard: "EN 10365", dimensions: { height_mm: 200, width_mm: 100, web_thickness_mm: 5.6, flange_thickness_mm: 8.5, root_radius_mm: 12 } };

// --- bidi ------------------------------------------------------------------------------------------------------

test("bidi: Latin and numbers inside fa/ar keep their order; brackets pair (UBA N0); numbers keep separators", () => {
  const visual = (t: string, base: "rtl" | "ltr") => bidiRuns(t, base).map((r) => `${r.dir}:${r.text}`);
  assert.deepEqual(visual("میلگرد آجدار Aj340 (A2)", "rtl"), ["ltr:Aj340 (A2)", "rtl:میلگرد آجدار "]);
  assert.deepEqual(visual("قطر (mm)", "rtl"), ["rtl:)", "ltr:mm", "rtl:قطر ("]);
  assert.deepEqual(visual("تلفن: 031-35134", "rtl"), ["ltr:031-35134", "rtl:تلفن: "]);
  assert.deepEqual(visual("0.4×1000×2000", "rtl"), ["ltr:0.4×1000×2000"]);
  assert.deepEqual(visual("Name in the Iranian market: میلگرد", "ltr"), ["ltr:Name in the Iranian market: ", "rtl:میلگرد"]);
});

// --- drawings --------------------------------------------------------------------------------------------------

test("drawings: a size is drawn only with its complete cross-section; missing keys are named, tapered sections never drawn", () => {
  const pipe = planSectionDrawing(PIPE);
  assert.equal(pipe?.status, "drawn");
  assert.equal(pipe?.status === "drawn" && pipe.drawing.slug, "pipe-114.3x6.02");
  const ipe = planSectionDrawing(IPE_FULL);
  assert.equal(ipe?.status === "drawn" && ipe.drawing.slug, "ipe-200");
  // The live catalog: IPE has only height_mm.
  const thin = planSectionDrawing({ ...IPE_FULL, dimensions: { height_mm: 200, length_mm: 12000 } });
  assert.deepEqual(thin, { status: "skipped", slug: "ipe-200", formCode: "IPE", reason: "missing width_mm, web_thickness_mm, flange_thickness_mm, root_radius_mm" });
  // Hollow sections and angles without radii are skipped, never drawn with sharp corners.
  const shs = planSectionDrawing({ formCode: "SHS_FORM", commercialSize: "100×100×4", standard: null, dimensions: { width_mm: 100, height_mm: 100, thickness_mm: 4, length_mm: 6000 } });
  assert.equal(shs?.status === "skipped" && shs.reason, "missing outer_radius_mm");
  const angle = planSectionDrawing({ formCode: "EQUAL_ANGLE", commercialSize: "50X50X5", standard: null, dimensions: { width_mm: 50, height_mm: 50, thickness_mm: 5 } });
  assert.equal(angle?.status === "skipped" && angle.reason, "missing root_radius_mm, toe_radius_mm");
  assert.equal(planSectionDrawing({ formCode: "INP", commercialSize: "IPN 100", standard: null, dimensions: { height_mm: 100 } })?.status, "skipped");
  // Not a section: rebar, sheet, coil.
  for (const formCode of ["RIBBED_REBAR", "HOT_ROLLED_PLATE", "GALVANIZED_COIL"]) assert.equal(planSectionDrawing({ ...PIPE, formCode }), null);
  // Every shape the generator knows draws once its keys are present.
  const full = { width_mm: 100, height_mm: 120, thickness_mm: 6, outer_radius_mm: 12, root_radius_mm: 10, toe_radius_mm: 5, web_thickness_mm: 6, flange_thickness_mm: 9, outside_diameter_mm: 100, wall_thickness_mm: 5 };
  for (const [formCode, spec] of Object.entries(SECTION_SHAPES)) {
    const p = planSectionDrawing({ formCode, commercialSize: null, standard: null, dimensions: full });
    assert.equal(p?.status, spec.shape === "tapered" ? "skipped" : "drawn", formCode);
  }
});

/** DXF as [code, value] pairs; asserts the group-code structure on the way. */
function dxfPairs(dxf: string): Array<[number, string]> {
  assert.ok(dxf.endsWith("0\r\nEOF\r\n"));
  const lines = dxf.split("\r\n").slice(0, -1);
  assert.equal(lines.length % 2, 0, "group code / value lines come in pairs");
  const pairs: Array<[number, string]> = [];
  for (let i = 0; i < lines.length; i += 2) {
    assert.match(lines[i], /^\d{1,4}$/, `line ${i + 1} is a group code`);
    pairs.push([Number(lines[i]), lines[i + 1]]);
  }
  return pairs;
}

test("DXF: AutoCAD R12 (AC1009), ASCII, layers OUTLINE/DIM/TEXT, entities only on those layers, mm title block", () => {
  for (const input of [PIPE, IPE_FULL]) {
    const p = planSectionDrawing(input);
    assert.ok(p?.status === "drawn");
    const dxf = writeDxf(p.drawing);
    assert.match(dxf, /^[\x20-\x7E\r\n]*$/, "pure ASCII");
    const pairs = dxfPairs(dxf);
    const at = (i: number) => pairs[i];
    assert.deepEqual(at(0), [0, "SECTION"]);
    const ver = pairs.findIndex(([c, v]) => c === 9 && v === "$ACADVER");
    assert.deepEqual(pairs[ver + 1], [1, "AC1009"]);
    const layers = pairs.flatMap(([c, v], i) => (c === 0 && v === "LAYER" ? [pairs[i + 1][1]] : []));
    assert.deepEqual(layers, ["0", "OUTLINE", "DIM", "TEXT"]);
    const sections = pairs.flatMap(([c, v], i) => (c === 0 && v === "SECTION" ? [pairs[i + 1][1]] : []));
    assert.deepEqual(sections, ["HEADER", "TABLES", "ENTITIES"]);
    const entStart = pairs.findIndex(([c, v], i) => c === 2 && v === "ENTITIES" && pairs[i - 1][1] === "SECTION");
    const entityLayers = new Set<string>();
    const kinds = new Set<string>();
    for (let i = entStart + 1; i < pairs.length; i++) {
      if (pairs[i][0] === 0 && pairs[i][1] !== "ENDSEC" && pairs[i][1] !== "EOF") {
        kinds.add(pairs[i][1]);
        assert.equal(pairs[i + 1][0], 8, "every entity names its layer first");
        entityLayers.add(pairs[i + 1][1]);
      }
    }
    assert.deepEqual([...entityLayers].sort(), ["DIM", "OUTLINE", "TEXT"]);
    for (const k of kinds) assert.ok(["LINE", "ARC", "CIRCLE", "SOLID", "TEXT"].includes(k), k);
    assert.ok(pairs.some(([c, v]) => c === 1 && v.includes("Dimensions in mm")));
    assert.ok(!/DWG/i.test(dxf));
    assert.equal(writeDxf(p.drawing), dxf, "deterministic");
  }
});

test("SVG preview: self-contained, same title, no script or external reference", () => {
  const p = planSectionDrawing(PIPE);
  assert.ok(p?.status === "drawn");
  const svg = writeSvg(p.drawing);
  assert.match(svg, /^<svg xmlns="http:\/\/www\.w3\.org\/2000\/svg" viewBox="0 0 [\d.]+ [\d.]+"/);
  assert.match(svg, /<title>SEAMLESS PIPE 114\.3x6\.02 SCH40<\/title>/);
  assert.ok(!/<script|href=|url\(/i.test(svg));
});

test("drawings from the W17.4 snapshot: the 12 seamless pipe sizes; every other section skipped with its missing keys", () => {
  const plan = planDrawings(catalogFromSnapshot(FIXTURE, "fa"));
  assert.equal(plan.drawn.length, 12);
  assert.ok(plan.drawn.every((d) => d.slug.startsWith("pipe-")));
  const groups = Object.fromEntries(summarizeSkipped(plan.skipped).map((g) => [g.formCode, g.reason]));
  assert.equal(groups.IPE, "missing width_mm, web_thickness_mm, flange_thickness_mm, root_radius_mm");
  assert.equal(groups.UPE, "missing web_thickness_mm, flange_thickness_mm, root_radius_mm");
  assert.equal(groups.RHS_FORM, "missing outer_radius_mm");
  assert.equal(groups.SHS_FORM, "missing outer_radius_mm");
  assert.equal(groups.EQUAL_ANGLE, "missing root_radius_mm, toe_radius_mm");
  assert.match(groups.INP, /tapered/);
  assert.match(groups.UPN, /tapered/);
});

// --- PDFs ------------------------------------------------------------------------------------------------------

const decode = (bytes: Uint8Array) => Buffer.from(bytes).toString("latin1");

/** Every embedded font is an Estedad subset with a fixed name (deterministic bytes) and a small font program. */
async function assertSubsetFonts(bytes: Uint8Array) {
  const doc = await PDFDocument.load(bytes);
  const fonts: string[] = [];
  for (const [, obj] of doc.context.enumerateIndirectObjects()) {
    if (!(obj instanceof PDFDict) || obj.get(PDFName.of("Type")) !== PDFName.of("FontDescriptor")) continue;
    const name = String(obj.get(PDFName.of("FontName")));
    fonts.push(name);
    const file = doc.context.lookup(obj.get(PDFName.of("FontFile2")));
    assert.ok(file instanceof PDFRawStream, name);
    assert.ok(file.getContentsSize() < 60_000, `${name}: ${file.getContentsSize()} B (a subset, not the 160 KB font)`);
  }
  assert.deepEqual(fonts.sort(), ["/AHANAS+Estedad-Bold", "/AHANAS+Estedad-ExtraBold", "/AHANAS+Estedad-Regular"]);
}

test("catalog PDFs: every published template, contact facts, under 5 MB with subset fonts, no price, deterministic", async () => {
  for (const locale of locales) {
    const catalog = catalogFromSnapshot(FIXTURE, locale);
    const pdf = await renderSectionsCatalog(catalog);
    assert.ok(decode(pdf.bytes).startsWith("%PDF-"));
    assert.ok(pdf.bytes.byteLength < MAX_PDF_BYTES && pdf.bytes.byteLength < 600_000, `${locale}: ${pdf.bytes.byteLength} B`);
    await assertSubsetFonts(pdf.bytes);
    const text = pdf.texts.join(" ");
    for (const chapter of catalogChapters(catalog)) for (const t of chapter.templates) assert.ok(text.includes(t.name), `${locale}: ${t.name}`);
    assert.ok(text.includes(OFFICES[locale].head.address) && text.includes(OFFICES[locale].tehran.address), "both offices");
    assert.ok(text.includes(CONTACT_PHONE_DISPLAY) && CONTACT_PHONE_DISPLAY === "031-35134", "phone in Latin digits");
    assert.deepEqual(checkDownloadTexts(pdf.texts, null), []);
    assert.ok(!/\bDWG\b/.test(text));
    const again = await renderSectionsCatalog(catalog);
    assert.deepEqual(Buffer.from(again.bytes), Buffer.from(pdf.bytes), `${locale}: same data, same bytes`);
  }
});

test("spec sheet: one family, its dimension and nominal-weight columns, the nominal-weight disclaimer", async () => {
  const catalog = catalogFromSnapshot(FIXTURE, "en");
  const box = catalog.categories.find((c) => c.code === "BOX_SECTION");
  assert.ok(box);
  const pdf = await renderSpecSheet(box, "en", new Date(catalog.contentDate));
  const text = pdf.texts.join(" ");
  for (const label of ["Size", "Width (mm)", "Height (mm)", "Thickness (mm)", "Nominal weight (kg/m)", "EN 10219-2"]) assert.ok(text.includes(label), label);
  assert.ok(text.includes("Name in the Iranian market"));
  assert.ok(text.includes("Nominal / theoretical weight"));
  assert.ok(text.includes("100×50×3"));
});

test("raw materials catalog: names and public descriptions only, 'specifications on request', no unconfirmed spec classes", async () => {
  assert.equal(RAW_MATERIAL_TEMPLATES.length, 9);
  assert.deepEqual(rawMaterialChapters().map((c) => c.slug), ["billet", "dri", "briquette", "iron-ore"]);
  for (const locale of locales) {
    const pdf = await renderRawMaterialsCatalog(locale, new Date("2026-10-14T00:00:00Z"));
    const text = pdf.texts.join(" ");
    for (const t of RAW_MATERIAL_TEMPLATES) {
      assert.ok(text.includes(t.name[locale]) && text.includes(t.description[locale]), `${locale}: ${t.key}`);
    }
    const onRequest = DOWNLOADS_COPY[locale].pdf.specOnRequest;
    assert.equal(pdf.texts.filter((s) => s === onRequest).length, RAW_MATERIAL_TEMPLATES.length);
    // Odoo's variant classes (to be confirmed by sourcing) never reach the PDF.
    for (const unconfirmed of ["62–64", "≥ 67", "≥ 88", "≥ 90", "54–58"]) assert.ok(!text.includes(unconfirmed), `${locale}: ${unconfirmed}`);
    assert.deepEqual(checkDownloadTexts(pdf.texts, null), []);
  }
  assert.ok(missingRawMaterialData().every((m) => m.missing.length > 0));
  // The extract carries public fields only.
  assert.ok(!/internal_note|price_mode|sku|AA-RM/i.test(read("lib/downloads/raw-materials-data.ts")));
});

test("download gate: refuses a currency token or a private price-source name in any drawn text", () => {
  assert.equal(checkDownloadTexts(["قیمت: ۱۲۰٬۰۰۰ ریال"], null).length, 1);
  assert.equal(checkDownloadTexts(["USD 500"], null).length, 1);
  assert.equal(checkDownloadTexts(["Raw materials catalog"], null).length, 0);
  assert.equal(checkDownloadTexts(["see examplesteelsource for more"], ["examplesteelsource"]).length, 1);
});

test("generateDownloads: writes the drawings, a spec sheet per family and both catalogs per locale; same input, same bytes", async () => {
  const catalogs = locales.map((l) => catalogFromSnapshot(FIXTURE, l));
  const dirs = [fs.mkdtempSync(path.join(os.tmpdir(), "w172-a-")), fs.mkdtempSync(path.join(os.tmpdir(), "w172-b-"))];
  try {
    const [a, b] = [await generateDownloads(dirs[0], catalogs), await generateDownloads(dirs[1], catalogs)];
    assert.deepEqual(a.files, b.files);
    for (const f of a.files) assert.ok(fs.readFileSync(path.join(dirs[0], f.path)).equals(fs.readFileSync(path.join(dirs[1], f.path))), f.path);
    const paths = new Set(a.files.map((f) => f.path));
    for (const l of locales) {
      assert.ok(paths.has(sectionsCatalogPath(l)) && paths.has(rawMaterialsCatalogPath(l)));
      for (const c of catalogs.find((x) => x.locale === l)!.categories) assert.ok(paths.has(specSheetPath(c.segment, l)), `${l} ${c.segment}`);
    }
    assert.ok(paths.has("/downloads/drawings/pipe-114.3x6.02.dxf") && paths.has("/downloads/drawings/pipe-114.3x6.02.svg"));
    for (const f of a.files.filter((x) => x.path.endsWith(".pdf"))) assert.ok(f.bytes < MAX_PDF_BYTES, f.path);
    assert.equal(a.catalogs, 6);
  } finally {
    for (const d of dirs) fs.rmSync(d, { recursive: true, force: true });
  }
});

// --- locale wiring -----------------------------------------------------------------------------------------------

test("locale wiring: the footer's catalog PDF link and every catalog link open the PDF of the page's own locale", () => {
  for (const l of locales) {
    assert.equal(fullCatalogPath(l), `/downloads/catalogs/ahanassa-catalog-steel-products-${l}.pdf`);
    assert.ok(rawMaterialsCatalogPath(l).endsWith(`-${l}.pdf`) && specSheetPath("rebar", l).endsWith(`-${l}.pdf`));
  }
  const footer = read("components/layout/SiteFooter.tsx");
  assert.match(footer, /<Link href=\{fullCatalogPath\(locale\)\}/);
  assert.match(footer, /<Link href=\{localizedPath\(locale, "\/products"\)\}/, "the /products link stays");
  const page = read("app/[locale]/downloads/page.tsx");
  assert.match(page, /href=\{c\.href\(locale\)\}/, "the primary catalog link is the page's locale");
  assert.match(page, /href=\{specSheetPath\(c\.segment, locale\)\}/);
  assert.match(page, /ITEM_LIST_TEMPLATE_PATH\(locale\)/);
  assert.match(page, /generateStaticParams/);
  assert.ok(!/\bDWG\b/.test(page + JSON.stringify(DOWNLOADS_COPY)), "never claims DWG");
});

test("navigation and SEO: /downloads in the header menu of every locale, a public sitemap page with hreflang", () => {
  const labels = { fa: "مرکز دانلود", en: "Download Center", ar: "مركز التنزيل" } as const;
  for (const l of locales) {
    const item = navLinks[l].find((n) => n.path === DOWNLOADS_ROUTE);
    assert.equal(item?.label, labels[l]);
    assert.equal(item?.desktopFrom, "xl", "desktop bar from 1280 px only: at lg the bar is full (the drawer and footer always list it)");
  }
  assert.ok((STATIC_PUBLIC_PATHS as readonly string[]).includes(DOWNLOADS_ROUTE));
  assert.match(read("components/layout/SiteHeader.tsx"), /link\.desktopFrom === "xl" && "hidden xl:inline"/);
});

test("brand mark: the PDF polygons are the header's (components/layout/brand-mark.tsx)", () => {
  const tsx = read("components/layout/brand-mark.tsx");
  assert.equal(tsx.match(/BRAND_MARK_NAVY = "([^"]+)"/)?.[1], BRAND_MARK_NAVY_POINTS);
  assert.equal(tsx.match(/BRAND_MARK_COPPER = "([^"]+)"/)?.[1], BRAND_MARK_COPPER_POINTS);
});
