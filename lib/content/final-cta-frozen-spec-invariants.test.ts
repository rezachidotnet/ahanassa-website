import { test } from "node:test";
import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";
import { homepageCopy } from "./homepage.ts";
import { CONTACT_PHONE_E164 } from "./contact-channels.ts";
import { localizedPath } from "../../config/locales.ts";

/**
 * docs/final-cta/AHANASSA_FINAL_CTA_COMPONENT_FREEZE_V1.0.md regression
 * coverage.
 *
 * This file owns the Final CTA COMPONENT contract — its copy, destinations,
 * button reuse, surface, semantics, claim safety and data independence. The
 * page-level contract (which sections exist and in what order) stays in
 * `homepage-composition-invariants.test.ts`; the two layers deliberately do
 * not duplicate each other.
 *
 * Same convention as the sibling invariants files: the component is JSX and
 * there is no React render-testing framework in this repo, so its markup is
 * pinned as source-text invariants. Every copy assertion is made against the
 * IMPORTED FREEZE DOCUMENT itself rather than a string retyped here, so this
 * test cannot drift from its own authority.
 */

const REPO_ROOT = path.resolve(fileURLToPath(new URL(".", import.meta.url)), "../..");

function readSource(relativePath: string): string {
  return readFileSync(path.join(REPO_ROOT, relativePath), "utf8");
}

/** Source with comments stripped — assertions about CODE, not documentation. */
function readCode(relativePath: string): string {
  return readSource(relativePath)
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/\{\/\*[\s\S]*?\*\/\}/g, "")
    .split("\n")
    .filter((line) => !/^\s*(\/\/|\*)/.test(line))
    .join("\n");
}

const SPEC_PATH = "docs/final-cta/AHANASSA_FINAL_CTA_COMPONENT_FREEZE_V1.0.md";
const COMPONENT_PATH = "components/home/final-cta.tsx";

const SPEC = readSource(SPEC_PATH);
const COMPONENT_SOURCE = readSource(COMPONENT_PATH);
const COMPONENT = readCode(COMPONENT_PATH);
/** The rendered JSX only — everything after the single `return (`. */
const JSX = COMPONENT.slice(COMPONENT.indexOf("return ("));

const LOCALES = ["fa", "en", "ar"] as const;

// ---------------------------------------------------------------------------
// The frozen authority is present and is what these tests encode
// ---------------------------------------------------------------------------

test("the frozen Final CTA V1.0 authority is imported into the repository", () => {
  assert.ok(existsSync(path.join(REPO_ROOT, SPEC_PATH)), `${SPEC_PATH} must exist — it is the authority these assertions encode`);
});

test("the frozen purpose and position really are the ones asserted here (§1)", () => {
  const section1 = SPEC.slice(SPEC.indexOf("## 1. Authority, purpose and position"), SPEC.indexOf("## 2. Canonical FA content"));
  assert.ok(section1.includes("always present as the last Homepage content section, before the global Footer"), "§1 must freeze the always-present closing position");
  assert.ok(section1.includes("does not depend on products, price data, evidence thresholds or industry content"), "§1 must freeze the zero-eligibility rule");
});

// ---------------------------------------------------------------------------
// Content — §2 (FA), §3 (EN), §4 (AR), pinned against the document itself
// ---------------------------------------------------------------------------

/**
 * Extracts one locale's canonical section from the freeze document. Every copy
 * assertion below compares the shipped content to THIS, never to a string
 * retyped into the test.
 */
function specSection(startHeading: string, endHeading: string) {
  const block = SPEC.slice(SPEC.indexOf(startHeading), SPEC.indexOf(endHeading));
  function field(label: string): string {
    const match = block.match(new RegExp(`^${label}: (.+)$`, "m"));
    assert.ok(match, `${startHeading} must declare "${label}"`);
    return match[1].trim();
  }
  return {
    title: field("H2"),
    body: field("Supporting text"),
    primaryCta: field("Primary CTA"),
    secondaryCta: field("Secondary CTA"),
    reassurance: field("Reassurance"),
  };
}

const SPEC_BY_LOCALE = {
  fa: specSection("## 2. Canonical FA content", "## 3. Canonical EN content"),
  en: specSection("## 3. Canonical EN content", "## 4. Canonical AR content"),
  ar: specSection("## 4. Canonical AR content", "## 5. Content boundaries"),
} as const;

