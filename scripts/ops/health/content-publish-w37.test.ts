import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { THRESHOLDS } from "./config.ts";
import { ACTIVE_PUBLICATION_SQL, activePublicationFromRow, evaluateContentPublish, evaluateContentPublishFallback } from "./checks.ts";
import { GITHUB_RETRY_DELAYS_MS, ghRequest, isTransientGitHubError, lastSuccessfulPublish, type GitHubDeps } from "./sources.ts";

/**
 * W37 — the content-publish-stale check survives a transient GitHub API failure (release-watch ALERT 2026-10-23
 * 07:35Z, run 39918757832: "check could not run — GitHub API 502"): 3 retries with backoff, then the live
 * publication in DB_PUBLIC, still fail-closed.
 */

const AUTH = { token: "t", repo: "o/r" };
const NOW = new Date("2026-10-23T08:00:00Z");
const T = THRESHOLDS; // contentPublishMaxAgeHours: 30

/** A fake fetch that answers from `script` in order (a number = that HTTP status, an Error = thrown) and records the sleeps. */
function fake(script: Array<number | Error | { body: unknown }>) {
  const calls: string[] = [];
  const sleeps: number[] = [];
  const deps: GitHubDeps = {
    fetch: (async (url: string) => {
      calls.push(String(url));
      const next = script.shift();
      if (next === undefined) throw new Error("unexpected extra request");
      if (next instanceof Error) throw next;
      if (typeof next === "number") return new Response("{}", { status: next });
      return new Response(JSON.stringify(next.body), { status: 200 });
    }) as typeof fetch,
    sleep: async (ms) => void sleeps.push(ms),
    delaysMs: GITHUB_RETRY_DELAYS_MS,
  };
  return { deps, calls, sleeps };
}
const named = (name: string) => Object.assign(new Error(name), { name });

test("retry: 502, 503 then 200 → the answer, after two backoff waits", async () => {
  const f = fake([502, 503, { body: { ok: 1 } }]);
  assert.deepEqual(await ghRequest(AUTH, "/x", f.deps), { ok: 1 });
  assert.equal(f.calls.length, 3);
  assert.deepEqual(f.sleeps, [2_000, 5_000]);
});

test("retry: timeouts, network errors and 429 are retried like a 5xx", async () => {
  const f = fake([named("TimeoutError"), new TypeError("fetch failed"), 429, { body: [] }]);
  assert.deepEqual(await ghRequest(AUTH, "/x", f.deps), []);
  assert.deepEqual(f.sleeps, [2_000, 5_000, 10_000]);
});

test("retry: a 5xx on all 4 attempts (1 + 3 retries) throws a TRANSIENT error that says so", async () => {
  const f = fake([502, 502, 502, 502]);
  await assert.rejects(ghRequest(AUTH, "/actions/workflows/content-publish.yml/runs?status=completed", f.deps), (e: Error) => {
    assert.ok(isTransientGitHubError(e));
    assert.equal(e.message, "GitHub API 502 for /actions/workflows/content-publish.yml/runs (after 4 attempts)");
    return true;
  });
  assert.equal(f.calls.length, 4);
  assert.deepEqual(f.sleeps, [2_000, 5_000, 10_000]);
});

test("retry: a 4xx (token, missing workflow) is not retried and is not transient", async () => {
  for (const status of [401, 403, 404]) {
    const f = fake([status]);
    await assert.rejects(ghRequest(AUTH, "/x", f.deps), (e: Error) => !isTransientGitHubError(e) && e.message === `GitHub API ${status} for /x`);
    assert.equal(f.calls.length, 1);
    assert.deepEqual(f.sleeps, []);
  }
});

test("lastSuccessfulPublish: a transient error on the jobs request is retried too", async () => {
  const jobs = [{ name: "publish-production-content", completed_at: "2026-10-23T07:30:00Z", steps: [{ name: "12. Finalize publication", conclusion: "success", completed_at: "2026-10-23T07:29:00Z" }] }];
  const f = fake([{ body: { workflow_runs: [{ id: 7 }] } }, 502, { body: { jobs } }]);
  assert.equal(await lastSuccessfulPublish(AUTH, "content-publish.yml", "publish-production", "12. Finalize", f.deps), "2026-10-23T07:29:00Z");
  assert.deepEqual(f.sleeps, [2_000]);
});

