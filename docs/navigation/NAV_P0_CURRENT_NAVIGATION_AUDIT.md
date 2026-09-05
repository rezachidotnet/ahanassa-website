# NAV-P0 — Current Navigation Audit + Frozen-Header Compatibility Gate

# RESULT

READY FOR NAV-P1.

No runtime code was modified in this phase (pure audit). No regression found against the frozen Header architecture — all 38 existing `lib/content/header-frozen-spec-invariants.test.ts` tests pass unchanged, and the full repository suite (826 tests) passes unchanged. Real, evidence-backed navigation gaps were found and are documented below, none of them rising to "so clear a defect that continuing without a fix would be misleading" — each is either a documented pre-existing limitation, a content-completeness item, or a localization gap requiring business/content input, not a code bug.

# PREFLIGHT

- `pwd`: `/Users/reza/Developer/ahanassa-website`
- `git branch --show-current`: `feat/header-frozen-v2`
- `git rev-parse HEAD` at task start: `dbfbb357c215b242a82651cdcf3dcf909c334f2a`
- `git status --short` at task start: empty.
- `git log --oneline --decorate -12` confirmed intact lineage, including prior Header phases: `0900270 docs: record P6/P7 Header services evidence reports`, `4108449 feat: connect Header services to DB_PUBLIC processing groups`, `b18d0a6 wip: checkpoint frozen header v2 before lineage repair`.
- `docs/HEADER_P7_FINAL_VERIFICATION_REPORT.md`, `docs/HEADER_SERVICES_P6_REPORT.md`, and `AHANASSA_HEADER_FINAL_FROZEN_V2.0.md` all verified present.
- No unrelated drift found — proceeded.

# CURRENT NAVIGATION TREE

Source: `lib/content/nav.ts`, `components/layout/SiteHeader.tsx`, `components/layout/mobile-nav-drawer.tsx` — identical structure for FA/EN/AR (one shared component tree, no locale-conditional Header variants, confirmed by test).

```
Desktop (≥1024px, "lg")
├── Products (hybrid: real <Link> to /products + separate chevron <button>)
│   ├── [dropdown, populated from DB_PUBLIC Catalog — see PRODUCTS]
│   └── "View all products" (footer link, same /products destination)
├── Services (hybrid: real <Link> to /services + separate chevron <button>)
│   ├── [dropdown, populated from DB_PUBLIC Processing — see SERVICES]
│   └── "View all services" (footer link, same /services destination)
├── Industries — plain direct link, no dropdown
├── About — plain direct link, no dropdown
├── Contact — plain direct link, no dropdown
├── Phone utility (tel: link, icon-only on mobile, icon+number on desktop)
├── Language selector (FA/EN/AR, text-only, no flags)
└── Primary CTA — "ارسال لیست خرید" → /request (→ 308 redirect → /contact)

Mobile (<1024px)
├── Top bar: Logo · Phone icon · Hamburger trigger
└── Drawer (role="dialog", slides from RTL-right/LTR-left)
    ├── Header row: locale label + Close button
    ├── Products (accordion, single-open with Services)
    │   ├── [same items as desktop dropdown]
    │   └── "View all products"
    ├── Services (accordion, single-open with Products)
    │   ├── [same items as desktop dropdown]
    │   └── "View all services"
    ├── Industries — plain link
    ├── About — plain link
    ├── Contact — plain link
    ├── Phone (tel: link, full row)
    ├── Language switcher (FA/EN/AR, all 3 always shown)
    └── Primary CTA (full-width button)
```

Per-item detail:

