import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";

/**
 * Contact/RFQ UI requirement recovery — two owner-approved requirements
 * that regressed silently (never actually shipped to production despite
 * being planned earlier in this project's history). Pinned here as
 * source-text invariants, matching this repo's established convention for
 * anything that can't be loaded under plain `node --test` — no React
 * render-testing framework (jsdom/@testing-library/react/vitest) exists in
 * this repository, and `components/contact/enquiry-form.tsx`/
 * `app/[locale]/contact/page.tsx` both transitively depend on
 * Next.js/JSX and (for the page) `cloudflare:workers`, so a behavioral
 * render test is not available here (see
 * `lib/catalog/homepage-source-isolation.test.ts` for the identical
 * reasoning applied to a different pair of files).
 */

const REPO_ROOT = path.resolve(fileURLToPath(new URL(".", import.meta.url)), "../..");

function readSource(relativePath: string): string {
  return readFileSync(path.join(REPO_ROOT, relativePath), "utf8");
}

function extractPhoneFieldsetBlock(source: string): string {
  const legendIdx = source.indexOf("{t.phone}");
  assert.ok(legendIdx >= 0, "could not locate the phone field's legend in enquiry-form.tsx");
  const fieldsetEndIdx = source.indexOf("</fieldset>", legendIdx);
  assert.ok(fieldsetEndIdx >= 0, "could not locate the phone fieldset's closing tag");
  return source.slice(legendIdx, fieldsetEndIdx);
}

// --- Requirement 1: phone control must be LTR in every locale ---

test("phone control: the shared wrapper around the country select and the number input has explicit dir=\"ltr\"", () => {
  const source = readSource("components/contact/enquiry-form.tsx");
  const block = extractPhoneFieldsetBlock(source);
  assert.match(block, /<div dir="ltr" className="flex gap-2">/, "the shared phone-control wrapper must carry an explicit dir=\"ltr\" — inheriting LTR is not enough, the requirement is an explicit attribute");
});

test("phone control: the country <select> itself has explicit dir=\"ltr\", not just inherited from the wrapper", () => {
  const source = readSource("components/contact/enquiry-form.tsx");
  const block = extractPhoneFieldsetBlock(source);
  const selectStart = block.indexOf("<select");
  const selectCloseIdx = block.indexOf("</select>", selectStart);
  assert.ok(selectStart >= 0 && selectCloseIdx > selectStart, "could not locate the phone country <select>...</select> element");
  const selectElement = block.slice(selectStart, selectCloseIdx);
  assert.match(selectElement, /\bdir="ltr"/, "the phone country <select> must carry its own explicit dir=\"ltr\"");
});

test("phone control: the national-number <input> itself has explicit dir=\"ltr\", not just inherited from the wrapper", () => {
  const source = readSource("components/contact/enquiry-form.tsx");
  const block = extractPhoneFieldsetBlock(source);
  const inputStart = block.indexOf('id="phone-local"');
  assert.ok(inputStart >= 0, "could not locate the phone-local input");
  // The <input ...> tag for phone-local — walk back to the opening "<input" and forward to its closing "/>".
  const tagStart = block.lastIndexOf("<input", inputStart);
  const tagEnd = block.indexOf("/>", inputStart);
  const inputTag = block.slice(tagStart, tagEnd + 2);
  assert.match(inputTag, /\bdir="ltr"/, "the phone-local <input> must carry its own explicit dir=\"ltr\"");
});

test("phone control: default country selection logic is untouched — FA defaults to a real country, EN can default to none", () => {
  // Not a behavioral test (no render harness available) — pins that this
  // fix never touched lib/rfq/phone-country-registry.ts, which is where
  // getDefaultPhoneCountry's FA->IR / AR->IQ / EN->null mapping lives.
  const registrySource = readSource("lib/rfq/phone-country-registry.ts");
  assert.match(registrySource, /export function getDefaultPhoneCountry/, "the default-country resolver must still exist, unmodified by this UI-only fix");
});

