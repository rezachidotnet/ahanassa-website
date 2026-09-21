import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, mkdtempSync, writeFileSync, rmSync, existsSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { tmpdir } from "node:os";
import path from "node:path";

// Regression safety-net for the production smoke gate's S5 (catalog index)
// check, in the same spirit as workflow-invariants.test.ts in this directory
// — but executing, not merely inspecting.
//
// WHAT THIS PROTECTS AGAINST
// --------------------------
// The first real production release (deploy-production.yml run 35533626395,
// SHA f2202ab, 2026-09-20) deployed successfully at a 10% canary and then had
// its mandatory smoke gate abort nine assertions in, reporting no verdict at
// all. Root cause: GitHub runs every `run:` block under
// `shell: /usr/bin/bash -e {0}`, and the step's own `set -uo pipefail` does
// NOT clear that inherited errexit. S5 discovered a catalog slug with
//
//     SLUG="$(grep -o ... | head -n1 | sed -E ...)"
//
// and `grep` exits 1 when a locale's catalog is legitimately empty. Under
// errexit + pipefail that assignment terminated the entire step — before the
// `elif grep -q "${LOCALE_EMPTY_STATE[$LOC]}"` branch written for exactly
// that case could run. Production's fa catalog has published slugs while en
// and ar are in the documented empty state (fa/en/ar publish independently —
// docs/CATALOG_EDITORIAL_PUBLICATION.md §6), so the fa iteration passed and
// the en iteration killed the step.
//
// A purely static assertion would not have caught this, and would not catch a
// re-introduction that merely reshuffles the pipeline. So these tests extract
// the REAL preamble and the REAL S5 block out of the REAL workflow file and
// execute them under the REAL `bash -e` wrapper GitHub uses, stubbing only the
// two functions that would otherwise reach the network. If someone
// reintroduces any construct that makes an empty catalog fatal, scenario B
// fails here instead of on the next production release.
//
// Full incident detail: docs/release/PRODUCTION_CANARY_SMOKE_GATE_FIX_REPORT.md
// and docs/release/FIRST_PRODUCTION_10_PERCENT_CANARY_REPORT.md.

const here = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(here, "..", "..");
const workflowPath = path.join(repoRoot, ".github", "workflows", "deploy-production.yml");

const workflow = readFileSync(workflowPath, "utf8");

/**
 * Pulls the smoke step's shell source out of the workflow and dedents it by
 * the 10-space YAML block-scalar indent, so the extracted text is exactly the
 * script the runner executes.
 */
