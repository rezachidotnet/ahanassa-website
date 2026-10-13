import { ulid } from "./ulid.ts";
import { generateRfqReference } from "./reference.ts";
import { buildRfqCreatedEvent } from "../queue/outbox-event.ts";
import type { OdooSyncEvent } from "../queue/types.ts";
import type { RfqSubmissionRecord } from "./types.ts";

/**
 * The transactional RFQ write (architecture V1.1 §6.1 step 4): RFQ header,
 * contact snapshot, item lines, initial status-history row and the outbox
 * event in ONE D1 batch — D1 runs a batch as a single transaction, so an
 * accepted request can never leave a partial record. The caller answers
 * success only after this resolves.
 *
 * Pure with respect to the runtime: the database is passed in (no
 * `cloudflare:workers` import), so the legacy SSR route
 * (lib/rfq/repository.ts) and the standalone RFQ Worker share this code and
 * it is testable against SQLite.
 *
 * `v11` (RFQ Worker, migrations 0006) adds: the payload fingerprint (same
 * key + different payload -> `conflict`), the catalog snapshot version, the
 * per-line `unpublished_at_receipt` flag, and concurrent same-key handling —
 * a request that loses the race on the idempotency unique index returns the
 * winner's result (replay or conflict), never an error. Without `v11` the SQL
 * is exactly the pre-V1.1 SQL.
 */
export interface IntakeV11Options {
  payloadFingerprint: string;
  catalogSnapshotVersion: string | null;
  /** Zero-based item indexes whose variant was found only in the submitted (not the active) snapshot. */
  unpublishedLineIndexes?: ReadonlySet<number>;
  /** D-RFQ-FILE: files declared with the request (already policy-checked). Their bytes arrive later (lib/rfq-worker/attachments.ts). */
  attachments?: readonly DeclaredAttachment[];
}

export interface DeclaredAttachment {
  /** 1-based position in the request; part of the R2 key. */
  slot: number;
  originalFilename: string;
  extension: string;
  mimeDeclared: string;
  byteSize: number;
}

/**
 * How long delivery to Odoo waits for declared files. The upload handler
 * releases the RFQ as soon as no file is pending; after this, the delivery
 * marks what is still missing as not received (lib/rfq-worker/delivery.ts).
 */
export const ATTACHMENT_WAIT_MS = 10 * 60 * 1000;

/**
 * R2 retention of an RFQ file (owner decision 2026-10-13): 90 days after the
 * RFQ was accepted, shortened to 30 days after Odoo confirmed the file as a
 * contract-v1.2 attachment (lib/rfq-worker/delivery.ts). The RFQ Worker cron
 * deletes due objects (lib/rfq-worker/file-retention.ts).
 */
export const ATTACHMENT_RETENTION_UNCONFIRMED_DAYS = 90;
export const ATTACHMENT_RETENTION_CONFIRMED_DAYS = 30;
export const addDays = (iso: string, days: number) => new Date(Date.parse(iso) + days * 86_400_000).toISOString();

/** Private R2 key of one declared file — keyed by the RFQ tracking number, never by the customer's filename. The `rfq-files/` prefix is what Odoo contract v1.2 accepts. */
export const attachmentObjectKey = (reference: string, slot: number, extension: string) => `rfq-files/${reference}/${slot}.${extension}`;

export interface PersistRfqResult {
  reference: string;
  /** True when this call created the RFQ; false for a replay or conflict. */
  created: boolean;
  /** Same idempotency key, different payload fingerprint (v11 only). */
  conflict?: boolean;
  rfqId?: string;
  event?: OdooSyncEvent;
}

const MAX_REFERENCE_RETRIES = 5;

export function isUniqueConstraintError(err: unknown): boolean {
  const message = err instanceof Error ? err.message : String(err);
  return /UNIQUE constraint failed/i.test(message);
}

