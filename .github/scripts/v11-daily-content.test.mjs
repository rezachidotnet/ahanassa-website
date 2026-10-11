// node --test ".github/scripts/*.test.mjs"  — W11.2: the daily content publish is never silently skipped (backup
// schedules, the Odoo entry and the 09:00 UTC watchdog share one guard: one content publish per Tehran day).
// Synthetic SHAs, IDs and runs only (§14).
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { test } from "node:test";
import { decideEntry, decideWatchdog, main, tehranDate, tehranDayStart, todaysContentPublish, watchdogDeadline } from "./v11-daily-content.mjs";
import { makeRecord } from "./v11-live-release.mjs";

const sha = (c) => c.repeat(40);
const vid = (n) => `00000000-0000-4000-8000-${String(n).padStart(12, "0")}`;
const snap = (n) => `snap-2026101100000${String(n).padStart(3, "0")}`;
const state = (n) => ({
  version: snap(n),
  previous_active_version: snap(n - 1),
  steps: ["staged_state", "staged_index", "deploy_started", "deployed", "smoke_passed", "switched", "finalized"],
  previous_worker_version_id: vid(n - 1),
  deployed_worker_version_id: vid(n),
  switched: true,
});
const rec = (n, kind, at) => makeRecord({ kind, codeSha: sha("b"), publishState: state(n), previousCodeSha: sha("a"), risk: "LOW", runId: 2000 + n, switchedAt: at });
const T = (iso) => new Date(iso);

test("Tehran dates: the day starts at 20:30 UTC the evening before; the watchdog deadline is 09:00 UTC of that day", () => {
  assert.equal(tehranDate("2026-10-11T08:00:00Z"), "2026-10-11");
  assert.equal(tehranDate("2026-10-11T20:29:59Z"), "2026-10-11");
  assert.equal(tehranDate("2026-10-11T20:30:00Z"), "2026-10-12");
  assert.equal(new Date(tehranDayStart("2026-10-12")).toISOString(), "2026-10-11T20:30:00.000Z");
  assert.equal(new Date(watchdogDeadline(T("2026-10-11T08:59:00Z"))).toISOString(), "2026-10-11T09:00:00.000Z");
  // 21:00 UTC is already the next Tehran day: its deadline is tomorrow 09:00, so the watchdog stays quiet overnight.
  assert.equal(new Date(watchdogDeadline(T("2026-10-11T21:00:00Z"))).toISOString(), "2026-10-12T09:00:00.000Z");
});

test("today's publish: only a content record whose live_since is today (Tehran); releases and rollbacks do not count", () => {
  const now = T("2026-10-11T08:20:00Z");
  const yesterday = rec(1, "content", "2026-10-10T08:12:00Z");
  const lateYesterdayUtcButToday = rec(2, "content", "2026-10-10T20:45:00Z"); // 00:15 Tehran on the 11th
  const release = rec(3, "release", "2026-10-11T07:00:00Z");
  const rollback = { ...rec(4, "release", "2026-10-11T07:30:00Z"), kind: "rollback" };
  assert.equal(todaysContentPublish([yesterday, release, rollback], now), null);
  assert.equal(todaysContentPublish([yesterday, lateYesterdayUtcButToday, release], now)?.run_id, "2002");
  const today = rec(5, "content", "2026-10-11T08:14:00Z");
  assert.equal(todaysContentPublish([yesterday, lateYesterdayUtcButToday, today], now)?.run_id, "2005", "the newest of today");
});

const run = (id, status, title, extra = {}) => ({ id, status, conclusion: status === "completed" ? "success" : null, display_title: title, created_at: "2026-10-11T08:00:05Z", ...extra });

