import { type RfqUomCode } from "./uom.ts";

/**
 * The single canonical Website RFQ Launch UoM policy —
 * docs/RFQ_LAUNCH_UOM_ALIGNMENT.md. Pure, D1-free, the one place this
 * business rule is expressed; every other module (validation, service,
 * row UI) imports from here rather than re-encoding the mapping.
 *
 * Source: Odoo Ahan Asa Marketplace production `19.0.27.0.0`, with
 * `LAUNCH UOM HARDENING LIVE`, `DYNAMIC PRICING UNIT BASIS LIVE`, and
 * `SETTLEMENT DUAL-SIDED BILLING LIVE` all confirmed `PASS`. Odoo's public
 * RFQ API no longer accepts `coil`/`bundle`/`piece` as normal Website
 * request UoMs for Launch. This module encodes that confirmed policy — it
 * does not invent, guess, or extend it.
 *
 * Keyed by `product_variants.group_code` (via
 * `lib/catalog/editorial-repository.ts#RfqCatalogSelection.groupCode`) —
 * the least brittle stable Product Master identifier that exactly matches
 * Odoo's own Launch groupings (REBAR covers every rebar grade/form; SHS is
 * its own group; SHEET_PLATE covers both Hot Rolled Plate and Hot Rolled
 * Sheet forms — a physical "sheet count" unit is equally meaningful for
 * both, and only the Plate form is published in production today). Never
 * keyed from a translated display name or a slug.
 */

export const LAUNCH_GROUP_UOM_POLICY: Readonly<Record<string, readonly RfqUomCode[]>> = {
  REBAR: ["kg", "ton", "branch"],
  SHEET_PLATE: ["kg", "ton", "sheet"],
  SHS: ["kg", "ton", "meter"],
};

/**
 * Applied to any Catalog group not named in `LAUNCH_GROUP_UOM_POLICY` above
 * (e.g. Beams, RHS, Seamless Pipe — none currently published, and Odoo has
 * not confirmed a Launch policy for them). Deliberately the same
 * conservative `[kg, ton]` set as Custom items, never a guessed
 * product-specific unit (branch/sheet/meter/coil/bundle/piece) — this is a
 * defensive Website-side default, not an Odoo-confirmed fact, and must be
 * revisited the moment Odoo confirms a real policy for one of these groups.
 */
const DEFAULT_CATALOG_GROUP_UOM_POLICY: readonly RfqUomCode[] = ["kg", "ton"];

/** The only units a Custom/free-text RFQ line may use for Launch — no authoritative per-unit nominal-conversion factor exists without a real Catalog Variant identity, so branch/sheet/meter (and the deferred coil/bundle/piece) are never offered here. */
export const CUSTOM_ITEM_LAUNCH_UOMS: readonly RfqUomCode[] = ["kg", "ton"];

/** Explicitly deferred for Launch — kept only for historical/internal representation (`lib/rfq/uom.ts`'s own label dictionary), never offered in the normal Website RFQ UI and never accepted from a new Website submission. */
export const LAUNCH_DEFERRED_UOMS: readonly RfqUomCode[] = ["coil", "bundle", "piece"];

/** Every Catalog group whose Launch policy Odoo has explicitly confirmed. */
export const LAUNCH_CONFIRMED_CATALOG_GROUPS: readonly string[] = Object.keys(LAUNCH_GROUP_UOM_POLICY);

/** The allowed UoM codes for a Catalog-linked RFQ row belonging to `groupCode` — `null`/unrecognized groups fall back to the conservative default, never a fabricated product-specific unit. */
export function getAllowedUomsForCatalogGroup(groupCode: string | null | undefined): readonly RfqUomCode[] {
  if (!groupCode) return DEFAULT_CATALOG_GROUP_UOM_POLICY;
  return LAUNCH_GROUP_UOM_POLICY[groupCode] ?? DEFAULT_CATALOG_GROUP_UOM_POLICY;
}

export function isUomAllowedForCatalogGroup(groupCode: string | null | undefined, unit: RfqUomCode): boolean {
  return getAllowedUomsForCatalogGroup(groupCode).includes(unit);
}

export function isUomAllowedForCustomItem(unit: RfqUomCode): boolean {
  return CUSTOM_ITEM_LAUNCH_UOMS.includes(unit);
}

/** The default unit to preselect for a Catalog row of this group — the first (and always-present) entry in its allowed set, i.e. "kg" for every current policy. Never a group-specific unit like "branch" by default — the customer explicitly chooses that. */
export function getDefaultUomForCatalogGroup(groupCode: string | null | undefined): RfqUomCode {
  return getAllowedUomsForCatalogGroup(groupCode)[0];
}