export async function persistRfq(
  db: D1Database,
  input: RfqSubmissionRecord,
  idempotencyKeyHash: string,
  correlationId: string,
  v11?: IntakeV11Options,
  now: () => Date = () => new Date(),
): Promise<PersistRfqResult> {
  const findExisting = async (): Promise<PersistRfqResult | null> => {
    const row = await db
      .prepare(v11 ? `SELECT reference_number, payload_fingerprint FROM rfqs WHERE idempotency_key_hash = ?` : `SELECT reference_number FROM rfqs WHERE idempotency_key_hash = ?`)
      .bind(idempotencyKeyHash)
      .first<{ reference_number: string; payload_fingerprint?: string | null }>();
    if (!row) return null;
    if (v11 && row.payload_fingerprint !== v11.payloadFingerprint) return { reference: row.reference_number, created: false, conflict: true };
    return { reference: row.reference_number, created: false };
  };

  const existing = await findExisting();
  if (existing) return existing;

  const rfqId = ulid();
  const acceptedAt = now().toISOString();
  const { event, row: outboxRow } = buildRfqCreatedEvent(rfqId, correlationId, acceptedAt);
  const attachments = v11?.attachments ?? [];
  if (attachments.length) outboxRow.availableAt = new Date(Date.parse(acceptedAt) + ATTACHMENT_WAIT_MS).toISOString();

  let reference = generateRfqReference();
  for (let attempt = 1; ; attempt++) {
    const rfqInsert = v11
      ? db
          .prepare(
            `INSERT INTO rfqs (
              id, reference_number, idempotency_key_hash, status, locale, submission_method,
              company_name, project_name, project_city, message, item_count, attachment_count,
              source_channel, sync_status, sync_version, submitted_at, created_at, updated_at,
              payload_fingerprint, catalog_snapshot_version
            ) VALUES (?, ?, ?, 'received', ?, ?, ?, NULL, ?, ?, ?, ?, 'website', 'pending', 0, ?, ?, ?, ?, ?)`,
          )
          .bind(rfqId, reference, idempotencyKeyHash, input.locale, !attachments.length ? "structured" : input.items.length ? "mixed" : "attachment", input.companyName, input.deliveryLocation, input.message, input.items.length, attachments.length, acceptedAt, acceptedAt, acceptedAt, v11.payloadFingerprint, v11.catalogSnapshotVersion)
      : db
          .prepare(
            `INSERT INTO rfqs (
              id, reference_number, idempotency_key_hash, status, locale, submission_method,
              company_name, project_name, project_city, message, item_count, attachment_count,
              source_channel, sync_status, sync_version, submitted_at, created_at, updated_at
            ) VALUES (?, ?, ?, 'received', ?, 'structured', ?, NULL, ?, ?, ?, 0, 'website', 'pending', 0, ?, ?, ?)`,
          )
          .bind(rfqId, reference, idempotencyKeyHash, input.locale, input.companyName, input.deliveryLocation, input.message, input.items.length, acceptedAt, acceptedAt, acceptedAt);

    const itemInserts = input.items.map((item, index) => {
      const values = [
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
      ];
      const columns = `id, rfq_id, line_number, source, category_ref, product_ref, variant_ref, unit_ref,
                category_label, product_label, variant_label, unit_label, freeform_title, size_text,
                quantity_text, quantity_value, quantity_scale, description, sku_snapshot, length_mm, resolution_status, created_at, updated_at`;
      return v11
        ? db
            .prepare(`INSERT INTO rfq_items (${columns}, unpublished_at_receipt) VALUES (${values.map(() => "?").join(", ")}, 'not_applicable', ?, ?, ?)`)
            .bind(...values, acceptedAt, acceptedAt, v11.unpublishedLineIndexes?.has(index) ? 1 : 0)
        : db.prepare(`INSERT INTO rfq_items (${columns}) VALUES (${values.map(() => "?").join(", ")}, 'not_applicable', ?, ?)`).bind(...values, acceptedAt, acceptedAt);
    });

    const attachmentInserts = attachments.map((a) =>
      db
        .prepare(
          `INSERT INTO rfq_attachments (id, rfq_id, slot, object_key, original_filename, extension, mime_declared, byte_size, upload_status, scan_status, retention_until, created_at, updated_at)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'pending', 'not_configured', ?, ?, ?)`,
        )
        .bind(ulid(), rfqId, a.slot, attachmentObjectKey(reference, a.slot, a.extension), a.originalFilename, a.extension, a.mimeDeclared, a.byteSize, addDays(acceptedAt, ATTACHMENT_RETENTION_UNCONFIRMED_DAYS), acceptedAt, acceptedAt),
    );

    try {
      await db.batch([
        rfqInsert,
        db
          .prepare(
            `INSERT INTO rfq_contacts (
              rfq_id, full_name, job_title, phone_iso2, phone_country_code, phone_national, phone_e164,
              email_normalized, country_code, city, preferred_contact_method, created_at, updated_at
            ) VALUES (?, ?, NULL, ?, ?, ?, ?, ?, NULL, NULL, NULL, ?, ?)`,
          )
          .bind(rfqId, input.fullName, input.phoneIso2, input.phoneCallingCode, input.phoneNational, input.phoneE164, input.email, acceptedAt, acceptedAt),
        ...itemInserts,
        ...attachmentInserts,
        db
          .prepare(
            `INSERT INTO rfq_status_history (id, rfq_id, previous_status, new_status, actor_type, actor_ref, reason_code, note, correlation_id, created_at)
             VALUES (?, ?, NULL, 'received', 'system', 'api:/api/rfqs', 'submission_accepted', NULL, ?, ?)`,
          )
          .bind(ulid(), rfqId, correlationId, acceptedAt),
        db
          .prepare(
            `INSERT INTO integration_outbox (
              event_id, aggregate_type, aggregate_id, aggregate_version, event_type, schema_version,
              correlation_id, payload_json, status, attempt_count, available_at, created_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'pending', 0, ?, ?)`,
          )
          .bind(outboxRow.eventId, outboxRow.aggregateType, outboxRow.aggregateId, outboxRow.aggregateVersion, outboxRow.eventType, outboxRow.schemaVersion, outboxRow.correlationId, outboxRow.payloadJson, outboxRow.availableAt, outboxRow.createdAt),
      ]);
      return { reference, created: true, rfqId, event };
    } catch (err) {
      if (!isUniqueConstraintError(err)) throw err;
      // v11: a concurrent request with the same idempotency key won the race —
      // answer with its result (replay or conflict), never a 500 (architecture
      // §6.5). D1 does not always name the violated index, so the row itself
      // is the test: if one now exists for this key, it is the winner.
      if (v11) {
        const winner = await findExisting();
        if (winner) return winner;
      }
      // Otherwise it was a reference-number collision: retry with a new reference.
      if (attempt >= MAX_REFERENCE_RETRIES) throw err;
      reference = generateRfqReference();
    }
  }
}