for (const locale of LOCALES) {
  test(`${locale}: every approved string matches the frozen document character-for-character (§2-§4)`, () => {
    const shipped = homepageCopy[locale].finalCta;
    const frozen = SPEC_BY_LOCALE[locale];
    assert.equal(shipped.title, frozen.title, "H2");
    assert.equal(shipped.body, frozen.body, "supporting text");
    assert.equal(shipped.primaryCta, frozen.primaryCta, "primary CTA label");
    assert.equal(shipped.secondaryCta, frozen.secondaryCta, "secondary CTA label");
    assert.equal(shipped.reassurance, frozen.reassurance, "reassurance");
  });

  test(`${locale}: the copy carries no eyebrow, no second paragraph and no destination field (§5, §7)`, () => {
    // §5: "No eyebrow, process steps, product list, testimonials, counters,
    // contact form, upload widget or additional paragraph in V1.0." The field
    // must not merely be empty — it must not exist, so no future edit can
    // populate it without reopening the frozen structure. And §7 requires the
    // destinations be resolved from the shared helpers, never stored as copy.
    const copy = homepageCopy[locale].finalCta as Record<string, unknown>;
    assert.deepEqual(Object.keys(copy).sort(), ["body", "primaryCta", "reassurance", "secondaryCta", "title"], "the shape is exactly these five approved strings");
    for (const forbidden of ["eyebrow", "steps", "process", "note", "body2", "paragraph", "href", "link", "phone", "tel", "hours"]) {
      assert.ok(!(forbidden in copy), `§5/§7: no \`${forbidden}\` field may exist on the Final CTA copy`);
    }
  });
}

test("en/ar are real localized equivalents, never Persian fallbacks or copies of each other (§2-§4)", () => {
  const fa = homepageCopy.fa.finalCta;
  for (const locale of ["en", "ar"] as const) {
    const t = homepageCopy[locale].finalCta;
    assert.notEqual(t.title, fa.title);
    assert.notEqual(t.body, fa.body);
    assert.notEqual(t.primaryCta, fa.primaryCta);
  }
  assert.notEqual(homepageCopy.en.finalCta.title, homepageCopy.ar.finalCta.title);
});

test("the Final CTA does not restate the Hero, Buyer Value or Industries (Composition §7)", () => {
  // Composition §7's duplication gate: each section owns exactly one message.
  for (const locale of LOCALES) {
    const t = homepageCopy[locale].finalCta;
    assert.notEqual(t.title, homepageCopy[locale].hero.title, `${locale}: the Final CTA must not repeat the Hero H1`);
    assert.notEqual(t.body, homepageCopy[locale].hero.body, `${locale}: it must not repeat the Hero's supporting copy`);
    assert.notEqual(t.reassurance, homepageCopy[locale].hero.reassurance, `${locale}: the two reassurances are different approved strings`);
    assert.notEqual(t.title, homepageCopy[locale].buyerValue.title, `${locale}: it must not summarise Buyer Value`);
    assert.notEqual(t.title, homepageCopy[locale].industries.title, `${locale}: it must not summarise Industries`);
  }
});

// ---------------------------------------------------------------------------
// Claim safety — §5
// ---------------------------------------------------------------------------

test("no cheapest/best/fastest, guaranteed-stock or guaranteed-response claim appears (§5)", () => {
  const forbidden: Record<string, RegExp[]> = {
    en: [/\bguarantee/i, /\bcheapest\b/i, /\bbest\b/i, /\bfastest\b/i, /\binstant\b/i, /\bimmediately\b/i, /\bin stock\b/i, /\bwithin \d+/i, /\b24\/7\b/],
    fa: [/تضمین/, /ارزان‌ترین/, /بهترین/, /سریع‌ترین/, /فوری/, /موجودی تضمین/],
    ar: [/ضمان/, /الأرخص/, /الأفضل/, /الأسرع/, /فوري/, /متوفر دائم/],
  };
  for (const locale of LOCALES) {
    const text = JSON.stringify(homepageCopy[locale].finalCta);
    for (const shape of forbidden[locale]) {
      assert.ok(!shape.test(text), `${locale}: §5 forbids a claim matching ${shape}`);
    }
  }
});

