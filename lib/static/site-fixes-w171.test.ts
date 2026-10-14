import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { factoriesForFamily, filterOptions, parsePriceFilterQuery, priceFilterSearch, reconcilePriceFilter, type PriceFilterOptions } from "../pricing/price-page.ts";
import { ABOUT_COPY } from "../content/about.ts";
import { GROUP_CARD_COPY, GROUP_COMPANIES, OFFICES, groupCompany } from "../content/company.ts";
import { TEHRAN_OFFICE } from "../seo/schema.ts";
import { locales } from "../../config/locales.ts";

/** W17.1 — site fixes: /prices factory filter, /about leadership + justified intro + group logos, footer, /contact. */

const REPO = path.resolve(import.meta.dirname, "../..");
const read = (f: string) => fs.readFileSync(path.join(REPO, f), "utf8");
const code = (f: string) => read(f).replace(/\/\*[\s\S]*?\*\//g, "").replace(/\/\/.*$/gm, "");

// --- 1. /prices: the factory list follows the product type ---------------------------------------------

const row = (familyCode: string, factory: string | null) => ({ familyCode, familyLabel: familyCode, factory }) as Parameters<typeof filterOptions>[0][number];
const OPTIONS: PriceFilterOptions = filterOptions([row("REBAR", "الف"), row("REBAR", "ب"), row("BEAMS", "ب"), row("BEAMS", "ج"), row("REBAR", "الف"), row("PIPE", null)]);

test("prices filter: per-family factories in table order, no duplicates; a family with no factory lists none", () => {
  assert.deepEqual(OPTIONS.factories, ["الف", "ب", "ج"]);
  assert.deepEqual(OPTIONS.factoriesByFamily, { REBAR: ["الف", "ب"], BEAMS: ["ب", "ج"], PIPE: [] });
  assert.deepEqual(factoriesForFamily(OPTIONS, "REBAR"), ["الف", "ب"]);
  assert.deepEqual(factoriesForFamily(OPTIONS, "BEAMS"), ["ب", "ج"]);
  assert.deepEqual(factoriesForFamily(OPTIONS, ""), ["الف", "ب", "ج"], "همه restores the full list");
  assert.deepEqual(factoriesForFamily(OPTIONS, "UNKNOWN"), []);
});

test("prices filter: a factory not valid for the new product type resets to all; a valid one is kept", () => {
  assert.deepEqual(reconcilePriceFilter(OPTIONS, { family: "BEAMS", factory: "الف" }), { family: "BEAMS", factory: "" });
  assert.deepEqual(reconcilePriceFilter(OPTIONS, { family: "BEAMS", factory: "ب" }), { family: "BEAMS", factory: "ب" });
  assert.deepEqual(reconcilePriceFilter(OPTIONS, { family: "", factory: "ج" }), { family: "", factory: "ج" }, "all families: any factory");
  assert.deepEqual(reconcilePriceFilter(OPTIONS, { family: "PIPE", factory: "ب" }), { family: "PIPE", factory: "" });
  assert.deepEqual(reconcilePriceFilter(OPTIONS, { family: "GONE", factory: "ب" }), { family: "", factory: "ب" }, "unknown family = all");
});

test("prices filter: URL query round-trip, reconciled; other keys and order kept; all = no key", () => {
  assert.deepEqual(parsePriceFilterQuery("?family=REBAR&factory=%D8%A8", OPTIONS), { family: "REBAR", factory: "ب" });
  assert.deepEqual(parsePriceFilterQuery("?family=BEAMS&factory=%D8%A7%D9%84%D9%81", OPTIONS), { family: "BEAMS", factory: "" }, "stale pair from an old link");
  assert.deepEqual(parsePriceFilterQuery("", OPTIONS), { family: "", factory: "" });
  assert.deepEqual(parsePriceFilterQuery(priceFilterSearch("", { family: "BEAMS", factory: "ج" }), OPTIONS), { family: "BEAMS", factory: "ج" });
  assert.equal(priceFilterSearch("?family=REBAR&factory=x", { family: "", factory: "" }), "");
  assert.equal(priceFilterSearch("?utm_source=a", { family: "REBAR", factory: "" }), "?utm_source=a&family=REBAR");
});

test("prices filter component: options from filterOptions, factory list via factoriesForFamily, every change reconciled, URL via replaceState", () => {
  const filter = code("components/prices/price-table-filter.tsx");
  assert.match(filter, /const factories = factoriesForFamily\(options, family\);/);
  assert.match(filter, /\{factories\.map\(\(f\) =>/);
  assert.match(filter, /reconcilePriceFilter\(options, \{ \.\.\.prev, \.\.\.next \}\)/);
  assert.match(filter, /parsePriceFilterQuery\(window\.location\.search, options\)/);
  assert.match(filter, /window\.history\.replaceState\(/);
  assert.ok(!/pushState|router\.|tomanPerKg|price\./.test(filter), "no history entries, no router navigation, no price data in the client");
  assert.match(read("app/[locale]/prices/page.tsx"), /<PriceTableFilter tableId=\{TABLE_ID\} options=\{options\} /);
});

// --- 2. /about: leadership and the justified intro --------------------------------------------------

test("about: leadership reads exactly «role: name», chairman first, in every locale", () => {
  const line = (l: (typeof locales)[number]) => ABOUT_COPY[l].leadership.map((p) => `${p.role}: ${p.name}`);
  assert.deepEqual(line("fa"), ["رئیس هیئت‌مدیره: امیرموسی طالقانی", "مدیرعامل: فاطمه زاهدی"]);
  assert.deepEqual(line("en"), ["Chairman of the Board: Amirmousa Taleghani", "Chief Executive Officer: Fatemeh Zahedi"]);
  assert.deepEqual(line("ar"), ["رئيس مجلس الإدارة: أمير موسى طالقاني", "المديرة التنفيذية: فاطمة زاهدي"]);
  const page = code("app/[locale]/about/page.tsx");
  assert.match(page, /<strong className="text-navy font-bold">\{person\.role\}:<\/strong> \{person\.name\}\s*<\/li>/, "nothing after the name");
});

test("about: the intro paragraphs are justified (inter-word, last line at the start; en hyphenates)", () => {
  assert.match(code("app/[locale]/about/page.tsx"), /\{t\.intro\.map\(\(p\) => \(\s*<p key=\{p\} className="text-justified">/);
  const css = read("styles/theme-extensions.css");
  const rule = css.slice(css.indexOf("@utility text-justified"), css.indexOf("@utility on-inverse"));
  for (const decl of ["text-align: justify;", "text-justify: inter-word;", "text-align-last: start;", "&:lang(en)", "hyphens: auto;"]) assert.ok(rule.includes(decl), decl);
});

// --- 3. /about: group logo cards --------------------------------------------------------------------

test("group logos: all five supplied (W17.5: AiSanat = the «فناساخت» mark), WebP + PNG fallback, at most 400 px wide and small, with their real width/height", async () => {
  // sharp 0.35 types resolve to `unknown` under this tsconfig (see scripts/images/build-variants.ts).
  const sharp = (await import("sharp")).default as unknown as (file: string) => { metadata(): Promise<{ width?: number; height?: number }> };
  const withLogo = GROUP_COMPANIES.filter((c) => c.logo);
  assert.deepEqual(withLogo.map((c) => c.id).sort(), ["ahanassa", "aisanat", "avizsazeh", "fazasazeh", "sipanel"]);
  assert.equal(GROUP_CARD_COPY.fa.logoAlt(groupCompany("aisanat").name.fa), "لوگوی آی‌صنعت");
  assert.equal(GROUP_CARD_COPY.en.logoAlt(groupCompany("aisanat").name.en), "AiSanat logo");
  assert.equal(GROUP_CARD_COPY.ar.logoAlt(groupCompany("aisanat").name.ar), "شعار آي صنعت");
  for (const c of withLogo) {
    for (const file of [c.logo!.webp, c.logo!.png]) {
      const abs = path.join(REPO, "public", file);
      const meta = await sharp(abs).metadata();
      assert.equal(meta.width, c.logo!.width, `${file} width`);
      assert.equal(meta.height, c.logo!.height, `${file} height`);
      assert.ok(meta.width! <= 400, `${file}: at most 400 px wide`);
      assert.ok(fs.statSync(abs).size <= 40_000, `${file}: within the mark JPEG budget (40 KB)`);
    }
  }
});

test("group cards: equal height, explicit size, alt per locale, outbound links rel=noopener in a new tab; Ahan Asa not linked", () => {
  const page = code("app/[locale]/about/page.tsx");
  assert.match(page, /<ul className="mt-8 grid auto-rows-fr gap-4/);
  assert.match(page, /<img src=\{company\.logo\.png\} alt=\{copy\.logoAlt\(name\)\} width=\{company\.logo\.width\} height=\{company\.logo\.height\} loading="lazy"/);
  assert.match(page, /<source srcSet=\{company\.logo\.webp\} type="image\/webp" \/>/);
  assert.match(page, /<a href=\{company\.url\} target="_blank" rel="noopener" /);
  assert.match(page, /<span className="sr-only"> \{copy\.newTab\}<\/span>/);
  assert.match(page, /if \(!company\.url\) return <div /);
  assert.match(page, /group-focus-visible:grayscale-0/, "the colour returns on keyboard focus too");
  assert.equal(GROUP_COMPANIES.find((c) => c.id === "ahanassa")!.url, null);
  assert.deepEqual(GROUP_COMPANIES.filter((c) => c.url).map((c) => c.url), ["https://fazasazeh.ir", "https://www.sipanelco.com", "https://www.avizsazeh.com", "https://aisanat.ir"]);
  assert.equal(GROUP_CARD_COPY.fa.logoAlt("سی‌پانل"), "لوگوی سی‌پانل");
  assert.equal(GROUP_CARD_COPY.en.logoAlt("SiPanel"), "SiPanel logo");
  assert.equal(GROUP_CARD_COPY.ar.logoAlt("سي بانل"), "شعار سي بانل");
});

// --- 4/5. Offices: footer and /contact read lib/content/company.ts ---------------------------------

test("Tehran coordination office: full address in every locale, Latin digits, consistent with the JSON-LD", () => {
  assert.equal(OFFICES.fa.tehran.label, "دفتر هماهنگی تهران");
  assert.equal(OFFICES.en.tehran.label, "Tehran coordination office");
  assert.equal(OFFICES.ar.tehran.label, "مكتب التنسيق في طهران");
  assert.equal(OFFICES.fa.tehran.address, "تهران، خیابان ستارخان، پلاک 660، کد پستی 1454954166");
  for (const l of locales) {
    const { address } = OFFICES[l].tehran;
    assert.ok(address.includes(TEHRAN_OFFICE[l].streetAddress.split("، ")[0].split(", ")[0]), `${l}: street`);
    assert.ok(address.includes("660") && address.includes(TEHRAN_OFFICE[l].postalCode), `${l}: plaque and postal code`);
    assert.ok(!/[۰-۹٠-٩]/.test(address + OFFICES[l].head.address), `${l}: Latin digits (PROJECT_OVERRIDES §7.4)`);
  }
});

test("footer: head office, then the Tehran coordination office, and the group companies list — all from company.ts", () => {
  const footer = code("components/layout/SiteFooter.tsx");
  const head = footer.indexOf("{offices.head.address}");
  const tehranLabel = footer.indexOf("{offices.tehran.label}");
  const tehran = footer.indexOf("{offices.tehran.address}");
  assert.ok(head > 0 && head < tehranLabel && tehranLabel < tehran, "Tehran under Isfahan");
  assert.match(footer, /const sisters = GROUP_COMPANIES\.filter\(\(c\) => c\.url !== null\);/);
  assert.match(footer, /<a href=\{c\.url!\} className=\{FOOTER_LINK\}>\s*\{c\.name\[locale\]\}/);
  assert.ok(!/اصفهان|ستارخان|Isfahan|Sattarkhan|أصفهان/.test(footer), "no address re-hardcoded");
});

test("/contact: the Tehran panel shows the full address (street, plaque 660, postal code) in every locale, Latin digits", () => {
  // Already complete before W17.1, so the page is left as it is (a change to it is a HIGH release path).
  const contact = read("app/[locale]/contact/page.tsx");
  const blocks = [...contact.matchAll(/tehranTitle: "([^"]+)",\s*tehranLines: \[([^\]]+)\]/g)].map((m) => ({ title: m[1], lines: m[2] }));
  assert.equal(blocks.length, 3);
  assert.deepEqual(blocks.map((b) => b.title), [OFFICES.fa.tehran.label, OFFICES.en.tehran.label, OFFICES.ar.tehran.label], "same labels as company.ts");
  for (const [b, street] of blocks.map((b, k) => [b, ["خیابان ستارخان", "Sattarkhan Street", "شارع ستارخان"][k]] as const)) {
    for (const part of [street, "660", "1454954166"]) assert.ok(b.lines.includes(part), `${b.title}: ${part}`);
    assert.ok(!/[۰-۹٠-٩]/.test(b.lines), "Latin digits");
  }
});
