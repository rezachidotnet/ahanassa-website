import { test, beforeEach, afterEach } from "node:test";
import assert from "node:assert/strict";
import { accessSync, constants, readFileSync, statSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { fetchCatalogCategories, type CatalogApiCategory } from "./odoo-api-client.ts";
import { fetchPublicCategoriesForLocale } from "./category-sync.ts";
import { categoryListingPath, categoryPathSegment, findCategoryByCode, findCategoryByPathSegment, legacyCategoryQueryTarget, parseCategoryRow, resolveCategoryGroupCodes, toPublicCatalogCategory } from "./public-categories.ts";
import { groupCodeSetClause } from "./catalog-filters.ts";
import { CATEGORY_IMAGE_PATHS, resolveCategoryMedia } from "./media-registry.ts";
import { buildReplaceCatalogPublicCategoriesSql } from "./sync-sql.ts";
import { getDirection, localizedPath } from "../../config/locales.ts";

/**
 * Website public categories — Odoo `/api/v1/catalog/categories` → DB_PUBLIC
 * snapshot → Homepage Showcase / Header / /products filter. Never calls the
 * real Odoo API: fixtures are the exact live production payloads captured
 * 2026-09-28 for locale=fa|en|ar.
 */

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "../..");
const readSource = (p: string) => readFileSync(resolve(ROOT, p), "utf8");
/** Source with block, JSX-block and line comments removed — for "must not contain" checks that prose may legitimately mention. */
const readCode = (p: string) =>
  readSource(p)
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/(^|[^:])\/\/.*$/gm, "$1");

const originalFetch = globalThis.fetch;
const originalEnv = { ...process.env };

beforeEach(() => {
  process.env.ODOO_BASE_URL = "https://odoo.ahanassa.com";
});

afterEach(() => {
  globalThis.fetch = originalFetch;
  process.env = { ...originalEnv };
});

const shape = (names: string[]): CatalogApiCategory[] => [
  { code: "REBAR", name: names[0], sequence: 10, group_codes: ["REBAR"], template_count: 4, variant_count: 45 },
  { code: "BEAM", name: names[1], sequence: 20, group_codes: ["BEAMS"], template_count: 2, variant_count: 39 },
  { code: "ANGLE", name: names[2], sequence: 30, group_codes: ["ANGLE"], template_count: 1, variant_count: 5 },
  { code: "CHANNEL", name: names[3], sequence: 40, group_codes: ["CHANNEL"], template_count: 2, variant_count: 14 },
  { code: "BOX_SECTION", name: names[4], sequence: 50, group_codes: ["RHS", "SHS"], template_count: 2, variant_count: 67 },
  { code: "SHEET_PLATE", name: names[5], sequence: 60, group_codes: ["SHEET_PLATE"], template_count: 4, variant_count: 74 },
  { code: "PIPE", name: names[6], sequence: 70, group_codes: ["SEAMLESS_PIPE"], template_count: 1, variant_count: 12 },
];

const LIVE: Record<"fa" | "en" | "ar", CatalogApiCategory[]> = {
  fa: shape(["میلگرد", "تیرآهن", "نبشی", "ناودانی", "قوطی", "ورق", "لوله"]),
  en: shape(["Rebar", "Beams", "Angle Bar", "Channel", "Box Section", "Sheet & Plate", "Pipe"]),
  ar: shape(["حديد التسليح", "كمرات فولاذية", "زوايا فولاذية", "مقاطع U فولاذية", "مقاطع صندوقية", "صفائح وألواح فولاذية", "أنابيب فولاذية"]),
};

const ODOO_ORDER = ["REBAR", "BEAM", "ANGLE", "CHANNEL", "BOX_SECTION", "SHEET_PLATE", "PIPE"];

/** Serves the live payload for whichever `locale` the client requests, recording every URL. */
function liveOdoo(calls: string[] = []): typeof fetch {
  return (async (input: RequestInfo | URL) => {
    const url = new URL(typeof input === "string" ? input : input.toString());
    calls.push(url.toString());
    const locale = url.searchParams.get("locale") as "fa" | "en" | "ar";
    return new Response(JSON.stringify({ data: LIVE[locale], meta: { count: 7 } }), { status: 200, headers: { "content-type": "application/json" } });
  }) as typeof fetch;
}

const respond = (status: number, body: unknown): typeof fetch => (async () => new Response(JSON.stringify(body), { status })) as typeof fetch;

