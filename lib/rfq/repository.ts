import { getOpsDb } from "@/lib/db/ops";
import { ulid } from "@/lib/rfq/ulid";
import { generateRfqReference } from "@/lib/rfq/reference";
import { buildRfqCreatedEvent, tryPublishOutboxEvent } from "@/lib/queue/outbox";
import type { RfqSubmissionRecord } from "@/lib/rfq/types";

type ValidatedRfq = RfqSubmissionRecord;

export interface CreateRfqResult {
  reference: string;
  /** True when this call created a new RFQ; false when an existing one with the same idempotency key was found. */
  created: boolean;
}

const MAX_REFERENCE_RETRIES = 5;

/**
 * Atomically persists the RFQ header, contact snapshot, item lines, initial
 * status-history entry, and the outbox event in one D1 batch
 * (01-sources/TECHNICAL_ARCHITECTURE.md §12.3: "Success is acknowledged
 * only after RFQ, items, and outbox event are durably written"). D1's
 * `batch()` runs all statements in a single implicit transaction — an
 * accepted request can never leave a partial item list.
 *
 * Idempotent: looks up `idempotency_key_hash` first; a repeated valid
 * request with the same key returns the already-created reference instead
 * of inserting again.
 */
export async function createRfq(
  input: ValidatedRfq,
  idempotencyKeyHash: string,
  correlationId: string,
): Promise<CreateRfqResult> {
  const db = getOpsDb();

  const existing = await db
    .prepare(`SELECT reference_number FROM rfqs WHERE idempotency_key_hash = ?`)
    .bind(idempotencyKeyHash)
    .first<{ reference_number: string }>();
  if (existing) {
    return { reference: existing.reference_number, created: false };
  }

  const rfqId = ulid();
  const now = new Date().toISOString();
  const { event, row: outboxRow } = buildRfqCreatedEvent(rfqId, correlationId);

  let reference = generateRfqReference();
  let attempt = 0;

  // Reference collisions are astronomically unlikely (see lib/rfq/reference.ts)
  // but the unique constraint is still authoritative — retry on conflict
  // rather than trusting probability alone.
  for (;;) {
    try {
      await db.batch([
        db
          .prepare(
            `INSERT INTO rfqs (
              id, reference_number, idempotency_key_hash, status, locale, submission_method,
              company_name, project_name, project_city, message, item_count, attachment_count,
              source_channel, sync_status, sync_version, submitted_at, created_at, updated_at
            ) VALUES (?, ?, ?, 'received', ?, 'structured', ?, NULL, ?, ?, ?, 0, 'website', 'pending', 0, ?, ?, ?)`,
          )
          .bind(
            rfqId,
            reference,
            idempotencyKeyHash,
            input.locale,
            input.companyName,
            input.deliveryLocation,
            input.message,
            input.items.length,
            now,
            now,
            now,
          ),
        db
          .prepare(
            `INSERT INTO rfq_contacts (
              rfq_id, full_name, job_title, phone_iso2, phone_country_code, phone_national, phone_e164,
              email_normalized, country_code, city, preferred_contact_method, created_at, updated_at
            ) VALUES (?, ?, NULL, ?, ?, ?, ?, ?, NULL, NULL, NULL, ?, ?)`,
          )
          .bind(rfqId, input.fullName, input.phoneIso2, input.phoneCallingCode, input.phoneNational, input.phoneE164, input.email, now, now),
        ...input.items.map((item, index) =>
          db
            .prepare(
              `INSERT INTO rfq_items (
                id, rfq_id, line_number, source, category_ref, product_ref, variant_ref, unit_ref,
                category_label, product_label, variant_label, unit_label, freeform_title, size_text,
                quantity_text, quantity_value, quantity_scale, description, sku_snapshot, resolution_status, created_at, updated_at
              ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'not_applicable', ?, ?)`,
            )
            .bind(
              ulid(),
              rfqId,
              index + 1,
              item.source,
              item.categoryRef,
              item.productRef,
              item.variantRef,
              item.unitRef,
              item.categoryLabel,
              item.productLabel,
              item.variantLabel,
              item.unitLabel,
              item.freeformTitle,
              item.sizeText,
              item.quantityText,
              item.quantityValue,
              item.quantityScale,
              item.description,
              item.skuSnapshot,
              now,
              now,
            ),
        ),
        db
          .prepare(
            `INSERT INTO rfq_status_history (id, rfq_id, previous_status, new_status, actor_type, actor_ref, reason_code, note, correlation_id, created_at)
             VALUES (?, ?, NULL, 'received', 'system', 'api:/api/rfqs', 'submission_accepted', NULL, ?, ?)`,
          )
          .bind(ulid(), rfqId, correlationId, now),
        db
          .prepare(
            `INSERT INTO integration_outbox (
              event_id, aggregate_type, aggregate_id, aggregate_version, event_type, schema_version,
              correlation_id, payload_json, status, attempt_count, available_at, created_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'pending', 0, ?, ?)`,
          )
          .bind(
            outboxRow.eventId,
            outboxRow.aggregateType,
            outboxRow.aggregateId,
            outboxRow.aggregateVersion,
            outboxRow.eventType,
            outboxRow.schemaVersion,
            outboxRow.correlationId,
            outboxRow.payloadJson,
            outboxRow.availableAt,
            outboxRow.createdAt,
          ),
      ]);
      break;
    } catch (err) {
      attempt++;
      if (isUniqueConstraintError(err) && attempt < MAX_REFERENCE_RETRIES) {
        reference = generateRfqReference();
        continue;
      }
      throw err;
    }
  }

  // Fast-path publish, best-effort — see lib/queue/outbox.ts for why a
  // failure here does not fail the request.
  await tryPublishOutboxEvent(event);

  return { reference, created: true };
}

function isUniqueConstraintError(err: unknown): boolean {
  const message = err instanceof Error ? err.message : String(err);
  return /UNIQUE constraint failed/i.test(message);
}