test("no attachment, photo, voice, spreadsheet, instant-quote or checkout capability is claimed (§5)", () => {
  // §5: "No claim that attaching photos, voice messages or spreadsheets is
  // supported until the actual RFQ flow supports it. The button leads to the
  // existing list-entry flow; it does not itself upload or send anything."
  const forbidden: Record<string, RegExp[]> = {
    en: [/\battach/i, /\bupload/i, /\bphoto/i, /\bvoice/i, /\bspreadsheet/i, /\bexcel\b/i, /\bpdf\b/i, /\bcart\b/i, /\bcheckout\b/i, /\bbuy now\b/i, /\bquote instantly\b/i],
    fa: [/پیوست/, /آپلود/, /عکس/, /صوت/, /اکسل/, /سبد خرید/, /پرداخت آنلاین/],
    ar: [/مرفق/, /رفع ملف/, /صورة/, /صوتي/, /إكسل/, /سلة التسوق/, /الدفع الإلكتروني/],
  };
  for (const locale of LOCALES) {
    const text = JSON.stringify(homepageCopy[locale].finalCta);
    for (const shape of forbidden[locale]) {
      assert.ok(!shape.test(text), `${locale}: §5 forbids an unsupported-capability claim matching ${shape}`);
    }
  }
});

test("the non-commitment reassurance is visible normal text, not a tooltip or legal footnote (§5)", () => {
  for (const locale of LOCALES) {
    assert.ok(homepageCopy[locale].finalCta.reassurance.trim().length > 0, `${locale}: the reassurance must exist`);
  }
  assert.match(JSX, /<p[^>]*>\{t\.reassurance\}<\/p>/, "§5: rendered as a real paragraph");
  assert.ok(!/title=|aria-describedby|tooltip|role="tooltip"|<details|<summary/.test(COMPONENT), "§5: never a tooltip or disclosure");
  assert.ok(!/sr-only|visually-hidden/.test(COMPONENT), "the reassurance must be visible, not screen-reader-only");
});

// ---------------------------------------------------------------------------
// Destinations — §7
// ---------------------------------------------------------------------------

test("the primary action reuses the Hero's canonical locale-aware RFQ destination (§7)", () => {
  // §7: "Primary MUST use the same canonical locale-aware RFQ
  // destination/helper as the approved Hero ... do not hard-code /request or
  // /contact from memory and do not create a new route merely for Final CTA."
  assert.match(COMPONENT, /localizedPath\(locale,\s*"\/request"\)/, "the primary href must resolve via localizedPath(locale, \"/request\")");
  assert.match(readSource("components/home/hero.tsx"), /localizedPath\(locale,\s*"\/request"\)/, "and that must still be the Hero's own destination");
  assert.ok(!/localizedPath\(locale,\s*"\/contact"\)/.test(COMPONENT), "§7: the older CtaBand /contact destination must not be reused");
  assert.ok(!/href="\/(en|ar)?\/?request"/.test(COMPONENT), "§7: no hard-coded per-locale path");
  assert.ok(!/href="#"|href={"#"}/.test(COMPONENT), "§11: a missing route is a release defect, never a \"#\"");
});

test("the resolved RFQ route really exists for every locale, and is a real page (§7, §11)", () => {
  assert.equal(localizedPath("fa", "/request"), "/request");
  assert.equal(localizedPath("en", "/request"), "/en/request");
  assert.equal(localizedPath("ar", "/request"), "/ar/request");
  assert.ok(existsSync(path.join(REPO_ROOT, "app/[locale]/request/page.tsx")), "§11: the primary destination must be a route that actually exists");
});

test("the telephone action reuses the single verified configured number (§7)", () => {
  // §7: "Secondary MUST reuse the verified telephone-pricing behavior of the
  // Hero ... Do not invent a number, callback modal or business hours."
  // HP-CONTENT-P1 (2026-09-14): the owner-supplied number is a local
  // landline-style value, not E.164 — pin the exact approved value instead
  // of a generic international-format shape.
  assert.equal(CONTACT_PHONE_E164, "03135134", "the shared constant must be the exact owner-approved phone number");
  assert.ok(COMPONENT.includes("CONTACT_PHONE_E164"), "the component must import the shared phone constant");
  assert.ok(!/tel:\+\d{6,15}/.test(COMPONENT), "the number must never be hard-coded — the href is built from the constant");
  assert.match(COMPONENT, /href=\{`tel:\$\{CONTACT_PHONE_E164\}`\}/, "the same tel: pattern the Hero, Header and mobile drawer use");
  assert.match(readSource("components/home/hero.tsx"), /tel:\$\{CONTACT_PHONE_E164\}/, "and that must still be the Hero's own telephone behavior");
  assert.ok(!/callback|business hours|ساعات کاری|ساعات العمل|<dialog|Modal/i.test(COMPONENT), "§7: no invented callback flow or business hours");
});

