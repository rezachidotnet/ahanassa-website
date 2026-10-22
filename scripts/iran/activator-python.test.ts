import test from "node:test";
import assert from "node:assert/strict";
import crypto from "node:crypto";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { buildBundle } from "./bundle.ts";
import { makeFixtureArtifact } from "./test-fixture.ts";

/**
 * W30: the server side is Python stdlib (deploy/iran/lib/ahanassa_iran.py), the CI side TypeScript. This runs the
 * Python suite inside `npm test` and checks the two halves agree on the one thing that matters: a bundle the CI builds
 * is accepted, file for file, by the root activator's verification.
 */
const repo = path.resolve(import.meta.dirname, "../..");
const python = ["python3", "/usr/bin/python3"].find((p) => spawnSync(p, ["-c", "import sys; assert sys.version_info >= (3, 10)"]).status === 0);
// OpenSSH >= 8.2 knows -Y sign (it complains about the missing namespace); older ones print the generic usage.
const sshSign = /namespace/i.test(spawnSync("ssh-keygen", ["-Y", "sign"], { encoding: "utf8" }).stderr ?? "");
const skip = !python ? "python3 >= 3.10 not found" : !sshSign ? "ssh-keygen without -Y" : false;

test("W30: the activator / sync agent Python suite passes (tampered zip, extra file, bad signature, old seq, nginx -t, smoke, sources)", { skip }, () => {
  const r = spawnSync(python!, ["-m", "unittest", "discover", "-s", "deploy/iran/tests"], { cwd: repo, encoding: "utf8" });
  assert.equal(r.status, 0, r.stderr.slice(-3000));
  assert.match(r.stderr, /\nOK\b/);
});

test("W30: a bundle built by scripts/iran/bundle.ts passes the activator's verification and unpacks byte for byte", { skip }, () => {
  const artifact = makeFixtureArtifact();
  const out = fs.mkdtempSync(path.join(os.tmpdir(), "w30-x-"));
  const s = buildBundle(artifact, out);
  const zip = path.join(out, "iran-bundle.zip");
  const activation = { schema: "iran-activation.v1", env: "production", seq: 1, reason: "publish", run_id: 1, code_sha: s.code_sha, snapshot_version: s.snapshot_version, manifest_sha256: s.manifest_sha256, bundle_sha256: s.bundle_sha256, bundle_bytes: s.bundle_bytes, bundle_artifact: `iran-bundle-production-${s.snapshot_version}`, created_at: "2026-10-22T00:00:00Z" };
  const dest = path.join(out, "release");
  const code = `import json,sys; sys.path.insert(0, ${JSON.stringify(path.join(repo, "deploy/iran/lib"))}); import ahanassa_iran as ai
a = ai.parse_activation(json.dumps(json.loads(sys.argv[2])).encode(), "production")
print(json.dumps(ai.unpack_bundle(sys.argv[1], a, sys.argv[3], None)))`;
  const r = spawnSync(python!, ["-I", "-c", code, zip, JSON.stringify(activation), dest], { encoding: "utf8" });
  assert.equal(r.status, 0, r.stderr);
  const pub = path.join(artifact, "public-assets");
  for (const f of fs.readdirSync(pub, { recursive: true }).map(String)) {
    if (!fs.statSync(path.join(pub, f)).isFile()) continue;
    const sha = (p: string) => crypto.createHash("sha256").update(fs.readFileSync(p)).digest("hex");
    assert.equal(sha(path.join(dest, "public", f)), sha(path.join(pub, f)), f);
  }
  assert.ok(fs.existsSync(path.join(dest, "private/rfq-variant-index.json")));
  assert.ok(!fs.existsSync(path.join(dest, "private/snapshot.json")));
});