// --- 1-3: order and translations ---------------------------------------------

test("the seven public categories come back in Odoo's sequence order, never re-sorted", async () => {
  const result = await fetchPublicCategoriesForLocale("fa", { fetchImpl: liveOdoo() });
  assert.equal(result.status, "ok");
  assert.equal(result.categories.length, 7);
  assert.deepEqual(result.categories.map((c) => c.code), ODOO_ORDER);
  assert.notDeepEqual(result.categories.map((c) => c.code), [...ODOO_ORDER].sort(), "Odoo order is not alphabetical — proves nothing sorted it");
});

test("Odoo's response order is preserved even when it disagrees with `sequence` (the website never re-orders)", async () => {
  const reversed = [...LIVE.en].reverse();
  const result = await fetchPublicCategoriesForLocale("en", { fetchImpl: respond(200, { data: reversed }) });
  assert.deepEqual(result.categories.map((c) => c.code), [...ODOO_ORDER].reverse());
});

test("Persian names render exactly as Odoo returns them", async () => {
  const result = await fetchPublicCategoriesForLocale("fa", { fetchImpl: liveOdoo() });
  assert.deepEqual(result.categories.map((c) => c.name), ["میلگرد", "تیرآهن", "نبشی", "ناودانی", "قوطی", "ورق", "لوله"]);
});

test("English and Arabic use the API's own translations, requested with the matching locale parameter", async () => {
  const calls: string[] = [];
  const en = await fetchPublicCategoriesForLocale("en", { fetchImpl: liveOdoo(calls) });
  const ar = await fetchPublicCategoriesForLocale("ar", { fetchImpl: liveOdoo(calls) });
  assert.deepEqual(en.categories.map((c) => c.name), ["Rebar", "Beams", "Angle Bar", "Channel", "Box Section", "Sheet & Plate", "Pipe"]);
  assert.deepEqual(ar.categories.map((c) => c.name), ["حديد التسليح", "كمرات فولاذية", "زوايا فولاذية", "مقاطع U فولاذية", "مقاطع صندوقية", "صفائح وألواح فولاذية", "أنابيب فولاذية"]);
  assert.deepEqual(calls, ["https://odoo.ahanassa.com/api/v1/catalog/categories?locale=en", "https://odoo.ahanassa.com/api/v1/catalog/categories?locale=ar"]);
});

test("every Odoo-owned field is carried through: code, name, sequence, group_codes, template_count, variant_count", async () => {
  const result = await fetchPublicCategoriesForLocale("fa", { fetchImpl: liveOdoo() });
  assert.deepEqual(findCategoryByCode(result.categories, "BOX_SECTION"), {
    code: "BOX_SECTION",
    name: "قوطی",
    sequence: 50,
    groupCodes: ["RHS", "SHS"],
    templateCount: 2,
    variantCount: 67,
  });
});

// --- 4-6: filtering uses Odoo's group_codes -----------------------------------

const categories = LIVE.fa.map(toPublicCatalogCategory);

test("BOX_SECTION filters both RHS and SHS", () => {
  assert.deepEqual(resolveCategoryGroupCodes(categories, "BOX_SECTION"), ["RHS", "SHS"]);
  assert.deepEqual(groupCodeSetClause(["RHS", "SHS"]), { sql: "pv.group_code IN (?, ?)", params: ["RHS", "SHS"] });
});

test("PIPE filters SEAMLESS_PIPE and BEAM filters BEAMS", () => {
  assert.deepEqual(resolveCategoryGroupCodes(categories, "PIPE"), ["SEAMLESS_PIPE"]);
  assert.deepEqual(resolveCategoryGroupCodes(categories, "BEAM"), ["BEAMS"]);
});

test("group mapping comes from the Odoo payload, not a website table — a changed mapping upstream is followed as-is", () => {
  const changed = categories.map((c) => (c.code === "PIPE" ? { ...c, groupCodes: ["SEAMLESS_PIPE", "WELDED_PIPE"] } : c));
  assert.deepEqual(resolveCategoryGroupCodes(changed, "PIPE"), ["SEAMLESS_PIPE", "WELDED_PIPE"]);
  for (const file of ["lib/catalog/public-categories.ts", "lib/catalog/catalog-filters.ts", "components/products/catalog-filter-bar.tsx", "app/[locale]/products/page.tsx"]) {
    const code = readCode(file);
    assert.ok(!/SEAMLESS_PIPE|"RHS"|"SHS"|"BEAMS"/.test(code), `${file} must not hardcode a category→group mapping`);
  }
});

