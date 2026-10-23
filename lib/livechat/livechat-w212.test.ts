import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { locales } from "../../config/locales.ts";
import { LIVECHAT_ENABLED, LIVECHAT_FRAME_URL, LIVECHAT_FRAME_URL_PATTERN, LIVECHAT_ORIGIN, LIVECHAT_PAGE_ORIGIN, LIVECHAT_STATUS_TIMEOUT_MS, LIVECHAT_TIMEOUT_MS, livechatConfig, livechatFrameOrigin, livechatFrameUrl } from "../../config/livechat.ts";
import { buildCspReportOnly, buildSecurityHeaders } from "../security/headers.ts";
import { buildHeadersFile } from "../static/static-rules.ts";
import { STATIC_TARGETS } from "../static/targets.ts";
import { hasStickyLivechat, livechatCopy, livechatProps } from "../content/livechat.ts";
import { WORKING_HOURS } from "../content/company.ts";
import { ANALYTICS_EVENTS } from "../analytics/events.ts";
import { buildLivechatEvent, LIVECHAT_EVENTS } from "./events.ts";
import { LIVECHAT_FRAME_EVENTS, LIVECHAT_FRAME_SOURCE, LIVECHAT_STATUS_TYPE, livechatFrameEvent, livechatStatusMessage } from "./frame-events.ts";
import { ARTICLE_SCROLL_SHARE, isTeaserDwellPage, productPageSlug, stickyLivechatMode, TEASER_DWELL_MS } from "./placement.ts";

/** W21.2 — the website side of the Odoo live chat: an iframe panel opened by a click. W21.3 switched config/livechat.ts ON (channel 2). */

const read = (p: string) => readFileSync(new URL(`../../${p}`, import.meta.url), "utf8");
const FRAME = "https://odoo.ahanassa.com/im_livechat/support/2";
const ON = livechatConfig(true, FRAME)!;
const directives = (csp: string) => Object.fromEntries(csp.split("; ").map((d) => [d.split(" ")[0], d.split(" ").slice(1)]));
const button = read("components/livechat/livechat-button.tsx");

test("config: ships ON (W21.3, channel 2); on only with the flag AND a frame URL matching §6 (https://odoo.ahanassa.com/im_livechat/support/<id>)", () => {
  assert.equal(LIVECHAT_ENABLED, true, "W21.3: on, Odoo W21.1 channel 2 is live");
  assert.equal(LIVECHAT_FRAME_URL, FRAME, "the production channel's support page (channel_sales = 2)");
  assert.equal(String(LIVECHAT_FRAME_URL_PATTERN), String(/^https:\/\/odoo\.ahanassa\.com\/im_livechat\/support\/(\d+)$/), "the §6 pattern (the channel id captured)");
  assert.equal(LIVECHAT_STATUS_TIMEOUT_MS, 5000, "§6.3: the status frame goes after ~5 s without a message");
  assert.deepEqual(livechatConfig(), ON, "the shipped config is exactly channel 2");
  assert.equal(LIVECHAT_ORIGIN, "https://odoo.ahanassa.com");
  assert.equal(LIVECHAT_PAGE_ORIGIN, "https://www.ahanassa.com");
  assert.equal(LIVECHAT_TIMEOUT_MS, 18_000, "W21.3: a cold first load per language takes 9–15 s on Odoo");
  assert.deepEqual(ON, { origin: "https://odoo.ahanassa.com", supportUrl: "https://odoo.ahanassa.com/im_livechat/support/2", statusUrl: "https://odoo.ahanassa.com/im_livechat/status/2" });
  assert.equal(livechatConfig(true, null), null, "a flag alone");
  assert.equal(livechatConfig(false, FRAME), null, "a URL alone");
  for (const bad of ["http://odoo.ahanassa.com/im_livechat/support/2", "https://odoo.ahanassa.com/im_livechat/support/x", "https://odoo.ahanassa.com/im_livechat/support/2?lang=fa", "https://odoo.ahanassa.com/im_livechat/support/2/", "https://odoo.ahanassa.com.evil.example/im_livechat/support/2", "https://evil.example/im_livechat/support/2", "https://odoo.ahanassa.com/im_livechat/loader/2", "https://u:p@odoo.ahanassa.com/im_livechat/support/2", "/im_livechat/support/2"]) assert.equal(livechatConfig(true, bad), null, bad);
  assert.equal(LIVECHAT_ORIGIN, "https://odoo.ahanassa.com");
  // §6.3: the status page is the frame URL's channel id on /im_livechat/status/.
  assert.equal(livechatConfig(true, "https://odoo.ahanassa.com/im_livechat/support/17")!.statusUrl, "https://odoo.ahanassa.com/im_livechat/status/17");
  assert.equal(livechatFrameOrigin(ON), "https://odoo.ahanassa.com");
  assert.equal(livechatFrameOrigin(), "https://odoo.ahanassa.com", "shipped ON");
  assert.equal(livechatFrameOrigin(null), null, "off: no frame origin");
});

