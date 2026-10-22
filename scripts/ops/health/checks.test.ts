import { test } from "node:test";
import assert from "node:assert/strict";
import { OPS_TARGETS, THRESHOLDS, TEST_FORCE, WINDOW, contentStaleAlertEffective, thresholdsFor } from "./config.ts";
import {
  annotations,
  CRON_SOURCE_EMPTY_TITLE,
  evaluateContentPublish,
  evaluateCpu,
  evaluateCronLiveness,
  evaluateIntake,
  evaluateOdoo,
  evaluateRfqs,
  ODOO_TITLE,
  odooFailuresFromAnnotations,
  percentile,
  RFQ_COUNTS_SQL,
  rfqCountsFromRow,
  summaryMarkdown,
  unavailable,
  windowStart,
} from "./checks.ts";
import { previousJob, previousJobStart, publishedAt } from "./sources.ts";

const NOW = new Date("2026-10-04T10:00:00Z");
const minsAgo = (m: number) => new Date(NOW.getTime() - m * 60_000).toISOString();

test("cron liveness: OK within 20 min (W17.3; was 15), ALERT after, ALERT when no run in the lookback", () => {
  assert.equal(THRESHOLDS.cronSilentMinutes, 20);
  assert.equal(evaluateCronLiveness("w", minsAgo(15.1), NOW, THRESHOLDS, 24).status, "OK", "a 15-20 min gap is no longer a false ALERT");
  assert.equal(evaluateCronLiveness("w", minsAgo(19.9), NOW, THRESHOLDS, 24).status, "OK");
  assert.equal(evaluateCronLiveness("w", minsAgo(20.1), NOW, THRESHOLDS, 24).status, "ALERT");
  const none = evaluateCronLiveness("w", null, NOW, THRESHOLDS, 24);
  assert.equal(none.status, "ALERT");
  assert.match(none.value, /no scheduled run in 24 h/);
});

test("cron liveness W28: scheduled analytics empty account-wide + a fresh invocation = WATCH (not ALERT), job stays green", () => {
  const r = evaluateCronLiveness("w", null, NOW, THRESHOLDS, 24, { scheduledSourceEmpty: true, lastInvocationAt: minsAgo(3) });
  assert.equal(r.status, "WATCH");
  assert.equal(r.id, "cron:w");
  assert.equal(r.title, `${CRON_SOURCE_EMPTY_TITLE} — w`);
  assert.match(r.value, /last invocation 3\.0 min ago/);
  assert.match(r.detail ?? "", /workersInvocationsScheduled\) empty account-wide/);
  // A bucket start is up to 5 min older than the run in it: 20 + 5 min still WATCH, beyond that ALERT.
  assert.equal(evaluateCronLiveness("w", null, NOW, THRESHOLDS, 24, { scheduledSourceEmpty: true, lastInvocationAt: minsAgo(25) }).status, "WATCH");
  const lines = annotations([r]);
  assert.equal(lines.length, 1);
  assert.match(lines[0], /^::warning title=WATCH%3A cron analytics source empty — w::/);
});

test("cron liveness W28: ALERT only when both sources are silent", () => {
  const stale = evaluateCronLiveness("w", null, NOW, THRESHOLDS, 24, { scheduledSourceEmpty: true, lastInvocationAt: minsAgo(25.1) });
  assert.equal(stale.status, "ALERT");
  assert.equal(stale.title, "cron silent — w", "the ALERT keeps its title (release watch, runbook)");
  assert.match(stale.value, /no scheduled run in 24 h; last invocation 25\.1 min ago/);
  const none = evaluateCronLiveness("w", null, NOW, THRESHOLDS, 24, { scheduledSourceEmpty: true, lastInvocationAt: null });
  assert.equal(none.status, "ALERT");
  assert.match(none.value, /no scheduled run in 24 h; no invocation in 24 h/);
});

