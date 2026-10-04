import { test } from "node:test";
import assert from "node:assert/strict";
import { OPS_TARGETS, THRESHOLDS, TEST_FORCE, WINDOW, thresholdsFor } from "./config.ts";
import {
  annotations,
  evaluateContentPublish,
  evaluateCpu,
  evaluateCronLiveness,
  evaluateIntake,
  evaluateOdoo,
  evaluateRfqs,
  percentile,
  RFQ_COUNTS_SQL,
  rfqCountsFromRow,
  summaryMarkdown,
  unavailable,
  windowStart,
} from "./checks.ts";

const NOW = new Date("2026-10-04T10:00:00Z");
const minsAgo = (m: number) => new Date(NOW.getTime() - m * 60_000).toISOString();

test("cron liveness: OK within 15 min, ALERT after, ALERT when no run in the lookback", () => {
  assert.equal(evaluateCronLiveness("w", minsAgo(14.9), NOW, THRESHOLDS, 24).status, "OK");
  assert.equal(evaluateCronLiveness("w", minsAgo(15.1), NOW, THRESHOLDS, 24).status, "ALERT");
  const none = evaluateCronLiveness("w", null, NOW, THRESHOLDS, 24);
  assert.equal(none.status, "ALERT");
  assert.match(none.value, /no scheduled run in 24 h/);
});

test("cron liveness: the 2026-10-03 gap (last run 17:55:43Z) alerts from the first check after 18:10:43Z", () => {
  const last = "2026-10-03T17:55:43Z";
  assert.equal(evaluateCronLiveness("w", last, new Date("2026-10-03T18:10:00Z"), THRESHOLDS, 24).status, "OK");
  assert.equal(evaluateCronLiveness("w", last, new Date("2026-10-03T18:15:00Z"), THRESHOLDS, 24).status, "ALERT");
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

test("Odoo: 200 within 10 s is OK; slow, non-200 or no response alerts", () => {
  assert.equal(evaluateOdoo({ httpStatus: 200, latencyMs: 4800 }, THRESHOLDS).status, "OK");
  assert.equal(evaluateOdoo({ httpStatus: 200, latencyMs: 10_001 }, THRESHOLDS).status, "ALERT");
  assert.equal(evaluateOdoo({ httpStatus: 502, latencyMs: 100 }, THRESHOLDS).status, "ALERT");
  assert.equal(evaluateOdoo({ httpStatus: null, latencyMs: 10_000, error: "timeout 10000 ms" }, THRESHOLDS).status, "ALERT");
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

test("targets: staging enabled; production enabled for W8.0 prep (no cron check, no API host yet, content report-only)", () => {
  assert.equal(OPS_TARGETS.staging.enabled, true);
  assert.equal(OPS_TARGETS.staging.contentStaleAlert, true);
  const p = OPS_TARGETS.production;
  assert.equal(p.enabled, true);
  assert.notEqual(p.rfqWorker, OPS_TARGETS.staging.rfqWorker);
  assert.deepEqual(p.cronWorkers, [], "the production RFQ Worker has no cron until W8.1");
  assert.equal(p.apiHost, null, "api.ahanassa.com is attached at W8.1");
  assert.equal(p.contentStaleAlert, false);
  assert.ok(p.dbOpsId && p.dbPublicId && p.dbOpsId !== OPS_TARGETS.staging.dbOpsId && p.dbPublicId !== OPS_TARGETS.staging.dbPublicId);
});

test("content check: report-only targets never ALERT on a stale or missing publish", () => {
  const now = new Date("2026-10-04T12:00:00Z");
  assert.equal(evaluateContentPublish(null, null, now, THRESHOLDS, false).status, "INFO");
  assert.equal(evaluateContentPublish("2026-10-01T00:00:00Z", "snap-x", now, THRESHOLDS, false).status, "INFO");
  assert.equal(evaluateContentPublish("2026-10-04T11:00:00Z", "snap-x", now, THRESHOLDS, false).status, "OK");
  assert.equal(evaluateContentPublish(null, null, now, THRESHOLDS).status, "ALERT");
});
