import { hashIdempotencyKey } from "@/lib/rfq/idempotency";
import { createRfq } from "@/lib/rfq/repository";
import { validateRfqSubmission } from "@/lib/rfq/validation";
import { buildCatalogItemRecord, buildFreeformItemRecord } from "@/lib/rfq/catalog-preselection";
import { RFQ_UOM_LABELS } from "@/lib/rfq/uom";
import { isUomAllowedForCatalogGroup } from "@/lib/rfq/uom-policy";
import type { RfqItemRecord, RfqResponse, RfqSubmissionRecord } from "@/lib/rfq/types";
import { ServiceUnavailableError, getOpsDb } from "@/lib/db/ops";
import { verifyTurnstileToken } from "@/lib/security/turnstile";
import { resolveVariantsFromIndex } from "./variant-index";

/**
 * Spike S1 — standalone RFQ submission service. Same order and the same
 * shared modules as lib/rfq/service.ts (validation, honeypot/timing,
 * Turnstile, UoM policy, record builders, idempotency hash, the transactional
 * createRfq batch); differences, all from architecture V1.1-RC1 §6:
 *   - variants are resolved with ONE query against rfq_variant_index for the
 *     submitted catalog snapshot version (not N live DB_PUBLIC lookups);
 *   - a payload fingerprint is stored; same key + different payload -> 409;
 *   - a replay answers 200 with the original reference (created -> 201).
 */
const MIN_COMPLETION_MS = 1500;
const SNAPSHOT_VERSION_PATTERN = /^snap-[0-9a-f]{16}$/;

type SpikeResponse = RfqResponse | { ok: false; code: "IDEMPOTENCY_CONFLICT" };

function stableStringify(value: unknown): string {
  if (value === null || typeof value !== "object") return JSON.stringify(value) ?? "null";
  if (Array.isArray(value)) return `[${value.map(stableStringify).join(",")}]`;
  const obj = value as Record<string, unknown>;
  return `{${Object.keys(obj)
    .filter((k) => obj[k] !== undefined)
    .sort()
    .map((k) => `${JSON.stringify(k)}:${stableStringify(obj[k])}`)
    .join(",")}}`;
}

async function sha256Hex(text: string): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(text));
  return [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

export async function spikeSubmitRfq(rawBody: unknown, options: { correlationId: string; clientIp?: string }): Promise<{ status: number; body: SpikeResponse }> {
  const result = validateRfqSubmission(rawBody);
  if (!result.ok || !result.value) {
    return { status: 422, body: { ok: false, code: "VALIDATION_ERROR", fieldErrors: result.fieldErrors } };
  }
  const body = rawBody as Record<string, unknown>;
  if (typeof body.formRenderedAt === "number" && Date.now() - body.formRenderedAt < MIN_COMPLETION_MS) {
    return { status: 422, body: { ok: false, code: "VALIDATION_ERROR", fieldErrors: { _: ["rejected"] } } };
  }
  const snapshotVersion = typeof body.catalogSnapshotVersion === "string" && SNAPSHOT_VERSION_PATTERN.test(body.catalogSnapshotVersion) ? body.catalogSnapshotVersion : null;

  const turnstileOutcome = await verifyTurnstileToken(body.turnstileToken, { remoteIp: options.clientIp });
  if (!turnstileOutcome.ok) {
    if (turnstileOutcome.reason === "unavailable") return { status: 503, body: { ok: false, code: "SERVICE_UNAVAILABLE" } };
    return { status: 403, body: { ok: false, code: "VERIFICATION_FAILED" } };
  }

  let db: D1Database;
  try {
    db = getOpsDb();
  } catch (err) {
    if (err instanceof ServiceUnavailableError) return { status: 503, body: { ok: false, code: "SERVICE_UNAVAILABLE" } };
    throw err;
  }

  const locale = result.value.locale;
  const xids = result.value.items.map((i) => i.catalogVariantXid).filter((x): x is string => Boolean(x));
  const resolved = await resolveVariantsFromIndex(db, locale, xids, snapshotVersion);

  const itemRecords: RfqItemRecord[] = [];
  const fieldErrors: Record<string, string[]> = {};
  for (const [index, item] of result.value.items.entries()) {
    const unitInput = { code: item.unit, label: RFQ_UOM_LABELS[locale][item.unit] };
    if (item.catalogVariantXid) {
      const hit = resolved.get(item.catalogVariantXid);
      if (!hit) {
        (fieldErrors[`items[${index}].catalogVariantXid`] ??= []).push("unavailable");
        continue;
      }
      if (!isUomAllowedForCatalogGroup(hit.selection.groupCode, item.unit)) {
        (fieldErrors[`items[${index}].unit`] ??= []).push("unsupported_for_product");
        continue;
      }
      itemRecords.push(
        buildCatalogItemRecord(hit.selection, { quantityText: item.quantityText, quantityValue: item.quantityValue, quantityScale: item.quantityScale }, item.description, unitInput, item.lengthMm),
      );
    } else {
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
  if (Object.keys(fieldErrors).length > 0) return { status: 422, body: { ok: false, code: "VALIDATION_ERROR", fieldErrors } };

  const { idempotencyKey, ...normalized } = result.value;
  const payloadFingerprint = await sha256Hex(stableStringify({ ...normalized, catalogSnapshotVersion: snapshotVersion }));
  const idempotencyKeyHash = await hashIdempotencyKey(idempotencyKey);
  const record: RfqSubmissionRecord = { ...result.value, items: itemRecords };

  try {
    const created = await createRfq(record, idempotencyKeyHash, options.correlationId, { payloadFingerprint, catalogSnapshotVersion: snapshotVersion, skipQueuePublish: true });
    if (created.conflict) return { status: 409, body: { ok: false, code: "IDEMPOTENCY_CONFLICT" } };
    return { status: created.created ? 201 : 200, body: { ok: true, reference: created.reference, status: "received" } };
  } catch (err) {
    if (err instanceof ServiceUnavailableError) return { status: 503, body: { ok: false, code: "SERVICE_UNAVAILABLE" } };
    throw err;
  }
}
