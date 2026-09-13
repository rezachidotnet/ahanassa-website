# Footer P1 Reconciliation Implementation Report (FOOTER-P1)

Date: 2026-09-13
Task type: bounded implementation (narrow reconciliation) + test/runtime verification + durable report.

---

# RESULT

**A — FOOTER-P1 IMPLEMENTED — NARROW RECONCILIATION COMPLETE.**

All four hard-scope items (stale product links, EN/AR localization leak, verified phone, heading hierarchy) were implemented, covered by 13 new focused tests, verified against rendered SSR HTML in FA/EN/AR, and pass the full existing test suite, `tsc`, and the production build. No real browser tool was used, so the browser-visual portion of item F is explicitly recorded as NOT RUN rather than claimed.

---

# PREFLIGHT

```text
pwd:     /Users/reza/Developer/ahanassa-website
branch:  feat/header-hero-integrated
HEAD:    5212acc706220153830ee8f73bf4914daa57834c
status:  clean
```

Matches the expected branch. Working tree was clean before this task began.

---

# BASE SHA

`5212acc706220153830ee8f73bf4914daa57834c`

---

# AUTHORITIES

Read in full or targeted, in this order:

1. `PROJECT_OVERRIDES.md` (v2.4.0 at task start) — full read.
2. Root `CLAUDE.md` and `01-sources/CLAUDE.md` — provided as system context.
3. `docs/footer/AHANASSA_FOOTER_RECONCILIATION_REVIEW_V1.0.md` — full read.
4. `docs/footer/FOOTER_CURRENT_STATE_AND_FREEZE_READINESS_REPORT.md` (FOOTER-P0) — full read; treated as the starting audit, re-verified against current file state rather than trusted blindly.
5. `01-sources/FOOTER_SPEC.md` — targeted read (§5, §8, §9, §17 — components/requirements, navigation architecture, `FooterContact`/bidi rules, accessibility/heading hierarchy).
6. `lib/content/contact-channels.ts` — full read (single phone source of truth + its confirmation history).
7. `lib/catalog/catalog-filters.ts` — full read (`parseCatalogFilterParams`, `CATALOG_FILTER_QUERY_KEYS`, the conditional-facets computation) — confirms real facet codes are D1-data-driven, not a static list.
8. `lib/content/catalog-sample.ts` — full read (confirms the four category labels are explicitly documented as sample/placeholder, Persian-only).
9. `components/layout/SiteFooter.tsx`, `components/layout/SiteHeader.tsx`, `components/layout/mobile-nav-drawer.tsx`, `lib/content/nav.ts` (`headerPhoneLabel`), `app/[locale]/page.tsx`, `components/ui/cta-band.tsx` consumers (`about`, `industries`, `markets`, `services`, `products`, `products/[slug]`) — full/targeted reads to re-verify current file state before changing anything and to confirm no other-page regression risk.
10. `components/ui/button.test.ts`, `lib/content/header-frozen-spec-invariants.test.ts` — read for this repo's established source-text-invariant test convention (no React render-testing framework exists here).

---

# P0 FINDINGS CONSUMED

Every "STRAIGHTFORWARD FIXES" item from FOOTER-P0 was implemented exactly as scoped, and nothing else from that report's "CONFIGURATION GAPS" / "OWNER DECISIONS STILL REQUIRED" lists was touched:

| P0 finding | Action in P1 |
|---|---|
| 4 stale `?category=` links (NO-OP against the real parser) | Removed (see PRODUCT LINK DECISION) |
| EN/AR Persian-category leak | Removed as a consequence of the above |
| Phone verified but absent from Footer | Added, reusing `CONTACT_PHONE_E164` |
| Heading hierarchy deviates from spec (4 sibling `h2`s) | Corrected to 1 hidden `h2` + 4 `h3` |
| `PROJECT_OVERRIDES.md` §7.2 stale re: phone | Corrected, separate commit |
| Role statement/copyright wording deviation | Left untouched (owner decision) |
| No `/request` Footer link | Left untouched (owner decision, per P0) |
| No FAQ/`/process`/`/privacy`/`/terms` links | Left untouched (correctly omitted, no route exists) |
| `CtaBand` on 6 other pages | Not touched; verified unchanged (see OTHER-PAGE CTA SAFETY) |

---

# PRODUCT LINK DECISION

**Decision: REMOVE the four stale links; retain only the truthful, unfiltered "full catalog" (`/products`) destination. No replacement facet mapping was introduced.**

Reasoning, per the task's required decision order:

