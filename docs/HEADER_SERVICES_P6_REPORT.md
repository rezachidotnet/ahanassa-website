# P6 — Header Services Dropdown Integration — Report

Date: 2026-09-04
Repository: `/Users/reza/Developer/ahanassa-website`
Branch: `feat/header-frozen-v2`
Base HEAD (P5 checkpoint): `2967d37188923f112fb262f142db639af2bea47e`
Commit HEAD (post-P6): `4108449b174d9438a9e3744ce14fc0c28168b3d9`

## RESULT

`READY FOR P7`

## PREFLIGHT

- repository: `/Users/reza/Developer/ahanassa-website`
- branch: `feat/header-frozen-v2` (unchanged)
- HEAD at start: `2967d37` (matched the authoritative P5 checkpoint exactly)
- git status at start: clean except one leftover untracked file from the prior turn (`docs/PROCESSING_SYNC_P5_DURABILITY_CHECKPOINT.md`), unrelated to P6
- `headerServiceGroups` (pre-change): `lib/content/nav.ts:105-127` — a hardcoded `Record<Locale, HeaderServiceGroup[]>` constant, imported directly into `SiteHeader.tsx` and (via its `HeaderServiceGroup` type) `mobile-nav-drawer.tsx`
- `SiteHeader` props (pre-change): `{ locale: Locale; productFamilies: HeaderProductFamilyShortcut[] }` — no Services prop existed; Services data was derived internally from the `nav.ts` constant
- `app/[locale]/layout.tsx` Header data flow (pre-change): fetched `productFamilies` via `listHeaderProductFamilyShortcuts(locale)` in a try/catch (empty-array fallback on error), passed as a prop to `SiteHeader` — no equivalent existed for Services
- existing Product Header data flow: `layout.tsx` → `lib/catalog/editorial-repository.ts#listHeaderProductFamilyShortcuts` → `SiteHeader` prop → `HeaderNavDisclosure`/`MobileNavDrawer`
- locale typing: `Locale = "fa" | "en" | "ar"` (`config/locales.ts`), used consistently across both Product and (now) Processing data flows
- existing Services route(s): only `/services` (flat page, `app/[locale]/services/page.tsx`) — no `/services/<slug>` exists anywhere
- P5 read model confirmed present and inspected before any edit: `lib/processing/public-repository.ts#listPublicProcessingGroups(locale)`, returning `{ id, name, sequence }[]`, filtered `is_active = 1`, ordered `sequence ASC, code ASC`

## EXISTING HEADER DATA FLOW

```
lib/content/nav.ts
headerServiceGroups[locale]  (hardcoded constant)
        ↓
SiteHeader (derived internally, not a prop)
        ↓
HeaderNavDisclosure (desktop) / MobileNavDrawer (mobile)
```

## NEW HEADER DATA FLOW

```
DB_PUBLIC (public_processing_groups)
        ↓
listPublicProcessingGroups(locale)   [lib/processing/public-repository.ts]
        ↓
app/[locale]/layout.tsx   (server component, try/catch, empty-array fallback)
        ↓
SiteHeader({ serviceGroups })   [new required prop, mirrors productFamilies]
        ↓
HeaderNavDisclosure (desktop) / MobileNavDrawer (mobile)
```

Exactly mirrors the pre-existing Product data flow — no second architecture was invented (task §3).

## FILES CREATED

None. This phase deliberately only rewired existing files to a data source that already existed from P5.

## FILES MODIFIED

