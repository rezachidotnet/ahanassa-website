/**
 * Content publication pipeline parameters (architecture V1.1 §7.1, §7.4, §20:
 * "parameters adjustable without a new version"). The ONE place the
 * pipeline's tunables live; scripts/content/* and the workflow read them here.
 */
export const PIPELINE_CONFIG = {
  /** §7.1 step 2: any gated count lower than the active version's by MORE than this fraction stops the publish. */
  decreaseThreshold: 0.2,
  /** §5.1: publication versions kept in DB_PUBLIC (active included); older ones are pruned only after a successful switch. */
  retainVersions: 3,
  odoo: {
    /** §6.7: production Odoo, read-only, GET only. */
    baseUrl: "https://odoo.ahanassa.com",
    /** At most 2 requests per second: minimum spacing between request starts. */
    minRequestIntervalMs: 600,
    /** §13.3: TTFB from a GitHub runner is ~2.3 s; leave headroom. */
    timeoutMs: 30_000,
    pageSize: 100,
    maxPages: 50,
    locales: ["fa", "en", "ar"] as const,
    /**
     * The only URL paths the fetch may request (owner decision 2026-10-03: the catalog API plus the
     * processing-groups endpoint, which §7.1 step 1 needs and which has no /api/v1/catalog/* twin).
     */
    allowedPathPrefixes: ["/api/v1/catalog/", "/api/v1/processing/groups"],
  },
  d1: {
    /** Rows per `wrangler d1 execute --file` batch; each file runs as one transaction. */
    rowsPerBatch: 150,
  },
} as const;

/**
 * Count keys the decrease gate compares (§7.1 step 2). Keys missing on either
 * side are skipped. `legacy` maps a key to the count name a pre-W4
 * publication (W1 fixture loader) recorded for the same quantity.
 */
export const GATED_COUNTS: ReadonlyArray<{ key: string; legacy?: string }> = [
  { key: "variants_active", legacy: "product_variants" },
  { key: "templates_active", legacy: "catalog_products" },
  { key: "categories_total", legacy: "catalog_public_categories" },
  { key: "categories_fa" },
  { key: "categories_en" },
  { key: "categories_ar" },
  { key: "processing_groups_total", legacy: "public_processing_groups" },
  { key: "processing_groups_fa" },
  { key: "processing_groups_en" },
  { key: "processing_groups_ar" },
  { key: "published_templates_fa" },
  { key: "published_templates_en" },
  { key: "published_templates_ar" },
  { key: "rfq_catalog_fa" },
  { key: "rfq_catalog_en" },
  { key: "rfq_catalog_ar" },
  { key: "rfq_variant_index_rows" },
  { key: "sitemap_urls" },
];
