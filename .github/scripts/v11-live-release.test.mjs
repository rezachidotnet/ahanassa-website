// node --test ".github/scripts/*.test.mjs"  — W9.7 live-code selection, CONTENT_REBUILD against the live code, and the
// observation decision (RELEASE_POLICY.md §19, §20.2, §20.5, §20.8). Synthetic SHAs, IDs and runs only (§14); the
// strict ledger resolver is the real lib/ci/release-ledger.ts read from the application branch.
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { test } from "node:test";
import {
  collectRecords,
  currentEvent,
  decide,
  evaluateContentRebuild,
  kindOf,
  legacyRecord,
  makeRecord,
  observe,
  productionHealthRuns,
  recordForSnapshot,
  resolveLive,
  shouldNotify,
  chainComplete,
} from "./v11-live-release.mjs";

const RESOLVER_SOURCE_REF = process.env.RESOLVER_SOURCE_REF ?? "origin/feat/v11-static-site";
const resolverSource = execFileSync("git", ["show", `${RESOLVER_SOURCE_REF}:lib/ci/release-ledger.ts`], { encoding: "utf8" });

const sha = (c) => c.repeat(40);
const vid = (n) => `00000000-0000-4000-8000-${String(n).padStart(12, "0")}`;
const snap = (n) => `snap-2026101000000${String(n).padStart(3, "0")}`;
const state = (n, prev, { prevVid = vid(n - 1) } = {}) => ({
  version: snap(n),
  previous_active_version: prev === null ? null : snap(prev),
  steps: ["staged_state", "staged_index", "deploy_started", "deployed", "smoke_passed", "switched", "finalized"],
  previous_worker_version_id: prevVid,
  deployed_worker_version_id: vid(n),
  switched: true,
});
const rec = (n, code, kind, at, extra = {}) =>
  makeRecord({ kind, codeSha: code, publishState: state(n, n - 1), previousCodeSha: extra.prevCode ?? null, risk: extra.risk ?? "HIGH", runId: 1000 + n, switchedAt: at });

test("makeRecord: only a finalized publish goes live; LOW/HIGH kept for releases only", () => {
  const r = rec(2, sha("b"), "release", "2026-10-10T10:00:00Z", { risk: "LOW", prevCode: sha("a") });
  assert.equal(r.risk, "LOW");
  assert.equal(r.previous_code_sha, sha("a"));
  assert.equal(r.previous_snapshot_version, snap(1));
  assert.equal(rec(3, sha("b"), "content", "2026-10-11T08:10:00Z").risk, null);
  assert.throws(() => makeRecord({ kind: "release", codeSha: sha("b"), publishState: { ...state(2, 1), steps: ["switched"] }, runId: 1, switchedAt: "2026-10-10T10:00:00Z" }), /not finalized/);
  assert.throws(() => makeRecord({ kind: "release", codeSha: "abc", publishState: state(2, 1), runId: 1, switchedAt: "2026-10-10T10:00:00Z" }), /code sha/);
});

test("chain: the live record is the one www serves; the event walks back through content publishes", () => {
  const a = rec(1, sha("a"), "release", "2026-10-09T10:00:00Z");
  const b = rec(2, sha("b"), "release", "2026-10-10T10:00:00Z", { risk: "LOW", prevCode: sha("a") });
  const c1 = rec(3, sha("b"), "content", "2026-10-11T08:10:00Z");
  const c2 = rec(4, sha("b"), "content", "2026-10-12T08:10:00Z");
  const records = [c1, a, c2, b];
  assert.equal(recordForSnapshot(records, snap(4)), c2);
  assert.equal(recordForSnapshot(records, snap(9)), null);
  const e = currentEvent(records, c2);
  assert.equal(e.run_id, b.run_id, "the release, not the content publish after it");
  assert.equal(e.risk, "LOW");
  assert.equal(currentEvent(records, a).run_id, a.run_id);
});