// --- the fallback --------------------------------------------------------------------------------------------

const LIVE = (createdAt: string | null) => ({ version: "snap-2026102307290000", createdAt });

test("fallback: GitHub down + a fresh live publication = OK, same id and title, GitHub's error kept in the detail", () => {
  const r = evaluateContentPublishFallback("GitHub API 502 for /actions/workflows/content-publish.yml/runs (after 4 attempts)", LIVE("2026-10-23T07:29:00Z"), NOW, T);
  assert.equal(r.status, "OK");
  assert.equal(r.id, "content:publish");
  assert.equal(r.title, "content publish stale");
  assert.equal(r.title, evaluateContentPublish("2026-10-23T07:29:00Z", null, NOW, T).title, "title unchanged");
  assert.match(r.value, /^0\.5 h \(active_version snap-2026102307290000, created 2026-10-23T07:29:00Z; from DB_PUBLIC, GitHub API unavailable\)$/);
  assert.match(r.detail!, /GitHub API 502/);
});

test("fallback: a stale live publication is an ALERT (INFO only when the alert is off, as on the GitHub path)", () => {
  const stale = LIVE("2026-10-21T20:00:00Z"); // 36 h
  assert.equal(evaluateContentPublishFallback("GitHub API 502", stale, NOW, T).status, "ALERT");
  assert.equal(evaluateContentPublishFallback("GitHub API 502", stale, NOW, T, false).status, "INFO");
  assert.equal(evaluateContentPublish("2026-10-21T20:00:00Z", null, NOW, T, false).status, "INFO", "same rule as the GitHub path");
});

test("fallback: unreadable = fail-closed ALERT 'check could not run' (no pointer, no creation time, a future time)", () => {
  for (const live of [null, LIVE(null)]) {
    const r = evaluateContentPublishFallback("GitHub API 502", live, NOW, T, false);
    assert.equal(r.status, "ALERT", "even with the stale alert off: a check that cannot see must not pass");
    assert.equal(r.value, "check could not run");
  }
  assert.equal(evaluateContentPublishFallback("GitHub API 502", LIVE("2026-10-24T08:00:00Z"), NOW, T).status, "ALERT");
});

test("active publication row: the version and its creation time; a missing time keeps the version", () => {
  assert.match(ACTIVE_PUBLICATION_SQL, /^SELECT .* FROM publication_pointer p LEFT JOIN publication_state s ON s\.version = p\.active_version WHERE p\.id = 1$/);
  assert.ok(!ACTIVE_PUBLICATION_SQL.includes(";"), "d1Select accepts a single SELECT only");
  assert.deepEqual(activePublicationFromRow({ active_version: "snap-1", created_at: "2026-10-23T07:29:00Z" }), { version: "snap-1", createdAt: "2026-10-23T07:29:00Z" });
  assert.deepEqual(activePublicationFromRow({ active_version: "snap-1", created_at: null }), { version: "snap-1", createdAt: null });
  assert.equal(activePublicationFromRow(undefined), null);
});

test("run.ts wiring: only a transient GitHub error falls back, and only with a DB_PUBLIC to read; anything else still throws (ALERT)", () => {
  const run = fs.readFileSync(path.join(import.meta.dirname, "run.ts"), "utf8");
  const block = run.slice(run.indexOf('await guard("content:publish", "content publish stale"'), run.indexOf("// 8. Odoo reachability"));
  assert.match(block, /if \(!isTransientGitHubError\(error\) \|\| !target\.dbPublicId\) throw error;/);
  assert.match(block, /return evaluateContentPublishFallback\(\(error as Error\)\.message, live, now, t, contentStaleAlertEffective\(target\)\);/);
  assert.match(block, /return evaluateContentPublish\(last, live\?\.version \?\? null, now, t, contentStaleAlertEffective\(target\)\);/);
});
