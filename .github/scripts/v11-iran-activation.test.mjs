// node --test ".github/scripts/*.test.mjs"  — W30 domestic-copy activation records (RELEASE_POLICY.md §20.11 draft).
// The schema is the server's (deploy/iran/lib/ahanassa_iran.py parse_activation on the application branch).
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { mkdirSync, mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { spawnSync } from "node:child_process";
import { test } from "node:test";
import { activationProblems, makeActivation, matchActivation, previousActivation, rollbackActivation } from "./v11-iran-activation.mjs";

const CODE = "0123456789abcdef0123456789abcdef01234567";
const SNAP = "snap-2026102208000000";
const manifestBytes = Buffer.from(JSON.stringify({ schema_version: "artifact.v1", code_sha: CODE, snapshot_version: SNAP, environment: "production" }));
const msha = createHash("sha256").update(manifestBytes).digest("hex");
const summary = { schema: "iran-bundle.v1", environment: "production", code_sha: CODE, snapshot_version: SNAP, manifest_sha256: msha, bundle_sha256: "b".repeat(64), bundle_bytes: 1234 };
const now = new Date("2026-10-22T08:30:00.123Z");

test("W30: a publish activation names the bundle and the exact manifest www was published from", () => {
  const a = makeActivation({ env: "production", summary, manifestBytes, runId: "987", now });
  assert.deepEqual(activationProblems(a, "production"), []);
  assert.equal(a.seq, now.getTime());
  assert.equal(a.reason, "publish");
  assert.equal(a.run_id, 987);
  assert.equal(a.manifest_sha256, msha);
  assert.equal(a.bundle_artifact, `iran-bundle-production-${SNAP}`);
  assert.equal(a.created_at, "2026-10-22T08:30:00Z");
  assert.deepEqual(Object.keys(a).sort(), ["bundle_artifact", "bundle_bytes", "bundle_sha256", "code_sha", "created_at", "env", "manifest_sha256", "reason", "run_id", "schema", "seq", "snapshot_version"]);
});

test("W30: refused when the bundle and the manifest do not belong together, or the environment differs", () => {
  assert.throws(() => makeActivation({ env: "production", summary: { ...summary, manifest_sha256: "c".repeat(64) }, manifestBytes, runId: 1, now }), /not built from this manifest/);
  assert.throws(() => makeActivation({ env: "staging", summary, manifestBytes, runId: 1, now }), /environment mismatch/);
  assert.throws(() => makeActivation({ env: "production", summary: { ...summary, code_sha: "f".repeat(40) }, manifestBytes, runId: 1, now }), /different code/);
  assert.throws(() => makeActivation({ env: "production", summary: { ...summary, schema: "x" }, manifestBytes, runId: 1, now }), /iran-bundle\.v1/);
});

test("W30: a rollback activation keeps the bundle and its run, takes a newer seq and reason rollback", () => {
  const a = makeActivation({ env: "production", summary, manifestBytes, runId: 5, now });
  const r = rollbackActivation(a, { now: new Date(now.getTime() + 60_000) });
  assert.equal(r.reason, "rollback");
  assert.equal(r.seq, a.seq + 60_000);
  for (const k of ["bundle_sha256", "bundle_bytes", "bundle_artifact", "run_id", "manifest_sha256", "code_sha", "snapshot_version"]) assert.equal(r[k], a[k], k);
  assert.throws(() => rollbackActivation(a, { now, seq: a.seq }), /newer/);
});

test("W30: choosing the activation — the newest for a snapshot (+code), and the newest with another bundle", () => {
  const base = makeActivation({ env: "production", summary, manifestBytes, runId: 1, now });
  const mk = (seq, snap, bundle) => ({ ...base, seq, snapshot_version: snap, bundle_sha256: bundle.repeat(64), bundle_artifact: `iran-bundle-production-${snap}` });
  const list = [mk(100, "snap-2026102008000000", "1"), mk(200, "snap-2026102108000000", "2"), mk(250, "snap-2026102108000000", "2"), mk(300, SNAP, "3")];
  assert.equal(matchActivation(list, { snapshot: "snap-2026102108000000" }).seq, 250);
  assert.equal(matchActivation(list, { snapshot: "snap-2026102108000000", code: "f".repeat(40) }), null);
  assert.equal(previousActivation(list).seq, 250);
  assert.equal(previousActivation([list[3]]), null);
});

test("W30: the schema check rejects what the server would refuse", () => {
  const a = makeActivation({ env: "production", summary, manifestBytes, runId: 5, now });
  assert.ok(activationProblems({ ...a, extra: 1 }).length);
  assert.ok(activationProblems({ ...a, seq: 1.5 }).length);
  assert.ok(activationProblems({ ...a, bundle_artifact: "iran-bundle-staging-x" }).length);
  assert.ok(activationProblems(a, "staging").length);
  assert.ok(activationProblems({ ...a, reason: "force" }).length);
});

test("W30: CLI — make, sign with ssh-keygen -Y exactly as the composite action does, and verify as the server does", { skip: !/namespace/i.test(spawnSync("ssh-keygen", ["-Y", "sign"], { encoding: "utf8" }).stderr ?? "") && "ssh-keygen without -Y" }, () => {
  const d = mkdtempSync(join(tmpdir(), "w30-act-"));
  writeFileSync(join(d, "iran-bundle.json"), JSON.stringify(summary));
  writeFileSync(join(d, "manifest.json"), manifestBytes);
  const script = new URL("./v11-iran-activation.mjs", import.meta.url).pathname;
  const out = join(d, "out");
  const r = spawnSync("node", [script, "make", "--env", "production", "--summary", join(d, "iran-bundle.json"), "--manifest", join(d, "manifest.json"), "--run-id", "42", "--out", out], { encoding: "utf8" });
  assert.equal(r.status, 0, r.stderr);
  const act = join(out, "activation.json");
  assert.deepEqual(activationProblems(JSON.parse(readFileSync(act, "utf8")), "production"), []);
  spawnSync("ssh-keygen", ["-q", "-t", "ed25519", "-N", "", "-f", join(d, "key")]);
  assert.equal(spawnSync("ssh-keygen", ["-Y", "sign", "-q", "-f", join(d, "key"), "-n", "ahanassa-ir-release", act]).status, 0);
  writeFileSync(join(d, "allowed"), `ci-production namespaces="ahanassa-ir-release" ${readFileSync(join(d, "key.pub"), "utf8")}`);
  const verify = (principal) => spawnSync("ssh-keygen", ["-Y", "verify", "-f", join(d, "allowed"), "-I", principal, "-n", "ahanassa-ir-release", "-s", `${act}.sig`], { input: readFileSync(act) }).status;
  assert.equal(verify("ci-production"), 0);
  assert.notEqual(verify("ci-staging"), 0, "the principal is checked, not only the key");
  mkdirSync(join(d, "acts", "1"), { recursive: true });
  writeFileSync(join(d, "acts", "1", "activation.json"), readFileSync(act));
  const m = spawnSync("node", [script, "match", "--dir", join(d, "acts"), "--snapshot", SNAP], { encoding: "utf8" });
  assert.equal(m.status, 0, m.stderr);
  assert.equal(spawnSync("node", [script, "match", "--dir", join(d, "acts"), "--snapshot", "snap-2020010100000000"]).status, 3);
});
