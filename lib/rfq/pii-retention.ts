/**
 * Website-side PII retention (architecture V1.1 §13.4; owner decision
 * 2026-10-04, docs/OWNER_DECISIONS.md "PII"; docs/RFQ_PII_RETENTION.md).
 *
 * Odoo is the system of record and keeps customer data without a time limit.
 * DB_OPS is only a delivery buffer: once an RFQ is DELIVERED (sync_status
 * `synced` AND an Odoo reference present) for `retentionDays` [30], its
 * personal fields are cleared and the non-personal record is kept (ids,
 * reference, timestamps, snapshot version, sync status, fingerprint, the
 * catalog refs/labels and parsed quantities of its lines).
 *
 * An RFQ that is not delivered is NEVER cleared: every statement repeats the
 * delivered predicate, so a row that changed between selection and purge is
 * left alone. Runs in the CI reconciler job (not a Worker cron: the account
 * is at 5/5 triggers), one bounded batch per run, with a dry-run mode.
 *
 * Personal fields cleared:
 *   rfqs          company_name, project_name, project_city, message
 *   rfq_contacts  full_name (→ '' — NOT NULL), job_title, phone_iso2, phone_country_code,
 *                 phone_national, phone_e164, email_normalized, country_code, city,
 *                 preferred_contact_method
 *   rfq_items     customer free text: freeform_title (→ '' when present — the line CHECK
 *                 needs a non-null identity), size_text, quantity_text (→ '' — NOT NULL),
 *                 description
 * DB_OPS stores no IP address or user agent (the RFQ Worker uses the client IP only
 * as an in-memory rate-limit key), so there is nothing else to clear.
 *
 * Works on any D1Database-compatible handle: the Worker binding, the CI
 * `wrangler d1 execute` adapter (lib/rfq-worker/wrangler-d1.ts), or the
 * sqlite test double.
 */
export const PII_RETENTION_DEFAULTS = { retentionDays: 30, batch: 25, stampLimit: 500 } as const;

export interface PiiRetentionOptions {
  now: Date;
  /** Days after delivery (`last_synced_at`) before the personal fields are cleared [30]. */
  retentionDays?: number;
  /** Max RFQs cleared per run [25]. */
  batch?: number;
  /** Max rows whose retention_until is written per run [500]. */
  stampLimit?: number;
  /** Count only; write nothing. */
  dryRun?: boolean;
}

export interface PiiRetentionResult {
  dryRun: boolean;
  retentionDays: number;
  batch: number;
  /** Delivered rows without retention_until before this run (would be / were stamped, up to stampLimit). */
  unstamped: number;
  stamped: number;
  /** Delivered, not yet cleared, retention_until ≤ now — before this run. */
  due: number;
  /** Cleared in this run (dry run: would be cleared). */
  purged: number;
  /** Still due after this run (left for the next runs). */
  remainingDue: number;
  /** Rows already cleared before this run. */
  alreadyPurged: number;
  /** Rows never eligible: not delivered (pending/queued/syncing/retry/failed/manual_review or no Odoo reference). */
  undelivered: number;
}

const DELIVERED = "sync_status = 'synced' AND odoo_rfq_reference IS NOT NULL";
const ISO = "'%Y-%m-%dT%H:%M:%fZ'";
const retentionExpr = (days: number) => `strftime(${ISO}, last_synced_at, '+${days} days')`;

function checkInt(name: string, value: number, min: number): number {
  if (!Number.isInteger(value) || value < min) throw new Error(`${name} must be an integer ≥ ${min} (got ${value})`);
  return value;
}

