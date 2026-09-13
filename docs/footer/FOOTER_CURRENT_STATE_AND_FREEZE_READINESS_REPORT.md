# Footer Current-State and Freeze-Readiness Report (FOOTER-P0)

Date: 2026-09-13
Task type: read-only application audit + docs import + durable report. No runtime code was modified.

---

# RESULT

**READY** — for FOOTER-P1 scoping. This is a reconciliation/audit deliverable, not implementation. No blocking ambiguity was found; several owner decisions remain genuinely open (see OWNER DECISIONS STILL REQUIRED) but none of them prevents scoping a narrow P1.

---

# PREFLIGHT

```text
pwd:     /Users/reza/Developer/ahanassa-website
branch:  feat/header-hero-integrated
HEAD:    6f09e721e6d2c8db36152d4a337042dd18aefcea
status:  clean (before this task's own docs commits)
```

Matches the owner report's expected branch and latest known HEAD (`6f09e72`) exactly. Working tree was clean before this task began; no reset/discard was needed or performed.

---

# BASE SHA

`6f09e721e6d2c8db36152d4a337042dd18aefcea`

---

# SOURCES READ

In the order read:

1. `PROJECT_OVERRIDES.md` (v2.4.0) — full read.
2. `CLAUDE.md` (root, v1.2.0) — full read (provided as system context).
3. `01-sources/CLAUDE.md` (nested historical copy, v2.1.0) — provided as system context; treated as part of the `01-sources` consolidated corpus, subordinate to the root `CLAUDE.md` per root `CLAUDE.md` §2's precedence stack. No conflict between the two changed this task's conclusions.
4. `DOCS_INDEX.md` — targeted read (Footer entry, route-naming note).
5. `01-sources/DO_NOT_CHANGE.md` §9 (Localization) and §16 heading (Technical Architecture) — read as instructed; nothing in either blocks a read-only audit.
6. `DOCUMENT_AUDIT_REPORT.md` — grepped for Footer-related findings (see below); no dedicated Footer DAR entry exists yet.
7. `01-sources/FOOTER_SPEC.md` — full read (all 1343 lines).
8. `docs/footer/AHANASSA_FOOTER_RECONCILIATION_REVIEW_V1.0.md` — full read (the newly imported review itself).
9. `docs/homepage/AHANASSA_HOMEPAGE_COMPOSITION_AND_CUSTOMER_JOURNEY_FREEZE_V1.0.md` — targeted read (Footer as global shell element).
10. `docs/final-cta/AHANASSA_FINAL_CTA_COMPONENT_FREEZE_V1.0.md` — targeted read (§9 Footer boundary).
11. `docs/final-cta/FINAL_CTA_P1_V1_0_IMPLEMENTATION_REPORT.md` — targeted read (CTA ownership / duplicate-CTA check, Footer boundary section).
12. `docs/homepage/HOMEPAGE_HP_R1_RECONCILIATION_IMPLEMENTATION_REPORT.md` — targeted read (existing "FOOTER FOLLOW-UP" section — a prior, independent finding of the same two defects this audit reconfirms).
13. `docs/discoverability/AI_SEARCH_GEO_G0_FOUNDATION_AUDIT_REPORT.md` — targeted read (the original GEO-G0 finding behind the stale-taxonomy/localization defects).
14. Actual repository code: `components/layout/SiteFooter.tsx`, `app/[locale]/layout.tsx`, `app/[locale]/page.tsx`, `components/home/final-cta.tsx`, `components/ui/cta-band.tsx`, `lib/content/nav.ts`, `lib/content/catalog-sample.ts`, `lib/content/contact-channels.ts`, `lib/metadata/site.ts`, `app/[locale]/products/page.tsx`, `lib/content/pages.ts`, `components/contact/faq-section.tsx`, `components/icons/whatsapp-icon.tsx`, route directory listing under `app/[locale]/`, `package.json`.

No P0 finding in `DOCUMENT_AUDIT_REPORT.md` blocks this task.

---

# REVIEW IMPORT

| Field | Value |
|---|---|
| Source path | `~/Downloads/AHANASSA_FOOTER_RECONCILIATION_REVIEW_V1.0.md` |
| Candidates found in `~/Downloads` | 1 (`AHANASSA_FOOTER_RECONCILIATION_REVIEW_V1.0.md`); a differently-named `cyansteel-mega-menu-footer-ux-specification-v1.0.md` also exists but is a distinct document, not a duplicate/variant of the review — not imported |
| Size | 7,355 bytes |
| SHA-256 (source) | `e57a49b9fc4b33e4a3349670844bc6ac3df54d9c00372e84c86e0e8e71f96053` |
| Target path | `docs/footer/AHANASSA_FOOTER_RECONCILIATION_REVIEW_V1.0.md` |
| SHA-256 (target) | `e57a49b9fc4b33e4a3349670844bc6ac3df54d9c00372e84c86e0e8e71f96053` — **matches** |
| Import commit | `cb473a9c7c0c522129a0b3d9d42fd7bf89144037` — "docs: import Footer reconciliation review V1.0" |

No ambiguity: exactly one matching candidate file existed, so no hash-comparison/disambiguation was required.

---

# FOOTER SPEC STATUS