1. **Checked for a stable, canonical, locale-aware facet mapping suitable for static Footer use.** `lib/catalog/catalog-filters.ts`'s `parseCatalogFilterParams` recognizes exactly five keys — `family`, `group`, `form`, `grade`, `standard` — whose values are `family_code`/`group_code`/etc. columns read live from `product_variants` rows in D1 (real commercial variants synced from Odoo). There is no static, fixed list of codes anywhere in the repository (confirmed by grep: `family_code`/`familyCode` appear only in `lib/catalog/types.ts`'s row-shape type and the D1-backed repository layer, never as a hardcoded enum/config). The four old sample IDs (`long`/`flat`/`semi`/`raw`) are a different, Persian-only, explicitly-sample-data taxonomy (`lib/content/catalog-sample.ts`) that has no relationship to the real `family`/`group`/`form`/`grade`/`standard` dimensions at all — there is no "long = some real family code" mapping to discover, only one to guess.
2. **No stable mapping exists**, so per the task's explicit instruction, fabricating one (e.g., "long → REBAR") was not done. `01-sources/FOOTER_SPEC.md` §8.3 independently reinforces the same conclusion: rule 4 says "avoid query parameters for ordinary footer navigation," and rule 7 says "avoid linking to a filtered or transient client-only state unless that behavior is explicitly approved." Removing the four query-string links, rather than rewiring them to a different guessed query string, is the spec-aligned choice, not just the safe one.
3. Fetching real, current facet values into the global Footer (rendered on every page via the shared locale layout) would require adding a D1 read dependency to a component that today has zero data dependencies — a materially larger, riskier change than "narrow reconciliation," and out of this task's hard scope.

The "Products" nav group (`lg:col-span-3`) is unchanged in position/columns/heading; it now contains exactly one link ("Full catalog" / `کاتالوگ کامل` / `الكتالوج الكامل`) instead of four dead links plus that one. No grid/layout restructuring was performed.

---

# TAXONOMY SAFETY

No parallel or guessed taxonomy was invented. No Odoo field, D1 column, or product classification was fabricated. The removed labels (`مقاطع طولی`/`مقاطع تخت`/`محصولات نیمه‌ساخته`/`مواد اولیه و آلیاژها`) belonged to `lib/content/catalog-sample.ts`, which is untouched (still used by `/products` for its own explicitly-labeled sample-data experience) — only `SiteFooter.tsx`'s import of and dependency on that module was removed.

---

# FA LOCALIZATION

**PASS.** Unaffected by this change other than the new hidden footer title (`پاورقی وب‌سایت آهن آسا`) and the new phone `aria-label` (reusing the existing `headerPhoneLabel.fa.srLabel = "تماس تلفنی"`). All footer strings remain genuine, distinct Persian content.

---

# EN LOCALIZATION

**PASS** (was GAP in P0). The four hardcoded Persian category labels are gone (removed, not translated) because their underlying links were removed. Every remaining Footer string on `/en` pages — role statement, "Products"/"Company"/"Head office"/"Incoterms" headings, "Full catalog", address, "All rights reserved,", the new hidden title "Ahan Asa website footer", and the phone `aria-label` ("Call us", reused from `headerPhoneLabel`) — is genuine English content. Verified against rendered SSR HTML (see SSR VERIFICATION).

---

# AR LOCALIZATION

**PASS** (was GAP in P0). Identical fix and identical verification as EN. Hidden title: "تذييل موقع آهن آسا"; phone `aria-label`: "اتصل بنا" (reused from `headerPhoneLabel`).

---

# PHONE

**PRESENT**, reusing the single existing source of truth. `SiteFooter.tsx` now imports `CONTACT_PHONE_E164` from `@/lib/content/contact-channels` (the same constant already consumed by `SiteHeader`, the mobile nav drawer, `Hero`, and `FinalCta`) and renders a real `<a href={`tel:${CONTACT_PHONE_E164}`}>` inside the existing "Head office" column, directly beneath that group's heading and above the address — the narrowest extension of the existing office/contact area, not a new `FooterContact` card. The aria-label reuses the existing `headerPhoneLabel` dictionary from `lib/content/nav.ts` (no new/duplicated translation dictionary was created). No email, WhatsApp, or business-hours item was added.

---

# BIDI / RTL

**PASS.** The phone anchor carries `dir="ltr"`, matching `01-sources/FOOTER_SPEC.md` §9.5's documented pattern (`<a href="tel:+98XXXXXXXXXX" dir="ltr">…</a>`) and this repository's existing `SiteHeader.tsx` convention for the same number. Verified present in rendered SSR HTML for `fa`, `en`, and `ar` (see SSR VERIFICATION). No other bidi-sensitive value was introduced.

---

# HEADING HIERARCHY

**PASS.** `<footer aria-labelledby="site-footer-title">` now wraps a single visually-hidden `<h2 id="site-footer-title" className="sr-only">` (localized per locale) as its first child, exactly matching `01-sources/FOOTER_SPEC.md` §17.1's recommended structure. The four previously-sibling `<h2>` group headings (Products/Company/Office/Incoterms) are demoted to `<h3>`, satisfying §17.3 ("Group headings may use `h3` when nested under that footer title"). Verified both by source-level test and by counting actual rendered `<h2>`/`<h3>` tags inside the `<footer>...</footer>` element in SSR HTML for all three locales (1 `h2`, 4 `h3` each — see SSR VERIFICATION).

