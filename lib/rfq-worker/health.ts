/**
 * RFQ delivery health (architecture V1.1 §15, minimal monitoring hook — W3):
 * the numbers the CI reconciler run publishes as its job summary. One query.
 *
 * "Undelivered" = accepted, not yet in Odoo, and still owned by an automatic
 * path: sync_status pending / queued / syncing / retry. manual_review is
 * counted separately (a person owns it); failed = closed by an admin.
 */
export interface DeliveryHealth {
  checkedAt: string;
  undelivered: number;
  undeliveredOver15m: number;
  undeliveredOver30m: number;
  oldestUndeliveredSubmittedAt: string | null;
  oldestUndeliveredAgeMinutes: number | null;
  retry: number;
  manualReview: number;
}

/** A non-zero count here fails the CI job (visible in GitHub) until a real alert channel exists (§19). */
export const FAIL_UNDELIVERED_OLDER_THAN_MINUTES = 30;

export async function deliveryHealth(db: D1Database, now = new Date()): Promise<DeliveryHealth> {
  const iso = (minutes: number) => new Date(now.getTime() - minutes * 60_000).toISOString();
  const row = await db
    .prepare(
      `SELECT
         SUM(CASE WHEN undelivered = 1 THEN 1 ELSE 0 END) AS undelivered,
         SUM(CASE WHEN undelivered = 1 AND submitted_at <= ? THEN 1 ELSE 0 END) AS over15,
         SUM(CASE WHEN undelivered = 1 AND submitted_at <= ? THEN 1 ELSE 0 END) AS over30,
         MIN(CASE WHEN undelivered = 1 THEN submitted_at END) AS oldest,
         SUM(CASE WHEN sync_status = 'retry' THEN 1 ELSE 0 END) AS retry,
         SUM(CASE WHEN sync_status = 'manual_review' THEN 1 ELSE 0 END) AS manual_review
       FROM (
         SELECT sync_status, submitted_at,
                CASE WHEN odoo_rfq_reference IS NULL AND sync_status IN ('pending', 'queued', 'syncing', 'retry') THEN 1 ELSE 0 END AS undelivered
         FROM rfqs WHERE deleted_at IS NULL
       )`,
    )
    .bind(iso(15), iso(FAIL_UNDELIVERED_OLDER_THAN_MINUTES))
    .first<{ undelivered: number | null; over15: number | null; over30: number | null; oldest: string | null; retry: number | null; manual_review: number | null }>();
  const oldest = row?.oldest ?? null;
  return {
    checkedAt: now.toISOString(),
    undelivered: Number(row?.undelivered ?? 0),
    undeliveredOver15m: Number(row?.over15 ?? 0),
    undeliveredOver30m: Number(row?.over30 ?? 0),
    oldestUndeliveredSubmittedAt: oldest,
    oldestUndeliveredAgeMinutes: oldest ? Math.floor((now.getTime() - Date.parse(oldest)) / 60_000) : null,
    retry: Number(row?.retry ?? 0),
    manualReview: Number(row?.manual_review ?? 0),
  };
}

export function healthSummaryMarkdown(h: DeliveryHealth, env: string, run: { attempted: number; delivered: number }): string {
  const verdict = h.undeliveredOver30m > 0 ? `❌ ${h.undeliveredOver30m} RFQ(s) undelivered for more than ${FAIL_UNDELIVERED_OLDER_THAN_MINUTES} min` : "✅ nothing undelivered for more than 30 min";
  return [
    `## RFQ delivery health — ${env}`,
    "",
    verdict,
    "",
    "| Metric | Value |",
    "|---|---|",
    `| Delivered by this run | ${run.delivered} of ${run.attempted} attempted |`,
    `| Undelivered (pending/queued/syncing/retry) | ${h.undelivered} |`,
    `| Undelivered > 15 min | ${h.undeliveredOver15m} |`,
    `| Undelivered > 30 min (fails the job) | ${h.undeliveredOver30m} |`,
    `| Oldest undelivered age | ${h.oldestUndeliveredAgeMinutes === null ? "—" : `${h.oldestUndeliveredAgeMinutes} min (submitted ${h.oldestUndeliveredSubmittedAt})`} |`,
    `| RETRY_PENDING | ${h.retry} |`,
    `| MANUAL_REVIEW | ${h.manualReview} |`,
    `| Checked at | ${h.checkedAt} |`,
    "",
  ].join("\n");
}