test("cron liveness W28: the fallback is ignored when the scheduled dataset has rows for the account", () => {
  // Other Workers' cron runs are visible, so this Worker's silence is real: ALERT, however fresh its HTTP traffic.
  const r = evaluateCronLiveness("w", null, NOW, THRESHOLDS, 24, { scheduledSourceEmpty: false, lastInvocationAt: minsAgo(1) });
  assert.equal(r.status, "ALERT");
  assert.equal(r.value, "no scheduled run in 24 h");
  // A scheduled run present: the fallback is never consulted.
  assert.equal(evaluateCronLiveness("w", minsAgo(21), NOW, THRESHOLDS, 24, { scheduledSourceEmpty: true, lastInvocationAt: minsAgo(1) }).status, "ALERT");
});

test("cron liveness W28: the staging TEST_FORCE cron override still ALERTs through the fallback", () => {
  const forced = { ...THRESHOLDS, ...TEST_FORCE.cron };
  assert.equal(evaluateCronLiveness("w", null, NOW, forced, 24, { scheduledSourceEmpty: true, lastInvocationAt: minsAgo(0.5) }).status, "ALERT");
});

test("cron liveness: the 2026-10-03 gap (last run 17:55:43Z) alerts from the first check after 18:15:43Z", () => {
  const last = "2026-10-03T17:55:43Z";
  assert.equal(evaluateCronLiveness("w", last, new Date("2026-10-03T18:15:00Z"), THRESHOLDS, 24).status, "OK");
  assert.equal(evaluateCronLiveness("w", last, new Date("2026-10-03T18:16:00Z"), THRESHOLDS, 24).status, "ALERT");
  assert.equal(evaluateCronLiveness("w", last, new Date("2026-10-04T07:15:00Z"), THRESHOLDS, 24).status, "ALERT");
});

test("RFQs: oldest undelivered > 45 min alerts; terminal failures alert; admin-closed RFQs do not", () => {
  const base = rfqCountsFromRow({ undelivered: 0, oldest_undelivered: null, terminal_failed: 0, manual_review: 0, retry: 0, closed_by_admin: 7 });
  assert.deepEqual(evaluateRfqs(base, NOW, THRESHOLDS).map((r) => r.status), ["OK", "OK"]);
  const young = { ...base, undelivered: 1, oldestUndeliveredSubmittedAt: minsAgo(44) };
  assert.equal(evaluateRfqs(young, NOW, THRESHOLDS)[0].status, "OK");
  const old = { ...base, undelivered: 2, oldestUndeliveredSubmittedAt: minsAgo(46) };
  assert.equal(evaluateRfqs(old, NOW, THRESHOLDS)[0].status, "ALERT");
  const terminal = { ...base, terminalFailed: 1, manualReview: 1 };
  assert.equal(evaluateRfqs(terminal, NOW, THRESHOLDS)[1].status, "ALERT");
});

test("RFQ query: a single read-only SELECT that excludes admin closures from terminal failures", () => {
  assert.match(RFQ_COUNTS_SQL, /^SELECT/);
  assert.ok(!RFQ_COUNTS_SQL.includes(";"));
  assert.match(RFQ_COUNTS_SQL, /'CLOSED_BY_ADMIN'/);
  assert.match(RFQ_COUNTS_SQL, /deleted_at IS NULL/);
  // Counts only — no column that could carry personal data or a reference.
  assert.doesNotMatch(RFQ_COUNTS_SQL, /reference_number|company_name|email|phone|message/);
});

test("CPU: any exceededCpu/exceededResources (1102) alerts; cron above 10 ms is WATCH, not ALERT", () => {
  const ok = evaluateCpu("w", [{ status: "success", requests: 10, cpuTimeP99Us: 4000, cpuTimeMaxUs: 9000 }], [{ datetime: "x", status: "success", cpuTimeUs: 1000 }], THRESHOLDS);
  assert.deepEqual(ok.map((r) => r.status), ["OK", "INFO", "INFO"]);
  const res = evaluateCpu("w", [{ status: "exceededResources", requests: 1, cpuTimeP99Us: 12000, cpuTimeMaxUs: 12000 }], [], THRESHOLDS);
  assert.equal(res[0].status, "ALERT");
  const cronCpu = evaluateCpu("w", [], [{ datetime: "x", status: "exceededCpu", cpuTimeUs: 10485 }], THRESHOLDS);
  assert.equal(cronCpu[0].status, "ALERT");
  assert.equal(cronCpu[1].status, "WATCH");
  assert.match(cronCpu[1].value, /max 10\.4[89] ms/);
});