test("no category / unknown category: no restriction vs. match-nothing (a stale link never widens to the whole catalog)", () => {
  assert.equal(resolveCategoryGroupCodes(categories, undefined), undefined);
  assert.equal(groupCodeSetClause(undefined), null);
  assert.deepEqual(resolveCategoryGroupCodes(categories, "RETIRED"), []);
  assert.deepEqual(groupCodeSetClause([]), { sql: "0 = 1", params: [] });
});

test("category links open the static category route, locale-prefixed, keyed by the code's path segment (architecture V1.1 A2)", () => {
  assert.equal(categoryPathSegment("BOX_SECTION"), "box-section");
  assert.equal(categoryListingPath("BOX_SECTION"), "/products/category/box-section");
  assert.equal(localizedPath("fa", categoryListingPath("PIPE")), "/products/category/pipe");
  assert.equal(localizedPath("en", categoryListingPath("PIPE")), "/en/products/category/pipe");
  assert.equal(localizedPath("ar", categoryListingPath("SHEET_PLATE")), "/ar/products/category/sheet-plate");
});

test("a path segment resolves back only against the snapshot; anything else is not a category", () => {
  const categories = [toPublicCatalogCategory(LIVE.en[4]), toPublicCatalogCategory(LIVE.en[6])];
  assert.equal(findCategoryByPathSegment(categories, "box-section")?.code, "BOX_SECTION");
  assert.equal(findCategoryByPathSegment(categories, "BOX_SECTION"), undefined);
  assert.equal(findCategoryByPathSegment(categories, "box_section"), undefined);
  assert.equal(findCategoryByPathSegment(categories, "rebar"), undefined);
});

