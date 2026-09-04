/**
 * Variant integrity — the frozen invariant (PRICE_STRIP_V2.1_ARCHITECTURE_DECISIONS.md
 * §A, task PRICE-P1 §5): when a `price_product_mappings` row carries a
 * `variant_key`, it must resolve to a real, currently-active public
 * Product Variant, AND that variant's own owning template must equal the
 * mapping's own `product_key`. A mapping must never silently point to a
 * variant belonging to a different template.
 *
 * Split into a pure comparison (independently unit-testable, no D1) and an
 * impure D1-touching resolver — same pure/impure boundary convention this
 * repo already uses throughout `lib/catalog/` and `lib/pricing/`
 * (`sync-safety.ts`/`quote-selection.ts` split out of their D1-touching
 * callers for exactly this reason).
 *
 * Fail-closed: `resolveAndValidateVariant` returns `null` for a missing,
 * inactive, OR wrong-template variant — the caller
 * (`lib/pricing/sync-orchestrator.ts`) treats all three identically to "no
 * exact variant available," never trusting an inconsistent identity.
 */

export interface VariantTemplateLookup {
  templateXid: string;
}

/** Pure — the actual invariant check, split out so it's testable without a D1 round-trip. */
export function variantBelongsToTemplate(variant: VariantTemplateLookup, expectedTemplateXid: string): boolean {
  return variant.templateXid === expectedTemplateXid;
}

/**
 * Resolves `variantXid`'s real owning template from DB_PUBLIC and
 * validates it against `expectedTemplateXid` (the mapping's own
 * `product_key`). Gated on `pv.is_active = 1` only — NOT `is_public`
 * (deliberately): this checks whether the identity is real and internally
 * consistent, a narrower question than whether it is currently eligible
 * for public display, which is `price_display_products`/the future P3
 * read-model's own separate concern. A curator may legitimately map a
 * price to a variant that is real and active but not yet flagged public.
 */
export async function resolveAndValidateVariant(db: D1Database, variantXid: string, expectedTemplateXid: string): Promise<VariantTemplateLookup | null> {
  const row = await db
    .prepare(
      `SELECT cp.template_xid as template_xid
       FROM product_variants pv
       JOIN catalog_products cp ON cp.id = pv.product_id
       WHERE pv.xid = ? AND pv.is_active = 1`,
    )
    .bind(variantXid)
    .first<{ template_xid: string }>();

  if (!row) return null;
  const lookup: VariantTemplateLookup = { templateXid: row.template_xid };
  return variantBelongsToTemplate(lookup, expectedTemplateXid) ? lookup : null;
}
