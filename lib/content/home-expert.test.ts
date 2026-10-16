import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { locales as LOCALES } from "../../config/locales.ts";
import { HOME_EXPERT_LOCATION, homeExpertCopy, homeExpertListHref, homeExpertLiveChat, homeExpertProfile, homeExpertWhatsAppHref, LIVECHAT_ENABLED, LIVECHAT_URL, RFQ_FILES_ANCHOR } from "./home-expert.ts";
import { WHATSAPP_BUSINESS_NUMBER } from "./whatsapp.ts";
import { existsSync } from "node:fs";
import { SALES_EXPERT, WORKING_HOURS, WORKING_HOURS_TEXT } from "./company.ts";
import { isRfqHref, rfqCtaLocation, linkLocation, buildEvent } from "../analytics/events.ts";

/** W20.3 — the homepage «با کارشناس فروش صحبت کنید» section (components/home/expert-contact.tsx). */

const component = readFileSync(new URL("../../components/home/expert-contact.tsx", import.meta.url), "utf8");

test("copy: every locale has the role, headline and every option; fa headline and role as the owner asked", () => {
  for (const locale of LOCALES) {
    const t = homeExpertCopy[locale];
    for (const value of [t.role, t.title, t.body, t.phone.title, t.whatsapp.title, t.whatsapp.greeting, t.list.title, t.list.action, t.hoursTitle]) assert.ok(value.trim().length > 0, locale);
  }
  assert.equal(homeExpertCopy.fa.title, "با کارشناس فروش صحبت کنید");
  assert.equal(homeExpertCopy.fa.role, "کارشناس فروش آهن آسا");
});

test("copy: no response-time promise (none is owner-confirmed) and no checkout wording", () => {
  const all = JSON.stringify(homeExpertCopy).toLowerCase();
  assert.ok(!/[0-9۰-۹٠-٩]/.test(all), "no figure, so no response time can hide in the copy");
  for (const forbidden of ["minute", "within", "immediately", "دقیقه", "ظرف", "فوری", "دقيقة", "فورًا", "checkout", "buy now", "سبد خرید"]) {
    assert.ok(!all.includes(forbidden), `must not contain "${forbidden}"`);
  }
});

