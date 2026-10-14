/**
 * W17.4 — a snapshot.v1 fixture with the six W9.8 flat templates (galvanized coil and cut sheet DX51D+Z,
 * PPGI coil, HRC coil S235JR, CRC coil and cut sheet DC01) and their four public categories, on top of the
 * staging fixture. It models the state AFTER the owner publishes the templates in Odoo AND the editorial
 * step approves their pages, so the build renders every new surface (category pages, product pages, the
 * «ورق» menu group, the RFQ picker). Never part of a publication.
 *
 *   node scripts/static/w98-flat-fixture.ts --catalog <flat_raw_catalog.json> --out fixtures/snapshot/w98-flat-2026-10-14.snapshot.json
 *        [--base fixtures/snapshot/staging-2026-10-01.snapshot.json]
 *
 * `--catalog` is ahanassa-odoo addons/ahanassa_catalog_flat_raw/data/flat_raw_catalog.json (the addon's own
 * generated catalog; `git show origin/main:<path>`). Names, descriptions, sizes, units and nominal weights
 * are copied from it; the template internal note (internal RAL codes) is never read. Category names are
 * Odoo's (data/public_category.xml + i18n). Ids (CTMPL-9xxxxx / CVAR-9xxxxx) are fixture ids, not Odoo's.
 * Prices: SYNTHETIC, on two variants of each daily-priced coil template only (cut sheets are RFQ), so the
 * fa/ar/en price rules are exercised; the factory is the synthetic fixture's «کارخانه آزمایشی الف».
 */
import fs from "node:fs";
import path from "node:path";
import { buildSnapshot, readSnapshotFile } from "../../lib/static/snapshot-io.ts";
import type { SnapshotV1 } from "../../lib/contracts/snapshot-v1.ts";

type Tables = SnapshotV1["tables"];
type Lang = "fa" | "en" | "ar";
interface OdooVariant {
  sku: string;
  composite_size: string;
  value_names: Partial<Record<Lang, string>>;
  thickness_mm: number;
  width_mm: number;
  length_mm?: number;
  nominal_weight_kg_m2: number;
  nominal_weight_kg_m?: number;
  nominal_weight_per_sheet?: number;
}
interface OdooTemplate {
  key: string;
  form_code: string;
  grade_code: string;
  standard_code: string;
  names: Record<Lang, string>;
  public_description: Record<Lang, string>;
  price_mode: "daily" | "rfq";
  allowed_commercial_units: string;
  variants: OdooVariant[];
}

const argv = process.argv.slice(2);
const opt = (name: string) => {
  const i = argv.indexOf(`--${name}`);
  return i >= 0 ? argv[i + 1] : undefined;
};
const repo = path.resolve(import.meta.dirname, "../..");
const out = opt("out");
const catalogFile = opt("catalog");
if (!out || !catalogFile) throw new Error("--catalog <flat_raw_catalog.json> and --out <snapshot.json> are required");
const base = readSnapshotFile(path.resolve(repo, opt("base") ?? "fixtures/snapshot/staging-2026-10-01.snapshot.json"));
const catalog = JSON.parse(fs.readFileSync(path.resolve(catalogFile), "utf8")) as { templates: OdooTemplate[] };

const FLAT_KEYS = ["galvanized_coil", "galvanized_sheet", "prepainted_coil", "hot_rolled_coil", "cold_rolled_coil", "cold_rolled_sheet"];
const templates = FLAT_KEYS.map((key) => {
  const t = catalog.templates.find((x) => x.key === key);
  if (!t) throw new Error(`template ${key} is missing from ${catalogFile}`);
  return t;
});