test("legacy evidence (pre-W9.7): kind derived from the record of its previous snapshot; risk defaults to HIGH", () => {
  const prev = legacyRecord({ contentRebuild: { codeSha: sha("a"), snapshotVersion: snap(1) }, publishState: state(1, 0), runId: 11, switchedAt: "2026-10-07T14:37:46Z" });
  const live = legacyRecord({ contentRebuild: { codeSha: sha("b"), snapshotVersion: snap(2) }, publishState: state(2, 1), runId: 12, switchedAt: "2026-10-09T13:59:40Z" });
  assert.ok(prev && live);
  assert.equal(kindOf(live, [prev, live]), "release");
  const e = currentEvent([prev, live], live);
  assert.equal(e.kind, "release");
  assert.equal(e.risk, "HIGH");
  assert.equal(e.previous_code_sha, sha("a"));
  assert.equal(legacyRecord({ contentRebuild: { codeSha: sha("b"), snapshotVersion: snap(2) }, publishState: { ...state(2, 1), steps: ["staged_state"] }, runId: 13, switchedAt: "2026-10-09T13:59:40Z" }), null, "not finalized");
  assert.equal(legacyRecord({ contentRebuild: { codeSha: sha("b"), snapshotVersion: snap(3) }, publishState: state(2, 1), runId: 14, switchedAt: "2026-10-09T13:59:40Z" }), null, "snapshot mismatch");
});

test("rollback record: the event is the rollback, not the release before it", () => {
  const a = rec(1, sha("a"), "release", "2026-10-09T10:00:00Z");
  const b = rec(2, sha("b"), "release", "2026-10-10T10:00:00Z", { risk: "LOW", prevCode: sha("a") });
  const rb = makeRecord({
    kind: "rollback",
    codeSha: sha("a"),
    publishState: { version: snap(1), previous_active_version: snap(2), deployed_worker_version_id: vid(1), previous_worker_version_id: vid(2), steps: ["rolled_back"] },
    previousCodeSha: sha("b"),
    runId: 2000,
    switchedAt: "2026-10-10T15:00:00Z",
    rolledBack: { code_sha: sha("b"), run_id: b.run_id },
  });
  const live = recordForSnapshot([a, b, rb], snap(1));
  assert.equal(live, rb, "the newest record for the snapshot");
  assert.equal(currentEvent([a, b, rb], live).kind, "rollback");
});

// resolveLive on a fixture repository --------------------------------------------------------------------------

const HEADER = "| RELEASE_SHA | WORKER_VERSION_ID | RELEASE_STATE | FINAL_TRAFFIC_PERCENT | STAGING_RUN_ID | PRODUCTION_RUN_ID | PROMOTION_RUN_ID | ROLLBACK_VERSION_ID | FINAL_RISK | RESULT | TIMESTAMP | NOTES |";
const SEP = "| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |";
const row = (s, st) => `| \`${s}\` | \`${vid(1)}\` | ${st} | 100 | \`1\` | \`1\` | \`1\` | \`${vid(2)}\` | HIGH | PASS | 2026-10-07T06:00:00Z | fixture |`;
const ledger = (rows) => ["# Ledger", "", HEADER, SEP, ...rows, "", "end"].join("\n");

function fixture(t) {
  const dir = mkdtempSync(path.join(tmpdir(), "v11-live-"));
  t.after(() => rmSync(dir, { recursive: true, force: true }));
  const g = (...a) => execFileSync("git", a, { cwd: dir, encoding: "utf8" }).trim();
  const write = (p, s) => {
    mkdirSync(path.dirname(path.join(dir, p)), { recursive: true });
    writeFileSync(path.join(dir, p), s);
  };
  const commit = (m) => {
    g("add", "-A");
    g("commit", "-q", "-m", m);
    return g("rev-parse", "HEAD");
  };
  g("init", "-q", "-b", "feat/v11-static-site");
  g("config", "user.email", "fixture@example.invalid");
  g("config", "user.name", "fixture");
  write("lib/ci/release-ledger.ts", resolverSource);
  write("scripts/content/publish.ts", "// pipeline");
  const stable = commit("stable release");
  write("docs/release/PRODUCTION_DEPLOYMENT_MANIFEST.md", ledger([row(stable, "STABLE_100")]));
  commit("STABLE_100 row");
  write("styles/base.css", "a{}");
  const live = commit("LOW release, live, not yet STABLE_100");
  write("lib/pricing/x.ts", "export {}");
  const tip = commit("a later merge, not released");
  return { dir, g, write, commit, stable, live, tip };
}

