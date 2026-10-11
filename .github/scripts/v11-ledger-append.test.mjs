// node --test ".github/scripts/*.test.mjs"  — W9.7 automatic ledger rows (RELEASE_POLICY.md §20.3, §20.8). The strict
// resolver is the real lib/ci/release-ledger.ts from the application branch; synthetic SHAs/IDs only (§14).
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { test } from "node:test";
import { appendRow, hasRow, prBody, rolledBackRow, stableRow } from "./v11-ledger-append.mjs";

const RESOLVER_SOURCE_REF = process.env.RESOLVER_SOURCE_REF ?? "origin/feat/v11-static-site";
const dir = mkdtempSync(path.join(tmpdir(), "v11-ledger-test-"));
writeFileSync(path.join(dir, "release-ledger.ts"), execFileSync("git", ["show", `${RESOLVER_SOURCE_REF}:lib/ci/release-ledger.ts`], { encoding: "utf8" }));
const { resolveBaseProductionShaFromManifest } = await import(pathToFileURL(path.join(dir, "release-ledger.ts")).href);

const sha = (c) => c.repeat(40);
const vid = (n) => `00000000-0000-4000-8000-${String(n).padStart(12, "0")}`;
const HEADER = "| RELEASE_SHA | WORKER_VERSION_ID | RELEASE_STATE | FINAL_TRAFFIC_PERCENT | STAGING_RUN_ID | PRODUCTION_RUN_ID | PROMOTION_RUN_ID | ROLLBACK_VERSION_ID | FINAL_RISK | RESULT | TIMESTAMP | NOTES |";
const SEP = "| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |";
const old = `| \`${sha("a")}\` | \`${vid(1)}\` | STABLE_100 | 100 | \`1\` | \`1\` | \`1\` | \`${vid(0)}\` | HIGH | PASS | 2026-10-07T14:37:46Z | earlier |`;
const LEDGER = ["# Production Deployment Manifest", "", "## Ledger (RELEASE_POLICY.md schema)", "", HEADER, SEP, old, "", "Text after the table.", "", "## Ledger (legacy format)", "| Date (UTC) | x |", "| --- | --- |", "| 2026 | y |", ""].join("\n");

const watch = {
  action: "stable",
  event: { kind: "release", code_sha: sha("b"), deployed_worker_version_id: vid(2), previous_worker_version_id: vid(1), run_id: "37939029097", snapshot_version: "snap-2026100913460400", risk: "LOW", live_since: "2026-10-09T13:59:40Z" },
  observation: {
    state: "PASSED",
    observation_started_at: "2026-10-09T13:59:40.000Z",
    observation_ended_at: "2026-10-10T14:04:00Z",
    runs: [{ run_id: "11", started_at: "2026-10-09T14:04:00Z", conclusion: "success" }, { run_id: "12", started_at: "2026-10-10T14:04:00Z", conclusion: "success" }],
    gaps: [{ from: "2026-10-09T20:00:00Z", to: "2026-10-09T23:00:00Z", minutes: 180, covered: true }],
  },
};

test("STABLE_100 row: §20.3 mapping, one line appended to the RELEASE_SHA table only, becomes BASE_PRODUCTION_SHA", () => {
  const r = stableRow(watch, "555");
  const after = appendRow(LEDGER, r);
  const before = LEDGER.split("\n");
  const lines = after.split("\n");
  assert.equal(lines.length, before.length + 1);
  assert.equal(lines[7], r, "right after the last row");
  assert.deepEqual([...lines.slice(0, 7), ...lines.slice(8)], before, "nothing else changes");
  const cells = r.split("|").slice(1, -1).map((c) => c.trim());
  assert.deepEqual(cells.slice(0, 11), [`\`${sha("b")}\``, `\`${vid(2)}\``, "STABLE_100", "100", "`37939029097`", "`37939029097`", "`37939029097`", `\`${vid(1)}\``, "LOW", "PASS", "2026-10-09T13:59:40Z"]);
  assert.match(cells[11], /no ALERT/);
  assert.match(cells[11], /v11-release-watch\.yml run 555/);
  const base = resolveBaseProductionShaFromManifest(after);
  assert.equal(base.ok, true, base.reason);
  assert.equal(base.releaseSha, sha("b"));
  assert.equal(hasRow(after, sha("b"), "STABLE_100"), true);
  assert.equal(hasRow(LEDGER, sha("b"), "STABLE_100"), false);
});

