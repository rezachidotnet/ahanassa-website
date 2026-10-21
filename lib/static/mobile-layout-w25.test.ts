import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { OVERFLOW_SCAN_EXPRESSION } from "./overflow-scan.ts";

/**
 * W25 (owner, 2026-10-21, phone): the page could be zoomed out / scrolled sideways, and the footer was one
 * column. The browser half is scripts/static/overflow-check.ts (CI: every page at 360 and 390 px); these are
 * the source rules behind it (the node runner cannot render JSX).
 */
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const read = (rel: string) => fs.readFileSync(path.join(ROOT, rel), "utf8");
const sources = (dir: string): string[] =>
  fs.readdirSync(path.join(ROOT, dir), { recursive: true, encoding: "utf8" }).filter((f) => f.endsWith(".tsx") && !f.includes(".test.")).map((f) => path.join(dir, f));

test("every horizontal scroller is positioned, so absolutely positioned content (sr-only text) stays inside its clip", () => {
  // The fa home/prices cause: an `sr-only` span in an indicator card escaped the strip's overflow-x-auto (its containing
  // block was outside the strip) and, in RTL, widened the page to ~700px at a 360px viewport.
  const scrollers: string[] = [];
  for (const file of [...sources("components"), ...sources("app")]) {
    for (const m of read(file).matchAll(/className="([^"]*\boverflow-x-auto\b[^"]*)"/g)) {
      scrollers.push(file);
      assert.match(m[1], /(^|\s)relative(\s|$)/, `${file}: "${m[1]}" needs \`relative\``);
    }
  }
  for (const f of ["components/indicators/indicator-strip.tsx", "components/home/price-strip.tsx", "components/articles/article-body.tsx"]) assert.ok(scrollers.includes(f), f);
});

test("zoom is never blocked: no maximum-scale / user-scalable in the viewport", () => {
  for (const file of [...sources("app"), "app/[locale]/layout.tsx"]) {
    const src = read(file);
    assert.doesNotMatch(src, /maximumScale|userScalable|maximum-scale|user-scalable/, file);
  }
});

test("footer: two columns below md (brand and contact span both), md and lg layouts unchanged", () => {
  const footer = read("components/layout/SiteFooter.tsx");
  assert.match(footer, /<div className="container-x grid grid-cols-2 gap-x-6 gap-y-10 py-16 md:gap-12 lg:grid-cols-12 lg:py-20">/);
  assert.match(footer, /<div className="col-span-2 md:col-span-1 lg:col-span-4">\s*<div className="flex items-center gap-2\.5">/);
  assert.match(footer, /<nav className="min-w-0 lg:col-span-3" aria-label=\{t\.productsNav\}>/);
  assert.match(footer, /<nav className="min-w-0 lg:col-span-2" aria-label=\{t\.companyNav\}>/);
  assert.match(footer, /<div className="col-span-2 md:col-span-1 lg:col-span-3">\s*<h3 className="eyebrow text-accent-on-inverse">\{offices\.head\.label\}<\/h3>/);
});

test("the overflow scan is plain JavaScript the page can evaluate", () => {
  assert.doesNotThrow(() => new Function(`return ${OVERFLOW_SCAN_EXPRESSION}`));
  assert.match(OVERFLOW_SCAN_EXPRESSION, /scrollWidth/);
  assert.doesNotMatch(OVERFLOW_SCAN_EXPRESSION, /: (Element|OverflowScan|string)\b/, "type annotations are stripped");
});
