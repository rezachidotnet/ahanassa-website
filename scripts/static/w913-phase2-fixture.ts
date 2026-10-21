/**
 * W9.13 — a snapshot.v1 fixture with a few SKUs of each catalog-phase-2 group (ahanassa-odoo w9-13/catalog-phase2)
 * on top of the W17.4 fixture. It models the state AFTER the Odoo deploy AND the owner publishing the three draft
 * templates: the domestic channel (form DOMESTIC_CHANNEL), the mill-wall pipe and the thin galvanized coil get
 * their pages from lib/content-pipeline/editorial-page-allowlist.ts exactly as the pipeline seeds them. Never part
 * of a publication.
 *
 *   node scripts/static/w913-phase2-fixture.ts --out <snapshot.json> [--base fixtures/snapshot/w98-flat-2026-10-14.snapshot.json]
 *
 * SKUs, sizes and dimensions are Odoo's (the 19.0.56.0.0 migration's tables). Nominal weights only where they
 * follow from a formula the migration also uses (rebar π/4·d²·7850, pipe ASME B36.10M, sheet t·7.85); the
 * angle/UPN rows carry none. The domestic channel has none by design. Ids (CTMPL-9131xx / CVAR-913xxx) are fixture
 * ids. Prices: SYNTHETIC, on a few new variants, factory «کارخانه آزمایشی الف» as the other fixtures.
 */
import fs from "node:fs";
import path from "node:path";
import { buildSnapshot, readSnapshotFile } from "../../lib/static/snapshot-io.ts";
import type { SnapshotV1 } from "../../lib/contracts/snapshot-v1.ts";
import { PAGES_ON_FIRST_PUBLISH, seededPageRows } from "../../lib/content-pipeline/editorial-page-allowlist.ts";
import { categoryContainsVariant, claimedFormCodes, parseCategoryRow } from "../../lib/catalog/public-categories.ts";

type Tables = SnapshotV1["tables"];
type VariantRow = Tables["product_variants"][number];

const argv = process.argv.slice(2);
const opt = (name: string) => {
  const i = argv.indexOf(`--${name}`);
  return i >= 0 ? argv[i + 1] : undefined;
};
const repo = path.resolve(import.meta.dirname, "../..");
const out = opt("out");
if (!out) throw new Error("--out <snapshot.json> is required");
const base = readSnapshotFile(path.resolve(repo, opt("base") ?? "fixtures/snapshot/w98-flat-2026-10-14.snapshot.json"));

const STAMP = "2026-10-21T06:00:00.000Z";
const productIdOf = (xid: string) => {
  const p = base.tables.catalog_products.find((r) => r.template_xid === xid);
  if (!p) throw new Error(`base has no template ${xid}`);
  return p.id;
};
/** A sibling row of the same template: classification, units and names are copied from it. */
const siblingOf = (productId: string) => base.tables.product_variants.find((v) => v.product_id === productId)!;

let n = 0;
const variants: VariantRow[] = [];
/** `from`: the template whose row the classification and units are copied from (default: the variant's own). */
function add(productId: string, sku: string, size: string, dims: Record<string, number>, weight: Record<string, number> | null, over: Partial<VariantRow> = {}, from = productId) {
  n += 1;
  const s = siblingOf(from);
  variants.push({
    ...s,
    id: `pv-CVAR-913${String(n).padStart(3, "0")}`,
    xid: `CVAR-913${String(n).padStart(3, "0")}`,
    sku,
    commercial_name: `[${sku}] (${size})`,
    name_fa: `[${sku}] (${size})`,
    slug_fa: sku.toLowerCase(),
    commercial_size: size,
    dimensions_json: JSON.stringify(dims),
    nominal_weight_json: weight ? JSON.stringify(weight) : null,
    catalog_updated_at: STAMP,
    is_active: 1,
    is_public: 1,
    is_price_public: 0,
    sync_version: 1,
    last_synced_at: STAMP,
    created_at: STAMP,
    updated_at: STAMP,
    product_id: productId,
    ...over,
  });
  return variants[variants.length - 1].xid;
}
const r3 = (x: number) => Math.round(x * 1000) / 1000;
const pipeKgM = (od: number, t: number) => r3(0.0246615 * (od - t) * t);
const rebarKgM = (d: number) => Math.round((Math.PI / 4) * (d / 1000) ** 2 * 7850 * 100000) / 100000;