test("percentile: nearest-rank", () => {
  assert.equal(percentile([], 99), null);
  assert.equal(percentile([5], 99), 5);
  assert.equal(percentile([1, 2, 3, 4, 5, 6, 7, 8, 9, 100], 99), 100);
  assert.equal(percentile([1, 2, 3, 4], 50), 2);
});

test("intake: any 5xx alerts; 400/422 on POST intake alert only above the threshold", () => {
  const groups = [
    { status: 201, path: "/api/rfqs", method: "POST", count: 5 },
    { status: 422, path: "/api/rfqs", method: "POST", count: 4 },
    { status: 400, path: "/api/rfqs", method: "POST", count: 6 },
    { status: 404, path: "/", method: "GET", count: 50 },
    { status: 422, path: "/other", method: "POST", count: 99 },
  ];
  assert.deepEqual(evaluateIntake("h", "/api/rfqs", groups, THRESHOLDS).map((r) => r.status), ["OK", "OK"]);
  const more = [...groups, { status: 422, path: "/api/rfqs", method: "POST", count: 1 }];
  assert.equal(evaluateIntake("h", "/api/rfqs", more, THRESHOLDS)[1].status, "ALERT");
  const s5 = [...groups, { status: 503, path: "/healthz", method: "GET", count: 1 }];
  assert.equal(evaluateIntake("h", "/api/rfqs", s5, THRESHOLDS)[0].status, "ALERT");
});

test("content publish: older than 30 h or none found alerts", () => {
  assert.equal(evaluateContentPublish(minsAgo(29 * 60), "snap-1", NOW, THRESHOLDS).status, "OK");
  assert.equal(evaluateContentPublish(minsAgo(31 * 60), "snap-1", NOW, THRESHOLDS).status, "ALERT");
  assert.equal(evaluateContentPublish(null, null, NOW, THRESHOLDS).status, "ALERT");
});

test("Odoo: 200 within 10 s is OK; slow, non-200 or no response is a failed check", () => {
  assert.equal(evaluateOdoo({ httpStatus: 200, latencyMs: 4800 }, THRESHOLDS).status, "OK");
  assert.equal(evaluateOdoo({ httpStatus: 200, latencyMs: 4800 }, THRESHOLDS, 5).status, "OK", "a pass resets nothing it needs: no counter in its output");
  for (const p of [{ httpStatus: 200, latencyMs: 10_001 }, { httpStatus: 502, latencyMs: 100 }, { httpStatus: null, latencyMs: 10_000, error: "timeout 10000 ms" }]) {
    assert.equal(evaluateOdoo(p, THRESHOLDS, 0).status, "WATCH", `first failure: ${JSON.stringify(p)}`);
    assert.equal(evaluateOdoo(p, THRESHOLDS, 1).status, "ALERT", `second failure in a row: ${JSON.stringify(p)}`);
  }
});

test("Odoo (W17.3): ALERT only after 2 consecutive failed checks; the counter round-trips through the annotation", () => {
  assert.equal(THRESHOLDS.odooConsecutiveFailures, 2);
  const down = { httpStatus: null, latencyMs: 10_000, error: "timeout 10000 ms" };
  // run 1: previous run had no Odoo annotation → WATCH, counter 1
  const r1 = evaluateOdoo(down, THRESHOLDS, odooFailuresFromAnnotations([{ title: "ALERT: cron silent — w", message: "x" }]));
  assert.equal(r1.status, "WATCH");
  assert.match(r1.detail ?? "", /consecutive failed checks: 1/);
  // what GitHub stores for run 1's annotation (title + unescaped message), read back by run 2
  const asAnnotation = (r: typeof r1) => {
    const line = annotations([r])[0];
    const m = /^::(\w+) title=([^:]+)::(.*)$/.exec(line);
    const unescape = (s: string) => s.replace(/%3A/g, ":").replace(/%2C/g, ",").replace(/%0A/g, "\n").replace(/%0D/g, "\r").replace(/%25/g, "%");
    return { annotation_level: m![1], title: unescape(m![2]), message: unescape(m![3]) };
  };
  const r2 = evaluateOdoo(down, THRESHOLDS, odooFailuresFromAnnotations([asAnnotation(r1)]));
  assert.equal(r2.status, "ALERT");
  assert.match(r2.detail ?? "", /consecutive failed checks: 2/);
  const r3 = evaluateOdoo(down, THRESHOLDS, odooFailuresFromAnnotations([asAnnotation(r2)]));
  assert.equal(r3.status, "ALERT", "it keeps alerting while Odoo stays down");
  assert.match(r3.detail ?? "", /consecutive failed checks: 3/);
  // a passing run leaves no Odoo annotation → the next failure starts again at 1
  assert.equal(annotations([evaluateOdoo({ httpStatus: 200, latencyMs: 50 }, THRESHOLDS, 2)]).length, 0);
  assert.equal(evaluateOdoo(down, THRESHOLDS, odooFailuresFromAnnotations([])).status, "WATCH");
});

