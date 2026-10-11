// node --test ".github/scripts/*.test.mjs"  — W11.2: the content publish runs whenever Odoo has approved prices newer
// than the ones live on www (the Odoo timer, Odoo after a price publish, GitHub schedules as backup), and the 09:00 UTC
// watchdog ALERTs when they stay unpublished. Synthetic SHAs, IDs, prices and runs only (§14).
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { test } from "node:test";
import { decideEntry, decideNeeded, decideWatchdog, main, newestPublishedPriceAt, tehranDate, watchdogDeadline } from "./v11-daily-content.mjs";
import { makeRecord, recordProblems } from "./v11-live-release.mjs";

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
const rec = (n, kind, at, fetchedAt = null) =>
  makeRecord({ kind, codeSha: sha("b"), publishState: state(n), previousCodeSha: sha("a"), risk: "LOW", runId: 2000 + n, switchedAt: at, contentFetchedAt: fetchedAt });
const T = (iso) => new Date(iso);
const price = (at, onRequest = false) => ({ price_on_request: onRequest, published_at_utc: at });

test("record: content_fetched_at is optional, validated when present", () => {
  assert.equal(rec(1, "content", "2026-10-11T08:14:00Z").content_fetched_at, undefined, "older records have none");
  assert.equal(rec(2, "content", "2026-10-11T08:14:00Z", "2026-10-11T08:01:12.345Z").content_fetched_at, "2026-10-11T08:01:12.345Z");
  assert.deepEqual(recordProblems({ ...rec(3, "content", "2026-10-11T08:14:00Z"), content_fetched_at: "yesterday" }), ["content_fetched_at"]);
});

