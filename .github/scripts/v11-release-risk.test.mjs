// node --test .github/scripts/   — W9.7 release-risk classifier (RELEASE_POLICY.md §20.1). Synthetic paths and repos only.
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { test } from "node:test";
import { classifyChanges, classifyRelease, lowRule, parseNameStatus } from "./v11-release-risk.mjs";

const M = (...paths) => paths.map((p) => ({ status: "M", paths: [p] }));

test("LOW: only CSS, raster images/icons under public/, and the copy modules", () => {
  const r = classifyChanges([
    ...M("styles/tokens.css", "app/globals.css", "public/images/products/beam.jpg", "public/icons/icon-192.png", "public/favicon.ico"),
    ...M("lib/content/homepage.ts", "lib/content/nav.ts", "lib/weight-calculator/copy.ts", "lib/content/hero-frozen-spec-invariants.test.ts"),
    { status: "A", paths: ["public/images/new.webp"] },
    { status: "D", paths: ["public/images/old.png"] },
    { status: "R100", paths: ["public/images/a.png", "public/images/b.png"] },
  ]);
  assert.equal(r.risk, "LOW", r.high.join(", "));
  assert.deepEqual(r.high, []);
});

test("HIGH: pricing, RFQ, Workers, workflows, D1, config, content pipeline — and anything unlisted", () => {
  for (const p of [
    "lib/pricing/price-page.ts",
    "lib/rfq/rfq-prefill.ts",
    "components/contact/RfqForm.tsx",
    "workers/static/wrangler.jsonc",
    "workers/rfq/app.ts",
    ".github/workflows/ci.yml",
    "migrations_public/0020_x.sql",
    "migrations/0001_x.sql",
    "wrangler.jsonc",
    "package.json",
    "package-lock.json",
    "vite.config.ts",
    "scripts/content/fetch.ts",
    "lib/content-pipeline/assemble.ts",
    "lib/static/artifact-gate.ts",
    "lib/ci/release-ledger.ts",
    "docs/release/RELEASE_POLICY.md",
    "docs/ARTICLES.md",
    "components/home/Hero.tsx",
    "app/[locale]/page.tsx",
    "lib/content/contact-channels.ts",
    "lib/content/whatsapp.ts",
    "public/images/logo.svg",
    "public/site.webmanifest",
    "styles/new-module.ts",
  ]) {
    const r = classifyChanges(M(p));
    assert.equal(r.risk, "HIGH", p);
    assert.equal(lowRule(p), null, p);
  }
});

test("mixed diff: one HIGH path makes the release HIGH (no majority vote)", () => {
  const r = classifyChanges([...M("styles/base.css", "public/images/a.png", "lib/content/pages.ts"), ...M("lib/pricing/price-rfq.ts")]);
  assert.equal(r.risk, "HIGH");
  assert.deepEqual(r.high, ["lib/pricing/price-rfq.ts"]);
});

test("rename/copy: both sides must be on the allowlist; an unknown git status is HIGH", () => {
  assert.equal(classifyChanges([{ status: "R090", paths: ["lib/pricing/x.css", "styles/x.css"] }]).risk, "LOW", "a .css source is css");
  assert.equal(classifyChanges([{ status: "R090", paths: ["lib/pricing/x.ts", "styles/x.css"] }]).risk, "HIGH");
  assert.equal(classifyChanges([{ status: "C075", paths: ["styles/a.css", "workers/static/a.css"] }]).risk, "LOW");
  const u = classifyChanges([{ status: "X", paths: ["styles/a.css"] }]);
  assert.equal(u.risk, "HIGH");
  assert.match(u.high[0], /git status X/);
});

test("ledger-only and empty change sets", () => {
  const l = classifyChanges(M("docs/release/PRODUCTION_DEPLOYMENT_MANIFEST.md"));
  assert.equal(l.risk, "HIGH");
  assert.equal(l.ledger_only, true);
  assert.equal(classifyChanges(M("docs/release/PRODUCTION_DEPLOYMENT_MANIFEST.md", "styles/a.css")).ledger_only, false);
  assert.equal(classifyChanges([]).risk, "NONE");
});

test("parseNameStatus: -z output with renames and copies", () => {
  const raw = ["M", "styles/a.css", "R087", "old.png", "public/images/new.png", "C100", "x.css", "y.css", "D", "gone.ts", ""].join("\0");
  assert.deepEqual(parseNameStatus(raw), [
    { status: "M", paths: ["styles/a.css"] },
    { status: "R087", paths: ["old.png", "public/images/new.png"] },
    { status: "C100", paths: ["x.css", "y.css"] },
    { status: "D", paths: ["gone.ts"] },
  ]);
  assert.throws(() => parseNameStatus("R100\0only-one\0"), /truncated/);
});

test("classifyRelease: real git diff live..candidate; no base = HIGH; same SHA = NONE", (t) => {
  const dir = mkdtempSync(path.join(tmpdir(), "v11-risk-"));
  t.after(() => rmSync(dir, { recursive: true, force: true }));
  const g = (...a) => execFileSync("git", a, { cwd: dir, encoding: "utf8" }).trim();
  const write = (p, s) => {
    mkdirSync(path.dirname(path.join(dir, p)), { recursive: true });
    writeFileSync(path.join(dir, p), s);
  };
  g("init", "-q", "-b", "app");
  g("config", "user.email", "fixture@example.invalid");
  g("config", "user.name", "fixture");
  write("styles/base.css", "a{}");
  write("lib/pricing/x.ts", "export {}");
  g("add", "-A");
  g("commit", "-q", "-m", "live");
  const live = g("rev-parse", "HEAD");
  write("styles/base.css", "a{color:red}");
  g("commit", "-q", "-am", "css");
  const css = g("rev-parse", "HEAD");
  write("lib/pricing/x.ts", "export const y = 1");
  g("commit", "-q", "-am", "pricing");
  const pricing = g("rev-parse", "HEAD");

  assert.equal(classifyRelease(dir, live, css).risk, "LOW");
  const h = classifyRelease(dir, live, pricing);
  assert.equal(h.risk, "HIGH");
  assert.deepEqual(h.high, ["lib/pricing/x.ts"]);
  assert.equal(classifyRelease(dir, null, css).risk, "HIGH", "unresolved live code");
  assert.equal(classifyRelease(dir, css, css).risk, "NONE");
  assert.throws(() => classifyRelease(dir, live, "HEAD"), /full commit SHA/);
});
