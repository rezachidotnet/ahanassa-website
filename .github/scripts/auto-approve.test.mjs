// node --test ".github/scripts/*.test.mjs"  — W17.3: a deployment waiting ≥ 6 h for the owner's approval is approved
// automatically, never a run with a failed/cancelled earlier job. Synthetic run IDs, environments and times only (§14).
import assert from "node:assert/strict";
import { test } from "node:test";
import { COMMENT, WAIT_MS, decideRun, main, waitStartedAt } from "./auto-approve.mjs";

const NOW = new Date("2026-10-14T18:00:00Z");
const ago = (h) => new Date(NOW.getTime() - h * 3_600_000).toISOString();
const env = (id = 7, name = "production-v11", { can = true, timerAt = null } = {}) => ({ environment: { id, name }, wait_timer: 0, wait_timer_started_at: timerAt, current_user_can_approve: can, reviewers: [] });
const job = (name, status, conclusion = null, created = ago(8)) => ({ name, status, conclusion, created_at: created });
const run = (id = 101, status = "waiting") => ({ id, name: "Content publish", status, html_url: `https://github.invalid/runs/${id}` });
const okJobs = (waitedH) => [job("build", "completed", "success", ago(9)), job("publish", "completed", "success", ago(8.5)), job("publish-production-content", "completed", "skipped", ago(waitedH)), job("publish-production", "waiting", null, ago(waitedH))];

test("approves a deployment waiting ≥ 6 h when every completed job succeeded (skipped is not a failure)", () => {
  const d = decideRun({ run: run(), jobs: okJobs(6.1), pending: [env()], now: NOW });
  assert.deepEqual(d.approve, [7]);
  assert.equal(d.decisions[0].action, "approve");
});

test("exactly 6 h is enough; 5 h 59 min is not", () => {
  assert.deepEqual(decideRun({ run: run(), jobs: okJobs(6), pending: [env()], now: NOW }).approve, [7]);
  const d = decideRun({ run: run(), jobs: okJobs(5 + 59 / 60), pending: [env()], now: NOW });
  assert.deepEqual(d.approve, []);
  assert.equal(d.decisions[0].action, "wait");
  assert.match(d.decisions[0].reason, /5 h 59 min/);
});

for (const bad of ["failure", "cancelled", "timed_out", "action_required", "neutral", "stale"]) {
  test(`never approves a run with an earlier job ${bad}`, () => {
    const jobs = [job("build", "completed", bad, ago(9)), job("publish-production", "waiting", null, ago(20))];
    const d = decideRun({ run: run(), jobs, pending: [env()], now: NOW });
    assert.deepEqual(d.approve, []);
    assert.equal(d.decisions[0].action, "refuse");
    assert.match(d.decisions[0].reason, new RegExp(`build \\(${bad}\\)`));
  });
}

test("a job still running does not block; it is not a completed failure", () => {
  const jobs = [...okJobs(7), job("other", "in_progress")];
  assert.deepEqual(decideRun({ run: run(), jobs, pending: [env()], now: NOW }).approve, [7]);
});

test("wait start = the latest of wait_timer_started_at and the waiting jobs' created_at (never early)", () => {
  assert.equal(waitStartedAt(env(7, "x", { timerAt: ago(2) }), okJobs(10)), Date.parse(ago(2)));
  assert.equal(waitStartedAt(env(), okJobs(10)), Date.parse(ago(10)));
  assert.equal(waitStartedAt(env(), [job("a", "completed", "success")]), null);
  const d = decideRun({ run: run(), jobs: okJobs(10), pending: [env(7, "x", { timerAt: ago(2) })], now: NOW });
  assert.equal(d.decisions[0].action, "wait");
});

test("wait start unknown → refused, never approved", () => {
  const d = decideRun({ run: run(), jobs: [job("build", "completed", "success")], pending: [env()], now: NOW });
  assert.equal(d.decisions[0].action, "refuse");
  assert.match(d.decisions[0].reason, /wait start unknown/);
});

test("an environment the token's user cannot approve is refused; another one in the same run is approved", () => {
  const d = decideRun({ run: run(), jobs: okJobs(7), pending: [env(7, "production-v11"), env(8, "production", { can: false })], now: NOW });
  assert.deepEqual(d.approve, [7]);
  assert.deepEqual(d.decisions.map((x) => x.action), ["approve", "refuse"]);
});