| Item | Route | Direct link? | Disclosure trigger? | Child count (local data) | Data source | Zero-data behavior |
|---|---|---|---|---|---|---|
| Products | `/products` | Yes | Yes (separate chevron) | 3 (`SHEET_PLATE`/`SHS`/`REBAR` — real published groups) | `lib/catalog/editorial-repository.ts#listHeaderProductFamilyShortcuts`, DB_PUBLIC Catalog, server-fetched in `app/[locale]/layout.tsx` | Falls back to a plain link, no empty dropdown (verified in code: `HeaderNavDisclosure` returns early when `items.length === 0`) |
| Services | `/services` | Yes | Yes (separate chevron) | 0 in local dev data (`public_processing_groups` table currently empty locally) | `lib/processing/public-repository.ts#listPublicProcessingGroups`, DB_PUBLIC Processing, server-fetched in `app/[locale]/layout.tsx` | Same graceful plain-link fallback — currently exercised in local dev by real (not simulated) empty data |
| Industries | `/industries` | Yes | No | — | Static copy, `lib/content/pages.ts#industriesCopy` | N/A |
| About | `/about` | Yes | No | — | Static copy, `lib/content/pages.ts#aboutCopy` | N/A |
| Contact | `/contact` | Yes | No | — | Static copy + real RFQ form (`components/contact/enquiry-form.tsx`) | N/A |
| Primary CTA | `/request` → 308 → `/contact` | Yes (via redirect) | No | — | `lib/content/nav.ts#primaryCta` | N/A |

# DATA SOURCES

- **Products**: `app/[locale]/layout.tsx` calls `listHeaderProductFamilyShortcuts(locale)` server-side, once per request, passed to `SiteHeader` as a prop. Query: `SELECT DISTINCT pv.group_code, pv.group_name FROM product_variants pv JOIN catalog_products cp ... JOIN product_seo_contents s ... WHERE pv.is_active=1 AND pv.is_public=1 AND [TEMPLATE_PUBLICATION_WHERE_CONDITIONS]` — the exact same publication gate every other public catalog read uses (re-verified: `TEMPLATE_PUBLICATION_WHERE_CONDITIONS` appears in the function body).
- **Services**: `app/[locale]/layout.tsx` calls `listPublicProcessingGroups(locale)` server-side, once per request. Query: `SELECT code, name, sequence FROM public_processing_groups WHERE locale = ? AND is_active = 1 ORDER BY sequence ASC, code ASC`.
- Both queries: zero client-side fetch, zero Odoo-adapter import anywhere in the Header component tree (re-confirmed live by all 38 existing tests, including the explicit "neither SiteHeader nor MobileNavDrawer imports an Odoo adapter" and "no client-side data fetching... no useEffect-driven fetch" tests).
- **Industries/About/Contact/CTA labels**: static TypeScript data (`lib/content/nav.ts`, `lib/content/pages.ts`), no D1 dependency at all.

# ROUTE VALIDITY

All navigation destinations resolve to a real page, confirmed by directory listing and a successful `npm run build` route table (`/:locale/about`, `/:locale/contact`, `/:locale/industries`, `/:locale/markets`, `/:locale/products`, `/:locale/products/:slug`, `/:locale/request`, `/:locale/services` all registered):

