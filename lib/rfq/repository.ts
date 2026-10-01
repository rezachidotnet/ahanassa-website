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
  /** Spike S1: true when the idempotency key already exists with a DIFFERENT payload fingerprint (caller answers 409). */
  conflict?: boolean;
}

/**
 * Spike S1 (architecture V1.1-RC1 §5.2/§6.5) — optional extras. When
 * `payloadFingerprint` is given, the RFQ row stores it (plus the catalog
 * snapshot version the form was built from), a replay with a different
 * fingerprint is reported as a conflict, and a concurrent same-key insert
 * that loses the race on the idempotency unique index returns the winner's
 * reference instead of failing. Without it, behaviour is unchanged.
 */
export interface CreateRfqOptions {
  payloadFingerprint?: string;
  catalogSnapshotVersion?: string | null;
  /** Spike: do not attempt the Queue fast path (the spike Worker has no Queue binding). */
  skipQueuePublish?: boolean;
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
  options: CreateRfqOptions = {},
): Promise<CreateRfqResult> {
  const db = getOpsDb();
  const withFingerprint = options.payloadFingerprint !== undefined;

  const findExisting = async (): Promise<CreateRfqResult | null> => {
    const row = await db
      .prepare(withFingerprint ? `SELECT reference_number, payload_fingerprint FROM rfqs WHERE idempotency_key_hash = ?` : `SELECT reference_number FROM rfqs WHERE idempotency_key_hash = ?`)
      .bind(idempotencyKeyHash)
      .first<{ reference_number: string; payload_fingerprint?: string | null }>();
    if (!row) return null;
    if (withFingerprint && row.payload_fingerprint !== options.payloadFingerprint) {
      return { reference: row.reference_number, created: false, conflict: true };
    }
    return { reference: row.reference_number, created: false };
  };

  const existing = await findExisting();
  if (existing) return existing;

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
        withFingerprint
          ? db
              .prepare(
                `INSERT INTO rfqs (
              id, reference_number, idempotency_key_hash, status, locale, submission_method,
              company_name, project_name, project_city, message, item_count, attachment_count,
              source_channel, sync_status, sync_version, submitted_at, created_at, updated_at,
              payload_fingerprint, catalog_snapshot_version
            ) VALUES (?, ?, ?, 'received', ?, 'structured', ?, NULL, ?, ?, ?, 0, 'website', 'pending', 0, ?, ?, ?, ?, ?)`,
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
                options.payloadFingerprint,
                options.catalogSnapshotVersion ?? null,
              )
          : db
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
                quantity_text, quantity_value, quantity_scale, description, sku_snapshot, length_mm, resolution_status, created_at, updated_at
              ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'not_applicable', ?, ?)`,
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
              item.lengthMm,
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
      // Spike S1: a concurrent request with the same idempotency key won the
      // race — answer with its result (replay or conflict), never a 500.
      if (withFingerprint && isUniqueConstraintError(err)) {
        const winner = await findExisting();
        if (winner) return winner;
      }
      if (isUniqueConstraintError(err) && attempt < MAX_REFERENCE_RETRIES) {
        reference = generateRfqReference();
        continue;
      }
      throw err;
    }
  }

  // Fast-path publish, best-effort — see lib/queue/outbox.ts for why a
  // failure here does not fail the request.
  if (!options.skipQueuePublish) await tryPublishOutboxEvent(event);

  return { reference, created: true };
}

function isUniqueConstraintError(err: unknown): boolean {
  const message = err instanceof Error ? err.message : String(err);
  return /UNIQUE constraint failed/i.test(message);
}
