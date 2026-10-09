import { snapshotV1, type SnapshotV1 } from "../contracts/snapshot-v1.ts";
import { GATED_COUNTS, PIPELINE_CONFIG } from "./config.ts";
import type { OdooSource } from "./odoo-source.ts";
import { validatePricing, type PricingOutcome } from "./pricing.ts";
import { validatePricingHistory } from "./pricing-history.ts";

/**
 * Architecture V1.1 §7.1 step 2: schema, relations and counts of one full
 * fetch (+ the assembled snapshot), and the abnormal-decrease gate. Pure.
 */
type Tables = SnapshotV1["tables"];
const LOCALES = ["fa", "en", "ar"] as const;

/** Arabic-script text on en, or Persian-only letters/digits on ar (same rule as lib/static/leak-scan.ts). */
const ARABIC_SCRIPT = /[؀-ۿݐ-ݿﭐ-﷿ﹰ-﻿]/;
const PERSIAN_SPECIFIC = /[پچژگکی۰-۹]/;

export interface ValidationResult {
  errors: string[];
  warnings: string[];
  counts: Record<string, number>;
  /** W9.4: what happened to prices this run (one line for the summary). */
  pricing?: { outcome: PricingOutcome; summary: string; ignored: string[]; /** W9.6: the 30-day history, one line. */ history?: string };
}

function isPublished(seo: Tables["product_seo_contents"][number]): boolean {
  return seo.entity_type === "product" && seo.content_quality_status === "approved" && seo.published_at !== null && seo.h1 !== null;
}

export function sourceCounts(tables: Tables): Record<string, number> {
  const counts: Record<string, number> = {};
  counts.variants_active = tables.product_variants.filter((v) => v.is_active === 1).length;
  counts.templates_active = tables.catalog_products.filter((p) => p.is_active === 1).length;
  counts.categories_total = tables.catalog_public_categories.length;
  counts.processing_groups_total = tables.public_processing_groups.filter((g) => g.is_active === 1).length;
  const publicTemplates = new Set(tables.catalog_products.filter((p) => p.is_active === 1 && p.is_public === 1).map((p) => p.id));
  for (const locale of LOCALES) {
    counts[`categories_${locale}`] = tables.catalog_public_categories.filter((c) => c.locale === locale).length;
    counts[`processing_groups_${locale}`] = tables.public_processing_groups.filter((g) => g.locale === locale && g.is_active === 1).length;
    counts[`published_templates_${locale}`] = tables.product_seo_contents.filter((s) => s.locale === locale && isPublished(s) && publicTemplates.has(s.entity_id)).length;
  }
  return counts;
}

