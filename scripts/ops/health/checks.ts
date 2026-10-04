/**
 * Pure evaluators for the ops health checks (W6) — data in, verdict out; no I/O. run.ts gathers
 * the inputs (sources.ts), these decide, and only ALERT fails the job. WATCH and INFO are reported.
 * Inputs and outputs carry counts, ages and timestamps only — never an RFQ, contact or reference.
 */
import type { Thresholds } from "./config.ts";

export type CheckStatus = "OK" | "ALERT" | "WATCH" | "INFO";

export interface CheckResult {
  id: string;
  /** Short, stable title; an ALERT becomes the annotation title "ALERT: <title>". */
  title: string;
  value: string;
  threshold: string;
  status: CheckStatus;
  detail?: string;
}

const minutesBetween = (from: string, now: Date) => (now.getTime() - Date.parse(from)) / 60_000;
const fmtMin = (m: number) => (m < 120 ? `${m.toFixed(1)} min` : `${(m / 60).toFixed(1)} h`);

/** A data source that could not be read is an ALERT: a check that cannot see must not pass. */
export function unavailable(id: string, title: string, threshold: string, error: unknown): CheckResult {
  const message = error instanceof Error ? error.message : String(error);
  return { id, title, value: "check could not run", threshold, status: "ALERT", detail: message.slice(0, 300) };
}

// 3. Cron liveness -------------------------------------------------------------------------------

export function evaluateCronLiveness(worker: string, lastRunAt: string | null, now: Date, t: Thresholds, lookbackHours: number): CheckResult {
  const threshold = `last scheduled run ≤ ${t.cronSilentMinutes} min ago`;
  const base = { id: `cron:${worker}`, title: `cron silent — ${worker}` };
  if (!lastRunAt) return { ...base, value: `no scheduled run in ${lookbackHours} h`, threshold, status: "ALERT" };
  const age = minutesBetween(lastRunAt, now);
  return { ...base, value: `${fmtMin(age)} (last ${lastRunAt})`, threshold, status: age > t.cronSilentMinutes ? "ALERT" : "OK" };
}

// 4. Undelivered RFQs ----------------------------------------------------------------------------

export interface RfqCounts {
  undelivered: number;
  oldestUndeliveredSubmittedAt: string | null;
  terminalFailed: number;
  manualReview: number;
  retry: number;
  closedByAdmin: number;
}

/** "Undelivered" = pending/queued/syncing/retry without an Odoo reference (lib/rfq-worker/health.ts). */
export const RFQ_COUNTS_SQL = `SELECT
  SUM(CASE WHEN odoo_rfq_reference IS NULL AND sync_status IN ('pending','queued','syncing','retry') THEN 1 ELSE 0 END) AS undelivered,
  MIN(CASE WHEN odoo_rfq_reference IS NULL AND sync_status IN ('pending','queued','syncing','retry') THEN submitted_at END) AS oldest_undelivered,
  SUM(CASE WHEN sync_status = 'manual_review' OR (sync_status = 'failed' AND COALESCE(last_sync_error_code, '') <> 'CLOSED_BY_ADMIN') THEN 1 ELSE 0 END) AS terminal_failed,
  SUM(CASE WHEN sync_status = 'manual_review' THEN 1 ELSE 0 END) AS manual_review,
  SUM(CASE WHEN sync_status = 'retry' THEN 1 ELSE 0 END) AS retry,
  SUM(CASE WHEN sync_status = 'failed' AND last_sync_error_code = 'CLOSED_BY_ADMIN' THEN 1 ELSE 0 END) AS closed_by_admin
FROM rfqs WHERE deleted_at IS NULL`;

export function rfqCountsFromRow(row: Record<string, unknown> | undefined): RfqCounts {
  const n = (k: string) => Number(row?.[k] ?? 0);
  return {
    undelivered: n("undelivered"),
    oldestUndeliveredSubmittedAt: (row?.oldest_undelivered as string | null | undefined) ?? null,
    terminalFailed: n("terminal_failed"),
    manualReview: n("manual_review"),
    retry: n("retry"),
    closedByAdmin: n("closed_by_admin"),
  };
}

export function evaluateRfqs(c: RfqCounts, now: Date, t: Thresholds): CheckResult[] {
  const age = c.oldestUndeliveredSubmittedAt ? minutesBetween(c.oldestUndeliveredSubmittedAt, now) : null;
  return [
    {
      id: "rfq:undelivered",
      title: "RFQ undelivered",
      value: age === null ? "none undelivered" : `${c.undelivered} undelivered, oldest ${fmtMin(age)} (retry ${c.retry})`,
      threshold: `oldest ≤ ${t.rfqUndeliveredMaxAgeMinutes} min`,
      status: age !== null && age > t.rfqUndeliveredMaxAgeMinutes ? "ALERT" : "OK",
    },
    {
      id: "rfq:terminal",
      title: "RFQ in terminal failure",
      value: `${c.terminalFailed} (manual_review ${c.manualReview}; closed by admin ${c.closedByAdmin}, not counted)`,
      threshold: `≤ ${t.rfqTerminalFailureMax}`,
      status: c.terminalFailed > t.rfqTerminalFailureMax ? "ALERT" : "OK",
    },
  ];
}

