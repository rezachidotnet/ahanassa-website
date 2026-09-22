import { test } from "node:test";
import assert from "node:assert/strict";
import {
  classifyDiff,
  classifyPath,
  computeFinalRisk,
  parseNameStatus,
  type ChangedFile,
} from "./release-risk-classifier.ts";

// docs/release/RELEASE_POLICY.md Phase 19 required tests. Every fixture path
// below is a real repository path (or a deliberately synthetic/unrecognized
// one for the AMBIGUOUS cases) — never a live Worker Version ID, deployment
// ID, run ID, or commit SHA (RELEASE_POLICY.md §"No live identifier
// hardcoding").

function file(path: string, status: ChangedFile["status"] = "M"): ChangedFile {
  return { path, status };
}

// --- 1-3: LOW ---------------------------------------------------------------

test("1. hero copy-only change classifies LOW", () => {
  const result = classifyDiff([file("lib/content/homepage.ts")]);
  assert.equal(result.status, "CLASSIFIED");
  assert.equal((result as any).risk, "LOW");
});

test("2. approved static image replacement classifies LOW", () => {
  const result = classifyDiff([file("public/images/hero-steel-mill.png")]);
  assert.equal(result.status, "CLASSIFIED");
  assert.equal((result as any).risk, "LOW");
});

test("3. CSS-only presentation change classifies LOW", () => {
  const result = classifyDiff([file("styles/tokens.css")]);
  assert.equal(result.status, "CLASSIFIED");
  assert.equal((result as any).risk, "LOW");
});

// --- 4-5: MEDIUM --------------------------------------------------------------

test("4. normal product rendering logic classifies MEDIUM", () => {
  const result = classifyDiff([file("components/products/catalog-template-grid.tsx")]);
  assert.equal(result.status, "CLASSIFIED");
  assert.equal((result as any).risk, "MEDIUM");
});

test("5. normal recognized component behavior classifies MEDIUM", () => {
  const result = classifyDiff([file("components/home/process.tsx")]);
  assert.equal(result.status, "CLASSIFIED");
  assert.equal((result as any).risk, "MEDIUM");
});

// --- 6-14: HIGH ---------------------------------------------------------------

test("6. RFQ persistence change classifies HIGH", () => {
  const result = classifyDiff([file("lib/rfq/repository.ts")]);
  assert.equal(result.status, "CLASSIFIED");
  assert.equal((result as any).risk, "HIGH");
});

test("7. RFQ critical UI behavior classifies HIGH", () => {
  const result = classifyDiff([file("components/contact/enquiry-form.tsx")]);
  assert.equal(result.status, "CLASSIFIED");
  assert.equal((result as any).risk, "HIGH");
});

test("8. D1 migration classifies HIGH", () => {
  const result = classifyDiff([file("migrations/0006_new_column.sql", "A")]);
  assert.equal(result.status, "CLASSIFIED");
  assert.equal((result as any).risk, "HIGH");
});

test("9. wrangler.jsonc classifies HIGH", () => {
  const result = classifyDiff([file("wrangler.jsonc")]);
  assert.equal(result.status, "CLASSIFIED");
  assert.equal((result as any).risk, "HIGH");
});

test("10. workflow change classifies HIGH", () => {
  const result = classifyDiff([file(".github/workflows/deploy-production.yml")]);
  assert.equal(result.status, "CLASSIFIED");
  assert.equal((result as any).risk, "HIGH");
});

test("11. RELEASE_POLICY.md change classifies HIGH", () => {
  const result = classifyDiff([file("docs/release/RELEASE_POLICY.md")]);
  assert.equal(result.status, "CLASSIFIED");
  assert.equal((result as any).risk, "HIGH");
});

test("12. any CLAUDE.md change classifies HIGH", () => {
  const result = classifyDiff([file("CLAUDE.md")]);
  assert.equal(result.status, "CLASSIFIED");
  assert.equal((result as any).risk, "HIGH");
});

test("13. Odoo-client/API-contract path classifies HIGH", () => {
  const result = classifyDiff([file("lib/odoo/rfq-api-client.ts")]);
  assert.equal(result.status, "CLASSIFIED");
  assert.equal((result as any).risk, "HIGH");
});

test("13b. Odoo API contract documentation classifies HIGH", () => {
  const result = classifyDiff([file("docs/integrations/odoo/catalog-v1/PUBLIC_CATALOG_API_V1.md")]);
  assert.equal(result.status, "CLASSIFIED");
  assert.equal((result as any).risk, "HIGH");
});

test("14. routing/canonical config classifies HIGH", () => {
  const result = classifyDiff([file("proxy.ts")]);
  assert.equal(result.status, "CLASSIFIED");
  assert.equal((result as any).risk, "HIGH");
  const result2 = classifyDiff([file("config/locales.ts")]);
  assert.equal((result2 as any).risk, "HIGH");
});

// --- 15-17: declared vs computed / mixed-diff -------------------------------

test("15. declared LOW + computed HIGH -> final HIGH", () => {
  const computed = classifyDiff([file("wrangler.jsonc")]);
  assert.equal(computed.status, "CLASSIFIED");
  const final = computeFinalRisk("LOW", (computed as any).risk);
  assert.equal(final, "HIGH");
});