test("Odoo (W17.3): an ALERT from before the counter counts as 1; an unreadable history ALERTs at once", () => {
  assert.equal(odooFailuresFromAnnotations([{ title: "ALERT: Odoo unreachable", message: "HTTP 502 in 80 ms (threshold: 200 within 10 s)" }]), 1);
  assert.equal(odooFailuresFromAnnotations([{ title: "WATCH: Odoo unreachable", message: "x — consecutive failed checks: 4" }]), 4);
  assert.equal(odooFailuresFromAnnotations([{ title: "ALERT: published prices stale", message: "consecutive failed checks: 9" }]), 0);
  const unknown = evaluateOdoo({ httpStatus: 503, latencyMs: 20 }, THRESHOLDS, null);
  assert.equal(unknown.status, "ALERT");
  assert.match(unknown.detail ?? "", /previous result unknown/);
});

test("Odoo (RELEASE_POLICY.md §20.2a): the ALERT annotation title is exactly 'ALERT: Odoo unreachable' — v11-release-watch reads it", () => {
  // .github/scripts/v11-live-release.mjs on main (ODOO_ALERT) treats a run whose only ALERT title is this one as an
  // external (Odoo) incident for a HIGH release. Renaming the check silently turns every Odoo outage back into a
  // release ALERT (fail-safe, but a policy change): change both together.
  assert.equal(ODOO_TITLE, "Odoo unreachable");
  const alert = evaluateOdoo({ httpStatus: 502, latencyMs: 80 }, THRESHOLDS, 1);
  assert.equal(alert.status, "ALERT");
  assert.equal(alert.title, ODOO_TITLE);
  const [line] = annotations([alert]);
  const title = /^::error title=([^:]+)::/.exec(line)![1].replace(/%3A/g, ":").replace(/%2C/g, ",").replace(/%25/g, "%");
  assert.equal(title, "ALERT: Odoo unreachable");
});

test("a source that cannot be read is an ALERT, never a pass", () => {
  assert.equal(unavailable("x", "t", "th", new Error("Cloudflare API 403: 10000 Authentication error")).status, "ALERT");
});

test("window: previous run start minus overlap, clamped to [15 min, 24 h]", () => {
  assert.equal(windowStart(NOW, null, WINDOW).toISOString(), minsAgo(15));
  assert.equal(windowStart(NOW, minsAgo(15), WINDOW).toISOString(), minsAgo(20));
  assert.equal(windowStart(NOW, minsAgo(5), WINDOW).toISOString(), minsAgo(15));
  assert.equal(windowStart(NOW, minsAgo(3 * 24 * 60), WINDOW).toISOString(), minsAgo(24 * 60));
});

