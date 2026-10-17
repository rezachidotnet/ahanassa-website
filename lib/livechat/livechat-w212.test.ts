import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { locales } from "../../config/locales.ts";
import { LIVECHAT_ENABLED, LIVECHAT_LOADER_URL, LIVECHAT_ORIGIN, LIVECHAT_TIMEOUT_MS, livechatConfig, livechatCspOrigins } from "../../config/livechat.ts";
import { buildCspReportOnly, buildSecurityHeaders } from "../security/headers.ts";
import { buildHeadersFile } from "../static/static-rules.ts";
import { STATIC_TARGETS } from "../static/targets.ts";
import { hasStickyLivechat, livechatButton, livechatCopy } from "../content/livechat.ts";
import { ANALYTICS_EVENTS } from "../analytics/events.ts";
import { buildLivechatEvent, LIVECHAT_EVENTS } from "./events.ts";
import { findOdooWidget, isLivechatOnline, openOdooLivechat, readLivechatAvailability, resetOdooLivechatForTests, subscribeLivechatOnline } from "./odoo-widget.ts";

/** W21.2 — the website side of the Odoo live chat: a click-to-load facade, OFF until config/livechat.ts is on. */

const read = (p: string) => readFileSync(new URL(`../../${p}`, import.meta.url), "utf8");
const LOADER = "https://odoo.ahanassa.com/im_livechat/loader/1";
const ON = livechatConfig(true, LOADER)!;
const directives = (csp: string) => Object.fromEntries(csp.split("; ").map((d) => [d.split(" ")[0], d.split(" ").slice(1)]));

test("config: ships OFF; on only with the flag AND a loader URL on odoo.ahanassa.com", () => {
  assert.equal(LIVECHAT_ENABLED, false, "W21.2 ships off until Odoo W21.1 is deployed");
  assert.equal(LIVECHAT_LOADER_URL, null);
  assert.equal(livechatConfig(), null);
  assert.equal(LIVECHAT_ORIGIN, "https://odoo.ahanassa.com");
  assert.equal(LIVECHAT_TIMEOUT_MS, 8000);
  assert.deepEqual(ON, { loaderUrl: LOADER, assetsUrl: "https://odoo.ahanassa.com/im_livechat/assets_embed.js", origin: "https://odoo.ahanassa.com" });
  assert.equal(livechatConfig(true, null), null, "a flag alone");
  assert.equal(livechatConfig(false, LOADER), null, "a URL alone");
  for (const bad of ["http://odoo.ahanassa.com/im_livechat/loader/1", "https://evil.example/im_livechat/loader/1", "https://odoo.ahanassa.com.evil.example/im_livechat/loader/1", "https://odoo.ahanassa.com/im_livechat/loader/x", "https://odoo.ahanassa.com/web", "https://odoo.ahanassa.com/im_livechat/loader/1?x=1", "https://u:p@odoo.ahanassa.com/im_livechat/loader/1", "javascript:alert(1)", "/im_livechat/loader/1"]) {
    assert.equal(livechatConfig(true, bad), null, bad);
  }
  assert.deepEqual(livechatCspOrigins(ON), { https: "https://odoo.ahanassa.com", wss: "wss://odoo.ahanassa.com" });
  assert.equal(livechatCspOrigins(), null);
});

test("CSP OFF: no Odoo origin anywhere in the policy or the static _headers", () => {
  assert.doesNotMatch(buildCspReportOnly(["https://api.ahanassa.com"]), /odoo/);
  for (const [, value] of buildSecurityHeaders(["https://api.ahanassa.com"])) assert.doesNotMatch(value, /odoo/);
  for (const env of ["staging", "production"] as const) assert.doesNotMatch(buildHeadersFile(env, STATIC_TARGETS[env].rfqApiOrigin), /odoo/i);
});

test("CSP ON: odoo.ahanassa.com in script-src, connect-src (https + wss) and frame-src — and nowhere broader", () => {
  const csp = directives(buildCspReportOnly(["https://api.ahanassa.com"], livechatCspOrigins(ON)));
  assert.ok(csp["script-src"].includes("https://odoo.ahanassa.com"));
  assert.ok(csp["connect-src"].includes("https://odoo.ahanassa.com"));
  assert.ok(csp["connect-src"].includes("wss://odoo.ahanassa.com"));
  assert.ok(csp["frame-src"].includes("https://odoo.ahanassa.com"));
  // The widget's own stylesheet, fonts and avatars.
  for (const d of ["style-src", "font-src", "img-src"]) assert.ok(csp[d].includes("https://odoo.ahanassa.com"), d);
  // Everything else as before: no wildcard, no 'unsafe-eval', no inline script, the existing origins kept.
  assert.ok(!csp["script-src"].includes("'unsafe-inline'") && !csp["script-src"].includes("'unsafe-eval'"));
  assert.ok(!Object.values(csp).flat().some((v) => /^(?:wss?:|https:)$|odoo\.ahanassa\.com\/|\*\.ahanassa/.test(v)));
  assert.deepEqual(csp["connect-src"].slice(0, 3), ["'self'", "https://challenges.cloudflare.com", "https://api.ahanassa.com"]);
  assert.deepEqual(csp["default-src"], ["'self'"]);
  const off = directives(buildCspReportOnly(["https://api.ahanassa.com"], null));
  for (const d of Object.keys(off)) assert.deepEqual(csp[d].filter((v) => !/odoo\.ahanassa\.com$/.test(v)), off[d], d);
});