---

# ROLE STATEMENT

**Unchanged**, deliberately. Per task scope, the current meaning-equivalent (not verbatim) Persian role statement and its EN/AR translations were left exactly as P0 found them. This remains an open owner decision (adopt the exact baseline sentence, or keep the current paraphrase), not a P1 defect.

---

# COPYRIGHT

**Unchanged**, deliberately. The dynamic-year copyright line (`&copy; {year} {rights} {siteConfig.name} ({siteConfig.legalOwner})`) is untouched. Exact phrasing versus the baseline string remains an open owner decision per P0, not addressed here.

---

# RFQ LINK DECISION

**Deferred, not a P1 failure.** No `/request` link was added to the Footer's "Company" nav group. P0 classified this as an owner decision on label/placement, and Header/Hero/`FinalCta` already provide the approved RFQ conversion path sitewide. No repository evidence surfaced during this task overriding that classification, so it remains deferred.

---

# FAQ / PROCESS / LEGAL

**Unchanged, correctly.** No FAQ link, `/process` link, `/privacy` link, or `/terms` link was added. `/faq`, `/process`, `/privacy`, and `/terms` do not exist as published routes (re-verified: `find app/[locale] -maxdepth 1 -type d` still shows no such directories), so omission remains the truthful behavior per both `01-sources/FOOTER_SPEC.md` §8.3 rule 6 ("remove a link when its destination is not released; never use `href="#"`") and the reconciliation review's explicit guidance.

---

# FINAL CTA OWNERSHIP

**HOMEPAGE DUPLICATE CTA: ABSENT.** Re-verified after this task's own change (SiteFooter is rendered globally in `app/[locale]/layout.tsx`, unrelated to this check, but re-confirmed anyway): `app/[locale]/page.tsx` still contains exactly one `<FinalCta` and zero `<CtaBand`, pinned by a new focused test (`footer-frozen-spec-invariants.test.ts`, "Homepage still renders exactly one FinalCta and zero CtaBand"). `components/home/final-cta.tsx` was not opened for editing at any point in this task.

---

# OTHER-PAGE CTA SAFETY

**CTABAND MODIFIED: NO.** `components/ui/cta-band.tsx` was not opened for editing. Re-verified that `about`, `industries`, `markets`, `services`, `products`, and `products/[slug]` still each render `<CtaBand` (grep-confirmed and pinned by a new focused test). `SiteFooter.tsx` does not import `CtaBand` — the two remain fully independent, as before.

---

# SSR VERIFICATION

**PASS.** A full production build (`npm run build`) followed by `npm run start` (local `wrangler dev` against the built Worker) was used to fetch real server-rendered HTML for `/` (fa), `/en`, and `/ar`. For each locale, the extracted `<footer>...</footer>` element was inspected directly (Node script isolating the exact substring, not a line-based approximation):

| Check | fa | en | ar |
|---|---|---|---|
| `aria-labelledby="site-footer-title"` present | yes | yes | yes |
| Hidden `id="site-footer-title"` `h2` present, correct localized text | yes | yes | yes |
| `<h2>` count inside `<footer>` | 1 | 1 | 1 |
| `<h3>` count inside `<footer>` | 4 | 4 | 4 |
| `tel:+989120656528` anchor with `dir="ltr"` | 1 | 1 | 1 |
| `?category=` stale links present | 0 | 0 | 0 |
| Persian sample-category labels present | 0 | 0 | 0 |

`/products` (fa) and `/en/about` both returned HTTP 200 with the global footer still present, confirming no regression to routing or the shared layout. The dev server was stopped after verification; no process was left running.

---

# BROWSER VERIFICATION

**NOT RUN.** No real browser automation tool was invoked in this task. The SSR/rendered-HTML checks above (via `curl` against a locally built and served Worker) are real server output, not source-only inspection, but they are not a viewport/visual check. Per this task's instructions, this is recorded honestly as a gap rather than overclaimed: `390px`/`768px`/`1366px` visual inspection in FA/EN/AR, focus-visible verification, and contrast spot-checks were not performed.

---

# ACCESSIBILITY

- Single `<footer>` landmark, now with `aria-labelledby` wiring to a real hidden title: **PASS** (was GAP in P0).
- Heading hierarchy (1 hidden `h2` + `h3` groups): **PASS** (was GAP in P0).
- New phone control has a real accessible name via `aria-label` (locale-appropriate "Call us"/"تماس تلفنی"/"اتصل بنا"), is a real `<a href="tel:...">` (not a div/span), and inherits the same underlying link styling as the rest of the Footer (no new custom focus/hover treatment introduced).
- Target size / contrast / focus-visible: **NOT VERIFIED** in this task, same as P0 — no rendered/browser inspection of computed styles was performed; the new phone link reuses the same Tailwind color/spacing tokens (`text-white/65`, `hover:text-white`, `text-sm`) already used by the adjacent address text, so no new token was introduced that would require fresh contrast verification, but this was not independently re-measured.

---

# FILES CREATED

| Path | Commit |
|---|---|
| `lib/content/footer-frozen-spec-invariants.test.ts` | `f5c196e` |
| `docs/footer/FOOTER_P1_RECONCILIATION_IMPLEMENTATION_REPORT.md` | this report's own commit (see below) |

# FILES MODIFIED

| Path | Commit |
|---|---|
| `components/layout/SiteFooter.tsx` | `f5c196e` |
| `PROJECT_OVERRIDES.md` (§7.2 only, plus version/date header) | `0c1ed12` |

# FILES REMOVED

None.

---

# RUNTIME COMMIT

`f5c196e` — `fix(footer): reconcile navigation localization and contact`

# GOVERNANCE COMMIT

`0c1ed12` — `docs: reconcile Footer phone status`

Judged safe and in-scope: the correction is a narrow factual status update to `PROJECT_OVERRIDES.md` §7.2, directly supported by an already-committed, already-live canonical source (`lib/content/contact-channels.ts`, in production use since before this task began) and by the FOOTER-P0 report's own documentation-currency finding. No other section of `PROJECT_OVERRIDES.md` was touched; §10's stale "phone unconfirmed" bullet was deliberately left as a flagged, separate, still-open item rather than folded into this correction.

---

# FOCUSED TESTS

`node --test lib/content/footer-frozen-spec-invariants.test.ts` — **13/13 passing**, 0 failing. Covers: stale-link removal (all four category values + a general no-`?category=` check with comments stripped), removal of the `catalog-sample` dependency, exactly-one-link Products nav, absence of the four Persian labels, phone sourced from `CONTACT_PHONE_E164` and never re-hardcoded, real `tel:` anchor, `dir="ltr"` bidi isolation, reuse of `headerPhoneLabel` (no duplicated dictionary), exactly one `<footer>` landmark with `aria-labelledby`, exactly one `<h2>` / four `<h3>`, absence of invented `mailto:`/WhatsApp/`/privacy`/`/terms`/`/process` links, Homepage's single `FinalCta`/zero `CtaBand`, and `CtaBand`'s continued use on its six other-page consumers.

# FULL TESTS

`npm test` (`node --test lib/**/*.test.ts components/**/*.test.ts`) — **1240/1240 passing**, 0 failing, 0 skipped.

# TSC

`npx tsc --noEmit` — **PASS**, no output, exit 0.

# BUILD

`npm run build` (`vinext build`) — **PASS**. All five build stages completed; route manifest unchanged (`/:locale`, `/:locale/about`, `/:locale/contact`, `/:locale/industries`, `/:locale/markets`, `/:locale/products`, `/:locale/products/:slug`, `/:locale/request`, `/:locale/services`, plus the two API routes).

No repository `lint` script exists in `package.json`; none was run (none to run — not invented). `git diff --check` reported no whitespace errors on both commits' diffs.

---

# REMAINING OWNER DECISIONS

Unchanged from FOOTER-P0, none newly introduced, none resolved by this task:

1. Exact role-statement wording (adopt the review's verbatim baseline sentence, or keep the current meaning-equivalent paraphrase).
2. Exact copyright phrasing (current implementation embeds `legalOwner` inline; baseline string does not).
3. Whether/when `/privacy` and `/terms` will be authored and published (gates the legal-links row).
4. Whether email, WhatsApp, and/or business hours will ever be supplied for public display.
5. `/request` Footer link label/placement, if the owner wants a direct Footer path to RFQ beyond the existing Header/Hero/FinalCta paths.
6. `PROJECT_OVERRIDES.md` §10's stale phone bullet (separate from the §7.2 correction made in this task).

---

# PRODUCTION SAFETY

No migration was run. No deployment, push, or merge was performed. No secret store was opened. Header, Hero, Price Strip, Product Showcase, Buyer Value, Industries, Final CTA, `CtaBand`, Evidence, Odoo, and `DB_PUBLIC` were not modified — confirmed both by not opening those files for editing and by the focused/full test results above. No company/contact/legal fact was invented — the phone value already existed, owner-confirmed, in the repository before this task began; this task only added a Footer render path to it and corrected one stale documentation line to match. `01-sources/`, `logo/`, and `design-reference/` were not touched.

---

# READY FOR HOMEPAGE FINAL CROSS-AUDIT

**YES.**
