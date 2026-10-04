/**
 * Replays the cron-liveness check over a historical window (W6 item 3): for every simulated "now"
 * from --from to --to (step --step minutes) it runs the SAME query (lastScheduledRun) and the SAME
 * evaluator (evaluateCronLiveness, production thresholds) the scheduled check runs, and prints when
 * the check would have fired. Read-only (GraphQL Analytics).
 *
 *   node scripts/ops/health/replay-cron-gap.ts --worker ahanassa-v11-rfq-staging \
 *     --from 2026-10-03T17:45:00Z --to 2026-10-04T07:45:00Z [--step 15] [--out replay.json]
 * Env: CLOUDFLARE_API_TOKEN, CLOUDFLARE_ACCOUNT_ID.
 */
import fs from "node:fs";
import { THRESHOLDS, WINDOW } from "./config.ts";
import { evaluateCronLiveness } from "./checks.ts";
import { lastScheduledRun } from "./sources.ts";

const get = (name: string) => {
  const i = process.argv.indexOf(`--${name}`);
  return i > 0 ? process.argv[i + 1] : undefined;
};

const worker = get("worker") ?? "ahanassa-v11-rfq-staging";
const from = new Date(get("from") ?? "");
const to = new Date(get("to") ?? "");
const step = Number(get("step") ?? 15);
if (Number.isNaN(from.getTime()) || Number.isNaN(to.getTime()) || !(step > 0)) throw new Error("--from, --to (ISO) and --step (minutes) are required");
const cf = { token: process.env.CLOUDFLARE_API_TOKEN ?? "", accountId: process.env.CLOUDFLARE_ACCOUNT_ID ?? "" };
if (!cf.token || !cf.accountId) throw new Error("CLOUDFLARE_API_TOKEN and CLOUDFLARE_ACCOUNT_ID are required");

const rows: { now: string; lastRun: string | null; value: string; status: string }[] = [];
for (let t = from.getTime(); t <= to.getTime(); t += step * 60_000) {
  const now = new Date(t);
  const last = await lastScheduledRun(cf, worker, new Date(t - WINDOW.cronLookbackHours * 3_600_000), now);
  const r = evaluateCronLiveness(worker, last, now, THRESHOLDS, WINDOW.cronLookbackHours);
  rows.push({ now: now.toISOString(), lastRun: last, value: r.value, status: r.status });
  console.log(`${now.toISOString()}  ${r.status.padEnd(5)}  ${r.value}`);
}
const alerts = rows.filter((r) => r.status === "ALERT");
const summary = {
  worker,
  threshold_minutes: THRESHOLDS.cronSilentMinutes,
  simulated_checks: rows.length,
  alert_checks: alerts.length,
  first_alert_at: alerts[0]?.now ?? null,
  last_alert_at: alerts.at(-1)?.now ?? null,
};
console.log(JSON.stringify(summary));
const out = get("out");
if (out) fs.writeFileSync(out, JSON.stringify({ summary, rows }, null, 1) + "\n");
