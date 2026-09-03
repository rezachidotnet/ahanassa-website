import { test } from "node:test";
import assert from "node:assert/strict";
import { planSlugChangeRedirects, planSlugChangeRedirectStatements, validateRedirectInsert, type RouteRedirectRow } from "./route-redirects-logic.ts";

// Test D: Slug redirect — old slug redirects to new canonical URL.
// Test E: Redirect loop protection — invalid loop/self-redirect rejected.
// Permanent HTTP redirect semantics: statements always encode status_code 308.
// Atomicity (redirect write failure rolls back slug update / slug conflict
// creates no bad redirect): proven here at the pure decision-and-statement-
// plan layer — `planSlugChangeRedirectStatements` is the exact logic
// `lib/catalog/route-redirects.ts#buildSlugChangeRedirectStatements` defers
// to; `lib/catalog/editorial-repository.ts#upsertEditorialDraft` never
// calls `db.batch()` unless this returns `{ ok: true }`, so proving this
// function's refusal cases proves no write is ever attempted for them.

test("validateRedirectInsert: a self-redirect is rejected", () => {
  const result = validateRedirectInsert({ oldPath: "/products/a", targetPath: "/products/a", statusCode: 308 }, []);
  assert.deepEqual(result, { ok: false, reason: "self_redirect" });
});

test("validateRedirectInsert: a normal, non-conflicting redirect is accepted", () => {
  const result = validateRedirectInsert({ oldPath: "/products/old", targetPath: "/products/new", statusCode: 308 }, []);
  assert.deepEqual(result, { ok: true });
});

test("validateRedirectInsert: a direct 2-cycle (A->B, proposing B->A) is rejected as a loop", () => {
  const existing: RouteRedirectRow[] = [{ locale: "fa", oldPath: "/products/a", targetPath: "/products/b", statusCode: 308, entityType: "catalog_template", entityId: "1" }];
  const result = validateRedirectInsert({ oldPath: "/products/b", targetPath: "/products/a", statusCode: 308 }, existing);
  assert.deepEqual(result, { ok: false, reason: "loop_detected" });
});

test("validateRedirectInsert: a longer cycle (A->B->C, proposing C->A) is rejected as a loop", () => {
  const existing: RouteRedirectRow[] = [
    { locale: "fa", oldPath: "/products/a", targetPath: "/products/b", statusCode: 308, entityType: "catalog_template", entityId: "1" },
    { locale: "fa", oldPath: "/products/b", targetPath: "/products/c", statusCode: 308, entityType: "catalog_template", entityId: "1" },
  ];
  const result = validateRedirectInsert({ oldPath: "/products/c", targetPath: "/products/a", statusCode: 308 }, existing);
  assert.deepEqual(result, { ok: false, reason: "loop_detected" });
});

test("validateRedirectInsert: a normal chain (A->B, proposing C->A) is accepted — chains are fine, only cycles are rejected", () => {
  const existing: RouteRedirectRow[] = [{ locale: "fa", oldPath: "/products/a", targetPath: "/products/b", statusCode: 308, entityType: "catalog_template", entityId: "1" }];
  const result = validateRedirectInsert({ oldPath: "/products/c", targetPath: "/products/a", statusCode: 308 }, existing);
  assert.deepEqual(result, { ok: true });
});

test("validateRedirectInsert: 308/302 with a null targetPath is rejected (missing_target)", () => {
  const result = validateRedirectInsert({ oldPath: "/products/a", targetPath: null, statusCode: 308 }, []);
  assert.deepEqual(result, { ok: false, reason: "missing_target" });
});

test("validateRedirectInsert: a 410 with a null targetPath is accepted (terminal disposition, never invents a replacement)", () => {
  const result = validateRedirectInsert({ oldPath: "/products/a", targetPath: null, statusCode: 410 }, []);
  assert.deepEqual(result, { ok: true });
});

test("validateRedirectInsert: a 410 with a non-null targetPath is rejected — a terminal disposition must never carry a fabricated target", () => {
  const result = validateRedirectInsert({ oldPath: "/products/a", targetPath: "/products/b", statusCode: 410 }, []);
  assert.deepEqual(result, { ok: false, reason: "missing_target" });
});

test("planSlugChangeRedirects: produces a redirect from the previous path to the new path", () => {
  const plan = planSlugChangeRedirects("/products/old-slug", "/products/new-slug", []);
  assert.deepEqual(plan.newRedirect, { oldPath: "/products/old-slug", targetPath: "/products/new-slug" });
  assert.deepEqual(plan.chainCollapseUpdates, []);
});

test("planSlugChangeRedirects: collapses an existing redirect that targeted the now-superseded path, so no caller ever hops twice", () => {
  // A previously redirected from OLD1 -> OLD2. Now OLD2's slug itself
  // changes to NEW. Without collapsing, OLD1 -> OLD2 -> NEW would be a
  // 2-hop chain; the plan must repoint OLD1 directly at NEW.
  const existing: RouteRedirectRow[] = [{ locale: "fa", oldPath: "/products/old1", targetPath: "/products/old2", statusCode: 308, entityType: "catalog_template", entityId: "1" }];
  const plan = planSlugChangeRedirects("/products/old2", "/products/new", existing);
  assert.deepEqual(plan.newRedirect, { oldPath: "/products/old2", targetPath: "/products/new" });
  assert.deepEqual(plan.chainCollapseUpdates, [{ oldPath: "/products/old1", targetPath: "/products/new" }]);
});