| Destination | Exists | Notes |
|---|---|---|
| `/products` | Yes | Real page, DB_PUBLIC-backed, supports `?group=CODE` filtering (`lib/catalog/catalog-filters.ts#parseCatalogFilterParams`) |
| `/products?group=CODE` (dropdown items) | Yes | Same route, filtered — verified the query key is `group` (matching `HeaderProductFamilyShortcut.code`), not `family` (a different, broader classification level) — using the wrong key would silently return zero results; code is correct |
| `/services` | Yes | Real page |
| `/industries` | Yes | Real page, real (if partial) content, `indexable: false` |
| `/markets` | Yes | Real page, NOT in primary nav — reachable only via the Homepage's "Reach" section — see INDUSTRIES/MARKETS |
| `/about` | Yes | Real, distinct brand-positioning content |
| `/contact` | Yes | Real RFQ intake form |
| `/request` | Yes | 308 permanent redirect to `/contact` (deliberate, documented in the route's own file header) |

**Dead routes found: 0. Placeholder/fake routes found: 0.** No `#`-only navigation, no fabricated destination.

# PRODUCTS

Assessment: **B — technically correct but UX-improvable** (see PRIORITIZED FINDINGS #1).

- Source is genuinely DB_PUBLIC Catalog — confirmed, no hardcoded commercial taxonomy remains (`lib/content/header-frozen-spec-invariants.test.ts` explicitly asserts `nav.ts` contains no hardcoded product array, and `SiteHeader.tsx` sources Products from a typed prop).
- Zero-children behavior: correct, falls back to a plain link.
- Ordering: `ORDER BY pv.group_name ASC` inside `listHeaderProductFamilyShortcuts` — alphabetical by the (English) `group_name` string, not owner-curated. With only 3 items this is barely noticeable today, but is worth knowing as the catalog grows: alphabetical-by-English-string ordering will not necessarily match a curated commercial priority order in FA/AR.
- **Real gap**: `group_name` is a single, non-per-locale Odoo string (verified live — the same three English strings, "Sheet & Plate"/"SHS"/"Rebar", are returned regardless of the `locale` parameter passed to the query, since the column itself has no locale dimension). This means the Products dropdown/mobile-accordion shows **untranslated English group names on the Persian and Arabic sites**. This is not a newly-introduced defect — `lib/catalog/editorial-repository.ts`'s own doc comment already discloses it ("group_name is a single Odoo-sourced string, not yet localized... a real, pre-existing gap") — but it had not previously been surfaced specifically as a Navigation-facing localization issue, and it is real and user-visible today.
- Item count today (3: Sheet & Plate, SHS, Rebar) reflects real publication state, not a code limitation — 3 of the catalog's 7 real commercial groups (`REBAR`, `SHS`, `SHEET_PLATE`, `RHS`, `BEAMS`, `SEAMLESS_PIPE` — `RHS`/`BEAMS`/`SEAMLESS_PIPE` currently have no published template) are currently publication-eligible.
- Long-label risk: not currently observable (all 3 current labels are short); worth re-checking once more groups publish, especially in Arabic.

# SERVICES

Assessment: **A — correct as frozen**, currently exercising its real (not simulated) zero-data path.

- Data flow confirmed: DB_PUBLIC Processing (`public_processing_groups`) → `listPublicProcessingGroups` (server) → `SiteHeader`/`MobileNavDrawer` props. No hardcoded `headerServiceGroups` remnant exists anywhere (confirmed by test and by direct source read of `nav.ts`).
- `public_processing_groups` is genuinely empty in this local dev D1 instance (confirmed via direct query) — this is a true zero-data state, not a query bug: the code path already handles it exactly as designed (plain link, no broken empty panel). This local-only observation cannot be generalized to staging/production without remote D1 access, which is out of this audit's authorized scope.
- Localization: `public_processing_groups` has its own `locale` column (unlike Products' `group_name`) — Services names are structurally per-locale-correct by design, once real rows exist. No localization gap here.
- Desktop/mobile parity: identical data, identical fallback behavior, confirmed by reading both `SiteHeader.tsx` and `mobile-nav-drawer.tsx`.

# INDUSTRIES / MARKETS

This is the most nuanced real finding in this audit.

- **Primary nav** uses `/industries` exclusively (`/markets` is explicitly excluded from `navLinks`, enforced by an existing test: `assert.ok(!byPath.has("/markets"), ...)`).
- `/industries` has real content: a hero (honestly worded — "a fuller list of use cases will be published soon," not fabricated) plus a real list of 5 industry categories (construction, re-rolling mills, foundries, fabrication, automotive/machinery) in all 3 locales, genuinely translated (not Persian reused in Arabic).
- `/markets` is **not dead** — it is still linked from the Homepage's "Reach" section (`components/home/reach.tsx`), with its own distinct framing ("Scope of activity" / "دامنه فعالیت," about geographic + industry coverage generally, not specifically "which industries"). This is a deliberate, pre-existing choice (documented in that component's own comment, referencing `DOCUMENT_AUDIT_REPORT.md` DAR-020: it deliberately reuses the real industries list rather than the fabricated country grid the original v0 design had).
- **However**: `/markets`'s own page content is ~70% a verbatim duplicate of `/industries`'s content (the exact same 5-item industries list, same array, just a different heading), plus a "Scope of activity" section that itself says geographic details "will be published soon" — i.e., `/markets` currently has **no unique, complete content of its own** beyond a promise and a duplicate list. Both pages are currently `indexable: false`, so this is not an active SEO cannibalization problem today, but would become one the moment either page is switched to indexable while the other still duplicates it.
- This is **not a broken/dead route** and not a Header defect — the Header's own choice of `/industries` as the primary-nav target is correct and unambiguous. It is a **content-completeness observation** about a page reachable from the Homepage, adjacent to but outside Header navigation scope.

# ABOUT / CONTACT / CTA

- `/about`: genuinely distinct content (brand positioning — "your steel purchasing manager, not a seller or marketplace," what the service is/isn't for). No duplication with Contact.
- `/contact`: real content, and its hero copy ("Send us your invoice or purchase list") is itself the RFQ pitch — this page IS the RFQ intake form (`components/contact/enquiry-form.tsx`, catalog-variant-aware).
- **Primary CTA → `/request` → 308 → `/contact`**: confirmed via direct source read of `app/[locale]/request/page.tsx`, which is explicitly self-documented as "the frozen primary Header CTA destination... this route exists purely so the frozen CTA target resolves to real, working content rather than a 404, via a permanent redirect to the existing form — not a duplicated page." This is a deliberate, already-reasoned interim decision, not a discovery of this audit.
- Net effect: the primary CTA and the "Contact" nav item converge on the exact same real form. Given this site's own product truth (CLAUDE.md §7: "Primary conversion: ارسال فاکتور/لیست خرید — invoice/BOM/material-list submission"), this is **coherent, not redundant** — "Contact" naturally IS "submit your purchase list" for this business, not a generic inquiry page. Flagged here only as an observation per the task's explicit question, not as a defect.

# DESKTOP DISCLOSURE

Verified directly from `header-nav-disclosure.tsx` and confirmed by 38 passing tests:
- Label is always a real `<Link>` to the landing page; the chevron is a separate `<button>` (`aria-expanded`, `aria-controls`, `aria-label`) — structurally cannot degrade into "label with no navigation."
- No `role="menu"`/`"menubar"`/`"menuitem"` anywhere in the Header tree; `aria-haspopup` deliberately absent.
- Opens on hover (with a 150ms pointer-exit close-delay tolerance), click/tap on the chevron, keyboard (native `<button>` activation).
- Escape closes and restores focus to the chevron. Outside click closes (via a `mousedown` listener checking `rootRef.current.contains`). Route change closes (`useEffect(() => setOpen(false), [pathname])`).
- Focus-visible: the dropdown item list never disables the site-wide `:focus-visible` outline (no `outline-none`) — a real prior contrast defect (~1.05:1 background-tint-only cue) already fixed and now pinned by test.

# MOBILE NAVIGATION

Source-verified (real browser re-verification not performed in this audit — P0 explicitly permits source/evidence inspection only):
- Drawer width: `w-[min(88vw,360px)]`, pinned by test.
- Direction-aware: opens from the right in RTL (fa/ar), left in LTR (en) — `sideClass`/`translateClosed` computed from `localeConfig[locale].direction`.
- Scroll lock (`document.body.style.overflow = "hidden"`), manual focus trap (Tab wraps within the drawer's focusable elements), Escape closes, focus restoration to the trigger button on close — all pinned by test and re-confirmed by direct source read.
- Single-open accordion for Products/Services (`useState<"products" | "services" | null>`), exactly one child level (no nested sub-accordion — pinned by test).
- Content order: Logo/Close → primary nav → Phone → Language → CTA, matching the frozen §55.3 order.
- Language switcher: all 3 locales always shown, current locale marked `aria-current="true"`, `role="group"` with an `aria-label` (required since a plain `<div>` has no naming capability without a role).
- Tap targets: phone link (`min-h-11`), CTA (`min-h-11`), language links (`min-h-11`), close/hamburger buttons (`size-11`) — all meet the general ~44px guidance.
- Not independently re-verified in this audit at 320/360/390px in a real browser (P0 scope is source/evidence inspection); the underlying responsive classes (`w-[min(88vw,360px)]`) are viewport-width-relative by construction and were previously verified in Header P7's own real-browser pass per `docs/HEADER_P7_FINAL_VERIFICATION_REPORT.md`.

# RTL / LTR

- `html[dir]` is set once in `app/[locale]/layout.tsx` from `getDirection(locale)` — `fa`/`ar` → `rtl`, `en` → `ltr`. No per-component RTL/LTR branching.
- Drawer side/slide direction is direction-aware (confirmed above).
- Dropdown panel uses logical `start-0` (not `left-0`), so it aligns correctly under the trigger in both directions without a manual RTL override.
- Chevron rotation (`rotate-180` when open) is a symmetric transform, not a directional one — correct for both RTL/LTR since it only communicates open/closed state, not reading direction.
- Language selector: text-only labels (فارسی / English / العربية), no flags (pinned by test — flags would be a common, real RTL/i18n anti-pattern this Header already avoids).
- Mixed technical content: not present in current nav labels (no product codes/grades appear in top-level nav text) — this concern is more relevant to Product Detail pages (already covered by PRICE-P4's bidi work) than to Header navigation itself.

# RESPONSIVE FINDINGS

Source-level review (breakpoints, not a fresh real-browser pass — Header P7 already did a dedicated real-browser responsive verification, referenced above):
- A single breakpoint (`lg`, 1024px) switches the entire shell between mobile (logo/phone-icon/hamburger) and desktop (nav/phone-text/language/CTA) layouts — confirmed deliberate in `SiteHeader.tsx`'s own comment ("using a different breakpoint for phone/language than for nav/CTA/hamburger would leave a broken overlapping state in the tablet range").
- Header height: 72px fixed on mobile, 80px default / ~68px compact-scrolled on desktop (`h-[72px] lg:h-20`, conditionally `lg:h-[68px]`).
- No new breakpoint-collision issue was found by source inspection; nothing in this audit contradicts Header P7's prior real-browser findings. No re-verification defect to report.

# ACCESSIBILITY

Re-confirmed, all previously frozen (not re-litigated, only re-verified unchanged):
- Semantic `<header>`/`<nav aria-label>` — never a clickable generic `<div>` standing in for a link.
- `aria-current="page"` reserved for exact-route matches only (`isCurrentPage`), kept structurally separate from the prefix-based `isActiveSection` visual state — both booleans, never conflated (pinned by test).
- Skip link present, targets `#main-content`, mounted before the Header (pinned by test).
- Modal drawer: `role="dialog"`, `aria-modal="true"`, distinct `aria-label` from the inner `<nav>`'s own label (both are simultaneously exposed while open — deliberately different names, pinned by test).
- Background inerting: `<main>`, `<footer>`, and the Header shell itself all become `inert` while the drawer is open (pinned by test) — a screen reader's browse-mode cursor, which doesn't go through Tab at all, is correctly blocked from reaching backgrounded content.
- Focus-visible outline never disabled anywhere in the dropdown/drawer.
- Icon-only controls (hamburger, mobile phone icon, drawer close) all carry `aria-label`.
- No screen-reader label gap found.

# LOCALIZATION

- Real, evidence-based finding: **Products dropdown group names are not localized** (see PRODUCTS above) — the one concrete localization defect found in this audit.
- Top-level nav labels (Products/Services/Industries/About/Contact) are genuinely, correctly translated per locale in all 3 languages — verified by direct read of `lib/content/nav.ts`; Arabic labels are real Arabic (المنتجات/الخدمات/الصناعات/من نحن/تواصل معنا), not Persian reused.
- Industries page content: genuinely translated in all 3 locales (verified above).
- No inconsistent Products/Services/Industries terminology found across locales (each locale uses one consistent term per concept, no synonym-drift observed).
- Primary CTA English/Arabic text is explicitly self-documented as **not** fully owner-frozen ("§40.8 — should not be assumed to be a literal translation, left for a later localization/UX review") — a known, already-disclosed gap, not a new discovery.

# SEO / CRAWLABILITY

- Every navigation destination is a real `<Link>`/`<a href>` — no `#`-only or JS-only navigation action found anywhere in the Header tree.
- `/industries` and `/markets` (and, per their own metadata calls, `/about`/`/contact`/`/services`/`/products` at this stage) are currently `indexable: false` — a deliberate draft-content gate (per each page's own `generateMetadata`), not a Header/Navigation defect; out of this audit's scope to resolve.
- Canonical route consistency: `/request`'s 308 redirect to `/contact` is the correct HTTP semantics for a permanent CTA-destination alias (matches this project's own established 308-everywhere redirect convention from the pricing-domain migration work).
- No fake button standing in for a real destination.

# PERFORMANCE / SERVER DATA

- Confirmed (again) via direct source read and the existing test suite: Products/Services data is fetched exactly once per request, server-side, in `app/[locale]/layout.tsx` — never inside the client `SiteHeader`/`MobileNavDrawer`/`HeaderNavDisclosure` component tree, never on dropdown open/hover, never via a client `useEffect` fetch, never with a loading state.
- No Odoo adapter import anywhere in the Header component tree (`SiteHeader.tsx`, `header-nav-disclosure.tsx`, `mobile-nav-drawer.tsx`, `header-language-selector.tsx`) — DB_PUBLIC-repository-only.
- No regression found — this remains exactly as Header P6/P7 left it.

# FROZEN HEADER ITEMS

**Must not be reopened without new evidence of an actual defect:**

1. The 5-item top-level nav set and order (Products, Services, Industries, About, Contact) — §58.1, enforced by test (`assert.equal(links.length, 5, ...)`).
2. Products/Services as the only hybrid (link + separate disclosure) items; Industries/About/Contact as plain links — §32.4/§34.2/§37.2, enforced by test.
3. Disclosure Navigation pattern (no `role="menu"`, no `aria-haspopup`, separate chevron button) — enforced by test.
4. Primary CTA Persian text ("ارسال لیست خرید") and route (`/request`) — §40.1/§40.2, enforced by test.
5. Services sourced from DB_PUBLIC Processing, never a hardcoded array — P6, enforced by test.
6. Products sourced from DB_PUBLIC Catalog, never a hardcoded array — §4.2/§58.2, enforced by test.
7. No live fetch on dropdown open; server-side, once-per-request data flow — §52.8/§58.4, enforced by test.
8. WhatsApp is explicitly not a Header utility — §37.5, enforced by test.
9. No country flags in the language selector — §43.3/§58.8, enforced by test.
10. Mobile drawer geometry (`min(88vw, 360px)`), single-open accordion, one child level, scroll lock, Escape, focus restoration — §55.x, enforced by test.
11. One shared Header implementation across all locales — §43.9/§58.7, enforced by test.
12. `aria-current` precision (`isCurrentPage` exact vs. `isActiveSection` prefix) — addendum §8, enforced by test.
13. Distinct `nav`/`drawer` accessible names, background inerting while the drawer is open, SkipLink presence/order — addenda §3/§4/§7, enforced by test.
14. The darker (not lighter) copper hover token for WCAG contrast — addendum §2, enforced by test.
15. `/request` → `/contact` redirect as the correct interim CTA-destination implementation (already reasoned and documented in that route's own file).

# REAL NAVIGATION GAPS

**Genuinely open, requiring an owner decision or future implementation — none are code defects in the sense of "broken," but all are real:**

1. Products dropdown group names are not per-locale (English strings shown on FA/AR sites) — see PRIORITIZED FINDINGS #1.
2. Only 3 of 7 real commercial product groups are currently publication-eligible, narrowing the Products dropdown's real usefulness today — a catalog-editorial completeness item, not a Navigation code gap.
3. Services dropdown currently has no local data to display (verified locally only) — likely a data-population/environment-parity question, not a Navigation code gap.
4. `/markets` content is largely duplicative of `/industries` and incomplete (geographic detail "to be published") — a content-strategy item for whoever owns that page, not a Header defect (the page is correctly excluded from primary nav already).
5. Primary CTA's English/Arabic wording is explicitly not yet owner-frozen (already disclosed, not new).
6. Products dropdown ordering is alphabetical-by-raw-English-string rather than owner-curated priority — currently invisible with only 3 items, worth deciding before the catalog grows further.

# PRIORITIZED FINDINGS

| # | Priority | Finding | Evidence | User impact | Recommended action | Owner decision needed? |
|---|---|---|---|---|---|---|
| 1 | **P2** | Products dropdown group names (`group_name`) are not localized — FA/AR visitors see raw English category names ("Sheet & Plate", "SHS", "Rebar") in the Products dropdown/mobile accordion | Live D1 query: identical English strings returned regardless of `locale` param; `group_name` has no per-locale column anywhere in the schema; already self-documented in `lib/catalog/editorial-repository.ts` as a known gap | Real, visible: a fa-language visitor sees English words inside an otherwise fully-Persian navigation menu | Either (a) accept the current English labels as an interim state (documented, not silently broken), or (b) add a small per-locale label-override table/config (Website-owned, mirroring how `nameFa`/`slugFa` are already Website-owned overlays elsewhere in the Catalog domain) — a scoped, well-bounded NAV-P1 candidate | Yes — whether this is worth fixing now vs. deferred is a product-priority call, not a technical one |
| 2 | P2 | Only 3 of 7 real commercial groups are publication-eligible, so the Products dropdown under-represents the full catalog | Live D1: `RHS`/`BEAMS`/`SEAMLESS_PIPE` templates exist with real variants but no published `product_seo_contents` row | Reduces Products-menu discoverability/completeness for buyers seeking those product lines | Catalog editorial task (publish the remaining templates) — not a Navigation code change | No — this is execution, not a decision |
| 3 | P3 | `/markets` largely duplicates `/industries` content and has no unique complete content yet | Direct comparison of `marketsCopy`/`industriesCopy` — same 5-item industries array reused verbatim; both pages currently non-indexable so no active SEO harm today | Low today (non-indexable); becomes a real duplicate-content risk once either page is indexed | Either complete `/markets`'s own distinct geographic content before indexing it, or fold its "Reach" CTA into `/industries` instead once `/markets` is retired — a content-strategy decision, not urgent | Yes — whether `/markets` has a genuine long-term purpose distinct from Industries |
| 4 | P3 | Primary CTA English/Arabic wording is not yet owner-frozen | Already self-disclosed in `lib/content/nav.ts`'s own doc comment (§40.8) | Low — current wording is a reasonable, non-literal rendering, not wrong, just not signed off | Owner review whenever full EN/AR localization review happens | Yes |
| 5 | P3 | Products dropdown item order is alphabetical by raw English `group_name`, not a curated priority order | Direct source read: `ORDER BY pv.group_name ASC` | Invisible today (3 items); will matter once more groups publish | Decide whether a curated `sort_order`/priority column is worth adding before the dropdown grows past ~5-6 items | Yes, but only becomes urgent later |

**P0 findings: 0. P1 findings: 0. P2 findings: 2. P3 findings: 3.**

No P0 (broken/inaccessible/dead-route/wrong-data) or P1 (conversion/discoverability-blocking) finding was identified anywhere in this audit.

# RECOMMENDED TARGET NAVIGATION

**The current top-level structure is already correct and should not be changed**: Products, Services, Industries, About, Contact, plus the Phone/Language utilities and the primary CTA. This audit found no evidence that any top-level item should be removed, renamed, or reordered — every item has a real, working destination, a clear distinct purpose (Products ≠ Services ≠ Industries ≠ About ≠ Contact, verified content-by-content above), and the frozen architecture already reflects a deliberate, well-reasoned prior design pass (AHANASSA_HEADER_FINAL_FROZEN_V2.0.md), not an ad hoc one.

The only structural recommendation this audit makes is **not** about the top-level nav itself, but about the two P2 dropdown-content gaps (localization of `group_name`, and catalog publication completeness) — both are data/content completeness work, not IA restructuring.

# NAV-P1 IMPLEMENTATION BOUNDARY

**NAV-P1 should be scoped to, at most, one of the P2 findings above** (most likely #1, the Products localization gap, since it's the only one with real user-visible impact today) — pending an explicit owner decision on which (if any) to pursue, per this audit's own recommendation not to guess business priority.

If NAV-P1 proceeds on finding #1 (Products localization), its blast radius should be limited to:
- `lib/catalog/editorial-repository.ts#listHeaderProductFamilyShortcuts` (adding a locale-aware label resolution) and/or a new small Website-owned override table, mirroring the existing `nameFa`/`slugFa` overlay pattern.
- `components/layout/SiteHeader.tsx`/`mobile-nav-drawer.tsx` only to the extent of consuming whatever new field is added (should require no structural change, since `HeaderProductFamilyShortcut.name` already flows straight through as a display string).

**Files that must explicitly remain untouched in NAV-P1** (frozen, verified in this audit, no defect found):
- `components/layout/header-nav-disclosure.tsx` (disclosure interaction pattern)
- `components/layout/mobile-nav-drawer.tsx` (drawer geometry/behavior)
- `components/layout/header-language-selector.tsx`
- `lib/content/nav.ts`'s top-level `navLinks`/`primaryCta` structure (only per-locale wording, never structure)
- `app/[locale]/request/page.tsx` (the redirect is correct as-is)
- Any Hero/Product-Card/Pricing component (explicitly out of this task's scope already)
- `AHANASSA_HEADER_FINAL_FROZEN_V2.0.md` itself

# TEST RESULTS

- `npx tsx --test lib/content/*.test.ts` → **38 pass, 0 fail** (all pre-existing Header-invariant tests, unchanged, re-run as this audit's own regression baseline).
- `npm test` (full repository suite) → **826 pass, 0 fail** (unchanged from the prior phase — no runtime code was touched).
- `npx tsc --noEmit` → clean, 0 errors.
- `npm run build` (`vinext build`) → succeeded, all 11 routes registered correctly (including `/:locale/industries`, `/:locale/markets`, `/:locale/services`, `/:locale/products`, `/:locale/products/:slug`, `/:locale/about`, `/:locale/contact`, `/:locale/request`).

# GIT

No runtime commit — this phase made no code changes, only this audit report. Report commit: recorded after this file is committed — see the final response for its SHA.

# RISKS

- This audit's Products/Services data-source findings (published group count, empty Processing groups) reflect **local dev D1 state only** — staging/production data was not inspected (out of this audit's authorized scope, and this task did not request or authorize remote D1 access). A future phase acting on these findings should re-verify against the actual deployed environment before assuming local-dev state generalizes.
- Mobile/responsive findings in this audit are source-level, not a fresh real-browser pass — Header P7's own prior real-browser verification is the authoritative evidence for that; this audit found nothing to contradict it, but did not independently re-run it.
- The `/markets` duplication risk is currently latent (both pages non-indexable) — if either page's `indexable` flag changes independently of the other in a future phase, this should be re-evaluated before that ships.

# NEXT PHASE

NAV-P1, if authorized, should address at most one of the two P2 findings (most likely Products dropdown localization, #1), scoped exactly as described in NAV-P1 IMPLEMENTATION BOUNDARY above, after an explicit owner decision on priority. No P0/P1 finding exists that would force NAV-P1 to happen — this audit's own recommendation is that the current navigation is fundamentally sound, and the identified gaps are genuinely optional, prioritizable work, not defects blocking anything.
