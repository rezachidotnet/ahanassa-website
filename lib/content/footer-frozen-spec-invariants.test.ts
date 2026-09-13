import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";

/**
 * FOOTER-P1 (docs/footer/FOOTER_P1_RECONCILIATION_IMPLEMENTATION_REPORT.md)
 * regression coverage — pins the four narrow fixes made to
 * `components/layout/SiteFooter.tsx` (stale `?category=` links removed,
 * the resulting EN/AR Persian-leak removed with them, the verified phone
 * added via the single `CONTACT_PHONE_E164` source with LTR/bidi
 * isolation, and the heading hierarchy corrected to one hidden `h2` +
 * `h3` group headings per `01-sources/FOOTER_SPEC.md` §17.1/§17.3) and
 * proves nothing outside Footer's own scope regressed (Homepage's single
 * `FinalCta`, `CtaBand`'s continued use on its six other pages). No React
 * render-testing framework exists in this repo — component files are
 * pinned as source-text invariants instead, matching the established
 * convention (see `lib/content/header-frozen-spec-invariants.test.ts`,
 * `components/ui/button.test.ts`).
 */

const REPO_ROOT = path.resolve(fileURLToPath(new URL(".", import.meta.url)), "../..");
function readSource(relativePath: string): string {
  return readFileSync(path.join(REPO_ROOT, relativePath), "utf8");
}

/**
 * Strips /* * / block comments before a "must not contain X" assertion
 * runs — this file's own explanatory doc comments in SiteFooter.tsx
 * legitimately NAME the forbidden patterns (to explain why they were
 * removed or never added), which otherwise produces a false-positive
 * match (same reasoning as header-frozen-spec-invariants.test.ts's
 * stripComments helper).
 */
