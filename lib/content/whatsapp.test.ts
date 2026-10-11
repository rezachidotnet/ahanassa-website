import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { WhatsAppDrawingsLink } from "../../components/contact/whatsapp-drawings-link.ts";
import { isValidWhatsAppNumber, WHATSAPP_BUSINESS_NUMBER, whatsappDrawingsHref, whatsappMessage } from "./whatsapp.ts";
import { scanPublicFile } from "../static/leak-scan.ts";

// Owner decision 2026-10-04 (§19 item 5): drawings via WhatsApp. Synthetic test number only.
const NUMBER = "989000000000";
const REF = "AA-RFQ-5E26C1MF";
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const render = (props: Parameters<typeof WhatsAppDrawingsLink>[0]) => renderToStaticMarkup(createElement(WhatsAppDrawingsLink, props));

test("number format: international digits only; anything else renders nothing (never a placeholder)", () => {
  for (const ok of [NUMBER, "12025550123"]) assert.ok(isValidWhatsAppNumber(ok), ok);
  for (const bad of [null, undefined, "", "+989000000000", "09120000000", "98 900 000 0000", "<number>", "1234567"]) {
    assert.equal(isValidWhatsAppNumber(bad), false, String(bad));
    // undefined selects the configured default, so it is checked for validity only.
    if (bad !== undefined) assert.equal(whatsappDrawingsHref("fa", REF, bad), null);
  }
});

test("without a number nothing is rendered, on /contact and in the confirmation", () => {
  for (const locale of ["fa", "en", "ar"] as const) {
    assert.equal(render({ locale, number: null }), "");
    assert.equal(render({ locale, reference: REF, number: null }), "");
  }
  // The repository default: rendered only once the owner's number is configured.
  if (!isValidWhatsAppNumber(WHATSAPP_BUSINESS_NUMBER)) assert.equal(render({ locale: "en" }), "");
});

test("the configured number is the owner's (2026-10-05) and is rendered by default", () => {
  assert.equal(WHATSAPP_BUSINESS_NUMBER, "989134222795");
  assert.match(render({ locale: "fa" }), /href="https:\/\/wa\.me\/989134222795\?text=/);
});

test("with a number: a plain wa.me link, rel noopener, no script, no tracking", () => {
  const html = render({ locale: "en", number: NUMBER });
  assert.match(html, /^<p [^>]*><a href="https:\/\/wa\.me\/989000000000\?text=[^"]+" target="_blank" rel="noopener noreferrer"[^>]*>Send drawings via WhatsApp<\/a>/);
  assert.doesNotMatch(html, /<script|utm_|onclick/i);
  const href = /href="([^"]+)"/.exec(html)![1].replace(/&amp;/g, "&");
  assert.deepEqual([...new URL(href).searchParams.keys()], ["text"], "only the prefilled text");
});

test("prefilled text per locale; the confirmation carries the tracking number", () => {
  const text = (locale: "fa" | "en" | "ar", reference?: string) => new URL(whatsappDrawingsHref(locale, reference, NUMBER)!).searchParams.get("text")!;
  assert.equal(text("en", REF), `Hello. I am sending the drawings and files for request ${REF}.`);
  assert.equal(text("fa", REF), `سلام. نقشه و فایل‌های درخواست ${REF} را می‌فرستم.`);
  assert.equal(text("ar", REF), `مرحبًا. أرسل المخططات والملفات الخاصة بالطلب ${REF}.`);
  for (const locale of ["fa", "en", "ar"] as const) {
    assert.ok(text(locale, REF).includes(REF));
    assert.equal(text(locale), whatsappMessage(locale), "/contact: general text, no reference yet");
    assert.ok(!text(locale).includes("AA-RFQ"));
  }
  assert.match(render({ locale: "ar", reference: REF, number: NUMBER }), /data-whatsapp-drawings="confirmation"/);
});

test("the leak scan accepts the rendered link on every locale (no Persian on en/ar, no foreign contact)", () => {
  for (const locale of ["fa", "en", "ar"] as const) {
    const file = locale === "fa" ? "contact.html" : `${locale}/contact.html`;
    for (const reference of [undefined, REF]) assert.deepEqual(scanPublicFile(file, `<html lang="${locale}"><body>${render({ locale, reference, number: NUMBER })}</body></html>`, [NUMBER]), [], `${locale} ${reference ?? ""}`);
  }
});

test("wired on /contact (server-rendered, works without JS); not in the RFQ success panel (owner, W10.3)", () => {
  const page = fs.readFileSync(path.join(ROOT, "app/[locale]/contact/page.tsx"), "utf8");
  assert.match(page, /<WhatsAppDrawingsLink locale=\{locale\} className="mt-6 max-w-2xl" \/>/);
  const form = fs.readFileSync(path.join(ROOT, "components/contact/enquiry-form.tsx"), "utf8");
  // W10.3 (owner 2026-10-09): the success panel shows only the number, copy, one next-step line and a home link.
  assert.doesNotMatch(form, /WhatsAppDrawingsLink/);
  assert.doesNotMatch(fs.readFileSync(path.join(ROOT, "components/contact/rfq-success-panel.ts"), "utf8"), /WhatsApp/);
  // One source for the number; the same value on both build targets (r4 diff gate unchanged).
  assert.doesNotMatch(fs.readFileSync(path.join(ROOT, "lib/static/targets.ts"), "utf8"), /whatsapp/i);
});
