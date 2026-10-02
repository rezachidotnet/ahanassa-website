import { test } from "node:test";
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

/**
 * W3 C1: test hooks are not compiled into the production RFQ Worker bundle at
 * all. Bundles both entries the way wrangler does (esbuild, ESM, workerd
 * conditions) and scans the output. The staging bundle is the positive
 * control: the same strings must be found there.
 */
const ROOT = path.resolve(import.meta.dirname, "../..");
const HOOK_STRINGS = ["TEST_KILL_AFTER_POST", "kill_after_post", "/__admin/test/", "deliver-real-401", "TEST_HOOKS", "odoo.ahanassa.com", "stagingTestRoutes"];
/** Size budget for the production bundle (raw bytes) — W3 cut it from 1025 KiB to ~250 KiB; zod must not come back. */
const MAX_PRODUCTION_BYTES = 300 * 1024;

function bundle(entry: string): string {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "rfq-bundle-scan-"));
  const out = path.join(dir, "out.js");
  execFileSync(path.join(ROOT, "node_modules/.bin/esbuild"), [path.join(ROOT, entry), "--bundle", "--format=esm", "--platform=neutral", "--conditions=workerd,worker,browser", "--main-fields=module,main", "--external:node:*", "--external:cloudflare:*", `--outfile=${out}`, "--log-level=error"]);
  const text = fs.readFileSync(out, "utf8");
  fs.rmSync(dir, { recursive: true, force: true });
  return text;
}

test("production RFQ Worker bundle contains no test hook, no test route and no zod; the staging bundle does contain the hooks", () => {
  const production = bundle("workers/rfq/index.ts");
  const staging = bundle("workers/rfq/index.staging.ts");
  for (const s of HOOK_STRINGS) {
    assert.equal(production.includes(s), false, `production bundle contains "${s}"`);
    assert.equal(staging.includes(s), true, `positive control: staging bundle lacks "${s}"`);
  }
  assert.doesNotMatch(production, /node_modules\/zod\//, "zod is bundled into the production Worker");
  assert.ok(Buffer.byteLength(production) < MAX_PRODUCTION_BYTES, `production bundle ${Buffer.byteLength(production)} B >= ${MAX_PRODUCTION_BYTES} B`);
  // The §15 admin tool itself IS in production.
  assert.ok(production.includes("/__admin/manual-review"));
});
