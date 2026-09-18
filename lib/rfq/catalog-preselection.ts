import type { RfqCatalogSelection } from "@/lib/catalog/editorial-repository";
import type { RfqItemRecord } from "./types";
import type { RfqUomCode } from "./uom";

/**
 * Pure record-builders for one RFQ line — Catalog -> RFQ Variant
 * Preselection (DOCUMENT_AUDIT_REPORT.md DAR-039,
 * docs/CATALOG_RFQ_INTEGRATION.md). Deliberately D1-free (only a type-only
 * import from `lib/catalog/editorial-repository.ts`, erased at compile
 * time — this file never actually touches `cloudflare:workers`) so it stays
 * directly `node --test`-able, mirroring the pure/D1-touching split used
 * throughout `lib/catalog/`.
 *
 * `lib/rfq/service.ts` is the only caller: it resolves a catalog item's
 * `product_variant_xid` against DB_PUBLIC first
 * (`resolveRfqCatalogVariant`), then hands the *result* — never the raw
 * client input — to `buildCatalogItemRecord` here.
 */

export interface CatalogSelectionForRecord
  extends Pick<RfqCatalogSelection, "variantXid" | "templateXid" | "sku" | "variantSpecLabel" | "productLabel" | "categoryCode" | "categoryLabel"> {}

export interface QuantityInput {
  quantityText: string;
  quantityValue: number | null;
  quantityScale: number | null;
}

/** Already format/range-validated by `lib/rfq/validation.ts#parseLengthMm` — this module never re-validates it, only threads it through. */
export type LengthMmInput = number | null;

/** The structured, already-policy-validated unit for this line (docs/RFQ_LAUNCH_UOM_ALIGNMENT.md) — `code` is the wire/Odoo-mapping value, `label` the customer's own locale's display string (`lib/rfq/uom.ts#RFQ_UOM_LABELS`), both resolved by the caller before this function ever runs. */
export interface UnitInput {
  code: RfqUomCode;
  label: string;
}

/**
 * Builds the final persisted shape for a real Catalog-linked line. Every
 * identity/label/SKU field comes from the server-resolved `selection` —
 * never from client input — so this function structurally cannot produce a
 * fabricated Catalog snapshot. Historical safety: the returned object is
 * plain, self-contained strings — nothing here retains a live reference
 * back to DB_PUBLIC, so a persisted row remains fully meaningful even after
 * the source product's title/SKU/slug changes or it is later deactivated
 * (docs/CATALOG_RFQ_INTEGRATION.md §Historical safety).
 */
export function buildCatalogItemRecord(selection: CatalogSelectionForRecord, quantity: QuantityInput, description: string | null, unit: UnitInput, lengthMm: LengthMmInput = null): RfqItemRecord {
  return {
    source: "selected",
    categoryRef: selection.categoryCode,
    productRef: selection.templateXid,
    variantRef: selection.variantXid,
    unitRef: unit.code,
    categoryLabel: selection.categoryLabel,
    productLabel: selection.productLabel,
    variantLabel: selection.variantSpecLabel,
    unitLabel: unit.label,
    freeformTitle: null,
    sizeText: null,
    quantityText: quantity.quantityText,
    quantityValue: quantity.quantityValue,
    quantityScale: quantity.quantityScale,
    description,
    skuSnapshot: selection.sku,
    lengthMm,
  };
}

export interface FreeformItemInput {
  productRef: string | null;
  productLabel: string | null;
  categoryLabel: string | null;
  freeformTitle: string | null;
  sizeText: string | null;
  quantityText: string;
  quantityValue: number | null;
  quantityScale: number | null;
  description: string | null;
  lengthMm?: LengthMmInput;
}

/** The unchanged freeform/sample-catalog path — never carries a variant_ref/sku_snapshot. `unit` is already Custom-item-policy-validated (kg/ton only, lib/rfq/validation.ts) by the time this runs. */
export function buildFreeformItemRecord(item: FreeformItemInput, unit: UnitInput): RfqItemRecord {
  return {
    source: "freeform",
    categoryRef: null,
    productRef: item.productRef,
    variantRef: null,
    unitRef: unit.code,
    categoryLabel: item.categoryLabel,
    productLabel: item.productLabel,
    variantLabel: null,
    unitLabel: unit.label,
    freeformTitle: item.freeformTitle,
    sizeText: item.sizeText,
    quantityText: item.quantityText,
    quantityValue: item.quantityValue,
    quantityScale: item.quantityScale,
    description: item.description,
    skuSnapshot: null,
    lengthMm: item.lengthMm ?? null,
  };
}
