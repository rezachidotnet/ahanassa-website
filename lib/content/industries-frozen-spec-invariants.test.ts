import { test } from "node:test";
import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";
import { homepageCopy } from "./homepage.ts";
import { INDUSTRIES_SECTOR_COUNT, INDUSTRY_SECTORS, INDUSTRY_SECTOR_IMAGES, isIndustriesCopyComplete, resolveIndustrySectorImages, type IndustrySectorImage } from "./industries.ts";

/**
 * docs/industries/AHANASSA_INDUSTRIES_USE_CASES_COMPONENT_FREEZE_V1.0.md
 * regression coverage.
 *
 * This file owns the Industries / Use Cases COMPONENT contract — its copy,
 * semantics, layout, claim safety, publication gate and image policy. The
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

const SPEC_PATH = "docs/industries/AHANASSA_INDUSTRIES_USE_CASES_COMPONENT_FREEZE_V1.0.md";
const COMPONENT_PATH = "components/home/industries.tsx";
const GATE_PATH = "lib/content/industries.ts";

const SPEC = readSource(SPEC_PATH);
const COMPONENT = readCode(COMPONENT_PATH);
const GATE = readCode(GATE_PATH);

const LOCALES = ["fa", "en", "ar"] as const;

// ---------------------------------------------------------------------------
// The frozen authority is present and is what these tests encode
// ---------------------------------------------------------------------------

test("the frozen Industries V1.0 authority is imported into the repository", () => {
  assert.ok(existsSync(path.join(REPO_ROOT, SPEC_PATH)), `${SPEC_PATH} must exist — it is the authority these assertions encode`);
});

test("the frozen sector order really is the one asserted here (§2)", () => {
  // Guards against this test drifting from the document: §2's own ordering
  // block must name the three sectors in this order.
  const section2 = SPEC.slice(SPEC.indexOf("## 2. Position and exact order"), SPEC.indexOf("## 3. Canonical Persian content"));
  const expected = ["Construction projects", "Petrochemical, oil and gas", "Manufacturing and fabrication"];
  let cursor = -1;
  for (const name of expected) {
    const at = section2.indexOf(name, cursor + 1);
    assert.ok(at > cursor, `§2 must list "${name}" after the previous sector`);
    cursor = at;
  }
  assert.equal(INDUSTRIES_SECTOR_COUNT, 3, "§2/§10 freeze a three-item composition");
  assert.deepEqual([...INDUSTRY_SECTORS], ["construction", "petrochemical-oil-gas", "manufacturing-fabrication"], "the internal sector keys must follow the frozen order");
});

// ---------------------------------------------------------------------------
// Content — §3 (FA), §4 (EN), §5 (AR), pinned against the document itself
// ---------------------------------------------------------------------------

/**
 * Extracts one locale's canonical section from the freeze document and returns
 * its H2 plus its three `### n. Title` / body pairs, in document order. Every
 * copy assertion below compares the shipped content to THIS, never to a string
 * retyped into the test.
 */