`01-sources/FOOTER_SPEC.md` header states explicitly: **"Status: Draft v1.0 — Normative implementation contract."** `DOCS_INDEX.md` lists it as `ACTIVE`, which in this repository's vocabulary means *currently governing / not superseded* — it does **not** mean the document itself has been promoted to a final frozen spec. Per the imported review and this task's explicit instruction, **FOOTER_SPEC.md is not called final/frozen here.** It remains the correct normative reference; its content is broadly still accurate and is what this report audits the implementation against.

---

# ACTUAL FOOTER ARCHITECTURE

Exactly one Footer-related component exists in the codebase:

```text
components/layout/SiteFooter.tsx   — the only Footer component; server component (no "use client")
```

No `FooterCTA`, `ClosingCta`, `ConversionBand`, or any equivalently-named component exists anywhere in `components/` (grep-confirmed; independently reconfirmed by `docs/final-cta/FINAL_CTA_P1_V1_0_IMPLEMENTATION_REPORT.md`'s own "DUPLICATE CTA CHECK" section). FOOTER_SPEC.md's `FooterCTA` design (§6) was never implemented as a standalone component under that name.

`SiteFooter` is rendered exactly **once**, globally, in `app/[locale]/layout.tsx:88`, inside the shared locale layout — i.e. it is a shell component applied to every route under `app/[locale]/**`, not opted into per-page. There is no page-level override or suppression mechanism (FOOTER_SPEC.md §6.4's placement exceptions — RFQ page, confirmation page, legal pages, error pages — are **not implemented**; every page gets the identical Footer).

The functional equivalent of FOOTER_SPEC.md's pre-footer `FooterCTA` band is a **different, pre-existing component**, `components/ui/cta-band.tsx` (`CtaBand`), which:

- is rendered page-by-page (not globally) on `/products`, `/products/[slug]`, `/industries`, `/markets`, `/about`, `/services`;
- is **not** rendered on the Homepage (replaced there by `FinalCta`, see below);
- both of its actions (`primary`, `secondary`) resolve to `/contact`, not to the canonical `/request` RFQ route — noted for completeness; out of this task's Footer-only scope, not a Footer defect.

---

# HOMEPAGE CTA OWNERSHIP

**HOMEPAGE DUPLICATE CTA: ABSENT.**

`app/[locale]/page.tsx` composition (verified by direct read, lines ~181–191):

```text
Hero -> PriceStrip[conditional] -> ProductShowcase -> BuyerValue -> Industries[conditional] -> FinalCta -> (JsonLd, non-visual) -> [layout.tsx] SiteFooter
```

- The file imports `FinalCta` from `@/components/home/final-cta`; it does **not** import `CtaBand` or `@/components/ui/cta-band` (a text mention of "CtaBand" appears only inside a code comment documenting the supersession history, not as an import/usage).
- `FinalCta` is the last content section before the global `SiteFooter`, with a documented, deliberate boundary treatment (see below).
- This was already independently, structurally and at-runtime verified in `docs/final-cta/FINAL_CTA_P1_V1_0_IMPLEMENTATION_REPORT.md` ("DUPLICATE CTA CHECK" section): source has exactly one `<FinalCta`, zero `<CtaBand`; SSR HTML for `/`, `/en`, `/ar` contains `aria-labelledby="home-final-cta-heading"` exactly once and zero occurrences of the old CtaBand copy. This report's own source-level check (import list, JSX composition) is consistent with that prior runtime verification.

No structure B (Final CTA → FooterCTA → SiteFooter) or other duplicate exists.

---

# OTHER-PAGE CTA OWNERSHIP

**SHARED FOOTERCTA OUTSIDE HOMEPAGE: ABSENT** (because no component named `FooterCTA` exists at all, on the Homepage or anywhere else).

The nearest real analogue, `CtaBand`, **is** shared and **is** still valid outside the Homepage:

| Consumer page | Renders `CtaBand`? |
|---|---|
| `/` (Homepage) | No — uses `FinalCta` instead |
| `/products` | Yes |
| `/products/[slug]` | Yes |
| `/industries` | Yes |
| `/markets` | Yes |
| `/about` | Yes |
| `/services` | Yes |

`cta-band.tsx` was zero-bytes-changed by the Final CTA work (confirmed in `FINAL_CTA_P1_V1_0_IMPLEMENTATION_REPORT.md`) and remains the closing CTA for all six of those pages, immediately followed by the same global `SiteFooter` from `layout.tsx`. **Do not globally remove `CtaBand`** — it is still load-bearing for six live pages, consistent with the review's §3 instruction to "retain existing behavior outside Homepage pending a separate cross-site CTA decision."

Because `SiteFooter` itself is rendered once in the shared layout (not per-page), any future Footer fix (content, links, localization) is automatically applied to all pages simultaneously — there is no per-page Footer variant to keep in sync.

---

# SITEFOOTER STRUCTURE

Actual rendered structure (`components/layout/SiteFooter.tsx`), one `<footer className="bg-navy text-white">` landmark containing, in DOM order:

1. Brand block (`lg:col-span-4`): 32×32 square mark image (`aria-hidden`, decorative) + site name text + role-statement paragraph + tagline (`siteConfig.tagline`).
2. "Products" `<nav aria-label>` (`lg:col-span-3`): `<h2>` + list of the four sample category links + one "full catalog" link.
3. "Company" `<nav aria-label>` (`lg:col-span-2`): `<h2>` + the same 5 links as the global Header nav (`/products`, `/services`, `/industries`, `/about`, `/contact`).
4. Office/address block (`lg:col-span-3`): `<h2>` + `<address>` with two address lines, plus a second `<h2>` "Incoterms" heading + a row of six standard trade-term codes (FOB/CFR/CIF/FCA/DAP/EXW).
5. A bordered utility row containing only a single copyright paragraph.

No `FooterContact` phone/email/WhatsApp block, no `FooterSocialLinks`, no `FooterUtilityRow` legal-links row (privacy/terms), no locale switcher, no CTA of any kind inside `SiteFooter` itself.

Responsive: `grid gap-12 py-16 md:grid-cols-2 lg:grid-cols-12 lg:py-20` — stacks to one column below `md`, two columns at `md`, full 12-column allocation at `lg`. This is a structural/compiled-CSS read, not a browser-verified one (see RESPONSIVE / VISUAL CHECKS below).

Locale handling: locale-keyed `copy` record with genuinely distinct FA/EN/AR strings for role statement, group headings, office label, address lines, and the rights phrase (not machine-duplicated Persian) — **except** the four sample-category labels and the site name, discussed under LOCALIZATION below.

Server-rendered: `SiteFooter` has no `"use client"` directive; all navigation uses real `next/link` `<Link>` / real anchor elements — no client-only routing.

---

# LOGO

| Item | Value |
|---|---|
| Asset actually used | `public/brand/ahan-asa-mark.jpg` (32×32, `aria-hidden`, decorative — accessible name comes from the adjacent site-name text, not the image) |
| Source-of-truth originals | `/logo/AhanAsa logo-13.jpg`, `/logo/AhanAsa logo-14.jpg` (immutable per `PROJECT_OVERRIDES.md` §6.1) |
| Locale variants | **None.** One neutral square mark is used identically for `fa`/`en`/`ar`, and identically in both `SiteHeader` and `SiteFooter` |

This is confirmed (by a code comment in `SiteHeader.tsx`) to be an intentional, verified choice — only a square mark exists among the approved source files, with no separate wordmark/lockup — not an oversight. FOOTER_SPEC.md §7.4's "reversed Persian lockup" is explicitly one of the items `01-sources/FOOTER_SPEC.md` §30 lists as **not yet approved**, so using the single available neutral mark is the correct current behavior, not a gap to fix in P0/P1.

---

# ROLE STATEMENT

| Locale | Value |
|---|---|
| FA (spec/review baseline) | «مدیریت حرفه‌ای خرید و تأمین آهن برای پروژه‌ها و کسب‌وکارها.» |
| FA (actual, `SiteFooter.tsx`) | «مدیریت خرید حرفه‌ای فولاد — بررسی، تأمین و هماهنگی خرید شما.» |
| EN (actual) | "Professional steel procurement management — reviewing, sourcing, and coordinating your purchase." |
| AR (actual) | «إدارة احترافية لشراء الصلب — مراجعة وتوريد وتنسيق عملية الشراء الخاصة بك.» |

The implemented Persian wording is **not verbatim** the review's baseline sentence, but preserves the same procurement-management meaning (FOOTER_SPEC.md §7.2 explicitly allows refinement as long as that meaning is kept — "must not be reduced to 'فروش آهن'"). EN and AR are genuine, distinct translations of the same meaning, not omitted and not literal copies of the Persian. **No localization gap on the role statement itself.**

---

# ROUTE MATRIX

Published route directories under `app/[locale]/` (verified by directory listing, all three locales served via the `[locale]` dynamic segment + `generateStaticParams` over `fa`/`en`/`ar`):

| Destination | Published? | Notes |
|---|---|---|
| Products (`/products`) | Yes | Real DB_PUBLIC-backed catalog listing |
| Product detail (`/products/[slug]`) | Yes | |
| Services (`/services`) | Yes | |
| Industries (`/industries`) | Yes | |
| Markets (`/markets`) | Yes (page exists) | No longer in primary nav — `/industries` supersedes it as the primary-nav target per `lib/content/nav.ts` comment; the page itself is untouched and still reachable |
| About (`/about`) | Yes | |
| Contact (`/contact`) | Yes | Also hosts the FAQ content (see below) |
| RFQ / request (`/request`) | Yes | Canonical RFQ destination used by Hero/Header/FinalCta |
| FAQ (`/faq`) | **No** | No dedicated route; FAQ content lives inline on `/contact` (see FAQ section) |
| Process (`/process`) | **No** | No route directory exists |
| Privacy | **No** | No route directory exists |
| Terms | **No** | No route directory exists |

Footer currently links only to: the 4 sample category filter links + "full catalog" (`/products`), and the same 5 links as the Header (`/products`, `/services`, `/industries`, `/about`, `/contact`). It does **not** link to `/request`, `/markets`, or any legal page.

---

# PRODUCT / TAXONOMY LINKS

**STALE PRODUCT/TAXONOMY LINKS: YES.**

`SiteFooter.tsx` renders, for every page on the site, in every locale:

```text
{locale-path}/products?category=long
{locale-path}/products?category=flat
{locale-path}/products?category=semi
{locale-path}/products?category=raw
```

`app/[locale]/products/page.tsx` reads its filters through `parseCatalogFilterParams(rawParams)` (`lib/catalog/catalog-filters.ts`), which recognizes only `family`, `group`, `form`, `grade`, `standard`. **`category` is not a recognized key at all** — it is silently ignored, `hasActiveFilters` evaluates `false`, and all four links resolve to the identical, unfiltered `/products` listing while visually presenting themselves as four distinct category destinations.

| Label | href / query | Recognized by real parser? | Classification |
|---|---|---|---|
| مقاطع طولی / long | `?category=long` | No | **NO-OP** |
| مقاطع تخت / flat | `?category=flat` | No | **NO-OP** |
| محصولات نیمه‌ساخته / semi | `?category=semi` | No | **NO-OP** |
| مواد اولیه و آلیاژها / raw | `?category=raw` | No | **NO-OP** |
| "full catalog" | `/products` (no query) | N/A | VALID |

This is not a new discovery — it is independently documented in `docs/discoverability/AI_SEARCH_GEO_G0_FOUNDATION_AUDIT_REPORT.md` (three-part defect: dead-end links, a parallel non-Odoo/non-projection taxonomy the site's own SEO governance prohibits, and the localization defect below) and again flagged as open in `docs/homepage/HOMEPAGE_HP_R1_RECONCILIATION_IMPLEMENTATION_REPORT.md`'s "FOOTER FOLLOW-UP" section. Both prior reports deliberately left it unfixed as out-of-scope; this audit reconfirms the same defect still exists at current HEAD.

---

# FAQ

**RETIRED FAQ LINK: NO** — the Footer does not currently render any FAQ link, retired or otherwise (an omission, not a broken pointer).

FAQ content was relocated from the Homepage to the Contact page (`components/contact/faq-section.tsx`, sourced from `lib/content/pages.ts`'s `contactFaq`), per the Homepage's own supersession record (DAR-021: "homepage composition now follows the approved v0 implementation, which has no FAQ section"). The FAQ section on `/contact` has no explicit anchor `id` in the component as read, so even a hypothetical `/contact#faq` link would not reliably scroll to it today. The old Homepage anchor is confirmed retired and is not referenced by the Footer.

---

# PROCESS

**PROCESS ROUTE: NOT PUBLISHED.** No `app/[locale]/process` directory exists. The Footer does not link to `/process` (or any process-equivalent destination) today, which is the correct behavior per the review's guidance ("link only if the actual localized /process route is published"). No route creation performed in this task.

---

# RFQ DESTINATION

The canonical RFQ route `/request` exists and is used by Hero, Header, and `FinalCta`, but **the Footer's own navigation does not link to it directly.** The Footer's "Company" group reuses the Header's 5-link set (`/products`, `/services`, `/industries`, `/about`, `/contact`), none of which is `/request`. A visitor reaching the Footer without having used Hero/Header/FinalCta has no direct Footer path to RFQ submission other than via `/contact`. FOOTER_SPEC.md §8.2 Group A specifies a `submit-requirement` link (`route.rfq`) as "Required; may use stronger visual emphasis" — this is currently **not implemented**.

---

# CONTACT CONFIGURATION

| Channel | Status |
|---|---|
| Phone | VERIFIED PUBLIC CONFIG (see PHONE below) — but not rendered in Footer |
| Email | NOT FOUND (absent everywhere in the codebase, correctly not fabricated) |
| WhatsApp | NOT FOUND (icon component exists at `components/icons/whatsapp-icon.tsx` but is imported nowhere — dead code, no number configured) |
| Physical address | VERIFIED PUBLIC CONFIG, and rendered correctly in Footer (see ADDRESS below) |
| Business hours | NOT FOUND (correctly omitted — never approved per `PROJECT_OVERRIDES.md` §10) |

No secret store was opened; no private/staff contact data was inspected or referenced. All values above come from source files already committed to the repository (`lib/content/contact-channels.ts`, `lib/metadata/site.ts`, `PROJECT_OVERRIDES.md` §7.1).

---

# PHONE

**PHONE CONFIG: VERIFIED** (in-repository single source of truth) — **with a documentation-currency caveat.**

`lib/content/contact-channels.ts` defines `CONTACT_PHONE_E164 = "+989120656528"`, with a code comment stating it is "confirmed directly by the project owner in-session (RFQ/UX polish task, 2026-09-02)." This value is consistently reused — never re-hardcoded — by `components/home/hero.tsx`, `SiteHeader`, the mobile drawer, and `components/home/final-cta.tsx` (`tel:${CONTACT_PHONE_E164}`).

**`SiteFooter.tsx` does not render this phone number at all** — Footer has no `FooterContact` block and no `tel:` link anywhere. This is an inconsistency of *presence*, not of *value*: nothing in the Footer conflicts with the Hero/Header/FinalCta number, but FOOTER_SPEC.md §5.1 requires `FooterContact` "when at least one contact route is verified," and one is.

**Documentation-currency note (not a code conflict, a docs-staleness finding):** `PROJECT_OVERRIDES.md` §7.2 (last updated 2026-08-29) still states the phone is "STILL OPEN, not production-confirmed" and names only an incomplete 8-digit landline candidate (`۰۳۱۳۵۱۳۴`) as unconfirmed. That entry predates the 2026-09-02 in-session confirmation recorded in `contact-channels.ts` and is now stale. This task does not update `PROJECT_OVERRIDES.md` (outside this task's permitted-writes scope), but flags it here as a genuine documentation drift for the owner/maintainer to reconcile — the code's number is real and actively used sitewide, while the root override file still describes an open/unconfirmed state.

---

# EMAIL

**EMAIL CONFIG: GAP** (absent, correctly not fabricated). No `mailto:` link exists anywhere in the codebase — confirmed both by direct grep and by an existing test assertion in `lib/content/header-frozen-spec-invariants.test.ts` (`assert.ok(!/mailto:/.test(source))`). `PROJECT_OVERRIDES.md` §10 lists email as explicitly unconfirmed; the implementation correctly reflects that by omitting it entirely rather than placeholder-ing it.

---

# ADDRESS

**ADDRESS CONFIG: VERIFIED.** `PROJECT_OVERRIDES.md` §7.1 (owner-confirmed 2026-08-26):

```text
ADDRESS_FA = اصفهان، خیابان هزارجریب، کوی آزادگان
ADDRESS_EN = Isfahan, Hezar Jarib Street, Kooy Azadegan
```

`SiteFooter.tsx` renders this (split across two lines per locale) accurately for all three locales:

- FA: "اصفهان، خیابان هزارجریب" / "کوی آزادگان"
- EN: "Hezar Jarib Street, Kooy Azadegan" / "Isfahan, Iran"
- AR: «شارع هزار جريب، حي آزادگان» / «أصفهان، إيران»

Content matches the confirmed value; no fabrication. AR is a reasonable transliteration/rendering of the same confirmed address, not independently verified by the owner in `PROJECT_OVERRIDES.md` but consistent with it.

---

# BUSINESS HOURS

**BUSINESS HOURS: ABSENT**, correctly. No hours are configured or referenced anywhere in the codebase, and `PROJECT_OVERRIDES.md` never confirms any. Nothing in Evidence proposals or Odoo calendars was used to infer hours (there is no such reference in this codebase to begin with).

---

# SOCIAL / MESSENGERS

**SOCIAL/MESSENGER CONFIG: NOT CONFIGURED.** No LinkedIn/Instagram/other social URLs exist in any content or config file. A `WhatsAppIcon` SVG component exists (`components/icons/whatsapp-icon.tsx`) but is not imported or rendered anywhere — dead code, not a live feature. Footer correctly renders no social links (nothing to show), consistent with FOOTER_SPEC.md §10's "no icon merely because one is available."

---

# LEGAL ENTITY WORDING

`lib/metadata/site.ts` defines `siteConfig.legalOwner = "Cyan Sanat Iranian Co. LTD"`, matching the "Owner" field documented at the top of the root `CLAUDE.md`. The Footer's copyright line embeds this directly:

```text
© {year} {rights-phrase} {siteConfig.name} ({siteConfig.legalOwner})
```

e.g. FA: "© 2026 کلیه حقوق این وب‌سایت متعلق به آهن آسا (Cyan Sanat Iranian Co. LTD)".

This **differs in exact phrasing** from the FOOTER_SPEC.md/review baseline pattern (`© {currentYear} آهن آسا. تمامی حقوق محفوظ است.`) but is not a fabrication — it uses the one legal-entity name that is actually documented as the project owner, and does not overstate the relationship (it states the copyright rights holder alongside the legal owner name, not a registration/license claim). No unconfirmed legal facts (registration number, tax ID) appear.

---

# PRIVACY / TERMS

**LEGAL ROUTES: GAP.** No `/privacy` or `/terms` route exists in `app/[locale]/`, and the Footer renders no legal-links row at all (no `FooterUtilityRow` legal links). This is consistent behavior (no dead links to unpublished pages) but leaves FOOTER_SPEC.md §11.1's "required" privacy/terms links entirely unimplemented — an owner/content decision is needed before these can be built, not merely a code fix.

---

# COPYRIGHT

`&copy; {new Date().getFullYear()} {t.rights} {siteConfig.name} ({siteConfig.legalOwner})` — year is generated dynamically at render time (server component), not hardcoded, satisfying FOOTER_SPEC.md §11.2's "generate `currentYear` safely" rule. Wording differs from the exact baseline string as noted above (LEGAL ENTITY WORDING); no hydration-mismatch risk was found (the value is computed server-side only, no client-side re-computation exists in this component).

---

# FA LOCALIZATION

**FA: PASS.** Persian is the complete, primary, natural-language content across every string in `SiteFooter.tsx` (role statement, group headings, office label, address, incoterms label, copyright phrase) and in the four sample-category labels/blurbs sourced from `lib/content/catalog-sample.ts`.

---

# EN LOCALIZATION

**EN: GAP** (partial). The footer's own strings (role statement, "Products"/"Company"/"Head office" headings, address, "Incoterms", "All rights reserved,") are genuinely translated. However, the **four product-category labels** rendered under the "Products" nav group (`categories.map((c) => c.label)`, sourced from `lib/content/catalog-sample.ts`) are **hardcoded Persian strings with no locale variants** — `lib/content/catalog-sample.ts`'s own header comment states "Content is Persian-only; see the catalog pages' locale notice for why." On `/en` pages, the Footer's "Products" column therefore shows Persian text ("مقاطع طولی", "مقاطع تخت", "محصولات نیمه‌ساخته", "مواد اولیه و آلیاژها") inside an otherwise-English footer, on every page of the site. This is the same defect independently flagged in the GEO-G0 audit and the HP-R1 report's "FOOTER FOLLOW-UP."

---

# AR LOCALIZATION

**AR: GAP** — identical defect and identical cause as EN above; the same four Persian category labels render unchanged inside the otherwise-Arabic footer on `/ar` pages.

---

# RTL / LTR

No mixed-direction value (phone, email, URL, code) is currently rendered anywhere inside `SiteFooter.tsx` — there is no `tel:`/`mailto:` link and no Latin registration string in the component today, so there is currently nothing that requires `dir="ltr"`/`<bdi>` isolation, and none is missing. `lang`/`dir` are set correctly at the document root by `app/[locale]/layout.tsx` (`<html lang={locale} dir={direction}>`), which the Footer inherits. No hardcoded `margin-left`/`margin-right`/`text-align: left|right` was found in the component; spacing/gap utilities used (`gap-*`, `space-y-*`, `mt-*`, `py-*`, `px-*` via `container-x`) are direction-neutral. **If a phone/email is added to Footer in a future phase, LTR isolation must be introduced at that time** — it is not a currently-missing requirement because nothing bidi-sensitive is rendered yet.

---

# ACCESSIBILITY

- Single `<footer>` landmark: **PASS** (one `<footer className="bg-navy text-white">`, no nested footers).
- No `aria-labelledby` wiring the `<footer>` element to a hidden title, and **no single visually-hidden `<h2>` site-footer title exists** — FOOTER_SPEC.md §17.1/§17.3 specify exactly this pattern (one hidden `h2` footer title + `h3` group headings nested under it). The actual implementation instead uses **four separate visible `<h2>` elements** (Products, Company, Office, Incoterms) with no shared parent heading. **IMPLEMENTATION GAP** relative to FOOTER_SPEC.md's documented heading hierarchy — not confirmed as a hard WCAG 2.2 AA failure (multiple sibling `h2`s outside `<main>` is not automatically non-conformant), but a real deviation from the specified information architecture.
- Navigation groups: each of the two `<nav>` elements has an `aria-label` (`t.productsNav`, `t.companyNav`) — real accessible names, distinct per group. The address/incoterms block is a plain `<div>`, not a `<nav>` (correct, since it isn't primarily navigational).
- Link lists: real `<ul>`/`<li>`/`<a>` (via `next/link`) throughout — no `div`/`span` masquerading as links, no button-in-link or link-in-button nesting found.
- Icon-only links: none exist in the Footer (the only image, the brand mark, is `aria-hidden` and paired with visible adjacent text — correct pattern).
- Target size / focus-visible / contrast: **NOT VERIFIED** in this task — no rendered/browser inspection was performed (see RESPONSIVE / VISUAL CHECKS). Static reading shows link/heading text uses `text-white`/`text-white/60`/`text-white/65`/`text-white/45`/`text-copper-400` on a `bg-navy` surface, consistent with the token contrast pairs documented elsewhere in this repository's design system, but this was not independently re-computed or rendered here.

---

# SSR / JS-OFF

**PASS**, verified from source: `SiteFooter.tsx` carries no `"use client"` directive and is composed entirely of server-renderable JSX (`Image`, `Link`, plain elements) with zero event handlers, zero `useState`/`useEffect`, and zero client-only conditionals. Every link is a real anchor produced by `next/link`. With JavaScript disabled, the logo, role statement, all navigation links, the address, and the copyright line all remain present and functional, because none of it depends on client-side hydration to exist in the HTML in the first place. This conclusion is drawn from source inspection, not a live no-JS browser test.

---

# RESPONSIVE / VISUAL CHECKS

**STATIC / SSR / COMPILED-CSS INSPECTION ONLY.** No dev server was started and no browser tool was used in this task (a read-only audit does not require exercising the running app, and starting one was not necessary to answer any question above from source). The responsive behavior described under SITEFOOTER STRUCTURE is inferred from the Tailwind utility classes in the source file (`grid`, `md:grid-cols-2`, `lg:grid-cols-12`, `lg:col-span-*`), not from a rendered viewport check at 390/768/1366px or in FA/EN/AR. **Browser-verified visual/responsive behavior remains an explicit GAP** — recorded honestly rather than overclaimed, per this task's instructions.

---

# FINAL CTA / FOOTER BOUNDARY

**PASS.** `components/home/final-cta.tsx` documents and implements exactly the review's recommended treatment for a Navy-on-Navy transition: the `FinalCta` section carries `border-b border-white/20` (a restrained hairline divider, not a band) plus its own `py-20 lg:py-28` padding, while `SiteFooter` keeps its own independent `py-16 lg:py-20` padding — deliberate independent padding on both sides of a single subtle divider, with no unrelated light section inserted into the frozen composition and no modification to Footer's own links/copy/layout. This was implemented deliberately (per `docs/final-cta/AHANASSA_FINAL_CTA_COMPONENT_FREEZE_V1.0.md` §9 and confirmed built in `FINAL_CTA_P1_V1_0_IMPLEMENTATION_REPORT.md`), and this audit's direct source read confirms the classes are present exactly as documented. This boundary treatment applies only on the Homepage (where `FinalCta` precedes `SiteFooter`); the six `CtaBand`-using pages have their own, unrelated, pre-existing Navy-800-to-Navy transition, out of this task's scope.

---

# CURRENT-STATE MATRIX

| Footer area | Current path | Current behavior | Authority expectation | Status | Minimal future action |
|---|---|---|---|---|---|
| SiteFooter shell | `components/layout/SiteFooter.tsx`, rendered in `app/[locale]/layout.tsx` | Single global server-rendered footer, all pages/locales | FOOTER_SPEC.md §5, §24.1 | PASS (structure) / GAP (missing sub-blocks) | Add missing `FooterContact`/legal row as data becomes available; no structural rewrite needed |
| FooterCTA ownership | N/A — component does not exist | Homepage uses `FinalCta`; six other pages use `CtaBand`; neither is named `FooterCTA` | FOOTER_SPEC.md §5.1, §6 | PASS (no duplication) | None — retain both as-is |
| Logo | `public/brand/ahan-asa-mark.jpg` | One neutral mark, shared FA/EN/AR, shared Header/Footer | FOOTER_SPEC.md §7.4 | PASS (only approved asset available) | Swap in a Persian reversed lockup only if/when one is approved |
| Role statement | `SiteFooter.tsx` `copy[locale].role` | Distinct FA/EN/AR wording, meaning preserved, not verbatim baseline | FOOTER_SPEC.md §7.2 | PASS (meaning) / NOTED (wording deviation) | Owner call: adopt exact baseline sentence or keep current paraphrase |
| Product links | `SiteFooter.tsx` + `lib/content/catalog-sample.ts` | 4 category links use `?category=` ignored by the real filter parser | FOOTER_SPEC.md §8.2 Group A | **STALE / NO-OP** | Rewire to real facet params (`family`/`group`/`form`/`grade`/`standard`) or remove the links |
| Services links | Company nav reuses `lib/content/nav.ts` | `/services` link present | FOOTER_SPEC.md §8.2 Group A/B | PASS | None |
| Markets links | Not linked from Footer | `/markets` page exists but is not in Footer or Header nav | `lib/content/nav.ts` comment (superseded by `/industries`) | Consistent, not a gap | None |
| About/contact links | Company nav | `/about`, `/contact` present | FOOTER_SPEC.md §8.2 Group C | PASS | None |
| FAQ | Absent | No link rendered; FAQ content lives inline on `/contact` | FOOTER_SPEC.md §8.2 Group A | GAP (omitted, not broken) | Owner call: add a real `/contact`-anchored or dedicated FAQ link once an anchor `id` exists |
| Process | Absent | No `/process` route published | FOOTER_SPEC.md §8.2 Group A | Correctly omitted | None until `/process` ships |
| RFQ link | Absent (Footer relies on `/contact`) | No direct `/request` link in Footer | FOOTER_SPEC.md §8.2 Group A (`submit-requirement`, required) | GAP | Add a `/request` link to the Company/Procurement group |
| Phone | `lib/content/contact-channels.ts` (`CONTACT_PHONE_E164`) | Verified, used by Hero/Header/FinalCta; **not rendered in Footer** | FOOTER_SPEC.md §9 | GAP (presence, not value) | Add a `tel:` `FooterContact` item reusing the existing constant |
| Email | Absent everywhere | No `mailto:` anywhere in the codebase | `PROJECT_OVERRIDES.md` §10 (unconfirmed) | Correctly absent | Add only once an owner-approved address exists |
| Address | `SiteFooter.tsx` | Rendered accurately for FA/EN/AR, matches `PROJECT_OVERRIDES.md` §7.1 | FOOTER_SPEC.md §9 | PASS | None |
| Business hours | Absent | Not configured anywhere | `PROJECT_OVERRIDES.md` §10 (unconfirmed) | Correctly absent | Add only once owner supplies hours |
| Social | Absent | No URLs configured; unused `WhatsAppIcon` component exists | FOOTER_SPEC.md §10 | Correctly absent | Add only once official profiles are verified |
| Privacy | Absent | No `/privacy` route exists; no link rendered | FOOTER_SPEC.md §11.1 | GAP (owner/content decision) | Build `/privacy` content first; then link |
| Terms | Absent | No `/terms` route exists; no link rendered | FOOTER_SPEC.md §11.1 | GAP (owner/content decision) | Build `/terms` content first; then link |
| Copyright | `SiteFooter.tsx` | Dynamic year; uses confirmed `legalOwner`; wording differs from baseline string | FOOTER_SPEC.md §11.2 | PASS (accurate) / NOTED (wording) | Owner call on exact phrasing |
| FA localization | `SiteFooter.tsx` copy record | Complete | CLAUDE.md §1 (root) | PASS | None |
| EN localization | `SiteFooter.tsx` + `catalog-sample.ts` | Footer's own strings translated; 4 category labels hardcoded Persian | CLAUDE.md §1 (root) | **GAP** | Localize/replace the 4 category labels |
| AR localization | Same as EN | Same defect | CLAUDE.md §1 (root) | **GAP** | Same fix as EN |
| RTL/LTR | `SiteFooter.tsx` + root layout | No bidi-sensitive values currently rendered; direction inherited correctly | FOOTER_SPEC.md §9.5, §20.3 | PASS (nothing to isolate yet) | Add `dir="ltr"`/`<bdi>` when phone/email are added |
| Accessibility | `SiteFooter.tsx` | Single `<footer>`; 4 sibling `<h2>`s instead of 1 hidden title + `<h3>` groups | FOOTER_SPEC.md §17.1/§17.3 | GAP (heading hierarchy) | Add one visually-hidden `<h2>` footer title; demote group headings to `<h3>` |
| Final CTA boundary | `components/home/final-cta.tsx` | Restrained divider + independent padding, Homepage only | Review §3, Final CTA Freeze §9 | PASS | None |
| Mobile behavior | `SiteFooter.tsx` grid classes | Structurally stacks below `md` | FOOTER_SPEC.md §14.2 | NOT VERIFIED (no browser check) | Verify in a real viewport before any visual change ships |

---

# STRAIGHTFORWARD FIXES

Code-level fixes, no owner/legal decision required, no other-page regression risk (all scoped inside `SiteFooter.tsx`/its direct data files):

1. Remove or rewire the four stale `?category=long|flat|semi|raw` links to the real facet-query keys (`family`/`group`/`form`/`grade`/`standard`) that `parseCatalogFilterParams` actually recognizes.
2. Localize the four product-category labels for `en`/`ar`, or source them from a locale-aware structure instead of `lib/content/catalog-sample.ts`'s Persian-only `categories` array.
3. Restructure Footer heading hierarchy: one visually-hidden `<h2>` footer title (`aria-labelledby` on the `<footer>`), demote the four current `<h2>`s to `<h3>` beneath it.
4. Add a `tel:` contact item reusing the existing `CONTACT_PHONE_E164` constant (no new value to source — it already exists and is already used sitewide).

---

# CONFIGURATION GAPS

Gaps that need a verified value or an owner-approved page before they can be built, not just code changes:

1. No `/request` (RFQ) link in Footer navigation — needs a decision on label/placement, not new data.
2. No email — genuinely unconfirmed (`PROJECT_OVERRIDES.md` §10); omit until supplied.
3. No WhatsApp — no number configured; the icon component exists unused.
4. No business hours — never approved.
5. No social links — no verified official profiles exist yet.
6. No privacy/terms pages exist, so no legal-links row can be built yet.

---

# OWNER DECISIONS STILL REQUIRED

1. Whether to adopt the review's exact baseline role-statement sentence or keep the current (meaning-equivalent) paraphrase.
2. Exact final copyright phrasing (current implementation embeds `legalOwner` inline; baseline string does not) — confirm which is preferred.
3. Whether/when `/privacy` and `/terms` content will be authored and published, which then gates the legal-links row.
4. Whether email, WhatsApp, and/or business hours will ever be supplied for public display.
5. Whether `PROJECT_OVERRIDES.md` §7.2 should be updated to reflect the 2026-09-02 in-session phone confirmation already live in `lib/content/contact-channels.ts` (a documentation-currency item, flagged here, not resolved by this task's permitted-writes scope).
6. Whether FOOTER_SPEC.md's page-level `FooterCTA` placement exceptions (§6.4 — RFQ page, confirmation page, legal pages, error pages) should ever be implemented, given the current architecture renders `SiteFooter` identically on every page via the shared layout.

---

# MINIMAL IMPLEMENTATION PLAN

Not implemented in this task — proposed for FOOTER-P1 scoping, ordered by dependency:

**A. Straightforward code fixes** (no data/owner dependency):
- Fix/remove the 4 stale `?category=` links.
- Restructure the heading hierarchy (1 hidden `h2` + `h3` group headings).
- Add a `tel:` `FooterContact` item using the existing verified phone constant.

**B. Localization fixes:**
- Localize (or restructure the data source of) the 4 product-category labels for `en`/`ar`.

**C. Route cleanup:**
- None required — Footer currently links only to real, published routes (aside from the stale query strings covered in A). No dead route link exists.

**D. Public configuration bindings:**
- None new required for phone/address (both already exist and are correctly sourced); wiring is limited to consuming the existing `CONTACT_PHONE_E164` constant inside `SiteFooter.tsx` (item A).

**E. Owner/legal decisions genuinely still missing** (blocks further Footer work in that specific area only):
- Privacy/Terms content and publication timing.
- Email/WhatsApp/business-hours values, if ever to be published.
- Exact role-statement/copyright wording preference.
- `/request` link placement/label in Footer nav.

**F. Browser verification only** (no code change, just confirmation before any visual work ships):
- Real-viewport check at 390/768/1366px in FA/EN/AR.
- Contrast/focus-visible spot-check on the Navy surface.
- Confirm no horizontal overflow with long EN/AR strings once B is fixed.

This plan does not propose a Footer rewrite. The current `SiteFooter` structure (brand/nav/nav/address+incoterms/copyright, 12-column grid) is broadly sound and reusable; the identified defects are narrow (2 stale-link/localization items already known from a prior audit, 1 heading-structure item, 1 missing-but-available contact item, plus several genuinely owner-gated content items).

---

# FILES CREATED

| Path | Commit |
|---|---|
| `docs/footer/AHANASSA_FOOTER_RECONCILIATION_REVIEW_V1.0.md` | `cb473a9c7c0c522129a0b3d9d42fd7bf89144037` |
| `docs/footer/FOOTER_CURRENT_STATE_AND_FREEZE_READINESS_REPORT.md` | this report's own commit (see below) |

# FILES MODIFIED

None.

# FILES REMOVED

None.

---

# PRODUCTION SAFETY

No runtime/application source file was modified. No migration was run. No deployment, push, or merge was performed. No secret store was opened. No company/contact/legal fact was invented — every value cited above is either read directly from committed source files or from `PROJECT_OVERRIDES.md`. `01-sources/`, `logo/`, `design-reference/`, and Header/Hero/Product Showcase/Buyer Value/Industries/Final CTA were not touched.

---

# READY FOR FOOTER-P1

**YES**, with the owner decisions listed above tracked as open items for that phase (none of them blocks starting P1 scoping; several block only the specific sub-item they concern, per the same blocker-classification logic `PROJECT_OVERRIDES.md` §11 already uses elsewhere in this repository).
