import { test } from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import path from "node:path";

/**
 * W32 (W29 P2 §3.2, owner rule): the RFQ Worker's own test suites, run a second time on the domestic intake's
 * production Node adapters (RFQ_TEST_RUNTIME=node, lib/testing/rfq-runtime.ts). `npm test` runs them once as the
 * Worker (their own files) and once here as Node; a test that passes on the Worker and fails on Node fails this one.
 */
const ROOT = path.resolve(import.meta.dirname, "../..");
const SUITES = ["lib/rfq-worker/rfq-worker.test.ts", "lib/rfq-worker/attachments.test.ts", "lib/rfq-worker/admin.test.ts"];

test("dual runtime: the RFQ Worker suites pass on the Node runtime (NodeD1 + FsBucket)", () => {
  const env: NodeJS.ProcessEnv = { ...process.env, RFQ_TEST_RUNTIME: "node" };
  delete env.NODE_TEST_CONTEXT; // a fresh test run, not a child of this one
  const r = spawnSync(process.execPath, ["--test", "--test-reporter=tap", ...SUITES], { cwd: ROOT, env, encoding: "utf8", timeout: 300_000 });
  const pass = /# pass (\d+)/.exec(r.stdout)?.[1];
  const fail = /# fail (\d+)/.exec(r.stdout)?.[1];
  const failed = r.stdout.split("\n").filter((l) => /^\s*not ok /.test(l));
  assert.equal(r.status, 0, `node runtime failures:\n${failed.join("\n")}\n${r.stderr.slice(-2000)}`);
  assert.equal(fail, "0");
  assert.ok(Number(pass) >= 50, `expected the full suites, got ${pass} passing tests`);
});