test("16. declared HIGH + computed LOW -> final HIGH (operator escalation only, never downgrade)", () => {
  const computed = classifyDiff([file("styles/tokens.css")]);
  assert.equal(computed.status, "CLASSIFIED");
  const final = computeFinalRisk("HIGH", (computed as any).risk);
  assert.equal(final, "HIGH");
});

test("declared MEDIUM + computed LOW -> final MEDIUM", () => {
  const computed = classifyDiff([file("styles/tokens.css")]);
  const final = computeFinalRisk("MEDIUM", (computed as any).risk);
  assert.equal(final, "MEDIUM");
});

test("17. ten LOW files plus one HIGH file -> HIGH, no majority vote", () => {
  const lowFiles: ChangedFile[] = Array.from({ length: 10 }, (_, i) => file(`public/images/products/item-${i}.png`));
  const result = classifyDiff([...lowFiles, file("lib/rfq/service.ts")]);
  assert.equal(result.status, "CLASSIFIED");
  assert.equal((result as any).risk, "HIGH");
});

// --- 18-19: AMBIGUOUS ---------------------------------------------------------

test("18. unknown top-level directory classifies AMBIGUOUS", () => {
  const result = classifyDiff([file("mobile-app/index.ts")]);
  assert.equal(result.status, "AMBIGUOUS");
});

test("19. unknown binary outside approved assets classifies AMBIGUOUS", () => {
  const result = classifyDiff([file("lib/rfq/mystery.png")]);
  assert.equal(result.status, "AMBIGUOUS");
});

test("unrecognized/opaque file extension classifies AMBIGUOUS", () => {
  const result = classifyDiff([file("scripts/payload.bin")]);
  assert.equal(result.status, "AMBIGUOUS");
});

test("ambiguous file never silently downgrades to MEDIUM even alongside only LOW files", () => {
  const result = classifyDiff([file("styles/tokens.css"), file("new-surface/thing.ts")]);
  assert.equal(result.status, "AMBIGUOUS");
});

// --- 20-23: renames/deletions --------------------------------------------------

test("20. rename FROM a HIGH path classifies HIGH", () => {
  const result = classifyDiff([{ path: "lib/rfq/repository-v2.ts", oldPath: "lib/rfq/repository.ts", status: "R" }]);
  assert.equal(result.status, "CLASSIFIED");
  assert.equal((result as any).risk, "HIGH");
});

test("21. rename TO a HIGH path classifies HIGH", () => {
  const result = classifyDiff([{ path: "wrangler.jsonc", oldPath: "wrangler.jsonc.bak", status: "R" }]);
  // wrangler.jsonc.bak has an unrecognized extension, so this also proves
  // the destination-side HIGH check wins over a source-side AMBIGUOUS —
  // renames TO a HIGH path must never be softened to AMBIGUOUS.
  assert.equal(result.status, "CLASSIFIED");
  assert.equal((result as any).risk, "HIGH");
});

test("22. delete of a HIGH file classifies HIGH", () => {
  const result = classifyDiff([file("lib/security/turnstile.ts", "D")]);
  assert.equal(result.status, "CLASSIFIED");
  assert.equal((result as any).risk, "HIGH");
});

test("23. unknown cross-tree rename classifies AMBIGUOUS", () => {
  const result = classifyDiff([{ path: "sandbox/b.ts", oldPath: "experimental/a.ts", status: "R" }]);
  assert.equal(result.status, "AMBIGUOUS");
});

// --- supplementary coverage --------------------------------------------------

test("delete of a LOW file remains LOW, not escalated", () => {
  const result = classifyDiff([file("docs/CLOUDFLARE_DEPLOYMENT_STAGE1.md", "D")]);
  assert.equal(result.status, "CLASSIFIED");
  assert.equal((result as any).risk, "LOW");
});

test("classifyPath never returns MEDIUM for a path outside the recognized app/runtime dirs", () => {
  const c = classifyPath("random-unknown-root-file.xyz");
  assert.notEqual(c.risk, "MEDIUM");
});

test("odoo-modules/** (Odoo server deployment) is out of scope and classifies LOW", () => {
  const c = classifyPath("odoo-modules/ahanassa_website_rfq/models/rfq.py");
  assert.equal(c.risk, "LOW");
});

test("parseNameStatus parses plain and rename lines from synthetic git output", () => {
  const output = ["M\tlib/content/homepage.ts", "A\tmigrations/0006_x.sql", "R100\tlib/rfq/old.ts\tlib/rfq/new.ts", ""].join("\n");
  const files = parseNameStatus(output);
  assert.deepEqual(files, [
    { path: "lib/content/homepage.ts", status: "M" },
    { path: "migrations/0006_x.sql", status: "A" },
    { path: "lib/rfq/new.ts", status: "R", oldPath: "lib/rfq/old.ts" },
  ]);
});

test("computeFinalRisk with no declared risk returns the computed minimum unchanged", () => {
  assert.equal(computeFinalRisk(undefined, "MEDIUM"), "MEDIUM");
});

test("an empty diff classifies LOW with no triggers (no real release to classify)", () => {
  const result = classifyDiff([]);
  assert.equal(result.status, "CLASSIFIED");
  assert.equal((result as any).risk, "LOW");
});