test("a run that is no longer waiting, or has no pending deployment, is left alone", () => {
  assert.deepEqual(decideRun({ run: run(1, "in_progress"), jobs: okJobs(7), pending: [env()], now: NOW }).approve, []);
  const d = decideRun({ run: run(), jobs: okJobs(7), pending: [], now: NOW });
  assert.deepEqual(d.approve, []);
  assert.equal(d.decisions[0].action, "wait");
});

// CLI -------------------------------------------------------------------------------------------------------------

function fakeGh({ runs, jobs, pending, postFails = null, after = "in_progress" }) {
  const posts = [];
  return {
    posts,
    async json(p) {
      if (p.startsWith("/actions/runs?status=waiting")) return { workflow_runs: runs };
      const m = /^\/actions\/runs\/(\d+)(\/jobs|\/pending_deployments)?/.exec(p);
      const id = Number(m[1]);
      if (m[2] === "/jobs") return { jobs: jobs[id] };
      if (m[2] === "/pending_deployments") return pending[id];
      return { id, status: after };
    },
    async post(p, body) {
      posts.push({ p, body });
      if (postFails) throw new Error(postFails);
      return [];
    },
  };
}

test("CLI: approves only the eligible run, with the owner-decision comment, and logs every decision", async () => {
  const gh = fakeGh({
    runs: [run(1), run(2), run(3)],
    jobs: { 1: okJobs(7), 2: okJobs(1), 3: [job("build", "completed", "failure", ago(9)), job("publish-production", "waiting", null, ago(9))] },
    pending: { 1: [env(7)], 2: [env(7)], 3: [env(7)] },
  });
  const lines = [];
  const code = await main([], { gh, now: NOW, log: () => {}, summary: (l) => lines.push(...l) });
  assert.equal(code, 0);
  assert.deepEqual(gh.posts, [{ p: "/actions/runs/1/pending_deployments", body: { environment_ids: [7], state: "approved", comment: COMMENT } }]);
  const table = lines.join("\n");
  assert.match(table, /\| \[1\].*\| approved \|/);
  assert.match(table, /\| \[2\].*\| wait \|/);
  assert.match(table, /\| \[3\].*\| refuse \|.*failure/);
});

test("CLI: idempotent — a second pass after the approval finds nothing waiting and posts nothing", async () => {
  const gh = fakeGh({ runs: [], jobs: {}, pending: {} });
  const lines = [];
  assert.equal(await main([], { gh, now: NOW, log: () => {}, summary: (l) => lines.push(...l) }), 0);
  assert.equal(gh.posts.length, 0);
  assert.match(lines.join("\n"), /No waiting run/);
});

test("CLI: --dry-run approves nothing", async () => {
  const gh = fakeGh({ runs: [run(1)], jobs: { 1: okJobs(7) }, pending: { 1: [env(7)] } });
  const lines = [];
  assert.equal(await main(["--dry-run"], { gh, now: NOW, log: () => {}, summary: (l) => lines.push(...l) }), 0);
  assert.equal(gh.posts.length, 0);
  assert.match(lines.join("\n"), /would approve/);
});

test("CLI: a failed approval fails the job unless the run was handled meanwhile", async () => {
  const failing = fakeGh({ runs: [run(1)], jobs: { 1: okJobs(7) }, pending: { 1: [env(7)] }, postFails: "GitHub API 422", after: "waiting" });
  assert.equal(await main([], { gh: failing, now: NOW, log: () => {}, summary: () => {} }), 1);
  const handled = fakeGh({ runs: [run(1)], jobs: { 1: okJobs(7) }, pending: { 1: [env(7)] }, postFails: "GitHub API 422", after: "completed" });
  const lines = [];
  assert.equal(await main([], { gh: handled, now: NOW, log: () => {}, summary: (l) => lines.push(...l) }), 0);
  assert.match(lines.join("\n"), /handled meanwhile/);
});

test("CLI: no AUTO_APPROVE_TOKEN → a warning, nothing checked, exit 0", async () => {
  const logs = [];
  const lines = [];
  assert.equal(await main([], { env: {}, log: (l) => logs.push(l), summary: (l) => lines.push(...l) }), 0);
  assert.match(logs.join("\n"), /::warning title=auto-approve not configured::/);
  assert.match(lines.join("\n"), /AUTO_APPROVE_TOKEN/);
});

test("the threshold is 6 h", () => assert.equal(WAIT_MS, 21_600_000));