test("test override: each key forces its check to ALERT; staging-only, never on schedule", () => {
  assert.deepEqual(thresholdsFor("staging", "none", "schedule"), THRESHOLDS);
  assert.deepEqual(thresholdsFor("staging", undefined, "workflow_dispatch"), THRESHOLDS);
  assert.throws(() => thresholdsFor("production", "cron", "workflow_dispatch"), /staging-only/);
  assert.throws(() => thresholdsFor("staging", "cron", "schedule"), /ignored on schedule/);
  assert.throws(() => thresholdsFor("staging", "nope", "workflow_dispatch"), /unknown test override/);
  const healthy = {
    cron: () => evaluateCronLiveness("w", minsAgo(0), NOW, thresholdsFor("staging", "cron", "workflow_dispatch"), 24).status,
    rfq: () => evaluateRfqs(rfqCountsFromRow({}), NOW, thresholdsFor("staging", "rfq", "workflow_dispatch"))[1].status,
    cpu: () => evaluateCpu("w", [], [], thresholdsFor("staging", "cpu", "workflow_dispatch"))[0].status,
    intake: () => evaluateIntake("h", "/api/rfqs", [], thresholdsFor("staging", "intake", "workflow_dispatch"))[0].status,
    content: () => evaluateContentPublish(minsAgo(1), null, NOW, thresholdsFor("staging", "content", "workflow_dispatch")).status,
    odoo: () => evaluateOdoo({ httpStatus: 200, latencyMs: 1 }, thresholdsFor("staging", "odoo", "workflow_dispatch")).status,
  };
  assert.deepEqual(Object.keys(healthy).sort(), Object.keys(TEST_FORCE).sort());
  for (const [key, run] of Object.entries(healthy)) assert.equal(run(), "ALERT", key);
});

test("annotations: one ::error per ALERT with an escaped 'ALERT: <title>'; WATCH is a warning; OK/INFO none", () => {
  const lines = annotations([
    { id: "a", title: "cron silent — w", value: "19.3 min", threshold: "≤ 15, min", status: "ALERT" },
    { id: "b", title: "cron cpuTime — w", value: "max 10.49 ms", threshold: "watch", status: "WATCH" },
    { id: "c", title: "ok", value: "1", threshold: "x", status: "OK" },
  ]);
  assert.equal(lines.length, 2);
  assert.equal(lines[0], "::error title=ALERT%3A cron silent — w::19.3 min (threshold: ≤ 15, min)");
  assert.match(lines[1], /^::warning title=WATCH%3A cron cpuTime — w::/);
});

test("summary: table with check/value/threshold/status and the alert headline", () => {
  const md = summaryMarkdown("staging", [{ id: "a", title: "Odoo unreachable", value: "HTTP 502 | x", threshold: "200", status: "ALERT" }], { now: NOW, windowFrom: new Date(minsAgo(15)), forced: "odoo" });
  assert.match(md, /\| Check \| Value \| Threshold \| Status \|/);
  assert.match(md, /❌ 1 ALERT: Odoo unreachable/);
  assert.match(md, /HTTP 502 \\\| x/);
  assert.match(md, /TEST override: odoo/);
});

test("targets: staging enabled; production live since W8.1 (cron + API host checked, stale-content alert gated by the owner's flag)", () => {
  assert.equal(OPS_TARGETS.staging.enabled, true);
  assert.equal(OPS_TARGETS.staging.contentStaleAlert, true);
  assert.equal(OPS_TARGETS.staging.contentStaleAlertFlag, null);
  const p = OPS_TARGETS.production;
  assert.equal(p.enabled, true);
  assert.notEqual(p.rfqWorker, OPS_TARGETS.staging.rfqWorker);
  assert.deepEqual(p.cronWorkers, ["ahanassa-v11-rfq-production"], "the production RFQ Worker's */5 cron (W8.1)");
  assert.equal(p.apiHost, "api.ahanassa.com", "custom domain attached at W8.1");
  assert.equal(p.contentStaleAlert, true);
  assert.equal(p.contentStaleAlertFlag, "OPS_PRODUCTION_CONTENT_STALE_ALERT");
  assert.ok(p.dbOpsId && p.dbPublicId && p.dbOpsId !== OPS_TARGETS.staging.dbOpsId && p.dbPublicId !== OPS_TARGETS.staging.dbPublicId);
});

