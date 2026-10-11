import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { RfqSuccessPanel, RFQ_SUCCESS_COPY, RFQ_SUBMITTED_ATTR, RFQ_HIDE_ON_SUCCESS_ATTR } from "./rfq-success-panel.ts";

/** W10.3 item 4 — after a successful RFQ only the tracking-number panel is left on the request page. */

const REPO_ROOT = path.resolve(fileURLToPath(new URL(".", import.meta.url)), "../..");
const read = (p: string) => readFileSync(path.join(REPO_ROOT, p), "utf8");
const REF = "RFQ-2026-000123";
const LOCALES = ["fa", "en", "ar"] as const;
const HOME = { fa: "/", en: "/en", ar: "/ar" } as const;
const render = (locale: (typeof LOCALES)[number], copied = false) => renderToStaticMarkup(createElement(RfqSuccessPanel, { locale, reference: REF, copied }));
const count = (html: string, re: RegExp) => (html.match(re) ?? []).length;

test("the panel: title, the tracking number (LTR, prominent), one copy button, one next-step line, one link home — nothing else", () => {
  for (const locale of LOCALES) {
    const t = RFQ_SUCCESS_COPY[locale];
    const html = render(locale);
    assert.match(html, new RegExp(`<h2 tabindex="-1"[^>]*>${t.title}</h2>`), locale);
    assert.match(html, new RegExp(`<p dir="ltr"[^>]*class="[^"]*text-3xl[^"]*"[^>]*>${REF}</p>`), `${locale}: the number is prominent and reads left-to-right`);
    assert.match(html, new RegExp(`>${t.referenceLabel}</p>`));
    assert.equal(count(html, /<button /g), 1, `${locale}: exactly one button (copy)`);
    assert.match(html, new RegExp(`<button type="button"[^>]*>${t.copy}</button>`));
    assert.equal(count(html, /<a /g), 1, `${locale}: exactly one link`);
    assert.match(html, new RegExp(`<a href="${HOME[locale]}"[^>]*>${t.home}</a>`), `${locale}: the link goes home`);
    assert.ok(html.includes(t.nextStep));
    for (const forbidden of [/<form/, /<input/, /<select/, /<textarea/, /data-whatsapp-drawings/, /wa\.me/]) assert.doesNotMatch(html, forbidden, `${locale}: ${forbidden}`);
  }
});

test("the copy button confirms with a status message", () => {
  for (const locale of LOCALES) {
    const t = RFQ_SUCCESS_COPY[locale];
    assert.match(render(locale), /<span role="status" class="sr-only"><\/span>/);
    const html = render(locale, true);
    assert.match(html, new RegExp(`<button type="button"[^>]*>${t.copied}</button>`));
    assert.match(html, new RegExp(`<span role="status" class="sr-only">${t.copied}</span>`));
  }
});

test("no Persian text in the en/ar copy, no Latin-only fa copy", () => {
  for (const value of Object.values(RFQ_SUCCESS_COPY.en)) assert.doesNotMatch(value, /[؀-ۿ]/);
  for (const value of Object.values(RFQ_SUCCESS_COPY.ar)) assert.doesNotMatch(value, /[پچژگک]/, "Arabic copy must not use Persian-only letters");
  for (const value of Object.values(RFQ_SUCCESS_COPY.fa)) assert.match(value, /[؀-ۿ]/);
});

test("EnquiryForm: the success branch renders only the panel and hides the rest of the page; the error path is unchanged", () => {
  const form = read("components/contact/enquiry-form.tsx");
  const branch = form.slice(form.indexOf('if (status === "success" && reference) {'), form.indexOf("const submitting = status"));
  assert.match(branch, /^if \(status === "success" && reference\) \{\n\s*return <RfqSuccessPanel locale=\{locale\} reference=\{reference\} copied=\{referenceCopied\} onCopy=\{copyReference\} headingRef=\{successHeadingRef\} \/>;\n\s*\}/);
  assert.match(form, /root\.setAttribute\(RFQ_SUBMITTED_ATTR, ""\)/);
  assert.match(form, /return \(\) => \{\n\s*root\.removeAttribute\(RFQ_SUBMITTED_ATTR\);/, "removed on unmount");
  // Error path: still the inline alert under the form, the form stays on screen.
  assert.match(form, /\{status === "error" && errorMessage && errorRowEntries\.length === 0 && \(\n\s*<p role="alert"/);
  assert.doesNotMatch(form.slice(form.indexOf("async function handleSubmit"), form.indexOf("function startNewRequest")), /RFQ_SUBMITTED_ATTR|setAttribute/);
});

test("the contact page marks every part except the form, and the CSS hides them only in the success state", () => {
  assert.equal(RFQ_SUBMITTED_ATTR, "data-rfq-submitted");
  assert.equal(RFQ_HIDE_ON_SUCCESS_ATTR, "data-rfq-hide-on-success");
  const page = read("app/[locale]/contact/page.tsx");
  const jsx = page.slice(page.indexOf("return (", page.indexOf("export default async function ContactPage")));
  assert.equal(count(jsx, /data-rfq-hide-on-success=""/g), 5, "hero, form heading + WhatsApp line, next steps, head office, FAQ");
  assert.match(jsx, /<div data-rfq-hide-on-success="">\n\s*<PageHero /);
  assert.match(jsx, /<div data-rfq-hide-on-success="" className="mb-12">\n\s*<SectionHeading [^]*?<WhatsAppDrawingsLink [^]*?<\/div>\n\s*<TargetEnquiryForm locale=\{locale\} \/>/);
  assert.match(jsx, /<div data-rfq-hide-on-success="">\n\s*<FaqSection /);
  const css = read("styles/theme-extensions.css");
  assert.match(css, /\[data-rfq-submitted\] \[data-rfq-hide-on-success\] \{\n\s*display: none;\n\s*\}/);
});
