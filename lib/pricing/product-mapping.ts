/**
 * Manually curated (provider_id, provider_product_ref) -> internal
 * identity mapping (migrations_public/0004_public_price_quotes.sql
 * `price_product_mappings`, extended by migrations_public/0008 with
 * `variant_key`). An unmapped record is rejected — never guessed from a
 * provider-supplied title/name (docs/pricing/PRICE_PROVIDER_CONTRACT.md
 * "Product mapping").
 *
 * Dual identity (PRICE_STRIP_V2.1_ARCHITECTURE_DECISIONS.md §A): the
 * mapping is the SOLE place exactness is curated — `variant_key`, when
 * present, is a human-curated decision that this specific
 * `(provider_id, provider_product_ref)` refers to one exact Product
 * Variant, never inferred from provider free text. `variant_key` is
 * nullable: a mapping with `product_key` only remains valid and
 * template-level (backward-compatible, task PRICE-P1 §6) — it is simply
 * not eligible for the exact-variant benchmark path until explicitly
 * curated further; this module never invents a variant to fill the gap.
 *
 * Takes `db` explicitly (the caller's own already-open connection —
 * lib/pricing/sync-orchestrator.ts) rather than calling `getPublicDb()`
 * itself — this keeps the module free of any `cloudflare:workers`
 * import, so it (and anything that imports it) stays safely importable
 * under plain `node --test` without a Workers runtime.
 */

export interface ProductMapping {
  productKey: string;
  /** Curated exact variant identity, or `null` when this mapping has not (yet) been curated to variant-level precision. */
  variantKey: string | null;
}

export async function resolveProductMapping(db: D1Database, providerId: string, providerProductRef: string): Promise<ProductMapping | null> {
  const row = await db
    .prepare(`SELECT product_key, variant_key FROM price_product_mappings WHERE provider_id = ? AND provider_product_ref = ?`)
    .bind(providerId, providerProductRef)
    .first<{ product_key: string; variant_key: string | null }>();
  if (!row) return null;
  return { productKey: row.product_key, variantKey: row.variant_key };
}
