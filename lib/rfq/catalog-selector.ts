/**
 * Pure, client-safe grouping of an already-fetched, already-publication-safe
 * flat Catalog Variant list into the 3-level Category -> Product -> Variant
 * shape the multi-item form's cascading selects render.
 *
 * Deliberately takes no D1/network dependency — the flat list itself is
 * fetched exactly once, server-side, per page render
 * (`lib/catalog/editorial-repository.ts#listRfqSelectableCatalogItems`,
 * the same publication-eligibility predicate as `resolveRfqCatalogVariant`)
 * and shared across every row's selects client-side, so adding a 2nd/3rd/
 * Nth Catalog row never issues another request or re-downloads anything
 * (docs/RFQ_MULTI_ITEM_FORM.md "Performance").
 *
 * `RfqCatalogSelection` is imported type-only — erased at compile time, so
 * this file never actually pulls in `lib/catalog/editorial-repository.ts`'s
 * `cloudflare:workers` dependency and stays directly `node --test`-able,
 * mirroring `lib/rfq/catalog-preselection.ts`'s established pattern.
 */

import type { RfqCatalogSelection } from "@/lib/catalog/editorial-repository";

export type RfqSelectableCatalogItem = RfqCatalogSelection;

export interface CatalogTemplateGroup {
  templateXid: string;
  productLabel: string;
  variants: RfqSelectableCatalogItem[];
}

export interface CatalogCategoryGroup {
  /** `null` sentinel key for the (expected-rare) case a real Variant has no family_code/family_name in DB_PUBLIC — grouped, never silently dropped. */
  categoryCode: string | null;
  categoryLabel: string;
  templates: CatalogTemplateGroup[];
}

const UNCATEGORIZED_LABEL: Record<"fa" | "en" | "ar", string> = {
  fa: "سایر گروه‌های کالایی",
  en: "Other categories",
  ar: "فئات أخرى",
};

/**
 * Groups a flat, already-eligible Variant list into Category -> Template ->
 * Variant, preserving the input's own ordering within each group (the
 * caller/query already orders it sensibly). Never fabricates a category —
 * a Variant with no `categoryLabel` is grouped under a clearly-labeled
 * fallback bucket rather than dropped.
 */
export function groupCatalogItemsForSelector(items: RfqSelectableCatalogItem[], locale: "fa" | "en" | "ar" = "fa"): CatalogCategoryGroup[] {
  const categories = new Map<string, CatalogCategoryGroup>();

  for (const item of items) {
    const categoryKey = item.categoryCode ?? "__uncategorized__";
    let category = categories.get(categoryKey);
    if (!category) {
      category = { categoryCode: item.categoryCode, categoryLabel: item.categoryLabel ?? UNCATEGORIZED_LABEL[locale], templates: [] };
      categories.set(categoryKey, category);
    }

    let template = category.templates.find((t) => t.templateXid === item.templateXid);
    if (!template) {
      template = { templateXid: item.templateXid, productLabel: item.productLabel, variants: [] };
      category.templates.push(template);
    }

    template.variants.push(item);
  }

  return [...categories.values()];
}

/** Finds one Variant's full record by xid within an already-fetched flat list — used to resolve a preselected/previously-chosen xid back into its display fields without a second lookup. */
export function findCatalogItemByXid(items: RfqSelectableCatalogItem[], variantXid: string): RfqSelectableCatalogItem | null {
  return items.find((item) => item.variantXid === variantXid) ?? null;
}
