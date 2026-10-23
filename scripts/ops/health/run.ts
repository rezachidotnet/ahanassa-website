/**
 * Ops health check (architecture V1.1 §15, r3 CPU alert; website W6).
 *
 *   node scripts/ops/health/run.ts --env staging [--out <file.json>]
 *
 * Env: CLOUDFLARE_API_TOKEN (read-only monitor token), CLOUDFLARE_ACCOUNT_ID, GITHUB_TOKEN,
 *      GITHUB_REPOSITORY, GITHUB_RUN_ID (Actions sets the last two), GITHUB_EVENT_NAME,
 *      OPS_HEALTH_TEST_FORCE = none|cron|rfq|cpu|intake|content|odoo (staging-only alert test),
 *      OPS_PRODUCTION_CONTENT_STALE_ALERT = on (production stale-content alert; config.ts contentStaleAlertFlag).
 *
 * Writes the result table to $GITHUB_STEP_SUMMARY and stdout, one `::error title=ALERT: …` annotation
 * per ALERT (the failed-run e-mail shows them), and exits 1 only on ALERT. Output holds counts, ages
 * and timestamps — no RFQ, reference, contact or other personal data.
 */
import fs from "node:fs";
import { ODOO_META_URL, ODOO_PRICING_CURRENT_URL, OPS_TARGETS, WINDOW, contentStaleAlertEffective, thresholdsFor, type OpsEnv } from "./config.ts";
import {
  annotations,
  evaluateContentPublish,
  evaluateContentPublishFallback,
  activePublicationFromRow,
  ACTIVE_PUBLICATION_SQL,
  evaluateCpu,
  evaluateCronLiveness,
  evaluateIntake,
  evaluateOdoo,
  evaluatePriceStale,
  evaluateReconciler,
  evaluateRfqs,
  odooFailuresFromAnnotations,
  odooOk,
  RFQ_COUNTS_SQL,
  rfqCountsFromRow,
  summaryMarkdown,
  unavailable,
  windowStart,
  type CheckResult,
  type CronFallback,
} from "./checks.ts";
import {
  d1Select,
  httpByHost,
  jobAnnotations,
  lastInvocationBucket,
  lastRunStart,
  lastScheduledRun,
  isTransientGitHubError,
  lastSuccessfulPublish,
  newestPublishedPrice,
  previousJob,
  probeOdoo,
  scheduledAnalyticsHasRows,
  workerCpu,
  type CloudflareAuth,
  type GitHubAuth,
} from "./sources.ts";

function arg(name: string): string | undefined {
  const i = process.argv.indexOf(`--${name}`);
  return i > 0 ? process.argv[i + 1] : undefined;
}

function required(name: string): string {
  const v = process.env[name];
  if (!v) throw new Error(`${name} is not set`);
  return v;
}