/** `previousCounts` = the active publication's source counts (the pricing check needs its `prices_published`). */
export function validateSource(odoo: OdooSource, tables: Tables, previousCounts: Record<string, number> | null = null): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  // Schema: the assembled snapshot must satisfy snapshot.v1 (strict columns + referential integrity).
  const parsed = snapshotV1.safeParse({
    schema_version: "snapshot.v1",
    snapshot_version: "snap-0000000000000000",
    created_at: odoo.fetched_at,
    source: { kind: "odoo_full_fetch", description: "validation", fetched_at: odoo.fetched_at },
    tables,
  });
  if (!parsed.success) for (const i of parsed.error.issues.slice(0, 20)) errors.push(`snapshot schema: ${i.path.join(".")}: ${i.message}`);

  // Products: complete pagination, unique identities, known template.
  if (odoo.products.length !== odoo.products_reported_total) errors.push(`products: fetched ${odoo.products.length} but Odoo reported total ${odoo.products_reported_total}`);
  if (odoo.products.length === 0) errors.push("products: Odoo returned no active products");
  const dupes = (values: string[]) => [...new Set(values.filter((v, i) => values.indexOf(v) !== i))];
  for (const d of dupes(odoo.products.map((p) => p.canonical_id))) errors.push(`products: duplicate canonical_id ${d}`);
  for (const d of dupes(odoo.products.map((p) => p.sku))) errors.push(`products: duplicate sku ${d}`);
  for (const p of odoo.products) {
    if (!/^CVAR-/.test(p.canonical_id)) errors.push(`products: ${p.sku}: canonical_id ${p.canonical_id} is not a CVAR id`);
    if (!/^CTMPL-/.test(p.canonical_template_id)) errors.push(`products: ${p.sku}: canonical_template_id ${p.canonical_template_id} is not a CTMPL id`);
    if (!p.active) errors.push(`products: ${p.sku}: inactive row in the active-only list`);
    if (!p.classification.group.code) errors.push(`products: ${p.sku}: no classification group`);
  }

  // Classification codes must be in /meta (active_only).
  const metaCodes = {
    family: new Set(odoo.meta.families.map((m) => m.code)),
    group: new Set(odoo.meta.groups.map((m) => m.code)),
    form: new Set(odoo.meta.forms.map((m) => m.code)),
    grade: new Set(odoo.meta.grades.map((m) => m.code)),
    standard: new Set(odoo.meta.standards.map((m) => m.code)),
  };
  for (const p of odoo.products) {
    const refs: [keyof typeof metaCodes, string | null][] = [
      ["family", p.classification.family.code],
      ["group", p.classification.group.code],
      ["form", p.classification.form.code],
      ["grade", p.grade.code],
      ["standard", p.standard.code],
    ];
    for (const [kind, code] of refs) if (code && !metaCodes[kind].has(code)) errors.push(`products: ${p.sku}: ${kind} ${code} is not in /meta`);
  }

  // Categories: same set, order and group mapping in every locale; counts consistent with the products.
  const fa = odoo.categories.fa;
  for (const locale of LOCALES) {
    const rows = odoo.categories[locale];
    if (rows.length === 0) errors.push(`categories ${locale}: empty`);
    const sig = (r: (typeof rows)[number]) => `${r.code}|${r.sequence}|${r.group_codes.join(",")}|${r.template_count}|${r.variant_count}`;
    if (rows.map(sig).join(";") !== fa.map(sig).join(";")) errors.push(`categories ${locale}: code/sequence/group_codes/counts differ from fa`);
    for (const r of rows) {
      if (!r.name.trim()) errors.push(`categories ${locale}: ${r.code}: empty name`);
      if (locale === "en" && ARABIC_SCRIPT.test(r.name)) errors.push(`categories en: ${r.code}: name "${r.name}" is not English (Persian/Arabic text on en)`);
      if (locale === "ar" && PERSIAN_SPECIFIC.test(r.name)) errors.push(`categories ar: ${r.code}: name "${r.name}" contains Persian-only letters`);
    }
  }
  const categoryOfGroup = new Map<string, string>();
  for (const c of fa) {
    for (const g of c.group_codes) {
      if (categoryOfGroup.has(g)) errors.push(`categories: group ${g} is in both ${categoryOfGroup.get(g)} and ${c.code}`);
      categoryOfGroup.set(g, c.code);
      if (!metaCodes.group.has(g)) warnings.push(`categories: ${c.code} lists group ${g}, which has no active products in /meta`);
    }
    const inCategory = odoo.products.filter((p) => p.classification.group.code && c.group_codes.includes(p.classification.group.code));
    const templateCount = new Set(inCategory.map((p) => p.canonical_template_id)).size;
    if (inCategory.length !== c.variant_count) errors.push(`categories: ${c.code}: Odoo says ${c.variant_count} variants, the fetched products give ${inCategory.length}`);
    if (templateCount !== c.template_count) errors.push(`categories: ${c.code}: Odoo says ${c.template_count} templates, the fetched products give ${templateCount}`);
  }
  // Relation variant -> template -> category: a template's variants share one category.
  const categoryByTemplate = new Map<string, Set<string>>();
  for (const p of odoo.products) {
    const cat = categoryOfGroup.get(p.classification.group.code ?? "") ?? "(none)";
    const set = categoryByTemplate.get(p.canonical_template_id) ?? new Set();
    set.add(cat);
    categoryByTemplate.set(p.canonical_template_id, set);
  }
  for (const [t, cats] of categoryByTemplate) {
    if (cats.size > 1) errors.push(`relations: template ${t} spans categories ${[...cats].join(", ")}`);
    if (cats.has("(none)")) warnings.push(`relations: template ${t} is in no public category (group not listed by /catalog/categories)`);
  }

  // Processing groups: same codes in every locale, unique, named.
  const pgFa = odoo.processing_groups.fa.map((g) => `${g.id}|${g.sequence}|${g.active}`).sort().join(";");
  for (const locale of LOCALES) {
    const rows = odoo.processing_groups[locale];
    for (const d of dupes(rows.map((g) => g.id))) errors.push(`processing groups ${locale}: duplicate code ${d}`);
    if (rows.map((g) => `${g.id}|${g.sequence}|${g.active}`).sort().join(";") !== pgFa) errors.push(`processing groups ${locale}: codes/sequence/active differ from fa`);
    for (const g of rows) {
      if (!g.name.trim()) errors.push(`processing groups ${locale}: ${g.id}: empty name`);
      if (locale === "en" && ARABIC_SCRIPT.test(g.name)) errors.push(`processing groups en: ${g.id}: name "${g.name}" is not English`);
      if (locale === "ar" && PERSIAN_SPECIFIC.test(g.name)) errors.push(`processing groups ar: ${g.id}: name "${g.name}" contains Persian-only letters`);
    }
  }
  if (odoo.processing_groups.fa.length === 0) errors.push("processing groups: Odoo returned none");

  // W9.4 prices: allow-listed fields only, known variants, positive integers, fa factory/location, sane times.
  const pricing = validatePricing(odoo.prices, odoo.products, odoo.fetched_at, previousCounts?.prices_published ?? null);
  errors.push(...pricing.errors);
  warnings.push(...pricing.warnings);
  // W9.6: the 30-day history never fails a run; problems are warnings (the chart is then not drawn).
  const history = validatePricingHistory(odoo.price_history, pricing.rows, odoo.fetched_at);
  warnings.push(...history.warnings);

  // Editorial integrity: every published template is active and has active public variants.
  const counts = { ...sourceCounts(tables), ...pricing.counts };
  const activeVariantsByProduct = new Map<string, number>();
  for (const v of tables.product_variants) if (v.is_active === 1 && v.is_public === 1) activeVariantsByProduct.set(v.product_id, (activeVariantsByProduct.get(v.product_id) ?? 0) + 1);
  const productById = new Map(tables.catalog_products.map((p) => [p.id, p]));
  for (const s of tables.product_seo_contents) {
    if (!isPublished(s)) continue;
    const p = productById.get(s.entity_id);
    if (!p) continue; // snapshot schema already reports unknown ids
    if (p.is_active !== 1) warnings.push(`editorial: ${s.locale}/${s.slug} is published but its template ${p.template_xid} is no longer in Odoo (page will not be built)`);
    else if (!activeVariantsByProduct.get(p.id)) warnings.push(`editorial: ${s.locale}/${s.slug} is published but has no active public variant`);
  }
  return { errors, warnings, counts, pricing: { outcome: pricing.outcome, summary: pricing.summary, ignored: pricing.ignored, history: history.summary } };
}

