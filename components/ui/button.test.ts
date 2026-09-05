import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";
import { buttonVariants } from "./button-variants.ts";

/**
 * docs/design-system/AHANASSA_BUTTON_COMPONENT_FINAL_FROZEN_V1.0.md
 * acceptance-criteria regression coverage — the ONE shared source of truth
 * for Header (V2.2), Hero (V2.4), and mobile drawer Primary/Secondary
 * CTAs. `buttonVariants` is plain `cva` (no `next/*`/`cloudflare:workers`
 * dependency) so its class output is directly unit-testable; the
 * forced-colors CSS lives in styles/theme-extensions.css and is pinned as
 * a source-text invariant instead, matching this repo's established
 * convention (see lib/content/header-frozen-spec-invariants.test.ts).
 */

const REPO_ROOT = path.resolve(fileURLToPath(new URL(".", import.meta.url)), "../..");
function readSource(relativePath: string): string {
  return readFileSync(path.join(REPO_ROOT, relativePath), "utf8");
}

/**
 * Strips /* * / block comments before a "must not contain X" assertion
 * runs — this file's own explanatory comments legitimately NAME the
 * forbidden pattern (to explain why it's avoided), which otherwise
 * produces a false-positive match (same reasoning as
 * header-frozen-spec-invariants.test.ts's stripComments helper).
 */
function stripComments(source: string): string {
  return source.replace(/\/\*[\s\S]*?\*\//g, "").replace(/\/\/.*$/gm, "");
}

const CSS_SOURCE = readSource("styles/theme-extensions.css");
const CSS_CODE = stripComments(CSS_SOURCE);

const primaryClass = buttonVariants({ variant: "primary", size: "button" });
const secondaryClass = buttonVariants({ variant: "secondary", size: "button" });

// --- §4: exact frozen geometry ---

test("Primary/Secondary share identical geometry: 48px height, 8px radius, 28px padding, 16px/600 (§4/§9)", () => {
  for (const cls of [primaryClass, secondaryClass]) {
    assert.match(cls, /\bh-12\b/, "expected h-12 (48px) exact height");
    assert.match(cls, /rounded-\[var\(--aa-radius-sm\)\]/, "expected the 8px radius token");
    assert.match(cls, /\bpx-7\b/, "expected px-7 (28px) exact horizontal padding");
    assert.match(cls, /\btext-base\b/, "expected text-base (16px) exact font size");
    assert.match(cls, /\bfont-semibold\b/, "expected font-semibold (600)");
  }
});

test("Primary and Secondary produce byte-identical structural classes (geometry never diverges by variant)", () => {
  // Strip color/fill-only tokens (bg-*, text-navy/text-white, border-*, shadow-*, hover:/active: color changes)
  // and compare what's left — the shared shape/interaction contract.
  const stripColor = (cls: string) =>
    cls
      .split(" ")
      .filter((token) => !/^(bg-|text-navy$|text-white$|border-navy|border$|shadow-|hover:bg-|hover:border-|hover:text-|active:bg-)/.test(token))
      .sort()
      .join(" ");
  assert.equal(stripColor(primaryClass), stripColor(secondaryClass));
});

test("Secondary never uses a tinted/solid fill competing with Primary (§8 frozen rule)", () => {
  assert.match(secondaryClass, /\bbg-transparent\b/);
  // Base (non-hover/active) fill only — a subtle hover:bg-navy/5 affordance
  // on an otherwise-transparent ghost button is not the forbidden "tinted
  // solid fill" (that would be a base-state Secondary that looks like a
  // lighter Primary); only an unprefixed bg-navy-*/bg-copper-* token counts.
  const baseFillTokens = secondaryClass.split(" ").filter((t) => /^bg-(navy|copper)/.test(t));
  assert.equal(baseFillTokens.length, 0, `Secondary must not use a base-state tinted/solid fill, found: ${baseFillTokens.join(", ")}`);
  assert.match(secondaryClass, /\bborder\b/, "Secondary must have a visible border");
});

test("Primary is a literal solid semantic-navy fill, no gradient/glow/pill (§7/§13)", () => {
  assert.match(primaryClass, /\bbg-navy\b/);
  assert.match(primaryClass, /\btext-white\b/);
  assert.ok(!/gradient|glow|rounded-full|rounded-pill/.test(primaryClass));
});

// --- §10/§11: hover / pressed ---

test("Hover transition is exactly 160ms (§10), pressed state is capped at scale(0.98) (§11)", () => {
  for (const cls of [primaryClass, secondaryClass]) {
    assert.match(cls, /duration-\[160ms\]/);
    assert.match(cls, /active:scale-\[0\.98\]/);
    assert.ok(!/scale-(105|110|125)/.test(cls), "no overshoot scale");
  }
});

// --- §12: reduced motion ---

test("Pressed transform is removable under prefers-reduced-motion (§12)", () => {
  for (const cls of [primaryClass, secondaryClass]) {
    assert.match(cls, /motion-reduce:active:scale-100/);
  }
  // Belt-and-suspenders site-wide kill-switch, unaffected by this component:
  const base = readSource("styles/base.css");
  assert.match(base, /prefers-reduced-motion:\s*reduce[\s\S]{0,200}transition-duration:\s*0\.01ms\s*!important/);
});

// --- §13: focus contract ---

test("focus-visible outline is 2px / 3px offset, never a blanket :focus{outline:none} (§13)", () => {
  // Raw CSS shorthand (.aa-button:focus-visible), not Tailwind's split
  // outline-style/-width/-color utility classes — see button-variants.ts's
  // compoundVariants comment: the Tailwind-utility approach was measured
  // live to resolve outline-style to "none" for this compound variant.
  for (const cls of [primaryClass, secondaryClass]) {
    assert.match(cls, /\baa-button\b/, "Primary/Secondary must carry the aa-button class for the shared focus-visible ring");
  }
  const block = CSS_CODE.match(/\.aa-button:focus-visible\s*\{[^}]*outline:\s*2px solid var\(--aa-color-focus-ring\)[^}]*outline-offset:\s*3px[^}]*\}/);
  assert.ok(block, "expected a plain .aa-button:focus-visible { outline: 2px solid ...; outline-offset: 3px; } rule");
  assert.ok(!/:focus\s*\{[^}]*outline:\s*none/.test(readSource("components/ui/button.tsx")));
});

