import { runPiiRetention, type PiiRetentionResult } from "../rfq/pii-retention.ts";
import { sweepRfqFiles, type FileRetentionResult } from "../rfq-worker/file-retention.ts";
import type { RfqWorkerEnv } from "../rfq-worker/config.ts";
import type { FsBucket } from "./fs-bucket.ts";
import type { NodeD1 } from "./sqlite-d1.ts";

/**
 * W32 (owner decision D-IR-1, 2026-10-22): the domestic server is a BUFFER, not a store. Daily
 * (`rfq-ir.mjs maintain`, a systemd timer), three steps, each bounded:
 *
 *  1. personal fields of RFQs Odoo confirmed ≥ 30 days ago are cleared — the Worker's own lib/rfq/pii-retention.ts;
 *  2. local files past their retention are deleted — the Worker's own lib/rfq-worker/file-retention.ts against the
 *     disk bucket (30 days after Odoo confirmed them as v1.2 attachments; files that reached Odoo only as a `notes`
 *     list, i.e. are held here, 90 days after acceptance, as on R2);
 *  3. then the RFQ itself is PURGED — every row of it, its outbox/attempt rows and its IR bookkeeping — once Odoo
 *     confirmed it ≥ 30 days ago AND none of its files is still on disk.
 *
 * Nothing undelivered is ever touched: every step repeats "synced AND an Odoo reference".
 */
export const PURGE_AFTER_DAYS = 30;

export interface MaintainResult {
  pii: PiiRetentionResult;
  files: FileRetentionResult;
  purged: number;
}

export async function maintain(db: NodeD1, bucket: FsBucket, now: Date, options: { purgeAfterDays?: number; batch?: number } = {}): Promise<MaintainResult> {
  const pii = await runPiiRetention(db.asD1(), { now });
  const files = await sweepRfqFiles({ DB_OPS: db.asD1(), RFQ_FILES: bucket.asR2() } as RfqWorkerEnv, now, 200);
  const purged = purgeConfirmed(db, now, options.purgeAfterDays ?? PURGE_AFTER_DAYS, options.batch ?? 200);
  console.log(JSON.stringify({ operation: "ir.maintain", piiCleared: pii.purged, filesDeleted: files.deleted, filesFailed: files.failed, rfqsPurged: purged }));
  return { pii, files, purged };
}

export function purgeConfirmed(db: NodeD1, now: Date, days: number, batch: number): number {
  const cutoff = new Date(now.getTime() - days * 86_400_000).toISOString();
  const ids = db
    .q<{ id: string }>(
      `SELECT r.id FROM rfqs r
       WHERE r.sync_status = 'synced' AND r.odoo_rfq_reference IS NOT NULL AND r.last_synced_at IS NOT NULL AND r.last_synced_at <= ?
         AND NOT EXISTS (SELECT 1 FROM rfq_attachments a WHERE a.rfq_id = r.id AND a.upload_status = 'uploaded' AND a.deleted_at IS NULL)
       ORDER BY r.last_synced_at ASC LIMIT ?`,
      cutoff,
      batch,
    )
    .map((r) => r.id);
  const sql = db.sqlite;
  let purged = 0;
  for (const id of ids) {
    sql.exec("BEGIN IMMEDIATE");
    try {
      // integration_attempts cascade from integration_outbox; contacts/items/history/attachments/IR rows from rfqs.
      sql.prepare(`DELETE FROM integration_outbox WHERE aggregate_type = 'rfq' AND aggregate_id = ?`).run(id);
      sql.prepare(`DELETE FROM rfq_attachment_access_log WHERE rfq_id = ?`).run(id);
      sql.prepare(`DELETE FROM rfq_admin_actions WHERE rfq_id = ?`).run(id);
      const r = sql
        .prepare(`DELETE FROM rfqs WHERE id = ? AND sync_status = 'synced' AND odoo_rfq_reference IS NOT NULL AND last_synced_at <= ?`)
        .run(id, cutoff);
      if (Number(r.changes) !== 1) throw new Error("row changed under the purge");
      sql.exec("COMMIT");
      purged++;
    } catch {
      sql.exec("ROLLBACK");
    }
  }
  return purged;
}