test("artifact gate expects the Odoo connect-src origins exactly when live chat is on", () => {
  const gate = read("lib/static/artifact-gate.ts");
  assert.match(gate, /const livechat = livechatCspOrigins\(\);/);
  assert.match(gate, /\.\.\.GA4_CONNECT_ORIGINS, \.\.\.\(livechat \? \[livechat\.https, livechat\.wss\] : \[\]\)\]/);
});

test("placement: expert-section slot in every locale; floating button on fa only; nothing while off", () => {
  for (const locale of locales) {
    assert.equal(livechatButton(locale, "home_expert"), null, locale);
    assert.equal(livechatButton(locale, "sticky"), null, locale);
    assert.ok(livechatButton(locale, "home_expert", ON), locale);
  }
  assert.equal(hasStickyLivechat("fa"), true);
  assert.equal(hasStickyLivechat("en"), false);
  assert.equal(hasStickyLivechat("ar"), false);
  assert.ok(livechatButton("fa", "sticky", ON));
  assert.equal(livechatButton("en", "sticky", ON), null, "en keeps the floating WhatsApp button");
  assert.equal(livechatButton("ar", "sticky", ON), null, "ar keeps the floating WhatsApp button");
  const fa = livechatButton("fa", "sticky", ON)!;
  assert.equal(fa.timeoutMs, 8000);
  assert.equal(fa.rfqHref, "/contact");
  assert.equal(livechatButton("ar", "home_expert", ON)!.rfqHref, "/ar/contact");
  assert.match(fa.whatsappHref ?? "", /^https:\/\/wa\.me\/\d+\?text=/);
  // The sticky WhatsApp is untouched; the layout renders the fa button next to it.
  const layout = read("app/[locale]/layout.tsx");
  assert.match(layout, /<StickyWhatsApp locale=\{locale\} \/>[\s\S]*<StickyLivechat locale=\{locale\} \/>/);
  assert.match(read("components/livechat/sticky-livechat.tsx"), /if \(!chat\) return null;/);
});

test("copy: fa/en/ar complete; the fa labels are the brief's", () => {
  for (const locale of locales) for (const [k, v] of Object.entries(livechatCopy(locale))) assert.ok(v.trim().length > 0, `${locale}.${k}`);
  assert.equal(livechatCopy("fa").label, "چت با کارشناس");
  assert.equal(livechatCopy("fa").rfq, "ارسال لیست خرید");
  assert.doesNotMatch(Object.values(livechatCopy("fa")).join(" "), /دقیقه|ثانیه|فوری|۲۴/, "no response-time promise");
});