test("navigation stays in the same tab and introduces no nested or fake interactive control (§7)", () => {
  assert.ok(!/target="_blank"/.test(COMPONENT), "§7: keep navigation in the same tab");
  assert.ok(!/<button|role="button"|onClick|disabled/.test(COMPONENT), "§7: both actions are navigations — a real <button> would be wrong, and no fake disabled link may exist");
  assert.ok(!/onClick|href/.test(JSX.slice(0, JSX.indexOf("<h2"))), "§7: no whole-section click target");
});

// ---------------------------------------------------------------------------
// Shared Button reuse — §7
// ---------------------------------------------------------------------------

test("both actions consume the Shared Button Component V1.0, not a local or legacy variant (§7)", () => {
  assert.match(COMPONENT, /<ButtonLink\s+href=\{localizedPath\(locale, "\/request"\)\}\s+variant="primary"\s+size="button"/, "primary = ButtonLink variant=\"primary\" size=\"button\"");
  assert.match(COMPONENT, /buttonVariants\(\{\s*variant:\s*"secondary",\s*size:\s*"button"\s*\}\)/, "secondary = buttonVariants({ variant: \"secondary\", size: \"button\" }) on a plain tel: anchor");
  // The older Copper `default`/`lg` pair CtaBand uses is a different, retained
  // contract and must not leak into this section.
  assert.ok(!/variant:\s*"(default|inverse|outline|ghost)"|variant="(default|inverse|outline|ghost)"/.test(COMPONENT), "§7: the legacy Copper/inverse/outline variants must not be reused here");
  assert.ok(!/size:\s*"lg"|size="lg"|size="default"/.test(COMPONENT), "§7: only the Shared Button's exact `button` size is allowed");
  assert.ok(!/\btext-copper\b|\bbg-copper\b|copper-400/.test(COMPONENT), "§10: no Copper for text or fills on this Navy surface");
});

