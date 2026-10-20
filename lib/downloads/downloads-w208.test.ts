import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { inflateRawSync } from "node:zlib";
import { matchesSizeQuery, normalizeSearchText, parseSizeQuery, sizeParts, type SearchableRow } from "./search.ts";
import { downloadFilterSearch, parseDownloadFilter, EMPTY_DOWNLOAD_FILTER } from "./filter-state.ts";
import { buildDownloadCenter, formatFileSize } from "./center.ts";
import { downloadsManifestJson, loadDownloadSizes } from "./file-sizes.ts";
import { checkDownloadTexts, generateDownloads, PRICE_TOKENS } from "./generate.ts";
import { crc32, writeZip } from "./zip.ts";
import { renderDrawingSheet } from "./pdf/drawing-sheet.ts";
import { planDrawings } from "./model.ts";
import { familyZipPath } from "./paths.ts";
import { catalogFromSnapshot, type VariantOverlay } from "./test-fixtures.ts";
import { locales } from "../../config/locales.ts";

/**
 * W20.8 — the one-page Download Center: size search (fa/ar/Latin digits, forms, family words), the shareable
 * filter URL, the page model against the files the build writes (sizes, ZIPs, per-size PDF sheets), and the
 * page's progressive-enhancement / price rules.
 */

const repo = path.resolve(import.meta.dirname, "../..");
const FIXTURE = path.join(repo, "fixtures/snapshot/w98-flat-2026-10-14.snapshot.json");
const OVERLAY = (JSON.parse(fs.readFileSync(path.join(repo, "lib/downloads/fixtures/w205-sections.json"), "utf8")) as { variants: VariantOverlay }).variants;
const catalog = (locale: (typeof locales)[number] = "fa") => catalogFromSnapshot(FIXTURE, locale, OVERLAY);
const read = (p: string) => fs.readFileSync(path.join(repo, p), "utf8");

// --- search ------------------------------------------------------------------------------------------------------

const rowsOf = (c = buildDownloadCenter(catalog())): Array<SearchableRow & { size: string; label: string }> =>
  c.families.flatMap((f) => f.rows.map((r) => ({ family: f.code, form: r.formCode, size: r.sizeKey, text: normalizeSearchText(r.searchText), label: r.size })));
const find = (q: string) => rowsOf().filter((r) => matchesSizeQuery(r, parseSizeQuery(q))).map((r) => r.label);

test("search: normalisation of digits, separators and Arabic letters", () => {
  assert.equal(normalizeSearchText("  IPE ۲۰۰ "), "ipe 200");
  assert.equal(normalizeSearchText("١٠٠ × ٥٠"), "100x50");
  assert.equal(normalizeSearchText("۱۱۴/۳"), "114.3");
  assert.equal(normalizeSearchText("١١٤٫٣"), "114.3");
  assert.equal(normalizeSearchText("زاوية"), "زاویه");
  assert.equal(normalizeSearchText("نبشي"), "نبشی");
  assert.deepEqual(sizeParts("114.3×6.02 SCH40"), ["114.3", "6.02", "40"]);
  assert.deepEqual(sizeParts("100X100X10"), ["100", "100", "10"]);
  assert.deepEqual(parseSizeQuery("ipe۲۰۰"), { families: [], forms: ["IPE"], parts: ["200"], words: [] });
  assert.deepEqual(parseSizeQuery("نبشی۱۰"), { families: ["ANGLE"], forms: [], parts: ["10"], words: [] });
});

test("search: the visitor's forms find the right sizes", () => {
  assert.deepEqual(find("IPE 200"), ["IPE 200"]);
  assert.deepEqual(find("ipe۲۰۰"), ["IPE 200"]);
  // A bare number: every family's size that starts with it (beams, channels, 200×… box sections).
  const n200 = find("۲۰۰");
  assert.ok(["IPE 200", "IPN 200", "UPE 200", "UPN 200"].every((s) => n200.includes(s)) && n200.every((s) => /^(?:I|U)P[EN] 200$|^200×/.test(s)), n200.join(" | "));
  // «نبشی ۱۰»: the market's 100 mm angle; only angles.
  assert.deepEqual(find("نبشی ۱۰"), ["100X100X10"]);
  assert.deepEqual(find("زاوية ١٠٠"), ["100X100X10"]);
  assert.deepEqual(find("angle 100"), ["100X100X10"]);
  // Family word + two dimensions; the last one as a prefix.
  assert.ok(find("قوطی ۱۰۰×۵۰").length > 0 && find("قوطی ۱۰۰×۵۰").every((s) => s.startsWith("100×50×")));
  assert.deepEqual(find("UPN"), find("ناودانی").filter((s) => s.startsWith("UPN")));
  assert.ok(find("sch40").length === 12, "a free word matches the row text (every pipe is SCH40)");
  assert.deepEqual(find("لوله ۱۱۴/۳"), ["114.3×6.02 SCH40"]);
  assert.deepEqual(find("IPE 9999"), []);
  assert.equal(find("").length, rowsOf().length, "an empty query matches every size");
});

