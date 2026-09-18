/**
 * Product-aware visibility policy for the optional RFQ "requested length"
 * input (docs/POST_P3F_RFQ_LENGTH_MM_FULL_STACK_REPORT.md "Product-Aware
 * Visibility") — mirrors `lib/rfq/uom-policy.ts`'s own shape exactly (a
 * small, pure, `group_code`-keyed policy table + accessor), deliberately a
 * separate module rather than folded into that file: this is a distinct
 * policy dimension (whether a length INPUT is offered at all) from UoM
 * policy (which units are valid once a quantity exists).
 *
 * Derived from real Product Master data, never guessed: ANGLE
 * (`dimensions_json: {width_mm, height_mm, thickness_mm}`) and CHANNEL
 * (`dimensions_json: {width_mm, height_mm}`) are the only currently-synced
 * groups whose own catalog commercial dimensions do NOT already include a
 * `length_mm` key (docs/POST_P3F_WEBSITE_LIVE_CANONICAL_CATALOG_SYNC_REPORT.md
 * — live-verified against all 19 Angle/Channel variants). Every other
 * currently-published group (REBAR, BEAMS, RHS, SHS, SEAMLESS_PIPE,
 * SHEET_PLATE) already carries `length_mm` as part of its own commercial
 * `dimensions_json` — i.e. length is already fixed, published product
 * identity for those groups (docs/CATALOG_PUBLIC_ROUTES.md §2's dimension
 * table) — so offering a second, RFQ-time "requested length" input for them
 * would duplicate/conflict with already-fixed catalog data, not fill a real
 * gap. This is exactly the "size vs. requested length" distinction this
 * task's own architecture rule draws: for ANGLE/CHANNEL, length is
 * genuinely absent from product identity and is purely an RFQ-time
 * customer ask; for the others, it already IS product identity.
 */

const RFQ_LENGTH_MM_SUPPORTED_GROUPS: readonly string[] = ["ANGLE", "CHANNEL"];

/** Whether the optional requested-length input should be offered for a Catalog row belonging to `groupCode`. `null`/unrecognized groups never show it — never a guessed default. */
export function isLengthMmSupportedForGroup(groupCode: string | null | undefined): boolean {
  if (!groupCode) return false;
  return RFQ_LENGTH_MM_SUPPORTED_GROUPS.includes(groupCode);
}