test("the on-dark inversion is a call-site override, and the resting geometry stays the frozen 48px (§6, §7)", () => {
  // §7: "Primary button: Warm Cream filled with Navy text. Secondary:
  // transparent Navy surface with a visible light outline and light text."
  assert.match(COMPONENT, /bg-\[var\(--aa-color-brand-cream-50\)\][^"]*text-navy/, "primary is Cream-filled with Navy text");
  assert.match(COMPONENT, /border-white\/70[^"]*text-white/, "secondary is a light outline with a light label");
  // §7: "At text zoom allow height to grow instead of clipping." `h-auto
  // min-h-12 py-3` is 12 + 24 (text-base line-height) + 12 = exactly 48px at
  // rest, and grows rather than cropping.
  assert.match(COMPONENT, /h-auto min-h-12/, "height may grow under text-only zoom");
  assert.match(COMPONENT, /\bpy-3\b/, "12px + 24px line-height + 12px = the frozen 48px resting height");
  for (const forbidden of ["truncate", "line-clamp", "text-ellipsis", "whitespace-nowrap", "overflow-hidden"]) {
    assert.ok(!COMPONENT.includes(forbidden), `§6: a label must never be truncated — \`${forbidden}\` is forbidden`);
  }
});

test("the focus ring is retoned for the Navy surface without new CSS or a new variant (§10)", () => {
  // §10: "Keyboard focus must remain visible against both light button and
  // Navy background, using a contrast-checked offset outline." The global ring
  // is Forge Copper #B04A2F, which is 2.83:1 on Steel Navy #0B2545 — below the
  // 3:1 non-text floor. The section rebinds the variable for its own subtree.
  assert.match(COMPONENT, /\[--aa-color-focus-ring:var\(--aa-color-brand-cream-50\)\]/, "the ring is rebound to Warm Cream (14.19:1 on Navy) for this section only");
  assert.match(readSource("styles/theme-extensions.css"), /\.aa-button:focus-visible \{\s*outline: 2px solid var\(--aa-color-focus-ring\);/, "the shared rule must still read the variable this section overrides");
  assert.ok(!/outline-none|focus:outline-none/.test(COMPONENT), "focus visibility must never be removed");
});

// ---------------------------------------------------------------------------
// Visual surface — §6
// ---------------------------------------------------------------------------

test("the section is a flat full-width Steel Navy surface inside the shared container (§6)", () => {
  assert.match(COMPONENT, /className="[^"]*\bbg-navy\b/, "§6: Steel Navy #0B2545 via --color-navy");
  assert.ok(!/\bbg-navy-800\b|\bbg-navy-700\b|\bbg-navy-600\b/.test(COMPONENT), "§6 names the surface by its hex — the darker interaction-state shades are a different token");
  assert.match(COMPONENT, /container-x/, "the shared Homepage container/gutter system");
});

test("it is NOT another Hero — no card, grid, image, gradient, decorative SVG, hero radius or shadow (§6)", () => {
  // §6: "No large Cream inset card, engineering grid, background photo, image
  // panel, decorative SVG, hero-sized radius, heavy shadow or gradients."
  for (const forbidden of ["<Image", "next/image", "hairline-grid", "engineering-grid", "<svg", "bg-linear-to", "bg-gradient", "rounded-3xl", "rounded-2xl", "backdrop-", "isolate"]) {
    assert.ok(!COMPONENT.includes(forbidden), `§6: the Final CTA must not contain \`${forbidden}\``);
  }
  assert.ok(!/\bshadow-(?!none)/.test(COMPONENT), "§6: no heavy shadow — the Shared Button's own shadow is explicitly cleared");
  assert.match(COMPONENT, /\bshadow-none\b/, "§6: the primary button's inherited shadow is removed on this surface");
  assert.ok(!/\.(png|jpe?g|webp|avif|svg)\b/.test(COMPONENT), "§6: no background photograph or image asset of any kind");
});

test("heading is Warm Cream and body/reassurance are full-strength White, with no arbitrary opacity (§6)", () => {
  assert.match(COMPONENT, /<h2[\s\S]{0,200}?text-\[var\(--aa-color-brand-cream-50\)\]/, "§6: heading in Warm Cream #FBF5EB");
  assert.equal((JSX.match(/<p[^>]*\btext-white\b/g) ?? []).length, 2, "§6: both the supporting text and the reassurance are full-strength White");
  assert.ok(!/text-white\/\d+/.test(JSX), "§6: \"avoid arbitrary opacity that makes secondary text unreadable\" — the older CtaBand's text-white/60 is not copied");
});

test("no artificial tracking and no locale-specific forced line break (§8)", () => {
  assert.ok(!/tracking-/.test(COMPONENT), "§8: no Persian/Arabic letter-spacing");
  assert.ok(!/<br\s*\/?>/.test(COMPONENT), "§8: \"No forced line breaks that only fit Persian.\"");
});

test("section rhythm and internal spacing come from the shared scale (§8)", () => {
  assert.match(COMPONENT, /className="[^"]*\bpy-20 lg:py-28\b/, "the shared Homepage vertical rhythm every sibling section uses");
  assert.match(JSX, /<p className="mt-4 max-w-2xl/, "§8 heading-to-supporting 12-16px -> 16px");
  assert.match(JSX, /\bmt-8 lg:mt-0\b/, "§8 copy-to-actions when stacked 24-32px -> 32px, collapsed in the two-column state");
  assert.match(JSX, /<p className="mt-4 text-sm/, "§8 reassurance gap 12-16px -> 16px");
  assert.match(JSX, /\bgap-3\b/, "§6 mobile button gap 12-16px -> 12px");
});

// ---------------------------------------------------------------------------
// Layout — §6 (structural, not screenshot-based)
// ---------------------------------------------------------------------------

test("desktop is a ~60/40 two-column split and narrow is ONE column (§6)", () => {
  assert.match(JSX, /flex flex-col lg:flex-row/, "§6: one column until the two-column breakpoint");
  assert.match(JSX, /lg:w-\[60%\]/, "~60% copy at the reading start");
  assert.match(JSX, /lg:w-\[40%\]/, "~40% action area at the reading end");
  assert.ok(!/\bmd:flex-row\b|\bsm:flex-row\b/.test(JSX), "§6: 1024px is the initial two-column breakpoint, not an earlier one");
  assert.ok(!/\bgrid-cols-/.test(COMPONENT), "a two-column flex split, not a grid — nothing here can produce a third track");
});

test("reading direction comes from logical CSS only, so one component serves RTL and LTR (§8)", () => {
  // The flex row's main axis already follows the container's text direction —
  // the same technique the Hero uses. No physical utility may appear.
  const physical = COMPONENT.match(/\b(?:[a-z0-9]+:)*(?:ml|mr|pl|pr|left|right|border-l|border-r|text-left|text-right)-\S*/g) ?? [];
  assert.deepEqual(physical, [], "physical left/right utilities would break FA/AR mirroring");
  assert.ok(!/flex-row-reverse|\border-\d|\bdir=/.test(COMPONENT), "§8: direction must not be produced by mirroring or reordering the DOM");
});

test("the buttons are stacked, never forced into a narrow side-by-side row (§6)", () => {
  const actionGroup = JSX.slice(JSX.indexOf("<div className=\"flex flex-col gap-3\">"), JSX.indexOf("{t.reassurance}"));
  assert.ok(actionGroup.length > 0, "the action group must exist");
  assert.ok(!/flex-row|sm:flex-row|lg:flex-row/.test(actionGroup), "§6: \"never truncate labels or force four-word English labels into a narrow width\"");
  assert.equal((actionGroup.match(/\bw-full\b/g) ?? []).length, 2, "§6: at mobile widths buttons fill the available content width");
});

test("no horizontal overflow mechanism, carousel or fixed pixel width exists (§6)", () => {
  for (const forbidden of ["overflow-x", "snap-x", "carousel", "flex-nowrap", "min-w-["]) {
    assert.ok(!COMPONENT.includes(forbidden), `§6: "no horizontal scrolling" — \`${forbidden}\` is forbidden`);
  }
  // The only arbitrary widths in the file are the two §6 percentage columns;
  // a fixed pixel width is what would actually force horizontal scroll.
  const widths = (COMPONENT.match(/\b(?:[a-z0-9]+:)*(?:max-)?w-\[[^\]]+\]/g) ?? []).map((u) => u.trim());
  assert.deepEqual(widths, ["lg:w-[60%]", "lg:w-[40%]"], "§6: only the two relative column widths — no fixed px width anywhere");
});

// ---------------------------------------------------------------------------
// Semantics — §10
// ---------------------------------------------------------------------------

test("the section is one aria-labelledby section with exactly one H2 (§10)", () => {
  assert.equal((COMPONENT.match(/<section[\s>]/g) ?? []).length, 1, "exactly one <section>");
  assert.match(COMPONENT, /<section\s+aria-labelledby=\{HEADING_ID\}/, "§10: aria-labelledby pointing at its H2");
  assert.equal((COMPONENT.match(/<h2[\s>]/g) ?? []).length, 1, "exactly one <h2>");
  assert.match(COMPONENT, /<h2\s+id=\{HEADING_ID\}/, "the H2 must carry the id aria-labelledby names");
  assert.ok(!/<h1[\s>]/.test(COMPONENT), "§10: \"Do not add a second H1\" — the single Homepage H1 belongs to the Hero");
  assert.ok(!/<h3[\s>]|<h4[\s>]/.test(COMPONENT), "the frozen structure is H2 -> paragraph -> actions -> reassurance");
});

test("the DOM order IS the frozen semantic order H2 -> supporting -> primary -> secondary -> reassurance (§6, §10)", () => {
  const markers = ["{t.title}", "{t.body}", "{t.primaryCta}", "{t.secondaryCta}", "{t.reassurance}"];
  let cursor = -1;
  for (const marker of markers) {
    const at = JSX.indexOf(marker);
    assert.ok(at > cursor, `${marker} must follow the previous element in DOM order`);
    cursor = at;
  }
  assert.ok(!/\border-\[?\d|\bflex-col-reverse\b|\btabIndex\b/.test(COMPONENT), "§10: CSS must not produce a screen-reader order that conflicts with the DOM");
});

test("there are EXACTLY two actions, and no third CTA, form, upload or disclosure (§5, §10)", () => {
  assert.equal((JSX.match(/<ButtonLink[\s>]/g) ?? []).length, 1, "exactly one primary action");
  assert.equal((JSX.match(/<a[\s>]/g) ?? []).length, 1, "exactly one secondary action");
  assert.equal((JSX.match(/href=/g) ?? []).length, 2, "two destinations in total — no third competing action");
  assert.equal((JSX.match(/<p[\s>]/g) ?? []).length, 2, "§5: exactly one supporting paragraph and one reassurance — no additional paragraph");
  for (const forbidden of ["<form", "<input", "<textarea", "<select", "<label", "<ul", "<ol", "<li", "<dialog", "<details", "<table"]) {
    assert.ok(!COMPONENT.includes(forbidden), `§5/§10: the Final CTA must not contain \`${forbidden}\``);
  }
});

// ---------------------------------------------------------------------------
// Motion and progressive enhancement — §10, §11
// ---------------------------------------------------------------------------

test("no motion, no client boundary, and therefore no hydration prerequisite (§10, §11)", () => {
  assert.ok(!/"use client"|'use client'/.test(COMPONENT), "the section is a pure server component");
  assert.ok(!/^\s*["']use client["']/.test(COMPONENT_SOURCE), "and no client directive opens the file");
  assert.ok(!/<Reveal|useEffect|useState|IntersectionObserver/.test(COMPONENT), "§10: no entrance animation and no client-side visibility gate");
  assert.ok(!/opacity-0|animate-|\bbounce\b|\bpulse\b/.test(COMPONENT), "§10: nothing may rest at opacity 0, and no attention loop");
  assert.ok(!/hover:scale|hover:-translate|hover:shadow/.test(COMPONENT), "§10: no elevated card motion");
});

test("all copy and both links are present in the server-rendered markup, with no client fetch (§11)", () => {
  assert.ok(!/fetch\(|useSWR|axios|XMLHttpRequest/.test(COMPONENT), "§11: \"All locale copy is static approved content\" — no client-side fetch for copy");
  for (const marker of ["{t.title}", "{t.body}", "{t.primaryCta}", "{t.secondaryCta}", "{t.reassurance}"]) {
    assert.ok(JSX.includes(marker), `${marker} must be rendered directly into the server markup`);
  }
});

// ---------------------------------------------------------------------------
// Failure behavior and eligibility — §11
// ---------------------------------------------------------------------------

test("the Final CTA has NO eligibility gate of any kind — it can never omit itself (§11)", () => {
  // §11: "Final CTA has no data eligibility threshold or evidence feature
  // flag. It must remain visible when Price, Products, Evidence or Industries
  // fail or are omitted." Structural proof: no early return exists at all.
  assert.ok(!/return null/.test(COMPONENT), "§11: there must be no omission path");
  assert.equal((COMPONENT.match(/\breturn\b/g) ?? []).length, 1, "exactly one return — the section itself");
  assert.match(COMPONENT, /export function FinalCta\(\{ locale \}: \{ locale: Locale \}\)/, "§11: `locale` is the only input, so nothing else can gate it");
});

test("Final CTA has ZERO Odoo, DB_PUBLIC, Evidence, Industries, projection or flag dependency (§11)", () => {
  // Proven structurally by pinning the complete import list.
  const imports = [...COMPONENT_SOURCE.matchAll(/^import .*? from "(.+?)";$/gm)].map((m) => m[1]);
  assert.deepEqual(
    imports.sort(),
    ["@/components/ui/button", "@/config/locales", "@/lib/content/contact-channels", "@/lib/content/homepage", "@/lib/utils"],
    "a pure server component over localized editorial content plus the shared route/phone/button helpers",
  );
  for (const forbidden of ["cloudflare:workers", "DB_PUBLIC", "DB_OPS", "odoo", "Odoo", "listHomepageProductCandidates", "getHomepagePriceStrip", "priceStrip", "PRICE_STRIP_ENABLED", "catalog", "industries", "Industries", "evidence", "Evidence", "migrations_public", "process.env"]) {
    assert.ok(!COMPONENT.includes(forbidden), `§11: the Final CTA must not depend on \`${forbidden}\``);
  }
});

test("the Homepage renders the Final CTA unconditionally, after Buyer Value and the Industries slot (§1, §11)", () => {
  const page = readSource("app/[locale]/page.tsx")
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/\{\/\*[\s\S]*?\*\/\}/g, "");
  const rendered = page.slice(page.indexOf("return ("));

  const buyerValue = rendered.indexOf("<BuyerValue");
  const industries = rendered.indexOf("<Industries");
  const finalCta = rendered.indexOf("<FinalCta");
  assert.ok(buyerValue > -1 && industries > -1 && finalCta > -1, "all three must render");
  assert.ok(buyerValue < finalCta, "§1: the Final CTA follows Buyer Value");
  assert.ok(industries < finalCta, "§1: the Final CTA follows the Industries slot");
  assert.match(rendered, /<FinalCta locale=\{locale\} \/>/, "§11: rendered directly, with no conditional wrapper, flag or ternary");

  // Nothing may be rendered after it except the non-visual JSON-LD script —
  // §1 makes it the LAST content section before the global Footer.
  const after = rendered.slice(finalCta + "<FinalCta locale={locale} />".length);
  const remainingTags = [...after.matchAll(/<([A-Za-z][A-Za-z0-9]*)/g)].map((m) => m[1]);
  assert.deepEqual(remainingTags, ["JsonLd"], "§1: no visible section may follow the Final CTA");
});

test("Industries returning null cannot suppress the Final CTA — the two are structurally unrelated (§11)", () => {
  // Industries is the immediately preceding, currently-ineligible section. It
  // returns null before any markup; the Final CTA is a separate sibling in the
  // page's flat fragment, reads none of Industries' inputs, and is rendered
  // outside every try/catch on the page.
  const industriesCode = readCode("components/home/industries.tsx");
  assert.ok(/return null;/.test(industriesCode), "Industries really is able to omit itself today");
  assert.ok(!COMPONENT.includes("resolveIndustrySectorImages") && !COMPONENT.includes("isIndustriesCopyComplete"), "the Final CTA must not read the Industries publication gate");

  const page = readSource("app/[locale]/page.tsx");
  const catchAt = page.indexOf("} catch (error) {");
  assert.ok(page.indexOf("<FinalCta") > catchAt, "the Final CTA is rendered outside every failure boundary on the page");
});

// ---------------------------------------------------------------------------
// Analytics — §7
// ---------------------------------------------------------------------------

test("no analytics provider, tracker or RFQ-content exfiltration is introduced (§7)", () => {
  // §7: "Do not introduce a new analytics provider or send RFQ contents to
  // analytics." No approved analytics convention exists in this repository yet
  // (01-sources/DECISIONS.md OPEN-005 defers the provider), so the correct
  // implementation adds nothing at all.
  for (const forbidden of ["gtag", "dataLayer", "analytics", "plausible", "posthog", "va(", "track(", "sendBeacon"]) {
    assert.ok(!COMPONENT.includes(forbidden), `§7: no tracking may be invented here — \`${forbidden}\``);
  }
});

// ---------------------------------------------------------------------------
// The shared CtaBand is untouched — Composition §8
// ---------------------------------------------------------------------------

test("components/ui/cta-band.tsx is NOT superseded, NOT modified, and still serves six other pages (Composition §8)", () => {
  // The Homepage's USE of CtaBand was replaced; CtaBand itself was not. It is
  // a shared component, so rewriting it in place would have silently changed
  // six pages outside this phase's scope.
  const ctaBandPath = "components/ui/cta-band.tsx";
  assert.ok(existsSync(path.join(REPO_ROOT, ctaBandPath)), `${ctaBandPath} must NOT be deleted`);
  const ctaBand = readSource(ctaBandPath);
  assert.match(ctaBand, /export function CtaBand\(/, "its export must survive intact");
  // Its own, different, still-approved copy for those pages is untouched.
  assert.match(ctaBand, /فاکتور یا لیست خرید دارید؟/, "the retained component keeps its own FA copy");
  assert.match(ctaBand, /localizedPath\(locale, "\/contact"\)/, "and its own /contact destination, which the Homepage no longer uses");

  for (const consumer of [
    "app/[locale]/products/page.tsx",
    "app/[locale]/products/[slug]/page.tsx",
    "app/[locale]/industries/page.tsx",
    "app/[locale]/markets/page.tsx",
    "app/[locale]/about/page.tsx",
    "app/[locale]/services/page.tsx",
  ]) {
    assert.ok(readSource(consumer).includes("@/components/ui/cta-band"), `${consumer} must still use the shared CtaBand`);
  }
  // And the Homepage must NOT render both — exactly one closing CTA.
  const page = readSource("app/[locale]/page.tsx");
  assert.ok(!page.includes("@/components/ui/cta-band"), "the Homepage must not import CtaBand any more");
  assert.equal((page.match(/<FinalCta/g) ?? []).length, 1, "exactly ONE Final CTA renders on the Homepage");
});

test("no hidden crawler-only or agent-only content layer exists in this section", () => {
  assert.ok(!/<noscript[\s>]/.test(COMPONENT), "no <noscript> content duplicate");
  assert.ok(!/dangerouslySetInnerHTML/.test(COMPONENT), "no injected markup");
  assert.ok(!/display:\s*none|visibility:\s*hidden|text-indent:\s*-/.test(COMPONENT), "no visually hidden keyword layer");
});