// --- filter URL --------------------------------------------------------------------------------------------------

test("filter URL: round trip, other parameters kept, unknown values dropped", () => {
  const families = ["beam", "angle"];
  assert.deepEqual(parseDownloadFilter("?q=IPE%20200&type=dxf&family=beam", families), { q: "IPE 200", type: "dxf", family: "beam" });
  assert.deepEqual(parseDownloadFilter("?type=exe&family=rocket", families), EMPTY_DOWNLOAD_FILTER);
  assert.equal(downloadFilterSearch("?gtm_debug=1&q=old", { q: "نبشی ۱۰", type: "all", family: "angle" }), `?gtm_debug=1&q=${encodeURIComponent("نبشی ۱۰").replace(/%20/g, "+")}&family=angle`);
  assert.equal(downloadFilterSearch("?q=x&type=pdf", EMPTY_DOWNLOAD_FILTER), "");
  const s = { q: "۲۰۰", type: "catalog" as const, family: "beam" };
  assert.deepEqual(parseDownloadFilter(downloadFilterSearch("", s), families), s);
});

// --- page model + generated files ----------------------------------------------------------------------------------

test("page model: the families come from the data (with counts), the other categories as spec sheets, prices only by id", () => {
  const center = buildDownloadCenter(catalog());
  assert.deepEqual(
    center.families.map((f) => [f.code, f.forms, f.rows.length]),
    [
      ["BEAM", "IPN / IPE", 39],
      ["ANGLE", "EQUAL ANGLE", 5],
      ["CHANNEL", "UPE / UPN", 14],
      ["BOX_SECTION", "RHS / SHS", 67],
      ["PIPE", "SEAMLESS PIPE", 12],
    ],
  );
  assert.equal(center.total, 137);
  assert.ok(center.families.every((f) => f.standards.length > 0 && /^\d{4}-\d\d-\d\d/.test(f.updatedAt)));
  assert.deepEqual(center.otherSheets.map((s) => s.code), ["REBAR", "SHEET_PLATE", "GALVANIZED_SHEET", "PREPAINTED_SHEET", "HOT_ROLLED_COIL", "COLD_ROLLED"]);
  assert.ok(center.families.flatMap((f) => f.rows).every((r) => !r.priced && r.dxf.bytes === null), "no price ids, no manifest: no price link, no sizes");
  const ipe200 = center.families[0].rows.find((r) => r.size === "IPE 200");
  assert.ok(ipe200);
  const priced = buildDownloadCenter(catalog(), { pricedXids: new Set([ipe200.xid]) });
  assert.deepEqual(priced.families.flatMap((f) => f.rows.filter((r) => r.priced).map((r) => r.size)), ["IPE 200"]);
  // The inline preview: a small path from the outline only, 1 decimal.
  assert.match(ipe200.preview.d, /^M[\d. LAZM]+$/);
  // The ar page's search text keeps Arabic letter forms (the ar leak gate forbids Persian ones).
  assert.ok(buildDownloadCenter(catalog("ar")).families.flatMap((f) => f.rows).every((r) => !/[یک]/.test(r.searchText)));
  assert.ok(center.families.flatMap((f) => f.rows).every((r) => r.preview.d.length < 1500), "previews stay small");
});

