// node --test ".github/scripts/*.test.mjs"  — W30 domestic-copy drift check (RELEASE_POLICY.md §20.2b draft): its
// states, and that it is structurally NOT a release check (the release watch never reads its job).
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import { checkPairs, evaluatePair, JOB_NAME, parsePairs } from "./v11-iran-copy.mjs";
import { HEALTH_PRODUCTION_JOB, productionHealthRuns } from "./v11-live-release.mjs";

const NOW = new Date("2026-10-22T09:00:00Z");
const S = "https://www.ahanassa.com";
const C = "https://new.ahanassa.ir";
const m = (snap, generated_at = "2026-10-22T08:00:00Z") => ({ snapshot_version: snap, generated_at });

test("W30 §20.2b: same snapshot = OK; a fresh difference = PENDING; past 45 min after www's switch = IR_COPY_DRIFT", () => {
  assert.equal(evaluatePair({ source: S, copy: C, sourceManifest: m("snap-1"), copyManifest: m("snap-1"), now: NOW }).state, "OK");
  const live = { snapshot_version: "snap-2", live_since: "2026-10-22T08:30:00Z" };
  assert.equal(evaluatePair({ source: S, copy: C, sourceManifest: m("snap-2"), copyManifest: m("snap-1"), live, now: NOW }).state, "PENDING");
  const late = evaluatePair({ source: S, copy: C, sourceManifest: m("snap-2"), copyManifest: m("snap-1"), live: { ...live, live_since: "2026-10-22T08:10:00Z" }, now: NOW });
  assert.equal(late.state, "IR_COPY_DRIFT");
  assert.match(late.detail, /50 min; limit 45 min, www switch time/);
});

test("W30 §20.2b: without a live record for www's snapshot, the snapshot time with the looser limit (an Approve wait is not drift)", () => {
  const stale = { snapshot_version: "snap-1", live_since: "2026-10-20T00:00:00Z" };
  assert.equal(evaluatePair({ source: S, copy: C, sourceManifest: m("snap-2", "2026-10-22T07:00:00Z"), copyManifest: m("snap-1"), live: stale, now: NOW }).state, "PENDING");
  assert.equal(evaluatePair({ source: S, copy: C, sourceManifest: m("snap-2", "2026-10-22T05:00:00Z"), copyManifest: m("snap-1"), now: NOW }).state, "IR_COPY_DRIFT");
});

test("W30 §20.2b: the copy down = IR_UNREACHABLE (ALERT); the source down = reported only (ops-health's own job covers www)", () => {
  assert.equal(evaluatePair({ source: S, copy: C, sourceManifest: m("snap-1"), copyError: "timeout", now: NOW }).state, "IR_UNREACHABLE");
  assert.equal(evaluatePair({ source: S, copy: C, sourceError: "HTTP 522", copyManifest: m("snap-1"), now: NOW }).state, "SOURCE_UNREACHABLE");
});

test("W30: pairs parse strictly; checkPairs reads /manifest.public.json of both sides", async () => {
  assert.deepEqual(parsePairs(`${S}=${C}  https://a.example=https://b.example`), [{ source: S, copy: C }, { source: "https://a.example", copy: "https://b.example" }]);
  assert.throws(() => parsePairs(`http://x=${C}`), /bad pair/);
  const fetchImpl = async (url) => new Response(JSON.stringify(m(url.startsWith(S) ? "snap-2" : "snap-2")), { status: 200 });
  const [r] = await checkPairs([{ source: S, copy: C }], { fetchImpl, now: NOW });
  assert.equal(r.state, "OK");
});

test("W30 §20.2b: structurally not a release check — its own ops-health job, which the release watch never reads", async () => {
  const yml = readFileSync(new URL("../workflows/ops-health.yml", import.meta.url), "utf8");
  assert.match(yml, /\n  iran-copy:\n    name: iran-copy \(domestic copy; not a release check, §20\.2b\)\n/);
  assert.ok(yml.includes(`name: ${JOB_NAME}`));
  assert.notEqual(JOB_NAME, HEALTH_PRODUCTION_JOB);
  // A run whose ONLY failed job is iran-copy is a passing production run for the observation (no rollback, no block).
  const gh = {
    json: async (path) => {
      if (path.startsWith("/actions/workflows/")) return { workflow_runs: [{ id: 7, head_branch: "main", status: "completed", conclusion: "failure", run_started_at: "2026-10-22T08:49:00Z" }] };
      if (path === "/actions/runs/7/jobs?per_page=20")
        return {
          jobs: [
            { id: 1, name: HEALTH_PRODUCTION_JOB, status: "completed", conclusion: "success", started_at: "2026-10-22T08:49:10Z" },
            { id: 2, name: JOB_NAME, status: "completed", conclusion: "failure", started_at: "2026-10-22T08:49:10Z" },
          ],
        };
      throw new Error(`unexpected ${path}`);
    },
  };
  assert.deepEqual(await productionHealthRuns(gh, "2026-10-22T08:00:00Z"), [{ run_id: "7", started_at: "2026-10-22T08:49:10Z", conclusion: "success" }]);
});
