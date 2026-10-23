import fs from "node:fs";
import type { NodeD1 } from "./sqlite-d1.ts";
import type { BaleSend } from "./bale.ts";

/**
 * W32 (W29 P2 §3.7): the domestic intake's health — `rfq-ir.mjs health` (systemd timer, every 5 min) writes
 * status.json and sends STATE-CHANGE alerts to the staff Bale group (one message when a condition starts, one when it
 * clears; never a repeat every 5 minutes). Numbers and condition names only — no personal data.
 *
 * `GET /healthz` on the API host answers the public subset (`ok`, `outbox_due`, `oldest_due_min`) for the external
 * ops-health check.
 */
export interface HealthInput {
  db: NodeD1;
  now: Date;
  intakeUp: boolean;
  /** ms since the forwarder's last loop (heartbeat file), null = never. */
  forwarderAgeMs: number | null;
  diskFreeRatio: number | null;
}

export interface HealthStatus {
  checked_at: string;
  ok: boolean;
  intake_up: boolean;
  forwarder_alive: boolean;
  outbox_due: number;
  oldest_due_min: number | null;
  manual_review: number;
  odoo_auth_failing: boolean;
  files_waiting_for_r2: number;
  disk_free_ratio: number | null;
  conditions: string[];
}

export const LIMITS = { oldestDueMin: 60, forwarderStaleMs: 5 * 60_000, r2StuckMin: 30, diskFreeMin: 0.25 };

/** Undelivered RFQs owned by the automatic path, and how old the oldest one is. */
export function outboxDue(db: NodeD1, now: Date): { due: number; oldestMin: number | null } {
  const row = db.q<{ n: number; oldest: string | null }>(
    `SELECT count(*) AS n, MIN(submitted_at) AS oldest FROM rfqs WHERE odoo_rfq_reference IS NULL AND sync_status IN ('pending', 'queued', 'syncing', 'retry')`,
  )[0];
  return { due: Number(row?.n ?? 0), oldestMin: row?.oldest ? Math.floor((now.getTime() - Date.parse(row.oldest)) / 60_000) : null };
}

export function healthStatus(input: HealthInput): HealthStatus {
  const { db, now } = input;
  const { due, oldestMin } = outboxDue(db, now);
  const manual = Number(db.q<{ n: number }>(`SELECT count(*) AS n FROM rfqs WHERE sync_status = 'manual_review'`)[0]?.n ?? 0);
  const auth = db.q<{ n: number }>(`SELECT count(*) AS n FROM rfqs WHERE odoo_rfq_reference IS NULL AND (last_sync_error_code LIKE 'ODOO_401%' OR last_sync_error_code LIKE 'ODOO_403%')`)[0];
  const stuckBefore = new Date(now.getTime() - LIMITS.r2StuckMin * 60_000).toISOString();
  const r2 = Number(db.q<{ n: number }>(`SELECT count(*) AS n FROM ir_file_remote WHERE verified_at IS NULL AND first_attempt_at <= ?`, stuckBefore)[0]?.n ?? 0);
  const forwarderAlive = input.forwarderAgeMs !== null && input.forwarderAgeMs < LIMITS.forwarderStaleMs;
  const conditions: string[] = [];
  if (!input.intakeUp) conditions.push("intake_down");
  if (!forwarderAlive) conditions.push("forwarder_down");
  if (oldestMin !== null && oldestMin > LIMITS.oldestDueMin) conditions.push("outbox_old");
  if (manual > 0) conditions.push("manual_review");
  if (Number(auth?.n ?? 0) > 0) conditions.push("odoo_auth");
  if (r2 > 0) conditions.push("r2_unreachable");
  if (input.diskFreeRatio !== null && input.diskFreeRatio < LIMITS.diskFreeMin) conditions.push("disk_low");
  return {
    checked_at: now.toISOString(),
    ok: conditions.length === 0,
    intake_up: input.intakeUp,
    forwarder_alive: forwarderAlive,
    outbox_due: due,
    oldest_due_min: oldestMin,
    manual_review: manual,
    odoo_auth_failing: conditions.includes("odoo_auth"),
    files_waiting_for_r2: r2,
    disk_free_ratio: input.diskFreeRatio,
    conditions,
  };
}

const TEXT: Record<string, string> = {
  intake_down: "intake service down (form submits fail)",
  forwarder_down: "forwarder not running (RFQs are stored but not sent to Odoo)",
  outbox_old: "an RFQ has waited more than 60 min for Odoo (international link or Odoo down?)",
  manual_review: "RFQ(s) in MANUAL_REVIEW — open the domestic admin view",
  odoo_auth: "Odoo answers 401/403 — the iransrv bearer token is wrong or revoked",
  r2_unreachable: "file copy to R2 failing for 30+ min (files will go to Odoo as a notes list after IR_R2_WAIT_MS)",
  disk_low: "disk under 25 % free",
};

/** Sends a Bale message for every condition that started or cleared since the last run. Returns the messages sent. */
export async function alertOnChange(db: NodeD1, status: HealthStatus, env: string, notify: BaleSend | undefined): Promise<string[]> {
  const sent: string[] = [];
  const previous = new Map(db.q<{ key: string; state: string }>(`SELECT key, state FROM ir_alert_state`).map((r) => [r.key, r.state]));
  for (const key of Object.keys(TEXT)) {
    const now = status.conditions.includes(key) ? "alert" : "ok";
    const was = previous.get(key) ?? "ok";
    if (now === was) continue;
    const text = `ahanassa RFQ (iransrv ${env}): ${now === "alert" ? "ALERT" : "cleared"} — ${TEXT[key]}. due=${status.outbox_due}, oldest=${status.oldest_due_min ?? "-"} min.`;
    const ok = notify ? await notify(text) : false;
    // Recorded only when sent, so an alert that could not be delivered is retried on the next run.
    if (ok || !notify) {
      db.sqlite.prepare(`INSERT INTO ir_alert_state (key, state, since, notified_at) VALUES (?, ?, ?, ?) ON CONFLICT(key) DO UPDATE SET state = excluded.state, since = excluded.since, notified_at = excluded.notified_at`).run(key, now, status.checked_at, ok ? status.checked_at : null);
      if (ok) sent.push(text);
    }
  }
  return sent;
}

export function diskFreeRatio(dir: string): number | null {
  try {
    const s = fs.statfsSync(dir);
    return s.bavail / s.blocks;
  } catch {
    return null;
  }
}
