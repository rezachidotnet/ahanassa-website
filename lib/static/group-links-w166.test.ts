import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { scanPublicFile } from "./leak-scan.ts";
import { ABOUT_GROUP_ANCHOR, GROUP_COMPANIES, GROUP_FOOTER_COPY, GROUP_SERVICES_COPY, groupCompany, PARENT_ORGANIZATION, showGroupServices } from "../content/company.ts";
import { locales } from "../../config/locales.ts";

/** W16.6 — links to the group companies: one footer line site-wide, a contextual box on related pages only. */

const REPO = path.resolve(import.meta.dirname, "../..");
const read = (f: string) => fs.readFileSync(path.join(REPO, f), "utf8");
const code = (f: string) => read(f).replace(/\/\*[\s\S]*?\*\//g, "").replace(/\/\/.*$/gm, "");

function languageFindings(locale: "en" | "ar", texts: string[]) {
  return scanPublicFile(`${locale}/w166-copy.html`, `<p>${texts.join(" | ")}</p>`).filter((f) => f.kind === "persian_on_ar" || f.kind === "persian_on_en");
}

test("group company URLs are the owner's (www for SiPanel and Aviz Sazeh) and read from one place", () => {
  assert.equal(PARENT_ORGANIZATION.url, "https://fazasazeh.ir");
  assert.equal(groupCompany("sipanel").url, "https://www.sipanelco.com");
  assert.equal(groupCompany("avizsazeh").url, "https://www.avizsazeh.com");
  assert.equal(groupCompany("aisanat").url, "https://aisanat.ir");
  assert.throws(() => groupCompany("unknown"));
  const outside = ["components", "app"].flatMap(function walk(dir: string): string[] {
    return fs.readdirSync(path.join(REPO, dir), { withFileTypes: true }).flatMap((e) => (e.isDirectory() ? walk(path.join(dir, e.name)) : /\.tsx?$/.test(e.name) ? [path.join(dir, e.name)] : []));
  });
  for (const f of outside) assert.ok(!/sipanelco\.com|avizsazeh\.com|aisanat\.ir|fazasazeh\.ir/.test(read(f)), `${f}: group URLs come from lib/content/company.ts only`);
});

test("footer: one group line — the group name links to fazasazeh.ir, «شرکت‌های گروه» to /about#group; no sister site links", () => {
  const footer = code("components/layout/SiteFooter.tsx");
  assert.match(footer, /<a href=\{PARENT_ORGANIZATION\.url\}[^>]*>\s*\{PARENT_ORGANIZATION\.name\[locale\]\}/);
  assert.match(footer, /href=\{`\$\{localizedPath\(locale, "\/about"\)\}#\$\{ABOUT_GROUP_ANCHOR\}`\}/);
  assert.ok(!/GROUP_COMPANIES|groupCompany|GroupServicesBox/.test(footer), "the four sister links are not site-wide");
  assert.ok(!/target=/.test(footer), "same tab");
  assert.equal(`${GROUP_FOOTER_COPY.fa.before}${PARENT_ORGANIZATION.name.fa}${GROUP_FOOTER_COPY.fa.after}`, "آهن آسا، عضو گروه فضاسازه نقش جهان");
  assert.equal(GROUP_FOOTER_COPY.fa.companies, "شرکت‌های گروه");
  assert.equal(`${GROUP_FOOTER_COPY.en.before}${PARENT_ORGANIZATION.name.en}${GROUP_FOOTER_COPY.en.after}`, "Ahan Asa, a member of the Fazasazeh Naghsh-e Jahan group");
  assert.deepEqual(languageFindings("ar", [...Object.values(GROUP_FOOTER_COPY.ar), PARENT_ORGANIZATION.name.ar]), []);
  assert.deepEqual(languageFindings("en", [...Object.values(GROUP_FOOTER_COPY.en), PARENT_ORGANIZATION.name.en]), []);
});

test("/about carries the #group anchor on the group section, and stays the only page that links AiSanat", () => {
  assert.equal(ABOUT_GROUP_ANCHOR, "group");
  assert.match(read("app/[locale]/about/page.tsx"), /<section id=\{ABOUT_GROUP_ANCHOR\} aria-labelledby="about-group"/);
  assert.ok(!/aisanat/.test(GROUP_SERVICES_COPY.fa.text + GROUP_SERVICES_COPY.en.text + GROUP_SERVICES_COPY.ar.text));
  assert.ok(GROUP_COMPANIES.some((c) => c.id === "aisanat"), "AiSanat stays in the /about group list");
});

test("group services box: brand-name anchors for SiPanel and Aviz Sazeh, plain same-tab links, no price", () => {
  const box = code("components/group/group-services-box.tsx");
  assert.match(box, /<a key=\{i\} href=\{company\.url \?\? undefined\} className=\{LINK\}>\s*\{company\.name\[locale\]\}/);
  assert.ok(!/target=|rel=|nofollow/.test(box), "normal links, same tab");
  assert.ok(!/pricing|price/i.test(box), "no price data");
  assert.equal(GROUP_SERVICES_COPY.fa.title, "خدمات مکمل گروه");
  for (const l of locales) {
    const { text } = GROUP_SERVICES_COPY[l];
    assert.equal(text.match(/\{sipanel\}/g)?.length, 1, `${l}: one SiPanel link`);
    assert.equal(text.match(/\{avizsazeh\}/g)?.length, 1, `${l}: one Aviz Sazeh link`);
    assert.ok(!/[0-9۰-۹٠-٩]|قیمت|سعر|price|تومان|ریال/i.test(text), `${l}: no amount or price word`);
  }
  assert.match(GROUP_SERVICES_COPY.fa.text, /سوله/);
  assert.deepEqual(languageFindings("ar", [...Object.values(GROUP_SERVICES_COPY.ar), groupCompany("sipanel").name.ar, groupCompany("avizsazeh").name.ar]), []);
  assert.deepEqual(languageFindings("en", [...Object.values(GROUP_SERVICES_COPY.en), groupCompany("sipanel").name.en, groupCompany("avizsazeh").name.en]), []);
});

test("group services box shows on beam, box/profile and coated-sheet pages only", () => {
  // Category pages: code + group codes (snapshot BEAM ⇢ BEAMS, BOX_SECTION ⇢ RHS/SHS).
  assert.equal(showGroupServices(["BEAM", "BEAMS", "تیرآهن"]), true);
  assert.equal(showGroupServices(["BOX_SECTION", "RHS", "SHS", "قوطی"]), true);
  for (const [c, g, n] of [["REBAR", "REBAR", "میلگرد"], ["ANGLE", "ANGLE", "نبشی"], ["CHANNEL", "CHANNEL", "ناودانی"], ["SHEET_PLATE", "SHEET_PLATE", "ورق"], ["PIPE", "SEAMLESS_PIPE", "لوله"]]) {
    assert.equal(showGroupServices([c, g, n]), false, `${c}: no box`);
  }
  // Product pages: family / group / form codes and names of the variants.
  assert.equal(showGroupServices(["LONG_PRODUCTS", "BEAMS", "IPE", "تیرآهن", "تیرآهن IPE"]), true);
  assert.equal(showGroupServices(["HOLLOW_SECTIONS_PROFILES", "RHS", "RHS_FORM"]), true);
  assert.equal(showGroupServices(["FLAT_PRODUCTS", "SHEET_PLATE", "HOT_ROLLED_SHEET", "ورق", "ورق سیاه (گرم‌نورد)"]), false, "plain black sheet: no box");
  // Coated sheet, once the catalog has it.
  assert.equal(showGroupServices(["FLAT_PRODUCTS", "SHEET_PLATE", "GALVANIZED_SHEET"]), true);
  assert.equal(showGroupServices(["FLAT_PRODUCTS", "SHEET_PLATE", null, "ورق رنگی (PPGI)"]), true);
  assert.equal(showGroupServices([null, undefined, ""]), false);

  const category = read("app/[locale]/products/category/[category]/page.tsx");
  assert.match(category, /showGroupServices\(\[category\.code, \.\.\.category\.groupCodes, category\.name\]\) \? <GroupServicesBox locale=\{locale\} \/> : undefined/);
  assert.equal((category.match(/aside=\{aside\}/g) ?? []).length, 2, "both category render paths pass the box");
  assert.match(read("app/[locale]/products/[slug]/page.tsx"), /showGroupServices\(variants\.flatMap\(\(v\) => \[v\.family\.code, v\.group\.code, v\.form\.code, v\.group\.name, v\.form\.name\]\)\) && \(/);
  assert.match(read("components/products/products-listing.tsx"), /\{aside\}\s*<CtaBand/);
});
