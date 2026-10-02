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
import type { PublicCatalogCategory } from "@/lib/catalog/types";
import { indexPublicCategoriesByGroupCode, resolveRfqPublicCategory } from "../catalog/public-categories.ts";

/**
 * A selectable Variant plus its DISPLAY category for the selector. The
 * inherited `categoryCode`/`categoryLabel` (Product Master family) are left
 * exactly as before — they are what an RFQ persists
 * (`buildCatalogItemRecord` -> rfq_items.category_ref/category_label) — while
 * the selector groups by `publicCategoryCode`/`publicCategoryLabel`, the
 * locale's own public category.
 */
export interface RfqSelectableCatalogItem extends RfqCatalogSelection {
  publicCategoryCode: string | null;
  publicCategoryLabel: string | null;
}

/**
 * Attaches each Variant's public category from the locale's
 * `catalog_public_categories` snapshot (`resolveRfqPublicCategory`) and
 * orders the list by the snapshot's category position — the same order the
 * Homepage and Header use. The sort is stable, so the query's own
 * product/size order is kept inside each category. Returns the group codes
 * no public category covers, so the caller can log them once each.
 */
export function attachRfqPublicCategories(
  items: RfqCatalogSelection[],
  categories: PublicCatalogCategory[],
  locale: "fa" | "en" | "ar",
): { items: RfqSelectableCatalogItem[]; unresolvedGroupCodes: string[] } {
  const index = indexPublicCategoriesByGroupCode(categories);
  const unresolved = new Set<string>();
  const withPosition = items.map((item) => {
    const category = resolveRfqPublicCategory(index, locale, item.groupCode, item.categoryLabel);
    if (!category.resolved) unresolved.add(item.groupCode ?? "(none)");
    return { position: category.position, item: { ...item, publicCategoryCode: category.code, publicCategoryLabel: category.label } };
  });
  withPosition.sort((a, b) => a.position - b.position);
  return { items: withPosition.map((w) => w.item), unresolvedGroupCodes: [...unresolved] };
}

/**
 * The browser-facing shape of a selectable Variant — what
 * `/data/rfq-catalog.<locale>.json` carries (artifact.v1 `publicRfqCatalog`).
 * `categoryLabel` (the Product Master family name, Persian-only today) is
 * server-side data: it is persisted by `buildCatalogItemRecord` from the
 * server's own resolution, the selector never shows it, and architecture
 * V1.1 §7.1 (A6) forbids it in public JSON.
 */
export type PublicRfqCatalogItem = Omit<RfqSelectableCatalogItem, "categoryLabel">;

export function toPublicRfqCatalogItem(item: RfqSelectableCatalogItem): PublicRfqCatalogItem {
  const { categoryLabel: _serverOnly, ...publicItem } = item;
  return publicItem;
}

export interface CatalogTemplateGroup {
  templateXid: string;
  productLabel: string;
  /** Every variant under one template shares the same Product Master group_code — captured once here so a row's Unit selector can look up its Launch UoM policy (lib/rfq/uom-policy.ts) without re-deriving it per variant. */
  groupCode: string | null;
  variants: PublicRfqCatalogItem[];
}

export interface CatalogCategoryGroup {
  /** The locale's public category code (`attachRfqPublicCategories`); `null` for the rare Variant with no group_code at all — grouped, never silently dropped. */
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
 * a Variant with no `publicCategoryLabel` is grouped under a clearly-labeled
 * fallback bucket rather than dropped.
 */
export function groupCatalogItemsForSelector(items: PublicRfqCatalogItem[], locale: "fa" | "en" | "ar" = "fa"): CatalogCategoryGroup[] {
  const categories = new Map<string, CatalogCategoryGroup>();

  for (const item of items) {
    const categoryKey = item.publicCategoryCode ?? "__uncategorized__";
    let category = categories.get(categoryKey);
    if (!category) {
      category = { categoryCode: item.publicCategoryCode, categoryLabel: item.publicCategoryLabel ?? UNCATEGORIZED_LABEL[locale], templates: [] };
      categories.set(categoryKey, category);
    }

    let template = category.templates.find((t) => t.templateXid === item.templateXid);
    if (!template) {
      template = { templateXid: item.templateXid, productLabel: item.productLabel, groupCode: item.groupCode, variants: [] };
      category.templates.push(template);
    }

    template.variants.push(item);
  }

  return [...categories.values()];
}

/** Finds one Variant's full record by xid within an already-fetched flat list — used to resolve a preselected/previously-chosen xid back into its display fields without a second lookup. */
export function findCatalogItemByXid<T extends PublicRfqCatalogItem>(items: T[], variantXid: string): T | null {
  return items.find((item) => item.variantXid === variantXid) ?? null;
}
