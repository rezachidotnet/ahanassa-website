import type { SnapshotV1 } from "../contracts/snapshot-v1.ts";

/**
 * Thin-content guard (W5, owner decision D6) — REPORT ONLY, never blocks a
 * publication. Lists the published product pages (the ones Google will index
 * in production) whose Odoo data lacks grade, standard or a description, so
 * the owner sees what will be indexed (input for Odoo task O-5).
 *
 * - grade / standard: from the page's active public variants (Odoo fields).
 * - Odoo description: the Public Catalog API v1 has no description field, so
 *   it is missing for every product until Odoo adds one.
 * - page description: the Website editorial `seo_description` / `intro` of
 *   that locale's page (the text the page and its meta description show).
 */
export interface ThinContentRow {
  templateXid: string;
  name: string;
  locales: string[];
  variants: number;
  gradeMissing: "all" | "some" | "none";
  standardMissing: "all" | "some" | "none";
  odooDescription: "not provided by the Odoo API";
  pageDescriptionMissingIn: string[];
}

export interface ThinContentReport {
  snapshotVersion: string;
  publishedTemplates: number;
  rows: ThinContentRow[];
}

const missing = (values: (string | null)[]): ThinContentRow["gradeMissing"] => {
  const n = values.filter((v) => !v?.trim()).length;
  return n === 0 ? "none" : n === values.length ? "all" : "some";
};

export function thinContentReport(snapshot: SnapshotV1): ThinContentReport {
  const { catalog_products: products, product_variants: variants, product_seo_contents: seo } = snapshot.tables;
  const published = (r: (typeof seo)[number]) => r.entity_type === "product" && r.content_quality_status === "approved" && r.published_at !== null && r.h1 !== null;
  const rows: ThinContentRow[] = [];
  for (const p of products) {
    if (p.is_active !== 1 || p.is_public !== 1) continue;
    const pages = seo.filter((r) => r.entity_id === p.id && published(r)).sort((a, b) => a.locale.localeCompare(b.locale));
    if (!pages.length) continue;
    const vs = variants.filter((v) => v.product_id === p.id && v.is_active === 1 && v.is_public === 1);
    rows.push({
      templateXid: p.template_xid,
      name: p.commercial_template_name,
      locales: pages.map((r) => r.locale),
      variants: vs.length,
      gradeMissing: missing(vs.map((v) => v.grade_code)),
      standardMissing: missing(vs.map((v) => v.standard_code)),
      odooDescription: "not provided by the Odoo API",
      pageDescriptionMissingIn: pages.filter((r) => !r.seo_description?.trim() && !r.intro?.trim()).map((r) => r.locale),
    });
  }
  rows.sort((a, b) => a.templateXid.localeCompare(b.templateXid));
  return { snapshotVersion: snapshot.snapshot_version, publishedTemplates: rows.length, rows };
}

export function thinContentMarkdown(report: ThinContentReport): string {
  const flagged = report.rows.filter((r) => r.gradeMissing !== "none" || r.standardMissing !== "none" || r.pageDescriptionMissingIn.length);
  return [
    `### Thin-content report (report only, never blocks) — \`${report.snapshotVersion}\``,
    `- ${report.publishedTemplates} published product templates (each indexable in fa/en/ar in production, D6).`,
    `- Odoo description: **not provided by the Odoo API for any product** (input for Odoo O-5).`,
    `- ${flagged.length} templates lack grade, standard or a page description:`,
    "",
    "| Template | Name | Variants | Grade missing | Standard missing | Page description missing in |",
    "|---|---|---|---|---|---|",
    ...flagged.map((r) => `| \`${r.templateXid}\` | ${r.name} | ${r.variants} | ${r.gradeMissing} | ${r.standardMissing} | ${r.pageDescriptionMissingIn.join(", ") || "—"} |`),
    "",
  ].join("\n");
}
