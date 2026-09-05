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
 * rules from docs/hero/AHANASSA_HERO_FINAL_FROZEN_V2.3.md). `lib/content/homepage.ts`/`nav.ts`/
 * `contact-channels.ts` are plain data (no `cloudflare:workers`/`next/*`
 * dependency) so they're directly unit-testable; `components/home/hero.tsx`
 * imports `next/link` and cannot be rendered under plain `node --test` in
 * this repo (no real `next` package — only `vinext`), so it is pinned as
 * source-text invariants instead, matching this repo's established
 * convention (see `lib/content/header-frozen-spec-invariants.test.ts`,
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

test("Hero FA content matches the frozen V2.3 baseline exactly", () => {
  const t = homepageCopy.fa.hero;
  assert.equal(t.eyebrow, "مدیریت تأمین فولاد پروژه");
  assert.equal(t.title, "تأمین فولاد پروژه، با بررسی فنی و تجاری پیش از خرید.");
  assert.equal(
    t.body,
    "لیست خرید یا نیاز پروژه را ارسال کنید؛ آهن آسا مشخصات، گزینه‌های تأمین و شرایط تجاری را بررسی می‌کند تا مسیر خرید شفاف‌تر و قابل‌کنترل‌تر باشد.",
  );
  assert.equal(t.secondaryCta, "درخواست قیمت تلفنی");
  assert.equal(t.reassurance, "ارسال لیست خرید برای شما تعهدی ایجاد نمی‌کند؛ ابتدا نیاز شما بررسی می‌شود.");
  assert.deepEqual(t.trust, ["بررسی فنی نیاز", "مقایسه گزینه‌های تأمین", "هماهنگی خرید"]);
  assert.equal(t.brandLine, "ما مراقب سرمایه شما هستیم.");
  assert.equal(primaryCta.fa.full, "ارسال لیست خرید");
});

test("Hero trust micro-layer is exactly 3 points for every locale (§5/§31 max-3 rule)", () => {
  for (const locale of ["fa", "en", "ar"] as const) {
    assert.equal(homepageCopy[locale].hero.trust.length, 3, `${locale}: trust must have exactly 3 points`);
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
    const text = [t.eyebrow, t.title, t.body, t.reassurance, t.brandLine, t.secondaryCta, ...t.trust].join(" ");
    for (const pattern of forbidden) {
      assert.ok(!pattern.test(text), `${locale}: Hero copy must not match forbidden claim pattern ${pattern}`);
    }
  }
});

// --- §30.1/§30.2: CTA integrity ---

test("Secondary CTA phone source is the centralized Central Verified Business Identity number, not a Hero-local hardcode", () => {
  assert.match(CONTACT_PHONE_E164, /^\+\d{6,15}$/);
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

test("Hero no longer references the removed false-ownership steel-mill image", () => {
  assert.ok(!HERO_CODE.includes("hero-steel-mill"));
  assert.ok(!HERO_CODE.includes("next/image"), "the temporary safe media state is pure CSS/SVG — no <Image> dependency, so it cannot produce a broken-image state");
});

test("Hero has no <img> element at all in its current (temporary safe media state) form", () => {
  assert.ok(!/<img\b/i.test(HERO_CODE));
});

test("Temporary safe media state renders more than a single decorative element (HERO-P1.1: must not feel empty)", () => {
  const svgMatch = HERO_CODE.match(/<svg[\s\S]*?<\/svg>/);
  assert.ok(svgMatch, "expected an inline SVG for the temporary media state");
  const rectCount = (svgMatch[0].match(/<rect/g) ?? []).length;
  const lineCount = (svgMatch[0].match(/<line/g) ?? []).length;
  assert.ok(rectCount >= 2, "expected stacked-plate + checklist rect cues, not a single flat shape");
  assert.ok(lineCount >= 2, "expected multiple line cues (checklist rows + steel cross-section)");
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

// --- §6: brand line theme alignment (HERO-P1.1 fix #3) ---

test("Brand line uses the theme copper accent, remains text-sm (not louder than H1/CTA)", () => {
  const brandLineMatch = HERO_CODE.match(/className="([^"]*)">\{t\.brandLine\}/);
  assert.ok(brandLineMatch, "expected to find the brand line's className");
  assert.match(brandLineMatch[1], /\btext-copper\b/);
  assert.match(brandLineMatch[1], /\btext-sm\b/);
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

test("Hero copy elements appear in the frozen order in source: eyebrow, H1, body, primary CTA, secondary CTA, reassurance, trust, brand line", () => {
  const markers = ["eyebrow", "<h1", "t.body", 'href={localizedPath(locale, "/request")', "tel:${CONTACT_PHONE_E164}", "t.reassurance", "t.trust.map", "t.brandLine"];
  let lastIndex = -1;
  for (const marker of markers) {
    const index = HERO_CODE.indexOf(marker);
    assert.ok(index !== -1, `expected to find "${marker}" in hero.tsx`);
    assert.ok(index > lastIndex, `"${marker}" must appear after the previous frozen-order element`);
    lastIndex = index;
  }
});