test("phone control: accessibility fieldset/legend/aria structure is preserved", () => {
  const source = readSource("components/contact/enquiry-form.tsx");
  const block = extractPhoneFieldsetBlock(source);
  assert.match(block, /<legend/, "the phone control must remain inside a <fieldset> with a <legend> (shared accessible context for both controls)");
  assert.match(block, /aria-label=\{`\$\{t\.phone\} — \$\{t\.phoneCountryPlaceholder\}`\}/, "the country select must keep its own distinct aria-label");
  assert.match(block, /aria-label=\{t\.phone\}/, "the number input must keep its own aria-label");
});

// --- Requirement 2: contact page order/width ---

function readContactPageSource(): string {
  return readSource("app/[locale]/contact/page.tsx");
}

test("contact page: the old 7/12 + 5/12 desktop grid architecture is completely absent", () => {
  const source = readContactPageSource();
  assert.ok(!source.includes("lg:grid-cols-12"), "the old 12-column grid class must not remain");
  assert.ok(!source.includes("lg:col-span-7"), "the old 7/12 form-column constraint must not remain");
  assert.ok(!source.includes("lg:col-span-5"), "the old 5/12 aside-column constraint must not remain");
  assert.ok(!source.includes("<aside"), "the old sidebar <aside> element must not remain — Next Steps and Head Office are now their own full-width sections");
});

test("contact page: the RFQ form is not width-constrained by the old collision-fix comment/min-w-0 workaround", () => {
  const source = readContactPageSource();
  assert.ok(!source.includes("Go-Live Readiness RFQ-layout-collision fix"), "the obsolete side-by-side collision comment must be removed, not left describing a layout that no longer exists");
});

test("contact page: EnquiryForm renders inside a plain full-width container-x section, not a fractional grid column", () => {
  const source = readContactPageSource();
  const formIdx = source.indexOf("<EnquiryForm");
  assert.ok(formIdx >= 0);
  // Walk backwards from the EnquiryForm usage to its nearest ancestor <div className="container-x">
  const before = source.slice(0, formIdx);
  const lastContainerX = before.lastIndexOf('<div className="container-x">');
  const lastColSpan7 = before.lastIndexOf("lg:col-span-7");
  assert.ok(lastContainerX >= 0, "EnquiryForm must be inside a container-x div");
  assert.equal(lastColSpan7, -1, "no lg:col-span-7 must precede EnquiryForm in the document");
});

test("contact page: Next Steps precedes Head Office in actual source/DOM order (not merely via CSS)", () => {
  const source = readContactPageSource();
  const nextStepsIdx = source.indexOf("{t.nextTitle}");
  const headOfficeIdx = source.indexOf("{t.officeTitle}");
  assert.ok(nextStepsIdx >= 0, "could not locate the Next Steps heading usage");
  assert.ok(headOfficeIdx >= 0, "could not locate the Head Office heading usage");
  assert.ok(nextStepsIdx < headOfficeIdx, "Next Steps must appear before Head Office in the actual source/DOM order, per the owner-approved page structure");
});

test("contact page: FAQ section still follows the RFQ/Next-Steps/Head-Office sequence", () => {
  const source = readContactPageSource();
  const headOfficeIdx = source.indexOf("{t.officeTitle}");
  const faqIdx = source.indexOf("<FaqSection");
  assert.ok(faqIdx >= 0, "FaqSection must still be rendered");
  assert.ok(headOfficeIdx < faqIdx, "FaqSection must still come after Head Office, preserving the existing overall page order");
});

test("contact page: RFQ, Next Steps, and Head Office are each their own top-level section, in that exact order", () => {
  const source = readContactPageSource();
  const sectionStarts = [...source.matchAll(/<section className="border-border bg-background border-b/g)].map((m) => m.index!);
  assert.equal(sectionStarts.length, 3, "expected exactly three top-level sections (RFQ, Next Steps, Head Office) using this section's styling convention");

  const formIdx = source.indexOf("<EnquiryForm");
  const nextStepsIdx = source.indexOf("{t.nextTitle}");
  const headOfficeIdx = source.indexOf("{t.officeTitle}");

  assert.ok(sectionStarts[0] < formIdx && formIdx < sectionStarts[1], "the RFQ form must be inside the FIRST section");
  assert.ok(sectionStarts[1] < nextStepsIdx && nextStepsIdx < sectionStarts[2], "Next Steps must be inside the SECOND section");
  assert.ok(sectionStarts[2] < headOfficeIdx, "Head Office must be inside the THIRD section");
});
