import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";

/**
 * P1-4 failure isolation (Product Showcase V2.0 §80.2) and the zero-product
 * behaviour (§35, §82 "0 cards | Section hidden"), plus the standing
 * price/stock/transaction-free regression invariants (§11/§12/§17.17/§21.2/
 * §74/§81.1/§82) as they apply to the Showcase specifically.
 *
 * The price/stock/transaction assertions here are scoped to what this P1
 * changed — the rendered card and the candidate query — and deliberately do
 * not restate what homepage-projection-invariants.test.ts and
 * homepage-source-isolation.test.ts already own (source-of-truth, slug
 * integrity, the shared publication gate).
 */

const REPO_ROOT = path.resolve(fileURLToPath(new URL(".", import.meta.url)), "../..");

function readSource(relativePath: string): string {
  return readFileSync(path.join(REPO_ROOT, relativePath), "utf8");
}

/**
 * Source with comments removed — these invariants are about what the
 * component RENDERS, not about prose. Without this, a doc comment that
 * merely explains why the Showcase carries no price (or names the
 * neighbouring Price Strip module, or records the old 1.05 scale value it
 * replaced) would trip the very assertion documenting it.
 */
function readCode(relativePath: string): string {
  return readSource(relativePath)
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .split("\n")
    .filter((line) => !/^\s*(\/\/|\*)/.test(line))
    .join("\n");
}

// ---------------------------------------------------------------------------
// Failure isolation — a projection read failure must not take the page down
// ---------------------------------------------------------------------------

test("the homepage catalog read is wrapped so a projection failure degrades to an empty list", () => {
  const page = readSource("app/[locale]/page.tsx");

  assert.ok(/let homepageProducts: HomepageProductCandidate\[\] = \[\];/.test(page), "the candidate list must start empty so a failed read yields an omitted section, not undefined");

  const tryStart = page.indexOf("try {", page.indexOf("let homepageProducts"));
  const catchStart = page.indexOf("} catch (error) {", tryStart);
  assert.ok(tryStart !== -1 && catchStart > tryStart, "the read must be wrapped in try/catch");

  const tryBody = page.slice(tryStart, catchStart);
  assert.ok(tryBody.includes("listHomepageProductCandidates"), "the guarded call must be the Showcase's own projection read");
});

test("the catch is scoped tightly to the Showcase read — it must not swallow unrelated Homepage failures", () => {
  const page = readSource("app/[locale]/page.tsx");
  const tryStart = page.indexOf("try {", page.indexOf("let homepageProducts"));
  const catchStart = page.indexOf("} catch (error) {", tryStart);
  const tryBody = page.slice(tryStart, catchStart);

  // Anything else failing on the Homepage must still propagate.
  for (const unrelated of ["getHomepagePriceStrip", "buildPageMetadata", "organizationSchema", "websiteSchema", "<Hero", "<CtaBand"]) {
    assert.ok(!tryBody.includes(unrelated), `${unrelated} must stay OUTSIDE the Showcase's catch — otherwise an unrelated failure is silently hidden`);
  }

  // The price strip keeps its own independent path, ahead of this block.
  assert.ok(page.indexOf("getHomepagePriceStrip") < tryStart, "the price strip read must remain independent of the Showcase's failure boundary");

  // The JSX is not inside the try either.
  assert.ok(page.indexOf("return (") > catchStart, "rendering must happen after the guarded read, not inside it");
});

test("the failure is logged with the codebase's existing tag+JSON convention, and carries no PII", () => {
  const page = readSource("app/[locale]/page.tsx");
  const catchBody = page.slice(page.indexOf("} catch (error) {", page.indexOf("let homepageProducts")), page.indexOf("return ("));

  assert.ok(catchBody.includes('console.error("HOMEPAGE_PRODUCT_SHOWCASE_READ_ERROR"'), "must use a greppable SCREAMING_SNAKE tag like the Header's own reads");
  assert.ok(catchBody.includes("error instanceof Error ? error.message : String(error)"), "must log a message string, matching HEADER_PRODUCT_FAMILIES_READ_ERROR's shape");

  for (const pii of ["locale,", "params", "request", "headers", "cookie", "ip"]) {
    assert.ok(!catchBody.includes(pii), `the error log must not include ${pii}`);
  }

  // The same convention the Header already established.
  const layout = readSource("app/[locale]/layout.tsx");
  assert.ok(layout.includes('console.error("HEADER_PRODUCT_FAMILIES_READ_ERROR"'), "the convention being mirrored must still exist");
});

// ---------------------------------------------------------------------------
// Zero-product behaviour (§35 / §82)
// ---------------------------------------------------------------------------

test("zero candidates omit the entire section — no heading, no empty state, no placeholder", () => {
  const source = readSource("components/home/product-showcase.tsx");
  const code = readCode("components/home/product-showcase.tsx");

  assert.ok(/if \(items\.length === 0\) return null;/.test(code), "0 candidates must render nothing at all");

  // The early return must precede the JSX, so no part of the section escapes it.
  assert.ok(code.indexOf("items.length === 0") < code.indexOf("<section"), "the zero check must short-circuit before any markup is returned");

  assert.ok(!code.includes("CatalogEmptyState"), "the Showcase must no longer render the 'catalog is being prepared' empty state");
  assert.ok(!source.includes('from "@/components/products/catalog-empty-state"'), "the empty-state import must be dropped entirely");
});

test("CatalogEmptyState itself is preserved for the /products listing, which legitimately needs it", () => {
  // Removing the Showcase's usage must not delete a component another route
  // depends on.
  const products = readSource("app/[locale]/products/page.tsx");
  assert.ok(products.includes("CatalogEmptyState"), "/products must still use the empty state");
  assert.doesNotThrow(() => readSource("components/products/catalog-empty-state.tsx"), "the component file must still exist");
});

