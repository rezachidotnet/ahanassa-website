import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, mkdtempSync, writeFileSync, rmSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { tmpdir } from "node:os";
import path from "node:path";

// Regression safety-net for deploy-staging.yml's smoke gate S5 (/products) and
// S7 (/contact) — the staging counterpart of production-smoke-harness.test.ts,
// and executing the REAL step source the same way.
//
// WHAT THIS PROTECTS AGAINST
// --------------------------
// After the full catalog (16 templates / 256 variants) was published to
// staging on 2026-09-29, /contact server-renders every public variant in the
// RFQ selector and grew to ~191 KB. S7 checked it with
//
//     printf '%s' "$CONTACT_BODY" | grep -q 'id="website"'
//
// under `set -uo pipefail`. grep -q exits at its first match, printf takes
// SIGPIPE writing the rest of a body larger than the pipe buffer, and pipefail
// reports 141 — so S7 failed although every field was present. S5 carried the
// same construct in its empty-state branch, and its slug discovery
// (`$(printf ... | grep -o ... | head -n1 | sed ...)`) aborted the whole step
// under GitHub's `bash -e` wrapper on an empty catalog (exit 1) or a large one
// (exit 141) — the defect deploy-production.yml's S5 already fixed after run
// 35533626395.
//
// These tests extract the real preamble, S5 and S7 from the real workflow and
// run them under `bash -e`, stubbing only the two network helpers.

const here = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(here, "..", "..");
const workflow = readFileSync(path.join(repoRoot, ".github", "workflows", "deploy-staging.yml"), "utf8");

/** The staging smoke step's shell source, dedented by the 10-space block-scalar indent. */
function smokeScript(): string {
  const lines = workflow.split("\n");
  const stepIdx = lines.findIndex((l) => l.includes("- name: Staging smoke checks"));
  assert.notEqual(stepIdx, -1, "the staging smoke step must exist in deploy-staging.yml");
  const runIdx = lines.findIndex((l, i) => i > stepIdx && l.trim() === "run: |");
  assert.notEqual(runIdx, -1, "the staging smoke step must use a `run: |` block scalar");

  const body: string[] = [];
  for (let i = runIdx + 1; i < lines.length; i += 1) {
    const line = lines[i];
    if (line.trim() !== "" && !line.startsWith("          ")) break;
    body.push(line.startsWith("          ") ? line.slice(10) : "");
  }
  return body.join("\n");
}

/** Extracts `[startMarker, endMarker)` from the smoke script. */
function sliceScript(script: string, startMarker: string, endMarker: string | null): string {
  const lines = script.split("\n");
  const start = lines.findIndex((l) => l.includes(startMarker));
  assert.notEqual(start, -1, `smoke script must contain: ${startMarker}`);
  let end = lines.length;
  if (endMarker !== null) {
    end = lines.findIndex((l, i) => i > start && l.includes(endMarker));
    assert.notEqual(end, -1, `smoke script must contain: ${endMarker}`);
  }
  return lines.slice(start, end).join("\n");
}

const SCRIPT = smokeScript();
const PREAMBLE = sliceScript(SCRIPT, "set -uo pipefail", 'echo "== S1:');
const S5_BLOCK = sliceScript(SCRIPT, 'echo "== S5:', 'echo "== S6:');
const S7_BLOCK = sliceScript(SCRIPT, 'echo "== S7:', 'echo "== S8:');
// The end-of-suite verdict: the LAST top-level `if [ "$FAILURES" -gt 0 ]` (the
// earlier, indented one only writes the step summary).
const VERDICT_BLOCK = (() => {
  const lines = SCRIPT.split("\n");
  const start = lines.lastIndexOf('if [ "$FAILURES" -gt 0 ]; then');
  assert.notEqual(start, -1, "smoke script must end with a fail-closed verdict");
  return lines.slice(start).join("\n");
})();
const withoutComments = (s: string) =>
  s
    .split("\n")
    .filter((l) => !l.trim().startsWith("#"))
    .join("\n");

const EMPTY_FA = "کاتالوگ آنلاین در حال آماده‌سازی است";

/**
 * A multi-line page well past the 64 KB pipe buffer, with `head` near the top —
 * the real /contact shape (fields early, a long variant list after). A single
 * huge line would NOT reproduce the bug: grep must buffer a whole line before
 * matching, so it reads everything and printf finishes first.
 */