test("Odoo's newest price: numeric prices only, by instant", () => {
  assert.equal(newestPublishedPriceAt({ data: [price("2026-10-11T05:00:00Z"), price("2026-10-11T09:00:00Z", true), price("2026-10-11T06:30:00+00:00")] }), "2026-10-11T06:30:00+00:00");
  assert.equal(newestPublishedPriceAt({ data: [price("2026-10-11T05:00:00Z", true)] }), null);
  assert.throws(() => newestPublishedPriceAt({ rows: [] }), /not \{data/);
});

test("needed: only a price published after the live snapshot's fetch began; unknown live state publishes", () => {
  assert.equal(decideNeeded({ odooNewest: "2026-10-11T07:10:00Z", liveFetchedAt: "2026-10-11T07:00:00Z" }).needed, true);
  assert.equal(decideNeeded({ odooNewest: "2026-10-11T06:59:00Z", liveFetchedAt: "2026-10-11T07:00:00Z" }).needed, false, "already in the live snapshot");
  assert.equal(decideNeeded({ odooNewest: "2026-10-11T07:00:00Z", liveFetchedAt: "2026-10-11T07:00:00.000Z" }).needed, false);
  assert.equal(decideNeeded({ odooNewest: null, liveFetchedAt: "2026-10-11T07:00:00Z" }).needed, false);
  assert.equal(decideNeeded({ odooNewest: "2026-10-01T07:00:00Z", liveFetchedAt: null }).needed, true);
});

const run = (id, status, title, extra = {}) => ({ id, status, conclusion: status === "completed" ? "success" : null, display_title: title, created_at: "2026-10-11T08:00:05Z", ...extra });
const NEEDED = { needed: true, reason: "newer" };
const LIVE = { needed: false, reason: "live" };

test("entry: no-op when not needed or already under way; never cancels a pending run; else dispatch", () => {
  assert.equal(decideEntry({ need: LIVE, contentRuns: [] }).action, "none");
  const running = decideEntry({ need: NEEDED, contentRuns: [run(7, "in_progress", "daily-content (odoo-timer)")] });
  assert.deepEqual([running.action, running.run_id], ["none", "7"]);
  assert.equal(decideEntry({ need: NEEDED, contentRuns: [run(8, "pending", "daily-content (odoo)")] }).action, "none", "a pending daily run is in flight");
  assert.equal(decideEntry({ need: NEEDED, contentRuns: [run(9, "in_progress", "Content publish"), run(10, "pending", "feat: merge")] }).action, "blocked");
  assert.equal(decideEntry({ need: NEEDED, contentRuns: [run(9, "in_progress", "feat: merge"), run(6, "completed", "daily-content (schedule)")] }).action, "dispatch");
});

test("Tehran day and the watchdog deadline (09:00 UTC; after 20:30 UTC it is the next Tehran day)", () => {
  assert.equal(tehranDate("2026-10-11T20:30:00Z"), "2026-10-12");
  assert.equal(new Date(watchdogDeadline(T("2026-10-11T08:59:00Z"))).toISOString(), "2026-10-11T09:00:00.000Z");
  assert.equal(new Date(watchdogDeadline(T("2026-10-11T21:00:00Z"))).toISOString(), "2026-10-12T09:00:00.000Z");
});

test("watchdog: quiet before 09:00 UTC and within the grace; ALERT after; dispatches once per price update", () => {
  const odooNewest = "2026-10-11T08:30:00Z";
  assert.equal(decideWatchdog({ need: NEEDED, odooNewest: "2026-10-11T06:00:00Z", now: T("2026-10-11T08:49:00Z") }).alert, false);
  assert.equal(decideWatchdog({ need: LIVE, odooNewest, now: T("2026-10-11T09:04:00Z") }).state, "live");
  const due = decideWatchdog({ need: NEEDED, odooNewest: "2026-10-11T09:00:00Z", now: T("2026-10-11T09:34:00Z") });
  assert.deepEqual([due.state, due.alert], ["due", false], "a publish started by Odoo's own trigger gets 45 min");
  const first = decideWatchdog({ need: NEEDED, odooNewest, now: T("2026-10-11T09:19:00Z") });
  assert.deepEqual([first.alert, first.dispatch], [true, true]);
  const again = decideWatchdog({ need: NEEDED, odooNewest, entryRuns: [run(11, "completed", "daily-content (watchdog)", { created_at: "2026-10-11T09:19:30Z" })], now: T("2026-10-11T09:34:00Z") });
  assert.deepEqual([again.alert, again.dispatch], [true, false], "once for these prices; still ALERT while they are not live");
  const newerPrices = decideWatchdog({ need: NEEDED, odooNewest: "2026-10-11T12:00:00Z", entryRuns: [run(11, "completed", "daily-content (watchdog)", { created_at: "2026-10-11T09:19:30Z" })], now: T("2026-10-11T12:49:00Z") });
  assert.equal(newerPrices.dispatch, true, "a later price update earns its own dispatch");
  const inFlight = decideWatchdog({ need: NEEDED, odooNewest, contentRuns: [run(12, "in_progress", "daily-content (odoo-timer)")], now: T("2026-10-11T09:19:00Z") });
  assert.deepEqual([inFlight.alert, inFlight.dispatch], [true, false]);
  assert.equal(decideWatchdog({ need: NEEDED, odooNewest, now: T("2026-10-11T21:04:00Z") }).state, "before-deadline");
});

// main() with fake GitHub, Odoo and www ---------------------------------------------------------------------------

function zipOf(t, body) {
  const dir = mkdtempSync(path.join(tmpdir(), "v11-daily-"));
  t.after(() => rmSync(dir, { recursive: true, force: true }));
  writeFileSync(path.join(dir, "live-release.json"), JSON.stringify(body));
  execFileSync("zip", ["-q", "a.zip", "live-release.json"], { cwd: dir });
  return readFileSync(path.join(dir, "a.zip"));
}

function world(t, { records = [], contentRuns = [], entryRuns = [], wwwSnap = snap(5), odoo = [], fetchStep = {} }) {
  const runs = {};
  const zips = {};
  const artifacts = records.map((r, i) => {
    const runId = Number(r.run_id);
    runs[runId] = { id: runId, head_branch: r.branch ?? "main", path: ".github/workflows/content-publish.yml", event: "workflow_dispatch" };
    zips[i + 1] = zipOf(t, r);
    return { id: i + 1, name: "v11-live-release", expired: false, created_at: r.live_since, workflow_run: { id: runId } };
  });
  const listed = [];
  const gh = {
    listed,
    async json(p) {
      listed.push(p);
      if (p.startsWith("/actions/artifacts?name=v11-live-release")) return { artifacts };
      if (p.startsWith("/actions/workflows/content-publish.yml/runs?status=completed")) return { workflow_runs: [] };
      if (p.startsWith("/actions/workflows/content-publish.yml/runs")) return { workflow_runs: contentRuns.map((r) => ({ head_branch: "main", ...r })) };
      if (p.startsWith("/actions/workflows/daily-content.yml/runs")) return { workflow_runs: entryRuns.map((r) => ({ head_branch: "main", ...r })) };
      const jobs = /^\/actions\/runs\/(\d+)\/jobs/.exec(p);
      if (jobs) return { jobs: [{ name: "build (fetch, validate, snapshot, export, checks)", steps: fetchStep[jobs[1]] ? [{ name: "5. Fetch (Odoo full fetch)", started_at: fetchStep[jobs[1]] }] : [] }] };
      if (p.startsWith("/actions/runs/")) return runs[p.split("/")[3]];
      throw new Error(`unexpected ${p}`);
    },
    async download(id) {
      return zips[id];
    },
  };
  const fetchImpl = async (url) => {
    listed.push(url);
    if (url.startsWith("https://odoo.ahanassa.com/api/v1/pricing/current")) return new Response(JSON.stringify({ data: odoo }), { status: 200 });
    if (url.startsWith("https://www.ahanassa.com/manifest.public.json")) return new Response(JSON.stringify({ snapshot_version: wwwSnap }), { status: 200 });
    throw new Error(`unexpected fetch ${url}`);
  };
  return { gh, fetchImpl, listed };
}

function recorder() {
  const calls = [];
  const fn = async (workflow, inputs) => calls.push({ workflow, inputs });
  fn.calls = calls;
  return fn;
}

test("main status: the live snapshot's record (not a rollback, not an untrusted branch) decides", async (t) => {
  const logs = [];
  t.mock.method(console, "log", (s) => logs.push(s));
  const live = rec(5, "content", "2026-10-11T08:14:00Z", "2026-10-11T08:01:00Z");
  const rollback = { ...rec(6, "release", "2026-10-11T10:00:00Z"), kind: "rollback", snapshot_version: snap(5) };
  const forged = { ...rec(7, "content", "2026-10-11T11:00:00Z", "2026-10-11T10:59:00Z"), snapshot_version: snap(5), branch: "attacker" };
  const w = world(t, { records: [forged, rollback, live], odoo: [price("2026-10-11T07:59:00Z")] });
  assert.equal(await main(["status"], { gh: w.gh, fetchImpl: w.fetchImpl }), 0);
  const out = JSON.parse(logs[0]);
  assert.equal(out.live.at, "2026-10-11T08:01:00Z");
  assert.equal(out.need.needed, false);
});

test("main status: an older record without content_fetched_at falls back to its run's fetch step", async (t) => {
  const logs = [];
  t.mock.method(console, "log", (s) => logs.push(s));
  const w = world(t, { records: [rec(5, "release", "2026-10-09T13:59:54Z")], fetchStep: { 2005: "2026-10-09T13:45:12Z" }, odoo: [price("2026-10-10T06:00:00Z")] });
  await main(["status"], { gh: w.gh, fetchImpl: w.fetchImpl });
  const out = JSON.parse(logs[0]);
  assert.deepEqual([out.live.at, out.need.needed], ["2026-10-09T13:45:12Z", true]);
});

test("main entry: newer prices → dispatch content-publish target=daily-content and wait for the run; else no-op", async (t) => {
  t.mock.method(console, "log", () => {});
  const dispatch = recorder();
  let listedRuns = [];
  const w = world(t, { records: [rec(5, "content", "2026-10-10T08:14:00Z", "2026-10-10T08:01:00Z")], odoo: [price("2026-10-11T07:40:00Z")] });
  const base = w.gh.json;
  w.gh.json = async (p) => (p.startsWith("/actions/workflows/content-publish.yml/runs?per_page") ? { workflow_runs: listedRuns } : base(p));
  const send = async (wf, i) => {
    await dispatch(wf, i);
    listedRuns = [{ id: 77, status: "queued", head_branch: "main", display_title: "daily-content (odoo-timer)", created_at: new Date().toISOString() }];
  };
  assert.equal(await main(["entry", "--source", "odoo-timer"], { gh: w.gh, fetchImpl: w.fetchImpl, dispatch: send, waitOptions: { tries: 2, delayMs: 1 } }), 0);
  assert.deepEqual(dispatch.calls, [{ workflow: "content-publish.yml", inputs: { target: "daily-content", source: "odoo-timer" } }]);

  const none = recorder();
  const w2 = world(t, { records: [rec(5, "content", "2026-10-11T08:14:00Z", "2026-10-11T08:01:00Z")], odoo: [price("2026-10-11T07:40:00Z")] });
  assert.equal(await main(["entry", "--source", "odoo"], { gh: w2.gh, fetchImpl: w2.fetchImpl, dispatch: none }), 0);
  assert.equal(none.calls.length, 0);
  await assert.rejects(main(["entry", "--source", "x; rm -rf"], { gh: w2.gh, fetchImpl: w2.fetchImpl, dispatch: recorder() }), /invalid --source/);
});

test("main: Odoo unreachable → could not run (no dispatch)", async (t) => {
  t.mock.method(console, "log", () => {});
  const w = world(t, {});
  const down = async (url) => (url.startsWith("https://odoo") ? new Response("", { status: 502 }) : w.fetchImpl(url));
  const dispatch = recorder();
  await assert.rejects(main(["entry", "--source", "odoo"], { gh: w.gh, fetchImpl: down, dispatch }), /HTTP 502/);
  assert.equal(dispatch.calls.length, 0);
});

test("main watchdog: no request before 09:00 UTC; after it ALERT (exit 1) + one dispatch of daily-content", async (t) => {
  t.mock.method(console, "log", () => {});
  const early = world(t, {});
  assert.equal(await main(["watchdog"], { gh: early.gh, fetchImpl: early.fetchImpl, dispatch: recorder(), now: T("2026-10-11T08:49:00Z") }), 0);
  assert.deepEqual(early.listed, []);

  const dispatch = recorder();
  const w = world(t, { records: [rec(5, "content", "2026-10-10T08:14:00Z", "2026-10-10T08:01:00Z")], odoo: [price("2026-10-11T07:40:00Z")] });
  assert.equal(await main(["watchdog"], { gh: w.gh, fetchImpl: w.fetchImpl, dispatch, now: T("2026-10-11T09:04:00Z") }), 1);
  assert.deepEqual(dispatch.calls, [{ workflow: "daily-content.yml", inputs: { source: "watchdog" } }]);

  const ok = world(t, { records: [rec(5, "content", "2026-10-11T08:14:00Z", "2026-10-11T08:01:00Z")], odoo: [price("2026-10-11T07:40:00Z")] });
  assert.equal(await main(["watchdog"], { gh: ok.gh, fetchImpl: ok.fetchImpl, dispatch: recorder(), now: T("2026-10-11T09:04:00Z") }), 0);
});