// Classification as the Odoo /meta and taxonomy name it (classification_taxonomy.xml, i18n/fa.po).
const GROUP: Record<string, { code: string; name: string }> = {
  GALVANIZED_COIL: { code: "FLAT_COILS", name: "کلاف" },
  PREPAINTED_COIL: { code: "FLAT_COILS", name: "کلاف" },
  HOT_ROLLED_COIL: { code: "FLAT_COILS", name: "کلاف" },
  COLD_ROLLED_COIL: { code: "FLAT_COILS", name: "کلاف" },
  GALVANIZED: { code: "SHEET_PLATE", name: "ورق" },
  COLD_ROLLED: { code: "SHEET_PLATE", name: "ورق" },
};
const FORM_NAME: Record<string, string> = {
  GALVANIZED_COIL: "کلاف گالوانیزه",
  PREPAINTED_COIL: "کلاف رنگی (پیش‌رنگ‌شده)",
  HOT_ROLLED_COIL: "کلاف گرم",
  COLD_ROLLED_COIL: "کلاف سرد",
  GALVANIZED: "ورق گالوانیزه",
  COLD_ROLLED: "ورق روغنی (سردنورد)",
};
const STANDARD_NAME: Record<string, string> = { EN10346: "EN 10346", EN10169: "EN 10169", EN10051: "EN 10051", EN10130: "EN 10130" };
const SLUG: Record<string, string> = {
  galvanized_coil: "galvanized-steel-coil-dx51d-z",
  galvanized_sheet: "galvanized-steel-sheet-dx51d-z",
  prepainted_coil: "prepainted-galvanized-coil-ppgi",
  hot_rolled_coil: "hot-rolled-coil-s235jr",
  cold_rolled_coil: "cold-rolled-coil-dc01",
  cold_rolled_sheet: "cold-rolled-sheet-dc01",
};

const STAMP = "2026-10-14T06:00:00.000Z";
const pad = (n: number, width: number) => String(n).padStart(width, "0");
// Crockford base32 (no I, L, O, U) — a valid 26-character ULID-shaped id per row.
const fixtureId = (kind: string, n: number) => `01W98${kind}${pad(n, 26 - 5 - kind.length)}`;
const seoDescription = (text: string) => {
  if (text.length <= 160) return text;
  const cut = text.slice(0, 157);
  return `${cut.slice(0, cut.lastIndexOf(" "))}…`;
};

const products: Tables["catalog_products"] = [];
const variants: Tables["product_variants"] = [];
const seo: Tables["product_seo_contents"] = [];
const prices: Tables["published_prices"] = [];
let variantNo = 0;
let seoNo = 0;
templates.forEach((t, ti) => {
  const productId = fixtureId("P", ti + 1);
  const templateXid = `CTMPL-9${pad(ti + 1, 5)}`;
  products.push({ id: productId, template_xid: templateXid, commercial_template_name: t.names.en, name_fa: t.names.en, slug_fa: `product-tmpl-${SLUG[t.key]}`, is_active: 1, is_public: 1, sync_status: "synced", last_synced_at: STAMP, created_at: STAMP, updated_at: STAMP });
  for (const locale of ["fa", "en", "ar"] as const) {
    seoNo += 1;
    seo.push({
      id: fixtureId("S", seoNo),
      entity_type: "product",
      entity_id: productId,
      locale,
      slug: SLUG[t.key],
      h1: t.names[locale],
      intro: t.public_description[locale],
      body_json: null,
      seo_title: t.names[locale],
      seo_description: seoDescription(t.public_description[locale]),
      faq_json: null,
      index_status: "index",
      content_quality_status: "approved",
      published_at: STAMP,
      updated_at: STAMP,
    });
  }
  const group = GROUP[t.form_code];
  t.variants.forEach((v, vi) => {
    variantNo += 1;
    const xid = `CVAR-9${pad(variantNo, 5)}`;
    const size = v.value_names.fa ?? v.composite_size;
    const isSheet = v.length_mm !== undefined;
    variants.push({
      id: fixtureId("V", variantNo),
      product_id: productId,
      xid,
      sku: v.sku,
      commercial_name: `[${v.sku}] ${t.names.fa} (${size})`,
      name_fa: `[${v.sku}] ${t.names.en} (${v.composite_size})`,
      slug_fa: v.sku.toLowerCase(),
      commercial_size: v.composite_size,
      section_size: null,
      schedule: null,
      family_code: "FLAT_PRODUCTS",
      family_name: "محصولات تخت (ورق و کلاف)",
      group_code: group.code,
      group_name: group.name,
      form_code: t.form_code,
      form_name: FORM_NAME[t.form_code],
      grade_code: t.grade_code,
      grade_name: t.grade_code,
      standard_code: t.standard_code,
      standard_name: STANDARD_NAME[t.standard_code],
      dimensions_json: JSON.stringify(isSheet ? { width_mm: v.width_mm, thickness_mm: v.thickness_mm, length_mm: v.length_mm } : { width_mm: v.width_mm, thickness_mm: v.thickness_mm }),
      nominal_weight_json: JSON.stringify(isSheet ? { kg_m2: v.nominal_weight_kg_m2, per_sheet: v.nominal_weight_per_sheet } : { kg_m2: v.nominal_weight_kg_m2, kg_m: v.nominal_weight_kg_m }),
      allowed_commercial_units: t.allowed_commercial_units,
      inventory_uom: "kg",
      catalog_updated_at: STAMP,
      is_active: 1,
      is_public: 1,
      is_price_public: 0,
      sync_status: "synced",
      sync_version: 1,
      last_synced_at: STAMP,
      created_at: STAMP,
      updated_at: STAMP,
    });
    if (t.price_mode === "daily" && vi < 2) {
      prices.push({ canonical_variant_id: xid, price_irr_per_kg: 520000 + ti * 40000 + vi * 5000, vat_included: 1, factory_name_fa: "کارخانه آزمایشی الف", location_fa: "درب کارخانه", published_at: "2026-10-14T07:20:00Z", previous_price_irr_per_kg: null, previous_published_at: null });
    }
  });
});