test("live selection: the 08:00 build gets the LIVE code — not the older STABLE_100, not the branch tip", async (t) => {
  const f = fixture(t);
  const records = [rec(1, f.stable, "release", "2026-10-07T14:37:46Z"), rec(2, f.live, "release", "2026-10-09T14:00:00Z", { risk: "LOW", prevCode: f.stable })];
  const r = await resolveLive({ app: f.dir, ledgerRef: "HEAD", snapshot: snap(2), records });
  assert.equal(r.eligible, true, r.reason);
  assert.equal(r.sha, f.live);
  assert.notEqual(r.sha, f.stable, "never the older STABLE_100 (that would downgrade www)");
  assert.notEqual(r.sha, f.tip, "never the branch tip (that would release unapproved code)");
  assert.equal(r.stable_sha, f.stable);
  assert.equal(r.event.risk, "LOW");
});

test("live selection: right after a STABLE_100 row the live code is that release", async (t) => {
  const f = fixture(t);
  const r = await resolveLive({ app: f.dir, ledgerRef: "HEAD", snapshot: snap(1), records: [rec(1, f.stable, "release", "2026-10-07T14:37:46Z")] });
  assert.equal(r.eligible, true);
  assert.equal(r.sha, f.stable);
});

test("live selection refuses: unknown snapshot, foreign SHA, older than STABLE_100 (downgrade)", async (t) => {
  const f = fixture(t);
  const none = await resolveLive({ app: f.dir, ledgerRef: "HEAD", snapshot: snap(7), records: [rec(1, f.stable, "release", "2026-10-07T14:37:46Z")] });
  assert.equal(none.ok, false);
  assert.equal(none.eligible, false);
  assert.match(none.reason, /no trusted production publish record/);

  f.g("checkout", "-q", "-b", "elsewhere", f.stable);
  f.write("x.txt", "x");
  const foreign = f.commit("not on the ledger branch");
  f.g("checkout", "-q", "feat/v11-static-site");
  const fr = await resolveLive({ app: f.dir, ledgerRef: "feat/v11-static-site", snapshot: snap(2), records: [rec(2, foreign, "release", "2026-10-09T14:00:00Z")] });
  assert.equal(fr.eligible, false);
  assert.match(fr.reason, /not on/);

  // The ledger moves on to a newer STABLE_100 while www still serves an older code (it must never be built again).
  f.write("docs/release/PRODUCTION_DEPLOYMENT_MANIFEST.md", ledger([row(f.stable, "STABLE_100"), row(f.tip, "STABLE_100")]));
  f.commit("tip is STABLE_100");
  const down = await resolveLive({ app: f.dir, ledgerRef: "HEAD", snapshot: snap(2), records: [rec(2, f.live, "release", "2026-10-09T14:00:00Z")] });
  assert.equal(down.eligible, false);
  assert.match(down.reason, /downgrade/);
});

// collectRecords with a fake GitHub API -------------------------------------------------------------------------

function zipOf(t, files) {
  const dir = mkdtempSync(path.join(tmpdir(), "v11-zip-"));
  t.after(() => rmSync(dir, { recursive: true, force: true }));
  for (const [name, body] of Object.entries(files)) writeFileSync(path.join(dir, name), typeof body === "string" ? body : JSON.stringify(body));
  execFileSync("zip", ["-q", "a.zip", ...Object.keys(files)], { cwd: dir });
  return readFileSync(path.join(dir, "a.zip"));
}