export async function runPiiRetention(db: D1Database, options: PiiRetentionOptions): Promise<PiiRetentionResult> {
  const retentionDays = checkInt("retentionDays", options.retentionDays ?? PII_RETENTION_DEFAULTS.retentionDays, 1);
  const batch = checkInt("batch", options.batch ?? PII_RETENTION_DEFAULTS.batch, 1);
  const stampLimit = checkInt("stampLimit", options.stampLimit ?? PII_RETENTION_DEFAULTS.stampLimit, 1);
  const dryRun = options.dryRun ?? false;
  const now = options.now.toISOString();
  // Due as of `now`; an unstamped delivered row counts with the retention_until it is about to get.
  const dueWhere = `${DELIVERED} AND pii_purged_at IS NULL AND last_synced_at IS NOT NULL AND COALESCE(retention_until, ${retentionExpr(retentionDays)}) <= ?`;

  const counts = await db
    .prepare(
      `SELECT
         SUM(CASE WHEN ${DELIVERED} AND retention_until IS NULL AND last_synced_at IS NOT NULL THEN 1 ELSE 0 END) AS unstamped,
         SUM(CASE WHEN ${dueWhere} THEN 1 ELSE 0 END) AS due,
         SUM(CASE WHEN pii_purged_at IS NOT NULL THEN 1 ELSE 0 END) AS already_purged,
         SUM(CASE WHEN NOT (${DELIVERED}) THEN 1 ELSE 0 END) AS undelivered
       FROM rfqs`,
    )
    .bind(now)
    .first<{ unstamped: number | null; due: number | null; already_purged: number | null; undelivered: number | null }>();
  const unstamped = Number(counts?.unstamped ?? 0);
  const due = Number(counts?.due ?? 0);

  const ids = (
    await db
      .prepare(`SELECT id FROM rfqs WHERE ${dueWhere} ORDER BY COALESCE(retention_until, ${retentionExpr(retentionDays)}) ASC, id ASC LIMIT ?`)
      .bind(now, batch)
      .all<{ id: string }>()
  ).results.map((r) => r.id);

  const stamped = Math.min(unstamped, stampLimit);
  let purged = ids.length;
  if (!dryRun) {
    // 1. retention_until for delivered rows that have none (bounded).
    if (unstamped) {
      await db
        .prepare(
          `UPDATE rfqs SET retention_until = ${retentionExpr(retentionDays)}
           WHERE id IN (SELECT id FROM rfqs WHERE ${DELIVERED} AND retention_until IS NULL AND last_synced_at IS NOT NULL ORDER BY last_synced_at ASC, id ASC LIMIT ?)`,
        )
        .bind(stampLimit)
        .run();
    }
    // 2. Clear one batch atomically. Children first: their guard needs pii_purged_at IS NULL on the parent.
    if (ids.length) {
      const list = ids.map(() => "?").join(", ");
      const guard = `rfq_id IN (SELECT id FROM rfqs WHERE id IN (${list}) AND ${DELIVERED} AND pii_purged_at IS NULL)`;
      await db.batch([
        db
          .prepare(
            `UPDATE rfq_contacts SET full_name = '', job_title = NULL, phone_iso2 = NULL, phone_country_code = NULL, phone_national = NULL,
               phone_e164 = NULL, email_normalized = NULL, country_code = NULL, city = NULL, preferred_contact_method = NULL
             WHERE ${guard}`,
          )
          .bind(...ids),
        db
          .prepare(
            `UPDATE rfq_items SET freeform_title = CASE WHEN freeform_title IS NULL THEN NULL ELSE '' END, size_text = NULL, quantity_text = '', description = NULL
             WHERE ${guard}`,
          )
          .bind(...ids),
        db
          .prepare(
            `UPDATE rfqs SET company_name = NULL, project_name = NULL, project_city = NULL, message = NULL,
               retention_until = COALESCE(retention_until, ${retentionExpr(retentionDays)}), pii_purged_at = ?
             WHERE id IN (${list}) AND ${DELIVERED} AND pii_purged_at IS NULL`,
          )
          .bind(now, ...ids),
      ]);
      // Count from the database, not from batch metadata (the CI adapter sends one multi-statement command).
      const done = await db
        .prepare(`SELECT COUNT(*) AS n FROM rfqs WHERE id IN (${list}) AND pii_purged_at = ?`)
        .bind(...ids, now)
        .first<{ n: number }>();
      purged = Number(done?.n ?? 0);
    }
    const left = await db.prepare(`SELECT COUNT(*) AS n FROM rfqs WHERE ${dueWhere}`).bind(now).first<{ n: number }>();
    return { dryRun, retentionDays, batch, unstamped, stamped, due, purged, remainingDue: Number(left?.n ?? 0), alreadyPurged: Number(counts?.already_purged ?? 0), undelivered: Number(counts?.undelivered ?? 0) };
  }
  return { dryRun, retentionDays, batch, unstamped, stamped, due, purged, remainingDue: due - purged, alreadyPurged: Number(counts?.already_purged ?? 0), undelivered: Number(counts?.undelivered ?? 0) };
}

export function piiRetentionSummaryMarkdown(r: PiiRetentionResult, env: string): string {
  return [
    `### PII retention (${env})${r.dryRun ? " — DRY RUN, nothing written" : ""}`,
    `- rule: delivered RFQs (Odoo reference present) are cleared ${r.retentionDays} days after delivery; Odoo keeps the data; undelivered RFQs are never cleared`,
    `- retention_until ${r.dryRun ? "would be written" : "written"}: ${r.stamped} (of ${r.unstamped} without one)`,
    `- due before this run: ${r.due}; ${r.dryRun ? "would be cleared" : "cleared"}: ${r.purged} (batch ${r.batch}); still due: ${r.remainingDue}`,
    `- already cleared earlier: ${r.alreadyPurged}; not delivered (never cleared): ${r.undelivered}`,
    "",
  ].join("\n");
}