// The four W9.8 categories (ahanassa_catalog_flat_raw data/public_category.xml + i18n), right after SHEET_PLATE.
const NEW_CATEGORIES: { code: string; sequence: number; groups: string[]; forms: string[]; names: Record<Lang, string> }[] = [
  { code: "GALVANIZED_SHEET", sequence: 62, groups: ["FLAT_COILS", "SHEET_PLATE"], forms: ["GALVANIZED", "GALVANIZED_COIL"], names: { fa: "ورق گالوانیزه", en: "Galvanized Steel Sheet & Coil", ar: "الصاج المجلفن" } },
  { code: "PREPAINTED_SHEET", sequence: 64, groups: ["FLAT_COILS"], forms: ["PREPAINTED_COIL"], names: { fa: "ورق رنگی (پیش‌رنگ‌شده)", en: "Pre-Painted (PPGI) Steel Sheet", ar: "الصاج المطلي مسبقاً (PPGI)" } },
  { code: "HOT_ROLLED_COIL", sequence: 66, groups: ["FLAT_COILS"], forms: ["HOT_ROLLED_COIL"], names: { fa: "ورق سیاه رول (کلاف گرم)", en: "Hot-Rolled Coil (HRC)", ar: "لفائف الصلب المدرفلة على الساخن" } },
  { code: "COLD_ROLLED", sequence: 68, groups: ["FLAT_COILS", "SHEET_PLATE"], forms: ["COLD_ROLLED", "COLD_ROLLED_COIL"], names: { fa: "ورق روغنی (کلاف سرد)", en: "Cold-Rolled Sheet & Coil (CRC)", ar: "الصاج المدرفل على البارد" } },
];
const counts = (forms: string[]) => {
  const rows = variants.filter((v) => forms.includes(v.form_code ?? ""));
  return { template_count: new Set(rows.map((r) => r.product_id)).size, variant_count: rows.length };
};
const categories: Tables["catalog_public_categories"] = [];
for (const locale of ["fa", "en", "ar"] as const) {
  const rows = base.tables.catalog_public_categories.filter((c) => c.locale === locale).sort((a, b) => a.position - b.position);
  const at = rows.findIndex((c) => c.code === "SHEET_PLATE") + 1;
  const added = NEW_CATEGORIES.map((c) => ({ code: c.code, locale, name: c.names[locale], position: 0, sequence: c.sequence, group_codes_json: JSON.stringify(c.groups), form_codes_json: JSON.stringify(c.forms), ...counts(c.forms), synced_at: STAMP }));
  [...rows.slice(0, at), ...added, ...rows.slice(at)].forEach((c, position) => categories.push({ ...c, position }));
}

const tables: Tables = {
  ...base.tables,
  catalog_public_categories: categories,
  catalog_products: [...base.tables.catalog_products, ...products],
  product_variants: [...base.tables.product_variants, ...variants],
  product_seo_contents: [...base.tables.product_seo_contents, ...seo],
  published_prices: [...base.tables.published_prices, ...prices],
};
const snapshot = buildSnapshot(tables, { kind: base.source.kind, description: `${base.source.description} + W17.4 fixture: the six W9.8 flat templates (ahanassa_catalog_flat_raw) and SYNTHETIC coil prices`, fetched_at: base.source.fetched_at }, base.created_at);
fs.mkdirSync(path.dirname(path.resolve(out)), { recursive: true });
fs.writeFileSync(path.resolve(out), JSON.stringify(snapshot, null, 1) + "\n");
console.log(JSON.stringify({ snapshot_version: snapshot.snapshot_version, templates: products.length, variants: variants.length, categories: NEW_CATEGORIES.length, synthetic_prices: prices.length }));
