import { test } from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { evaluateContentRebuild, nonStaticPublicPath } from "./content-rebuild.ts";

// RELEASE_POLICY.md §19 (CONTENT_REBUILD). Every identifier is synthetic (§14).
const STABLE = "a".repeat(40);
const OTHER = "b".repeat(40);
const CLI = path.join(path.dirname(fileURLToPath(import.meta.url)), "content-rebuild-cli.ts");

const HEADER = "| RELEASE_SHA | WORKER_VERSION_ID | RELEASE_STATE | FINAL_TRAFFIC_PERCENT | STAGING_RUN_ID | PRODUCTION_RUN_ID | PROMOTION_RUN_ID | ROLLBACK_VERSION_ID | FINAL_RISK | RESULT | TIMESTAMP |";
const SEP = "| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |";
const ledger = (...rows: string[]) => ["# Ledger", "", HEADER, SEP, ...rows, ""].join("\n");
const stableRow = (sha: string) => `| \`${sha}\` | \`00000000-0000-4000-8000-000000000001\` | STABLE_100 | 100 | \`1\` | \`2\` | \`3\` | - | HIGH | PASS | 2026-10-01T00:00:00Z |`;
const canaryRow = (sha: string) => `| \`${sha}\` | \`00000000-0000-4000-8000-000000000002\` | CANARY_ACTIVE | 10 | \`4\` | \`5\` | - | - | HIGH | PASS | 2026-10-02T00:00:00Z |`;

function manifest(overrides: Record<string, unknown> = {}, pipeline: Record<string, unknown> = {}) {
  return {
    schema_version: "artifact.v1",
    code_sha: STABLE,
    snapshot_version: "snap-2026100407093900",
    environment: "production",
    generated_at: "2026-10-04T07:10:00Z",
    counts: { variants_active: 256 },
    pipeline: {
      content_sha256: "c".repeat(64),
      source_kind: "odoo_full_fetch",
      fetched_at: "2026-10-04T07:00:00Z",
      odoo_requests: 10,
      odoo_duration_ms: 6000,
      previous_active_version: "snap-2026100406523600",
      decrease_threshold: 0.2,
      allow_decrease: false,
      overridden_decreases: [],
      run: { id: "1", url: null, ref: "main", event: "schedule" },
      ...pipeline,
    },
    public_assets: [{ path: "index.html", bytes: 10, sha256: "d".repeat(64) }],
    private_snapshot: [{ path: "snapshot.json", bytes: 10, sha256: "e".repeat(64) }],
    ...overrides,
  };
}

test("match: code_sha = latest STABLE_100, static only, gates passed -> AUTO (no manual approval)", () => {
  const d = evaluateContentRebuild({ manifest: manifest(), ledgerMarkdown: ledger(stableRow(STABLE)), gatesPassed: true });
  assert.equal(d.result, "AUTO");
  assert.equal(d.result === "AUTO" && d.baseProductionSha, STABLE);
});

test("the LATEST STABLE_100 counts, and an active canary is never the baseline", () => {
  const older = evaluateContentRebuild({ manifest: manifest(), ledgerMarkdown: ledger(stableRow(STABLE), stableRow(OTHER)), gatesPassed: true });
  assert.equal(older.result === "REFUSED" && older.code, "CODE_SHA_MISMATCH");
  const canary = evaluateContentRebuild({ manifest: manifest({ code_sha: OTHER }), ledgerMarkdown: ledger(stableRow(STABLE), canaryRow(OTHER)), gatesPassed: true });
  assert.equal(canary.result === "REFUSED" && canary.code, "CODE_SHA_MISMATCH");
});

test("mismatch: code_sha differs from the STABLE_100 release -> REFUSED (code release path)", () => {
  const d = evaluateContentRebuild({ manifest: manifest({ code_sha: OTHER }), ledgerMarkdown: ledger(stableRow(STABLE)), gatesPassed: true });
  assert.equal(d.result, "REFUSED");
  assert.equal(d.result === "REFUSED" && d.code, "CODE_SHA_MISMATCH");
  assert.match(d.reasons[0], /code release \(deploy-production\.yml, HIGH canary path\)/);
});