function largePage(head: string, rows = 20000): string {
  const filler = Array.from({ length: rows }, (_, i) => `<option value="CVAR-${i}">AA-ITEM-${i}</option>`).join("\n");
  return `<!doctype html>\n<html><body>\n${head}\n${filler}\n</body></html>\n`;
}
const CONTACT_FIELDS = '<input id="website" name="website"/>\n<input id="email" name="email"/>\n<textarea name="message"></textarea>';

interface RunResult {
  status: number;
  stdout: string;
  reachedEnd: boolean;
  failures: number;
  slug: string;
}

/** PREAMBLE + stubs + blocks (+ verdict) under `bash -e`, the wrapper GitHub uses. */
function run(blocks: string[], bodies: Record<string, string>, opts: { includeVerdict?: boolean } = {}): RunResult {
  const dir = mkdtempSync(path.join(tmpdir(), "staging-smoke-"));
  try {
    for (const [name, body] of Object.entries(bodies)) writeFileSync(path.join(dir, name), body);
    const script = [
      PREAMBLE,
      // Only the two network-touching helpers are replaced; fail()/pass()/the
      // counter and the S5/S7 logic stay real.
      'http_status() { echo 200; }',
      'body_of() { case "$1" in */contact) cat "$FIXTURE_DIR/contact.html" ;; */products) cat "$FIXTURE_DIR/products.html" ;; esac; }',
      ...blocks,
      'echo "HARNESS_REACHED_END=1"',
      'echo "HARNESS_FAILURES=$FAILURES"',
      'echo "HARNESS_SLUG=<${CATALOG_SLUG-<UNSET>}>"',
      opts.includeVerdict ? VERDICT_BLOCK : "",
    ].join("\n");
    const scriptPath = path.join(dir, "smoke.sh");
    writeFileSync(scriptPath, script);
    const res = spawnSync("bash", ["-e", scriptPath], {
      encoding: "utf8",
      env: { ...process.env, FIXTURE_DIR: dir, GITHUB_STEP_SUMMARY: path.join(dir, "summary.md") },
    });
    const stdout = res.stdout ?? "";
    const m = stdout.match(/HARNESS_FAILURES=(\d+)/);
    const s = stdout.match(/HARNESS_SLUG=<([\s\S]*?)>\n/);
    return {
      status: res.status ?? -1,
      stdout,
      reachedEnd: stdout.includes("HARNESS_REACHED_END=1"),
      failures: m ? Number(m[1]) : -1,
      slug: s ? s[1] : "<MISSING>",
    };
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
}

// ---------------------------------------------------------------------------
// Control: the fixture really exercises the SIGPIPE failure mode. Without this,
// the S7 scenarios below could pass on a fixture too small to ever trigger it.
// ---------------------------------------------------------------------------
test("control: the old `printf | grep -q` form returns 141 on the large fixture under pipefail", () => {
  const dir = mkdtempSync(path.join(tmpdir(), "staging-smoke-ctl-"));
  try {
    writeFileSync(path.join(dir, "contact.html"), largePage(CONTACT_FIELDS));
    const res = spawnSync(
      "bash",
      ["-c", `set -uo pipefail; BODY="$(cat "$1")"; rc=0; printf '%s' "$BODY" | grep -q 'id="website"' || rc=$?; echo "rc=$rc"`, "_", path.join(dir, "contact.html")],
      { encoding: "utf8" },
    );
    assert.match(res.stdout, /rc=141/, `the fixture must reproduce the pipefail false negative, got ${res.stdout}`);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

// ---------------------------------------------------------------------------
// S7 — /contact
// ---------------------------------------------------------------------------
test("S7: a large /contact with every RFQ field passes under bash -e + pipefail", () => {
  const r = run([S7_BLOCK], { "contact.html": largePage(CONTACT_FIELDS) });
  assert.equal(r.status, 0, `S7 must not abort.\n${r.stdout.slice(0, 2000)}`);
  assert.ok(r.reachedEnd);
  assert.equal(r.failures, 0, `a complete RFQ form must not be a failure.\n${r.stdout.slice(0, 2000)}`);
  assert.ok(r.stdout.includes("/contact -> 200, RFQ form server-rendered (no RFQ submitted)"));
});

for (const missing of ['id="website"', 'id="email"', 'name="message"']) {
  test(`S7: a large /contact missing ${missing} still fails the gate`, () => {
    const head = CONTACT_FIELDS.split("\n")
      .filter((l) => !l.includes(missing))
      .join("\n");
    const r = run([S7_BLOCK], { "contact.html": largePage(head) }, { includeVerdict: true });
    assert.equal(r.failures, 1, `a missing field must be counted as a failure.\n${r.stdout.slice(0, 2000)}`);
    assert.ok(r.stdout.includes("/contact returned 200 but the RFQ form fields were not found in the rendered HTML"));
    assert.equal(r.status, 1, "the smoke gate must exit non-zero when any assertion failed");
  });
}

// ---------------------------------------------------------------------------
// S5 — /products
// ---------------------------------------------------------------------------
test("S5: a populated catalog discovers the first slug", () => {
  const r = run([S5_BLOCK], { "products.html": largePage('<a href="/products/ipe-beam">IPE</a>\n<a href="/products/rebar-aj400">x</a>', 10) });
  assert.equal(r.status, 0, r.stdout);
  assert.equal(r.failures, 0);
  assert.equal(r.slug, "ipe-beam");
  assert.ok(r.stdout.includes("/products -> 200, discovered a published catalog slug"));
});

test("S5: a very large catalog does not abort via SIGPIPE and still yields one bare slug", () => {
  const links = Array.from({ length: 20000 }, (_, i) => `<a href="/products/steel-item-${i}">x</a>`).join("\n");
  const r = run([S5_BLOCK], { "products.html": `<html>\n${links}\n</html>\n` });
  assert.equal(r.status, 0, `a large catalog must not abort S5.\n${r.stdout.slice(0, 2000)}`);
  assert.ok(r.reachedEnd);
  assert.equal(r.slug, "steel-item-0");
  assert.match(r.slug, /^[a-zA-Z0-9_-]+$/, "the slug must be a single bare token, never every match concatenated");
});

test("S5: a large legitimately empty catalog reaches the empty-state branch instead of aborting", () => {
  const r = run([S5_BLOCK], { "products.html": largePage(`<p>${EMPTY_FA}.</p>`) });
  assert.equal(r.status, 0, `an empty catalog must not abort S5 under bash -e.\n${r.stdout.slice(0, 2000)}`);
  assert.ok(r.reachedEnd);
  assert.equal(r.failures, 0);
  assert.equal(r.slug, "");
  assert.ok(r.stdout.includes("legitimate empty-catalog state"));
});

test("S5: a 200 with neither a product link nor the empty state still fails the gate", () => {
  const r = run([S5_BLOCK], { "products.html": largePage("<p>Something unexpected rendered here.</p>") }, { includeVerdict: true });
  assert.equal(r.failures, 1, r.stdout.slice(0, 2000));
  assert.ok(r.stdout.includes("/products returned 200 but neither a product link nor the known empty-catalog state was found"));
  assert.equal(r.status, 1);
});

// ---------------------------------------------------------------------------
// Static guards
// ---------------------------------------------------------------------------
test("no smoke check pipes a stored response body into grep", () => {
  const offenders = withoutComments(SCRIPT)
    .split("\n")
    .filter((l) => /printf\s+'%s'\s+"\$[A-Z_]*BODY"\s*\|\s*grep/.test(l));
  assert.deepEqual(offenders, [], "use `grep ... <<<\"$BODY\"` — piping a large body into grep reports 141 under pipefail");
});

test("S5 slug discovery tolerates only grep's no-match status and never uses head -n1", () => {
  const code = withoutComments(S5_BLOCK);
  assert.ok(/\|\| GREP_STATUS=\$\?/.test(code), "S5 must capture grep's status instead of letting errexit act on it");
  assert.ok(/\[ "\$GREP_STATUS" -gt 1 \]/.test(code), "S5 must still fail closed on a real grep error");
  assert.ok(!/\|\s*head -n1/.test(code), "S5 must not pipe into head -n1 (SIGPIPE under pipefail)");
});

test("the staging smoke step keeps pipefail and GitHub's bash -e wrapper, and every S1-S10 check", () => {
  assert.ok(SCRIPT.startsWith("set -uo pipefail"), "pipefail must stay enabled");
  const stepIdx = workflow.indexOf("- name: Staging smoke checks");
  const runIdx = workflow.indexOf("run: |", stepIdx);
  assert.ok(!/^\s+shell:/m.test(workflow.slice(stepIdx, runIdx)), "no shell: override — the tests model bash -e");
  for (const n of ["S1", "S2", "S3", "S4", "S5", "S6", "S7", "S8", "S9", "S10"]) {
    assert.ok(SCRIPT.includes(`echo "== ${n}:`), `smoke step must still contain ${n}`);
  }
});