// 1. angles, 2. UPN 220–300 (existing templates; no weights here)
const angle = productIdOf("CTMPL-000017");
for (const [a, t] of [[25, 3], [40, 4], [75, 6], [150, 15]]) add(angle, `AA-AN-EQ-S${a}X${a}X${t}`, `${a}X${a}X${t}`, { width_mm: a, height_mm: a, thickness_mm: t }, null);
const upn = productIdOf("CTMPL-000018");
for (const h of [220, 300]) add(upn, `AA-CH-UPN-S${h}`, `UPN ${h}`, { height_mm: h }, null);
// 3. seamless pipe SCH80 / SCH40
const pipe = productIdOf("CTMPL-000016");
add(pipe, "AA-PP-SMLS-A106B-S21P3X3P73-L6", "21.3×3.73 SCH80", { outside_diameter_mm: 21.3, wall_thickness_mm: 3.73, length_mm: 6000 }, { kg_m: pipeKgM(21.3, 3.73), per_branch: r3(pipeKgM(21.3, 3.73) * 6) }, { schedule: "SCH80" });
add(pipe, "AA-PP-SMLS-A106B-S273X9P27-L6", "273×9.27 SCH40", { outside_diameter_mm: 273, wall_thickness_mm: 9.27, length_mm: 6000 }, { kg_m: pipeKgM(273, 9.27), per_branch: r3(pipeKgM(273, 9.27) * 6) }, { schedule: "SCH40" });
// 4. plates
const plate = (pid: string, grade: string, t: number, w: number, l: number) => add(pid, `AA-SH-HR-${grade}-S${t}X${w}X${l}`, `${t}×${w}×${l}`, { width_mm: w, thickness_mm: t, length_mm: l }, { kg_m2: r3(t * 7.85), per_sheet: r3(((t * 7.85 * w) / 1000) * (l / 1000)) });
plate(productIdOf("CTMPL-000013"), "S235JR", 8, 1250, 6000);
plate(productIdOf("CTMPL-000013"), "S235JR", 40, 2000, 12000);
plate(productIdOf("CTMPL-000015"), "S355JR", 25, 2000, 12000);
// 5. rebar Ø36 / Ø40
const rebar = productIdOf("CTMPL-000001");
for (const d of [36, 40]) add(rebar, `AA-RB-AJ400-D${d}-L12`, `Ø${d}`, { diameter_mm: d, length_mm: 12000 }, { kg_m: rebarKgM(d), per_branch: r3(rebarKgM(d) * 12) });

