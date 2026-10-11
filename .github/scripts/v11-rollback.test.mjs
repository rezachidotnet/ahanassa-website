// node --test ".github/scripts/*.test.mjs"  — W9.7 rollback of a v11 release (RELEASE_POLICY.md §20.1, §20.8). Fake
// wrangler/D1/www; synthetic IDs only. Every precondition is read before the first write.
import assert from "node:assert/strict";
import { test } from "node:test";
import { pointerRollbackSql, rollbackPlan, runRollback } from "./v11-rollback.mjs";

const sha = (c) => c.repeat(40);
const vid = (n) => `00000000-0000-4000-8000-${String(n).padStart(12, "0")}`;
const LIVE = "snap-2026101008000000";
const PREV = "snap-2026100913460400";
const event = { kind: "release", code_sha: sha("b"), previous_code_sha: sha("a"), deployed_worker_version_id: vid(2), previous_worker_version_id: vid(1), previous_snapshot_version: PREV, run_id: "1002", risk: "LOW" };
const watch = { action: "rollback", reason: "LOW release: ALERT", event, live: { snapshot: LIVE } };

function world({ pointer = LIVE, kept = [PREV, LIVE], version = vid(3), www = LIVE, failDeploy = false } = {}) {
  const w = { pointer, version, www, writes: [] };
  w.tools = {
    pointer: () => w.pointer,
    stateHas: (v) => kept.includes(v),
    currentVersion: () => w.version,
    wrangler: (argv) => {
      w.writes.push(["wrangler", argv.slice(0, 3).join(" ")]);
      if (failDeploy) throw new Error("deploy failed");
      if (argv[0] === "versions" && argv[1] === "deploy") {
        w.version = argv[2].replace("@100%", "");
        w.www = PREV;
      }
    },
    exec: (sql) => {
      w.writes.push(["d1", sql.split("\n")[0].slice(0, 40)]);
      if (sql.includes(`active_version = '${w.pointer}'`) && kept.includes(PREV)) w.pointer = PREV;
    },
  };
  w.snapshotOf = async () => w.www;
  return w;
}

test("rollback: previous Worker version, then the guarded pointer, then verified; returns the rollback record", async () => {
  const w = world();
  const r = await runRollback({ app: ".", watch, runId: "2001", tools: w.tools, snapshotOf: w.snapshotOf, now: () => "2026-10-10T15:00:00.123Z", log: () => {} });
  assert.deepEqual(w.writes.map((x) => x[0]), ["wrangler", "d1"], "Worker first, pointer second");
  assert.equal(w.version, vid(1));
  assert.equal(w.pointer, PREV);
  assert.equal(r.kind, "rollback");
  assert.equal(r.code_sha, sha("a"));
  assert.equal(r.snapshot_version, PREV);
  assert.equal(r.deployed_worker_version_id, vid(1));
  assert.equal(r.previous_worker_version_id, vid(3));
  assert.equal(r.rolled_back.code_sha, sha("b"));
  assert.equal(r.live_since, "2026-10-10T15:00:00Z");
});

test("rollback refuses BEFORE any write: pointer moved, target pruned, www moved, already on target, no target", async () => {
  const cases = [
    [world({ pointer: "snap-2026101009000000" }), /pointer/],
    [world({ kept: [LIVE] }), /retention/],
    [world({ www: "snap-2026101009000000" }), /www moved/],
    [world({ version: vid(1) }), /already runs/],
  ];
  for (const [w, re] of cases) {
    await assert.rejects(runRollback({ app: ".", watch, runId: "1", tools: w.tools, snapshotOf: w.snapshotOf, log: () => {} }), re);
    assert.deepEqual(w.writes, [], `no write for ${re}`);
  }
  const w = world();
  await assert.rejects(runRollback({ app: ".", watch: { ...watch, event: { ...event, previous_worker_version_id: null } }, runId: "1", tools: w.tools, snapshotOf: w.snapshotOf, log: () => {} }), /previous Worker version/);
  assert.deepEqual(w.writes, []);
  assert.equal(rollbackPlan({ ...event, kind: "rollback" }, LIVE).ok, false, "a rollback is never rolled back");
});

test("rollback works when www is down (pointer stands in) and refuses when the previous code is unknown", async () => {
  const w = world();
  const down = async () => {
    if (w.version !== vid(1)) throw new Error("HTTP 522");
    return PREV;
  };
  const r = await runRollback({ app: ".", watch, runId: "3", tools: w.tools, snapshotOf: down, log: () => {} });
  assert.equal(r.snapshot_version, PREV);
  const w2 = world();
  await assert.rejects(runRollback({ app: ".", watch: { ...watch, event: { ...event, previous_code_sha: null } }, runId: "1", tools: w2.tools, snapshotOf: w2.snapshotOf, log: () => {} }), /previous live code is unknown/);
  assert.deepEqual(w2.writes, [], "refused before any write");
});

test("rollback: a failure after the first write is an ALERT, never silent", async () => {
  const w = world();
  w.tools.exec = (sql) => w.writes.push(["d1", sql]); // the guarded UPDATE matches nothing
  await assert.rejects(runRollback({ app: ".", watch, runId: "1", tools: w.tools, snapshotOf: w.snapshotOf, log: () => {} }), /ALERT: rollback incomplete.*pointer/);
});

test("pointer SQL is guarded on the current pointer and on the target still being kept", () => {
  const sql = pointerRollbackSql(LIVE, PREV, "2026-10-10T15:00:00Z");
  assert.match(sql, new RegExp(`WHERE id = 1 AND active_version = '${LIVE}' AND EXISTS \\(SELECT 1 FROM publication_state WHERE version = '${PREV}'\\)`));
  assert.throws(() => pointerRollbackSql("x'; DROP", PREV, "t"), /snapshot versions/);
});