// 5. CPU -----------------------------------------------------------------------------------------

export interface InvocationGroup {
  status: string;
  requests: number;
  cpuTimeP99Us: number;
  cpuTimeMaxUs: number;
}

export interface ScheduledRun {
  datetime: string;
  status: string;
  cpuTimeUs: number;
}

/** exceededCpu and error 1102 surface as these invocation statuses in Workers analytics. */
export const isCpuExceeded = (status: string) => /^exceeded(Cpu|Resources)$/i.test(status);

export function percentile(values: number[], p: number): number | null {
  if (values.length === 0) return null;
  const sorted = [...values].sort((a, b) => a - b);
  return sorted[Math.min(sorted.length - 1, Math.ceil((p / 100) * sorted.length) - 1)];
}

const ms = (us: number | null) => (us === null ? "—" : `${(us / 1000).toFixed(2)} ms`);

export function evaluateCpu(worker: string, groups: InvocationGroup[], scheduled: ScheduledRun[], t: Thresholds): CheckResult[] {
  const exceeded =
    groups.filter((g) => isCpuExceeded(g.status)).reduce((s, g) => s + g.requests, 0) +
    scheduled.filter((r) => isCpuExceeded(r.status)).length;
  const requests = groups.reduce((s, g) => s + g.requests, 0);
  const allMax = groups.length ? Math.max(...groups.map((g) => g.cpuTimeMaxUs)) : null;
  // Adaptive quantiles are per group; the largest group p99 is an upper bound for the whole window.
  const allP99 = groups.length ? Math.max(...groups.map((g) => g.cpuTimeP99Us)) : null;
  const cron = scheduled.map((r) => r.cpuTimeUs);
  const cronP99 = percentile(cron, 99);
  const cronMax = cron.length ? Math.max(...cron) : null;
  return [
    {
      id: `cpu:${worker}`,
      title: `exceededCpu / 1102 — ${worker}`,
      value: `${exceeded} of ${requests} invocations + ${scheduled.length} cron runs`,
      threshold: `≤ ${t.cpuExceededMax}`,
      status: exceeded > t.cpuExceededMax ? "ALERT" : "OK",
      detail: exceeded > 0 ? "r3: first exceededCpu/1102 in production starts the signed-snapshot fallback (c); 3 staging alerts in a week do too" : undefined,
    },
    {
      id: `cpu-cron:${worker}`,
      title: `cron cpuTime — ${worker}`,
      value: `p99 ${ms(cronP99)}, max ${ms(cronMax)} (${cron.length} runs)`,
      threshold: `watch > ${t.cronCpuWatchMs} ms`,
      status: cronMax !== null && cronMax > t.cronCpuWatchMs * 1000 ? "WATCH" : "INFO",
    },
    {
      id: `cpu-all:${worker}`,
      title: `all invocations cpuTime — ${worker}`,
      value: `p99 ≤ ${ms(allP99)}, max ${ms(allMax)} (${requests} invocations; fetch + cron + queue consumer)`,
      threshold: "report only",
      status: "INFO",
    },
  ];
}

// 6. Intake errors -------------------------------------------------------------------------------

export interface HttpGroup {
  status: number;
  path: string;
  method: string;
  count: number;
}

export function evaluateIntake(host: string, intakePath: string, groups: HttpGroup[], t: Thresholds): CheckResult[] {
  const s5xx = groups.filter((g) => g.status >= 500).reduce((s, g) => s + g.count, 0);
  const intake = groups.filter((g) => g.path === intakePath && g.method === "POST");
  const s4xx = intake.filter((g) => g.status === 400 || g.status === 422).reduce((s, g) => s + g.count, 0);
  const posts = intake.reduce((s, g) => s + g.count, 0);
  return [
    { id: "intake:5xx", title: `intake 5xx — ${host}`, value: `${s5xx}`, threshold: `≤ ${t.intake5xxMax}`, status: s5xx > t.intake5xxMax ? "ALERT" : "OK" },
    {
      id: "intake:4xx",
      title: `intake 400/422 — ${host}`,
      value: `${s4xx} of ${posts} POST ${intakePath}`,
      threshold: `≤ ${t.intake4xxMax}`,
      status: s4xx > t.intake4xxMax ? "ALERT" : "OK",
    },
  ];
}

// 7. Content publication -------------------------------------------------------------------------