test("stale-content alert (W9.1): production alerts only while the owner's flag is 'on'; staging always", () => {
  const p = OPS_TARGETS.production;
  assert.equal(contentStaleAlertEffective(p, {}), false, "unset = report only");
  assert.equal(contentStaleAlertEffective(p, { OPS_PRODUCTION_CONTENT_STALE_ALERT: "" }), false);
  assert.equal(contentStaleAlertEffective(p, { OPS_PRODUCTION_CONTENT_STALE_ALERT: "off" }), false);
  assert.equal(contentStaleAlertEffective(p, { OPS_PRODUCTION_CONTENT_STALE_ALERT: "true" }), false, "only the exact word 'on'");
  assert.equal(contentStaleAlertEffective(p, { OPS_PRODUCTION_CONTENT_STALE_ALERT: "on" }), true);
  assert.equal(contentStaleAlertEffective(p, { OPS_PRODUCTION_CONTENT_STALE_ALERT: " ON " }), true);
  assert.equal(contentStaleAlertEffective(OPS_TARGETS.staging, {}), true);
  assert.equal(contentStaleAlertEffective({ ...p, contentStaleAlert: false }, { OPS_PRODUCTION_CONTENT_STALE_ALERT: "on" }), false);
});

const step = (name: string, conclusion: string | null, completed_at: string | null = "2026-10-08T07:20:00Z") => ({ name, conclusion, completed_at });
const FINALIZE_PROD = "12. Finalize (retention; no catalog mirror in production)";
const FINALIZE_STAGING = "12. Finalize (catalog mirror, keep 3 versions)";

test("published runs (W9.1): a production job counts only when its Finalize step succeeded, not by job name/conclusion", () => {
  const p = OPS_TARGETS.production;
  const refused = [
    { name: "publish (staging DB_PUBLIC + static Worker)", conclusion: "success", completed_at: "2026-10-08T07:10:00Z", steps: [step(FINALIZE_STAGING, "success", "2026-10-08T07:09:00Z")] },
    { name: "publish-production-content (scheduled; CONTENT_REBUILD AUTO only)", conclusion: "success", completed_at: "2026-10-08T07:15:00Z", steps: [step("CONTENT_REBUILD check (RELEASE_POLICY.md §19): publish only on AUTO", "success"), step(FINALIZE_PROD, "skipped")] },
  ];
  assert.equal(publishedAt(refused, p.contentPublishJobPrefix, p.contentPublishProofStep), null, "REFUSED run published nothing to production");
  assert.equal(publishedAt(refused, OPS_TARGETS.staging.contentPublishJobPrefix, OPS_TARGETS.staging.contentPublishProofStep), "2026-10-08T07:09:00Z", "but staging did publish");

  const auto = [{ ...refused[1]!, steps: [step(FINALIZE_PROD, "success", "2026-10-08T07:14:00Z")] }];
  assert.equal(publishedAt(auto, p.contentPublishJobPrefix, p.contentPublishProofStep), "2026-10-08T07:14:00Z");

  const prep = [{ name: "publish-production (production-prep, workers.dev + v11 production DB_PUBLIC)", conclusion: "success", completed_at: "2026-10-07T07:40:00Z", steps: [step(FINALIZE_PROD, "success", "2026-10-07T07:39:00Z")] }];
  assert.equal(publishedAt(prep, p.contentPublishJobPrefix, p.contentPublishProofStep), "2026-10-07T07:39:00Z", "a dispatched production-prep publish counts too");

  const failedAfterFinalize = [{ ...auto[0]!, conclusion: "failure" }];
  assert.equal(publishedAt(failedAfterFinalize, p.contentPublishJobPrefix, p.contentPublishProofStep), "2026-10-08T07:14:00Z", "finalized, then the evidence upload failed: it still published");

  const rolledBack = [{ ...auto[0]!, conclusion: "failure", steps: [step(FINALIZE_PROD, "skipped"), step("14. Rollback (automatic, on any failure before finalize)", "success")] }];
  assert.equal(publishedAt(rolledBack, p.contentPublishJobPrefix, p.contentPublishProofStep), null);

  const dryRun = [{ name: "publish-production-content (scheduled; CONTENT_REBUILD AUTO only)", conclusion: "skipped", completed_at: "2026-10-08T07:15:00Z", steps: [] }];
  assert.equal(publishedAt(dryRun, p.contentPublishJobPrefix, p.contentPublishProofStep), null);
});

test("published runs: the staging prefix no longer matches the production jobs", () => {
  const s = OPS_TARGETS.staging;
  const onlyProduction = [{ name: "publish-production-content (scheduled; CONTENT_REBUILD AUTO only)", conclusion: "success", completed_at: "2026-10-08T07:15:00Z", steps: [step(FINALIZE_PROD, "success")] }];
  assert.equal(publishedAt(onlyProduction, s.contentPublishJobPrefix, s.contentPublishProofStep), null);
});

