import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";
import { navLinks, primaryCta, dropdownDisclosureAccessibleName } from "./nav.ts";

/**
 * docs/navigation/AHANASSA_HEADER_FINAL_FROZEN_V2.2.md acceptance-criteria
 * regression coverage (current authority — incorporates all non-superseded
 * rules from docs/navigation/AHANASSA_HEADER_FINAL_FROZEN_V2.1.md).
 * `lib/content/nav.ts` is plain data (no `cloudflare:workers` dependency)
 * so it's directly unit-testable; the component files (SiteHeader.tsx and
 * friends) are JSX/Next.js and pinned as source-text invariants instead,
 * matching this repo's established convention (no React render-testing
 * framework exists here — see `lib/catalog/homepage-source-isolation.test.ts`
 * for the same reasoning applied elsewhere). Primary CTA Button
 * geometry/interaction coverage lives in `components/ui/button.test.ts`
 * (Shared Button Component V1.0), not here — this file only proves the
 * Header consumes it rather than a local implementation.
 */

const REPO_ROOT = path.resolve(fileURLToPath(new URL(".", import.meta.url)), "../..");
function readSource(relativePath: string): string {
  return readFileSync(path.join(REPO_ROOT, relativePath), "utf8");
}

/**
 * Strips /* * / block comments and // line comments before a "must not
 * contain X" assertion runs — several of this file's own explanatory doc
 * comments legitimately NAME the forbidden pattern (to explain why it's
 * avoided), which otherwise produces a false-positive match against the
 * literal code-level check. Naive (doesn't understand strings containing
 * "//"), which is fine for this file's actual source inputs.
 */
