import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";

// Code-review hardening pass (DAR-054), issue 1: "slug change + redirect
// must be atomic". `upsertEditorialDraft` itself cannot be unit-tested
// directly under plain `node --test` — it (like every other function in
// `editorial-repository.ts`) transitively imports `getPublicDb` ->
// `cloudflare:workers`, which `node --test`'s default ESM loader cannot
// resolve at all outside the real Workers runtime (empirically confirmed
// while implementing this fix — this is this repo's own established,
// documented convention for D1-touching repository code: "validated live",
// not mock-based unit tests). The actual redirect-safety DECISION logic is
// isolated in the pure, D1-free `route-redirects-logic.ts#planSlugChangeRedirectStatements`
// and is exhaustively unit-tested there
// (`route-redirects-logic.test.ts` — success/loop-refusal/chain-collapse/308
// semantics). What remains to pin here is the STRUCTURAL guarantee that
// `upsertEditorialDraft` actually wires that decision into a single atomic
// D1 write, rather than two independent sequential writes — a source-level
// invariant, matching this repo's own established pattern for pinning facts
// a bundler-dependent/runtime-dependent module can't be directly executed
// to prove (see `homepage-source-isolation.test.ts`).

const REPO_ROOT = path.resolve(fileURLToPath(new URL(".", import.meta.url)), "../..");

function readSource(relativePath: string): string {
  return readFileSync(path.join(REPO_ROOT, relativePath), "utf8");
}

function extractFunctionBody(source: string, signature: string): string {
  const start = source.indexOf(signature);
  assert.ok(start >= 0, `could not find "${signature}" in source`);
  // upsertEditorialDraft is the only exported function starting with this
  // exact signature; slice to the next top-level "export " after it, or EOF.
  const nextExportIdx = source.indexOf("\nexport ", start + signature.length);
  return nextExportIdx > 0 ? source.slice(start, nextExportIdx) : source.slice(start);
}

test("upsertEditorialDraft commits the SEO content write and the redirect write in a single db.batch() call, never as two independent .run() calls", () => {
  const source = readSource("lib/catalog/editorial-repository.ts");
  const body = extractFunctionBody(source, "export async function upsertEditorialDraft(");

  assert.match(body, /db\.batch\(\s*\[\s*seoUpsertStatement,\s*\.\.\.redirectPlan\.statements\s*\]\s*\)/, "the SEO upsert and the redirect statements must be passed to the SAME db.batch() call — this is what makes them commit or fail together under D1's transactional batch semantics");
});

test("upsertEditorialDraft checks the redirect plan's ok flag and returns BEFORE attempting db.batch() when it is not ok", () => {
  const source = readSource("lib/catalog/editorial-repository.ts");
  const body = extractFunctionBody(source, "export async function upsertEditorialDraft(");

  const refusalIdx = body.indexOf('return { status: "redirect_conflict"');
  const batchIdx = body.indexOf("db.batch(");
  assert.ok(refusalIdx >= 0, "the redirect_conflict early return must exist");
  assert.ok(batchIdx >= 0, "the db.batch() call must exist");
  assert.ok(refusalIdx < batchIdx, "the redirect_conflict refusal must appear (and therefore execute) BEFORE db.batch() is ever reached — no write may be attempted once the redirect plan is refused");
});

test("upsertEditorialDraft validates the redirect plan BEFORE building/attempting any write, for a slug-change entity", () => {
  const source = readSource("lib/catalog/editorial-repository.ts");
  const body = extractFunctionBody(source, "export async function upsertEditorialDraft(");

  const buildPlanIdx = body.indexOf("buildSlugChangeRedirectStatements(");
  const batchIdx = body.indexOf("db.batch(");
  assert.ok(buildPlanIdx >= 0 && batchIdx >= 0);
  assert.ok(buildPlanIdx < batchIdx, "the redirect plan must be built/validated strictly before the atomic write is attempted");
});

test("the non-slug-change path (first-time slug creation, or no slug change) still uses a single-statement .run(), never an unnecessary batch — preserves first-slug/no-redirect behavior", () => {
  const source = readSource("lib/catalog/editorial-repository.ts");
  const body = extractFunctionBody(source, "export async function upsertEditorialDraft(");

  assert.match(body, /if \(!isSlugChange\) \{[\s\S]*?seoUpsertStatement\.run\(\)/, "a non-slug-change save must take the plain single-statement path, never invoke the redirect-building machinery at all");
});