// ---------------------------------------------------------------------------
// Price / stock / transaction-free regressions (§82)
// ---------------------------------------------------------------------------

test("the rendered Product Card exposes no price, currency, stock or availability", () => {
  const source = readCode("components/home/product-showcase.tsx").toLowerCase();

  for (const forbidden of ["price", "قیمت", "ریال", "تومان", "currency", "irr", "discount", "stock", "inventory", "qty_available", "موجود", "ناموجود"]) {
    assert.ok(!source.includes(forbidden), `the Product Card must never surface "${forbidden}"`);
  }
});

test("the rendered Product Card exposes no transaction control", () => {
  const source = readCode("components/home/product-showcase.tsx").toLowerCase();

  for (const forbidden of ["add to cart", "addtocart", "buy now", "checkout", "quantity", "سبد خرید", "افزودن به سبد", "خرید"]) {
    assert.ok(!source.includes(forbidden), `the Product Card must never surface "${forbidden}"`);
  }
  assert.ok(!/<button/i.test(readCode("components/home/product-showcase.tsx")), "no button may be nested inside the card link");
});

test("each card remains exactly one whole-card link with no nested interactive control (§72.1)", () => {
  const source = readSource("components/home/product-showcase.tsx");

  // Semantic structure: section > ul > li > a
  assert.ok(source.includes("<section"), "must keep a semantic section");
  assert.ok(source.includes("<ul"), "must keep a list");
  assert.ok(source.includes("<Reveal as=\"li\""), "each card must be a list item");

  const cardStart = source.indexOf("<Link", source.indexOf("items.map"));
  const cardEnd = source.indexOf("</Link>", cardStart);
  const card = source.slice(cardStart, cardEnd);

  assert.equal((card.match(/<Link/g) ?? []).length, 1, "exactly one link per card — no nested anchor");
  for (const nested of ["<button", "<a ", "onClick", "role=\"button\"", "tabIndex"]) {
    assert.ok(!card.includes(nested), `the card link must not contain ${nested}`);
  }

  assert.ok(card.includes("localizedPath(locale, `/products/${p.slug}`)"), "the href must still be built from the candidate's own slug");
});

test("the section is explicitly labelled by its own heading (§72.1)", () => {
  const source = readSource("components/home/product-showcase.tsx");

  assert.ok(/aria-labelledby=\{HEADING_ID\}/.test(source), "the section must be labelled by its heading");
  assert.ok(/headingId=\{HEADING_ID\}/.test(source), "the heading id must be passed to SectionHeading");

  // SectionHeading must actually place the id on the <h2>.
  const heading = readSource("components/ui/section-heading.tsx");
  assert.ok(/<h2\s*\n?\s*id=\{headingId\}/.test(heading), "SectionHeading must render the id on its h2");
  assert.ok(/headingId\?: string/.test(heading), "headingId must be optional so existing callers are unaffected");
});

test("the card image is decorative — its alt is empty, not a duplicate of the visible title (§56/§78)", () => {
  const source = readSource("components/home/product-showcase.tsx");
  assert.ok(source.includes('alt=""'), "the representative image must use an empty alt");
  assert.ok(!source.includes("alt={p.title}"), "alt must not duplicate the adjacent h3 text");
  assert.ok(source.includes("{p.title}"), "the title must still be rendered as visible text");
});

// ---------------------------------------------------------------------------
// Hover motion (§64.7 / §64.10)
// ---------------------------------------------------------------------------

test("hover motion is restrained and fully removed under reduced motion", () => {
  const source = readCode("components/home/product-showcase.tsx");

  assert.ok(source.includes("group-hover:scale-[1.015]"), "hover scale must be ~1.015, per §64.7");
  assert.ok(source.includes("duration-[160ms]"), "hover timing must sit in the ~150–180ms band");
  // Concatenated rather than written as whole class names: Tailwind's
  // content scanner reads this file too, and a literal utility token here
  // would compile a dead rule for a class nothing renders.
  const oldScale = "scale-" + "105";
  const oldDuration = "duration-" + "700";
  assert.ok(!source.includes(oldScale) && !source.includes(oldDuration), "the previous 1.05 / 700ms values must be gone");

  assert.ok(source.includes("motion-reduce:group-hover:scale-100"), "the scale must be neutralised under prefers-reduced-motion (§64.10)");
  assert.ok(source.includes("motion-reduce:transition-none"), "the transition must be removed under prefers-reduced-motion");

  for (const theatrics of ["rotate", "skew", "blur", "shadow-2xl", "animate-", "perspective"]) {
    assert.ok(!source.includes(theatrics), `no ${theatrics} theatrics on the card (§65)`);
  }
});

// ---------------------------------------------------------------------------
// Ordering is unchanged by this P1
// ---------------------------------------------------------------------------

test("deterministic base-mode ranking is untouched — basePriority + manualBoost, demand gated off", () => {
  const score = readSource("lib/ranking/score.ts");
  assert.ok(score.includes("basePriority"), "base priority must still drive ordering");
  assert.ok(score.includes("manualBoost"), "manual boost must still drive ordering");

  const repo = readSource("lib/catalog/editorial-repository.ts");
  const body = repo.slice(repo.indexOf("export async function listHomepageProductCandidates"), repo.indexOf("export interface PublishedLocaleSlug"));
  assert.ok(body.includes("computeHomepageScore"), "scoring must still be applied");
  assert.ok(body.includes("sortByHomepageScore"), "the deterministic tie-broken sort must still be applied");
  assert.ok(body.includes('const mode = options.mode ?? "base"'), 'ranking mode must still default to "base"');
});
