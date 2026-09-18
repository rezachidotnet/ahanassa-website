import { hashIdempotencyKey } from "@/lib/rfq/idempotency";
import { createRfq } from "@/lib/rfq/repository";
import { validateRfqSubmission } from "@/lib/rfq/validation";
import { buildCatalogItemRecord, buildFreeformItemRecord } from "@/lib/rfq/catalog-preselection";
import { RFQ_UOM_LABELS } from "@/lib/rfq/uom";
import { isUomAllowedForCatalogGroup } from "@/lib/rfq/uom-policy";
import type { RfqItemRecord, RfqResponse, RfqSubmissionRecord } from "@/lib/rfq/types";
import { ServiceUnavailableError } from "@/lib/db/ops";
import { verifyTurnstileToken } from "@/lib/security/turnstile";
import { resolveRfqCatalogVariant } from "@/lib/catalog/editorial-repository";

export interface SubmitRfqOptions {
  correlationId: string;
  /** Minimum plausible human-completion time in ms; requests faster than this are treated as automated (best-effort, passive signal only). */
  minCompletionMs?: number;
  /** Cloudflare-provided client IP, forwarded to Turnstile Siteverify as `remoteip` — best-effort only. */
  clientIp?: string;
}

const DEFAULT_MIN_COMPLETION_MS = 1500;

export async function submitRfq(rawBody: unknown, options: SubmitRfqOptions): Promise<{ status: number; body: RfqResponse }> {
  const result = validateRfqSubmission(rawBody);
  if (!result.ok || !result.value) {
    return { status: 422, body: { ok: false, code: "VALIDATION_ERROR", fieldErrors: result.fieldErrors } };
  }

  const body = rawBody as Record<string, unknown>;
  const minCompletionMs = options.minCompletionMs ?? DEFAULT_MIN_COMPLETION_MS;
  if (typeof body.formRenderedAt === "number" && Date.now() - body.formRenderedAt < minCompletionMs) {
    // Passive timing signal only (FORM_ARCHITECTURE.md §18.3: "Use passive
    // controls first"). Rejected the same way as a normal validation error
    // so the signal itself is not revealed to an automated client.
    return { status: 422, body: { ok: false, code: "VALIDATION_ERROR", fieldErrors: { _: ["rejected"] } } };
  }

  // Mandatory server-side Turnstile verification — happens after the cheap
  // passive checks above but strictly before any idempotency lookup or D1
  // write (CLAUDE.md "No D1 Write on Rejection"). Never trust the mere
  // presence of a client token.
  const turnstileOutcome = await verifyTurnstileToken(body.turnstileToken, { remoteIp: options.clientIp });
  if (!turnstileOutcome.ok) {
    if (turnstileOutcome.reason === "unavailable") {
      // Fail closed, but distinguish an operational Siteverify problem from
      // an actual visitor verification failure (CLAUDE.md "Fail Closed").
      return { status: 503, body: { ok: false, code: "SERVICE_UNAVAILABLE" } };
    }
    return { status: 403, body: { ok: false, code: "VERIFICATION_FAILED" } };
  }

  // Catalog resolution — after the cheap/passive checks and Turnstile, but
  // strictly before any idempotency lookup or D1 write (same "no D1 write on
  // rejection" ordering the Turnstile check above already follows). Never
  // trust a browser-submitted product_variant_xid: every "selected" item is
  // re-resolved against DB_PUBLIC here, using the same publication-
  // eligibility rule the public Catalog routes use
  // (lib/catalog/editorial-repository.ts#resolveRfqCatalogVariant) — never a
  // live Odoo call. An item whose XID does not resolve (unknown, archived,
  // inactive, unpublished, or the wrong locale) fails the whole submission
  // with a normal validation error — the same behavior already established
  // for an unknown sample-catalog `productSlug` — rather than being silently
  // downgraded into a freeform item or persisted with fabricated data
  // (docs/CATALOG_RFQ_INTEGRATION.md §Invalid/stale XID).
  const itemRecords: RfqItemRecord[] = [];
  const catalogFieldErrors: Record<string, string[]> = {};
  for (const [index, item] of result.value.items.entries()) {
    const unitInput = { code: item.unit, label: RFQ_UOM_LABELS[result.value.locale][item.unit] };
    if (item.catalogVariantXid) {
      const selection = await resolveRfqCatalogVariant(item.catalogVariantXid, result.value.locale);
      if (!selection) {
        (catalogFieldErrors[`items[${index}].catalogVariantXid`] ??= []).push("unavailable");
        continue;
      }
      // Launch UoM policy (docs/RFQ_LAUNCH_UOM_ALIGNMENT.md) — Stage F,
      // the group-specific half `lib/rfq/validation.ts` cannot check on its
      // own (it has no DB_PUBLIC access). Rejected identically to an
      // unresolvable xid: the whole submission fails before any D1 write,
      // never a partial/silently-corrected persist.
      if (!isUomAllowedForCatalogGroup(selection.groupCode, item.unit)) {
        (catalogFieldErrors[`items[${index}].unit`] ??= []).push("unsupported_for_product");
        continue;
      }
      itemRecords.push(
        buildCatalogItemRecord(
          selection,
          { quantityText: item.quantityText, quantityValue: item.quantityValue, quantityScale: item.quantityScale },
          item.description,
          unitInput,
          item.lengthMm,
        ),
      );
    } else {
      // The Custom-item Launch restriction (kg/ton only) was already
      // enforced format-side in lib/rfq/validation.ts (no DB access
      // needed for it) — item.unit is guaranteed allowed here.
      itemRecords.push(
        buildFreeformItemRecord(
          {
            productRef: item.productRef,
            productLabel: item.productLabel,
            categoryLabel: item.categoryLabel,
            freeformTitle: item.freeformTitle,
            sizeText: item.sizeText,
            quantityText: item.quantityText,
            quantityValue: item.quantityValue,
            quantityScale: item.quantityScale,
            description: item.description,
            lengthMm: item.lengthMm,
          },
          unitInput,
        ),
      );
    }
  }
  if (Object.keys(catalogFieldErrors).length > 0) {
    return { status: 422, body: { ok: false, code: "VALIDATION_ERROR", fieldErrors: catalogFieldErrors } };
  }

  const idempotencyKeyHash = await hashIdempotencyKey(result.value.idempotencyKey);
  const record: RfqSubmissionRecord = { ...result.value, items: itemRecords };

  try {
    const { reference } = await createRfq(record, idempotencyKeyHash, options.correlationId);
    return { status: 201, body: { ok: true, reference, status: "received" } };
  } catch (err) {
    if (err instanceof ServiceUnavailableError) {
      return { status: 503, body: { ok: false, code: "SERVICE_UNAVAILABLE" } };
    }
    throw err;
  }
}