test("collectRecords: only artifacts of trusted runs on main count; legacy evidence is read when needed", async (t) => {
  const good = rec(5, sha("c"), "release", "2026-10-10T10:00:00Z");
  const forged = { ...rec(6, sha("d"), "release", "2026-10-11T10:00:00Z"), run_id: "1006" };
  const runs = {
    1005: { id: 1005, head_branch: "main", path: ".github/workflows/content-publish.yml", event: "workflow_run" },
    1006: { id: 1006, head_branch: "attacker", path: ".github/workflows/content-publish.yml", event: "workflow_dispatch" },
    1007: { id: 1007, head_branch: "main", path: ".github/workflows/other.yml", event: "workflow_dispatch" },
    900: { id: 900, head_branch: "main", path: ".github/workflows/content-publish.yml", event: "workflow_dispatch", status: "completed" },
  };
  const zips = {
    1: zipOf(t, { "live-release.json": good }),
    2: zipOf(t, { "live-release.json": forged }),
    3: zipOf(t, { "live-release.json": { ...good, run_id: "1007" } }),
    4: zipOf(t, { "content-rebuild.json": { codeSha: sha("a"), snapshotVersion: snap(4) }, "publish-state.production.json": state(4, 3) }),
  };
  const gh = {
    async json(p) {
      if (p.startsWith("/actions/artifacts?name=")) {
        return { artifacts: [1, 2, 3].map((id) => ({ id, name: "v11-live-release", expired: false, workflow_run: { id: [1005, 1006, 1007][id - 1] } })) };
      }
      if (p.startsWith("/actions/runs/") && p.endsWith("/artifacts?per_page=100")) return { artifacts: [{ id: 4, name: "production-prep-evidence-900", expired: false }] };
      if (p.startsWith("/actions/runs/900/jobs")) return { jobs: [{ name: "publish-production (production-prep, …)", steps: [{ name: "12. Switch production active_version", conclusion: "success", completed_at: "2026-10-09T13:59:40.000Z" }] }] };
      if (p.startsWith("/actions/runs/")) return runs[p.split("/")[3]];
      if (p.startsWith("/actions/workflows/content-publish.yml/runs")) return { workflow_runs: [runs[900]] };
      throw new Error(`unexpected ${p}`);
    },
    async download(id) {
      return zips[id];
    },
  };
  const all = await collectRecords(gh, { enough: () => false });
  assert.deepEqual(all.map((r) => r.run_id).sort(), ["1005", "900"], "the attacker-branch and other-workflow artifacts are ignored");
  const legacy = all.find((r) => r.run_id === "900");
  assert.equal(legacy.code_sha, sha("a"));
  assert.equal(legacy.live_since, "2026-10-09T13:59:40Z");
  const quick = await collectRecords(gh, { enough: (rs) => rs.length >= 1 });
  assert.deepEqual(quick.map((r) => r.run_id), ["1005"], "the legacy walk is skipped once the chain is complete");
});

// CONTENT_REBUILD against the live code ------------------------------------------------------------------------

const manifest = (over = {}) => ({
  schema_version: "artifact.v1",
  code_sha: sha("b"),
  snapshot_version: snap(3),
  environment: "production",
  pipeline: { allow_decrease: false, overridden_decreases: [] },
  public_assets: [{ path: "index.html" }],
  ...over,
});

test("content check: AUTO for the live code (even when it is not yet STABLE_100); everything else refused", () => {
  assert.equal(evaluateContentRebuild(manifest(), sha("b")).result, "AUTO");
  const older = evaluateContentRebuild(manifest({ code_sha: sha("a") }), sha("b"));
  assert.equal(older.result, "REFUSED");
  assert.equal(older.code, "CODE_SHA_NOT_LIVE", "the old STABLE_100 code is not a content rebuild of a newer live release");
  assert.equal(evaluateContentRebuild(manifest(), null).code, "LIVE_CODE_UNRESOLVED");
  assert.equal(evaluateContentRebuild(manifest({ environment: "staging" }), sha("b")).code, "TARGET_NOT_PRODUCTION");
  assert.equal(evaluateContentRebuild(manifest({ pipeline: undefined }), sha("b")).code, "NOT_A_CONTENT_PIPELINE_ARTIFACT");
  assert.equal(evaluateContentRebuild(manifest({ public_assets: [{ path: "_worker.js" }] }), sha("b")).code, "NOT_STATIC_ONLY");
  assert.equal(evaluateContentRebuild(manifest({ pipeline: { allow_decrease: true, overridden_decreases: [] } }), sha("b")).result, "APPROVAL_REQUIRED");
  assert.equal(evaluateContentRebuild(manifest({ pipeline: { allow_decrease: false, overridden_decreases: [{ key: "k" }] } }), sha("b")).result, "APPROVAL_REQUIRED");
});

// Observation + decision ---------------------------------------------------------------------------------------

const LIVE = "2026-10-10T10:00:00Z";
const at = (h, m = 0) => new Date(Date.parse(LIVE) + h * 3_600_000 + m * 60_000).toISOString().replace(/\.\d+Z$/, "Z");
const every15 = (fromH, toH, failAtH = null) => {
  const out = [];
  for (let m = fromH * 60 + 4; m <= toH * 60; m += 15) out.push({ run_id: String(m), started_at: at(0, m), conclusion: failAtH !== null && Math.abs(m - failAtH * 60) < 8 ? "failure" : "success" });
  return out;
};