// 7–9: the three new templates (drafts in Odoo until the owner publishes them), with their seeded pages.
const products: Tables["catalog_products"] = [];
const seo: Tables["product_seo_contents"] = [];
const NEW = [
  { key: "domestic-channel", xid: "CTMPL-913101", name: "Domestic channel", sibling: "CTMPL-000018" },
  { key: "seamless-pipe-mill-wall", xid: "CTMPL-913102", name: "Seamless Pipe, Mill Wall (non-ASME)", sibling: "CTMPL-000016" },
  { key: "galvanized-steel-coil-thin-gauge", xid: "CTMPL-913103", name: "Galvanized Steel Coil, Thin Gauge", sibling: "CTMPL-900001" },
] as const;
const newIds: Record<string, { id: string; sibling: string }> = {};
for (const t of NEW) {
  const id = `cp-${t.xid}`;
  products.push({ id, template_xid: t.xid, commercial_template_name: t.name, name_fa: t.name, slug_fa: `product-tmpl-${t.key}`, is_active: 1, is_public: 1, sync_status: "synced", last_synced_at: STAMP, created_at: STAMP, updated_at: STAMP });
  seo.push(...seededPageRows(PAGES_ON_FIRST_PUBLISH.find((p) => p.key === t.key)!, id, t.xid, STAMP));
  newIds[t.key] = { id, sibling: productIdOf(t.sibling) };
}
const domestic: string[] = [];
for (const [h, l] of [[40, 6], [100, 6], [100, 12], [220, 12]]) {
  domestic.push(add(newIds["domestic-channel"].id, `AA-CH-DOM-S${h}-L${l}`, `${h} (${l} m)`, { height_mm: h, length_mm: l * 1000 }, null, { form_code: "DOMESTIC_CHANNEL", form_name: "ناودانی داخلی", standard_code: null, standard_name: null, allowed_commercial_units: "kg, ton" }, newIds["domestic-channel"].sibling));
}
const mill: string[] = [];
for (const [od, wall, code] of [[21.3, 2.5, "S21P3X2P5"], [48.3, 2.8, "S48P3X2P8"]] as const) {
  const kg = pipeKgM(od, wall);
  mill.push(add(newIds["seamless-pipe-mill-wall"].id, `AA-PP-SMLS-MW-${code}-L6`, `${od}×${wall} mill wall`, { outside_diameter_mm: od, wall_thickness_mm: wall, length_mm: 6000 }, { kg_m: kg, per_branch: r3(kg * 6) }, { form_code: "SEAMLESS_PIPE_FORM", form_name: siblingOf(newIds["seamless-pipe-mill-wall"].sibling).form_name, grade_code: null, grade_name: null, standard_code: null, standard_name: null, schedule: null }, newIds["seamless-pipe-mill-wall"].sibling));
}
const thin: string[] = [];
for (const [t, w, code] of [[0.3, 1000, "S0P3X1000"], [0.35, 1250, "S0P35X1250"]] as const) {
  thin.push(add(newIds["galvanized-steel-coil-thin-gauge"].id, `AA-CL-GI-${code}`, `${t}×${w}`, { thickness_mm: t, width_mm: w }, { kg_m2: r3(t * 7.85) }, { form_code: "GALVANIZED_COIL", form_name: "کلاف گالوانیزه", grade_code: null, grade_name: null, standard_code: "EN10143", standard_name: "EN 10143 — Continuously hot-dip coated steel sheet and strip; tolerances on dimensions and shape" }, newIds["galvanized-steel-coil-thin-gauge"].sibling));
}

// SYNTHETIC prices: two domestic-channel bars, one mill-wall pipe, one thin coil.
const price = (xid: string, irr: number): Tables["published_prices"][number] => ({ canonical_variant_id: xid, price_irr_per_kg: irr, vat_included: 1, factory_name_fa: "کارخانه آزمایشی الف", location_fa: "درب کارخانه", published_at: "2026-10-14T07:20:00Z", previous_price_irr_per_kg: null, previous_published_at: null });
const prices = [price(domestic[1], 455000), price(domestic[3], 462000), price(mill[0], 690000), price(thin[0], 610000)];

// Category counts recomputed with the site's own membership rule.
const allVariants = [...base.tables.product_variants, ...variants];
const categories = base.tables.catalog_public_categories.map((row) => {
  const locale = base.tables.catalog_public_categories.filter((c) => c.locale === row.locale).map((c) => parseCategoryRow(c)!);
  const claimed = claimedFormCodes(locale);
  const cat = parseCategoryRow(row)!;
  const inCat = allVariants.filter((v) => v.is_active === 1 && v.is_public === 1 && categoryContainsVariant(cat, claimed, v.group_code, v.form_code));
  return { ...row, variant_count: inCat.length, template_count: new Set(inCat.map((v) => v.product_id)).size };
});

const tables: Tables = {
  ...base.tables,
  catalog_public_categories: categories,
  catalog_products: [...base.tables.catalog_products, ...products],
  product_variants: allVariants,
  product_seo_contents: [...base.tables.product_seo_contents, ...seo],
  published_prices: [...base.tables.published_prices, ...prices],
};
const snapshot = buildSnapshot(tables, { kind: base.source.kind, description: `${base.source.description} + W9.13 fixture: catalog phase 2 samples of groups 1–5 and 7–9, the three new templates with their seeded pages, SYNTHETIC prices`, fetched_at: base.source.fetched_at }, base.created_at);
fs.mkdirSync(path.dirname(path.resolve(out)), { recursive: true });
fs.writeFileSync(path.resolve(out), JSON.stringify(snapshot, null, 1) + "\n");
console.log(JSON.stringify({ snapshot_version: snapshot.snapshot_version, new_variants: variants.length, new_templates: products.length, seo_rows: seo.length, synthetic_prices: prices.length }));
