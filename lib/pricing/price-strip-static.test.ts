import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";

/**
 * PRICE-P4 §32: static source-text invariants for
 * `components/home/price-strip.tsx` — the same established pattern
 * `lib/catalog/homepage-source-isolation.test.ts` uses for a component that
 * cannot be loaded under plain `node --test` (it imports `next/link`, which
 * has no real resolvable package outside the Vite/vinext build). Genuine
 * rendered-markup/DOM assertions (item counts, aria-labelledby target
 * resolution, forbidden-content absence in real output) are covered by
 * `lib/pricing/price-strip-presentation.test.ts` (the pure logic this
 * component delegates to) and by real-browser verification
 * (docs/pricing/PRICE_P4_FINAL_UI_VERIFICATION_REPORT.md).
 */

const REPO_ROOT = path.resolve(fileURLToPath(new URL(".", import.meta.url)), "../..");
const COMPONENT_PATH = "components/home/price-strip.tsx";

function readSource(): string {
  return readFileSync(path.join(REPO_ROOT, COMPONENT_PATH), "utf8");
}

/**
 * Strips `/** ... *\/` and `// ...` comments before scanning for forbidden
 * implementation-level terms. This component's own doc comments legitimately
 * explain what it deliberately does NOT do (e.g. "no `\"use client\"`, no
 * ... marquee") — the same false-positive risk
 * lib/catalog/homepage-source-isolation.test.ts already documents for a
 * different substring — so these particular checks must only see actual
 * code, never prose describing an absence.
 */
function readSourceCodeOnly(): string {
  return readSource()
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/\/\/.*$/gm, "");
}

test("no 'use client' directive — the component stays server-rendered", () => {
  assert.ok(!/["']use client["']/.test(readSourceCodeOnly()));
});

test("no fetch() call", () => {
  assert.ok(!/\bfetch\s*\(/.test(readSourceCodeOnly()));
});

test("no useEffect/useState/other client-only hooks", () => {
  const source = readSourceCodeOnly();
  for (const hook of ["useEffect", "useState", "useRef", "useLayoutEffect"]) {
    assert.ok(!source.includes(hook), `must not use the client-only hook "${hook}"`);
  }
});

test("no setInterval/setTimeout (no autoplay/auto-advance mechanism)", () => {
  const source = readSourceCodeOnly();
  assert.ok(!/\bsetInterval\s*\(/.test(source));
  assert.ok(!/\bsetTimeout\s*\(/.test(source));
});

test("no marquee/autoplay/carousel terminology or libraries in actual code", () => {
  const source = readSourceCodeOnly().toLowerCase();
  for (const forbidden of ["marquee", "autoplay", "carousel", "swiper", "embla"]) {
    assert.ok(!source.includes(forbidden), `must not reference "${forbidden}" outside of explanatory comments`);
  }
});

test("no ARIA roles that imply an interactive widget (menu/listbox/carousel-style roles)", () => {
  const source = readSourceCodeOnly();
  for (const forbidden of ['role="menu"', 'role="listbox"', 'role="tablist"', 'role="button"']) {
    assert.ok(!source.includes(forbidden), `must not use ${forbidden}`);
  }
});

test("no aria-live (Frozen V2.1 §36.9: no aria-live in V2)", () => {
  assert.ok(!readSourceCodeOnly().includes("aria-live"));
});

test("no product image/media import", () => {
  const source = readSourceCodeOnly();
  assert.ok(!/from\s+["']next\/image["']/.test(source));
  assert.ok(!/from\s+["'][^"']*media-registry[^"']*["']/.test(source));
});

test("no CTA button element or forbidden CTA copy inside the card", () => {
  const source = readSourceCodeOnly();
  assert.ok(!/<button/i.test(source));
  for (const forbidden of ["Buy", "Add to cart", "View price", "مشاهده همه قیمت‌ها", "View all prices"]) {
    assert.ok(!source.includes(forbidden), `must not contain forbidden CTA copy: "${forbidden}"`);
  }
});

test("no gain/loss/trading-style visual language", () => {
  const source = readSourceCodeOnly().toLowerCase();
  for (const forbidden of ["hot price", "best price", "discount", "% change", "price-change"]) {
    assert.ok(!source.includes(forbidden), `must not contain trading-style language: "${forbidden}"`);
  }
});

test("uses native CSS scroll behavior on mobile (overflow-x-auto + snap), not a custom drag/carousel library", () => {
  const source = readSource();
  assert.ok(source.includes("overflow-x-auto"));
  assert.ok(source.includes("snap-x") || source.includes("snap-mandatory"));
});

test("defines a responsive grid at tablet/desktop widths (sm:/md:/xl: grid utilities present)", () => {
  const source = readSource();
  assert.ok(/sm:grid\b/.test(source));
  assert.ok(/md:grid-cols-3/.test(source));
  assert.ok(/xl:grid-cols-6/.test(source));
});

test("section is aria-labelledby, and a matching heading id exists in source", () => {
  const source = readSource();
  assert.ok(source.includes('aria-labelledby="selected-prices-heading"'));
  assert.ok(source.includes('id="selected-prices-heading"'));
});

test("uses real <ul>/<li> list semantics", () => {
  const source = readSource();
  assert.ok(/<ul\b/.test(source));
  assert.ok(/<li\b/.test(source));
});

test("uses next/link (a real <a>) for the linked-card path, not a div with a click handler", () => {
  const source = readSource();
  assert.ok(source.includes('from "next/link"'));
  assert.ok(!/onClick=\{.*router\.push/.test(source), "must not simulate navigation via a click handler on a non-anchor element");
});

test("renders the guidance/trust copy as visible text, not inside a title attribute or hover-only affordance", () => {
  const source = readSource();
  assert.ok(source.includes("t.guidance"));
  assert.ok(!/title=\{t\.guidance\}/.test(source), "guidance text must be visible body copy, not a hover-only title attribute");
});

test("component is Homepage-only: not referenced from Header/RFQ/Processing source", () => {
  const forbiddenReferencers = ["components/layout/SiteHeader.tsx", "components/contact/enquiry-form.tsx"];
  for (const file of forbiddenReferencers) {
    const source = readFileSync(path.join(REPO_ROOT, file), "utf8");
    assert.ok(!source.includes("price-strip"), `${file} must not reference the Price Strip component`);
  }
});