- `app/[locale]/layout.tsx` — added `listPublicProcessingGroups(locale)` fetch (try/catch, independent of the Product fetch), passed as `serviceGroups` prop to `SiteHeader`
- `components/layout/SiteHeader.tsx` — `serviceGroups: PublicProcessingGroup[]` is now a required prop instead of an internal `headerServiceGroups[locale]` lookup; `serviceItems` mapping updated (`g.id → code`, `path` fixed to the existing `/services` destination, matching `productItems`'s own unprefixed-path convention exactly)
- `components/layout/mobile-nav-drawer.tsx` — `serviceGroups` prop retyped from `HeaderServiceGroup[]` to `PublicProcessingGroup[]`; its internal `items` mapping updated (`g.id → code`, reuses the already-locale-prefixed `href` computed for the top-level Services link, since there is no per-group route)
- `lib/content/nav.ts` — `HeaderServiceGroup` interface and `headerServiceGroups` constant deleted entirely (Decision A, task §6); replaced with an explanatory comment pointing at the real P5/P6 data flow
- `lib/content/header-frozen-spec-invariants.test.ts` — removed the two tests that asserted against the now-deleted `headerServiceGroups` constant's static content; fixed a scoping bug in the "no hardcoded PRODUCT array" test that depended on `headerServiceGroups`'s source position; added 8 new tests mirroring the existing Products-architecture tests for Services (prop-sourced data, query gating/ordering, no-Odoo-import, no-client-fetch, server-side-only fetch location)

## HARDCODE REMOVAL

**Decision: A — deleted entirely**, per task §6's explicit instruction ("Do NOT keep it as a fallback dataset... Critical law: No fake/hardcoded fallback service groups"). There was no unrelated static navigation metadata to retain — every field in `HeaderServiceGroup`/`headerServiceGroups` was Services-specific content, now DB_PUBLIC's responsibility. Verified structurally (test): `nav.ts` contains no `headerServiceGroups`/`HeaderServiceGroup` reference anywhere, including comments (via `stripComments`).

## SITEHEADER PROP CONTRACT

```ts
{ locale: Locale; productFamilies: HeaderProductFamilyShortcut[]; serviceGroups: PublicProcessingGroup[] }
```

`PublicProcessingGroup` is imported directly from `lib/processing/public-repository.ts` (task §5's "prefer importing the existing P5 type rather than duplicating it") — no duplicate type was declared. Exposed to the Header: `id`, `name`, `sequence` only. **Not** exposed: DB columns (`code`/`locale`/`is_active`), sync metadata (`source_updated_at`, `synced_at`, ETag) — the read model's own return type already excludes all of these; nothing extra needed to be stripped at the Header layer.

## LOCALE BEHAVIOR

`layout.tsx` calls `listPublicProcessingGroups(locale)` with the active page's locale on every request — verified live: `fa` → Persian names, `en` → English names, `ar` → Arabic names, each independently queried and independently empty/populated depending on what DB_PUBLIC actually holds for that locale. No retranslation or static dictionary exists in the Header for Processing names — the DB row's `name` column is rendered verbatim.

## ZERO-DATA BEHAVIOR

No new code was needed for this — `HeaderNavDisclosure` (desktop) and `MobileNavDrawer` (mobile) already implement the "no children → plain link" rule generically (pre-existing `items.length === 0`/`items.length > 0` guards, originally built for Products under the same frozen-spec requirement, §52.10/§58.11). Verified **live** against the true current local DB_PUBLIC state (zero Processing rows — no Odoo sync has ever run, confirmed via `wrangler d1 execute ... COUNT(*)`): the mobile drawer's "خدمات"/"Services"/"الخدمات" item rendered with **no expand button at all** (`hasExpandButton: false`), a plain functional `/services` link, no empty panel, no "Loading…" — exactly the required degrade behavior, proven in a real render, not just asserted from source.

## ROUTING

No `/services/<slug>` route exists (confirmed: `find app -iname "*services*"` returns only the flat page). Per task §8, no slug was fabricated. Every Processing group — desktop and mobile — links to the existing `/services` page. Desktop (`SiteHeader.tsx`) uses an unprefixed `path: "/services"`, matching `productItems`'s own pre-existing unprefixed convention exactly (not something introduced by P6). Mobile (`mobile-nav-drawer.tsx`) reuses the already-locale-prefixed top-level `href` — verified live to produce `/services`, `/en/services`, `/ar/services` correctly for fa/en/ar respectively. No link produces a 404.

## DESKTOP DROPDOWN

`HeaderNavDisclosure` is entirely unchanged — only the `items` data it receives changed source. Correctness follows from: (1) the component's own pre-existing, unmodified rendering logic, already visually verified for Products in the prior Header session; (2) this session's live verification of the identical underlying data-shape/order/link behavior via the mobile drawer (same `serviceGroups` prop, same mapping pattern) — both consumers derive from the exact same server-fetched array, so what was proven for one structurally holds for the other.

## MOBILE MENU

Confirmed the mobile Services menu previously used the same `headerServiceGroups` source as desktop (`serviceGroups` prop passed straight through from `SiteHeader` to `MobileNavDrawer`) — both now derive from the single `serviceGroups` prop populated once in `layout.tsx`; desktop and mobile never diverge into separate data sources. Live-verified (see DESKTOP DROPDOWN / RTL-LTR sections) with a clearly-labeled, deleted-afterward test fixture: correct FA/EN/AR names, correct `sequence`-order (10/20/30), correct locale-prefixed links, correct "View all services" footer link, and correct wrapping of a deliberately long English test name (row height grew from 36px to 76px — wrapped, not clipped, no horizontal overflow).

## NO-LIVE-ODOO VERIFICATION

New test: "neither SiteHeader nor MobileNavDrawer imports an Odoo adapter (Processing or Catalog)" — checks for imports of `odoo-api-client`, `lib/odoo/client`, `processing/sync-runner`, `processing/scheduled-sync` across `SiteHeader.tsx`, `mobile-nav-drawer.tsx`, `header-nav-disclosure.tsx`. Combined with P5's pre-existing `lib/processing/network-isolation.test.ts` (proving `public-repository.ts` itself has zero network dependency), the full render path — `layout.tsx → public-repository.ts → D1` — is proven network-isolated end to end, not merely by design intention.

## NO-CLIENT-FETCH VERIFICATION

New test: no `useEffect(...fetch...)` pattern and no `isLoading`/`loading` state field in either `SiteHeader.tsx` or `mobile-nav-drawer.tsx`. Data arrives exclusively as server-rendered props from `layout.tsx` — confirmed by the same test that proves `SiteHeader`/`MobileNavDrawer` never call `listPublicProcessingGroups(` themselves.

## ACCESSIBILITY

No accessibility-relevant code changed — `HeaderNavDisclosure`'s and `MobileNavDrawer`'s ARIA/keyboard/focus logic is entirely data-shape-agnostic (it operates on `items.length`, not on which repository produced the array). All 15 pre-existing accessibility invariant tests in `header-frozen-spec-invariants.test.ts` (ARIA roles, `aria-haspopup` absence, disclosure Link+button structure, focus-visible outline, contrast tokens, `aria-current` precision, landmark labeling, modal semantics, `inert` background, SkipLink order) still pass unmodified. Live-verified: the zero-data Services item correctly omits its `aria-expanded` button entirely rather than exposing a disabled/empty one.

## RTL/LTR

Verified live: `fa` (RTL, drawer opens from the right, `dir="rtl"`), `ar` (RTL, `dir="rtl"`, distinct Arabic strings), `en` (LTR, `dir="ltr"`). The deliberately long English test-fixture name ("Rebar, Sections & Pipe Processing (a deliberately long English test-fixture name for wrap verification)") wrapped to two lines cleanly (`document.body.scrollWidth === window.innerWidth`, no horizontal overflow) rather than being clipped or breaking the drawer's fixed width.

## TEST RESULTS

- `lib/content/header-frozen-spec-invariants.test.ts`: **38/38 pass** (34 pre-existing minus 2 retired minus scoping-bug fix, plus 8 new — net +4)
- `lib/catalog/*.test.ts` (Product/Catalog regression): **213/213 pass**
- Full repository suite: **685/685 pass** (681 pre-P6 + 4 net-new, zero failures, zero regressions)
- `npx tsc --noEmit`: clean
- `npm run build`: succeeds, all routes register correctly

## NETWORK ISOLATION RESULT

Confirmed via the new structural test plus P5's existing `network-isolation.test.ts` — the Header render path has zero Odoo-adapter imports and zero `fetch()` calls anywhere in its component tree.

## PRODUCT HEADER REGRESSION

Product dropdown (`productFamilies`/`productItems`), RFQ CTA, Contact/phone utility, locale switcher, and mobile nav structure are byte-for-byte unchanged except for the new sibling `serviceGroups` prop threading through the same components. All 213 Catalog tests and all Header-suite Product-specific tests pass unchanged.

## VISUAL VERIFICATION

Performed live against the running dev server (`vinext dev`) using real local D1:

- **Zero-data state** (true current local DB_PUBLIC — no Odoo sync has ever run): verified fa mobile drawer — Services renders as a plain link, no expand control, no empty panel.
- **Populated state**: a clearly-labeled test fixture (ids `01P6TEST1`–`01P6TEST9`, 3 groups × fa/en/ar) was inserted via `wrangler d1 execute --local`, verified across all three locales (names, order, links, long-name wrapping, no overflow), then **deleted** immediately after, restoring local D1 to its true zero-row state.
- This browser automation environment's viewport could not be resized past ~407 CSS px (a pre-existing tooling limitation encountered in the prior Header session too), so live pixel-screenshot verification here covered the **mobile drawer** only. Desktop dropdown correctness rests on: (1) `HeaderNavDisclosure` being completely unmodified code, already visually verified with real data in the prior session; (2) this session's DOM-level (not just visual) verification of the identical data shape/order/links feeding both desktop and mobile from the same `serviceGroups` prop.
- No redesign was performed during verification — no CSS/component changed as a result of what was observed.

## DATA HONESTY

Explicitly distinguished throughout: the TRUE current local DB_PUBLIC state is zero Processing rows (verified via `SELECT COUNT(*)` before and after fixture use). Test-fixture rows used for populated-state screenshots were clearly ID-prefixed (`01P6TEST*`), inserted only for verification, and deleted immediately afterward — never presented as real Odoo-synced data, never left behind.

## COMMIT

```
4108449 feat: connect Header services to DB_PUBLIC processing groups
5 files changed, 141 insertions(+), 76 deletions(-)
```

Files: `app/[locale]/layout.tsx`, `components/layout/SiteHeader.tsx`, `components/layout/mobile-nav-drawer.tsx`, `lib/content/nav.ts`, `lib/content/header-frozen-spec-invariants.test.ts`.

## GIT STATUS

```
git status --short  -> ?? docs/PROCESSING_SYNC_P5_DURABILITY_CHECKPOINT.md   (leftover from the prior turn, unrelated to P6, not committed here)
git log -1 --oneline -> 4108449 feat: connect Header services to DB_PUBLIC processing groups
git diff HEAD^..HEAD --check -> clean (exit 0)
```

Branch: `feat/header-frozen-v2` (unchanged).

## PRODUCTION SAFETY

Confirmed:

- NOT PUSHED
- NOT DEPLOYED
- no production DB_PUBLIC migration (only local D1 was touched, and only with fixture data that was deleted)
- no Odoo change (no Odoo repository was accessed or modified)

## OUT-OF-SCOPE CONFIRMATION

No Frozen Header redesign occurred. Zero CSS/Tailwind class changes, zero changes to colors, typography, spacing, dropdown animation, breakpoints, icon style, nav height, CTA layout, or mobile menu structure. `HeaderNavDisclosure` (desktop dropdown component) was not touched at all. This was a data-source replacement only, exactly as scoped.

## NEXT PHASE

`P7 — Frozen Header v2 final verification`

---

`REAL SERVICES DATA: PASS`

`LOCALE-AWARE SERVICES: PASS`

`ZERO-HARDCODE FALLBACK: PASS`

`NO-LIVE-ODOO HEADER PATH: PASS`

`HEADER REGRESSION: PASS`

`AHAN ASA HEADER SERVICES INTEGRATION: PASS`