test("observe: 24 h covered with no ALERT = PASSED; before the end = OBSERVING", () => {
  const p = observe(LIVE, every15(0, 24.3), new Date(at(24, 30)));
  assert.equal(p.state, "PASSED");
  assert.ok(Date.parse(p.observation_ended_at) >= Date.parse(at(24)));
  assert.equal(observe(LIVE, every15(0, 12), new Date(at(12, 5))).state, "OBSERVING");
});

test("observe: an ALERT inside the window, or on the run that covers its end, stops it; one after it does not", () => {
  assert.equal(observe(LIVE, every15(0, 24.3, 5), new Date(at(25))).state, "ALERT");
  const runs = every15(0, 24.3);
  const cover = runs.find((r) => Date.parse(r.started_at) >= Date.parse(at(24)));
  cover.conclusion = "failure";
  assert.equal(observe(LIVE, runs, new Date(at(25))).state, "ALERT", "the covering run still reports on the window's end");
  const later = [...every15(0, 24.3), { run_id: "late", started_at: at(30), conclusion: "failure" }];
  assert.equal(observe(LIVE, later, new Date(at(31))).state, "PASSED");
  assert.equal(observe(LIVE, [{ run_id: "x", started_at: at(-1), conclusion: "failure" }, ...every15(0, 24.3)], new Date(at(25))).state, "PASSED", "before go-live does not count");
});

test("observe: gaps up to 24 h are covered by the next run; a longer one is a GAP for the owner", () => {
  const covered = [...every15(0, 3), ...every15(9, 24.3)];
  const o = observe(LIVE, covered, new Date(at(25)));
  assert.equal(o.state, "PASSED");
  assert.ok(o.gaps.some((g) => g.minutes > 300 && g.covered));
  const gap = observe(LIVE, [...every15(0, 0.5), { run_id: "y", started_at: at(25), conclusion: "success" }], new Date(at(25, 5)));
  assert.equal(gap.state, "GAP");
});

test("productionHealthRuns: successful runs count whole; others are read job by job (stuck staging job)", async () => {
  const gh = {
    async json(p) {
      if (p.includes("/workflows/ops-health.yml/runs")) {
        return {
          workflow_runs: [
            { id: 1, head_branch: "main", status: "completed", conclusion: "success", run_started_at: at(1) },
            { id: 2, head_branch: "main", status: "in_progress", conclusion: null, run_started_at: at(2) },
            { id: 3, head_branch: "main", status: "completed", conclusion: "cancelled", run_started_at: at(3) },
            { id: 4, head_branch: "other", status: "completed", conclusion: "failure", run_started_at: at(4) },
            { id: 5, head_branch: "main", status: "completed", conclusion: "success", run_started_at: at(-2) },
          ],
        };
      }
      if (p.startsWith("/actions/runs/2/jobs")) return { jobs: [{ name: "health (staging)", status: "waiting" }, { name: "health (production-prep)", status: "completed", conclusion: "failure", started_at: at(2, 1) }] };
      if (p.startsWith("/actions/runs/3/jobs")) return { jobs: [{ name: "health (production-prep)", status: "completed", conclusion: "cancelled", started_at: at(3, 1) }] };
      throw new Error(`unexpected ${p}`);
    },
  };
  const runs = await productionHealthRuns(gh, LIVE);
  assert.deepEqual(runs.map((r) => [r.run_id, r.conclusion]), [["1", "success"], ["2", "failure"]]);
});

