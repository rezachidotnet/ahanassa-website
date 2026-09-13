import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";
import { homepageCopy } from "./homepage.ts";
import { primaryCta } from "./nav.ts";
import { CONTACT_PHONE_E164 } from "./contact-channels.ts";

/**
 * docs/hero/AHANASSA_HERO_FINAL_FROZEN_V2.4.md acceptance-criteria
 * regression coverage (current authority — incorporates all non-superseded
 * rules from docs/hero/AHANASSA_HERO_FINAL_FROZEN_V2.3.md), EXCEPT for the
 * H1/process/trust-layer content, which was revised by direct owner
 * instruction after V2.4 was written (see components/home/hero.tsx's own
 * "Content note" doc comment) — the static 3-point trust micro-layer those
 * documents specify no longer exists; it was replaced by a 4-step process
 * rail. `lib/content/homepage.ts`/`nav.ts`/`contact-channels.ts` are plain
 * data (no `cloudflare:workers`/`next/*` dependency) so they're directly
 * unit-testable; `components/home/hero.tsx` imports `next/link` and
 * cannot be rendered under plain `node --test` in this repo (no real
 * `next` package — only `vinext`), so it is pinned as source-text
 * invariants instead, matching this repo's established convention (see
 * `lib/content/header-frozen-spec-invariants.test.ts`,
 * `lib/pricing/price-strip-static.test.ts`). Button geometry/interaction
 * (height/radius/padding/font/hover/active/focus-visible/forced-colors)
 * coverage lives in `components/ui/button.test.ts` (Shared Button
 * Component V1.0), not here — this file only proves Hero consumes it
 * rather than a local implementation (V2.4 §2).
 */

const REPO_ROOT = path.resolve(fileURLToPath(new URL(".", import.meta.url)), "../..");
function readSource(relativePath: string): string {
  return readFileSync(path.join(REPO_ROOT, relativePath), "utf8");
}

const HERO_SOURCE = readSource("components/home/hero.tsx");
const CSS_SOURCE = readSource("styles/theme-extensions.css");

/**
 * Strips /* * / block comments and // line comments before a "must not
 * contain X" assertion runs — this file's own explanatory comments
 * legitimately NAME the forbidden/removed patterns (to explain why they
 * were avoided/removed), which otherwise produces a false-positive match
 * against the literal code-level check (same reasoning as
 * header-frozen-spec-invariants.test.ts's stripComments helper).
 */