test("events: chat_open and chat_load_error, allowlisted and PII-free, outside the shared ANALYTICS_EVENTS, documented in GTM_SETUP", () => {
  assert.deepEqual(LIVECHAT_EVENTS.chat_open, ["chat_location"]);
  assert.deepEqual(LIVECHAT_EVENTS.chat_load_error, ["chat_location", "chat_error"]);
  for (const name of Object.keys(LIVECHAT_EVENTS)) assert.ok(!Object.hasOwn(ANALYTICS_EVENTS, name), `${name}: one definition only`);
  assert.deepEqual(buildLivechatEvent("chat_open", { chat_location: "sticky" }), { event: "chat_open", chat_location: "sticky" });
  assert.deepEqual(buildLivechatEvent("chat_load_error", { chat_location: "home_expert", chat_error: "timeout", email: "a@b.c" } as never), { event: "chat_load_error", chat_location: "home_expert", chat_error: "timeout" });
  assert.deepEqual(buildLivechatEvent("chat_open", { chat_location: "a b@c" }), { event: "chat_open" }, "a non-token value is dropped");
  const button = read("components/livechat/livechat-button.tsx");
  assert.match(button, /trackLivechatEvent\("chat_open", \{ chat_location: chat\.location \}\)/);
  assert.match(button, /trackLivechatEvent\("chat_load_error", \{ chat_location: chat\.location, chat_error: result\.reason/);
  // The expert section's chat button is a <button>: it reports expert_chat_click itself (the delegated listener sees links only).
  assert.match(button, /if \(chat\.location === "home_expert"\) trackEvent\("expert_chat_click", \{ expert_variant:/);
  assert.match(read("components/analytics/analytics-runtime.tsx"), /closest\("a\[href\]"\)/, "the shared runtime is unchanged");
  const doc = read("docs/analytics/GTM_SETUP.md");
  for (const name of ["chat_open", "chat_load_error", "chat_location", "chat_error", "GA4 - chat_open", "GA4 - chat_load_error", "DLV - chat_location", "DLV - chat_error"]) assert.ok(doc.includes(name), name);
});

test("zero bytes when off: the static build swaps the button for a server-only stub; only the alias imports it", () => {
  const vite = read("scripts/static/vite.config.static.ts");
  assert.match(vite, /LIVECHAT_BUTTON_SPECIFIER = "@\/components\/livechat\/livechat-button"/);
  assert.match(vite, /return off && LIVECHAT_BUTTON_IMPORT\.test\(source\) \? stub : null;/);
  assert.match(vite, /plugins: \[staticBuildRuntime\(\), await livechatOff\(\), vinext\(\)\]/);
  const stub = read("components/livechat/livechat-off.ts");
  assert.doesNotMatch(stub, /^["']use client["']/m);
  assert.match(stub, /export function LivechatButton\(\): null/);
  // Every importer uses the exact specifier the plugin swaps (a relative import would bypass it).
  for (const file of ["components/home/expert-contact.tsx", "components/livechat/sticky-livechat.tsx"]) assert.match(read(file), /import \{ LivechatButton \} from "@\/components\/livechat\/livechat-button";/, file);
  // Nothing else in the shared, always-loaded client code mentions live chat.
  for (const file of ["lib/analytics/events.ts", "components/analytics/analytics-runtime.tsx"]) assert.doesNotMatch(read(file).replace(/\/\*[\s\S]*?\*\/|\/\/.*$/gm, ""), /livechat|chat_open|chat_load_error/i, file);
});

test("a11y + no CLS (source): a real <button>, busy state, status line, focusable panel, Esc, absolute panel", () => {
  const button = read("components/livechat/livechat-button.tsx");
  assert.match(button, /<button\s+ref=\{buttonRef\}\s+type="button"/);
  assert.match(button, /aria-busy=\{status === "loading" \|\| undefined\}/);
  assert.match(button, /aria-expanded=\{status === "error"\}/);
  assert.match(button, /role="status"/);
  assert.match(button, /e\.key === "Escape"/);
  assert.match(button, /buttonRef\.current\?\.focus\(\)/, "focus returns to the button");
  assert.match(button, /panelRef\.current\?\.focus\(\)/, "the panel takes focus");
  assert.match(button, /aria-label=\{copy\.close\}/);
  assert.match(button, /absolute end-0 bottom-full/, "the fallback panel never moves the page");
  assert.match(button, /fixed end-4 bottom-\[max\(1rem,env\(safe-area-inset-bottom\)\)\]/, "the en/ar floating WhatsApp spot");
  assert.match(button, /motion-reduce:animate-none/);
  assert.doesNotMatch(button, /\b(?:left|right|ml|mr|pl|pr)-\d/, "logical properties only (RTL)");
  assert.doesNotMatch(button, /im_livechat|odoo\.ahanassa/, "no Odoo URL in the component: it comes from config");
  // The online dot exists only from the shared store (set only by a successful open).
  assert.match(button, /\{online && \(/);
  const css = read("styles/theme-extensions.css");
  assert.match(css, /body:has\(form button\[type="submit"\]\) \[data-sticky-livechat\]/);
  assert.match(css, /body:has\(\[data-sticky-whatsapp\], \[data-sticky-livechat\]\) \[data-site-footer-bottom\]/);
});

// --- the widget loader, against a fake DOM ----------------------------------------------------------------------

type ScriptPlan = Partial<Record<"loader" | "assets", "load" | "error" | "never">>;

function fakeWindow(plan: ScriptPlan, onLoader: (win: Record<string, unknown>) => void = () => {}, mount = true) {
  const added: string[] = [];
  let clicks = 0;
  let root: unknown = null;
  const launcher = { click: () => clicks++ };
  const win: Record<string, unknown> = {};
  const doc = {
    head: {
      appendChild(script: { src: string; dataset: Record<string, string>; onload: () => void; onerror: () => void }) {
        added.push(script.src);
        const role = script.dataset.livechat as "loader" | "assets";
        const behaviour = plan[role] ?? "load";
        setTimeout(() => {
          if (behaviour === "error") return script.onerror();
          if (behaviour === "never") return;
          if (role === "loader") onLoader(win);
          if (role === "assets" && mount) root = { shadowRoot: { querySelector: (s: string) => (s === ".o-livechat-LivechatButton" ? launcher : null) } };
          script.onload();
        }, 5);
      },
    },
    createElement: () => ({ dataset: {} }),
    querySelector: (s: string) => (s === ".o-livechat-root" ? root : s === 'script[data-livechat="assets"]' ? (added.some((a) => a.endsWith("assets_embed.js")) ? {} : null) : null),
  };
  win.document = doc;
  return { win: win as unknown as Window, added, clicks: () => clicks };
}

const available = (flag: Record<string, unknown>) => (win: Record<string, unknown>) => {
  win.odoo = { __session_info__: { livechatData: flag } };
};

test("loader: loads the loader, then the bundle, then opens Odoo's launcher; online only after that", async () => {
  resetOdooLivechatForTests();
  let notified = 0;
  const unsubscribe = subscribeLivechatOnline(() => notified++);
  const w = fakeWindow({}, available({ isAvailable: true }));
  assert.equal(isLivechatOnline(), false);
  assert.deepEqual(await openOdooLivechat(ON, 1000, w.win), { ok: true });
  assert.deepEqual(w.added, [ON.loaderUrl, ON.assetsUrl]);
  assert.equal(w.clicks(), 1);
  assert.equal(isLivechatOnline(), true);
  assert.equal(notified, 1);
  // A second click reuses the loaded widget: no new script, one more launcher click.
  assert.deepEqual(await openOdooLivechat(ON, 1000, w.win), { ok: true });
  assert.equal(w.added.length, 2);
  assert.equal(w.clicks(), 2);
  unsubscribe();
});

test("loader: no operator / no channel / script error / timeout → fallback reason, never online", async () => {
  const cases: Array<[string, ReturnType<typeof fakeWindow>, string]> = [
    ["no operator", fakeWindow({}, available({ isAvailable: false })), "no_operator"],
    ["no operator (can_load_livechat)", fakeWindow({}, available({ can_load_livechat: false })), "no_operator"],
    ["no channel", fakeWindow({}), "no_channel"],
    ["loader 404", fakeWindow({ loader: "error" }), "script_error"],
    ["bundle 404", fakeWindow({ assets: "error" }, available({ isAvailable: true })), "script_error"],
    ["loader hangs", fakeWindow({ loader: "never" }), "timeout"],
    ["widget never mounts", fakeWindow({}, available({ isAvailable: true }), false), "timeout"],
  ];
  for (const [name, w, reason] of cases) {
    resetOdooLivechatForTests();
    assert.deepEqual(await openOdooLivechat(ON, 300, w.win), { ok: false, reason }, name);
    assert.equal(isLivechatOnline(), false, name);
    assert.equal(w.clicks(), 0, name);
    if (reason === "no_operator" || name === "no channel" || name === "loader 404") assert.ok(!w.added.includes(ON.assetsUrl), `${name}: the bundle is never loaded`);
  }
});

test("loader: an error is retried by the next click; the bundle is never added twice", async () => {
  resetOdooLivechatForTests();
  let available_ = false;
  const w = fakeWindow({}, (win) => available({ isAvailable: available_ })(win));
  assert.deepEqual(await openOdooLivechat(ON, 300, w.win), { ok: false, reason: "no_operator" });
  available_ = true;
  assert.deepEqual(await openOdooLivechat(ON, 300, w.win), { ok: true });
  assert.equal(w.added.filter((s) => s === ON.assetsUrl).length, 1);
  resetOdooLivechatForTests();
});

test("availability + widget readers tolerate missing or odd globals", () => {
  assert.equal(readLivechatAvailability(undefined), null);
  assert.equal(readLivechatAvailability({}), null);
  assert.equal(readLivechatAvailability({ odoo: { __session_info__: {} } }), null);
  assert.deepEqual(readLivechatAvailability({ odoo: { __session_info__: { livechatData: { isAvailable: "yes" } } } }), { available: false }, "only a real true counts");
  assert.deepEqual(readLivechatAvailability({ odoo: { __session_info__: { livechatData: { can_load_livechat: true } } } }), { available: true });
  assert.equal(findOdooWidget({ querySelector: () => null } as never), null);
  assert.equal(findOdooWidget({ querySelector: () => ({ shadowRoot: null }) } as never), null);
  assert.deepEqual(findOdooWidget({ querySelector: () => ({ shadowRoot: { querySelector: (s: string) => (s === ".o-mail-ChatWindow" ? {} : null) } }) } as never), { launcher: null, chatOpen: true });
});