test("STABLE_100 row: refused for anything but a PASSED release observation", () => {
  assert.throws(() => stableRow({ ...watch, action: "observing" }, "1"));
  assert.throws(() => stableRow({ ...watch, observation: { ...watch.observation, state: "ALERT" } }, "1"));
  assert.throws(() => stableRow({ ...watch, event: { ...watch.event, previous_worker_version_id: null } }, "1"));
});

test("notes never break the table (no pipe or newline from any field)", () => {
  const r = stableRow({ ...watch, event: { ...watch.event, snapshot_version: "snap|x\ny" } }, "1");
  assert.equal(r.split("|").length - 2, 12);
});

test("ROLLED_BACK row: never changes BASE_PRODUCTION_SHA", () => {
  const rollback = {
    kind: "rollback",
    code_sha: sha("a"),
    snapshot_version: "snap-2026100703203700",
    deployed_worker_version_id: vid(1),
    run_id: "777",
    live_since: "2026-10-09T18:00:00Z",
    rolled_back: { code_sha: sha("b"), run_id: "37939029097", worker_version_id: vid(2), risk: "LOW", reason: "LOW release: ops-health production ALERT (9)" },
  };
  const r = rolledBackRow(rollback, "778");
  const after = appendRow(LEDGER, r);
  const base = resolveBaseProductionShaFromManifest(after);
  assert.equal(base.ok, true, base.reason);
  assert.equal(base.releaseSha, sha("a"), "the rolled-back release never becomes the base");
  assert.match(r, /\| ROLLED_BACK \| 0 \|/);
  assert.match(prBody({ state: "ROLLED_BACK", rollback, watchRunId: "778" }), /never becomes STABLE_100/);
});

test("PR body lists the observation runs and says the merge is the attestation", () => {
  const b = prBody({ state: "STABLE_100", watch: { ...watch, prefix_runs: 2 }, watchRunId: "555" });
  assert.match(b, /Merging this PR is the owner's §12 attestation/);
  assert.match(b, /\| \[11\]/);
  assert.match(b, /predate|before the ops-health lookback fix/);
});

test("CLI: appends once, then reports the row as present (exit 3)", (t) => {
  const work = mkdtempSync(path.join(tmpdir(), "v11-ledger-cli-"));
  t.after(() => rmSync(work, { recursive: true, force: true }));
  const m = path.join(work, "MANIFEST.md");
  const w = path.join(work, "watch.json");
  writeFileSync(m, LEDGER);
  writeFileSync(w, JSON.stringify(watch));
  const run = () => {
    try {
      execFileSync("node", [new URL("./v11-ledger-append.mjs", import.meta.url).pathname, "append", "--manifest", m, "--resolver", path.join(dir, "release-ledger.ts"), "--watch", w, "--state", "STABLE_100", "--watch-run-id", "9", "--body", path.join(work, "body.md")], { encoding: "utf8" });
      return 0;
    } catch (e) {
      return e.status;
    }
  };
  assert.equal(run(), 0);
  assert.equal(readFileSync(m, "utf8").split("\n").length, LEDGER.split("\n").length + 1);
  assert.equal(run(), 3);
  assert.equal(readFileSync(m, "utf8").split("\n").length, LEDGER.split("\n").length + 1, "idempotent");
});

test.after(() => rmSync(dir, { recursive: true, force: true }));
