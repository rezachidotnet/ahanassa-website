import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { navLinks, visibleNavLinks } from "../content/nav.ts";
import { ABOUT_COPY } from "../content/about.ts";
import { groupCompany } from "../content/company.ts";
import { hasStickyWhatsApp, stickyWhatsApp, WHATSAPP_BUSINESS_NUMBER } from "../content/whatsapp.ts";
import { clickEventFor } from "../analytics/events.ts";
import { PRICE_CHANGE_TONE_CLASS, priceChangeToneClass } from "../pricing/price-change-tone.ts";
import { PRODUCTION_NOINDEX_PAGES } from "../seo/indexing-policy.ts";
import { locales } from "../../config/locales.ts";

/** W20.1 (owner, 2026-10-16) — quick fixes: price change colours, no Industries menu item, aisanaat.ir, CEO first, footer group list, en/ar WhatsApp button. */

const REPO = path.resolve(import.meta.dirname, "../..");
const read = (f: string) => fs.readFileSync(path.join(REPO, f), "utf8");
const code = (f: string) => read(f).replace(/\/\*[\s\S]*?\*\//g, "").replace(/\/\/.*$/gm, "");

// --- 1. price change colours ----------------------------------------------------------------------------

const hex = (h: string) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16) / 255).map((c) => (c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4));
const luminance = (h: string) => { const [r, g, b] = hex(h); return 0.2126 * r + 0.7152 * g + 0.0722 * b; };
const contrast = (a: string, b: string) => { const [x, y] = [luminance(a), luminance(b)].sort((p, q) => q - p); return (x + 0.05) / (y + 0.05); };
const token = (name: string): string => {
  const tokens = read("styles/tokens.css");
  const m = tokens.match(new RegExp(`--${name}:\\s*([^;]+);`));
  assert.ok(m, name);
  const v = m[1].trim();
  return v.startsWith("var(") ? token(v.slice(6, -1)) : v;
};

test("price change: up green, down red, unchanged neutral; AA on every surface a price sits on", () => {
  assert.deepEqual(PRICE_CHANGE_TONE_CLASS, { up: "text-price-up", down: "text-price-down", none: "text-neutral-700" });
  const up = token("aa-color-price-up");
  const down = token("aa-color-price-down");
  assert.equal(up, token("aa-color-success-700"));
  assert.equal(down, token("aa-color-danger-700"));
  for (const surface of ["#ffffff", token("aa-color-neutral-50"), token("aa-color-neutral-100"), token("aa-color-neutral-200"), token("aa-color-brand-cream-50")]) {
    assert.ok(contrast(up, surface) >= 4.5, `up on ${surface}: ${contrast(up, surface)}`);
    assert.ok(contrast(down, surface) >= 4.5, `down on ${surface}: ${contrast(down, surface)}`);
  }
  // No dark theme: the page stays light in an OS dark mode, so the ratios above are the dark-mode ratios too.
  assert.match(read("styles/base.css"), /color-scheme: light;/);
  const theme = read("styles/theme-extensions.css");
  assert.match(theme, /--color-price-up: var\(--aa-color-price-up\);/);
  assert.match(theme, /--color-price-down: var\(--aa-color-price-down\);/);
});

