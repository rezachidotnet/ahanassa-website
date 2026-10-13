import type { RfqWorkerEnv } from "./config.ts";

/**
 * R2 retention of RFQ files (owner decision 2026-10-13; docs/RFQ_FILE_UPLOAD.md).
 *
 * `rfq_attachments.retention_until` is set when the RFQ is accepted (+90 days)
 * and shortened when Odoo confirms the file as a contract-v1.2 attachment
 * (+30 days from then; lib/rfq-worker/delivery.ts). This sweep runs in the
 * RFQ Worker's existing cron (no new trigger — the account is at 5/5) and
 * deletes the due objects, a bounded batch per run.
 *
 * Only the object goes: the row keeps its upload_status (the frozen list sent
 * to Odoo never changes) and gets `deleted_at`; the admin download then
 * answers 410. A key that is already gone (a refused or failed upload) is a
 * harmless delete. A failed delete leaves the row due for the next run.
 */
export const FILE_RETENTION_BATCH = 20;

export interface FileRetentionResult {
  due: number;
  deleted: number;
  failed: number;
}

export async function sweepRfqFiles(env: RfqWorkerEnv, now: Date, batch = FILE_RETENTION_BATCH): Promise<FileRetentionResult> {
  // The bucket binding alone decides: an environment that once stored files keeps deleting them even with the flag off.
  if (!env.RFQ_FILES) return { due: 0, deleted: 0, failed: 0 };
  const at = now.toISOString();
  const { results } = await env.DB_OPS.prepare(
    `SELECT id, object_key FROM rfq_attachments WHERE deleted_at IS NULL AND retention_until IS NOT NULL AND retention_until <= ? ORDER BY retention_until ASC LIMIT ?`,
  )
    .bind(at, batch)
    .all<{ id: string; object_key: string }>();
  let deleted = 0;
  let failed = 0;
  for (const row of results) {
    try {
      await env.RFQ_FILES.delete(row.object_key);
      await env.DB_OPS.prepare(`UPDATE rfq_attachments SET deleted_at = ?, updated_at = ? WHERE id = ? AND deleted_at IS NULL`).bind(at, at, row.id).run();
      deleted++;
    } catch {
      failed++;
    }
  }
  if (results.length) console.log(JSON.stringify({ operation: "rfq.file_retention", due: results.length, deleted, failed }));
  return { due: results.length, deleted, failed };
}