export function evaluateContentPublish(lastSuccessAt: string | null, activeVersion: string | null, now: Date, t: Thresholds, alert = true): CheckResult {
  const threshold = `last successful publish ≤ ${t.contentPublishMaxAgeHours} h ago${alert ? "" : " (report only until W8.1)"}`;
  const base = { id: "content:publish", title: "content publish stale" };
  const active = activeVersion ? `; active_version ${activeVersion}` : "";
  const stale = alert ? "ALERT" : "INFO";
  if (!lastSuccessAt) return { ...base, value: `no successful publish found${active}`, threshold, status: stale };
  const hours = minutesBetween(lastSuccessAt, now) / 60;
  return { ...base, value: `${hours.toFixed(1)} h (${lastSuccessAt})${active}`, threshold, status: hours > t.contentPublishMaxAgeHours ? stale : "OK" };
}

// 8. Odoo reachability ---------------------------------------------------------------------------

export interface OdooProbe {
  httpStatus: number | null;
  latencyMs: number;
  error?: string;
}

export function evaluateOdoo(p: OdooProbe, t: Thresholds): CheckResult {
  const threshold = `200 within ${t.odooMaxLatencyMs / 1000} s`;
  const base = { id: "odoo:meta", title: "Odoo unreachable" };
  if (p.httpStatus === null) return { ...base, value: `no response after ${Math.round(p.latencyMs)} ms (${p.error ?? "error"})`, threshold, status: "ALERT" };
  const ok = p.httpStatus === 200 && p.latencyMs <= t.odooMaxLatencyMs;
  return { ...base, value: `HTTP ${p.httpStatus} in ${Math.round(p.latencyMs)} ms`, threshold, status: ok ? "OK" : "ALERT" };
}

// Info: CI reconciler ----------------------------------------------------------------------------

export function evaluateReconciler(lastRunAt: string | null, now: Date, t: Thresholds): CheckResult {
  const age = lastRunAt ? minutesBetween(lastRunAt, now) : null;
  return {
    id: "info:reconciler",
    title: "CI reconciler last run",
    value: age === null ? "none found" : `${fmtMin(age)} ago (${lastRunAt})`,
    threshold: `info; expected ≤ ${t.reconcilerInfoMaxAgeHours} h (GitHub schedules are best-effort)`,
    status: "INFO",
  };
}

// Window -----------------------------------------------------------------------------------------

/** Start of the analytics window: previous run start − overlap, clamped to [min, max] minutes before now. */
export function windowStart(now: Date, previousRunStartedAt: string | null, w: { minMinutes: number; maxMinutes: number; overlapMinutes: number }): Date {
  const earliest = now.getTime() - w.maxMinutes * 60_000;
  const latest = now.getTime() - w.minMinutes * 60_000;
  const wanted = previousRunStartedAt ? Date.parse(previousRunStartedAt) - w.overlapMinutes * 60_000 : latest;
  return new Date(Math.min(latest, Math.max(earliest, wanted)));
}

// Output -----------------------------------------------------------------------------------------

/** GitHub workflow-command escaping (data and properties). */
const escData = (s: string) => s.replace(/%/g, "%25").replace(/\r/g, "%0D").replace(/\n/g, "%0A");
const escProp = (s: string) => escData(s).replace(/:/g, "%3A").replace(/,/g, "%2C");

export function annotations(results: CheckResult[]): string[] {
  return results
    .filter((r) => r.status === "ALERT" || r.status === "WATCH")
    .map((r) => {
      const level = r.status === "ALERT" ? "error" : "warning";
      const text = `${r.value} (threshold: ${r.threshold})${r.detail ? ` — ${r.detail}` : ""}`;
      return `::${level} title=${escProp(`${r.status}: ${r.title}`)}::${escData(text)}`;
    });
}

const cell = (s: string) => s.replace(/\|/g, "\\|").replace(/\n/g, " ");

export function summaryMarkdown(env: string, results: CheckResult[], meta: { now: Date; windowFrom: Date; forced: string }): string {
  const alerts = results.filter((r) => r.status === "ALERT");
  const head = alerts.length ? `❌ ${alerts.length} ALERT: ${alerts.map((a) => a.title).join("; ")}` : "✅ no alert";
  const icon: Record<CheckStatus, string> = { OK: "✅ OK", ALERT: "❌ ALERT", WATCH: "⚠️ WATCH", INFO: "ℹ️ INFO" };
  return [
    `## Ops health — ${env}`,
    "",
    head,
    "",
    `Window ${meta.windowFrom.toISOString()} → ${meta.now.toISOString()}${meta.forced !== "none" ? ` · **TEST override: ${meta.forced}** (staging only)` : ""}`,
    "",
    "| Check | Value | Threshold | Status |",
    "|---|---|---|---|",
    ...results.map((r) => `| ${cell(r.title)} | ${cell(r.value)}${r.detail ? `<br>${cell(r.detail)}` : ""} | ${cell(r.threshold)} | ${icon[r.status]} |`),
    "",
    "Runbooks: `docs/OPS_ALERTS.md` on the application branch.",
    "",
  ].join("\n");
}
