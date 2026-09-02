import { RFQ_API_UOM_CODES, type RfqApiItem, type RfqApiLocale, type RfqApiRequest, type RfqApiUomCode } from "./rfq-api-types.ts";

/**
 * Website durable RFQ snapshot -> Odoo RFQ API v1 request — the one
 * explicit mapper (DOCUMENT_AUDIT_REPORT.md DAR-041,
 * docs/ODOO_RFQ_API_INTEGRATION.md). Pure, D1-free, fully unit-tested.
 *
 * Input is deliberately a plain, already-fetched snapshot shape — never a
 * live D1 handle, never mutable browser state. `lib/queue/consumer.ts` is
 * the only caller; it reads this shape directly from `rfqs`/`rfq_contacts`/
 * `rfq_items` (immutable once written — DAR-039's own historical-safety
 * guarantee) and passes it here unchanged. A later Product name/SKU/title
 * change can never alter what this function produces for an
 * already-accepted RFQ, because it never reads live Catalog/editorial data
 * at all.
 */

export interface RfqSnapshotItem {
  lineNumber: number;
  /** rfq_items.variant_ref — product_variant_xid, present only for a catalog-linked line. */
  variantRef: string | null;
  skuSnapshot: string | null;
  /** rfq_items.freeform_title — required, non-null for a freeform line (lib/rfq/validation.ts's own invariant). */
  freeformTitle: string | null;
  /** rfq_items.description — genuine customer-authored per-item notes, when the form collects them (currently always null — see docs/ODOO_RFQ_API_INTEGRATION.md). */
  description: string | null;
  quantityText: string;
  quantityValue: number | null;
  quantityScale: number | null;
  /**
   * `rfq_items.unit_ref` — the structured, already-Launch-policy-validated
   * UoM code captured at submission time (docs/RFQ_LAUNCH_UOM_ALIGNMENT.md,
   * `lib/rfq/validation.ts` / `lib/rfq/service.ts`). `null` only for a
   * historical row persisted before this field existed — `mapItem` falls
   * back to `inferOdooUomCode(quantityText)` for those, never for a new
   * submission (which always has this populated).
   */
  unitCode: string | null;
}

export interface RfqSnapshotForMapping {
  locale: string;
  fullName: string;
  companyName: string | null;
  phone: string | null;
  email: string | null;
  message: string | null;
  items: RfqSnapshotItem[];
}

export type RfqMappingFailureReason = "UNCONVERTIBLE_QUANTITY" | "UNRESOLVED_UOM" | "MISSING_FREEFORM_DESCRIPTION" | "UNSUPPORTED_LOCALE" | "NO_ITEMS";

export type RfqMappingResult = { ok: true; payload: RfqApiRequest } | { ok: false; reason: RfqMappingFailureReason; lineNumber?: number };

// ---------------------------------------------------------------------------
// Outbound idempotency key (Stage D)
// ---------------------------------------------------------------------------

/**
 * Deterministic, stable outbound `Idempotency-Key` for one durable Website
 * RFQ. Derived from the RFQ's own durable D1 ULID (`rfqs.id` /
 * `event.aggregate_id`) — never freshly random, never the raw browser
 * idempotency key (the Website only ever stores that key's SHA-256 hash,
 * never the raw value — lib/rfq/idempotency.ts). Reconstructable on every
 * Queue/outbox retry from the same stable `aggregate_id`, so it is
 * unchanged across timeout/network retry by construction. `rfq-` prefix is
 * purely for human/log readability; a ULID is already ASCII and globally
 * unique, so two different Website RFQs can never accidentally collide.
 * 30 chars total ("rfq-" + 26-char ULID), far under the 128-char limit.
 */
export function buildOutboundRfqIdempotencyKey(rfqId: string): string {
  return `rfq-${rfqId}`;
}

// ---------------------------------------------------------------------------
// UoM inference (Stage: "UOM Contract")
// ---------------------------------------------------------------------------

/**
 * Legacy fallback only (docs/RFQ_LAUNCH_UOM_ALIGNMENT.md). Until the Launch
 * UoM Contract Alignment task, the Website captured quantity as one
 * freeform string (`quantity_text`, e.g. "200 تن") with no structured
 * customer-facing UoM selector (DAR-039 Stage G) — this best-effort,
 * non-fabricating keyword extraction was the only way to recover a UoM
 * code for Odoo's contract. Every new submission now carries a real,
 * already-Launch-policy-validated structured code
 * (`RfqSnapshotItem.unitCode`, populated from `rfq_items.unit_ref`) that
 * `mapItem` uses directly and deterministically — this function is only
 * still consulted as a fallback for a historical row whose `unit_ref` is
 * `null` (persisted before this field existed). Returns `null` (never a
 * guessed default) when no known keyword is found; the caller treats that
 * identically to an unconvertible quantity — a real, reported blocker,
 * never a silently wrong unit.
 */
const UOM_KEYWORDS: Record<RfqApiUomCode, string[]> = {
  kg: ["kg", "kilogram", "کیلوگرم", "کیلو", "كجم", "كيلوجرام"],
  ton: ["ton", "tons", "تن", "طن"],
  branch: ["branch", "شاخه", "فرع"],
  sheet: ["sheet", "sheets", "ورق", "لوح"],
  meter: ["meter", "meters", "متر"],
  coil: ["coil", "کلاف", "لفة"],
  bundle: ["bundle", "بسته", "دسته", "حزمة"],
  piece: ["piece", "pieces", "pcs", "unit", "units", "عدد", "دانه", "قطعه", "قطعة"],
};