function stripComments(source: string): string {
  return source.replace(/\/\*[\s\S]*?\*\//g, "").replace(/\/\/.*$/gm, "");
}
const HERO_CODE = stripComments(HERO_SOURCE);
const CSS_CODE = stripComments(CSS_SOURCE);

// --- §2-6: frozen FA content ---

test("Hero FA content matches the current owner-directed baseline exactly", () => {
  const t = homepageCopy.fa.hero;
  assert.equal(t.eyebrow, "مدیریت تأمین فولاد پروژه");
  assert.equal(t.title, "تأمین فولاد پروژه‌ها");
  assert.equal(t.body, "آهن آسا مسیر خرید آهن شما را آسان، شفاف و قابل‌کنترل می‌کند.");
  assert.equal(t.secondaryCta, "درخواست قیمت تلفنی");
  assert.equal(t.reassurance, "ارسال لیست خرید برای شما تعهدی ایجاد نمی‌کند.");
  assert.ok(!t.reassurance.includes("ابتدا نیاز شما بررسی می‌شود"), "the dropped reassurance clause must not remain");
  // HP-CONTENT-P1 (2026-09-14, owner-approved): step 4 changed from "خرید" to "تأمین".
  assert.deepEqual(t.process, ["ارسال لیست درخواست", "بررسی فنی", "بررسی تجاری", "تأمین"]);
  assert.equal(t.brandLine, "ما مراقب سرمایه شما هستیم.");
  assert.equal(primaryCta.fa.full, "ارسال لیست خرید");
});

test("Hero process rail is exactly 4 steps for every locale, distinct per locale", () => {
  for (const locale of ["fa", "en", "ar"] as const) {
    assert.equal(homepageCopy[locale].hero.process.length, 4, `${locale}: process must have exactly 4 steps`);
    for (const step of homepageCopy[locale].hero.process) {
      assert.ok(step.length > 0, `${locale}: process step must not be empty`);
    }
  }
  assert.notDeepEqual(homepageCopy.en.hero.process, homepageCopy.ar.hero.process);
});

test("Process rail is a real semantic <ol>/<li> list, positioned with CSS logical properties (RTL/LTR-safe, no direction-specific classes)", () => {
  assert.match(HERO_CODE, /<ol\b[\s\S]*?\{t\.process\.map/, "expected the process rail to be a real <ol> containing t.process.map");
  assert.match(HERO_CODE, /<li\b[\s\S]*?key=\{step\}/, "expected each process step to be a real <li>");
  const railBlock = HERO_CODE.match(/<ol\b[\s\S]*?<\/ol>/)?.[0] ?? "";
  assert.match(railBlock, /inset-inline-start/, "the step connector must use a logical (inline-start), not physical (left/right), position");
  assert.ok(!/\brtl:|:\s*ltr:/.test(railBlock), "the process rail must not need any rtl:/ltr: override — logical properties + flex row already handle direction");
});

test("Hero no longer exposes an old trust field or old trust copy anywhere", () => {
  for (const locale of ["fa", "en", "ar"] as const) {
    assert.ok(!("trust" in homepageCopy[locale].hero), `${locale}: hero.trust must not exist any more`);
  }
  for (const oldPoint of ["بررسی فنی نیاز", "مقایسه گزینه‌های تأمین", "هماهنگی خرید"]) {
    assert.ok(!HERO_CODE.includes(oldPoint), `hero.tsx must not render the removed trust point "${oldPoint}"`);
  }
});

test("Hero reassurance/brandLine/secondaryCta are non-empty, distinct strings for every locale", () => {
  for (const locale of ["fa", "en", "ar"] as const) {
    const t = homepageCopy[locale].hero;
    assert.ok(t.reassurance.length > 0);
    assert.ok(t.brandLine.length > 0);
    assert.ok(t.secondaryCta.length > 0);
    assert.notEqual(t.reassurance, t.body);
    assert.notEqual(t.brandLine, t.title);
  }
});

test("Hero en/ar copy never reuses Persian text (real localized equivalents, not FA fallbacks)", () => {
  const fa = homepageCopy.fa.hero;
  for (const locale of ["en", "ar"] as const) {
    const t = homepageCopy[locale].hero;
    assert.notEqual(t.title, fa.title);
    assert.notEqual(t.body, fa.body);
    assert.notEqual(t.eyebrow, fa.eyebrow);
  }
  // en/ar must not be identical to each other either
  assert.notEqual(homepageCopy.en.hero.title, homepageCopy.ar.hero.title);
});

test("Hero copy never overclaims (no guarantee/best-price/fastest-delivery language) in any locale", () => {
  const forbidden = [/guarantee/i, /best price/i, /fastest delivery/i, /100%/, /تضمین/, /بهترین قیمت/, /ضمانت/, /ضمان/, /أفضل سعر/];
  for (const locale of ["fa", "en", "ar"] as const) {
    const t = homepageCopy[locale].hero;
    const text = [t.eyebrow, t.title, t.body, t.reassurance, t.brandLine, t.secondaryCta, ...t.process].join(" ");
    for (const pattern of forbidden) {
      assert.ok(!pattern.test(text), `${locale}: Hero copy must not match forbidden claim pattern ${pattern}`);
    }
  }
});

// --- §30.1/§30.2: CTA integrity ---

test("Secondary CTA phone source is the centralized Central Verified Business Identity number, not a Hero-local hardcode", () => {
  // HP-CONTENT-P1 (2026-09-14): the owner-supplied number is a local
  // landline-style value, not E.164 — pin the exact approved value instead
  // of a generic international-format shape.
  assert.equal(CONTACT_PHONE_E164, "03135134", "the shared constant must be the exact owner-approved phone number");
  assert.ok(HERO_CODE.includes("CONTACT_PHONE_E164"), "hero.tsx must import the shared phone constant");
  assert.ok(!/tel:\+\d{6,15}/.test(HERO_CODE), "hero.tsx must not hardcode a raw tel: number — it must build the href from CONTACT_PHONE_E164");
});

test("Secondary CTA uses a real tel: action for every locale (no WhatsApp fallback)", () => {
  assert.ok(!HERO_CODE.includes("WHATSAPP"), "Hero must not reference a WhatsApp channel — §30.2 requires phone for every locale");
  assert.ok(!HERO_CODE.includes("wa.me"));
});

test("Primary CTA points at /request, never /contact", () => {
  assert.ok(/localizedPath\(locale,\s*"\/request"\)/.test(HERO_CODE), "Primary CTA href must resolve via localizedPath(locale, \"/request\")");
  assert.ok(!/localizedPath\(locale,\s*"\/contact"\)/.test(HERO_CODE), "Hero must not route its Primary CTA to /contact");
});

test("Primary CTA is real navigation: no modal/setTimeout/animation-end gating before it fires (§9/§58)", () => {
  assert.ok(!/setTimeout/.test(HERO_CODE));
  assert.ok(!/animationend/i.test(HERO_CODE));
  assert.ok(!/onClick/.test(HERO_CODE), "Hero CTAs must be plain <Link>/<a> elements with no click-intercepting handler");
});

// --- §8/§32: visual integrity ---

test("Hero no longer references the removed false-ownership steel-mill image, and uses the real approved photo", () => {
  assert.ok(!HERO_CODE.includes("hero-steel-mill"), "the false-ownership photo must never be referenced again");
  assert.ok(HERO_CODE.includes("/images/hero-steel-procurement.jpg"), "expected the approved Hero photo to be referenced");
});

test("Hero image is a real next/image <Image>, decorative (empty alt, aria-hidden column), sized/prioritized correctly", () => {
  const imgMatch = HERO_CODE.match(/<Image\b[\s\S]*?\/>/);
  assert.ok(imgMatch, "expected a real <Image> element for the Hero photo");
  const img = imgMatch[0];
  assert.match(img, /alt=""/, "decorative image (Hero's own text already carries every real claim) — alt must be empty, matching assurance.tsx's convention");
  assert.match(img, /\bfill\b/, "expected fill layout to match the aspect-ratio-reserving wrapper (no CLS)");
  assert.match(img, /\bpriority\b/, "Hero photo is above-the-fold — expected priority loading");
  assert.match(img, /sizes=/, "expected a sizes attribute for responsive delivery");
  // the column wrapping the image must still be aria-hidden, since the image itself has no unique content
  const wrapperIndex = HERO_CODE.indexOf('<div className="lg:w-[45%]" aria-hidden="true">');
  const imageIndex = HERO_CODE.indexOf("<Image");
  assert.ok(wrapperIndex !== -1 && imageIndex !== -1 && wrapperIndex < imageIndex, "expected the Image to remain inside the aria-hidden visual column");
});

test("Hero image cannot produce a broken-image state that hides real content — copy/CTAs are DOM siblings, not dependent on the image", () => {
  // The image column is a sibling of the copy column (both children of the
  // same flex row), not a wrapper around it — verified structurally: the
  // copy column's closing tag appears before the image column opens.
  const copyColumnEnd = HERO_CODE.indexOf("{t.brandLine}");
  const imageColumnStart = HERO_CODE.indexOf('<div className="lg:w-[45%]"');
  assert.ok(copyColumnEnd !== -1 && imageColumnStart !== -1 && copyColumnEnd < imageColumnStart, "copy column must fully precede the image column in the DOM, not wrap it");
});

// --- V2.4 §2/§5/§6: Shared Button Component adoption ---

test("Hero Primary CTA consumes the Shared Button Component (ButtonLink variant=\"primary\"), not a local fill", () => {
  assert.match(HERO_CODE, /<ButtonLink\s+href=\{localizedPath\(locale, "\/request"\)\}\s+variant="primary"\s+size="button"/, "Primary CTA must render via ButtonLink variant=\"primary\" size=\"button\"");
  assert.ok(!/\bbg-navy\b|\bbg-white\b/.test(HERO_CODE.match(/<ButtonLink[\s\S]*?<\/ButtonLink>/)?.[0] ?? ""), "Primary CTA must not locally redefine its fill — that's the Shared Button's job (V2.4 §2)");
});

test("Hero Secondary CTA consumes the Shared Button Component (buttonVariants variant=\"secondary\"), not a local border/fill", () => {
  assert.match(HERO_CODE, /buttonVariants\(\{\s*variant:\s*"secondary",\s*size:\s*"button"\s*\}\)/, "Secondary CTA must render via buttonVariants({ variant: \"secondary\", size: \"button\" })");
});

test("Hero does not duplicate a local .hero-cta Button token set (V2.4 §2 — Hero no longer owns Button geometry)", () => {
  assert.ok(!HERO_CODE.includes("hero-cta"), "hero.tsx must not reference a Hero-local Button class any more");
  assert.ok(!CSS_CODE.includes(".hero-cta"), "theme-extensions.css must not keep a Hero-local Button class any more — superseded by .aa-button in button.tsx's shared variants");
});

// --- reassurance: reduced prominence, still always visible (never hover/tooltip-only) ---

test("Reassurance is subordinate styling (smaller than supporting copy, muted, no bold/border/background/icon) but always visible", () => {
  const reassuranceMatch = HERO_CODE.match(/className="([^"]*)">\{t\.reassurance\}/);
  assert.ok(reassuranceMatch, "expected to find the reassurance paragraph's className");
  const cls = reassuranceMatch[1];
  assert.match(cls, /\btext-muted-foreground\b/, "must use the existing muted semantic token, not a new color");
  assert.match(cls, /\btext-xs\b/, "must be smaller than supporting copy (text-lg) and the process labels (text-sm)");
  assert.ok(!/font-(bold|semibold|extrabold)/.test(cls), "must not be bold");
  assert.ok(!/\bborder\b|\bbg-(?!transparent)/.test(cls), "must not have its own border or background box");
  // it must not be hidden behind hover/focus-only visibility or a <details>/tooltip pattern
  assert.ok(!/\bhidden\b|group-hover:|peer-hover:|hover:opacity|focus:opacity/.test(cls), "reassurance must be visible without interaction on desktop, mobile, keyboard, or touch");
  assert.ok(!/<details|role="tooltip"|title=\{t\.reassurance\}/.test(HERO_CODE), "reassurance must not be implemented as a tooltip/disclosure");
});

// --- §6: brand line theme alignment ---

test("Brand line uses the unchanged theme copper accent color, at a modestly larger (but still restrained) size", () => {
  const brandLineMatch = HERO_CODE.match(/className="([^"]*)">\{t\.brandLine\}/);
  assert.ok(brandLineMatch, "expected to find the brand line's className");
  assert.match(brandLineMatch[1], /\btext-copper\b/, "brand line color must remain exactly text-copper — not changed by this task");
  assert.match(brandLineMatch[1], /\btext-base\b/, "expected the one-step size increase from text-sm to text-base");
  assert.ok(!/text-(lg|xl|2xl|3xl|4xl)/.test(brandLineMatch[1]), "brand line must not become a headline-scale element");
});

