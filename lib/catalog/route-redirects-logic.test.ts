import { test } from "node:test";
import assert from "node:assert/strict";
import { planSlugChangeRedirects, validateRedirectInsert, type RouteRedirectRow } from "./route-redirects-logic.ts";

// Test D: Slug redirect — old slug redirects to new canonical URL.
// Test E: Redirect loop protection — invalid loop/self-redirect rejected.

test("validateRedirectInsert: a self-redirect is rejected", () => {
  const result = validateRedirectInsert({ oldPath: "/products/a", targetPath: "/products/a", statusCode: 301 }, []);
  assert.deepEqual(result, { ok: false, reason: "self_redirect" });
});

test("validateRedirectInsert: a normal, non-conflicting redirect is accepted", () => {
  const result = validateRedirectInsert({ oldPath: "/products/old", targetPath: "/products/new", statusCode: 301 }, []);
  assert.deepEqual(result, { ok: true });
});

test("validateRedirectInsert: a direct 2-cycle (A->B, proposing B->A) is rejected as a loop", () => {
  const existing: RouteRedirectRow[] = [{ locale: "fa", oldPath: "/products/a", targetPath: "/products/b", statusCode: 301, entityType: "catalog_template", entityId: "1" }];
  const result = validateRedirectInsert({ oldPath: "/products/b", targetPath: "/products/a", statusCode: 301 }, existing);
  assert.deepEqual(result, { ok: false, reason: "loop_detected" });
});

test("validateRedirectInsert: a longer cycle (A->B->C, proposing C->A) is rejected as a loop", () => {
  const existing: RouteRedirectRow[] = [
    { locale: "fa", oldPath: "/products/a", targetPath: "/products/b", statusCode: 301, entityType: "catalog_template", entityId: "1" },
    { locale: "fa", oldPath: "/products/b", targetPath: "/products/c", statusCode: 301, entityType: "catalog_template", entityId: "1" },
  ];
  const result = validateRedirectInsert({ oldPath: "/products/c", targetPath: "/products/a", statusCode: 301 }, existing);
  assert.deepEqual(result, { ok: false, reason: "loop_detected" });
});

test("validateRedirectInsert: a normal chain (A->B, proposing C->A) is accepted — chains are fine, only cycles are rejected", () => {
  const existing: RouteRedirectRow[] = [{ locale: "fa", oldPath: "/products/a", targetPath: "/products/b", statusCode: 301, entityType: "catalog_template", entityId: "1" }];
  const result = validateRedirectInsert({ oldPath: "/products/c", targetPath: "/products/a", statusCode: 301 }, existing);
  assert.deepEqual(result, { ok: true });
});

test("validateRedirectInsert: 301/302 with a null targetPath is rejected (missing_target)", () => {
  const result = validateRedirectInsert({ oldPath: "/products/a", targetPath: null, statusCode: 301 }, []);
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
  const existing: RouteRedirectRow[] = [{ locale: "fa", oldPath: "/products/old1", targetPath: "/products/old2", statusCode: 301, entityType: "catalog_template", entityId: "1" }];
  const plan = planSlugChangeRedirects("/products/old2", "/products/new", existing);
  assert.deepEqual(plan.newRedirect, { oldPath: "/products/old2", targetPath: "/products/new" });
  assert.deepEqual(plan.chainCollapseUpdates, [{ oldPath: "/products/old1", targetPath: "/products/new" }]);
});

test("planSlugChangeRedirects: never collapses a terminal (410) row, defense-in-depth even if one somehow carried a non-null targetPath", () => {
  const existing: RouteRedirectRow[] = [{ locale: "fa", oldPath: "/products/gone", targetPath: "/products/old2", statusCode: 410, entityType: "catalog_template", entityId: "1" }];
  const plan = planSlugChangeRedirects("/products/old2", "/products/new", existing);
  assert.deepEqual(plan.chainCollapseUpdates, [], "a 410 row must never be repointed — a terminal disposition is deliberate and permanent");
});