test("content check: report-only targets never ALERT on a stale or missing publish", () => {
  const now = new Date("2026-10-04T12:00:00Z");
  assert.equal(evaluateContentPublish(null, null, now, THRESHOLDS, false).status, "INFO");
  assert.equal(evaluateContentPublish("2026-10-01T00:00:00Z", "snap-x", now, THRESHOLDS, false).status, "INFO");
  assert.equal(evaluateContentPublish("2026-10-04T11:00:00Z", "snap-x", now, THRESHOLDS, false).status, "OK");
  assert.equal(evaluateContentPublish(null, null, now, THRESHOLDS).status, "ALERT");
});

// W9.4 — internal stale-price alert (D-PRICE-AGE). Synthetic bodies only.
import { evaluatePriceStale, newestPublishedPriceAt } from "./checks.ts";
import { readFileSync as readPriceFile } from "node:fs";

test("price age: newest numeric published_at_utc only; on-request rows and invalid times ignored", () => {
  const body = {
    data: [
      { price_on_request: false, published_at_utc: "2026-10-03T07:20:00Z" },
      { price_on_request: false, published_at_utc: "2026-10-05T07:20:00Z" },
      { price_on_request: true, published_at_utc: null },
      { price_on_request: false, published_at_utc: "not a time" },
    ],
  };
  assert.equal(newestPublishedPriceAt(body), "2026-10-05T07:20:00Z");
  assert.equal(newestPublishedPriceAt({ data: [] }), null);
  assert.throws(() => newestPublishedPriceAt({ error: {} }));
});

test("price age: ALERT only when the newest published price is older than 5 days; nothing priced is INFO", () => {
  const now = new Date("2026-10-10T08:00:00Z");
  assert.equal(THRESHOLDS.priceStaleMaxDays, 5);
  assert.equal(evaluatePriceStale("2026-10-05T09:00:00Z", now, THRESHOLDS).status, "OK");
  assert.equal(evaluatePriceStale("2026-10-05T07:00:00Z", now, THRESHOLDS).status, "ALERT");
  assert.equal(evaluatePriceStale(null, now, THRESHOLDS).status, "INFO");
});