test("generated files: every file the page lists exists with the size the manifest gives; ZIPs and PDF sheets are valid and deterministic", async () => {
  const catalogs = locales.map((l) => catalog(l));
  const dirA = fs.mkdtempSync(path.join(os.tmpdir(), "w208-a-"));
  const dirB = fs.mkdtempSync(path.join(os.tmpdir(), "w208-b-"));
  try {
    const report = await generateDownloads(dirA, catalogs, { sourceNames: null });
    await generateDownloads(dirB, catalogs, { sourceNames: null });
    assert.equal(report.zips, 5);
    const manifest = path.join(dirA, "manifest.json");
    fs.writeFileSync(manifest, downloadsManifestJson(report));
    const sizes = loadDownloadSizes(manifest);
    for (const locale of locales) {
      const center = buildDownloadCenter(catalog(locale), { sizes });
      const files = [
        center.catalogs.sections,
        center.catalogs.raw,
        ...center.otherSheets.map((s) => s.file),
        ...center.families.flatMap((f) => [f.zip, f.specSheet, ...f.rows.flatMap((r) => [r.dxf, r.pdf])]),
      ];
      for (const f of files) {
        assert.ok(f.bytes !== null && f.bytes > 0, `${locale}: ${f.href} is in the manifest`);
        assert.equal(fs.statSync(path.join(dirA, f.href.slice(1))).size, f.bytes, f.href);
      }
    }
    // Byte-identical across two builds (W4 determinism).
    for (const f of report.files) assert.ok(fs.readFileSync(path.join(dirA, f.path.slice(1))).equals(fs.readFileSync(path.join(dirB, f.path.slice(1)))), `deterministic: ${f.path}`);

    // ZIP: a parser-level check of the beam archive — every entry's CRC, size and content equals the published file.
    const zip = fs.readFileSync(path.join(dirA, familyZipPath("beam").slice(1)));
    const entries = readZip(zip);
    const beamSlugs = planDrawings(catalog()).drawn.filter((d) => d.categoryCode === "BEAM").map((d) => d.slug);
    assert.deepEqual(entries.map((e) => e.name), beamSlugs.flatMap((s) => [`dxf/${s}.dxf`, `pdf/${s}.pdf`]));
    for (const e of entries) assert.ok(e.data.equals(fs.readFileSync(path.join(dirA, "downloads/drawings", path.basename(e.name)))), e.name);

    // Per-size PDF sheets: one page, small, every drawn text clean.
    const sheets = report.files.filter((f) => f.path.startsWith("/downloads/drawings/") && f.path.endsWith(".pdf"));
    assert.equal(sheets.length, 137);
    assert.ok(Math.max(...sheets.map((s) => s.bytes)) < 40_000, "PDF sheets stay small (standard font, vector drawing)");
  } finally {
    fs.rmSync(dirA, { recursive: true, force: true });
    fs.rmSync(dirB, { recursive: true, force: true });
  }
});

test("PDF drawing sheet: the drawing's texts, the dimension table and kg/m; no price token", async () => {
  const d = planDrawings(catalog()).drawn.find((x) => x.slug === "ipe-200");
  assert.ok(d);
  const sheet = await renderDrawingSheet({ drawing: d, dimensions: d.variant.dimensions, kgPerM: d.variant.nominalWeight?.kg_m ?? null, date: new Date("2026-10-14T00:00:00Z") });
  assert.equal(sheet.pages, 1);
  assert.equal(Buffer.from(sheet.bytes.slice(0, 5)).toString(), "%PDF-");
  for (const s of ["IPE 200", "Height", "Web thickness", "Root radius", "Nominal mass", "22.4 kg/m", "www.ahanassa.com"]) assert.ok(sheet.texts.some((t) => t.includes(s)), s);
  assert.deepEqual(checkDownloadTexts(sheet.texts, null), []);
  assert.ok(!sheet.texts.some((t) => PRICE_TOKENS.test(t)));
});

test("ZIP writer: CRC-32 check value, empty archive, refuses a non-ASCII name", () => {
  assert.equal(crc32(new TextEncoder().encode("123456789")), 0xcbf43926);
  assert.equal(writeZip([], new Date("2026-10-14T00:00:00Z")).byteLength, 22);
  assert.throws(() => writeZip([{ name: "نقشه.dxf", data: "x" }], new Date()));
  const z = Buffer.from(writeZip([{ name: "a.txt", data: "hello hello hello hello" }], new Date("2026-10-14T10:20:30Z")));
  assert.deepEqual(readZip(z).map((e) => [e.name, e.data.toString()]), [["a.txt", "hello hello hello hello"]]);
});

