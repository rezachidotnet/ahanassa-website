import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";
import { controlClass, selectClass, textareaClass, labelClass } from "./form-control.ts";
import { cardVariants, badgeVariants } from "./surface-variants.ts";

/** W10.2 step 3 — shared controls, card/panel, badge/tag and the spec-table scroll region (W10.0 report §5.2-§5.5, P0-1/P0-6). */

const REPO_ROOT = path.resolve(fileURLToPath(new URL(".", import.meta.url)), "../..");
const read = (p: string) => readFileSync(path.join(REPO_ROOT, p), "utf8");
const code = (p: string) => read(p).replace(/\/\*[\s\S]*?\*\//g, "").replace(/\{\/\*[\s\S]*?\*\/\}/g, "").replace(/\/\/.*$/gm, "");

test("controls: 48px, 8px radius, the 3:1 control border, a visible focus ring and an n-500 placeholder", () => {
  for (const cls of [controlClass, selectClass, textareaClass]) {
    assert.match(cls, /\b(h-12|min-h-28)\b/);
    assert.match(cls, /\btext-ui\b/, "controls use the 15px UI size");
    assert.match(cls, /rounded-\[var\(--aa-radius-control\)\]/);
    assert.match(cls, /\bborder-border-control\b/, "border-border (1.18:1) fails WCAG 1.4.11");
    assert.match(cls, /focus-visible:shadow-\[var\(--aa-shadow-focus-control\)\]/);
    assert.match(cls, /focus-visible:outline-hidden/, "outline-hidden keeps a forced-colors-visible outline; outline-none would not");
    assert.ok(!/\boutline-none\b/.test(cls));
    assert.match(cls, /placeholder:text-tertiary/);
    assert.match(cls, /aria-invalid:border-danger/);
    assert.ok(!/opacity/.test(cls), "disabled must not be an opacity fade");
  }
  assert.match(selectClass, /\bappearance-none\b/);
  assert.match(selectClass, /\bpe-10\b/);
  assert.match(textareaClass, /\bmin-h-28\b/);
  // W10.3: a fixed 48px, never a minimum a flex/grid parent can stretch (the desktop phone input was 56.5px).
  for (const cls of [controlClass, selectClass]) {
    assert.match(cls, /(^| )h-12( |$)/);
    assert.ok(!/\bmin-h-12\b/.test(cls));
  }
  assert.ok(!/(^| )h-12( |$)/.test(textareaClass), "the textarea is multi-line");
  assert.match(labelClass, /\btext-sm\b/);
});

test("tokens: the control border, the inverse focus ring and the radius roles exist", () => {
  const tokens = read("styles/tokens.css");
  assert.match(tokens, /--aa-color-neutral-450: #868fa0;/);
  assert.match(tokens, /--aa-color-border-control: var\(--aa-color-neutral-450\);/);
  assert.match(tokens, /--aa-color-focus-ring-inverse: var\(--aa-color-brand-cream-50\);/);
  for (const role of ["tag", "control", "card", "panel", "badge"]) assert.match(tokens, new RegExp(`--aa-radius-${role}:`));
});

test("the RFQ customer fields and item rows use the shared control classes — no square, ring-less, opacity-disabled controls", () => {
  for (const file of ["components/contact/enquiry-form.tsx", "components/contact/rfq-item-row.tsx"]) {
    const source = code(file);
    assert.ok(/controlClass/.test(source), `${file} must use controlClass`);
    assert.ok(!/outline-none/.test(source), `${file}: outline-none without a replacement ring`);
    assert.ok(!/disabled:opacity/.test(source), `${file}: opacity disabled state`);
    assert.ok(!/muted-foreground\/[67]0/.test(source), `${file}: placeholder below 4.5:1`);
  }
  // W10.3: the phone legend sits outside its fieldset grid, so it carries the labels' 8px gap itself.
  assert.match(code("components/contact/enquiry-form.tsx"), /<legend className=\{`\$\{label\} mb-2`\}>/);
});

test("card 12px, panel 16px, status badge pill, tag 4px", () => {
  assert.match(cardVariants(), /rounded-\[var\(--aa-radius-card\)\]/);
  assert.match(cardVariants({ variant: "interactive" }), /motion-reduce:hover:translate-y-0/);
  assert.match(cardVariants({ variant: "panel" }), /rounded-\[var\(--aa-radius-panel\)\]/);
  assert.match(badgeVariants({ tone: "success" }), /rounded-\[var\(--aa-radius-badge\)\]/);
  assert.match(badgeVariants({ tone: "tag" }), /rounded-\[var\(--aa-radius-tag\)\]/);
  assert.ok(!/radius-badge/.test(badgeVariants({ tone: "tag" })), "a tag is never a pill");
  assert.match(badgeVariants({ tone: "info", className: "mt-2" }), /\bmt-2\b/);
});

test("spec table: a focusable, named, relative scroll region (the page never scrolls sideways) and natural size order", () => {
  const source = code("components/products/variant-spec-table.tsx");
  assert.match(source, /<div role="region" aria-label=\{t\.caption\} tabIndex=\{0\} className="[^"]*\brelative\b[^"]*\boverflow-x-auto\b/, "relative is what keeps the sr-only header text inside the clip");
  assert.match(source, /sortVariantsBySize\(unsorted\)/);
  assert.match(source, /sticky start-0/, "the size column is sticky on the inline-start edge");
  assert.match(source, /buttonVariants\(\{ variant: "link"/, "the row action has the link variant's 44px hit area");
});

test("filter chips: 44px, control radius, 3:1 border, no navy-600 text", () => {
  const source = code("components/products/catalog-filter-bar.tsx");
  assert.match(source, /min-h-11/);
  assert.match(source, /rounded-\[var\(--aa-radius-control\)\]/);
  assert.ok(!/text-navy-600/.test(source));
});