function specSection(startHeading: string, endHeading: string): { h2: string; items: { title: string; body: string }[] } {
  const block = SPEC.slice(SPEC.indexOf(startHeading), SPEC.indexOf(endHeading));
  const h2Match = block.match(/^H2: (.+)$/m);
  assert.ok(h2Match, `${startHeading} must declare an H2`);
  const items = [...block.matchAll(/^### \d\. (.+)\n(.+)$/gm)].map((m) => ({ title: m[1].trim(), body: m[2].trim() }));
  assert.equal(items.length, INDUSTRIES_SECTOR_COUNT, `${startHeading} must define exactly three items`);
  return { h2: h2Match[1].trim(), items };
}

const SPEC_BY_LOCALE = {
  fa: specSection("## 3. Canonical Persian content", "## 4. Canonical English content"),
  en: specSection("## 4. Canonical English content", "## 5. Canonical Arabic content"),
  ar: specSection("## 5. Canonical Arabic content", "## 6. Visual design"),
} as const;

for (const locale of LOCALES) {
  test(`${locale}: the H2 matches the frozen document character-for-character`, () => {
    assert.equal(homepageCopy[locale].industries.title, SPEC_BY_LOCALE[locale].h2);
  });

  test(`${locale}: all three sector titles and bodies match the frozen document, in the frozen order`, () => {
    const shipped = homepageCopy[locale].industries.sectors;
    assert.equal(shipped.length, INDUSTRIES_SECTOR_COUNT, "exactly three sectors — §10 forbids a one- or two-item subset");
    for (let i = 0; i < INDUSTRIES_SECTOR_COUNT; i += 1) {
      assert.equal(shipped[i].title, SPEC_BY_LOCALE[locale].items[i].title, `sector ${i + 1} title`);
      assert.equal(shipped[i].body, SPEC_BY_LOCALE[locale].items[i].body, `sector ${i + 1} body`);
    }
  });

  test(`${locale}: the copy carries no eyebrow, supporting paragraph or CTA field (§3, §9)`, () => {
    // §3: "No extra eyebrow or introductory paragraph is required."
    // §9: V1.0 items are informational, "without ... independent RFQ CTA".
    // The field must not merely be empty — it must not exist, so no future
    // edit can populate it without reopening the frozen structure.
    const copy = homepageCopy[locale].industries as Record<string, unknown>;
    assert.deepEqual(Object.keys(copy).sort(), ["sectors", "title"], "the shape is exactly { title, sectors }");
    for (const forbidden of ["eyebrow", "body", "cta", "href", "link", "label"]) {
      assert.ok(!(forbidden in copy), `§3/§9: no \`${forbidden}\` field may exist on the Industries copy`);
    }
    for (const sector of homepageCopy[locale].industries.sectors) {
      assert.deepEqual(Object.keys(sector).sort(), ["body", "title"], "each item is exactly { title, body } — no cta, href or image field");
    }
  });
}

test("the frozen sector order is identical in all three locales, and no locale reverses it (§2)", () => {
  // §2: "Keep DOM order 1-2-3 in all locales ... Do not reverse the data array
  // and also apply RTL." Structural proof that the three arrays are positional
  // translations of one another.
  for (let i = 0; i < INDUSTRIES_SECTOR_COUNT; i += 1) {
    for (const locale of LOCALES) {
      assert.equal(homepageCopy[locale].industries.sectors[i].title, SPEC_BY_LOCALE[locale].items[i].title, `${locale} position ${i + 1} must hold the same sector as every other locale`);
    }
  }
  assert.ok(!/\.reverse\(\)|\.sort\(|toReversed/.test(COMPONENT), "§2: the component must never reorder the sector array");
  assert.ok(!/rtl:.*flex-row-reverse|flex-row-reverse/.test(COMPONENT), "§2: RTL is handled by logical CSS, never by mirroring the DOM");
});

// ---------------------------------------------------------------------------
// Claim safety — §10, Composition §6.6
// ---------------------------------------------------------------------------

test("the qualified sourcing-review wording is preserved exactly (§10)", () => {
  // §10: "Preserve the qualified wording, especially the second sector's
  // sourcing-feasibility review. No claim that all oil/gas grades or standards
  // can be supplied." Pinned against the document, so a later "improvement"
  // into a capability claim fails here rather than shipping.
  assert.match(homepageCopy.en.industries.sectors[1].body, /sourcing feasibility can be assessed/, "EN must keep feasibility ASSESSMENT, not a supply guarantee");
  assert.match(homepageCopy.fa.industries.sectors[1].body, /امکان تأمین مطابق درخواست بررسی شود/, "FA must keep the sourcing-feasibility review");
  assert.match(homepageCopy.ar.industries.sectors[1].body, /لتُدرس إمكانية التوريد/, "AR must keep the sourcing-feasibility review");
});

test("no unsupported capability, certification, volume or relationship claim appears (§10, Composition §6.6)", () => {
  // Scoped to this component's own approved copy — a narrow, non-brittle scan
  // of the exact claim shapes §10 and Composition §6.6 forbid, not a broad
  // keyword sweep across unrelated content.
  const forbidden: Record<string, RegExp[]> = {
    en: [/\bguarantee/i, /\bcertifi/i, /\bapproved supplier\b/i, /\bvendor list\b/i, /\btrusted by\b/i, /\bleading\b/i, /\bbest\b/i, /\bfastest\b/i, /\bclients?\b/i, /\bcustomers?\b/i, /\bcase stud/i, /\bproject count\b/i, /\byears of experience\b/i, /\b\d+\+?\s*(projects?|tons?|clients?)\b/i],
    fa: [/تضمین/, /گواهی/, /مشتریان/, /نمونه کار/, /بهترین/, /سریع‌ترین/, /پیشرو/, /سال تجربه/],
    ar: [/ضمان/, /شهادة/, /عملائنا/, /دراسة حالة/, /الأفضل/, /الأسرع/, /رائد/, /سنوات الخبرة/],
  };
  for (const locale of LOCALES) {
    const text = JSON.stringify(homepageCopy[locale].industries);
    for (const shape of forbidden[locale]) {
      assert.ok(!shape.test(text), `${locale}: §10 — the intended service scope must not become a claim matching ${shape}`);
    }
  }
});

test("no customer logo, brand name or badge is rendered (§8, Composition §6.6)", () => {
  assert.ok(!/logo/i.test(COMPONENT), "§8: no visible customer logos");
  assert.ok(!/badge|certification|award|trusted/i.test(COMPONENT), "Composition §6.6: no certification or trust badge");
});

// ---------------------------------------------------------------------------
// Semantics — §9
// ---------------------------------------------------------------------------

test("the section is one aria-labelledby section with one H2 (§9)", () => {
  assert.equal((COMPONENT.match(/<section[\s>]/g) ?? []).length, 1, "exactly one <section>");
  assert.match(COMPONENT, /<section aria-labelledby=\{HEADING_ID\}/, "§9: aria-labelledby pointing at its H2");
  assert.equal((COMPONENT.match(/<h2[\s>]/g) ?? []).length, 1, "exactly one <h2>");
  assert.match(COMPONENT, /<h2 id=\{HEADING_ID\}/, "the H2 must carry the id aria-labelledby names");
  assert.ok(!/<h1[\s>]/.test(COMPONENT), "the single Homepage H1 belongs to the Hero");
});

test("the three sectors are ONE unordered list — never an <ol> (§9)", () => {
  // §9: "one unordered list of three items with H3 headings ... No visible
  // sequential numbers: these are sectors, not steps or a ranking." This is
  // the exact INVERSE of components/home/process.tsx, whose <ol> carries real
  // chronology, and matches buyer-value.tsx.
  assert.equal((COMPONENT.match(/<ul[\s>]/g) ?? []).length, 1, "exactly one <ul>");
  assert.ok(!/<ol[\s>]/.test(COMPONENT), "§9: sectors have no ranking or chronology, so an <ol> would be wrong");
  assert.match(COMPONENT, /<ul role="list"/, "Tailwind Preflight removes list semantics; role=\"list\" restores them");
  assert.match(COMPONENT, /t\.sectors\.map\(/, "the list must be driven by the frozen three-item array");
  assert.equal((COMPONENT.match(/<li[\s>]/g) ?? []).length, 1, "one <li> template, mapped over exactly three sectors");
});

test("each item is image -> H3 -> paragraph, in that order and never overlaid (§6, §9)", () => {
  assert.equal((COMPONENT.match(/<h3[\s>]/g) ?? []).length, 1, "one <h3> per item");
  assert.equal((COMPONENT.match(/<p[\s>]/g) ?? []).length, 1, "one <p> per item");
  const imageAt = COMPONENT.indexOf("<Image");
  const h3At = COMPONENT.indexOf("<h3");
  const pAt = COMPONENT.indexOf("<p ");
  assert.ok(imageAt > -1 && imageAt < h3At, "§6: the image precedes the H3");
  assert.ok(h3At < pAt, "§6: the H3 precedes the body paragraph");
  assert.ok(!/absolute[^"]*\binset-0[^"]*\bz-|\bbg-gradient/.test(COMPONENT), "§6: text is below the imagery, never overlaid on it");
});

test("no visible sequential numbering appears anywhere (§9)", () => {
  // Both sibling editorial components render a decorative 01-04 index; §9
  // forbids one here, so no counterpart module may exist or be imported.
  assert.ok(!/Index\(|tabular-nums|minimumIntegerDigits/.test(COMPONENT), "§9: no decorative index numbers");
  assert.ok(!existsSync(path.join(REPO_ROOT, "lib/content/industries-index.ts")), "no per-sector index helper should have been created");
  assert.ok(!/list-decimal|counter-increment|counter-reset/.test(COMPONENT), "§9: no CSS-generated numbering either");
});

// ---------------------------------------------------------------------------
// Interaction — §9
// ---------------------------------------------------------------------------

test("V1.0 items are purely informational — no link, button, CTA or hover affordance (§9)", () => {
  // §9: "informational, without links, pointer cursor, hover lift, buttons or
  // independent RFQ CTA ... Do not invent routes or link all items to the same
  // generic page."
  for (const forbidden of ["<Link", "<a ", "<button", "href=", "onClick", "cursor-pointer", "hover:", "group-hover:", "<Button"]) {
    assert.ok(!COMPONENT.includes(forbidden), `§9: Industries must not contain \`${forbidden}\``);
  }
  // Route check scoped to the JSX body — the import specifiers above it
  // legitimately contain the substring "/industries" (the module path), so
  // scanning the whole file would be a false positive rather than a finding.
  const jsx = COMPONENT.slice(COMPONENT.indexOf("return ("));
  assert.ok(!/localizedPath|["'`]\/(request|industries|markets|process)["'`]/.test(jsx), "§9: no invented sector route and no generic catch-all link");
  assert.ok(!/tabIndex|role="button"/.test(COMPONENT), "non-interactive items must introduce no keyboard focus stop");
});

test("no motion, no client boundary, and therefore no hydration prerequisite (§9)", () => {
  // §9: "Motion may be omitted ... Content must be visible by default, without
  // hydration or IntersectionObserver success."
  // Checked against the CODE, not the raw file: the doc comment legitimately
  // names `"use client"` in order to record that the directive is absent.
  assert.ok(!/"use client"|'use client'/.test(COMPONENT), "the section is a pure server component");
  assert.ok(!/^\s*["']use client["']/.test(readSource(COMPONENT_PATH)), "and no client directive opens the file");
  assert.ok(!/<Reveal|useEffect|useState|IntersectionObserver/.test(COMPONENT), "no entrance animation and no client-side visibility gate");
  assert.ok(!/opacity-0|animate-/.test(COMPONENT), "§9: nothing may rest at opacity 0 awaiting JavaScript");
});

// ---------------------------------------------------------------------------
// Responsive contract — §7 (structural, not screenshot-based)
// ---------------------------------------------------------------------------

test("desktop is THREE equal columns and narrow is ONE — a 2-column state is structurally unreachable (§7)", () => {
  const gridUtilities = COMPONENT.match(/(?:^|[\s"])((?:[a-z0-9]+:)*grid-cols-\S+)/g) ?? [];
  const normalized = gridUtilities.map((u) => u.trim().replace(/^"/, ""));
  assert.deepEqual(normalized, ["lg:grid-cols-3"], "§7: exactly one column-track utility, so no width can produce two or four tracks");
  assert.match(COMPONENT, /className="[^"]*\bgrid\b/, "the item list is a grid");
  // Below `lg` no grid-cols utility applies at all, so the grid falls back to
  // its single implicit column — §7's "one column with the same image -> H3 ->
  // paragraph order".
  assert.ok(!/\bsm:grid-cols-|\bmd:grid-cols-|\bgrid-cols-2\b/.test(COMPONENT), "§7: no intermediate two-column state at any breakpoint");
});

test("no carousel, horizontal scroll or swipe behavior exists (§7)", () => {
  // §7: "Do not create a ... autoplay carousel or horizontal scrolling."
  for (const forbidden of ["overflow-x", "snap-x", "snap-mandatory", "carousel", "Swiper", "embla", "scrollLeft", "flex-nowrap"]) {
    assert.ok(!COMPONENT.includes(forbidden), `§7: Industries must not contain \`${forbidden}\``);
  }
});

test("no text is truncated and no item height is fixed (§6)", () => {
  for (const forbidden of ["truncate", "line-clamp", "text-ellipsis", "whitespace-nowrap", "h-[", "max-h-"]) {
    assert.ok(!COMPONENT.includes(forbidden), `§6: "without truncation or forced fixed heights" — \`${forbidden}\` is forbidden`);
  }
  assert.ok(!/tracking-/.test(COMPONENT), "§6: no artificial tracking — two of three locales render this text in Persian/Arabic");
  assert.ok(!/<br\s*\/?>/.test(COMPONENT), "§6: no manual line breaks tuned for one locale");
});

test("every axis-sensitive utility is logical, so one component serves RTL and LTR (§2, §6)", () => {
  const physical = COMPONENT.match(/\b(?:[a-z0-9]+:)*(?:ml|mr|pl|pr|left|right|border-l|border-r|text-left|text-right)-\S*/g) ?? [];
  assert.deepEqual(physical, [], "physical left/right utilities would break FA/AR mirroring; use logical ms/me/ps/pe/border-s/border-e");
});

// ---------------------------------------------------------------------------
// Visual surface — §6, Visual System §6.2
// ---------------------------------------------------------------------------

test("the section is a White Content Section inside the shared container (§6)", () => {
  assert.match(COMPONENT, /className="[^"]*\bbg-background\b/, "§6: White #FFFFFF via the existing token");
  assert.match(COMPONENT, /container-x/, "the shared Homepage container/gutter system");
  assert.ok(!/--aa-color-bg-warm/.test(COMPONENT), "§6: Warm Cream belongs to Buyer Value — the two surfaces must differ");
  assert.ok(!/\bbg-navy(-\d+)?\b/.test(COMPONENT), "this is a light Content Section, not a Navy high-emphasis band");
});

test("no outer card, filled item card, strong shadow or Hero grid (§6)", () => {
  assert.ok(!/\bshadow-(?!none)/.test(COMPONENT), "§6: no strong shadows");
  assert.ok(!/engineering-grid|hero-grid/.test(COMPONENT), "§6: the Hero engineering grid is reserved for the Hero");
  // The ONLY radius in the file is the §8-mandated 12px image radius; no item
  // or section wrapper may carry a filled card treatment.
  const rounded = (COMPONENT.match(/\brounded-[a-z0-9-]+/g) ?? []).map((u) => u.trim());
  assert.deepEqual(rounded, ["rounded-xl"], "§6: the only radius is the 12px image radius — no card surfaces");
  assert.ok(!/<li[^>]*className="[^"]*\bbg-/.test(COMPONENT), "§6: no individual filled item card surfaces");
});

test("headings are Steel Navy and body text is the contrast-safe muted token (§6)", () => {
  assert.match(COMPONENT, /<h2[^>]*className="[^"]*\btext-navy\b/, "§6: the H2 is Navy");
  assert.match(COMPONENT, /<h3[^>]*className="[^"]*\btext-navy\b/, "§6: H3s are Navy");
  assert.match(COMPONENT, /<p[^>]*className="[^"]*\btext-muted-foreground\b/, "§6: body is the Navy-derived contrast-checked token");
});

test("section rhythm and internal spacing come from the shared scale (§6)", () => {
  assert.match(COMPONENT, /className="[^"]*\bpy-20 lg:py-28\b/, "the shared Homepage vertical rhythm every sibling section uses");
  assert.match(COMPONENT, /\bmt-9\b[^"]*\blg:mt-12\b/, "§6 H2-to-group 32-48px -> 36/48px");
  assert.match(COMPONENT, /<h3[^>]*\bmt-5\b/, "§6 image-to-H3 16-20px -> 20px");
  assert.match(COMPONENT, /<p[^>]*\bmt-3\b/, "§6 H3-to-body 10-14px -> 12px");
  assert.match(COMPONENT, /\bgap-10\b[^"]*\blg:gap-8\b/, "§7 narrow 32-40px -> 40px; §6 columns 24-32px -> 32px");
  assert.ok(!/\[\d+px\]/.test(COMPONENT.replace(/leading-\[[^\]]+\]|text-\[[^\]]+\]/g, "")), "§6: no one-off arbitrary spacing values");
});

// ---------------------------------------------------------------------------
// Images — §8
// ---------------------------------------------------------------------------

test("the image geometry is 4:3, reserved before load, cover-fit with a 12px radius (§8)", () => {
  assert.match(COMPONENT, /\baspect-4\/3\b/, "§8: common 4:3 aspect ratio");
  assert.match(COMPONENT, /\bobject-cover\b/, "§8: object-fit cover");
  assert.match(COMPONENT, /\brounded-xl\b/, "§8: modest 12px radius");
  assert.match(COMPONENT, /\brelative\b[^"]*\boverflow-hidden\b|\boverflow-hidden\b[^"]*\brelative\b/, "the wrapper reserves geometry and clips the cover fit");
  assert.match(COMPONENT, /\bbg-surface-2\b/, "§8: the quiet neutral fallback tone behind a failed image request");
});

test("images use the existing next/image pipeline, lazily, with responsive sizes (§8)", () => {
  assert.match(readSource(COMPONENT_PATH), /^import Image from "next\/image";$/m, "§8: reuse the established image component — no new library");
  assert.match(COMPONENT, /\bfill\b/, "fill inside the reserved aspect-ratio box");
  assert.match(COMPONENT, /sizes="\(min-width: 1024px\) 31vw, 100vw"/, "responsive sizes matching the 3-column desktop architecture");
  assert.ok(!/\bpriority\b/.test(COMPONENT), "§8: below-fold images lazy-load; priority would be wrong");
});

test("all three images are decorative with empty alt, and no alt is keyword-stuffed (§8)", () => {
  // §8: the images "only illustrate the sectors already named in adjacent
  // headings and add no unique information, use empty alt text ... Never stuff
  // keywords into alt attributes."
  const alts = COMPONENT.match(/alt=\{?"[^"]*"\}?/g) ?? [];
  assert.deepEqual(alts, ['alt=""'], "the single mapped <Image> must carry an empty alt for all three sectors");
});

test("no external image host is referenced anywhere, and no Hero or packshot is reused (§8)", () => {
  for (const source of [COMPONENT, GATE]) {
    assert.ok(!/https?:\/\//.test(source.replace(/^import .*$/gm, "")), "§8: no hotlinked external image URL");
  }
  // §8 by name: "Do not repeat the Hero stockyard image or use
  // product-packshot imagery in all three slots."
  for (const forbidden of ["hero-steel-mill", "hero-steel-procurement", "/images/products/"]) {
    assert.ok(!COMPONENT.includes(forbidden) && !GATE.includes(forbidden), `§8: \`${forbidden}\` must never be used as sector imagery`);
  }
});

// ---------------------------------------------------------------------------
// Publication gate — §10 (the all-or-nothing eligibility contract)
// ---------------------------------------------------------------------------

test("the copy-completeness half of the gate passes in all three locales (§10)", () => {
  for (const locale of LOCALES) {
    assert.equal(isIndustriesCopyComplete(locale), true, `${locale}: complete accurate copy is one of §10's four requirements, and it IS met`);
  }
});

test("CURRENT STATE — no reviewed imagery exists, so the section is correctly ineligible (§8, §10)", () => {
  // This is the honest recorded state, not a placeholder assertion. §8: "Do
  // not ship the component with missing initial image assets; the fallback
  // covers runtime failure." When three provenanced assets are supplied in
  // INDUSTRY_SECTOR_IMAGES this test must be updated deliberately, alongside
  // the licence record §8 requires — that is exactly the review gate intended.
  assert.equal(INDUSTRY_SECTOR_IMAGES.length, INDUSTRIES_SECTOR_COUNT, "the manifest always declares all three slots");
  assert.ok(INDUSTRY_SECTOR_IMAGES.every((image) => image.src === null), "no asset has been approved yet");
  assert.equal(resolveIndustrySectorImages(), null, "the gate must therefore be closed");
});

test("the component omits the ENTIRE semantic section when ineligible — no shell survives (§10)", () => {
  // §10: "Without eligible content omit the entire section cleanly ... Do not
  // display incomplete one-/two-item subsets in V1.0", and the acceptance
  // checklist: "Disabled section leaves no empty heading or unexplained
  // whitespace." Both guards must short-circuit BEFORE any markup exists.
  const guards = [...COMPONENT.matchAll(/return null;/g)].map((m) => m.index ?? -1);
  assert.equal(guards.length, 2, "one guard for imagery, one for locale copy completeness");
  const sectionAt = COMPONENT.indexOf("<section");
  assert.ok(sectionAt > -1, "the component must still render a real section when it IS eligible");
  for (const at of guards) {
    assert.ok(at < sectionAt, "the omission must short-circuit before any <section>, heading or background band");
  }
});

test("the gate is all-or-nothing — a partial or reordered manifest disables the section (§10)", () => {
  const full: IndustrySectorImage[] = [
    { sector: "construction", src: "/images/industries/construction.png" },
    { sector: "petrochemical-oil-gas", src: "/images/industries/petrochemical.png" },
    { sector: "manufacturing-fabrication", src: "/images/industries/fabrication.png" },
  ];
  assert.notEqual(resolveIndustrySectorImages(full), null, "a complete, correctly ordered, local manifest opens the gate");
  assert.equal(resolveIndustrySectorImages(full.slice(0, 2)), null, "two of three is never publishable");
  assert.equal(resolveIndustrySectorImages([full[0], { ...full[1], src: null }, full[2]]), null, "one missing asset disables the whole section, not just its item");
  assert.equal(resolveIndustrySectorImages([full[0], { ...full[1], src: "   " }, full[2]]), null, "a blank string is not an asset");
  assert.equal(resolveIndustrySectorImages([full[1], full[0], full[2]]), null, "§2: a reordered manifest must not silently mispair images with headings");
  assert.equal(resolveIndustrySectorImages([full[0], { ...full[1], src: "https://cdn.example.com/p.jpg" }, full[2]]), null, "§8: an external host is rejected outright");
  assert.equal(resolveIndustrySectorImages([full[0], { ...full[1], src: "//cdn.example.com/p.jpg" }, full[2]]), null, "protocol-relative is still external");
});

// ---------------------------------------------------------------------------
// Data safety — §10, Composition §9
// ---------------------------------------------------------------------------

test("Industries has ZERO Odoo, DB_PUBLIC, Evidence, projection or client-fetch dependency (§10)", () => {
  // §10: "A new Odoo model, 100-record threshold or evidence pipeline is not
  // required for this component. The Evidence threshold applies only to
  // Evidence." Proven structurally by pinning the complete import list.
  const imports = [...readSource(COMPONENT_PATH).matchAll(/^import .*? from "(.+?)";$/gm)].map((m) => m[1]);
  assert.deepEqual(imports.sort(), ["@/config/locales", "@/lib/content/homepage", "@/lib/content/industries", "next/image"], "a pure server component over localized editorial content and a static asset manifest");

  for (const source of [COMPONENT, GATE]) {
    for (const forbidden of ["cloudflare:workers", "DB_PUBLIC", "DB_OPS", "odoo", "Odoo", "evidence", "Evidence", "fetch(", "useEffect", "listHomepageProductCandidates", "catalog", "priceStrip", "migrations_public"]) {
      assert.ok(!source.includes(forbidden), `Industries must not depend on \`${forbidden}\``);
    }
  }
});

test("the gate module is pure — importable by this test with no runtime binding (§10)", () => {
  // If it ever imported `cloudflare:workers` the assertions above could not
  // run at all, which is why the split exists.
  // GATE, not the raw file: the doc comment legitimately names the binding in
  // order to record that the module deliberately does not import it.
  assert.ok(!GATE.includes("cloudflare:workers"), "the eligibility gate must stay pure and directly testable");
  assert.ok(!/process\.env|import\.meta\.env/.test(GATE), "eligibility is content-derived, not read from ambient configuration");
});

test("no hidden crawler-only or agent-only content layer exists in this section", () => {
  assert.ok(!/<noscript[\s>]/.test(COMPONENT), "no <noscript> content duplicate");
  assert.ok(!/dangerouslySetInnerHTML/.test(COMPONENT), "no injected markup");
  assert.ok(!/display:\s*none|visibility:\s*hidden|text-indent:\s*-|sr-only/.test(COMPONENT), "no visually hidden keyword layer");
});

// ---------------------------------------------------------------------------
// Supersession — Composition §8
// ---------------------------------------------------------------------------

test("Reach is superseded for the Homepage but NOTHING of it was deleted (Composition §8)", () => {
  // §8: "Historical specifications and files SHOULD NOT be deleted solely
  // because they are no longer active." Same pattern already applied to
  // Evaluation / Assurance and Purchase Process.
  for (const retained of ["components/home/reach.tsx", "lib/content/pages.ts"]) {
    assert.ok(existsSync(path.join(REPO_ROOT, retained)), `${retained} must NOT be deleted — it is superseded for the Homepage, not retired`);
  }
  for (const locale of LOCALES) {
    const reach = homepageCopy[locale].reach as Record<string, unknown> | undefined;
    assert.ok(reach && typeof reach.title === "string" && (reach.title as string).length > 0, `${locale}: homepageCopy.reach content must survive the supersession`);
  }
  // And the retained component still works — it must not have been gutted.
  assert.match(readCode("components/home/reach.tsx"), /m\.industries\.map/, "the retained Reach component must still render its list");
});