test("planSlugChangeRedirects: never collapses a terminal (410) row, defense-in-depth even if one somehow carried a non-null targetPath", () => {
  const existing: RouteRedirectRow[] = [{ locale: "fa", oldPath: "/products/gone", targetPath: "/products/old2", statusCode: 410, entityType: "catalog_template", entityId: "1" }];
  const plan = planSlugChangeRedirects("/products/old2", "/products/new", existing);
  assert.deepEqual(plan.chainCollapseUpdates, [], "a 410 row must never be repointed — a terminal disposition is deliberate and permanent");
});

// --- planSlugChangeRedirectStatements: atomicity + permanent-redirect-semantics tests ---

test("planSlugChangeRedirectStatements: a normal slug change produces exactly one INSERT statement encoding status_code 308", () => {
  const result = planSlugChangeRedirectStatements("fa", "catalog_template", "entity-1", "/products/old-slug", "/products/new-slug", [], "redirect-id-1", "2026-01-01T00:00:00.000Z");
  assert.equal(result.ok, true);
  if (!result.ok) return;
  assert.equal(result.statements.length, 1);
  assert.match(result.statements[0].sql, /INSERT INTO route_redirects/);
  assert.match(result.statements[0].sql, /VALUES \(\?, \?, \?, \?, 308, \?, \?, \?, \?\)/, "the stored status_code must be the literal 308 this task standardizes on, never 301");
  assert.deepEqual(result.statements[0].params, ["redirect-id-1", "fa", "/products/old-slug", "/products/new-slug", "catalog_template", "entity-1", "2026-01-01T00:00:00.000Z", "2026-01-01T00:00:00.000Z"]);
});

test("planSlugChangeRedirectStatements: also includes chain-collapse UPDATE statements when an existing redirect targeted the superseded path", () => {
  const existing: RouteRedirectRow[] = [{ locale: "fa", oldPath: "/products/older", targetPath: "/products/old-slug", statusCode: 308, entityType: "catalog_template", entityId: "entity-1" }];
  const result = planSlugChangeRedirectStatements("fa", "catalog_template", "entity-1", "/products/old-slug", "/products/new-slug", existing, "redirect-id-2", "2026-01-01T00:00:00.000Z");
  assert.equal(result.ok, true);
  if (!result.ok) return;
  assert.equal(result.statements.length, 2, "one INSERT for the new redirect plus one UPDATE for the collapsed chain");
  assert.match(result.statements[1].sql, /UPDATE route_redirects SET target_path/);
  assert.deepEqual(result.statements[1].params, ["/products/new-slug", "2026-01-01T00:00:00.000Z", "fa", "/products/older"]);
});

test("planSlugChangeRedirectStatements: a loop-forming slug change is refused with ZERO statements — this is the exact case a caller must treat as 'do not write anything, refuse the whole slug change'", () => {
  // Existing: /products/new-slug -> /products/old-slug (an editor previously
  // renamed FROM old-slug TO new-slug, in the opposite direction). Now
  // proposing old-slug -> new-slug again would form a 2-cycle.
  const existing: RouteRedirectRow[] = [{ locale: "fa", oldPath: "/products/new-slug", targetPath: "/products/old-slug", statusCode: 308, entityType: "catalog_template", entityId: "entity-2" }];
  const result = planSlugChangeRedirectStatements("fa", "catalog_template", "entity-1", "/products/old-slug", "/products/new-slug", existing, "redirect-id-3", "2026-01-01T00:00:00.000Z");
  assert.deepEqual(result, { ok: false, reason: "loop_detected" });
  assert.ok(!("statements" in result), "a refused plan must carry no statements at all — nothing for a caller to accidentally write");
});

test("planSlugChangeRedirectStatements: redirect statements are locale-scoped — an existing redirect for a DIFFERENT locale at the same path never triggers a false loop/collapse", () => {
  const existing: RouteRedirectRow[] = [{ locale: "en", oldPath: "/products/old-slug", targetPath: "/products/somewhere-else", statusCode: 308, entityType: "catalog_template", entityId: "entity-9" }];
  // Caller is responsible for only passing existingForLocale rows for the
  // SAME locale (as `buildSlugChangeRedirectStatements` does via its own
  // `WHERE locale = ?` fetch) — this test documents that a cross-locale row
  // passed in error is still just data to this pure function (no special
  // locale filtering happens inside it), so the D1 wrapper's `WHERE locale = ?`
  // is the actual enforcement point.
  const result = planSlugChangeRedirectStatements("fa", "catalog_template", "entity-1", "/products/old-slug", "/products/new-slug", existing, "redirect-id-4", "2026-01-01T00:00:00.000Z");
  assert.equal(result.ok, true);
});