function smokeScript(src: string = workflow, label: string = "deploy-production.yml"): string {
  const lines = src.split("\n");
  const stepIdx = lines.findIndex((l) => l.includes("- name: Production smoke checks"));
  assert.notEqual(stepIdx, -1, `the production smoke step must exist in ${label}`);
  const runIdx = lines.findIndex((l, i) => i > stepIdx && l.trim() === "run: |");
  assert.notEqual(runIdx, -1, `${label}'s production smoke step must use a \`run: |\` block scalar`);

  const body: string[] = [];
  for (let i = runIdx + 1; i < lines.length; i += 1) {
    const line = lines[i];
    // The block scalar ends at the first non-blank line indented less than
    // the block's own 10-space indent (i.e. the next step, or end of job).
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
// Everything before S1: `set -uo pipefail`, BASE_URL, SMOKE_DIR, the counters,
// the real fail()/pass()/http_status()/body_to_file() helpers, and the real
// LOCALE_PREFIX / LOCALE_EMPTY_STATE / CATALOG_SLUG declarations.
const PREAMBLE = sliceScript(SCRIPT, "set -uo pipefail", 'echo "== S1:');
const S5_BLOCK = sliceScript(SCRIPT, 'echo "== S5:', 'echo "== S6:');
// The end-of-suite verdict: computes SMOKE_RESULT and `exit 1` when anything failed.
const VERDICT_BLOCK = sliceScript(SCRIPT, "TOTAL_CHECKS=$((CHECKS_PASSED + FAILURES))", null);
// Comment-stripped view for the static assertions below: the fix's own comments
// legitimately quote the old broken construct while explaining why it was
// replaced, and that must not count as the construct still being present. Same
// discipline as workflow-invariants.test.ts's withoutComments().
const S5_CODE = S5_BLOCK.split("\n")
  .filter((l) => !l.trim().startsWith("#"))
  .join("\n");

const PRODUCT_LINK_FA = '<a href="/products/hot-rolled-plate-s355jr">ورق گرم</a>';
const PRODUCT_LINK_EN = '<a href="/en/products/hot-rolled-plate-s355jr">Hot rolled plate</a>';
const PRODUCT_LINK_AR = '<a href="/ar/products/hot-rolled-plate-s355jr">لوح</a>';
// The exact localized empty-catalog strings the workflow matches on, which are
// themselves rendered by components/products/catalog-empty-state.tsx.
const EMPTY_FA = "کاتالوگ آنلاین در حال آماده‌سازی است";
const EMPTY_EN = "The online catalog is being prepared";
const EMPTY_AR = "الكتالوج الإلكتروني قيد الإعداد";

const page = (inner: string) => `<!doctype html><html><body><main>${inner}</main></body></html>\n`;

interface RunResult {
  status: number;
  stdout: string;
  reachedEnd: boolean;
  failures: number;
  passed: number;
  slugs: Record<string, string>;
}

/**
 * Runs PREAMBLE + stubs + S5 (optionally + the end-of-suite verdict) under
 * `bash -e`, byte-for-byte the wrapper GitHub Actions uses.
 */
function runS5(
  fixtures: Record<"fa" | "en" | "ar", string>,
  opts: { stubStatus?: string; includeVerdict?: boolean } = {},
): RunResult {
  const dir = mkdtempSync(path.join(tmpdir(), "smoke-s5-"));
  try {
    const fixtureDir = path.join(dir, "fixtures");
    const runnerTemp = path.join(dir, "runner");
    for (const d of [fixtureDir, runnerTemp]) {
      writeFileSync(path.join(dir, ".keep"), "");
      spawnSync("mkdir", ["-p", d]);
    }
    for (const loc of ["fa", "en", "ar"] as const) {
      writeFileSync(path.join(fixtureDir, `s5-products-${loc}.html`), fixtures[loc]);
    }

    const script = [
      PREAMBLE,
      // Override ONLY the two network-touching helpers. fail(), pass(),
      // the counters, the locale maps and S5 itself all stay real.
      'http_status() { echo "${STUB_STATUS:-200}"; }',
      'body_to_file() { cp "$FIXTURE_DIR/$2" "$SMOKE_DIR/$2"; echo "$SMOKE_DIR/$2"; }',
      S5_BLOCK,
      'echo "HARNESS_REACHED_END=1"',
      'echo "HARNESS_FAILURES=$FAILURES"',
      'echo "HARNESS_PASSED=$CHECKS_PASSED"',
      // Delimited so a MULTI-LINE slug is visible to the parser below rather than
      // being silently truncated to its first line (that masking is exactly how a
      // `grep -o -m1` regression slipped past an earlier revision of this test).
      'for L in fa en ar; do echo "HARNESS_SLUG_$L=<${CATALOG_SLUG[$L]-<UNSET>}>"; done',
      opts.includeVerdict ? VERDICT_BLOCK : "",
    ].join("\n");

    const scriptPath = path.join(dir, "s5.sh");
    writeFileSync(scriptPath, script);

    const res = spawnSync("bash", ["-e", scriptPath], {
      encoding: "utf8",
      env: {
        ...process.env,
        RUNNER_TEMP: runnerTemp,
        FIXTURE_DIR: fixtureDir,
        // The end-of-suite verdict references these; `set -u` would abort without them.
        NEW_VERSION_ID: "4a32c5f9-3cfb-4c05-84b3-8e43ba9658ed",
        PREVIOUS_VERSION_ID: "b07d8697-620c-485c-8fed-21b893ab602c",
        GITHUB_STEP_SUMMARY: path.join(dir, "summary.md"),
        GITHUB_ENV: path.join(dir, "env.txt"),
        ...(opts.stubStatus ? { STUB_STATUS: opts.stubStatus } : {}),
      },
    });

    const stdout = res.stdout ?? "";
    const num = (key: string) => {
      const m = stdout.match(new RegExp(`${key}=(-?\\d+)`));
      return m ? Number(m[1]) : -1;
    };
    const slugs: Record<string, string> = {};
    for (const loc of ["fa", "en", "ar"]) {
      // `[\s\S]*?` deliberately spans newlines: a multi-line slug is a BUG we
      // must be able to see, not something to quietly truncate.
      const m = stdout.match(new RegExp(`HARNESS_SLUG_${loc}=<([\\s\\S]*?)>\\n`));
      slugs[loc] = m ? m[1] : "<MISSING>";
    }
    return {
      status: res.status ?? -1,
      stdout,
      reachedEnd: stdout.includes("HARNESS_REACHED_END=1"),
      failures: num("HARNESS_FAILURES"),
      passed: num("HARNESS_PASSED"),
      slugs,
    };
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
}

// ---------------------------------------------------------------------------
// Scenario A — every locale has a published catalog: slug discovery succeeds.
// ---------------------------------------------------------------------------
test("S5: a populated catalog discovers a slug in every locale", () => {
  const r = runS5({
    fa: page(PRODUCT_LINK_FA),
    en: page(PRODUCT_LINK_EN),
    ar: page(PRODUCT_LINK_AR),
  });

  assert.equal(r.status, 0, `S5 must not abort on a populated catalog.\n${r.stdout}`);
  assert.ok(r.reachedEnd, "S5 must run to completion on a populated catalog");
  assert.equal(r.failures, 0, "a populated catalog must produce no smoke failures");
  assert.equal(r.passed, 3, "a populated catalog must produce one pass per locale");
  for (const loc of ["fa", "en", "ar"]) {
    assert.equal(r.slugs[loc], "hot-rolled-plate-s355jr", `slug must be discovered for ${loc}`);
  }
  for (const loc of ["fa", "en", "ar"]) {
    assert.ok(
      !r.slugs[loc].includes("\n"),
      `the discovered ${loc} slug must be the FIRST match only, not every match concatenated — ` +
        `a multi-line value would be spliced straight into S6's URL. Got: ${JSON.stringify(r.slugs[loc])}`,
    );
    assert.match(r.slugs[loc], /^[a-zA-Z0-9_-]+$/, `${loc} slug must be a bare slug token`);
  }
  assert.ok(r.stdout.includes("discovered a published catalog slug"));
});

// ---------------------------------------------------------------------------
// Scenario B — THE REGRESSION. Exactly production's shape on 2026-09-20:
// fa published, en/ar legitimately empty. The step must NOT terminate, and the
// intended empty-catalog branch must execute for en and ar.
// ---------------------------------------------------------------------------
test("S5: a legitimately empty locale catalog does not terminate the step (run 35533626395 regression)", () => {
  const r = runS5({
    fa: page(PRODUCT_LINK_FA),
    en: page(`<p>${EMPTY_EN}</p>`),
    ar: page(`<p>${EMPTY_AR}</p>`),
  });

  // The precise failure mode: before the fix this exited 1 with no verdict,
  // having printed only the fa pass line.
  assert.equal(
    r.status,
    0,
    `S5 must not abort when a locale's catalog is legitimately empty — this is the ` +
      `bash-errexit failure mode that aborted production run 35533626395.\n${r.stdout}`,
  );
  assert.ok(
    r.reachedEnd,
    "S5 must run to completion with an empty en/ar catalog — the step must reach the end of the loop",
  );
  assert.equal(r.failures, 0, "a documented empty-catalog state is not a smoke failure");
  assert.equal(r.passed, 3, "every locale must still be asserted (1 slug + 2 empty-state)");

  assert.equal(r.slugs.fa, "hot-rolled-plate-s355jr", "fa still discovers its published slug");
  assert.equal(r.slugs.en, "", "en records an empty slug rather than aborting");
  assert.equal(r.slugs.ar, "", "ar records an empty slug rather than aborting");

  // The branch that was unreachable before the fix must actually be taken.
  const emptyStatePasses = r.stdout.split("\n").filter((l) => l.includes("legitimate empty-catalog state"));
  assert.equal(emptyStatePasses.length, 2, `the empty-catalog branch must execute for en and ar.\n${r.stdout}`);
});

test("S5: an all-empty catalog (every locale) also runs to completion", () => {
  const r = runS5({
    fa: page(`<p>${EMPTY_FA}</p>`),
    en: page(`<p>${EMPTY_EN}</p>`),
    ar: page(`<p>${EMPTY_AR}</p>`),
  });

  assert.equal(r.status, 0, `an entirely empty catalog must not abort S5.\n${r.stdout}`);
  assert.ok(r.reachedEnd);
  assert.equal(r.failures, 0);
  assert.equal(r.passed, 3);
});

// ---------------------------------------------------------------------------
// The second, still-latent instance of the same class of bug: under pipefail,
// the old `grep ... | head -n1` reports 141 (SIGPIPE) once the match list is
// big enough that `head` exits while `grep` is still writing — which would
// abort the step on a POPULATED catalog. `grep -m1` removes it.
// ---------------------------------------------------------------------------
test("S5: a very large populated catalog does not abort via SIGPIPE under pipefail", () => {
  const many = Array.from({ length: 20000 }, (_, i) => `<a href="/products/steel-item-${i}">x</a>`).join("");
  const r = runS5({
    fa: page(many),
    en: page(`<p>${EMPTY_EN}</p>`),
    ar: page(`<p>${EMPTY_AR}</p>`),
  });

  assert.equal(r.status, 0, `a large catalog must not abort S5 via SIGPIPE.\n${r.stdout.slice(0, 2000)}`);
  assert.ok(r.reachedEnd);
  assert.equal(r.slugs.fa, "steel-item-0", "the first match must still be the discovered slug");
  assert.ok(
    !r.slugs.fa.includes("\n"),
    "with 20000 product links the slug must still be a single match — `grep -o -m1` stops at the " +
      "first matching LINE, not the first match, so on a minified page it would emit all 20000",
  );
  assert.match(r.slugs.fa, /^[a-zA-Z0-9_-]+$/);
  assert.equal(r.failures, 0);
});

// ---------------------------------------------------------------------------
// Scenario C — a GENUINE smoke assertion failure must still fail the gate.
// The fix must not have turned S5 into something that passes unconditionally.
// ---------------------------------------------------------------------------
test("S5: a 200 with neither a product link nor the empty-catalog state still fails the gate", () => {
  const r = runS5(
    {
      fa: page(PRODUCT_LINK_FA),
      // Renders neither a product link nor the known empty-state copy — e.g. a
      // broken catalog page. This must be reported as a failure, not silently
      // absorbed as "empty catalog".
      en: page("<p>Something unexpected rendered here.</p>"),
      ar: page(`<p>${EMPTY_AR}</p>`),
    },
    { includeVerdict: true },
  );

  assert.equal(r.failures, 1, `a broken catalog page must be counted as a failure.\n${r.stdout}`);
  assert.ok(
    r.stdout.includes("neither a product link nor the known empty-catalog state was found"),
    "the specific failure message must be emitted",
  );
  // And the end-of-suite verdict must fail the gate closed.
  assert.equal(r.status, 1, "the smoke gate must exit non-zero when any assertion failed");
  assert.ok(r.stdout.includes("production smoke check(s) failed"), "the gate must announce the failure");
});

test("S5: a non-200 catalog index still fails the gate", () => {
  const r = runS5(
    {
      fa: page(PRODUCT_LINK_FA),
      en: page(`<p>${EMPTY_EN}</p>`),
      ar: page(`<p>${EMPTY_AR}</p>`),
    },
    { stubStatus: "503", includeVerdict: true },
  );

  assert.equal(r.failures, 3, "every locale returning 503 must fail");
  assert.equal(r.status, 1, "the smoke gate must exit non-zero on a 5xx catalog index");
});

// ---------------------------------------------------------------------------
// Static guards — cheap, and they catch a reintroduction at review time rather
// than only when the executable scenarios above are run.
// ---------------------------------------------------------------------------
test("S5 slug discovery never uses an unguarded command substitution", () => {
  // The exact shape that failed: an assignment whose value is a command
  // substitution starting with `grep`, with nothing catching a non-zero status.
  const offenders = S5_CODE.split("\n")
    .map((l) => l.trim())
    .filter((l) => /^[A-Z_]+="\$\(\s*grep/.test(l) && !/\|\|/.test(l));

  assert.deepEqual(
    offenders,
    [],
    "S5 must not assign directly from an unguarded `grep` command substitution — under " +
      "GitHub's `bash -e` wrapper that aborts the whole step when a locale's catalog is " +
      "legitimately empty (production run 35533626395).",
  );
});

test("S5 tolerates grep's no-match status but still fails closed on a real grep error", () => {
  assert.ok(
    /GREP_STATUS/.test(S5_CODE),
    "S5 must capture grep's exit status explicitly rather than letting errexit act on it",
  );
  assert.ok(
    /\[ "\$GREP_STATUS" -gt 1 \]/.test(S5_CODE),
    "S5 must distinguish grep status 1 (no match, expected) from >1 (a real error)",
  );
  assert.ok(
    /exit 1/.test(S5_CODE),
    "a real grep error must still fail the step closed",
  );
  assert.ok(
    !/\|\s*head -n1/.test(S5_CODE),
    "S5 must not pipe grep into `head -n1` — under pipefail that risks a SIGPIPE (141) abort " +
      "on a large populated catalog; use `grep -m1` instead",
  );
});

test("the smoke step still relies on the inherited bash -e wrapper (no shell: override)", () => {
  // If a future change adds `shell: bash` (no -e) to this step, the executable
  // scenarios above would silently stop reproducing the production wrapper.
  const stepIdx = workflow.indexOf("- name: Production smoke checks");
  const nextStepIdx = workflow.indexOf("\n      - name:", stepIdx + 1);
  const stepText = workflow.slice(stepIdx, nextStepIdx === -1 ? undefined : nextStepIdx);
  assert.ok(
    !/^\s+shell:/m.test(stepText),
    "the smoke step must keep GitHub's default `bash -e` wrapper; these regression tests " +
      "model that wrapper deliberately",
  );
});

test("every existing S5-S10 assertion is still present in the smoke step", () => {
  // The fix must not have removed coverage. These are the assertion groups the
  // first production release's independent re-run verified at 23/23.
  for (const marker of [
    'echo "== S1: homepage / =="',
    'echo "== S1b: homepage /ar =="',
    'echo "== S2: /fa redirects to the unprefixed default locale =="',
    'echo "== S3: /en =="',
    'echo "== S4: /services, /en/services, /ar/services =="',
    'echo "== S5: catalog index (fa/en/ar) =="',
    'echo "== S6: catalog detail (fa/en/ar) =="',
    'echo "== S7: RFQ page render (fa/en/ar) — no RFQ submitted =="',
    'echo "== S8: not-found handling =="',
    'echo "== S9: security headers =="',
    'echo "== S10: apex redirect =="',
  ]) {
    assert.ok(SCRIPT.includes(marker), `smoke step must still contain: ${marker}`);
  }
  // S5's three outcome branches, all intact.
  assert.ok(S5_BLOCK.includes("discovered a published catalog slug"));
  assert.ok(S5_BLOCK.includes("legitimate empty-catalog state"));
  assert.ok(S5_BLOCK.includes("neither a product link nor the known empty-catalog state was found"));
});

// ---------------------------------------------------------------------------
// The smoke suite exists in TWO workflows — deploy-production.yml (the release
// gate) and verify-production.yml (the verification-only re-run against an
// existing deployment). It is deliberately NOT extracted into a checked-in
// script both call: deploy-production.yml checks out `deploy_ref`, so a
// repo-script suite would run whatever version existed at the DEPLOYED SHA —
// for f2202ab, the pre-fix broken one. Keeping the suite inside each workflow
// keeps the gate logic versioned with the WORKFLOW, not the release under
// test.
//
// The cost of that choice is a second copy, and this test is what pays it:
// the two must stay byte-identical, so a fix to one can never silently miss
// the other.
// ---------------------------------------------------------------------------
test("the smoke suite is byte-identical in deploy-production.yml and verify-production.yml", () => {
  const verifyPath = path.join(repoRoot, ".github", "workflows", "verify-production.yml");
  assert.ok(existsSync(verifyPath), "verify-production.yml must exist");

  const verifyScript = smokeScript(readFileSync(verifyPath, "utf8"), "verify-production.yml");

  if (verifyScript !== SCRIPT) {
    const deployLines = SCRIPT.split("\n");
    const verifyLines = verifyScript.split("\n");
    let firstDiff = -1;
    for (let i = 0; i < Math.max(deployLines.length, verifyLines.length); i += 1) {
      if (deployLines[i] !== verifyLines[i]) {
        firstDiff = i;
        break;
      }
    }
    assert.fail(
      "the production smoke suite has drifted between deploy-production.yml and " +
        `verify-production.yml (first difference at line ${firstDiff + 1} of the extracted script):\n` +
        `  deploy: ${JSON.stringify(deployLines[firstDiff])}\n` +
        `  verify: ${JSON.stringify(verifyLines[firstDiff])}\n` +
        "Both copies must be updated together — see the comment above this test.",
    );
  }

  assert.equal(verifyScript, SCRIPT);
});

test("verify-production.yml's smoke step binds the version ids its failure path prints", () => {
  // The copied block's failure branch echoes $NEW_VERSION_ID/$PREVIOUS_VERSION_ID.
  // deploy-production.yml sets those in GITHUB_ENV; verify-production.yml has no
  // such step, so without an explicit `env:` binding the failure path would die
  // on `set -u` instead of printing its message.
  const verify = readFileSync(path.join(repoRoot, ".github", "workflows", "verify-production.yml"), "utf8");
  const stepIdx = verify.indexOf("- name: Production smoke checks");
  const runIdx = verify.indexOf("run: |", stepIdx);
  const header = verify.slice(stepIdx, runIdx);
  assert.match(header, /NEW_VERSION_ID:\s*\$\{\{\s*inputs\.expected_canary_version\s*\}\}/);
  assert.match(header, /PREVIOUS_VERSION_ID:\s*\$\{\{\s*inputs\.expected_stable_version\s*\}\}/);
});