test("price change: the badge and the PriceBlock colour by direction and keep the arrow and the % (never colour alone)", () => {
  const badge = code("components/products/price-change-badge.tsx");
  assert.match(badge, /priceChangeToneClass\(change\.direction\)/);
  assert.match(badge, /\{change\.glyph\}/);
  assert.match(badge, /\{change\.label\}/);
  assert.match(badge, /sr-only">\{change\.word\}/);
  assert.ok(!/text-neutral-700/.test(badge), "no fixed neutral colour left");
  const block = code("components/products/price-block.tsx");
  assert.match(block, /priceChangeToneClass\(view\.change\.direction\)/);
  assert.match(block, /<ArrowUp[^>]*\/>[\s\S]*<ArrowDown[^>]*\/>/);
  assert.equal(priceChangeToneClass("up"), "text-price-up");
});

// --- 2. Industries is not in any menu, the page stays -----------------------------------------------------

test("menus: no Industries item in the header, drawer or footer list of any locale; /industries itself unchanged", () => {
  for (const locale of locales) {
    for (const hasArticles of [true, false]) assert.ok(!visibleNavLinks(locale, hasArticles).some((l) => l.path === "/industries"), locale);
    assert.ok(!navLinks[locale].some((l) => /صنایع|Industries|الصناعات/.test(l.label)), locale);
  }
  for (const f of ["components/layout/SiteHeader.tsx", "components/layout/mobile-nav-drawer.tsx", "components/layout/SiteFooter.tsx"]) assert.ok(!/\/industries/.test(code(f)), `${f}: no hardcoded Industries link`);
  assert.ok(fs.existsSync(path.join(REPO, "app/[locale]/industries/page.tsx")), "the page stays");
  assert.ok((PRODUCTION_NOINDEX_PAGES as readonly string[]).includes("/industries"), "its sitemap/indexing treatment is unchanged");
});

// --- 3. AiSanat domain ------------------------------------------------------------------------------------

test("AiSanat: aisanaat.ir (two a's)", () => {
  assert.equal(groupCompany("aisanat").url, "https://aisanaat.ir");
  assert.equal(groupCompany("aisanat").domain, "aisanaat.ir");
  assert.ok(!/aisanat\.ir/.test(read("lib/content/company.ts")));
});

// --- 4. /about leadership order ---------------------------------------------------------------------------

test("about: «مدیرعامل: فاطمه زاهدی» first, then the chairman, in fa/en/ar", () => {
  assert.deepEqual(ABOUT_COPY.fa.leadership.map((p) => `${p.role}: ${p.name}`), ["مدیرعامل: فاطمه زاهدی", "رئیس هیئت‌مدیره: امیرموسی طالقانی"]);
  assert.deepEqual(ABOUT_COPY.en.leadership.map((p) => p.name), ["Fatemeh Zahedi", "Amirmousa Taleghani"]);
  assert.deepEqual(ABOUT_COPY.ar.leadership.map((p) => p.name), ["فاطمة زاهدي", "أمير موسى طالقاني"]);
});

// --- 5. footer group companies ----------------------------------------------------------------------------

test("footer: group companies one per line, underlined links in a new tab with rel=noopener and a visible focus ring", () => {
  const footer = code("components/layout/SiteFooter.tsx");
  assert.match(footer, /<ul className="mt-2 flex flex-col text-sm" data-footer-group-companies="">/);
  assert.match(footer, /<a href=\{c\.url!\} target="_blank" rel="noopener" className=\{GROUP_LINK\}>/);
  assert.match(footer, /const GROUP_LINK = cn\(FOOTER_LINK, "underline underline-offset-4 focus-visible:outline-2 [^"]*focus-ring-inverse/);
  assert.match(footer, /sr-only"> \{GROUP_CARD_COPY\[locale\]\.newTab\}/);
});

// --- 6. sticky WhatsApp on en/ar --------------------------------------------------------------------------

test("sticky WhatsApp: en and ar only, wa.me with the business number and a greeting in the page's language", () => {
  assert.equal(hasStickyWhatsApp("fa"), false);
  assert.equal(stickyWhatsApp("fa"), null);
  assert.equal(stickyWhatsApp("en", null), null, "no number, no button");
  assert.equal(stickyWhatsApp("en", "0912"), null, "invalid number, no button");
  const en = stickyWhatsApp("en")!;
  const ar = stickyWhatsApp("ar")!;
  for (const [link, greeting] of [[en, "Hello Ahan Asa, I have a question about steel supply."], [ar, "مرحبًا آهن آسا، لديّ استفسار عن توريد الحديد."]] as const) {
    const url = new URL(link.href);
    assert.equal(url.origin + url.pathname, `https://wa.me/${WHATSAPP_BUSINESS_NUMBER}`);
    assert.equal(url.searchParams.get("text"), greeting);
    assert.equal(clickEventFor(link.href), "whatsapp_click", "the existing delegated listener reports it");
  }
  assert.equal(en.label, "Chat with Ahan Asa on WhatsApp");
  assert.equal(ar.label, "تواصل مع آهن آسا عبر واتساب");
});

test("sticky WhatsApp: 56px, inline-end corner, aria-label, hidden in print, off pages with a submit form, rendered by the layout", () => {
  const button = code("components/layout/sticky-whatsapp.tsx");
  const classes = (button.match(/className="([^"]+)"/)?.[1] ?? "").split(" ");
  for (const cls of ["fixed", "end-4", "size-14", "print:hidden", "rounded-full"]) assert.ok(classes.includes(cls), cls);
  assert.match(button, /aria-label=\{link\.label\}/);
  assert.match(button, /data-sticky-whatsapp=""/);
  assert.match(button, /rel=\{WHATSAPP_REL\}/);
  assert.match(code("app/[locale]/layout.tsx"), /<StickyWhatsApp locale=\{locale\} \/>/);
  const css = read("styles/theme-extensions.css");
  assert.match(css, /body:has\(form button\[type="submit"\]\) \[data-sticky-whatsapp\] \{\s*display: none;/);
  assert.match(css, /body:has\(\[data-sticky-whatsapp\]\) \[data-site-footer-bottom\] \{\s*padding-bottom:/);
  assert.match(code("components/contact/enquiry-form.tsx"), /type="submit"/, "the enquiry form has a submit button, so the CSS rule hides the button on /contact");
  assert.match(code("components/layout/SiteFooter.tsx"), /data-site-footer-bottom=""/);
  assert.match(code("lib/analytics/events.ts"), /closest\("\[data-sticky-whatsapp\]"\)\) return "sticky"/);
});