// --- §11/§16/§19/§25: layout/motion prohibitions ---

test("Hero never forces 100vh as its default height", () => {
  assert.ok(!/100vh/.test(HERO_CODE));
});

test("Hero contains no carousel/slider/autoplay/parallax markup", () => {
  for (const pattern of [/carousel/i, /slider/i, /autoplay/i, /parallax/i, /<video/i]) {
    assert.ok(!pattern.test(HERO_CODE), `Hero must not contain ${pattern}`);
  }
});

test("Hero content is not hidden behind opacity:0 pending JS (progressive-enhancement baseline)", () => {
  assert.ok(!/opacity-0\b/.test(HERO_CODE) && !/opacity:\s*0/.test(HERO_CODE));
  assert.ok(!HERO_CODE.includes('"use client"'), "Hero must remain a server component — no client-side reveal dependency");
});

// --- §22/§27/§28: trust/claim + structured-data boundary ---

test("Hero contains no fake metric/claim patterns (counters, tonnage, reviews, guarantees, logos)", () => {
  for (const pattern of [/\d+[,.]?\d*\s*(tons?|customers?|years?)/i, /★/, /trustpilot/i, /testimonial/i, /verified purchase/i]) {
    assert.ok(!pattern.test(HERO_CODE), `Hero must not contain ${pattern}`);
  }
  assert.ok(!/application\/ld\+json/.test(HERO_CODE), "Hero must not emit its own structured data from decorative content");
});

test("Hero performs no client-side Odoo/commercial data fetch", () => {
  for (const pattern of [/fetch\(/, /odoo/i, /useEffect/, /useState/]) {
    assert.ok(!pattern.test(HERO_CODE), `Hero must remain a static server component — found ${pattern}`);
  }
});

// --- §17/§22.2: mobile content order (statically verifiable via source order) ---

test("Hero copy elements appear in the current order in source: eyebrow, H1, process rail, body, primary CTA, secondary CTA, reassurance, brand line", () => {
  const markers = ["eyebrow", "<h1", "t.process.map", "t.body", 'href={localizedPath(locale, "/request")', "tel:${CONTACT_PHONE_E164}", "t.reassurance", "t.brandLine"];
  let lastIndex = -1;
  for (const marker of markers) {
    const index = HERO_CODE.indexOf(marker);
    assert.ok(index !== -1, `expected to find "${marker}" in hero.tsx`);
    assert.ok(index > lastIndex, `"${marker}" must appear after the previous order element`);
    lastIndex = index;
  }
});