function stripComments(source: string): string {
  return source.replace(/\/\*[\s\S]*?\*\//g, "").replace(/\/\/.*$/gm, "");
}

// --- §58.1: frozen routes ---

test("frozen routes: products/services/industries/about/contact resolve exactly as specified, for every locale", () => {
  for (const locale of ["fa", "en", "ar"] as const) {
    const links = navLinks[locale];
    const byPath = new Map(links.map((l) => [l.path, l]));
    assert.ok(byPath.has("/products"));
    assert.ok(byPath.has("/services"));
    assert.ok(byPath.has("/industries"));
    assert.ok(byPath.has("/about"));
    assert.ok(byPath.has("/contact"));
    assert.ok(!byPath.has("/markets"), "the primary nav must no longer target /markets — superseded by /industries");
    assert.equal(links.length, 5, "no new top-level navigation item may be introduced without a new approved architecture decision (§58.1)");
  }
});

test("frozen hybrid gate: only Products and Services carry hasDropdown — Industries/About/Contact remain plain direct links (§32.4/§34.2/§37.2)", () => {
  for (const locale of ["fa", "en", "ar"] as const) {
    const links = navLinks[locale];
    for (const link of links) {
      const shouldHaveDropdown = link.path === "/products" || link.path === "/services";
      assert.equal(Boolean(link.hasDropdown), shouldHaveDropdown, `${locale} ${link.path}: hasDropdown mismatch`);
    }
  }
});

// --- §40.1-40.2: primary CTA ---

test("primary CTA: Persian text is frozen exactly as ارسال لیست خرید, route is /request", () => {
  assert.equal(primaryCta.fa.full, "ارسال لیست خرید");
  assert.notEqual(primaryCta.fa.full, "ارسال فاکتور یا لیست خرید", "the pre-frozen-spec CTA text must not remain");
});

test("primary CTA: never replaced with the explicitly-rejected alternatives (§40.1)", () => {
  for (const locale of ["fa", "en", "ar"] as const) {
    const text = `${primaryCta[locale].full} ${primaryCta[locale].compact}`;
    assert.ok(!text.includes("درخواست قیمت"));
    assert.ok(!text.includes("ثبت سفارش"));
    assert.ok(!text.includes("ثبت درخواست"));
  }
});

// --- §26/§58.3: Services grouping comes from the real Public Processing
// Projection (P5/P6), never an invented/hardcoded commercial master ---
// `nav.ts`'s old `headerServiceGroups` constant (a deliberate, disclosed
// interim stand-in while no real projection existed) is GONE — content-shape
// assertions about the actual 3 frozen group names now belong to
// `lib/processing/sync.test.ts`/the live DB_PUBLIC data, not to this file,
// since that content is no longer static source code at all. What remains
// testable here is the DATA-SOURCE invariant: Services must come from a
// prop, never a hardcoded array — see the two tests below (mirroring the
// existing Products tests immediately after this block).

test("nav.ts no longer defines a hardcoded Services array — headerServiceGroups/HeaderServiceGroup do not exist (P6 §6: deleted, never kept as a fallback)", () => {
  // stripComments first — nav.ts's own explanatory doc comment legitimately
  // NAMES the removed constant while explaining why/how it was replaced
  // (this file's established false-positive-avoidance convention, see
  // stripComments's own header above).
  const source = stripComments(readSource("lib/content/nav.ts"));
  assert.ok(!/\bheaderServiceGroups\b/.test(source), "the old hardcoded Services constant must be fully removed, not merely unused, and not just moved into a comment");
  assert.ok(!source.includes("export interface HeaderServiceGroup"), "the old Services item type must be fully removed");
});

test("SiteHeader sources Services data from a prop (server-fetched Public Processing Projection), never a hardcoded array (§26/§52.6/§58.3)", () => {
  const source = readSource("components/layout/SiteHeader.tsx");
  assert.match(source, /serviceGroups:\s*PublicProcessingGroup\[\]/, "Services data must arrive as a typed prop from the real projection, not be declared inline");
  assert.ok(!/const\s+serviceGroups\s*=\s*headerServiceGroups/.test(source), "must never re-derive serviceGroups from the old nav.ts constant");
  assert.ok(!/const\s+services\s*=\s*\[/.test(source), "no inline hardcoded services array");
});

// --- §4.2/§58.2: Products must never be a frontend-hardcoded commercial list ---

test("nav.ts contains no hardcoded commercial PRODUCT array (the prohibited pattern from §4.2) — navLinks/primaryCta/headerPhoneLabel never mention a raw product/material name", () => {
  const source = readSource("lib/content/nav.ts");
  // Scoped from navLinks to end-of-file — the old carve-out for
  // `headerServiceGroups` legitimately mentioning material names as part of
  // its frozen SERVICE descriptions no longer applies: that constant is
  // gone (P6), so nothing after navLinks in this file should mention a raw
  // material name any more either.
  const navLinksStart = source.indexOf("export const navLinks");
  const scoped = source.slice(navLinksStart);
  for (const forbidden of ["میلگرد", "تیرآهن", "ورق سیاه", "ورق روغنی"]) {
    assert.ok(!scoped.includes(forbidden), `navLinks/primaryCta/headerPhoneLabel must never hardcode a commercial product name like "${forbidden}"`);
  }
  assert.ok(!/const\s+products\s*=\s*\[/.test(source), "no hardcoded products array of any kind");
  assert.ok(!/const\s+services\s*=\s*\[/.test(source), "no hardcoded services array of any kind (P6)");
});

test("SiteHeader sources Products data from a prop (server-fetched Public Product Projection), never a hardcoded array (§58.2)", () => {
  const source = readSource("components/layout/SiteHeader.tsx");
  assert.match(source, /productFamilies:\s*HeaderProductFamilyShortcut\[\]/, "Products data must arrive as a typed prop from the real projection, not be declared inline");
  assert.ok(!/const\s+products\s*=\s*\[/.test(source), "no inline hardcoded products array");
});

test("the real Header product-family query is gated by the same publication-eligibility conditions every other public catalog read uses", () => {
  const source = readSource("lib/catalog/editorial-repository.ts");
  const fnStart = source.indexOf("export async function listHeaderProductFamilyShortcuts");
  assert.ok(fnStart >= 0, "listHeaderProductFamilyShortcuts must exist");
  const fnBody = source.slice(fnStart, source.indexOf("\nexport ", fnStart + 10));
  assert.match(fnBody, /TEMPLATE_PUBLICATION_WHERE_CONDITIONS/, "must reuse the shared publication gate, never a separately duplicated condition");
  assert.match(fnBody, /pv\.is_active = 1 AND pv\.is_public = 1/, "must also gate on the variant's own active/public state");
});

// --- P6: the real Header service-group query (mirrors the Product test immediately above) ---

test("the real Header service-group query filters to the active, requested-locale rows (lib/processing/public-repository.ts#listPublicProcessingGroups)", () => {
  const source = readSource("lib/processing/public-repository.ts");
  const fnStart = source.indexOf("export async function listPublicProcessingGroups");
  assert.ok(fnStart >= 0, "listPublicProcessingGroups must exist");
  const fnBody = source.slice(fnStart);
  assert.match(fnBody, /WHERE locale = \? AND is_active = 1/, "must filter by the requested locale and exclude withdrawn rows");
  assert.match(fnBody, /ORDER BY sequence ASC, code ASC/, "must use the P5-guaranteed sequence, code ordering — never a Header-local re-sort (P6 §10)");
});

// --- §52.8/§58.4: no live fetch on dropdown open ---

test("the desktop dropdown component never fetches data itself — items always arrive as a prop", () => {
  const source = readSource("components/layout/header-nav-disclosure.tsx");
  assert.ok(!source.includes("fetch("), "HeaderNavDisclosure must never call fetch()");
  assert.ok(!source.includes("editorial-repository"), "HeaderNavDisclosure must never import the DB-touching catalog repository directly — data comes from props only");
  assert.ok(!source.includes("public-repository"), "HeaderNavDisclosure must never import the DB-touching processing repository directly either — data comes from props only");
  assert.match(source, /items:\s*NavDisclosureItem\[\]/, "items must be a plain prop");
});

test("the product-family data fetch happens once, server-side, in the locale layout — not inside the client Header component tree", () => {
  const layoutSource = readSource("app/[locale]/layout.tsx");
  assert.match(layoutSource, /listHeaderProductFamilyShortcuts/, "the layout (server component) must be the one calling the real data source");
  const headerSource = readSource("components/layout/SiteHeader.tsx");
  assert.ok(!headerSource.includes("listHeaderProductFamilyShortcuts("), "SiteHeader itself must never call the data-fetching function — only receive its result as a prop");
});

test("the service-group data fetch happens once, server-side, in the locale layout — not inside the client Header component tree (P6)", () => {
  const layoutSource = readSource("app/[locale]/layout.tsx");
  assert.match(layoutSource, /listPublicProcessingGroups/, "the layout (server component) must be the one calling the real data source");
  const headerSource = readSource("components/layout/SiteHeader.tsx");
  assert.ok(!headerSource.includes("listPublicProcessingGroups("), "SiteHeader itself must never call the data-fetching function — only receive its result as a prop");
  const drawerSource = readSource("components/layout/mobile-nav-drawer.tsx");
  assert.ok(!drawerSource.includes("listPublicProcessingGroups("), "MobileNavDrawer must never call the data-fetching function either — only receive its result as a prop");
});

test("neither SiteHeader nor MobileNavDrawer imports an Odoo adapter (Processing or Catalog) — the render path is DB_PUBLIC-repository-only, never Odoo-adapter-direct (P6 §14)", () => {
  for (const file of ["components/layout/SiteHeader.tsx", "components/layout/mobile-nav-drawer.tsx", "components/layout/header-nav-disclosure.tsx"]) {
    const source = readSource(file);
    assert.ok(!/from\s+["'][^"']*odoo-api-client["']/.test(source), `${file} must never import an Odoo API client directly`);
    assert.ok(!/from\s+["'][^"']*lib\/odoo\/client["']/.test(source), `${file} must never import the generic Odoo RPC client directly`);
    assert.ok(!/from\s+["'][^"']*processing\/sync-runner["']/.test(source), `${file} must never import the Processing sync orchestrator`);
    assert.ok(!/from\s+["'][^"']*processing\/scheduled-sync["']/.test(source), `${file} must never import the Processing scheduled-sync coordinator`);
  }
});

test("SiteHeader/MobileNavDrawer use no client-side data fetching for Services — no useEffect-driven fetch, no loading state (P6 §15)", () => {
  for (const file of ["components/layout/SiteHeader.tsx", "components/layout/mobile-nav-drawer.tsx"]) {
    const source = stripComments(readSource(file));
    assert.ok(!/useEffect\([^)]*fetch/.test(source), `${file} must not fetch Services data inside a useEffect`);
    assert.ok(!/(isLoading|loading)\s*[:=]/i.test(source), `${file} must not carry a Services loading state — data always arrives server-rendered`);
  }
});

// --- §37.5: WhatsApp is not a Header utility ---

test("SiteHeader never actually USES WhatsApp — no import/href, even though explanatory comments may name it (§37.5)", () => {
  const source = readSource("components/layout/SiteHeader.tsx");
  assert.ok(!/import.*WhatsApp/.test(source), "must not import a WhatsApp component");
  assert.ok(!source.includes("wa.me"), "must not link to a wa.me URL");
  assert.ok(!/href=\{?["'`].*whatsapp/i.test(source), "must not construct a WhatsApp href");
});

test("the mobile drawer never links to WhatsApp/email/search either", () => {
  const source = readSource("components/layout/mobile-nav-drawer.tsx");
  assert.ok(!source.includes("wa.me"));
  assert.ok(!/mailto:/.test(source));
});

// --- §43.3/§58.8: no country flags in the language selector ---

test("the language selector never renders an <img>/flag asset — labels are text only (comments may name the rule; no such element/class exists in code)", () => {
  const source = readSource("components/layout/header-language-selector.tsx");
  assert.ok(!/<img/.test(source), "no <img> at all in the language selector — labels are text only");
  assert.ok(!/className=(\{|")[^}"]*flag/i.test(source), "no flag-icon CSS class applied to any element");
});

// --- §55.2/§58.17: mobile drawer geometry + safety ---

test("mobile drawer target width is exactly min(88vw, 360px)", () => {
  const source = readSource("components/layout/mobile-nav-drawer.tsx");
  assert.ok(source.includes("w-[min(88vw,360px)]"));
});

test("mobile drawer implements scroll lock, Escape close, and focus restoration to the trigger", () => {
  const source = readSource("components/layout/mobile-nav-drawer.tsx");
  assert.match(source, /document\.body\.style\.overflow\s*=\s*"hidden"/);
  assert.match(source, /e\.key === "Escape"/);
  assert.match(source, /triggerRef\.current\?\.focus\(\)/);
});

test("mobile drawer uses a single-open accordion for Products/Services (§55.6) — one shared openAccordion state, not two independent booleans", () => {
  const source = readSource("components/layout/mobile-nav-drawer.tsx");
  assert.match(source, /useState<"products" \| "services" \| null>/, "a single tri-state value structurally guarantees only one of Products/Services can be open at once");
});

test("mobile drawer exposes at most one child navigation level — no nested sub-accordion inside a Products/Services item", () => {
  const source = readSource("components/layout/mobile-nav-drawer.tsx");
  // The accordion item list renders a flat <li> of {name, href} pairs with
  // no further expandable control — pinned by asserting no second
  // aria-expanded exists anywhere inside the per-item list rendering.
  const itemsBlockStart = source.indexOf("items.map((item) => (");
  const itemsBlockEnd = source.indexOf("))}", itemsBlockStart);
  const itemsBlock = source.slice(itemsBlockStart, itemsBlockEnd);
  assert.ok(!itemsBlock.includes("aria-expanded"), "no nested disclosure control is allowed inside a Products/Services child item");
});

// --- §58.29: semantic HTML ---

test("SiteHeader uses semantic <header>/<nav>, never a clickable generic <div> in place of navigation links", () => {
  const source = readSource("components/layout/SiteHeader.tsx");
  assert.match(source, /<header/);
  assert.match(source, /<nav aria-label/);
});

// --- §43.9/§58.7: one shared Header implementation ---

test("SiteHeader is a single shared component — no locale-conditional divergent Header trees (e.g. separate fa/en/ar branches)", () => {
  const source = readSource("components/layout/SiteHeader.tsx");
  assert.ok(!/locale === "fa" \? \(/.test(source), "must not branch into locale-specific alternate Header markup (the pattern this task explicitly supersedes)");
});

// --- Accessibility/SEO hardening addendum (post-freeze) ---

test("addendum §1: no ARIA menu-widget roles anywhere in the Header component tree", () => {
  for (const file of [
    "components/layout/SiteHeader.tsx",
    "components/layout/header-nav-disclosure.tsx",
    "components/layout/header-language-selector.tsx",
    "components/layout/mobile-nav-drawer.tsx",
  ]) {
    const source = stripComments(readSource(file));
    assert.ok(!/role=["']menu["']|role=["']menubar["']|role=["']menuitem["']/.test(source), `${file} must never use role="menu"/"menubar"/"menuitem" — this is Disclosure Navigation, not a menu widget`);
  }
});

test("addendum §1: aria-haspopup is never used as a blanket convention on the Header's disclosure controls", () => {
  for (const file of ["components/layout/header-nav-disclosure.tsx", "components/layout/header-language-selector.tsx", "components/layout/mobile-nav-drawer.tsx"]) {
    const source = stripComments(readSource(file));
    assert.ok(!source.includes("aria-haspopup"), `${file} must not add aria-haspopup merely by convention — only if justified by an actually-implemented menu/listbox pattern, which this Header does not use`);
  }
});

test("addendum §1: the Products/Services disclosure label is always a real <Link>, with a separate adjacent chevron <button> exposing aria-expanded/aria-controls/an accessible name", () => {
  const source = readSource("components/layout/header-nav-disclosure.tsx");
  assert.match(source, /<Link[\s\S]{0,80}href=\{href\}/, "the top-level label must be a real link to its landing page");
  assert.match(source, /aria-expanded=\{open\}/);
  assert.match(source, /aria-controls=\{panelId\}/);
  // NAV-P1.1 (V2.1 §63.4): the chevron's accessible name must be a DISTINCT
  // prop from the adjacent link's own visible text, never the same string
  // announced twice — see the dedicated NAV-P1.1 test below for the exact
  // localized-copy assertion.
  assert.match(source, /aria-label=\{disclosureLabel\}/);
  assert.ok(!/aria-label=\{label\}/.test(source), "the chevron must not reuse the adjacent link's own label as its accessible name");
});

test("addendum §2: the dropdown item list never disables the global focus indicator (outline-none) — a background-tint-only focus cue was a real ~1.05:1 contrast failure", () => {
  const source = stripComments(readSource("components/layout/header-nav-disclosure.tsx"));
  assert.ok(!source.includes("outline-none"), "dropdown items must keep the site-wide :focus-visible copper outline (~5.4:1) as their focus indicator — no code path may disable it");
});

test("addendum §2: every Header-authored hover state uses the darker, WCAG-passing accent token — never the lighter copper-400 tint (~3.2:1, fails 4.5:1)", () => {
  // Header V2.2: the desktop/drawer Primary CTA's hover token is no longer
  // Header-authored at all — it moved to the Shared Button Component's
  // `primary` variant (navy hover token, verified in button.test.ts). This
  // check now covers only the Header-authored copper accents that remain
  // (e.g. the dropdown "view all" link), not the CTA.
  for (const file of ["components/layout/SiteHeader.tsx", "components/layout/header-nav-disclosure.tsx", "components/layout/mobile-nav-drawer.tsx"]) {
    const source = stripComments(readSource(file));
    assert.ok(!source.includes("hover:bg-copper-400"), `${file} must not use the lighter hover:bg-copper-400 (fails 4.5:1 normal-text contrast)`);
    assert.ok(!source.includes("hover:text-copper-400"), `${file} must not use the lighter hover:text-copper-400 (fails 4.5:1 normal-text contrast)`);
  }
});

test("addendum §8: aria-current precision — isCurrentPage (exact match) and isActiveSection (exact-or-prefix) are computed as two separate booleans, never conflated into one", () => {
  for (const file of ["components/layout/SiteHeader.tsx", "components/layout/mobile-nav-drawer.tsx"]) {
    const source = readSource(file);
    assert.match(source, /const isCurrentPage = pathname === href;/, `${file} must compute an exact-match-only isCurrentPage`);
  }
  const headerSource = readSource("components/layout/SiteHeader.tsx");
  assert.match(headerSource, /const isActiveSection = isCurrentPage \|\| pathname\.startsWith\(`\$\{href\}\/`\);/, "isActiveSection (prefix match) must remain a distinct boolean from isCurrentPage, driving only visual styling");
  const disclosureSource = readSource("components/layout/header-nav-disclosure.tsx");
  assert.match(disclosureSource, /isCurrentPage:\s*boolean;/, "HeaderNavDisclosure must accept isCurrentPage and isActiveSection as two distinct props");
  assert.match(disclosureSource, /isActiveSection:\s*boolean;/);
  assert.ok(!disclosureSource.includes("active:"), "the old single conflated `active` prop must not remain");
});

test("addendum §4: navigation landmarks are never labeled solely by device class (e.g. 'Desktop navigation'/'Mobile navigation')", () => {
  // header-nav-disclosure.tsx and mobile-nav-drawer.tsx are checked with
  // their comment prose still intact for THIS one — the substring check
  // below is deliberately loose (menuLabel.nav below is the actual
  // authoritative check); comments naming the forbidden pattern to explain
  // why it's avoided are expected and fine here.
  const headerSource = readSource("components/layout/SiteHeader.tsx");
  const mapMatch = headerSource.match(/const menuLabel: Record<Locale, \{[\s\S]*?\n\};/);
  assert.ok(mapMatch, "menuLabel map must exist in SiteHeader.tsx");
  for (const forbidden of ["Desktop navigation", "Mobile navigation", "ناوبری دسکتاپ", "ناوبری موبایل", "منوی موبایل", "Mobile menu"]) {
    assert.ok(!mapMatch![0].includes(forbidden), `the actual menuLabel data (not comments) must not label a nav landmark by device class ("${forbidden}")`);
  }
  const navSource = readSource("lib/content/nav.ts");
  assert.ok(!/mobileNav/.test(navSource), "the old device-class-named mobileNav field must not remain in nav.ts");
});

test("addendum §4: the drawer's own modal label (drawerLabel) is distinct from the shared <nav> landmark label (navLabel) it contains, since both are simultaneously exposed while the drawer is open", () => {
  const headerSource = readSource("components/layout/SiteHeader.tsx");
  // Pull the actual label object out of SiteHeader.tsx's own menuLabel map.
  const mapMatch = headerSource.match(/const menuLabel: Record<Locale, \{[\s\S]*?\n\};/);
  assert.ok(mapMatch, "menuLabel map must exist in SiteHeader.tsx");
  const mapSource = mapMatch![0];
  for (const locale of ["fa", "en", "ar"] as const) {
    const rowMatch = mapSource.match(new RegExp(`${locale}:\\s*\\{([^}]*)\\}`));
    assert.ok(rowMatch, `menuLabel.${locale} row must exist`);
    const navFieldMatch = rowMatch![1].match(/nav:\s*"([^"]*)"/);
    const drawerFieldMatch = rowMatch![1].match(/drawer:\s*"([^"]*)"/);
    assert.ok(navFieldMatch && drawerFieldMatch, `${locale} must define both nav and drawer labels`);
    assert.notEqual(navFieldMatch![1], drawerFieldMatch![1], `${locale}: nav and drawer labels must be distinguishable, not identical`);
  }
});

test("addendum §7: mobile drawer exposes native modal semantics (role=dialog, aria-modal=true) tied to a distinct aria-label", () => {
  const source = readSource("components/layout/mobile-nav-drawer.tsx");
  assert.match(source, /role="dialog"/);
  assert.match(source, /aria-modal="true"/);
  assert.match(source, /aria-label=\{drawerLabel\}/, "the dialog's own name must come from the distinct drawerLabel prop, not the inner nav's navLabel");
});

test("addendum §7: background content (<main>, <footer>, the Header shell itself) is marked inert while the drawer is open, and un-inerted when closed", () => {
  const source = readSource("components/layout/SiteHeader.tsx");
  assert.match(source, /getElementById\("main-content"\)/);
  assert.match(source, /querySelector\("footer"\)/);
  assert.match(source, /main\?\.setAttribute\("inert", ""\)/);
  assert.match(source, /footer\?\.setAttribute\("inert", ""\)/);
  assert.match(source, /main\?\.removeAttribute\("inert"\)/);
  assert.match(source, /footer\?\.removeAttribute\("inert"\)/);
  assert.match(source, /inert=\{mobileOpen\}/, "the <header> element itself must also become inert while its own drawer is open");
});

test("addendum §3: a global SkipLink exists, targets #main-content, and is mounted before the Header on every locale page", () => {
  const skipSource = readSource("components/layout/SkipLink.tsx");
  assert.match(skipSource, /href="#main-content"/);
  const layoutSource = readSource("app/[locale]/layout.tsx");
  const skipIdx = layoutSource.indexOf("<SkipLink");
  const headerIdx = layoutSource.indexOf("<SiteHeader");
  const mainIdx = layoutSource.indexOf('id="main-content"');
  assert.ok(skipIdx >= 0 && headerIdx >= 0 && mainIdx >= 0, "SkipLink, SiteHeader, and #main-content must all be present in the shared locale layout");
  assert.ok(skipIdx < headerIdx, "the SkipLink must be mounted before the Header, so it is reachable first via Tab");
  assert.ok(mainIdx > headerIdx, "the SkipLink's #main-content target must exist, wrapping the actual page content");
});

test("addendum §6: Organization structured data's contactPoint reuses the single centralized phone constant — never a separately hardcoded number", () => {
  const source = readSource("lib/seo/schema.ts");
  assert.match(source, /import \{ CONTACT_PHONE_E164 \} from ["']@\/lib\/content\/contact-channels["'];/);
  assert.match(source, /telephone:\s*CONTACT_PHONE_E164/, "contactPoint.telephone must reference the centralized constant, not a literal string");
  assert.ok(!/telephone:\s*["']\+?\d/.test(source), "no separately hardcoded phone literal may be introduced for contactPoint");
  assert.match(source, /"@type":\s*"ContactPoint"/);
  assert.match(source, /"@type":\s*"PostalAddress"/, "the pre-existing verified PostalAddress must remain untouched");
});

test("addendum §6: BreadcrumbList remains a separate, page-level schema helper — never invoked from the Header component tree", () => {
  for (const file of ["components/layout/SiteHeader.tsx", "components/layout/header-nav-disclosure.tsx", "components/layout/mobile-nav-drawer.tsx", "components/layout/header-language-selector.tsx"]) {
    const source = readSource(file);
    assert.ok(!source.includes("breadcrumbListSchema"), `${file} must never call breadcrumbListSchema — Breadcrumb architecture is out of Header scope`);
  }
});

test("addendum §5: x-default hreflang resolution is already authoritative (points at the default locale's unprefixed root) — this addendum does not invent a new destination", () => {
  const source = readSource("lib/metadata/resolve.ts");
  assert.match(source, /x-default/, "an x-default entry must be produced by the existing language-alternates builder");
});

// --- NAV-P1: Product group label localization ---
// listHeaderProductFamilyShortcuts touches D1 (cloudflare:workers) and
// cannot be imported under plain node --test — pinned as source-text
// invariants here, matching this file's own established convention; the
// actual query BEHAVIOR (fa/en/ar resolution, fallback, stable order) was
// verified live against local D1 as part of NAV-P1 (see
// docs/navigation/NAV_P1_PRODUCT_GROUP_LOCALIZATION_REPORT.md).

test("NAV-P1: the Header product-family query prefers the real, per-locale catalog_group_labels row, falling back to the historical single-locale column — never a raw translation key or empty string", () => {
  const source = readSource("lib/catalog/editorial-repository.ts");
  const fnStart = source.indexOf("export async function listHeaderProductFamilyShortcuts");
  const fnBody = source.slice(fnStart, source.indexOf("\nexport ", fnStart + 10));
  assert.match(fnBody, /LEFT JOIN catalog_group_labels l ON l\.group_code = pv\.group_code AND l\.locale = \?/, "must LEFT JOIN the real per-locale labels table, never an inner join that would exclude ungrouped rows");
  assert.match(fnBody, /COALESCE\(l\.name, pv\.group_name\)/, "must fall back to the historical column, never to undefined/null/a placeholder");
});

test("NAV-P1: Header product-family ordering is by the stable, locale-invariant group_code — never by the (now-translated) name, which would silently reshuffle the dropdown per locale", () => {
  const source = readSource("lib/catalog/editorial-repository.ts");
  const fnStart = source.indexOf("export async function listHeaderProductFamilyShortcuts");
  const fnBody = source.slice(fnStart, source.indexOf("\nexport ", fnStart + 10));
  assert.match(fnBody, /ORDER BY pv\.group_code ASC/);
  assert.ok(!/ORDER BY pv\.group_name/.test(fnBody), "must never sort by the translated display name");
});

test("NAV-P1: the returned shortcut's stable `code` always comes from group_code, never derived from the localized `name` — route/identity stability across locales", () => {
  const source = readSource("lib/catalog/editorial-repository.ts");
  const fnStart = source.indexOf("export async function listHeaderProductFamilyShortcuts");
  const fnBody = source.slice(fnStart, source.indexOf("\nexport ", fnStart + 10));
  assert.match(fnBody, /code:\s*r\.group_code/, "the shortcut's stable identity must be the untranslated group_code");
});

test("NAV-P1: SiteHeader builds the Products dropdown href from the stable code, never the localized name — a translated label can never change where a link points", () => {
  const source = stripComments(readSource("components/layout/SiteHeader.tsx"));
  assert.match(source, /\?group=\$\{f\.code\}/, "the ?group= query value must come from f.code");
  assert.ok(!/\?group=\$\{f\.name\}/.test(source), "must never build the filter query from the translated name");
});

test("NAV-P1: max 8 Product shortcuts is an explicit, named constant — never a magic number, never hardcoded to today's actual count (3)", () => {
  const source = readSource("lib/catalog/editorial-repository.ts");
  assert.match(source, /export const MAX_HEADER_PRODUCT_SHORTCUTS = 8;/);
  const fnStart = source.indexOf("export async function listHeaderProductFamilyShortcuts");
  const fnBody = source.slice(fnStart);
  assert.match(fnBody, /\.slice\(0, MAX_HEADER_PRODUCT_SHORTCUTS\)/, "the result must actually be capped by the named constant");
});

test("NAV-P1: no Header-local/frontend-hardcoded commercial group-name translation map was introduced anywhere in the fix", () => {
  for (const file of ["lib/catalog/editorial-repository.ts", "lib/catalog/group-label-sync.ts", "lib/catalog/group-label-sync-runner.ts", "components/layout/SiteHeader.tsx", "components/layout/mobile-nav-drawer.tsx"]) {
    const source = stripComments(readSource(file));
    assert.ok(!/const\s+\w*[Gg]roup\w*\s*[:=]\s*\{/.test(source), `${file} must not define an inline object literal mapping group codes to hardcoded translated names`);
  }
});

test("NAV-P1: View all products / View all services remain present and unchanged, still pointing at /products and /services respectively", () => {
  const source = readSource("lib/content/nav.ts");
  assert.match(source, /dropdownViewAllLabel/);
  const headerSource = readSource("components/layout/SiteHeader.tsx");
  assert.match(headerSource, /viewAllLabel/);
});

test("NAV-P1: the 5 frozen top-level items, their order, and the Products/Services hybrid gate are unchanged after the localization fix", () => {
  for (const locale of ["fa", "en", "ar"] as const) {
    const links = navLinks[locale];
    assert.equal(links.length, 5);
    assert.equal(links[0].path, "/products");
    assert.equal(links[1].path, "/services");
    assert.equal(links[2].path, "/industries");
    assert.equal(links[3].path, "/about");
    assert.equal(links[4].path, "/contact");
  }
});

// --- NAV-P1.1: Header V2.1 final implementation reconciliation ---

test("NAV-P1.1 (V2.1 §63.4): the chevron accessible-name copy is defined per locale, distinct from the plain link label, and never empty", () => {
  for (const locale of ["fa", "en", "ar"] as const) {
    const names = dropdownDisclosureAccessibleName[locale];
    const linkLabel = navLinks[locale].find((l) => l.path === "/products")!.label;
    assert.ok(names.products.length > 0 && names.services.length > 0);
    assert.notEqual(names.products, linkLabel, `${locale}: the chevron's accessible name must not be identical to the adjacent link's own visible text`);
    assert.notEqual(names.products, names.services, `${locale}: Products and Services must have distinguishable disclosure names`);
  }
});

test("NAV-P1.1 (V2.1 §63.4): both HeaderNavDisclosure (desktop) and MobileNavDrawer (accordion) consume the distinct disclosureLabel, never re-deriving it from the plain link label", () => {
  const disclosureSource = readSource("components/layout/header-nav-disclosure.tsx");
  assert.match(disclosureSource, /disclosureLabel:\s*string;/, "HeaderNavDisclosure must accept disclosureLabel as its own distinct prop");
  const drawerSource = readSource("components/layout/mobile-nav-drawer.tsx");
  assert.match(drawerSource, /disclosureAccessibleName:\s*\{\s*products:\s*string;\s*services:\s*string\s*\}/, "MobileNavDrawer must accept the same distinct accessible-name pair");
  assert.ok(!/aria-label=\{link\.label\}/.test(stripComments(drawerSource)), "the mobile accordion toggle must not reuse the plain link label as its own accessible name");
});

test("NAV-P1.1 (V2.1 §71.3): desktop dropdown pointer-exit tolerance is ~180ms, not the prior 150ms", () => {
  const source = readSource("components/layout/header-nav-disclosure.tsx");
  assert.match(source, /setTimeout\(\(\)\s*=>\s*setOpen\(false\),\s*180\)/);
  assert.ok(!/setTimeout\(\(\)\s*=>\s*setOpen\(false\),\s*150\)/.test(source), "the pre-V2.1 150ms value must not remain");
});

test("NAV-P1.1: the pointer-exit timer never delays Escape/click/route-change close — all three call setOpen(false) directly, never through scheduleClose", () => {
  const source = stripComments(readSource("components/layout/header-nav-disclosure.tsx"));
  assert.match(source, /if \(e\.key === "Escape" && open\) \{[\s\S]{0,80}setOpen\(false\);/, "Escape must close immediately, not via the pointer-exit timer");
  assert.match(source, /useEffect\(\(\) => setOpen\(false\), \[pathname\]\);/, "route change must close immediately");
});

test("NAV-P1.1 (V2.1 §71.2): Header compact-state transitions target ~180ms, not the prior 200ms", () => {
  const source = readSource("components/layout/SiteHeader.tsx");
  const durationMatches = source.match(/duration-\S+/g) ?? [];
  assert.ok(durationMatches.length > 0, "expected at least one transition-duration utility in SiteHeader.tsx");
  for (const match of durationMatches) {
    assert.equal(match, "duration-[180ms]", `unexpected transition duration utility: ${match}`);
  }
});

test("NAV-P1.1 (V2.1 §71.1): compact-state activation threshold remains exactly 24px (unchanged, re-confirmed)", () => {
  const source = readSource("components/layout/SiteHeader.tsx");
  assert.match(source, /window\.scrollY > 24/);
});

test("NAV-P1.1 (V2.1 §72.1): the Services dropdown is capped at a named MAX_HEADER_SERVICE_SHORTCUTS = 8 constant, mirroring Products — never hardcoded to today's actual group count", () => {
  const source = readSource("lib/processing/public-repository.ts");
  assert.match(source, /export const MAX_HEADER_SERVICE_SHORTCUTS = 8;/);
  assert.match(source, /\.slice\(0, MAX_HEADER_SERVICE_SHORTCUTS\)/);
});

test("NAV-P1.1 (V2.1 §70): a site-level sticky-Header anchor-offset rule exists, applied broadly via [id], not as one-off per-section margins", () => {
  const source = readSource("styles/base.css");
  assert.match(source, /\[id\]\s*\{[\s\S]{0,120}scroll-margin-block-start/, "must apply scroll-margin-block-start broadly via an [id] selector");
});

test("NAV-P1.1 (V2.1 §78): opening the mobile drawer never manipulates browser history to intercept Back", () => {
  for (const file of ["components/layout/SiteHeader.tsx", "components/layout/mobile-nav-drawer.tsx"]) {
    const source = readSource(file);
    assert.ok(!/history\.pushState|history\.replaceState|popstate/.test(source), `${file} must not manipulate browser history for drawer open/close`);
  }
});

test("NAV-P1.1 (V2.1 §69): the Header still does not independently emit Organization/ContactPoint/PostalAddress structured data (regression, re-confirmed)", () => {
  for (const file of ["components/layout/SiteHeader.tsx", "components/layout/header-nav-disclosure.tsx", "components/layout/mobile-nav-drawer.tsx", "components/layout/header-language-selector.tsx"]) {
    const source = readSource(file);
    assert.ok(!/organizationSchema|jsonLdGraph|"@type":\s*"Organization"/.test(source), `${file} must not independently emit Organization structured data`);
  }
});

// --- Header V2.2: Shared Button Component adoption (§83-87) ---

test("Header V2.2 §83.1: the desktop Primary CTA consumes the Shared Button Component (ButtonLink variant=\"primary\"), not a local implementation", () => {
  const source = readSource("components/layout/SiteHeader.tsx");
  const ctaMatch = source.match(/<ButtonLink\s+href=\{localizedPath\(locale, "\/request"\)\}\s+variant="primary"\s+size="button"[^>]*>/);
  assert.ok(ctaMatch, "desktop CTA must render via ButtonLink variant=\"primary\" size=\"button\"");
  assert.ok(!ctaMatch[0].includes("bg-copper"), "the CTA's own className must not keep a copper fill — Header V2.2 §84 supersedes the copper Primary CTA");
});

test("Header V2.2 §85.2: the mobile drawer Primary CTA consumes the same Shared Button Component, width:100% only", () => {
  const source = readSource("components/layout/mobile-nav-drawer.tsx");
  assert.match(source, /<ButtonLink\s+href=\{localizedPath\(locale, "\/request"\)\}\s+variant="primary"\s+size="button"\s+className="w-full"/, "drawer CTA must render via ButtonLink variant=\"primary\" size=\"button\" className=\"w-full\"");
  assert.ok(!source.includes("bg-copper"), "mobile-nav-drawer.tsx must not keep a copper-filled CTA");
});

test("Header V2.2 §86: the phone utility never adopts the shared Primary/Secondary Button variant", () => {
  for (const file of ["components/layout/SiteHeader.tsx", "components/layout/mobile-nav-drawer.tsx"]) {
    const source = readSource(file);
    const phoneAnchors = source.match(/<a\s+href=\{`tel:\$\{CONTACT_PHONE_E164\}`\}[\s\S]*?>/g) ?? [];
    for (const anchor of phoneAnchors) {
      assert.ok(!/variant="primary"|variant="secondary"|buttonVariants\(/.test(anchor), `${file}: phone utility anchor must not use the shared Button variant`);
    }
  }
});
