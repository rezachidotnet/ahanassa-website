import { test } from "node:test";
import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { locales as LOCALES } from "../../config/locales.ts";
import {
  EXPERT_SECTION_VARIANT,
  HOME_EXPERT_LOCATION,
  homeExpertCopy,
  homeExpertListHref,
  homeExpertLiveChat,
  homeExpertProfile,
  homeExpertProofs,
  homeExpertWhatsAppHref,
  LIVECHAT_ENABLED,
  LIVECHAT_URL,
  RFQ_FILES_ANCHOR,
} from "./home-expert.ts";
import { homepageCopy } from "./homepage.ts";
import { WHATSAPP_BUSINESS_NUMBER } from "./whatsapp.ts";
import { SALES_EXPERT, WORKING_HOURS, WORKING_HOURS_TEXT } from "./company.ts";
import { ANALYTICS_EVENTS, buildEvent, expertClickEvent, isRfqHref, linkLocation, rfqCtaLocation } from "../analytics/events.ts";

/** W20.3 — the homepage «با کارشناس فروش صحبت کنید» section (components/home/expert-contact.tsx), redesign A2. */

const component = readFileSync(new URL("../../components/home/expert-contact.tsx", import.meta.url), "utf8");
const island = readFileSync(new URL("../../components/home/expert-open-status.tsx", import.meta.url), "utf8");
const runtime = readFileSync(new URL("../../components/analytics/analytics-runtime.tsx", import.meta.url), "utf8");

/** The source of one inner component (`function Name(` up to the next top-level function). */
const fn = (name: string) => {
  const start = component.indexOf(`function ${name}(`);
  const next = component.indexOf("\nfunction ", start + 1);
  return component.slice(start, next < 0 ? undefined : next);
};

test("variant switch: A by default, A or B only, and both layouts are wired", () => {
  assert.equal(EXPERT_SECTION_VARIANT, "A");
  assert.ok(["A", "B"].includes(EXPERT_SECTION_VARIANT));
  assert.match(component, /variant === "A" \? <ConciergeCard [^>]*\/> : <SplitBand [^>]*\/>/);
  assert.ok(component.includes("data-expert-variant={variant}"));
});

test("copy: every locale has the role, headlines, every action and the status labels; fa as the owner asked", () => {
  for (const locale of LOCALES) {
    const t = homeExpertCopy[locale];
    for (const value of [t.role, t.title, t.bandTitle, t.body, t.phone.title, t.whatsapp.title, t.whatsapp.greeting, t.rfq.title, t.rfq.hint, t.hoursTitle, t.chat, t.status.today, t.status.tomorrow]) assert.ok(value.trim().length > 0, locale);
    assert.ok(t.status.open.includes("{time}") && t.status.closed.includes("{day}") && t.status.closed.includes("{time}"), locale);
    assert.equal(Object.keys(t.status.days).length, 7, locale);
  }
  assert.equal(homeExpertCopy.fa.title, "با کارشناس فروش صحبت کنید");
  assert.equal(homeExpertCopy.fa.role, "کارشناس فروش آهن آسا");
  assert.equal(homeExpertCopy.fa.rfq.title, "ارسال فاکتور یا لیست خرید", "the approved primary CTA label (CTA_STRATEGY §4)");
});

test("copy: no response-time promise (none is owner-confirmed) and no checkout wording", () => {
  const all = JSON.stringify(homeExpertCopy).toLowerCase();
  assert.ok(!/[0-9۰-۹٠-٩]/.test(all), "no figure, so no response time can hide in the copy");
  for (const forbidden of ["minute", "within", "immediately", "دقیقه", "ظرف", "فوری", "دقيقة", "فورًا", "checkout", "buy now", "سبد خرید"]) {
    assert.ok(!all.includes(forbidden), `must not contain "${forbidden}"`);
  }
});

test("B proof points: verbatim approved homepage copy, never a new claim or a figure", () => {
  for (const locale of LOCALES) {
    const home = homepageCopy[locale];
    const proofs = homeExpertProofs(locale);
    assert.equal(proofs.length, 3);
    const approved = [...home.buyerValue.promises.map((p) => p.title), home.hero.reassurance];
    for (const proof of proofs) assert.ok(approved.includes(proof), `${locale}: «${proof}» must be approved homepage copy`);
    assert.ok(!/[0-9۰-۹٠-٩%]/.test(proofs.join(" ")), `${locale}: no statistic`);
  }
});