export function inferOdooUomCode(quantityText: string): RfqApiUomCode | null {
  const normalized = quantityText.toLowerCase();
  for (const code of RFQ_API_UOM_CODES) {
    for (const keyword of UOM_KEYWORDS[code]) {
      if (normalized.includes(keyword.toLowerCase())) return code;
    }
  }
  return null;
}

// ---------------------------------------------------------------------------
// Quantity conversion
// ---------------------------------------------------------------------------

/** `rfq_items.quantity_value`/`quantity_scale` -> a real finite positive number, per DATABASE_SCHEMA.md §3.1's `value x 10^-scale` convention. `null` when the Website could never parse a leading number from the customer's free text — never guessed. */
export function computeNumericQuantity(quantityValue: number | null, quantityScale: number | null): number | null {
  if (quantityValue === null || quantityScale === null) return null;
  const value = quantityValue / 10 ** quantityScale;
  return Number.isFinite(value) && value > 0 ? value : null;
}

// ---------------------------------------------------------------------------
// Item mapping
// ---------------------------------------------------------------------------

/** `item.unitCode`, deterministically, when it's a real recognized Odoo UoM code; `inferOdooUomCode` fallback only for a historical row that predates the structured field (see `RfqSnapshotItem.unitCode`'s own doc comment) — never re-inferred for a value that's already structurally present, even if it happens to also be keyword-matchable. */
function resolveUomCode(item: RfqSnapshotItem): RfqApiUomCode | null {
  if (item.unitCode && (RFQ_API_UOM_CODES as readonly string[]).includes(item.unitCode)) {
    return item.unitCode as RfqApiUomCode;
  }
  return inferOdooUomCode(item.quantityText);
}

function mapItem(item: RfqSnapshotItem): { ok: true; apiItem: RfqApiItem } | { ok: false; reason: RfqMappingFailureReason } {
  const quantity = computeNumericQuantity(item.quantityValue, item.quantityScale);
  if (quantity === null) return { ok: false, reason: "UNCONVERTIBLE_QUANTITY" };

  const uom = resolveUomCode(item);
  if (uom === null) return { ok: false, reason: "UNRESOLVED_UOM" };

  const notes = item.description ?? undefined;

  if (item.variantRef) {
    return {
      ok: true,
      apiItem: {
        product_variant_xid: item.variantRef,
        sku: item.skuSnapshot ?? undefined,
        quantity,
        uom,
        notes,
      },
    };
  }

  if (!item.freeformTitle || item.freeformTitle.trim().length === 0) {
    return { ok: false, reason: "MISSING_FREEFORM_DESCRIPTION" };
  }

  return {
    ok: true,
    apiItem: {
      product_variant_xid: null,
      quantity,
      uom,
      description: item.freeformTitle,
      notes,
    },
  };
}

// ---------------------------------------------------------------------------
// Full request mapping
// ---------------------------------------------------------------------------

const SUPPORTED_LOCALES: readonly RfqApiLocale[] = ["fa", "en", "ar"];

/**
 * The one explicit mapper. Maps only `locale`, `customer`, `items`,
 * `notes`, `source` (never `consent` — see docs/ODOO_RFQ_API_INTEGRATION.md
 * for why: the Website has no real captured consent state to report, and
 * fabricating `{contact: true}` would misrepresent the customer). Never
 * sends D1 IDs, internal integration/sync state, Cloudflare metadata,
 * Turnstile tokens, rate-limit data, or any Odoo/CRM ID — only fields this
 * exact type signature can express are ever produced.
 */
export function mapRfqToApiPayload(snapshot: RfqSnapshotForMapping): RfqMappingResult {
  if (!SUPPORTED_LOCALES.includes(snapshot.locale as RfqApiLocale)) {
    return { ok: false, reason: "UNSUPPORTED_LOCALE" };
  }
  if (snapshot.items.length === 0) {
    return { ok: false, reason: "NO_ITEMS" };
  }

  const items: RfqApiItem[] = [];
  for (const item of snapshot.items) {
    const mapped = mapItem(item);
    if (!mapped.ok) return { ok: false, reason: mapped.reason, lineNumber: item.lineNumber };
    items.push(mapped.apiItem);
  }

  return {
    ok: true,
    payload: {
      locale: snapshot.locale as RfqApiLocale,
      customer: {
        name: snapshot.fullName,
        company: snapshot.companyName ?? undefined,
        phone: snapshot.phone ?? undefined,
        email: snapshot.email ?? undefined,
        // country/city intentionally omitted — the Website does not
        // currently capture per-customer country/city (rfq_contacts.country_code/city
        // are always NULL today; rfqs.project_city is a delivery-location
        // field, semantically distinct from the customer's own city, and
        // is never conflated with it here).
      },
      items,
      notes: snapshot.message ?? undefined,
      // consent: intentionally omitted — see file header.
      source: { utm_source: "website" },
    },
  };
}