test("ledger missing, malformed or without STABLE_100 -> REFUSED (fail closed)", () => {
  assert.equal((evaluateContentRebuild({ manifest: manifest(), ledgerMarkdown: null, gatesPassed: true }) as { code: string }).code, "LEDGER_MISSING");
  assert.equal((evaluateContentRebuild({ manifest: manifest(), ledgerMarkdown: "# no table", gatesPassed: true }) as { code: string }).code, "BASE_PRODUCTION_SHA_UNRESOLVED");
  assert.equal((evaluateContentRebuild({ manifest: manifest(), ledgerMarkdown: ledger(canaryRow(STABLE)), gatesPassed: true }) as { code: string }).code, "BASE_PRODUCTION_SHA_UNRESOLVED");
  assert.equal((evaluateContentRebuild({ manifest: manifest(), ledgerMarkdown: ledger("| `short` | x | STABLE_100 | 100 | 1 | 2 | 3 | - | HIGH | PASS | t |"), gatesPassed: true }) as { code: string }).code, "BASE_PRODUCTION_SHA_UNRESOLVED");
});

test("allow_decrease or any overridden decrease -> APPROVAL_REQUIRED", () => {
  const a = evaluateContentRebuild({ manifest: manifest({}, { allow_decrease: true }), ledgerMarkdown: ledger(stableRow(STABLE)), gatesPassed: true });
  assert.equal(a.result, "APPROVAL_REQUIRED");
  assert.match(a.reasons.join(" "), /allow_decrease/);
  const b = evaluateContentRebuild({ manifest: manifest({}, { overridden_decreases: [{ key: "variants_active", previous: 256, current: 182 }] }), ledgerMarkdown: ledger(stableRow(STABLE)), gatesPassed: true });
  assert.equal(b.result, "APPROVAL_REQUIRED");
  assert.match(b.reasons.join(" "), /variants_active 256→182/);
});

test("a failed gate -> APPROVAL_REQUIRED, never AUTO", () => {
  const d = evaluateContentRebuild({ manifest: manifest(), ledgerMarkdown: ledger(stableRow(STABLE)), gatesPassed: false });
  assert.equal(d.result, "APPROVAL_REQUIRED");
});

test("not static-only, staging target, no pipeline block or invalid manifest -> REFUSED", () => {
  const code = (m: unknown) => (evaluateContentRebuild({ manifest: m, ledgerMarkdown: ledger(stableRow(STABLE)), gatesPassed: true }) as { code?: string }).code;
  assert.equal(code(manifest({ public_assets: [{ path: "_worker.js", bytes: 1, sha256: "f".repeat(64) }] })), "NOT_STATIC_ONLY");
  assert.equal(code(manifest({ environment: "staging" })), "TARGET_NOT_PRODUCTION");
  const { pipeline: _p, ...noPipeline } = manifest();
  assert.equal(code(noPipeline), "NOT_A_CONTENT_PIPELINE_ARTIFACT");
  assert.equal(code({ ...manifest(), code_sha: "main" }), "MANIFEST_INVALID");
  for (const p of ["_worker.js", "a/_routes.json", "wrangler.jsonc", "functions/x.js"]) assert.ok(nonStaticPublicPath(p), p);
  for (const p of ["index.html", "_headers", "_redirects", "data/rfq-catalog.fa.json"]) assert.equal(nonStaticPublicPath(p), null, p);
});

test("CLI: exit 0 AUTO, 3 APPROVAL_REQUIRED, 1 REFUSED, 2 when it cannot run; writes the decision", () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "content-rebuild-"));
  const ledgerFile = path.join(dir, "ledger.md");
  fs.writeFileSync(ledgerFile, ledger(stableRow(STABLE)));
  const run = (m: unknown, extra: string[] = []) => {
    fs.writeFileSync(path.join(dir, "manifest.json"), JSON.stringify(m));
    const r = spawnSync(process.execPath, [CLI, "--artifact", dir, "--ledger-file", ledgerFile, "--decision-file", path.join(dir, "d.json"), ...extra], { encoding: "utf8", env: { ...process.env, GITHUB_STEP_SUMMARY: "", GITHUB_OUTPUT: "" } });
    return r.status;
  };
  assert.equal(run(manifest()), 0);
  assert.equal(JSON.parse(fs.readFileSync(path.join(dir, "d.json"), "utf8")).result, "AUTO");
  assert.equal(run(manifest({}, { allow_decrease: true })), 3);
  assert.equal(run(manifest({ code_sha: OTHER })), 1);
  assert.equal(run(manifest(), ["--gates-passed", "maybe"]), 2);
  fs.rmSync(ledgerFile);
  assert.equal(run(manifest()), 1, "ledger missing -> REFUSED");
});