test("entry: no-op when published or already under way; never cancels a pending run; else dispatch", () => {
  const now = T("2026-10-11T08:20:00Z");
  const published = rec(5, "content", "2026-10-11T08:14:00Z");
  assert.equal(decideEntry({ published, contentRuns: [], now }).action, "none");
  assert.match(decideEntry({ published, contentRuns: [], now }).reason, /already succeeded: run 2005/);
  const running = decideEntry({ published: null, contentRuns: [run(7, "in_progress", "daily-content (schedule)")], now });
  assert.equal(running.action, "none");
  assert.equal(running.run_id, "7");
  assert.equal(decideEntry({ published: null, contentRuns: [run(8, "pending", "daily-content (odoo)")], now }).action, "none", "a pending daily run is in flight");
  const blocked = decideEntry({ published: null, contentRuns: [run(9, "in_progress", "Content publish"), run(10, "pending", "feat: merge")], now });
  assert.equal(blocked.action, "blocked", "a pending merge run would be cancelled by a new run of the concurrency group");
  assert.equal(decideEntry({ published: null, contentRuns: [run(9, "in_progress", "feat: merge"), run(6, "completed", "daily-content (schedule)")], now }).action, "dispatch", "a running non-daily run only delays it");
  assert.equal(decideEntry({ published: null, contentRuns: [], now }).action, "dispatch");
});

test("watchdog: quiet before 09:00 UTC; after it ALERTs until published and dispatches only once", () => {
  const published = rec(5, "content", "2026-10-11T08:14:00Z");
  assert.deepEqual(
    [decideWatchdog({ published: null, now: T("2026-10-11T08:49:00Z") }).alert, decideWatchdog({ published: null, now: T("2026-10-11T08:49:00Z") }).dispatch],
    [false, false],
  );
  const ok = decideWatchdog({ published, now: T("2026-10-11T09:04:00Z") });
  assert.equal(ok.alert, false);
  assert.equal(ok.state, "published");
  const first = decideWatchdog({ published: null, contentRuns: [], entryRuns: [], now: T("2026-10-11T09:04:00Z") });
  assert.deepEqual([first.alert, first.dispatch], [true, true]);
  const again = decideWatchdog({
    published: null,
    contentRuns: [],
    entryRuns: [run(11, "completed", "daily-content (watchdog)", { created_at: "2026-10-11T09:04:30Z" })],
    now: T("2026-10-11T09:19:00Z"),
  });
  assert.deepEqual([again.alert, again.dispatch], [true, false], "dispatched once; still ALERT while nothing is published");
  const morningEntry = decideWatchdog({ published: null, contentRuns: [], entryRuns: [run(3, "completed", "daily-content (watchdog)", { created_at: "2026-10-11T08:59:00Z" })], now: T("2026-10-11T09:04:00Z") });
  assert.equal(morningEntry.dispatch, true, "only a watchdog dispatch since today's deadline counts");
  const inFlight = decideWatchdog({ published: null, contentRuns: [run(12, "in_progress", "daily-content (schedule)")], entryRuns: [], now: T("2026-10-11T09:04:00Z") });
  assert.deepEqual([inFlight.alert, inFlight.dispatch], [true, false], "late: ALERT, but the 08:40 publish is still running");
  const night = decideWatchdog({ published: null, now: T("2026-10-11T21:04:00Z") });
  assert.equal(night.state, "before-deadline", "after 20:30 UTC it is the next Tehran day, before its deadline");
});

// main() with a fake GitHub API ----------------------------------------------------------------------------------

function zipOf(t, body) {
  const dir = mkdtempSync(path.join(tmpdir(), "v11-daily-"));
  t.after(() => rmSync(dir, { recursive: true, force: true }));
  writeFileSync(path.join(dir, "live-release.json"), JSON.stringify(body));
  execFileSync("zip", ["-q", "a.zip", "live-release.json"], { cwd: dir });
  return readFileSync(path.join(dir, "a.zip"));
}

function fakeGh(t, { records = [], contentRuns = [], entryRuns = [] }) {
  const runs = {};
  const zips = {};
  const artifacts = records.map((r, i) => {
    const runId = Number(r.run_id);
    runs[runId] = { id: runId, head_branch: r.branch ?? "main", path: ".github/workflows/content-publish.yml", event: "workflow_dispatch" };
    zips[i + 1] = zipOf(t, r.body ?? r);
    return { id: i + 1, name: "v11-live-release", expired: false, created_at: r.artifact_at ?? r.live_since, workflow_run: { id: runId } };
  });
  const listed = [];
  return {
    listed,
    async json(p) {
      listed.push(p);
      if (p.startsWith("/actions/artifacts?name=v11-live-release")) return { artifacts };
      if (p.startsWith("/actions/workflows/content-publish.yml/runs")) return { workflow_runs: contentRuns.map((r) => ({ head_branch: "main", ...r })) };
      if (p.startsWith("/actions/workflows/daily-content.yml/runs")) return { workflow_runs: entryRuns.map((r) => ({ head_branch: "main", ...r })) };
      if (p.startsWith("/actions/runs/")) return runs[p.split("/")[3]];
      throw new Error(`unexpected ${p}`);
    },
    async download(id) {
      return zips[id];
    },
  };
}