test("price age: the production check exists behind a config flag that is OFF; staging never runs it", () => {
  assert.equal(OPS_TARGETS.production.priceStaleCheck, false);
  assert.equal(OPS_TARGETS.staging.priceStaleCheck, false);
  const run = readPriceFile(new URL("./run.ts", import.meta.url), "utf8");
  assert.match(run, /if \(target\.priceStaleCheck\) \{/);
  assert.ok(!/from "\.\.\/\.\.\/\.\.\/lib\//.test(readPriceFile(new URL("./sources.ts", import.meta.url), "utf8")), "ops health stays dependency-free (no npm ci)");
});

// W9.7: the lookback reads THIS target's job, page by page, and never collapses to the 15-minute minimum.
function fakeGitHub(runs: { id: number; status: string; conclusion: string | null; run_started_at: string }[], jobs: Record<number, { id?: number; name: string; status: string; conclusion: string | null; started_at: string | null }[]>) {
  const calls: string[] = [];
  const original = globalThis.fetch;
  globalThis.fetch = (async (input: string | URL | Request) => {
    const url = new URL(String(input));
    calls.push(url.pathname + url.search);
    const m = /\/actions\/runs\/(\d+)\/jobs/.exec(url.pathname);
    if (m) return new Response(JSON.stringify({ jobs: jobs[Number(m[1])] ?? [] }));
    const page = Number(url.searchParams.get("page") ?? "1");
    return new Response(JSON.stringify({ workflow_runs: runs.slice((page - 1) * 100, page * 100) }));
  }) as typeof fetch;
  return { calls, restore: () => (globalThis.fetch = original) };
}
const AUTH = { token: "t", repo: "o/r" };

test("lookback: 10+ cancelled runs no longer collapse the window; the job of a cancelled run counts", async () => {
  const runs = [
    { id: 100, status: "in_progress", conclusion: null, run_started_at: minsAgo(1) }, // the current run
    ...Array.from({ length: 12 }, (_, i) => ({ id: 99 - i, status: "completed", conclusion: "cancelled", run_started_at: minsAgo(15 * (i + 1)) })),
  ];
  const jobs: Record<number, { name: string; status: string; conclusion: string | null; started_at: string | null }[]> = {};
  for (const r of runs.slice(1, 12)) jobs[r.id] = [{ name: "health (staging)", status: "completed", conclusion: "cancelled", started_at: null }, { name: "health (production-prep)", status: "completed", conclusion: "cancelled", started_at: null }];
  jobs[88] = [{ name: "health (staging)", status: "waiting", conclusion: null, started_at: null }, { name: "health (production-prep)", status: "completed", conclusion: "failure", started_at: minsAgo(180) }];
  const gh = fakeGitHub(runs, jobs);
  try {
    assert.equal(await previousJobStart(AUTH, "ops-health.yml", "health (production-prep)", "100", new Date(Date.parse(minsAgo(24 * 60)))), minsAgo(180), "the 12th run back: its production job completed");
    assert.equal(await previousJobStart(AUTH, "ops-health.yml", "health (staging)", "100", new Date(Date.parse(minsAgo(24 * 60)))), null, "no staging job completed in 24 h");
  } finally {
    gh.restore();
  }
});

test("lookback: a successful run counts without reading its jobs; nothing in 24 h = null (caller uses the full window)", async () => {
  const gh = fakeGitHub(
    [
      { id: 7, status: "completed", conclusion: "success", run_started_at: minsAgo(16) },
      { id: 6, status: "completed", conclusion: "success", run_started_at: minsAgo(31) },
    ],
    {},
  );
  try {
    assert.equal(await previousJobStart(AUTH, "ops-health.yml", "health (production-prep)", "8", new Date(Date.parse(minsAgo(24 * 60)))), minsAgo(16));
    assert.ok(!gh.calls.some((c) => c.includes("/jobs")), "no job lookup for a successful run");
    assert.equal(await previousJobStart(AUTH, "ops-health.yml", "health (production-prep)", "8", new Date(Date.parse(minsAgo(10)))), null, "older than notBefore");
  } finally {
    gh.restore();
  }
  assert.equal(windowStart(NOW, minsAgo(24 * 60), WINDOW).toISOString(), minsAgo(24 * 60), "the caller's fallback is the full 24 h window");
});

test("job names: one per target, as named in ops-health.yml on main (v11-release-watch.yml reads the production one)", () => {
  assert.equal(OPS_TARGETS.staging.opsHealthJobName, "health (staging)");
  assert.equal(OPS_TARGETS.production.opsHealthJobName, "health (production-prep)");
});

test("previous job (W17.3): returns the job id for the Odoo counter, also for a successful run", async () => {
  const gh = fakeGitHub(
    [
      { id: 9, status: "in_progress", conclusion: null, run_started_at: minsAgo(1) },
      { id: 8, status: "completed", conclusion: "failure", run_started_at: minsAgo(16) },
      { id: 7, status: "completed", conclusion: "success", run_started_at: minsAgo(31) },
    ],
    {
      8: [{ name: "health (staging)", status: "completed", conclusion: "failure", started_at: minsAgo(15), id: 801 }, { name: "health (production-prep)", status: "waiting", conclusion: null, started_at: null }],
      7: [{ name: "health (production-prep)", status: "completed", conclusion: "success", started_at: minsAgo(30), id: 702 }],
    },
  );
  try {
    const notBefore = new Date(Date.parse(minsAgo(24 * 60)));
    assert.deepEqual(await previousJob(AUTH, "ops-health.yml", "health (staging)", "9", notBefore), { startedAt: minsAgo(15), jobId: 801 });
    assert.deepEqual(await previousJob(AUTH, "ops-health.yml", "health (production-prep)", "9", notBefore), { startedAt: minsAgo(31), jobId: 702 }, "the held job of run 8 is skipped; run 7 succeeded");
    assert.equal(await previousJob(AUTH, "ops-health.yml", "health (staging)", "9", new Date(Date.parse(minsAgo(10)))), null);
  } finally {
    gh.restore();
  }
});