test("decide: LOW + ALERT = automatic rollback; HIGH + ALERT = owner; PASSED = STABLE_100 row; recorded = nothing", () => {
  const low = { kind: "release", code_sha: sha("b"), risk: "LOW", previous_worker_version_id: vid(1), previous_snapshot_version: snap(1), previous_code_sha: sha("a") };
  const high = { ...low, risk: "HIGH" };
  const alert = { state: "ALERT", alerts: [{ run_id: "9" }], runs: [], gaps: [] };
  const passed = { state: "PASSED", alerts: [], runs: [{ run_id: "1" }], gaps: [] };
  assert.equal(decide({ event: low, observation: alert, rows: [] }).action, "rollback");
  assert.equal(decide({ event: high, observation: alert, rows: [] }).action, "alert");
  assert.equal(decide({ event: { ...low, previous_worker_version_id: null }, observation: alert, rows: [] }).action, "alert", "no recorded target: never a blind rollback");
  assert.equal(decide({ event: high, observation: passed, rows: [] }).action, "stable");
  assert.equal(decide({ event: low, observation: passed, rows: [{ sha: sha("b"), state: "STABLE_100" }] }).action, "none");
  assert.equal(decide({ event: high, observation: { ...passed, state: "OBSERVING" }, rows: [] }).action, "observing");
  assert.equal(decide({ event: high, observation: { ...passed, state: "GAP" }, rows: [] }).action, "gap");
  assert.equal(decide({ event: high, observation: passed, rows: [], operation: "rollback" }).action, "rollback", "owner one-tap rollback");
  const rb = { kind: "rollback", code_sha: sha("a"), rolled_back: { code_sha: sha("b") } };
  assert.equal(decide({ event: rb, observation: null, rows: [] }).action, "rolled-back");
  assert.equal(decide({ event: rb, observation: null, rows: [{ sha: sha("b"), state: "ROLLED_BACK" }] }).action, "none");
  assert.equal(decide({ event: rb, observation: null, rows: [], operation: "rollback" }).action, "none", "a rollback is never rolled back");
  assert.equal(decide({ event: null, observation: null, rows: [] }).action, "none");
  assert.equal(decide({ event: { ...low, previous_code_sha: null }, observation: alert, rows: [] }).action, "alert", "previous code unknown: no automatic rollback");
  assert.equal(decide({ event: high, observation: passed, rows: [{ sha: sha("b"), state: "STABLE_100" }], operation: "rollback" }).refused, true, "a STABLE_100 release is §13, not this path");
  assert.equal(decide({ event: { kind: "unknown", reason: "x" }, observation: null, rows: [] }).action, "unknown");
});

test("unidentifiable events go to the owner: a legacy record without its previous record, a broken chain", () => {
  const orphan = legacyRecord({ contentRebuild: { codeSha: sha("b"), snapshotVersion: snap(5) }, publishState: state(5, 4), runId: 15, switchedAt: "2026-10-09T13:59:40Z" });
  assert.equal(kindOf(orphan, [orphan]), "unknown");
  assert.equal(currentEvent([orphan], orphan).kind, "unknown");
  const b = rec(2, sha("b"), "release", "2026-10-10T10:00:00Z", { risk: "LOW", prevCode: sha("a") });
  const rb = makeRecord({ kind: "rollback", codeSha: sha("a"), publishState: { version: snap(1), previous_active_version: snap(2), deployed_worker_version_id: vid(1), previous_worker_version_id: vid(2), steps: [] }, previousCodeSha: sha("b"), runId: 2000, switchedAt: "2026-10-10T15:00:00Z", rolledBack: { code_sha: sha("b"), run_id: b.run_id } });
  const raced = rec(3, sha("b"), "content", "2026-10-10T15:05:00Z");
  assert.equal(currentEvent([b, rb, raced], raced).kind, "unknown", "a publish of the rolled-back code after the rollback");
});

test("notify: an ALERT e-mails once per new failed run; a gap or unknown once a day", () => {
  const now = new Date("2026-10-10T12:52:00Z");
  assert.equal(shouldNotify({ action: "alert" }, { alerts: [{ started_at: "2026-10-10T12:04:00Z" }] }, now), true);
  assert.equal(shouldNotify({ action: "alert" }, { alerts: [{ started_at: "2026-10-10T09:04:00Z" }] }, now), false);
  assert.equal(shouldNotify({ action: "gap" }, null, now), false);
  assert.equal(shouldNotify({ action: "gap" }, null, new Date("2026-10-10T08:52:00Z")), true);
  assert.equal(shouldNotify({ action: "stable" }, null, now), false);
});

test("chainComplete: the legacy walk does not stop at a record whose predecessor is still unread", () => {
  const prev = legacyRecord({ contentRebuild: { codeSha: sha("a"), snapshotVersion: snap(1) }, publishState: state(1, 0), runId: 11, switchedAt: "2026-10-07T14:37:46Z" });
  const live = legacyRecord({ contentRebuild: { codeSha: sha("b"), snapshotVersion: snap(2) }, publishState: state(2, 1), runId: 12, switchedAt: "2026-10-09T13:59:40Z" });
  assert.equal(chainComplete(snap(2))([live]), false);
  assert.equal(chainComplete(snap(2))([live, prev]), true);
});