async function main(): Promise<number> {
  const env = (arg("env") ?? "staging") as OpsEnv;
  const target = OPS_TARGETS[env];
  if (!target) throw new Error(`unknown --env ${env}`);
  if (!target.enabled) throw new Error(`ops health target "${env}" is not enabled yet (W8)`);
  const forced = process.env.OPS_HEALTH_TEST_FORCE || "none";
  const t = thresholdsFor(env, forced, process.env.GITHUB_EVENT_NAME);

  const cf: CloudflareAuth = { token: required("CLOUDFLARE_API_TOKEN"), accountId: required("CLOUDFLARE_ACCOUNT_ID") };
  const gh: GitHubAuth = { token: required("GITHUB_TOKEN"), repo: required("GITHUB_REPOSITORY") };
  const now = new Date();

  const earliest = new Date(now.getTime() - WINDOW.maxMinutes * 60_000);
  let previous: string | null = null;
  let previousJobId: number | null | undefined; // undefined = the lookup failed
  try {
    const job = await previousJob(gh, target.opsHealthWorkflow, target.opsHealthJobName, process.env.GITHUB_RUN_ID, earliest);
    previous = job?.startedAt ?? null;
    previousJobId = job ? job.jobId : null;
  } catch {
    previous = null; // the lookup failed: check the full maximum window rather than guess a short one
  }
  // W9.7: no previous completed run of this job within WINDOW.maxMinutes -> the whole maximum window, never the minimum.
  const from = windowStart(now, previous ?? earliest.toISOString(), WINDOW);
  const cronFrom = new Date(now.getTime() - WINDOW.cronLookbackHours * 3_600_000);

  const results: CheckResult[] = [];
  const guard = async (id: string, title: string, threshold: string, body: () => Promise<CheckResult | CheckResult[]>) => {
    try {
      const r = await body();
      results.push(...(Array.isArray(r) ? r : [r]));
    } catch (error) {
      results.push(unavailable(id, title, threshold, error));
    }
  };

  // 3. cron liveness, per v11 Worker with a cron. W28: a Worker with no scheduled run reads the second source only
  // when the scheduled dataset is empty account-wide (checked once per run).
  let scheduledSourceEmpty: Promise<boolean> | undefined;
  for (const worker of target.cronWorkers) {
    await guard(`cron:${worker}`, `cron silent — ${worker}`, `last scheduled run ≤ ${t.cronSilentMinutes} min ago`, async () => {
      const last = await lastScheduledRun(cf, worker, cronFrom, now);
      if (last) return evaluateCronLiveness(worker, last, now, t, WINDOW.cronLookbackHours);
      scheduledSourceEmpty ??= scheduledAnalyticsHasRows(cf, cronFrom, now).then((has) => !has);
      const fallback: CronFallback = (await scheduledSourceEmpty)
        ? { scheduledSourceEmpty: true, lastInvocationAt: await lastInvocationBucket(cf, worker, cronFrom, now) }
        : { scheduledSourceEmpty: false, lastInvocationAt: null };
      return evaluateCronLiveness(worker, null, now, t, WINDOW.cronLookbackHours, fallback);
    });
  }
  // 4. undelivered / terminal RFQs
  if (target.dbOpsId) {
    const dbOps = target.dbOpsId;
    await guard("rfq", "RFQ delivery state", "see runbook", async () => evaluateRfqs(rfqCountsFromRow((await d1Select(cf, dbOps, RFQ_COUNTS_SQL))[0]), now, t));
  }
  // 5. CPU
  if (target.rfqWorker) {
    const worker = target.rfqWorker;
    await guard(`cpu:${worker}`, `exceededCpu / 1102 — ${worker}`, `≤ ${t.cpuExceededMax}`, async () => {
      const { groups, scheduled } = await workerCpu(cf, worker, from, now);
      return evaluateCpu(worker, groups, scheduled, t);
    });
  }
  // 6. intake errors
  if (target.apiHost) {
    const host = target.apiHost;
    await guard("intake", `intake errors — ${host}`, `5xx ≤ ${t.intake5xxMax}, 400/422 ≤ ${t.intake4xxMax}`, async () =>
      evaluateIntake(host, target.intakePath, await httpByHost(cf, host, from, now), t),
    );
  }
  // 7. content publication (+ active_version, §15)
  await guard("content:publish", "content publish stale", `last successful publish ≤ ${t.contentPublishMaxAgeHours} h ago`, async () => {
    // W37: the active publication (version + its creation time) — reported as before, and the fallback below.
    const live = target.dbPublicId ? activePublicationFromRow((await d1Select(cf, target.dbPublicId, ACTIVE_PUBLICATION_SQL))[0]) : null;
    let last: string | null;
    try {
      last = await lastSuccessfulPublish(gh, target.contentPublishWorkflow, target.contentPublishJobPrefix, target.contentPublishProofStep);
    } catch (error) {
      // A 5xx/429/timeout that outlived the retries: bridge with the live publication. Anything else stays an ALERT.
      if (!isTransientGitHubError(error) || !target.dbPublicId) throw error;
      return evaluateContentPublishFallback((error as Error).message, live, now, t, contentStaleAlertEffective(target));
    }
    return evaluateContentPublish(last, live?.version ?? null, now, t, contentStaleAlertEffective(target));
  });
  // 8. Odoo reachability (GET only). W17.3: ALERT only on the 2nd failed check in a row; the count of the previous
  // completed run of this job is read from its annotations (only after a failure: a passing check needs no history).
  const odoo = await probeOdoo(ODOO_META_URL, t.odooTimeoutMs);
  let odooPrevious: number | null = 0;
  if (!odooOk(odoo, t)) {
    try {
      // No previous completed run in 24 h = no earlier failure on record; a failed lookup = unknown (ALERT at once).
      if (previousJobId === undefined) odooPrevious = null;
      else if (previousJobId !== null) odooPrevious = odooFailuresFromAnnotations(await jobAnnotations(gh, previousJobId));
    } catch {
      odooPrevious = null;
    }
  }
  results.push(evaluateOdoo(odoo, t, odooPrevious));
  // 9. price age (W9.4; off unless the target enables it)
  if (target.priceStaleCheck) {
    await guard("pricing:stale", "published prices stale", `newest published price ≤ ${t.priceStaleMaxDays} days old`, async () =>
      evaluatePriceStale(await newestPublishedPrice(ODOO_PRICING_CURRENT_URL, t.odooTimeoutMs), now, t),
    );
  }
  // info: CI reconciler
  await guard("info:reconciler", "CI reconciler last run", "info", async () => evaluateReconciler(await lastRunStart(gh, target.reconcilerWorkflow), now, t));

  const markdown = summaryMarkdown(env, results, { now, windowFrom: from, forced });
  console.log(markdown);
  if (process.env.GITHUB_STEP_SUMMARY) fs.appendFileSync(process.env.GITHUB_STEP_SUMMARY, markdown + "\n");
  for (const line of annotations(results)) console.log(line);
  const out = arg("out");
  if (out) fs.writeFileSync(out, JSON.stringify({ env, now: now.toISOString(), windowFrom: from.toISOString(), forced, results }, null, 1) + "\n");

  return results.some((r) => r.status === "ALERT") ? 1 : 0;
}

main().then(
  (code) => process.exit(code),
  (error: unknown) => {
    const message = error instanceof Error ? error.message : String(error);
    console.log(`::error title=ALERT: ops health could not run::${message.replace(/\r?\n/g, " ")}`);
    if (process.env.GITHUB_STEP_SUMMARY) fs.appendFileSync(process.env.GITHUB_STEP_SUMMARY, `## Ops health\n\n❌ could not run: ${message}\n`);
    process.exit(1);
  },
);