test("WhatsApp: the configured number, the locale's greeting prefilled; no link without a valid number", () => {
  for (const locale of LOCALES) {
    const href = homeExpertWhatsAppHref(locale);
    assert.equal(href, `https://wa.me/${WHATSAPP_BUSINESS_NUMBER}?text=${encodeURIComponent(homeExpertCopy[locale].whatsapp.greeting)}`);
  }
  assert.equal(homeExpertWhatsAppHref("fa", null), null);
  assert.equal(homeExpertWhatsAppHref("fa", "0913"), null);
  assert.match(component, /\{whatsappHref && \(/, "the card is not rendered without a link");
});

test("send-list link: the localized /contact RFQ form at its attachments heading, counted as an RFQ link", () => {
  assert.equal(homeExpertListHref("fa"), `/contact#${RFQ_FILES_ANCHOR}`);
  assert.equal(homeExpertListHref("en"), `/en/contact#${RFQ_FILES_ANCHOR}`);
  assert.equal(homeExpertListHref("ar"), `/ar/contact#${RFQ_FILES_ANCHOR}`);
  for (const locale of LOCALES) assert.ok(isRfqHref(homeExpertListHref(locale)));
  const files = readFileSync(new URL("../../components/contact/rfq-files-field.tsx", import.meta.url), "utf8");
  assert.ok(files.includes(`id="${RFQ_FILES_ANCHOR}"`), "the anchor exists on the /contact attachments field");
});

test("analytics: links inside the section report home_expert for phone_click / whatsapp_click / rfq_cta_click", () => {
  const fake = (marks: string[]) => ({ closest: (selector: string) => (marks.some((m) => selector.includes(m)) ? {} : null) }) as unknown as Element;
  const inSection = fake(["data-home-expert", "main"]);
  assert.equal(linkLocation(inSection), HOME_EXPERT_LOCATION);
  assert.equal(rfqCtaLocation(inSection, "/"), HOME_EXPERT_LOCATION);
  assert.equal(linkLocation(fake(["main"])), "main", "other homepage links unchanged");
  assert.equal(rfqCtaLocation(fake(["main"]), "/en"), "home");
  assert.deepEqual(buildEvent("phone_click", { link_location: HOME_EXPERT_LOCATION }), { event: "phone_click", link_location: "home_expert" });
  assert.ok(component.includes("data-home-expert={HOME_EXPERT_LOCATION}"), "the section carries the marker");
});

test("component: tel: from the single phone source, LTR number, hours from company.ts, a role and no person", () => {
  assert.ok(component.includes("href={`tel:${CONTACT_PHONE_E164}`}"));
  assert.match(component, /dir="ltr"[^>]*>\s*\{CONTACT_PHONE_DISPLAY\}/);
  assert.ok(component.includes("WORKING_HOURS_TEXT[locale]"));
  assert.ok(!/<Image|next\/image|"use client"|<Reveal/.test(component), "no client JS, no late-loading content (no CLS)");
  assert.equal((component.match(/<img/g) ?? []).length, 1, "the only image is the optional expert avatar");
  assert.match(component, /\{expert && \(\s*<p[^>]*>[\s\S]*?<img src=\{expert\.src\} width=\{expert\.width\} height=\{expert\.height\}/, "avatar only with a profile, with its own size (no CLS)");
  assert.ok(!/\b(?:ml|mr|pl|pr|left|right)-\d/.test(component), "logical properties only (RTL/LTR)");
  assert.match(component, /rel=\{WHATSAPP_REL\}/);
});

test("ar working hours render in order in RTL: 8:00 before 17:00 and 8:00 before 12:00 (/contact and this section)", () => {
  // The same <ul> both pages render, in an RTL document.
  const html = renderToStaticMarkup(createElement("ul", { dir: "rtl", lang: "ar" }, WORKING_HOURS_TEXT.ar.lines.map((line) => createElement("li", { key: line }, line))));
  const lines = [...html.matchAll(/<li>([^<]*)<\/li>/g)].map((m) => m[1]);
  assert.equal(lines.length, 2);
  const expected = WORKING_HOURS.map((h) => [String(Number(h.opens.slice(0, 2))) + h.opens.slice(2), h.closes]);
  lines.forEach((line, i) => {
    // RTL reads the logical order, as long as each time is its own run between Arabic words: «من 8:00 إلى 17:00».
    // Two times joined only by a dash/space form one run that the bidi algorithm lays out reversed («17:00–8:00»).
    assert.ok(!/\d\s*[–\-—]\s*\d/.test(line), `no dash-joined time range: ${line}`);
    const [opens, closes] = expected[i];
    const between = line.slice(line.indexOf(opens) + opens.length, line.indexOf(closes));
    assert.ok(line.indexOf(opens) > -1 && line.indexOf(opens) < line.indexOf(closes), `${opens} comes before ${closes}: ${line}`);
    assert.match(between, /\p{Script=Arabic}/u, `an Arabic word separates ${opens} and ${closes}: ${line}`);
  });
});

const profile = { photo: { src: "/images/team/sara.webp", width: 240, height: 240 }, firstName: { fa: "سارا", en: "Sara", ar: "سارا" } };

test("expert slot: off by default; shown only with a photo AND a first name (no placeholder person)", () => {
  assert.equal(SALES_EXPERT, null, "default build: no expert configured");
  for (const locale of LOCALES) assert.equal(homeExpertProfile(locale), null);
  assert.deepEqual(homeExpertProfile("fa", profile), { src: "/images/team/sara.webp", width: 240, height: 240, name: "سارا", role: "کارشناس فروش آهن آسا" });
  assert.equal(homeExpertProfile("en", profile)?.role, "Ahan Asa sales expert");
  assert.equal(homeExpertProfile("fa", { ...profile, photo: { ...profile.photo, src: " " } }), null, "no photo file");
  assert.equal(homeExpertProfile("en", { ...profile, firstName: { ...profile.firstName, en: "" } }), null, "no name in this locale");
  assert.equal(homeExpertProfile("fa", { ...profile, photo: { ...profile.photo, width: 0 } }), null, "no size = no reserved box");
});

test("expert slot: a configured photo must be a real file under public/", () => {
  if (!SALES_EXPERT) return;
  assert.match(SALES_EXPERT.photo.src, /^\/[\w./-]+\.(?:webp|jpe?g|png|avif)$/);
  assert.ok(existsSync(new URL(`../../public${SALES_EXPERT.photo.src}`, import.meta.url)), `${SALES_EXPERT.photo.src} must exist in public/`);
});

test("live-chat slot: hidden until LIVECHAT_ENABLED and a URL are both set; label per locale", () => {
  assert.equal(LIVECHAT_ENABLED, false, "W21 turns it on");
  assert.equal(LIVECHAT_URL, null);
  for (const locale of LOCALES) assert.equal(homeExpertLiveChat(locale), null);
  assert.equal(homeExpertLiveChat("fa", true, null), null, "a flag alone renders no dead button");
  assert.equal(homeExpertLiveChat("fa", false, "/chat"), null);
  assert.equal(homeExpertLiveChat("fa", true, "javascript:alert(1)"), null, "https or same-site path only");
  assert.deepEqual(homeExpertLiveChat("fa", true, "/chat"), { href: "/chat", label: "چت با کارشناس" });
  assert.equal(homeExpertLiveChat("en", true, "https://chat.example.test/")?.label, "Chat with an expert");
  assert.match(component, /\{chat && \(/, "the button is not rendered without a chat link");
});

test("default build: with neither slot the heading renders bare, exactly as before the add-on", () => {
  assert.match(component, /\{expert \|\| chat \? \([\s\S]*?\) : \(\s*heading\s*\)\}/);
});