function recorder() {
  const calls = [];
  const fn = async (workflow, inputs) => calls.push({ workflow, inputs });
  fn.calls = calls;
  return fn;
}

test("main status: an untrusted branch's record does not count as today's publish", async (t) => {
  const now = T("2026-10-11T08:20:00Z");
  const forged = { ...rec(6, "content", "2026-10-11T08:10:00Z"), branch: "attacker" };
  const gh = fakeGh(t, { records: [forged] });
  const logs = [];
  t.mock.method(console, "log", (s) => logs.push(s));
  assert.equal(await main(["status"], { gh, now }), 0);
  assert.equal(JSON.parse(logs[0]).published, null);
});

test("main entry: dispatches content-publish target=daily-content once and waits until the run is listed", async (t) => {
  const now = T("2026-10-11T08:00:30Z");
  const dispatch = recorder();
  let listedRuns = [];
  const gh = fakeGh(t, { records: [rec(1, "content", "2026-10-10T08:12:00Z")] });
  const base = gh.json;
  gh.json = async (p) => (p.startsWith("/actions/workflows/content-publish.yml/runs") ? { workflow_runs: listedRuns } : base(p));
  const sent = dispatch;
  const wrapped = async (w, i) => {
    await sent(w, i);
    listedRuns = [{ id: 77, status: "queued", head_branch: "main", display_title: "daily-content (schedule)", created_at: new Date().toISOString() }];
  };
  t.mock.method(console, "log", () => {});
  assert.equal(await main(["entry", "--source", "schedule"], { gh, dispatch: wrapped, now, waitOptions: { tries: 2, delayMs: 1 } }), 0);
  assert.deepEqual(dispatch.calls, [{ workflow: "content-publish.yml", inputs: { target: "daily-content", source: "schedule" } }]);
  await assert.rejects(main(["entry", "--source", "x; rm -rf"], { gh, dispatch: recorder(), now }), /invalid --source/);
});

test("main entry: today's publish → no-op, nothing dispatched", async (t) => {
  const dispatch = recorder();
  const gh = fakeGh(t, { records: [rec(5, "content", "2026-10-11T08:14:00Z")] });
  t.mock.method(console, "log", () => {});
  assert.equal(await main(["entry", "--source", "odoo"], { gh, dispatch, now: T("2026-10-11T08:40:30Z") }), 0);
  assert.equal(dispatch.calls.length, 0);
});

test("main watchdog: no API call before 09:00 UTC; after it ALERT (exit 1) and a single dispatch of daily-content", async (t) => {
  t.mock.method(console, "log", () => {});
  const early = fakeGh(t, {});
  assert.equal(await main(["watchdog"], { gh: early, dispatch: recorder(), now: T("2026-10-11T08:49:00Z") }), 0);
  assert.deepEqual(early.listed, []);

  const dispatch = recorder();
  const gh = fakeGh(t, { records: [rec(1, "content", "2026-10-10T08:12:00Z")] });
  assert.equal(await main(["watchdog"], { gh, dispatch, now: T("2026-10-11T09:04:00Z") }), 1);
  assert.deepEqual(dispatch.calls, [{ workflow: "daily-content.yml", inputs: { source: "watchdog" } }]);

  const later = recorder();
  const gh2 = fakeGh(t, { entryRuns: [run(11, "completed", "daily-content (watchdog)", { created_at: "2026-10-11T09:04:30Z" })] });
  assert.equal(await main(["watchdog"], { gh: gh2, dispatch: later, now: T("2026-10-11T09:19:00Z") }), 1);
  assert.equal(later.calls.length, 0);

  const done = fakeGh(t, { records: [rec(5, "content", "2026-10-11T09:30:00Z")] });
  assert.equal(await main(["watchdog"], { gh: done, dispatch: recorder(), now: T("2026-10-11T09:49:00Z") }), 0);
});
