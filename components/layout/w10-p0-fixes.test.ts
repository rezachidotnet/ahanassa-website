import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";

/** W10.2 step 4 — the W10.0 P0 defects that are fixed in markup (source-level, this repo's invariant-test convention). */

const REPO_ROOT = path.resolve(fileURLToPath(new URL(".", import.meta.url)), "../..");
const code = (p: string) =>
  readFileSync(path.join(REPO_ROOT, p), "utf8")
    .replace(/\{\/\*[\s\S]*?\*\/\}/g, "")
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/\/\/.*$/gm, "");

const DRAWER = code("components/layout/mobile-nav-drawer.tsx");

test("P0-2: the drawer restores focus to the trigger only after a real open -> close, never on first mount", () => {
  assert.match(DRAWER, /const wasOpenRef = useRef\(false\);/);
  assert.match(DRAWER, /\} else if \(wasOpenRef\.current\) \{\s*triggerRef\.current\?\.focus\(\);/);
  assert.match(DRAWER, /wasOpenRef\.current = open;/);
  assert.ok(!/\} else \{\s*triggerRef\.current\?\.focus\(\);/.test(DRAWER), "an unconditional else-branch focus steals focus on every page load");
});

test("P0-3: the closed drawer is invisible and casts no shadow into the viewport", () => {
  assert.match(DRAWER, /open \? "visible translate-x-0 shadow-\[0_0_32px_rgba\(11,37,69,0\.2\)\]" : cn\(translateClosed, "invisible"\)/);
});

test("P0-7: no failing text colour remains on the listed surfaces", () => {
  for (const file of ["components/products/catalog-filter-bar.tsx", "app/[locale]/industries/page.tsx", "app/[locale]/markets/page.tsx"]) {
    assert.ok(!/text-navy-600/.test(code(file)), `${file}: navy-600 text is 3.66:1`);
  }
  for (const file of ["components/layout/SiteFooter.tsx", "components/ui/page-hero.tsx", "components/ui/cta-band.tsx", "components/ui/section-heading.tsx", "app/[locale]/services/page.tsx"]) {
    assert.ok(!/text-white\/(1|2|3|4|5|6)\d\b/.test(code(file)) || /text-white\/45" aria-hidden="true"/.test(code(file)), `${file}: muted white below white/72 on navy`);
  }
  const services = code("app/[locale]/services/page.tsx");
  assert.ok(!/text-surface-2/.test(services), "services numerals were 1.1:1");
  assert.equal((services.match(/aria-hidden="true">\{String\(i \+ 1\)\.padStart/g) ?? []).length, 2, "decorative step numerals are hidden from assistive tech");
});

test("P1-2: navy surfaces switch the focus ring to cream (on-inverse)", () => {
  assert.match(code("components/ui/page-hero.tsx"), /bg-navy on-inverse/);
  assert.match(code("components/ui/cta-band.tsx"), /bg-navy-800 on-inverse/);
  assert.match(code("components/layout/SiteFooter.tsx"), /bg-navy on-inverse/);
});

test("P1-3: hero and CTA-band gradients are mirrored in RTL (darkest where the text starts)", () => {
  assert.match(code("components/ui/page-hero.tsx"), /bg-linear-to-r rtl:bg-linear-to-l/);
  assert.match(code("components/ui/cta-band.tsx"), /bg-linear-to-r rtl:bg-linear-to-l/);
});

test("P1-4: breadcrumbs, footer links and the footer phone are 44px tap targets", () => {
  assert.match(code("components/ui/page-hero.tsx"), /const CRUMB = "inline-flex min-h-11 items-center/);
  assert.match(code("components/layout/SiteFooter.tsx"), /const FOOTER_LINK = "text-on-inverse-muted inline-flex min-h-11 items-center/);
});