function stripComments(source: string): string {
  return source.replace(/\/\*[\s\S]*?\*\//g, "").replace(/\/\/.*$/gm, "");
}

const FOOTER_SOURCE = readSource("components/layout/SiteFooter.tsx");
const FOOTER_CODE = stripComments(FOOTER_SOURCE);

// --- Stale product/taxonomy links (FOOTER-P0/P1 finding) ---

test("SiteFooter no longer renders any of the four stale ?category= links", () => {
  for (const value of ["long", "flat", "semi", "raw"]) {
    assert.ok(!FOOTER_SOURCE.includes(`category=${value}`), `expected no ?category=${value} link in SiteFooter.tsx`);
  }
  assert.ok(!/\?category=/.test(FOOTER_CODE), "expected no ?category= query string anywhere in SiteFooter.tsx's actual code");
});

test("SiteFooter no longer imports the Persian-only sample catalog categories", () => {
  assert.ok(
    !/from\s+"@\/lib\/content\/catalog-sample"/.test(FOOTER_SOURCE),
    "SiteFooter must not depend on lib/content/catalog-sample.ts (sample/placeholder, Persian-only categories)",
  );
});

test("Products nav group retains exactly one truthful, unfiltered destination (/products)", () => {
  const productsNavMatch = FOOTER_SOURCE.match(/<nav[^>]*aria-label=\{t\.productsNav\}[\s\S]*?<\/nav>/);
  assert.ok(productsNavMatch, "expected a Products <nav> block");
  const block = productsNavMatch[0];
  const linkCount = (block.match(/<Link\b/g) ?? []).length;
  assert.equal(linkCount, 1, "expected exactly one <Link> in the Products nav group after removing the four stale links");
  assert.match(block, /localizedPath\(locale,\s*"\/products"\)/, "the remaining link must resolve to the real, unfiltered /products route");
});

// --- EN/AR Persian-leak removal ---

test("No hardcoded Persian sample-category label can leak into EN/AR (source no longer contains any of them)", () => {
  const persianCategoryLabels = ["مقاطع طولی", "مقاطع تخت", "محصولات نیمه‌ساخته", "مواد اولیه و آلیاژها"];
  for (const label of persianCategoryLabels) {
    assert.ok(!FOOTER_SOURCE.includes(label), `expected the sample-category label "${label}" to be gone from SiteFooter.tsx`);
  }
});

// --- Phone: single source of truth, tel: link, bidi isolation ---

test("Phone reuses the canonical CONTACT_PHONE_E164 constant, never re-hardcoded", () => {
  assert.match(FOOTER_SOURCE, /import\s*\{\s*CONTACT_PHONE_E164\s*\}\s*from\s*"@\/lib\/content\/contact-channels"/);
  assert.ok(!/\+98\d{10}/.test(FOOTER_SOURCE.replace(/import[^;]*contact-channels[^;]*;/, "")), "the raw E.164 literal must not appear anywhere outside the import statement");
});

test("A real tel: anchor exists using the canonical phone constant", () => {
  assert.match(FOOTER_SOURCE, /href=\{`tel:\$\{CONTACT_PHONE_E164\}`\}/);
});

test("The phone anchor is LTR/bidi-isolated for FA/AR (FOOTER_SPEC.md §9.5)", () => {
  const phoneAnchorMatch = FOOTER_SOURCE.match(/<a\s+href=\{`tel:\$\{CONTACT_PHONE_E164\}`\}[\s\S]*?>/);
  assert.ok(phoneAnchorMatch, "expected the tel: anchor to be found for bidi inspection");
  assert.match(phoneAnchorMatch[0], /dir="ltr"/, "expected dir=\"ltr\" on the phone anchor, per FOOTER_SPEC.md §9.5's <a ... dir=\"ltr\"> pattern");
});

test("Phone action reuses the existing headerPhoneLabel dictionary, not a duplicated one", () => {
  assert.match(FOOTER_SOURCE, /import\s*\{\s*navLinks,\s*headerPhoneLabel\s*\}\s*from\s*"@\/lib\/content\/nav"/);
  assert.match(FOOTER_SOURCE, /aria-label=\{headerPhoneLabel\[locale\]\.srLabel\}/);
});

// --- Heading hierarchy / accessibility (FOOTER_SPEC.md §17.1/§17.3) ---

test("Exactly one <footer> landmark, labelled by a single visually-hidden <h2>", () => {
  const footerOpenTags = FOOTER_SOURCE.match(/<footer\b/g) ?? [];
  assert.equal(footerOpenTags.length, 1, "expected exactly one <footer> landmark");
  assert.match(FOOTER_SOURCE, /<footer aria-labelledby="site-footer-title"/);
  assert.match(FOOTER_SOURCE, /<h2 id="site-footer-title" className="sr-only">/);
});

test("Exactly one <h2> exists (the hidden footer title) — group headings are demoted to <h3>", () => {
  const h2Count = (FOOTER_SOURCE.match(/<h2\b/g) ?? []).length;
  const h3Count = (FOOTER_SOURCE.match(/<h3\b/g) ?? []).length;
  assert.equal(h2Count, 1, "expected exactly one <h2> (the hidden footer title)");
  assert.equal(h3Count, 4, "expected the four visible group headings (Products/Company/Office/Incoterms) to be <h3>");
});

// --- No invented contact/legal channels ---

test("No email, WhatsApp, or legal-page link was invented", () => {
  assert.ok(!/mailto:/.test(FOOTER_CODE), "no mailto: link — email remains unconfirmed (PROJECT_OVERRIDES.md §10)");
  assert.ok(!/wa\.me|whatsapp/i.test(FOOTER_CODE), "no WhatsApp link — no verified number exists");
  assert.ok(!/\/privacy|\/terms/.test(FOOTER_CODE), "no /privacy or /terms link — neither route is published");
  assert.ok(!/\/process\b/.test(FOOTER_CODE), "no /process link — the route is not published");
});

// --- Cross-file safety: Homepage CTA ownership and CtaBand consumers unchanged ---

test("Homepage still renders exactly one FinalCta and zero CtaBand (no duplicate closing CTA introduced)", () => {
  const homepageSource = readSource("app/[locale]/page.tsx");
  const finalCtaTagCount = (homepageSource.match(/<FinalCta\b/g) ?? []).length;
  const ctaBandTagCount = (homepageSource.match(/<CtaBand\b/g) ?? []).length;
  assert.equal(finalCtaTagCount, 1, "expected exactly one <FinalCta> on the Homepage");
  assert.equal(ctaBandTagCount, 0, "expected zero <CtaBand> on the Homepage");
});

test("CtaBand remains a live, unmodified-by-this-task component still consumed by its six non-Homepage pages", () => {
  const ctaBandConsumers = ["about", "industries", "markets", "services"];
  for (const page of ctaBandConsumers) {
    const source = readSource(`app/[locale]/${page}/page.tsx`);
    assert.match(source, /<CtaBand\b/, `expected ${page}/page.tsx to still render <CtaBand>`);
  }
  assert.match(readSource("app/[locale]/products/page.tsx"), /<CtaBand\b/);
  assert.match(readSource("app/[locale]/products/[slug]/page.tsx"), /<CtaBand\b/);
  assert.ok(!/from\s+"@\/components\/ui\/cta-band"/.test(FOOTER_SOURCE), "SiteFooter itself must not import CtaBand");
});