test("WhatsApp: the configured number (989134222795), the locale's greeting prefilled; no link without a valid number", () => {
  assert.equal(WHATSAPP_BUSINESS_NUMBER, "989134222795");
  for (const locale of LOCALES) {
    assert.equal(homeExpertWhatsAppHref(locale), `https://wa.me/989134222795?text=${encodeURIComponent(homeExpertCopy[locale].whatsapp.greeting)}`);
  }
  assert.equal(homeExpertWhatsAppHref("fa", null), null);
  assert.equal(homeExpertWhatsAppHref("fa", "0913"), null);
  for (const name of ["ConciergeCard", "SplitBand"]) assert.match(fn(name), /\{actions\.whatsapp && \(/, `${name}: no WhatsApp action without a link`);
});

test("RFQ: the localized /contact form at its attachments heading, counted as an RFQ link, and the ONE primary action in both layouts", () => {
  assert.equal(homeExpertListHref("fa"), `/contact#${RFQ_FILES_ANCHOR}`);
  assert.equal(homeExpertListHref("en"), `/en/contact#${RFQ_FILES_ANCHOR}`);
  assert.equal(homeExpertListHref("ar"), `/ar/contact#${RFQ_FILES_ANCHOR}`);
  for (const locale of LOCALES) assert.ok(isRfqHref(homeExpertListHref(locale)));
  const files = readFileSync(new URL("../../components/contact/rfq-files-field.tsx", import.meta.url), "utf8");
  assert.ok(files.includes(`id="${RFQ_FILES_ANCHOR}"`), "the anchor exists on the /contact attachments field");
  // A: the navy tile is the RFQ; B: the only primary button is the RFQ.
  assert.match(fn("ConciergeCard"), /href=\{actions\.rfq\} data-expert-action="rfq" className=\{cn\(tile, "bg-navy/);
  assert.equal((fn("ConciergeCard").match(/bg-navy/g) ?? []).length, 1, "A: one navy (primary) tile");
  assert.equal((fn("SplitBand").match(/variant="primary"/g) ?? []).length, 1, "B: one primary button");
  assert.match(fn("SplitBand"), /<ButtonLink href=\{actions\.rfq\} data-expert-action="rfq" variant="primary"/);
  assert.ok(!/variant(?:=|: )"primary"/.test(fn("ChatButton")), "live chat is secondary");
});

test("analytics: expert_* events per action with expert_variant, on top of the home_expert site-wide events", () => {
  for (const name of ["expert_call_click", "expert_whatsapp_click", "expert_rfq_click", "expert_chat_click"] as const) {
    assert.deepEqual(ANALYTICS_EVENTS[name], ["expert_variant"]);
  }
  assert.equal(expertClickEvent("call"), "expert_call_click");
  assert.equal(expertClickEvent("whatsapp"), "expert_whatsapp_click");
  assert.equal(expertClickEvent("rfq"), "expert_rfq_click");
  assert.equal(expertClickEvent("chat"), "expert_chat_click");
  for (const other of [null, undefined, "", "constructor", "toString", "email"]) assert.equal(expertClickEvent(other), null, String(other));
  assert.deepEqual(buildEvent("expert_rfq_click", { expert_variant: "A" }), { event: "expert_rfq_click", expert_variant: "A" });
  // Every action in both layouts is marked; the runtime reads the marker and the section's variant.
  for (const action of ["call", "whatsapp", "rfq"]) {
    for (const name of ["ConciergeCard", "SplitBand"]) assert.ok(fn(name).includes(`data-expert-action="${action}"`), `${name}: ${action}`);
  }
  assert.ok(fn("ChatButton").includes('data-expert-action="chat"'));
  assert.match(runtime, /expertClickEvent\(link\.getAttribute\("data-expert-action"\)\)/);
  assert.match(runtime, /closest\("\[data-expert-variant\]"\)/);
  // The A1 events keep counting the section.
  const fake = (marks: string[]) => ({ closest: (selector: string) => (marks.some((m) => selector.includes(m)) ? {} : null) }) as unknown as Element;
  const inSection = fake(["data-home-expert", "main"]);
  assert.equal(linkLocation(inSection), HOME_EXPERT_LOCATION);
  assert.equal(rfqCtaLocation(inSection, "/"), HOME_EXPERT_LOCATION);
  assert.equal(linkLocation(fake(["main"])), "main", "other homepage links unchanged");
  assert.ok(component.includes("data-home-expert={HOME_EXPERT_LOCATION}"), "the section carries the marker");
});

test("component: tel: from the single phone source, LTR number, hours from company.ts, logical properties, safe new-tab link", () => {
  assert.equal((component.match(/href=\{`tel:\$\{CONTACT_PHONE_E164\}`\}/g) ?? []).length, 2, "one tel: action per layout");
  assert.equal((component.match(/dir="ltr"[^>]*>\s*\{CONTACT_PHONE_DISPLAY\}/g) ?? []).length, 2);
  assert.ok(component.includes("WORKING_HOURS_TEXT[locale]") && component.includes("hours={WORKING_HOURS}"));
  assert.ok(!/\b(?:ml|mr|pl|pr|left|right)-\d/.test(component), "logical properties only (RTL/LTR)");
  assert.equal((component.match(/rel=\{WHATSAPP_REL\}/g) ?? []).length, 2);
  assert.ok(!/<Image|next\/image|"use client"/.test(component), "the section itself is a server component");
});

test("motion and CLS: shared never-hiding Reveal, reduced-motion safe; the open-now line is the only client JS and has a reserved box", () => {
  assert.ok(island.startsWith('"use client";'));
  assert.match(island, /useState<OpenState \| null>\(null\)/, "server and first client render match (empty)");
  assert.match(island, /<p data-expert-open-status className=\{cn\("flex min-h-8 items-center"/, "fixed-height reserved box");
  assert.match(island, /min-h-8/);
  assert.match(island, /motion-safe:animate-/, "the fade only without reduced motion");
  assert.ok(!/import .* from "@\/lib\/content\/(?:home-expert|homepage|company)"/.test(island), "the island never pulls the copy modules into the bundle");
  assert.ok(component.includes('import { Reveal } from "@/components/ui/reveal"'));
  assert.match(component, /motion-reduce:hover:translate-y-0/, "no hover lift under reduced motion");
});

test("ar working hours render in order in RTL: 8:00 before 17:00 and 8:00 before 12:00 (/contact and this section)", () => {
  const html = renderToStaticMarkup(createElement("ul", { dir: "rtl", lang: "ar" }, WORKING_HOURS_TEXT.ar.lines.map((line) => createElement("li", { key: line }, line))));
  const lines = [...html.matchAll(/<li>([^<]*)<\/li>/g)].map((m) => m[1]);
  assert.equal(lines.length, 2);
  assert.equal(lines[0], "من السبت إلى الأربعاء، من 8:00 إلى 17:00");
  const expected = WORKING_HOURS.map((h) => [String(Number(h.opens.slice(0, 2))) + h.opens.slice(2), h.closes]);
  lines.forEach((line, i) => {
    // RTL reads the logical order, as long as each time is its own run between Arabic words: «من 8:00 إلى 17:00».
    assert.ok(!/\d\s*[–\-—]\s*\d/.test(line), `no dash-joined time range: ${line}`);
    const [opens, closes] = expected[i];
    const between = line.slice(line.indexOf(opens) + opens.length, line.indexOf(closes));
    assert.ok(line.indexOf(opens) > -1 && line.indexOf(opens) < line.indexOf(closes), `${opens} comes before ${closes}: ${line}`);
    assert.match(between, /\p{Script=Arabic}/u, `an Arabic word separates ${opens} and ${closes}: ${line}`);
  });
});

const profile = { photo: { src: "/images/team/sara.webp", width: 240, height: 240 }, firstName: { fa: "سارا", en: "Sara", ar: "سارا" } };

test("expert photo: null by default, so no avatar in either layout; shown only with a photo AND a first name", () => {
  assert.equal(SALES_EXPERT, null, "default build: no expert configured");
  for (const locale of LOCALES) assert.equal(homeExpertProfile(locale), null);
  assert.deepEqual(homeExpertProfile("fa", profile), { src: "/images/team/sara.webp", width: 240, height: 240, name: "سارا", role: "کارشناس فروش آهن آسا" });
  assert.equal(homeExpertProfile("en", profile)?.role, "Ahan Asa sales expert");
  assert.equal(homeExpertProfile("fa", { ...profile, photo: { ...profile.photo, src: " " } }), null, "no photo file");
  assert.equal(homeExpertProfile("en", { ...profile, firstName: { ...profile.firstName, en: "" } }), null, "no name in this locale");
  assert.equal(homeExpertProfile("fa", { ...profile, photo: { ...profile.photo, width: 0 } }), null, "no size = no reserved box");
  // A null profile renders the role eyebrow instead (A) and no image (B); the only <img> is the Avatar.
  assert.match(fn("ConciergeCard"), /\{expert \? <ExpertBadge expert=\{expert\} \/> : <Eyebrow>\{t\.role\}<\/Eyebrow>\}/);
  assert.match(fn("SplitBand"), /\{expert && <Avatar /);
  assert.equal((component.match(/<img/g) ?? []).length, 1);
  assert.match(fn("Avatar"), /<img src=\{expert\.src\} width=\{expert\.width\} height=\{expert\.height\} alt=""/);
});

test("expert photo: a configured photo must be a real file under public/", () => {
  if (!SALES_EXPERT) return;
  assert.match(SALES_EXPERT.photo.src, /^\/[\w./-]+\.(?:webp|jpe?g|png|avif)$/);
  assert.ok(existsSync(new URL(`../../public${SALES_EXPERT.photo.src}`, import.meta.url)), `${SALES_EXPERT.photo.src} must exist in public/`);
});

test("live chat: hidden until LIVECHAT_ENABLED and a URL are both set; no dead button in either layout", () => {
  assert.equal(LIVECHAT_ENABLED, false, "W21 turns it on");
  assert.equal(LIVECHAT_URL, null);
  for (const locale of LOCALES) assert.equal(homeExpertLiveChat(locale), null);
  assert.equal(homeExpertLiveChat("fa", true, null), null, "a flag alone renders no dead button");
  assert.equal(homeExpertLiveChat("fa", false, "/chat"), null);
  assert.equal(homeExpertLiveChat("fa", true, "javascript:alert(1)"), null, "https or same-site path only");
  assert.deepEqual(homeExpertLiveChat("fa", true, "/chat"), { href: "/chat", label: "چت با کارشناس" });
  assert.equal(homeExpertLiveChat("en", true, "https://chat.example.test/")?.label, "Chat with an expert");
  for (const name of ["ConciergeCard", "SplitBand"]) assert.match(fn(name), /\{actions\.chat && <ChatButton chat=\{actions\.chat\}/, name);
});
