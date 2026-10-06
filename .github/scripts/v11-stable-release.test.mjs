// node --test .github/scripts/  (from a checkout of this repository with origin/feat/v11-static-site fetched)
// Fixture git repositories, synthetic SHAs/IDs only (RELEASE_POLICY.md §14). The strict resolver under test is
// the real lib/ci/release-ledger.ts, read from the application branch (RESOLVER_SOURCE_REF).
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { mkdirSync, mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { test } from "node:test";
import { checkProductionConfig, resolveStableRelease } from "./v11-stable-release.mjs";

const RESOLVER_SOURCE_REF = process.env.RESOLVER_SOURCE_REF ?? "origin/feat/v11-static-site";
const resolverSource = execFileSync("git", ["show", `${RESOLVER_SOURCE_REF}:lib/ci/release-ledger.ts`], { encoding: "utf8" });

const HEADER = "| RELEASE_SHA | WORKER_VERSION_ID | RELEASE_STATE | FINAL_TRAFFIC_PERCENT | STAGING_RUN_ID | PRODUCTION_RUN_ID | PROMOTION_RUN_ID | ROLLBACK_VERSION_ID | FINAL_RISK | RESULT | TIMESTAMP | NOTES |";
const SEP = "| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |";
const row = (sha, state, risk = "HIGH") =>
  `| \`${sha}\` | \`00000000-0000-4000-8000-000000000001\` | ${state} | 100 | \`1\` | \`1\` | \`1\` | \`00000000-0000-4000-8000-000000000002\` | ${risk} | PASS | 2026-10-07T06:00:00Z | fixture |`;
const ledger = (rows) => ["# Ledger", "", "## Ledger (RELEASE_POLICY.md schema)", "", HEADER, SEP, ...rows, "", "end"].join("\n");

function repo() {
  const dir = mkdtempSync(path.join(tmpdir(), "v11-stable-test-"));
  const g = (...a) => execFileSync("git", a, { cwd: dir, encoding: "utf8" }).trim();
  g("init", "-q", "-b", "feat/v11-static-site");
  g("config", "user.email", "fixture@example.invalid");
  g("config", "user.name", "fixture");
  const write = (p, s) => {
    mkdirSync(path.dirname(path.join(dir, p)), { recursive: true });
    writeFileSync(path.join(dir, p), s);
  };
  const commit = (msg) => {
    g("add", "-A");
    g("commit", "-q", "-m", msg);
    return g("rev-parse", "HEAD");
  };
  write("lib/ci/release-ledger.ts", resolverSource);
  return { dir, g, write, commit };
}

test("resolve: latest STABLE_100 is a v11 release on the ledger branch -> eligible, that SHA", async () => {
  const r = repo();
  r.write("app.txt", "legacy");
  const legacy = r.commit("legacy");
  r.write("docs/release/PRODUCTION_DEPLOYMENT_MANIFEST.md", ledger([row(legacy, "STABLE_100", "LEGACY_IN_FLIGHT_RELEASE")]));
  r.commit("legacy row");
  r.write("scripts/content/publish.ts", "// pipeline");
  const v11 = r.commit("v11 release");
  r.write("docs/release/PRODUCTION_DEPLOYMENT_MANIFEST.md", ledger([row(legacy, "STABLE_100", "LEGACY_IN_FLIGHT_RELEASE"), row(v11, "STABLE_100")]));
  r.commit("v11 row");
  r.write("later.txt", "a later app commit (docs, code) must not change what is built");
  r.commit("later");
  const res = await resolveStableRelease(r.dir, "HEAD");
  assert.equal(res.ok, true);
  assert.equal(res.eligible, true, res.reason);
  assert.equal(res.sha, v11);
  assert.notEqual(res.sha, r.g("rev-parse", "HEAD"), "never the branch tip");
});

test("resolve: only the legacy STABLE_100 (no v11 row yet) -> not eligible", async () => {
  const r = repo();
  r.write("app.txt", "legacy");
  const legacy = r.commit("legacy");
  r.write("scripts/content/publish.ts", "// pipeline");
  r.write("docs/release/PRODUCTION_DEPLOYMENT_MANIFEST.md", ledger([row(legacy, "STABLE_100", "LEGACY_IN_FLIGHT_RELEASE")]));
  r.commit("v11 tree, legacy row only");
  const res = await resolveStableRelease(r.dir, "HEAD");
  assert.equal(res.ok, true);
  assert.equal(res.eligible, false);
  assert.equal(res.sha, legacy);
  assert.match(res.reason, /not a v11 release/);
});

test("resolve: a SUPERSEDED history row never becomes the build SHA", async () => {
  const r = repo();
  r.write("app.txt", "legacy");
  const legacy = r.commit("legacy");
  r.write("scripts/content/publish.ts", "// pipeline");
  const cutover = r.commit("cutover release");
  r.write("docs/release/PRODUCTION_DEPLOYMENT_MANIFEST.md", ledger([row(legacy, "STABLE_100", "LEGACY_IN_FLIGHT_RELEASE"), row(cutover, "SUPERSEDED")]));
  r.commit("history row");
  const res = await resolveStableRelease(r.dir, "HEAD");
  assert.equal(res.sha, legacy);
  assert.equal(res.eligible, false);
});

test("resolve: STABLE_100 SHA not on the ledger branch's history -> not eligible", async () => {
  const r = repo();
  r.write("scripts/content/publish.ts", "// pipeline");
  r.commit("base");
  const foreign = "1".repeat(40);
  r.write("docs/release/PRODUCTION_DEPLOYMENT_MANIFEST.md", ledger([row(foreign, "STABLE_100")]));
  r.commit("row for a foreign sha");
  const res = await resolveStableRelease(r.dir, "HEAD");
  assert.equal(res.eligible, false);
  assert.match(res.reason, /not on/);
});

test("resolve: malformed ledger or no STABLE_100 -> ok false, not eligible (fails closed)", async () => {
  const r = repo();
  r.write("docs/release/PRODUCTION_DEPLOYMENT_MANIFEST.md", ledger(["| `nope` | x | STABLE_100 |"]));
  r.commit("bad");
  const bad = await resolveStableRelease(r.dir, "HEAD");
  assert.equal(bad.ok, false);
  assert.equal(bad.eligible, false);
  r.write("docs/release/PRODUCTION_DEPLOYMENT_MANIFEST.md", ledger([row("2".repeat(40), "SUPERSEDED")]));
  r.commit("no stable");
  const none = await resolveStableRelease(r.dir, "HEAD");
  assert.equal(none.ok, false);
  assert.match(none.reason, /BASE_PRODUCTION_SHA_UNRESOLVED/);
});

test("resolve: the resolver is read from the ledger ref, not from the working tree", async () => {
  const r = repo();
  r.write("scripts/content/publish.ts", "// pipeline");
  const v11 = r.commit("v11");
  r.write("docs/release/PRODUCTION_DEPLOYMENT_MANIFEST.md", ledger([row(v11, "STABLE_100")]));
  r.commit("row");
  r.write("lib/ci/release-ledger.ts", "export function resolveBaseProductionShaFromManifest() { return { ok: true, releaseSha: '3'.repeat(40) }; }");
  const res = await resolveStableRelease(r.dir, "HEAD");
  assert.equal(res.sha, v11, "an uncommitted resolver change in the checkout is ignored");
});

test("check-config: post-cutover production config passes; pre-cutover config fails", () => {
  assert.deepEqual(checkProductionConfig({ name: "ahanassa-v11-static-production", workers_dev: false, routes: [{ pattern: "www.ahanassa.com", custom_domain: true }] }), []);
  const pre = checkProductionConfig({ name: "ahanassa-v11-static-production", workers_dev: true, routes: undefined });
  assert.equal(pre.length, 2);
  assert.match(pre.join(" "), /workers_dev/);
  assert.match(pre.join(" "), /www\.ahanassa\.com/);
  assert.equal(checkProductionConfig({ name: "ahanassa-v11-static-production", workers_dev: false, routes: [{ pattern: "www.ahanassa.com", custom_domain: true }, { pattern: "x.ahanassa.com/*", zone_name: "ahanassa.com" }] }).length, 1);
  assert.equal(checkProductionConfig({ name: "other", workers_dev: false, routes: [{ pattern: "www.ahanassa.com", custom_domain: true }] }).length, 1);
});
