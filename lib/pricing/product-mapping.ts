/**
 * Manually curated (provider_id, provider_product_ref) -> internal
 * product_key mapping (migrations_public/0004_public_price_quotes.sql
 * `price_product_mappings`). An unmapped record is rejected — never
 * guessed from a provider-supplied title/name
 * (docs/pricing/PRICE_PROVIDER_CONTRACT.md "Product mapping").
 *
 * Takes `db` explicitly (the caller's own already-open connection —
 * lib/pricing/sync-orchestrator.ts) rather than calling `getPublicDb()`
 * itself — this keeps the module free of any `cloudflare:workers`
 * import, so it (and anything that imports it) stays safely importable
 * under plain `node --test` without a Workers runtime.
 */
export async function resolveProductKey(db: D1Database, providerId: string, providerProductRef: string): Promise<string | null> {
  const row = await db
    .prepare(`SELECT product_key FROM price_product_mappings WHERE provider_id = ? AND provider_product_ref = ?`)
    .bind(providerId, providerProductRef)
    .first<{ product_key: string }>();
  return row?.product_key ?? null;
}