test("iframe URL: /im_livechat/support/<id>?lang=<locale>&page=<encoded https page URL>", () => {
  assert.equal(livechatFrameUrl(ON, "fa", "https://www.ahanassa.com/prices/rebar"), "https://odoo.ahanassa.com/im_livechat/support/2?lang=fa&page=https%3A%2F%2Fwww.ahanassa.com%2Fprices%2Frebar");
  assert.equal(livechatFrameUrl(ON, "ar", "https://www.ahanassa.com/ar"), "https://odoo.ahanassa.com/im_livechat/support/2?lang=ar&page=https%3A%2F%2Fwww.ahanassa.com%2Far");
  // The page URL: the site's own https origin, else the canonical https origin; never a query string or hash.
  assert.match(button, /function pageUrl\(pageOrigin: string\): string \{\n  return `\$\{location\.protocol === "https:" \? location\.origin : pageOrigin\}\$\{location\.pathname\}`;/);
  assert.equal(livechatProps("fa", ON)!.pageOrigin, "https://www.ahanassa.com");
  assert.doesNotMatch(button, /http:\/\//);
});

test("CSP OFF: no Odoo origin anywhere in the policy", () => {
  assert.doesNotMatch(buildCspReportOnly(["https://api.ahanassa.com"], null), /odoo/);
});

test("CSP shipped ON (W21.3): the policy and both targets' static _headers name odoo.ahanassa.com in frame-src only", () => {
  const frameSrc = ["'self'", "https://challenges.cloudflare.com", "https://www.openstreetmap.org", "https://odoo.ahanassa.com"];
  const shipped = directives(buildCspReportOnly(["https://api.ahanassa.com"]));
  assert.deepEqual(shipped["frame-src"], frameSrc);
  for (const [d, values] of Object.entries(shipped)) if (d !== "frame-src") assert.ok(!values.some((v: string) => /odoo/.test(v)), d);
  for (const [name, value] of buildSecurityHeaders(["https://api.ahanassa.com"])) if (name !== "Content-Security-Policy-Report-Only") assert.doesNotMatch(value, /odoo/, name);
  for (const env of ["staging", "production"] as const) {
    const file = buildHeadersFile(env, STATIC_TARGETS[env].rfqApiOrigin);
    const csp = /Content-Security-Policy-Report-Only: (.*)/.exec(file)![1];
    assert.deepEqual(directives(csp)["frame-src"], frameSrc, env);
    assert.equal(file.match(/odoo/gi)?.length, 1, `${env}: odoo.ahanassa.com once, in frame-src`);
  }
});

test("CSP ON: frame-src https://odoo.ahanassa.com — and nothing else changes (no script/style/img/font/connect, no 'unsafe-eval')", () => {
  const on = directives(buildCspReportOnly(["https://api.ahanassa.com"], livechatFrameOrigin(ON)));
  const off = directives(buildCspReportOnly(["https://api.ahanassa.com"], null));
  assert.deepEqual(on["frame-src"], [...off["frame-src"], "https://odoo.ahanassa.com"]);
  for (const d of Object.keys(off)) if (d !== "frame-src") assert.deepEqual(on[d], off[d], d);
  assert.deepEqual(Object.keys(on), Object.keys(off));
  assert.ok(!Object.values(on).flat().includes("'unsafe-eval'"));
  assert.ok(!Object.values(on).flat().some((v) => /^(?:wss?|http):|wss:\/\/odoo/.test(v)));
  // The artifact gate's exact connect-src check is unchanged: live chat adds no connection.
  assert.doesNotMatch(read("lib/static/artifact-gate.ts"), /livechat/i);
});

test("placement: expert-section button in every locale; floating button on fa only; nothing while off", () => {
  for (const locale of locales) {
    assert.deepEqual(livechatProps(locale), livechatProps(locale, ON), `${locale}: shipped ON (W21.3)`);
    assert.equal(livechatProps(locale, null), null, `${locale}: off`);
  }
  assert.equal(hasStickyLivechat("fa"), true);
  assert.equal(hasStickyLivechat("en"), false);
  assert.equal(hasStickyLivechat("ar"), false);
  const fa = livechatProps("fa", ON)!;
  assert.equal(fa.timeoutMs, 18_000);
  assert.equal(fa.rfqHref, "/contact");
  assert.equal(livechatProps("ar", ON)!.rfqHref, "/ar/contact");
  assert.match(fa.whatsappHref ?? "", /^https:\/\/wa\.me\/\d+\?text=/);
  assert.equal(fa.hours, WORKING_HOURS, "the same Tehran sales hours as W21.1's channel calendar");
  // One panel per page (the layout), for every locale; the floating button on fa; the WhatsApp button untouched.
  const layout = read("app/[locale]/layout.tsx");
  assert.match(layout, /<StickyWhatsApp locale=\{locale\} \/>[\s\S]*<SiteLivechat locale=\{locale\} \/>/);
  const site = read("components/livechat/site-livechat.tsx");
  assert.match(site, /if \(!chat\) return null;/);
  assert.match(site, /\{hasStickyLivechat\(locale\) && <LivechatButton chat=\{chat\} variant="floating" \/>\}\n      <LivechatHost chat=\{chat\} \/>/);
});

test("floating button rules: home after the hero / not beside the expert section, /contact never, articles at 30 %, else from load", () => {
  assert.equal(stickyLivechatMode("/"), "home");
  for (const p of ["/contact", "/contact/", "/contact/thanks"]) assert.equal(stickyLivechatMode(p), "never", p);
  for (const p of ["/articles/rebar-weight", "/articles/category/guides"]) assert.equal(stickyLivechatMode(p), "article", p);
  for (const p of ["/prices", "/prices/rebar", "/prices/chart/rebar-a3", "/products", "/products/rebar-12", "/products/category/rebar", "/about", "/articles", "/market-indicators"]) assert.equal(stickyLivechatMode(p), "always", p);
  assert.equal(ARTICLE_SCROLL_SHARE, 0.3);
  // The markers the home rule observes.
  assert.match(read("components/home/hero.tsx"), /<section data-home-hero="" /);
  assert.match(read("components/home/expert-contact.tsx"), /data-expert-variant=\{variant\}/);
  assert.match(button, /document\.querySelector\("\[data-home-hero\]"\)/);
  assert.match(button, /const update = \(\) => setPlaced\(scrolled && !heroIn && !expertIn\);/);
  // The server render already matches the rule (no flash, no hydration mismatch); /contact renders nothing.
  assert.match(button, /useState\(mode === "always"\)/);
  assert.match(button, /if \(mode === "never"\) return null;/);
  // Hidden = faded and out of the tab order; no motion under prefers-reduced-motion; fixed, so no CLS.
  assert.match(button, /visible \? "visible opacity-100" : "invisible opacity-0"/);
  assert.match(button, /transition-\[opacity,visibility\] duration-300 motion-reduce:transition-none/);
});

test("teaser rules: 45 s on price/product/chart pages or the 2nd product page; online + sales hours + once per session", () => {
  assert.equal(TEASER_DWELL_MS, 45_000);
  for (const p of ["/prices", "/prices/rebar", "/prices/chart/rebar-a3", "/products", "/products/rebar-12", "/products/category/rebar"]) assert.equal(isTeaserDwellPage(p), true, p);
  for (const p of ["/", "/about", "/articles/x", "/contact", "/pricesx"]) assert.equal(isTeaserDwellPage(p), false, p);
  assert.equal(productPageSlug("/products/rebar-12"), "rebar-12");
  assert.equal(productPageSlug("/products/category"), null);
  assert.equal(productPageSlug("/products/category/rebar"), null);
  assert.equal(productPageSlug("/products"), null);
  // Only the status frame's own message (§6.3), never assumed online, never outside sales hours, once per session,
  // at most one probe a minute; the frame exists only while probing (after a trigger) and goes after the message or 5 s.
  assert.match(button, /if \(e\.source !== statusFrame\.current\?\.contentWindow\) return;\n      const online = livechatStatusMessage\(e\.origin, e\.data, chat\.config\.origin\);\n      if \(online !== null\) finish\(online\);/);
  assert.match(button, /const finish = \(online: boolean\) => \{\n      setProbing\(false\);\n      setTrigger\(null\);\n      if \(!online \|\| /);
  assert.match(button, /const id = setTimeout\(\(\) => finish\(false\), chat\.statusTimeoutMs\);/);
  assert.match(button, /\{probing && <iframe ref=\{statusFrame\} src=\{chat\.config\.statusUrl\} title=\{copy\.online\} aria-hidden="true" tabIndex=\{-1\} hidden \/>\}/);
  assert.equal((button.match(/setProbing\(true\)/g) ?? []).length, 1, "one place starts a probe: the trigger effect");
  assert.match(button, /const PROBE_INTERVAL_MS = 60_000;/);
  assert.match(button, /if \(Date\.now\(\) - Number\(store\?\.getItem\(PROBE_KEY\) \?\? 0\) < PROBE_INTERVAL_MS\) return;/);
  assert.equal(livechatProps("fa", ON)!.statusTimeoutMs, 5000);
  assert.match(button, /if \(!openState\(new Date\(\), chat\.hours\)\?\.open\) return;/);
  assert.match(button, /if \(store\?\.getItem\(TEASER_KEY\)\) return;/);
  assert.match(button, /session\(\)\?\.setItem\(TEASER_KEY, "1"\)/);
  // Desktop bubble with ✕, mobile dot; the teaser never opens the panel (only a click does).
  assert.match(button, /window\.matchMedia\("\(min-width: 768px\)"\)\.matches \? "bubble" : "dot"/);
  assert.match(button, /onClick=\{\(\) => setTeaser\(null\)\} aria-label=\{copy\.dismiss\}/);
  assert.equal((button.match(/openPanel\(/g) ?? []).length, 3, "openPanel: defined once, called only from the two click handlers");
  assert.equal(livechatCopy("fa").teaser, "سؤالی درباره قیمت یا موجودی دارید؟ کارشناس آنلاین است");
});

test("copy: fa/en/ar complete; the fa labels are the brief's", () => {
  for (const locale of locales) for (const [k, v] of Object.entries(livechatCopy(locale))) assert.ok(v.trim().length > 0, `${locale}.${k}`);
  assert.equal(livechatCopy("fa").label, "چت با کارشناس");
  assert.equal(livechatCopy("fa").rfq, "ارسال لیست خرید");
  // W21.3: the visible loading status (owner wording).
  assert.equal(livechatCopy("fa").loading, "در حال اتصال به کارشناس…");
  assert.equal(livechatCopy("ar").loading, "جارٍ الاتصال بخبير المبيعات…");
  assert.equal(livechatCopy("en").loading, "Connecting you to a sales expert…");
  assert.doesNotMatch(Object.values(livechatCopy("fa")).join(" "), /دقیقه|ثانیه|فوری|۲۴/, "no response-time promise");
});

test("events: chat_open, chat_load_error, chat_teaser_shown — allowlisted, PII-free, outside ANALYTICS_EVENTS, documented", () => {
  assert.deepEqual(LIVECHAT_EVENTS.chat_open, ["chat_location"]);
  assert.deepEqual(LIVECHAT_EVENTS.chat_load_error, ["chat_location", "chat_error"]);
  assert.deepEqual(LIVECHAT_EVENTS.chat_teaser_shown, ["chat_location", "chat_teaser", "chat_trigger"]);
  for (const name of Object.keys(LIVECHAT_EVENTS)) assert.ok(!Object.hasOwn(ANALYTICS_EVENTS, name), `${name}: one definition only`);
  assert.deepEqual(buildLivechatEvent("chat_open", { chat_location: "sticky" }), { event: "chat_open", chat_location: "sticky" });
  assert.deepEqual(buildLivechatEvent("chat_load_error", { chat_location: "home_expert", chat_error: "timeout", email: "a@b.c" } as never), { event: "chat_load_error", chat_location: "home_expert", chat_error: "timeout" });
  assert.deepEqual(buildLivechatEvent("chat_teaser_shown", { chat_location: "sticky", chat_teaser: "dot", chat_trigger: "second_product" }), { event: "chat_teaser_shown", chat_location: "sticky", chat_teaser: "dot", chat_trigger: "second_product" });
  assert.deepEqual(buildLivechatEvent("chat_open", { chat_location: "a b@c" }), { event: "chat_open" }, "a non-token value is dropped");
  assert.match(button, /trackLivechatEvent\("chat_open", \{ chat_location: panel\.location \}\)/);
  assert.match(button, /trackLivechatEvent\("chat_load_error", \{ chat_location: panel\.location, chat_error: "timeout" \}\)/);
  assert.match(button, /trackLivechatEvent\("chat_teaser_shown", \{ chat_location: "sticky", chat_teaser: form, chat_trigger: trigger \?\? undefined \}\)/);
  // The expert section's chat button is a <button>: it reports expert_chat_click itself (the delegated listener sees links only).
  assert.match(button, /trackEvent\("expert_chat_click", \{ expert_variant:/);
  assert.match(read("components/analytics/analytics-runtime.tsx"), /closest\("a\[href\]"\)/, "the shared runtime is unchanged");
  const doc = read("docs/analytics/GTM_SETUP.md");
  for (const name of ["chat_open", "chat_load_error", "chat_teaser_shown", "chat_location", "chat_error", "chat_teaser", "chat_trigger", "GA4 - chat_open", "GA4 - chat_load_error", "GA4 - chat_teaser_shown", "DLV - chat_location", "DLV - chat_error", "DLV - chat_teaser", "DLV - chat_trigger", "ahanassa-livechat-status"]) assert.ok(doc.includes(name), name);
});

test("zero bytes when off: the static build swaps the module for a server-only stub; only the alias imports it", () => {
  const vite = read("scripts/static/vite.config.static.ts");
  assert.match(vite, /LIVECHAT_BUTTON_SPECIFIER = "@\/components\/livechat\/livechat-button"/);
  assert.match(vite, /return off && LIVECHAT_BUTTON_IMPORT\.test\(source\) \? stub : null;/);
  assert.match(vite, /plugins: \[staticBuildRuntime\(\), await livechatOff\(\), vinext\(\)\]/);
  const stub = read("components/livechat/livechat-off.ts");
  assert.doesNotMatch(stub, /^["']use client["']/m);
  assert.match(stub, /export function LivechatButton\(\): null/);
  assert.match(stub, /export function LivechatHost\(\): null/);
  // Every importer uses the exact specifier the plugin swaps (a relative import would bypass it).
  assert.match(read("components/home/expert-contact.tsx"), /import \{ LivechatButton \} from "@\/components\/livechat\/livechat-button";/);
  assert.match(read("components/livechat/site-livechat.tsx"), /import \{ LivechatButton, LivechatHost \} from "@\/components\/livechat\/livechat-button";/);
  // Nothing else in the shared, always-loaded client code mentions live chat.
  for (const file of ["lib/analytics/events.ts", "components/analytics/analytics-runtime.tsx"]) assert.doesNotMatch(read(file).replace(/\/\*[\s\S]*?\*\/|\/\/.*$/gm, ""), /livechat|chat_open|chat_load_error|chat_teaser/i, file);
  // No Odoo script on the site, ever: the chat and the status page are iframes.
  assert.doesNotMatch(button.replace(/\/\*[\s\S]*?\*\/|\/\/.*$/gm, ""), /createElement\("script"\)|<script|im_livechat|odoo\.ahanassa/);
});

test("a11y + no CLS (source): dialog, focus in/trap/return, Esc, 380×600 / full screen ≤ 480 px, visible status while loading, fallback after 18 s", () => {
  assert.match(button, /role="dialog"\n      aria-modal="true"\n      aria-labelledby=\{`\$\{PANEL_ID\}-title`\}/);
  assert.match(button, /closeRef\.current\?\.focus\(\);/, "focus moves into the panel");
  assert.match(button, /if \(opener\?\.isConnected\) opener\.focus\(\);/, "focus returns to the opener");
  assert.match(button, /<span tabIndex=\{0\} onFocus=\{\(\) => focusEdge\("last"\)\} \/>/);
  assert.match(button, /<span tabIndex=\{0\} onFocus=\{\(\) => focusEdge\("first"\)\} \/>/);
  assert.match(button, /if \(e\.key === "Escape"\) closePanel\(\);/);
  assert.match(button, /aria-label=\{copy\.close\}/);
  assert.match(button, /title=\{copy\.frameTitle\}/);
  assert.match(button, /aria-haspopup="dialog"/);
  assert.match(button, /fixed inset-0 z-50/);
  assert.match(button, /min-\[481px\]:h-\[min\(600px,calc\(100dvh-2rem\)\)\] min-\[481px\]:w-\[380px\]/);
  assert.match(button, /role="status" className="sr-only"/);
  assert.match(button, /motion-reduce:animate-none/);
  assert.match(button, /fixed end-4 bottom-\[max\(1rem,env\(safe-area-inset-bottom\)\)\]/, "the en/ar floating WhatsApp spot");
  assert.doesNotMatch(button, /\b(?:left|right|ml|mr|pl|pr)-\d/, "logical properties only (RTL)");
  // W21.3: while loading, the status is shown under the spinner (aria-hidden: the sr-only role="status" announces it).
  assert.match(button, /\{frame\?\.status === "loading" && \([\s\S]*?<LoaderCircle[\s\S]*?<p aria-hidden="true" data-livechat-loading=""[^>]*>\s*\{copy\.loading\}\s*<\/p>/);
  assert.match(button, /<span role="status" className="sr-only">\n\s*\{frame\?\.status === "loading" \? copy\.loading : ""\}/);
  // The 18 s fallback: an iframe has no error event, so "not loaded in time" is the failure; the next open retries.
  assert.match(button, /\}, chat\.timeoutMs\);\n    return \(\) => clearTimeout\(id\);\n  \}, \[frame\?\.key, frame\?\.status, chat\.timeoutMs\]\);/);
  assert.match(button, /else if \(statusRef\.current !== "loading"\) setFrame/);
  // §6: no sandbox and no allow attribute on the chat iframe.
  assert.doesNotMatch(button.slice(button.indexOf("<iframe"), button.indexOf("/>", button.indexOf("<iframe"))), /sandbox|allow=/);
  const css = read("styles/theme-extensions.css");
  assert.match(css, /body:has\(form button\[type="submit"\]\) \[data-sticky-livechat\]/, "never over a form's submit (RFQ)");
  assert.match(css, /body:has\(\[data-sticky-whatsapp\], \[data-sticky-livechat\]\) \[data-site-footer-bottom\]/);
});

test("frame events (§6): only https://odoo.ahanassa.com, only source ahanassa-livechat, only ready/opened/minimized/closed", () => {
  const O = "https://odoo.ahanassa.com";
  assert.equal(LIVECHAT_FRAME_SOURCE, "ahanassa-livechat");
  assert.deepEqual([...LIVECHAT_FRAME_EVENTS], ["ready", "opened", "minimized", "closed"]);
  for (const event of LIVECHAT_FRAME_EVENTS) assert.equal(livechatFrameEvent(O, { source: "ahanassa-livechat", event }, O), event);
  // wrong origin (incl. http, a look-alike, the site itself, a sandboxed "null")
  for (const origin of ["http://odoo.ahanassa.com", "https://odoo.ahanassa.com.evil.example", "https://www.ahanassa.com", "null", ""]) assert.equal(livechatFrameEvent(origin, { source: "ahanassa-livechat", event: "closed" }, O), null, origin);
  // wrong shape / source / type
  for (const data of [null, undefined, "closed", 1, [], {}, { event: "closed" }, { source: "odoo", event: "closed" }, { source: "ahanassa-livechat" }, { source: "ahanassa-livechat", event: "open" }, { source: "ahanassa-livechat", event: "status" }, { source: "ahanassa-livechat", event: "__proto__" }, { source: "ahanassa-livechat", event: ["ready"] }]) assert.equal(livechatFrameEvent(O, data, O), null, JSON.stringify(data));
});

test("frame events wiring: ready stops the 18 s timer (chat_open), minimized hides and keeps, closed hides and removes", () => {
  assert.match(button, /if \(e\.source !== frameRef\.current\?\.contentWindow\) return;\n      const event = livechatFrameEvent\(e\.origin, e\.data, chat\.config\.origin\);/);
  // W21.3: whichever of ready / the timer comes first claims statusRef at once, so only one of chat_open /
  // chat_load_error is ever reported (live fa frame measured ≈ 8 s cold: both fired before this).
  assert.match(button, /if \(statusRef\.current !== "loading"\) return;\n      statusRef\.current = "error";\n      setFrame/);
  assert.match(button, /if \(event === "ready"\) \{\n        if \(statusRef\.current !== "loading"\) return;\n        statusRef\.current = "ready";\n        setFrame\(\(f\) => \(f && f\.status === "loading" \? \{ \.\.\.f, status: "ready" \} : f\)\);\n        if \(panel\.open\) trackLivechatEvent\("chat_open"/);
  assert.match(button, /\} else if \(event === "minimized" \|\| event === "closed"\) \{\n        if \(panel\.open\) closePanel\(\);\n        if \(event === "closed"\) setFrame\(null\);\n      \}/);
  // The timer runs only while loading, so ready cancels it; no onLoad shortcut.
  assert.match(button, /if \(frame\?\.status !== "loading"\) return;\n    const id = setTimeout/);
  assert.doesNotMatch(button, /onLoad=/);
  // The site close control only hides the panel (the chat goes on).
  assert.match(button, /function closePanel\(\) \{\n  const \{ opener \} = panel;\n  setPanel\(\{ \.\.\.panel, open: false \}\);/);
});

test("status message (§6.3/§6.4): only {type: ahanassa-livechat-status, online: boolean} from https://odoo.ahanassa.com", () => {
  const O = "https://odoo.ahanassa.com";
  assert.equal(LIVECHAT_STATUS_TYPE, "ahanassa-livechat-status");
  assert.equal(livechatStatusMessage(O, { type: "ahanassa-livechat-status", online: true }, O), true);
  assert.equal(livechatStatusMessage(O, { type: "ahanassa-livechat-status", online: false }, O), false);
  assert.equal(livechatStatusMessage(O, { type: "ahanassa-livechat-status", online: true, later: 1 }, O), true, "extra keys are ignored (§6.4)");
  for (const origin of ["http://odoo.ahanassa.com", "https://www.ahanassa.com", "https://odoo.ahanassa.com.evil.example", "null"]) assert.equal(livechatStatusMessage(origin, { type: "ahanassa-livechat-status", online: true }, O), null, origin);
  for (const data of [null, "online", { online: true }, { type: "ahanassa-livechat-status" }, { type: "ahanassa-livechat-status", online: "true" }, { type: "ahanassa-livechat-status", online: 1 }, { source: "ahanassa-livechat", event: "ready", online: true }, { type: "other", online: true }]) assert.equal(livechatStatusMessage(O, data, O), null, JSON.stringify(data));
  // The two message kinds never cross: a status message is no frame event, a frame event is no status.
  assert.equal(livechatFrameEvent(O, { type: "ahanassa-livechat-status", online: true }, O), null);
  assert.equal(livechatStatusMessage(O, { source: "ahanassa-livechat", event: "closed" }, O), null);
});