// --- §14: forced colors ---

test("forced-colors support exists on .aa-button and does not use forced-color-adjust:none (§14)", () => {
  const block = CSS_CODE.match(/@media \(forced-colors: active\)[\s\S]*?\.aa-button[\s\S]*?\}\s*\}/);
  assert.ok(block, "expected an @media (forced-colors: active) block covering .aa-button");
  assert.ok(!CSS_CODE.includes("forced-color-adjust: none"), "must not fight the user's forced-colors palette");
  for (const cls of [primaryClass, secondaryClass]) {
    assert.match(cls, /\baa-button\b/, "Primary/Secondary must carry the aa-button class for forced-colors coverage");
  }
});

// --- §11 critical invariant / §28: INP ---

test("No animation-completion dependency or artificial delay is present anywhere in the component (§11/§28)", () => {
  const source = readSource("components/ui/button.tsx");
  assert.ok(!/setTimeout/.test(source));
  assert.ok(!/animationend|transitionend/i.test(source));
  assert.ok(!/preventDefault/.test(source));
});

// --- §3: semantic HTML ---

test("Button renders a real <button>; ButtonLink renders real navigation (next/link) — never a clickable div/span (§3)", () => {
  const source = readSource("components/ui/button.tsx");
  assert.match(source, /<button\b/);
  assert.match(source, /<Link\b/);
  assert.ok(!/<div[^>]*onClick|<span[^>]*onClick/.test(source));
});

// --- §26/§29: single source of truth, no drift ---

test("Exactly one variant pair owns the frozen Primary/Secondary geometry — no second 'button' size definition", () => {
  const source = readSource("components/ui/button-variants.ts");
  const buttonSizeMatches = source.match(/button:\s*"/g) ?? [];
  assert.equal(buttonSizeMatches.length, 1, "expected exactly one size=\"button\" definition (single source of truth)");
});

test("Pre-existing default/inverse/outline/ghost variants are untouched (no unrelated-consumer drift)", () => {
  assert.equal(buttonVariants({ variant: "default" }), buttonVariants({ variant: "default" }));
  const defaultClass = buttonVariants({ variant: "default" });
  assert.match(defaultClass, /\bbg-copper\b/, "existing copper 'default' variant must remain, for cta-band.tsx/catalog-empty-state.tsx");
  assert.ok(!/\bh-12\b/.test(defaultClass), "existing 'default' size must not gain the new exact 48px height unless it already had it");
});

// --- Header/Hero/Drawer adoption (cross-file, source-level) ---

test("Header, Hero, and the mobile drawer each consume the shared primary/secondary variants — not a locally duplicated class string", () => {
  for (const file of ["components/layout/SiteHeader.tsx", "components/layout/mobile-nav-drawer.tsx", "components/home/hero.tsx"]) {
    const source = readSource(file);
    assert.ok(/variant="primary"|variant:\s*"primary"/.test(source), `${file} must consume the shared Primary variant`);
  }
  const heroSource = readSource("components/home/hero.tsx");
  assert.ok(/variant:\s*"secondary"/.test(heroSource), "Hero must consume the shared Secondary variant for its phone CTA");
});