export interface DecreaseFinding {
  key: string;
  previousKey: string;
  previous: number;
  current: number;
  drop: number;
}

/** §7.1 step 2: every gated count that fell by more than `threshold` against the active publication. */
export function decreaseFindings(current: Record<string, number>, previous: Record<string, number> | null, threshold: number = PIPELINE_CONFIG.decreaseThreshold): DecreaseFinding[] {
  if (!previous) return [];
  const findings: DecreaseFinding[] = [];
  for (const { key, legacy } of GATED_COUNTS) {
    if (!(key in current)) continue;
    const previousKey = key in previous ? key : legacy && legacy in previous ? legacy : null;
    if (!previousKey) continue;
    const prev = previous[previousKey];
    const cur = current[key];
    if (prev > 0 && cur < prev && (prev - cur) / prev > threshold) findings.push({ key, previousKey, previous: prev, current: cur, drop: Number(((prev - cur) / prev).toFixed(4)) });
  }
  return findings;
}

export function describeDecrease(findings: DecreaseFinding[], threshold: number = PIPELINE_CONFIG.decreaseThreshold): string {
  return [
    `DECREASE GATE: ${findings.length} count(s) fell by more than ${threshold * 100}% against the active publication:`,
    ...findings.map((f) => `  - ${f.key}: ${f.previous} -> ${f.current} (-${(f.drop * 100).toFixed(1)}%${f.previousKey !== f.key ? `, previous recorded as ${f.previousKey}` : ""})`),
    "Publication stopped; the active version is untouched. If this drop is intended, re-run the workflow with allow_decrease=true (recorded in the manifest).",
  ].join("\n");
}