test("legacy ?category= links are forwarded to the static route; non-code values are ignored, never reformatted", () => {
  assert.equal(legacyCategoryQueryTarget("?category=BOX_SECTION"), "/products/category/box-section");
  assert.equal(legacyCategoryQueryTarget("?family=X&category=PIPE"), "/products/category/pipe");
  assert.equal(legacyCategoryQueryTarget(""), null);
  assert.equal(legacyCategoryQueryTarget("?category=../../etc"), null);
  assert.equal(legacyCategoryQueryTarget("?category=%3Cscript%3E"), null);
  assert.equal(legacyCategoryQueryTarget("?category=box-section"), null);
  const redirect = readSource("components/products/legacy-category-redirect.tsx");
  assert.match(redirect, /legacyCategoryQueryTarget\(window\.location\.search\)/);
  assert.match(redirect, /window\.location\.replace\(/);
  assert.match(readSource("app/[locale]/products/page.tsx"), /<LegacyCategoryRedirect /);
});

test("the listing SQL filters templates by an EXISTS over the selected category's group set, and the category route uses the snapshot", () => {
  const repo = readSource("lib/catalog/editorial-repository.ts");
  const fn = repo.slice(repo.indexOf("function filterConditions"), repo.indexOf("const TEMPLATE_PUBLICATION_WHERE_CONDITIONS"));
  assert.match(fn, /groupCodeSetClause\(filters\.groupCodes\)/);
  assert.match(fn, /pv\.is_active = 1 AND pv\.is_public = 1 AND \$\{categoryClause\.sql\}/);
  const listing = readSource("components/products/products-listing.tsx");
  assert.match(listing, /groupCodes: resolveCategoryGroupCodes\(categories, category\.code\)/, "a category listing must resolve its group set through the synced Odoo categories");
  const route = readSource("app/[locale]/products/category/[category]/page.tsx");
  assert.match(route, /generateStaticParams/);
  assert.match(route, /categoryPathSegment\(c\.code\)/);
  assert.match(route, /findCategoryByPathSegment\(/);
  assert.match(route, /notFound\(\)/);
  assert.doesNotMatch(readCode("app/[locale]/products/page.tsx"), /searchParams/, "/products is static: no searchParams");
});

// --- 7-10: images -------------------------------------------------------------

const EXPECTED_IMAGES: Record<string, string> = {
  REBAR: "/images/products/rebar.png",
  BEAM: "/images/products/IPE.jpg",
  ANGLE: "/images/products/angle inventory.jpg",
  CHANNEL: "/images/products/u channel.jpg",
  BOX_SECTION: "/images/products/box-shs.jpg",
  SHEET_PLATE: "/images/products/sheet-plate.png",
  PIPE: "/images/products/steel-pipe.jpg",
};

test("every category gets its approved image", () => {
  for (const code of ODOO_ORDER) {
    const media = resolveCategoryMedia(code);
    assert.equal(media.path, EXPECTED_IMAGES[code], code);
    assert.equal(media.source, "category");
  }
});

test("PIPE uses steel-pipe.jpg and BOX_SECTION uses box-shs.jpg — never pipe.png or the placeholder", () => {
  assert.equal(resolveCategoryMedia("PIPE").path, "/images/products/steel-pipe.jpg");
  assert.equal(resolveCategoryMedia("BOX_SECTION").path, "/images/products/box-shs.jpg");
  for (const code of ODOO_ORDER) {
    const { path } = resolveCategoryMedia(code);
    assert.ok(!path.endsWith("steel-placeholder.svg"), `${code} must not use the placeholder on a successful response`);
    for (const rejected of ["pipe.png", "beams.png", "u-channel.png", "sheet and plate.jpg"]) {
      assert.ok(!path.endsWith(`/${rejected}`), `${code} must not use ${rejected}`);
    }
  }
});

test("a category Odoo adds later without an approved photo gets the neutral fallback, never another category's photo", () => {
  const media = resolveCategoryMedia("WIRE_ROD");
  assert.equal(media.path, "/images/products/steel-placeholder.svg");
  assert.equal(media.source, "generic_fallback");
});

test("every mapped image exists on disk, is readable and non-empty; src is URL-safe", () => {
  assert.equal(CATEGORY_IMAGE_PATHS.length, 7);
  for (const p of [...CATEGORY_IMAGE_PATHS, "/images/products/steel-placeholder.svg"]) {
    const file = resolve(ROOT, "public", `.${p}`);
    accessSync(file, constants.R_OK);
    assert.ok(statSync(file).size > 0, `${p} must not be empty`);
  }
  assert.equal(resolveCategoryMedia("ANGLE").src, "/images/products/angle%20inventory.jpg");
  assert.equal(resolveCategoryMedia("CHANNEL").src, "/images/products/u%20channel.jpg");
});

// --- 11: failure handling -----------------------------------------------------

test("API failures never produce a category list (the previous snapshot stays in place)", async () => {
  const cases: [string, typeof fetch, string][] = [
    ["5xx", respond(503, { error: "down" }), "CATALOG_API_SERVER_ERROR"],
    ["network", (async () => { throw new TypeError("fetch failed"); }) as typeof fetch, "CATALOG_API_NETWORK_ERROR"],
    ["missing data", respond(200, { items: [] }), "CATALOG_API_UNEXPECTED_SHAPE"],
    ["malformed row", respond(200, { data: [{ ...LIVE.fa[0], group_codes: [] }] }), "CATALOG_API_UNEXPECTED_SHAPE"],
    ["non-numeric count", respond(200, { data: [{ ...LIVE.fa[0], variant_count: "45" }] }), "CATALOG_API_UNEXPECTED_SHAPE"],
    ["duplicate code", respond(200, { data: [LIVE.fa[0], LIVE.fa[0]] }), "CATALOG_API_DUPLICATE_CATEGORY_CODE"],
    ["empty list", respond(200, { data: [] }), "CATALOG_CATEGORIES_EMPTY_UPSTREAM"],
  ];
  for (const [label, fetchImpl, reason] of cases) {
    const result = await fetchPublicCategoriesForLocale("fa", { fetchImpl });
    assert.equal(result.status, "failed", label);
    assert.equal(result.categories.length, 0, label);
    assert.equal(result.reasonCode, reason, label);
  }
});

test("an unconfigured Odoo base URL is reported, not thrown", async () => {
  delete process.env.ODOO_BASE_URL;
  const direct = await fetchCatalogCategories("fa");
  assert.equal(direct.status, "not_configured");
  const result = await fetchPublicCategoriesForLocale("fa");
  assert.equal(result.status, "not_configured");
});

test("a failed category read never crashes the Homepage, the /products listing, or the layout", () => {
  const home = readSource("app/[locale]/page.tsx");
  const homeTry = home.slice(home.indexOf("try {", home.indexOf("let homepageCategories")), home.indexOf("} catch (error) {", home.indexOf("let homepageCategories")));
  assert.match(homeTry, /listPublicCatalogCategories\(locale\)/);
  const products = readSource("components/products/products-listing.tsx");
  const productsTry = products.slice(products.indexOf("try {", products.indexOf("let categories")), products.indexOf("} catch (error) {", products.indexOf("let categories")));
  assert.match(productsTry, /listPublicCatalogCategories\(locale\)/);
  assert.match(products, /PRODUCTS_CATEGORY_LIST_READ_ERROR/);
  const layout = readSource("app/[locale]/layout.tsx");
  assert.match(layout, /try \{\s*productFamilies = await listHeaderProductFamilyShortcuts\(locale\);/);
});

test("public rendering never calls Odoo: pages/components read only the DB_PUBLIC snapshot", () => {
  for (const file of ["app/[locale]/page.tsx", "app/[locale]/products/page.tsx", "app/[locale]/products/category/[category]/page.tsx", "components/products/products-listing.tsx", "app/[locale]/layout.tsx", "components/home/product-showcase.tsx", "components/layout/SiteHeader.tsx", "components/products/catalog-filter-bar.tsx"]) {
    const code = readCode(file);
    assert.ok(!code.includes("odoo-api-client") && !code.includes("category-sync") && !code.includes("fetch("), `${file} must not reach Odoo`);
  }
});

// --- persistence (D1 snapshot) --------------------------------------------------

test("stored rows round-trip, and a row with an unreadable/empty group set is dropped rather than rendered", () => {
  const row = { code: "BOX_SECTION", name: "قوطی", sequence: 50, group_codes_json: '["RHS","SHS"]', template_count: 2, variant_count: 67 };
  assert.deepEqual(parseCategoryRow(row)?.groupCodes, ["RHS", "SHS"]);
  assert.equal(parseCategoryRow({ ...row, group_codes_json: "not json" }), null);
  assert.equal(parseCategoryRow({ ...row, group_codes_json: "[]" }), null);
});

test("the replace SQL deletes then inserts one locale's set with Odoo positions, escaping names", () => {
  const cats = [...categories.slice(0, 2), { ...categories[2], name: "O'Brien" }];
  const sql = buildReplaceCatalogPublicCategoriesSql("fa", cats, "2026-09-28T00:00:00.000Z");
  assert.ok(sql.startsWith("DELETE FROM catalog_public_categories WHERE locale = 'fa'; INSERT INTO catalog_public_categories"));
  assert.ok(sql.includes("('REBAR', 'fa', 'میلگرد', 0, 10, '[\"REBAR\"]', 4, 45,"));
  assert.ok(sql.includes("('ANGLE', 'fa', 'O''Brien', 2, 30,"));
  assert.throws(() => buildReplaceCatalogPublicCategoriesSql("fa", [], "x"));
});

test("the snapshot is refreshed on the 3-hourly trigger that both staging and production register", () => {
  const entry = readSource("workers/entry.ts");
  const incremental = entry.slice(entry.indexOf("case CATALOG_INCREMENTAL_CRON:"), entry.indexOf("case CATALOG_FULL_RECONCILIATION_CRON:"));
  assert.match(incremental, /ctx\.waitUntil\(runCatalogCategorySync\(\)\)/);
  const migration = readSource("migrations_public/0011_catalog_public_categories.sql");
  assert.match(migration, /CREATE TABLE catalog_public_categories/);
  assert.ok(!/INSERT INTO/i.test(migration), "no seeded/fabricated rows");
});

// --- 13-14: direction and keys --------------------------------------------------

test("fa and ar render RTL, en renders LTR", () => {
  assert.equal(getDirection("fa"), "rtl");
  assert.equal(getDirection("ar"), "rtl");
  assert.equal(getDirection("en"), "ltr");
  assert.match(readSource("app/[locale]/layout.tsx"), /<html lang=\{locale\} dir=\{direction\}/);
});

test("React keys are the unique category code on every surface (the API rejects duplicate codes)", () => {
  assert.equal(new Set(categories.map((c) => c.code)).size, categories.length);
  assert.match(readSource("components/home/product-showcase.tsx"), /key=\{category\.code\}/);
  assert.match(readSource("components/products/catalog-filter-bar.tsx"), /key=\{category\.code\}/);
});