test("file sizes: localised units and digits; the manifest is optional", () => {
  assert.equal(formatFileSize("en", 18_500), "18 KB");
  assert.equal(formatFileSize("en", 3_300), "3.2 KB");
  assert.equal(formatFileSize("fa", 18_500), "۱۸ کیلوبایت");
  assert.equal(formatFileSize("ar", 2_400_000), "٢٫٣ ميغابايت");
  assert.equal(formatFileSize("en", 900), "900 B");
  assert.equal(loadDownloadSizes(undefined).size, 0);
  assert.equal(loadDownloadSizes("/nonexistent/manifest.json").size, 0);
});

// --- page and build wiring -----------------------------------------------------------------------------------------

test("page: one page, progressive enhancement, fa-only price link, RFQ hand-off, no amount", () => {
  const page = read("app/[locale]/downloads/page.tsx");
  const island = read("components/downloads/download-center-filter.tsx");
  assert.match(page, /<noscript>\s*<style>\{"\[data-dl-js\]\{display:none!important\}\[data-dl-nojs\]\{display:flex!important\}"\}<\/style>/);
  assert.match(page, /<details open id=\{`family-\$\{f\.segment\}`\}/, "every family open without JS, with an anchor");
  assert.match(page, /locale === "fa" && isPricePagePublished\(locale\) \? await listAllPublishedPrices\(\) : null/);
  assert.match(page, /pricedXids: prices \? new Set\(prices\.keys\(\)\) : undefined/, "only the ids reach the model, never an amount");
  assert.doesNotMatch(page, /formatTomanAmount|PriceCell|priceIrr|toman/i);
  assert.match(page, /`\$\{localizedPath\(locale, "\/contact"\)\}\?variant=\$\{encodeURIComponent\(row\.xid\)\}`/);
  assert.match(page, /role="status"|DownloadCenterFilter/);
  assert.match(island, /role="status"/, "aria-live result count");
  assert.match(island, /window\.addEventListener\("popstate", fromUrl\)/, "back/forward re-applies the URL");
  assert.match(island, /pushState/);
  assert.match(island, /min-\[481px\]:hidden/, "the sheet button exists at ≤ 480 px only");
  for (const e of ["download_file", "download_zip", "download_filter", "download_to_rfq"]) assert.match(island, new RegExp(`trackEvent\\("${e}"`), e);
  assert.doesNotMatch(island, /from "@\/lib\/downloads\/(center|file-sizes|generate|source)"/, "no build-time module in the client bundle");
  const build = read("scripts/static/build.ts");
  assert.ok(build.indexOf("generateDownloads(path.join(buildRoot") < build.indexOf('spawnSync("npx", ["vinext", "build"]'), "files are written before the pages render");
  assert.match(build, /buildEnv\[DOWNLOADS_MANIFEST_ENV\] = downloadsManifest/);
  const gtm = read("docs/analytics/GTM_SETUP.md");
  for (const e of ["download_file", "download_zip", "download_filter", "download_to_rfq"]) assert.match(gtm, new RegExp(`\`${e}\``), `GTM_SETUP.md documents ${e}`);
});

/** A minimal ZIP reader for the test: local headers in order; checks each CRC. */
function readZip(buf: Buffer): Array<{ name: string; data: Buffer }> {
  const out: Array<{ name: string; data: Buffer }> = [];
  let o = 0;
  while (buf.readUInt32LE(o) === 0x04034b50) {
    const method = buf.readUInt16LE(o + 8);
    const crc = buf.readUInt32LE(o + 14);
    const csize = buf.readUInt32LE(o + 18);
    const usize = buf.readUInt32LE(o + 22);
    const nlen = buf.readUInt16LE(o + 26);
    const xlen = buf.readUInt16LE(o + 28);
    const name = buf.subarray(o + 30, o + 30 + nlen).toString("ascii");
    const body = buf.subarray(o + 30 + nlen + xlen, o + 30 + nlen + xlen + csize);
    const data = method === 8 ? inflateRawSync(body) : Buffer.from(body);
    assert.equal(data.length, usize, `${name}: size`);
    assert.equal(crc32(data), crc, `${name}: crc`);
    out.push({ name, data });
    o += 30 + nlen + xlen + csize;
  }
  assert.equal(buf.readUInt32LE(o), 0x02014b50, "central directory follows the entries");
  return out;
}
