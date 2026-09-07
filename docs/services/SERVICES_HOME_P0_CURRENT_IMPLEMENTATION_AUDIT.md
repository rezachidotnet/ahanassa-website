# SERVICES-HOME-P0 — Current Implementation & Architecture Audit

Date: 2026-09-07
Repository: `/Users/reza/Developer/ahanassa-website`
Worktree: `.claude/worktrees/services-home-audit`
Branch: `worktree-services-home-audit`
Task type: **READ-ONLY AUDIT** — no runtime code, spec, or migration file was changed by this task.

# RESULT

```
RESULT: C
CURRENT COMPONENT: components/home/capabilities.tsx
SOURCE OF TRUTH: B — Website editorial copy only (shared verbatim with app/[locale]/services/page.tsx via lib/content/pages.ts#servicesCopy); not connected to any commercial processing taxonomy
HARDCODED COMMERCIAL SERVICES: NO
PUBLIC PROCESSING PROJECTION: NOT USED (by Homepage). Header uses it (lib/processing/public-repository.ts), independently, and it currently returns zero rows in every environment.
HEADER/HOMEPAGE SHARED PROCESSING DOMAIN: NO
FALSE OWNERSHIP CLAIM: ABSENT
FA: PASS
EN: PASS
AR: PASS
ROUTES: PASS (no links exist inside the section to be broken; the one page-level link, /services, resolves 200 in fa/en/ar)
SSR: PASS
JS-OFF: PASS
RESPONSIVE: PASS (see RESPONSIVE section for live-vs-code-based verification breakdown and a disclosed sandbox limitation)
ACCESSIBILITY: PASS
HOMEPAGE SERVICES SPEC READINESS: PARTIAL
OWNER DECISIONS REQUIRED: 5 — see OWNER DECISIONS REQUIRED section (whether Homepage should surface real Processing Projection data at all; homepage-eligibility/curation ownership; card link destination given no processing-group slug/route exists; whether a drawing-based-request entry point belongs on Homepage; reconciling HOMEPAGE_SPEC.md §16 with the later Processing & Services Architecture)
SERVICES-HOME-P1 REQUIRED: BLOCKED ON OWNER DECISIONS
```

# PREFLIGHT

```
$ pwd
/Users/reza/Developer/ahanassa-website/.claude/worktrees/services-home-audit

$ git branch --show-current
worktree-services-home-audit

$ git rev-parse HEAD
18c6793dbb270ec8644c984f65e2a369f1c46968

$ git status --short
(clean)

$ git log --oneline --decorate -15
18c6793 (HEAD -> worktree-services-home-audit, feat/header-hero-integrated) docs: freeze Product Showcase V2.0
8060723 docs: record Product Showcase V2.0 P1 compliance
a727518 fix(home): align Product Showcase with frozen V2.0
6b283fc docs: record Product Showcase V2.0 implementation audit
a2bba8b docs(home): align hero image comment with current visual
f5b9fba feat(home): replace hero procurement image
369a4ab feat(header): add copper hover accents
ca51642 (feat/header-frozen-v2) feat(home): update hero copy and procurement visual
12d73de feat(home): refine hero message and procurement flow
6d82614 docs: record shared Button adoption checkpoint
4edc3da refactor: adopt shared Button across Header and Hero
37713c6 docs: import Button V1 Header V2.2 and Hero V2.4 specs
d606de6 docs: record Hero visual reconciliation
aa3b6cf fix: refine Hero temporary media and CTA presentation
8d5289a docs: record Hero V2.3 compliance implementation
```

Working tree was clean at the start. `18c6793` is HEAD itself (trivially its own ancestor) — the Product Showcase V2.0 final-freeze commit, confirmed as the base SHA for this audit.

# BASE SHA

```
18c6793dbb270ec8644c984f65e2a369f1c46968
```

# AUTHORITY MAP

| Document | Status | Why |
| --- | --- | --- |
| `docs/navigation/AHANASSA_HEADER_FINAL_FROZEN_V2.2.md` §5–§27 ("Processing & Services — Frozen Architecture") | **CURRENT** | The only frozen document in this repository that defines the Material / Processing Operation / Finished Requirement model, the Public Services Taxonomy (by-material, by-need), the drawing-based-request entry point, the "hardcoded commercial services are prohibited" rule, and the Header's own compact Services grouping. Read in full (§5–§27, plus later Header-only sections §28–§37 which are out of this task's scope). |
| `docs/HEADER_SERVICES_P6_REPORT.md` | **CURRENT** | Implementation report proving the Header's Services dropdown was rewired from a hardcoded `headerServiceGroups` constant to the real `lib/processing/public-repository.ts` → DB_PUBLIC read path. Confirms live zero-data behavior and that every processing-group link resolves to the plain `/services` page (no slug). |
| `docs/PROCESSING_SYNC_P5_REPORT.md` / `docs/PROCESSING_SYNC_P5_DURABILITY_CHECKPOINT.md` | **CURRENT** | Describe the Processing sync pipeline (`lib/processing/odoo-api-client.ts` → `sync.ts` → `repository.ts` → `sync-runner.ts` → `scheduled-sync.ts`) that feeds `public_processing_groups`. Explicitly disclose that no live Odoo Processing repository/API could be verified from this environment and that DB_PUBLIC is not yet in production traffic. |
| `migrations_public/0007_processing_groups.sql` | **CURRENT** | The only schema for the Processing Domain public projection. Defines `public_processing_groups (code, locale, name, sequence, is_active, …)` and `processing_sync_state`. No slug/route column, no `show_on_homepage`/`homepage_sequence` column exists on this table. |
| `01-sources/HOMEPAGE_SPEC.md` §16 ("Section 7 — Capabilities and Material Orientation") | **HISTORICAL / SUPERSEDED for this section's visual composition** (per `CLAUDE.md` §5a / `PROJECT_OVERRIDES.md` §8b / `DOCUMENT_AUDIT_REPORT.md` DAR-021), but **its content-model requirements were never explicitly reconciled with §5–§27 above** — see PROCESSING DOMAIN ALIGNMENT and HOMEPAGE SERVICES SPEC READINESS below. It specifies per-item destination links and a conditional "مشاهده حوزه‌های تأمین" CTA that the current implementation does not have. |
| `DOCS_INDEX.md` | **STALE for this subject** | Does not reference `AHANASSA_HEADER_FINAL_FROZEN_V2.2.md`, `docs/HEADER_SERVICES_P6_REPORT.md`, or `docs/PROCESSING_SYNC_P5_REPORT.md` at all — only the older `01-sources/HEADER_NAVIGATION_SPEC.md`. This is a documentation-navigation gap, not a conflict of substance (the newer docs are more specific and were located directly per this task's own instruction to search `docs/` broadly rather than trust `DOCS_INDEX.md` alone). |
| `lib/content/nav.ts` (comment block, lines 103–118) | **SUPPLEMENTARY** | First-person account, written by the P6 implementer, of exactly this same transition (hardcoded `headerServiceGroups` → real projection) and the "never resurrect a hardcoded fallback" rule. Directly corroborates the P6 report. |
| `01-sources/CONTENT_STRATEGY.md`, `01-sources/CTA_STRATEGY.md` | **SUPPLEMENTARY** | Not specific to a services/capabilities section; consulted only to confirm the Capabilities copy's tone/CTA conventions are not violated (they are not — the section has no CTA at all, see ROUTES). |
| No `docs/services/` directory existed before this task. No dedicated "Homepage Services" frozen specification exists anywhere in the repository. | — | Central finding — see HOMEPAGE SERVICES SPEC READINESS. |

# CURRENT COMPONENT

The task's own instruction not to assume "Capabilities" is still the authoritative name was verified directly:

- `app/[locale]/page.tsx` composes the homepage as `Hero → PriceStrip → ProductShowcase → Capabilities → Assurance → Process → Reach → CtaBand`.
- The import is `import { Capabilities } from "@/components/home/capabilities";` — the component **is** literally named `Capabilities`, confirmed by reading `components/home/capabilities.tsx` (there is no other Services/Processing/capability component anywhere in `components/`; `find components -iname "*capabilit*" -o -iname "*service*" -o -iname "*processing*"` returns only this one file).
- **Critical finding: `Capabilities` is not a rendering of any processing/service taxonomy.** Its data — `servicesCopy[locale].functions` from `lib/content/pages.ts` — is the exact same 4-item array also rendered on `app/[locale]/services/page.tsx`'s first section. Both describe the *purchasing-management process* ("Requirement & specification review" → "Sourcing evaluation & comparison" → "Proposal & decision" → "Documentation & delivery coordination"), i.e. CLAUDE.md §7's own confirmed product-truth flow (request submission → review/qualification → purchasing proposal → sourcing/delivery coordination). It contains **no** reference to steel processing operations (cutting, drilling, bending, threading, custom fabrication), no material families, and no processing-intent families.
- Trace: `app/[locale]/page.tsx` → `components/home/capabilities.tsx` → `lib/content/pages.ts#servicesCopy` (functions) + `lib/content/homepage.ts#homepageCopy` (eyebrow/title/body) → static array literals, zero I/O. Media: one decorative `next/image` (`/images/ops/inspection.png`, `aria-hidden="true"`, empty `alt`). No icons per item — only a zero-padded index number (`01`–`04`). No links, no CTA, anywhere in the component.

# CURRENT DATA FLOW

```
app/[locale]/page.tsx
  -> components/home/capabilities.tsx  (Server Component, no async work)
       -> lib/content/homepage.ts#homepageCopy[locale].capabilities   (eyebrow/title/body, static)
       -> lib/content/pages.ts#servicesCopy[locale].functions          (4 static {title, body} objects)
       -> components/ui/section-heading.tsx                            (presentational)
       -> components/ui/reveal.tsx ("use client", progressive enhancement only)
```

There is no database read, no fetch, no import of `lib/processing/*` or `lib/catalog/*` anywhere in `components/home/capabilities.tsx` or its two content-module dependencies. This was confirmed by direct reading of all three files, not inferred.

By contrast, the **real** Processing Domain data flow — which exists but Homepage does not touch — is:

```
app/[locale]/layout.tsx
  -> lib/processing/public-repository.ts#listPublicProcessingGroups(locale)
       -> DB_PUBLIC.public_processing_groups  (locale, is_active=1, ORDER BY sequence, code)
  -> passed as `serviceGroups` prop -> components/layout/SiteHeader.tsx
       -> serviceItems = serviceGroups.map(g => ({ code: g.id, name: g.name, path: "/services" }))
```

This is the Header's own, separate, already-real data flow (P5/P6 work, prior to this task). It is documented here only for contrast — the Homepage `Capabilities` component neither reads from nor depends on it.

# PROCESSING DOMAIN ALIGNMENT

`docs/navigation/AHANASSA_HEADER_FINAL_FROZEN_V2.2.md` §6 freezes three explicitly separate concepts: **Material** (ورق, میلگرد, مقطع, لوله), **Processing Operation** (برش, سوراخکاری, پانچ, خم, رزوه, ماشینکاری), and **Finished Requirement** (ورق سوراخ‌شده, بیس‌پلیت, بولت, قطعه طبق نقشه), with the frozen rule that these "must not be modeled as the same conceptual entity."

**Finding: the current Homepage `Capabilities` section does not reference any of these three concepts at all** — it operates one level up, describing the *procurement workflow* (review → evaluate → decide → coordinate), not a processing taxonomy. It therefore cannot violate §6's separation rule (there is nothing here to conflate), but it also does not implement, illustrate, or link to any part of the frozen Processing Domain model. This is a **scope gap, not a modeling defect** — see HOMEPAGE SERVICES SPEC READINESS.

# SOURCE OF TRUTH

Classification: **B — Editorial copy only.**

- `servicesCopy[locale].functions` describes Ahan Asa's own internal process, not "what processing services commercially exist" (Material/Operation/Finished-Requirement facts that §25 of the frozen Header spec assigns to the Odoo-side Processing Domain). Nobody could read this array and conclude "Ahan Asa offers cutting, drilling, bending, and custom fabrication" — it says nothing about processing capability at all.
- It is content the Website legitimately owns per §25's own split ("Website content remains responsible for presentation/SEO material... public explanatory copy... buying guidance") — arguably even narrower than that, since it is pure process narrative, not even category copy.
- It is **not** commercial-taxonomy hardcoding in the sense §26 of the frozen Header spec prohibits (`const services = ["برش", "خم", "سوراخکاری"]`) — no processing-operation names appear anywhere in this array.

# HARDCODE AUDIT

Grep patterns from the task (`const services = [...]`, `const capabilities = [...]`, `processingItems = [...]`, `serviceCards = [...]`) were run across the repository (excluding `node_modules`). Results:

| Match | File | Classification | Reasoning |
| --- | --- | --- | --- |
| `export const servicesCopy: Record<Locale, ServicesCopy>` | `lib/content/pages.ts` | **B — editorial copy only** | Process-narrative copy (see SOURCE OF TRUTH); not a processing/material taxonomy. |
| (historical, already deleted) `headerServiceGroups` | `lib/content/nav.ts` (comment only, code removed) | **A, historically** — the P6 report and the comment at lines 103–118 both explicitly identify this deleted constant as the exact "prohibited pattern" §26 describes, and record that it was removed rather than kept as a fallback. Nothing to flag today; it no longer exists in code. |
| `export const industriesCopy` / `marketsCopy` (arrays of industry names) | `lib/content/pages.ts` | **B — editorial copy only** | Explicitly reused from `marketsCopy` per the file's own comment (not fabricated for `/industries`); these are industry/use-case labels, not commercial services. Out of this task's Homepage-services scope but confirmed non-conflicting. |

No occurrence of `capabilities = [...]`, `processingItems = [...]`, or `serviceCards = [...]` exists anywhere in the repository. **No commercial processing/service taxonomy is hardcoded on the Homepage.**

# HEADER SERVICES RELATION

Traced read-only, no Header file modified. `app/[locale]/layout.tsx` calls `listPublicProcessingGroups(locale)` inside a `try/catch` (mirroring the identical pattern used for `listHeaderProductFamilyShortcuts`), passes the result as a `serviceGroups` prop into `SiteHeader`, which maps each group to `{ code, name, path: "/services" }` (`components/layout/SiteHeader.tsx:122`). Confirmed via `docs/HEADER_SERVICES_P6_REPORT.md`:

- Every processing-group dropdown item — desktop and mobile — links to the flat `/services` page. No `/services/<slug>` route exists (`find app -iname "*services*"` returns only `app/[locale]/services/page.tsx`), so no slug was fabricated for per-group deep-linking.
- Zero-data behavior (confirmed live in this audit too — see CURRENT PUBLIC PROCESSING DATA) degrades the Header's "خدمات" item to a plain functional link with no dropdown/expand affordance — the same pre-existing `items.length === 0` guard used for Products.

**Homepage and Header do not share the same Processing domain in practice.** The Header's Services dropdown is wired to the real (currently empty) Public Processing Projection. The Homepage `Capabilities` section is wired to nothing — it is a self-contained editorial block that happens to sit in the "Services" slot of the page composition. They do share **the same underlying frozen architectural principle** (no hardcoded commercial taxonomy) but not the same runtime data path, because Homepage doesn't attempt to render processing/service data at all.

# PUBLIC PROCESSING PROJECTION

`lib/processing/public-repository.ts#listPublicProcessingGroups(locale)` is the sole, network-isolated (`lib/processing/network-isolation.test.ts`) read path into `public_processing_groups`. Shape returned: `{ id: code, name, sequence }` — no slug, no route, no icon/image reference, no `show_on_homepage`/`homepage_sequence` equivalent, no description/body text beyond `name`. This is by design (per the migration's own comment: "a small, deliberately minimal read model feeding a future Header dropdown"), but it means this table **cannot today feed a richer Homepage card** (which would need a description, a destination, possibly an image) without a schema change — which this audit is not authorized to make and which would itself require an owner decision about what a Homepage service card should contain.

`Capabilities` (Homepage) does not import or call `listPublicProcessingGroups` — confirmed by reading its full import list.

# CURRENT PUBLIC PROCESSING DATA

Local D1 migrations were applied (safe, local-only, explicitly permitted by the task):

```
$ npx wrangler d1 migrations apply ahanassa-public --local   -> 10/10 migrations applied successfully
$ npx wrangler d1 migrations apply ahanassa-ops --local      -> 4/4 migrations applied successfully
$ npx wrangler d1 execute ahanassa-public --local --command \
    "SELECT code, locale, name, sequence, is_active FROM public_processing_groups ORDER BY locale, sequence;"
-> results: []   (zero rows, all locales)
```

**Zero public processing groups exist in this environment**, for any locale. This matches `docs/HEADER_SERVICES_P6_REPORT.md`'s own live-verified finding ("zero Processing rows — no Odoo sync has ever run") and `docs/PROCESSING_SYNC_P5_REPORT.md`'s disclosure that DB_PUBLIC is "not yet in production traffic" and no live Odoo Processing API could be verified from any environment available to that or this task. This audit does not fabricate rows to make the projection appear populated — stating the zero-row fact plainly, per the task's own instruction.

Ordering when data does exist: `ORDER BY sequence ASC, code ASC` — deterministic, owner-curated via `sequence` (not alphabetical, not insertion order, not random), capped at `MAX_HEADER_SERVICE_SHORTCUTS = 8`.

# CARD CONTENT

Every field currently rendered per Homepage "Capabilities" item, classified:

| Field | Value example | Classification |
| --- | --- | --- |
| Index badge (`01`–`04`) | `"01"` | Decorative visual content |
| Title | "بررسی نیاز و مشخصات" | Website editorial copy (process-step label, not a commercial service name) |
| Body | "فاکتور، لیست خرید یا شرح نیاز پروژه شما بررسی و..." | Website editorial copy |
| Section eyebrow/title/body | "آنچه ما انجام می‌دهیم" / purchasing-manager framing | Website editorial copy |
| Decorative image | `/images/ops/inspection.png`, `alt=""`, `aria-hidden` | Decorative visual content |

No operational/commercial-truth field (material, operation, finished-requirement, price, capacity, machine type) exists anywhere in this section — there is nothing here that could misrepresent Odoo-owned commercial truth, because the section makes no commercial-processing claims at all.

# CLAIM INTEGRITY

Searched the full rendered copy (all 3 locales, `lib/content/homepage.ts#capabilities` + `lib/content/pages.ts#servicesCopy`) for ownership-implying language: "our factory," "our machines," "our CNC line," "کارخانه ما," "دستگاه ما," "خط تولید ما," and equivalents. **None found.** The actual copy ("بررسی نیاز و مشخصات," "ارزیابی و مقایسه تأمین," "پیشنهاد و تصمیم," "هماهنگی مستندات و تحویل" — requirement review, sourcing evaluation, proposal & decision, documentation & delivery coordination) consistently describes Ahan Asa in a coordination/review role, matching CLAUDE.md §7's confirmed product truth ("a professional purchasing manager, not a... fabricator"). **FALSE OWNERSHIP CLAIM: ABSENT.**

# MATERIAL / OPERATION / FINISHED REQUIREMENT SEPARATION

Not applicable to the current Homepage content — as established in PROCESSING DOMAIN ALIGNMENT, none of these three concepts appears in the `Capabilities` section. No violation exists because there is no attempt at this modeling in the first place. This is recorded as a scope gap (see OWNER DECISIONS REQUIRED), not a modeling defect.

# CUSTOMER METHOD-UNKNOWN UX

The frozen principle (§8 of the Header spec: "the customer must not be forced to know which manufacturing method is technically appropriate") is not violated by Homepage, but only because Homepage's `Capabilities` section makes no method-related claims or choices at all — a customer reading it learns about Ahan Asa's review/decision process, never about cutting vs. CNC vs. punching. The section is method-agnostic by omission rather than by deliberate accommodating design. `/services` is likewise silent on this — its two sections (function list, process steps) never ask or require the visitor to name a processing method.

# DRAWING-BASED REQUEST

`docs/navigation/AHANASSA_HEADER_FINAL_FROZEN_V2.2.md` §23 requires the *Services experience* to "prominently support" **"نقشه دارم؛ روش مناسب را پیشنهاد دهید."** as a first-class entry path. Verified: this string, or any equivalent CTA/link, does not exist anywhere in `components/home/capabilities.tsx`, `app/[locale]/services/page.tsx`, or their content modules (`lib/content/pages.ts`, `lib/content/homepage.ts` — full-file greps for "نقشه" returned no matches).

Classification: **BELONGS ON /services ONLY** — §23 addresses "the Services experience" as a whole, not the Homepage specifically, and HOMEPAGE_SPEC.md §16.1 scopes Homepage's role narrowly ("confirm fit... without turning the homepage into a catalog"). This is not, however, a Homepage-scope finding to close out silently: **/services itself does not implement §23 either**, which is a genuine gap in the authoritative Services experience — flagged here as P1 (out of this Homepage-only task's remediation scope, but the reader should not conclude it is satisfied elsewhere).

# ROUTES

The `Capabilities` component itself contains **zero links or CTAs** — confirmed by reading the full file; there is no `<a>`, no `Link`, no `href` anywhere inside it. There is therefore nothing to validate as "real href / no 404 / no bare #" *within the section* — the routes audit reduces to the one page-level link a visitor could use to reach more detail, `/services`, reached via the Header nav (not via this section).

Live-verified (dev server, see SSR): `/services`, `/en/services`, `/ar/services` each return `HTTP 200`. `/services` carries `<meta name="robots" content="noindex, follow">` and a self-referential canonical (`https://www.ahanassa.com/services`) — consistent with its documented `indexable: false` "draft" status (`HOMEPAGE_SPEC.md` §20.5). No bare `#`, no placeholder link, no dead button exists in either the Homepage section or the `/services` page's two content sections (their list items also carry zero links).

This absence of any link is itself worth flagging: `HOMEPAGE_SPEC.md` §16.2 specified a "destination link" per item and a conditional CTA ("مشاهده حوزه‌های تأمین," §16.5) — neither exists today. Given no approved category/capability hub exists yet (§16.5's own precondition), the absence of the CTA is arguably *compliant* with that precondition rather than a violation of it — but it does mean the section currently offers no forward path into `/services` or anywhere else. See P2 FINDINGS.

# FA

Full-locale content present, complete, and distinct (not a copy-paste of English) for all 4 items plus eyebrow/title/body, verified in `lib/content/pages.ts` and `lib/content/homepage.ts`, and confirmed present in server-rendered HTML via `curl http://localhost:3001/`. **PASS.**

# EN

Same structure, complete, distinct English copy (not a literal translation artifact), confirmed present in server-rendered HTML via `curl http://localhost:3001/en`. **PASS.**

# AR

Same structure, complete, distinct Arabic copy, confirmed present in server-rendered HTML via `curl http://localhost:3001/ar`. **PASS.** No locale silently falls back to English — all three `Record<Locale, ...>` objects in both content modules have explicit, complete `fa`/`en`/`ar` keys (verified by reading the full literals, not merely their type signatures).

Note: the Header spec's own localization concern (comment in `migrations_public/0007_processing_groups.sql`: "no field lets a caller distinguish a genuine `ar` translation from Odoo falling back to another locale's text") applies to the **Processing Projection's** `name` column, not to this Homepage section — Homepage's copy is Website-authored, not Odoo-sourced, so that specific concern does not transfer here.

# HOMEPAGE ELIGIBILITY

Classification: **NOT REQUIRED (for the current content) / MISSING (for a hypothetical Processing-Projection-driven card)**.

- For the *current* static `Capabilities` section, there is no per-item eligibility concept to build — all 4 items always render, in the same fixed order, for every locale. Nothing analogous to Product Showcase's `show_on_homepage`/`homepage_sequence` is needed because there is no larger pool of items to curate from.
- If a future Homepage were to surface real Processing groups (see OWNER DECISIONS REQUIRED), the Product Showcase precedent (`migrations_public/0010_homepage_eligibility.sql` — `ALTER TABLE homepage_product_rank ADD COLUMN show_on_homepage`) is directly analogous and does not yet exist for `public_processing_groups` (confirmed: the `0007_processing_groups.sql` schema has no such column). This would be new schema work, not something this audit is authorized to create.

# ORDERING

Manual, stable, deterministic array order (index 0–3 in `servicesCopy[locale].functions`), rendered with a zero-padded position badge that visually documents the order (`01`–`04`). Not alphabetical, not DB-driven, not random. The order mirrors the real sequential procurement process (review → evaluate → decide → coordinate), which is inherently ordered content, so a fixed manual order is the correct choice here — no defect.

# CARD COUNT / DENSITY

4 cards, 2×2 grid on desktop (`sm:grid-cols-2`), single column below `sm` (640px). Within `HOMEPAGE_SPEC.md` §16.4's "three to six curated links maximum" guidance (even though these are not links). Scannable, not a technical-operation dump — consistent with the task's own instruction not to recommend a "mega-grid of CNC/laser/punching."

# RESPONSIVE

Code-level verification: the `<ul>` uses `grid gap-px ... sm:grid-cols-2 ... lg:col-span-7` with no base `grid-cols-*` utility, so Tailwind's default single-column stacking applies below the `sm` breakpoint (640px) — cards stack vertically with no fixed width, no horizontal-scroll utility, and no carousel markup anywhere in the file (confirmed by reading the full component — no `overflow-x-auto`, no `snap-x`, no slider library import).

Live browser verification was attempted via `claude-in-chrome` against the local dev server. **Disclosed limitation:** `resize_window` was called (390×844) and returned success with no error, but had **zero visible effect** on the actual rendered layout — the screenshot taken immediately after still showed the full desktop header nav (all nav items in one row, no hamburger menu) at an effective width of roughly 1232px. This sandbox's browser window stayed at a fixed desktop-equivalent width regardless of the resize call; genuine mobile-viewport (320/360/390/430/768) rendering was **not** verified live — this is a real tool limitation, not a claim of verification that didn't happen.

What *was* live-verified, at the one fixed ~1232px-wide viewport actually available: the Capabilities section rendered correctly in all three locales (fa RTL: eyebrow, heading, 2×2 grid with 01–04 numbered right-to-left, image left-aligned, no overflow; en LTR: mirrored correctly, all four item titles present, no clipping; ar RTL: same layout as fa, correct mirroring, no overflow), and `/services`'s two grids (four "functions" cards, six-step process list) rendered correctly with no visual defects. No overflow, clipping, broken wrapping, or contrast issues were observed at that one width. Sub-`sm`-breakpoint (mobile) behavior is therefore verified by CSS/code reading only, not by an actual narrow-viewport screenshot — disclosed explicitly rather than claimed.

# ACCESSIBILITY

- Heading hierarchy: section uses `<h2>` (via `SectionHeading`) for the section title, `<h3>` for each card title — correct nesting, no skipped levels.
- Semantic structure: cards are `<li>` elements inside a real `<ul>` (via `Reveal`'s `as="li"`), not `<div>` soup.
- Decorative image: `aria-hidden="true"`, empty `alt=""` — correct treatment for a non-informational image.
- Link/keyboard semantics: not applicable — the section contains no interactive elements (no links, no buttons), so there is nothing to be keyboard-inaccessible or missing a focus-visible state. (This is also why ROUTES flags the section as offering no forward path — the same fact cuts both ways.)
- No hover-only information: confirmed — the only `hover:` utility (`hover:bg-white/[0.04]`) is a background-tint affordance on an already-fully-visible card; no content is revealed only on hover.
- Reduced motion: `@media (prefers-reduced-motion: reduce)` in `styles/theme-extensions.css` neutralizes `.reveal`/`.reveal[data-reveal="revealed"]` to `opacity:1; transform:none; animation:none` — verified by reading the stylesheet directly.
- Contrast: reuses the same `text-white/55` on `bg-navy` / `text-copper-400` token pattern already used elsewhere on the homepage (Assurance, Process sections) — not a new pattern introduced here, so no new contrast risk is introduced by this component specifically.
- 200%/400% reflow: verified via CSS reading only (no fixed pixel widths, no fixed-height containers that would clip reflowed text) — **not live-verified at these zoom levels**, disclosed per the task's own honesty requirement.

# SSR

Live-verified, not merely read from source. Dev server started (`npm run dev`, picked port 3001 automatically — 3000 was in use by another process). `curl`'d all three locale homepages and `/services` with no JavaScript execution involved (curl never runs JS):

```
curl http://localhost:3001/     -> HTTP 200, contains "بررسی نیاز و مشخصات", "آنچه ما انجام می‌دهیم"
curl http://localhost:3001/en   -> HTTP 200, contains "Requirement &amp; specification review"
curl http://localhost:3001/ar   -> HTTP 200, contains "مراجعة الاحتياج والمواصفات"
curl http://localhost:3001/services -> HTTP 200, robots noindex,follow; canonical present
```

All service/capability copy is present in the raw server-rendered HTML for all three locales. **PASS.**

# JS-OFF

Proven two ways, not merely asserted:

1. **Live SSR-source proof (this audit):** `grep -o 'class="reveal' /tmp/home-fa.html` found the class present with **no `data-reveal` attribute at all** in the server-rendered markup — matching `components/ui/reveal.tsx`'s own documented contract ("static" phase, which is the SSR baseline, emits no attribute). `.reveal` alone (per `styles/theme-extensions.css`, read directly) "declares NOTHING that could hide the element — no opacity, no transform, no transition." Content is visible with zero JavaScript execution, proven from the actual bytes the server sent, not from source-code intention alone.
2. **Existing automated test, applicable to this exact component:** `lib/catalog/homepage-progressive-enhancement.test.ts` ("every Reveal consumer inherits the fix — none reimplements a hiding baseline of its own") explicitly lists `components/home/capabilities.tsx` as one of five required `Reveal` consumers and asserts none of its `opacity-0` usages (if any) lack a `hover:`/`focus:`-restoring pair. This test is part of the 941/941 passing suite (see TESTS) — the Capabilities component inherits the Product Showcase P0-1 fix, it does not reintroduce the old hidden-state bug. **PASS.**

# FAILURE ISOLATION

Not applicable in the strict sense the task anticipates: `components/home/capabilities.tsx` performs **zero I/O** — no database read, no fetch, no import of any repository module. It cannot fail due to a Public Processing Projection outage, a zero-group result, a missing localization row, or an invalid service link, because it has no dependency on any of those things. Structurally, this section can never break Homepage rendering for a data-layer reason — its only possible failure mode is a build-time TypeScript/content error, already caught by `tsc --noEmit` and `npm test` (see TESTS/TSC).

This is presented neutrally, not as a virtue: it is failure-isolated *because* it never attempted the integration the frozen architecture describes, not because a resilience mechanism was deliberately engineered for it (contrast with `app/[locale]/page.tsx`'s explicit `try/catch` around `listHomepageProductCandidates`, and `app/[locale]/layout.tsx`'s explicit `try/catch` around `listPublicProcessingGroups` for the Header — both real failure-isolation code that Homepage's Capabilities section has no equivalent of, because it has nothing to isolate from).

# PERFORMANCE

- Client JS: one shared `"use client"` component (`Reveal`), already mounted elsewhere on the homepage (Product Showcase, Reach, Process) — no new client-side dependency introduced by Capabilities specifically.
- Images: exactly one decorative image (`next/image`, `fill`, `sizes="(min-width: 1024px) 40vw, 100vw"`), dimensions reserved by an `aspect-4/3` container — no layout-shift risk.
- No additional third-party or heavy dependency imported by this component (verified via its full import list — `next/image`, two internal UI components, two internal content modules).
- Reveal's entrance animation is CSS-driven (`@keyframes`), not a JS-animated loop — negligible runtime cost, already established/measured in the Product Showcase audits this component reuses the exact same mechanism from.

No implementation change was made or is being proposed here.

# P0 FINDINGS

None. No false ownership claim, no dead primary route, no hardcoded commercial source-of-truth, and no accessibility blocker was found in the current Homepage Services/Capabilities implementation.

# P1 FINDINGS

1. **No dedicated Homepage Services frozen specification exists**, and the one specification that used to own this section's content model (`HOMEPAGE_SPEC.md` §16, "Capabilities and Material Orientation") has never been reconciled against the later, much richer Processing & Services Architecture (`AHANASSA_HEADER_FINAL_FROZEN_V2.2.md` §5–§27). The two describe materially different content models for what is nominally the same homepage slot (a destination-linked material/capability-hub grid vs. the current process-narrative strip). This is the central architectural gap this audit exists to surface — see HOMEPAGE SERVICES SPEC READINESS / OWNER DECISIONS REQUIRED.
2. **`docs/navigation/AHANASSA_HEADER_FINAL_FROZEN_V2.2.md` §23's drawing-based-request entry point ("نقشه دارم؛ روش مناسب را پیشنهاد دهید.") is not implemented anywhere in the "Services experience,"** including `/services` itself, not only Homepage. This is a real gap in the authoritative Services page, out of this Homepage-scoped task's remediation but not something a future task should assume is already satisfied elsewhere.
3. **`public_processing_groups` has zero rows in every available environment** (confirmed live locally; the P5/P6 reports independently confirm the same for staging-equivalent state), and no live Odoo Processing API/module has ever been verified to exist. Any future decision to have Homepage consume this projection is currently a decision to consume an empty, never-yet-populated data source — worth surfacing before committing to a P1 design.

# P2 FINDINGS

1. The Homepage `Capabilities` section offers **no forward link at all** (not even to `/services`) — a visitor who finds this section compelling has no in-section path to learn more, unlike `HOMEPAGE_SPEC.md` §16.2/§16.5's original per-item destination link and conditional CTA. Low severity because the Header's persistent "خدمات" nav item remains one click away at all times, but worth a deliberate owner call rather than a silent permanent absence.
2. `public_processing_groups` (migration `0007`) has no slug/route column — even if Homepage or Header wanted true per-group deep links today, the schema could not support it without a migration. Flagging now so a future decision-maker isn't surprised.

# P3 FINDINGS

1. `SectionHeading` is not given a `headingId`/`aria-labelledby` wiring for the `<section>` element in `Capabilities` (an available, optional feature of that component per its own doc-comment) — minor, consistent with most other homepage sections' current state, not a regression introduced here.
2. The component/file name `Capabilities` no longer matches the customer-facing framing ("آنچه ما انجام می‌دهیم" / "What we do") — harmless internally, but a future reader searching for "Services" by filename will land on `components/home/capabilities.tsx` only by knowing this audit's finding, not by naming convention.

# HOMEPAGE SERVICES SPEC READINESS

**PARTIAL.**

The Processing Domain / Public Services Taxonomy is frozen and substantially built at the *architecture and Header* level: the three-concept model (§6), the by-material/by-need discovery direction (§22), the "hardcoded commercial services prohibited" rule (§26), and a real, tested, network-isolated read path into DB_PUBLIC (`lib/processing/`) all exist and were verified in this audit. The Header's own Services dropdown correctly consumes this projection today (currently degrading gracefully to a plain link, since the projection is empty).

What does **not** exist is any frozen decision about what the **Homepage** should do with this domain: whether it should surface Processing groups at all (as opposed to /services being the only Processing-taxonomy-facing surface), what a Homepage service card would contain beyond the projection's current minimal `{code, name, sequence}` shape, who curates which groups appear on Homepage and in what order, and what a card would link to given no per-group route exists. `HOMEPAGE_SPEC.md` §16 answers a version of these questions, but for a content model (material/capability-hub links) that predates the Processing Domain architecture and has never been checked against it.

# OWNER DECISIONS REQUIRED

1. **Should Homepage surface real Processing-Domain data at all**, or is the current process-narrative `Capabilities` strip the intended permanent Homepage content, with by-material/by-need service discovery reserved exclusively for `/services`? (This is the threshold question — every decision below depends on the answer.)
2. **If Homepage should surface Processing data:** who curates which of the frozen top-level intent families (§22.2: برش و اندازه‌سازی / سوراخکاری و ایجاد حفره / خمکاری و شکل‌دهی / رزوه و آماده‌سازی انتها / ساخت قطعه طبق نقشه) or which by-material groups (§22.1) appear on Homepage, in what order, and by what mechanism (a Product-Showcase-style `show_on_homepage`/`homepage_sequence` column does not yet exist on `public_processing_groups` and would need new schema work)?
3. **Card link destination:** since `public_processing_groups` has no slug/route field and no `/services/<slug>` route exists anywhere in the app, what should a Homepage (or a richer Header) service card link to — the current plain `/services`, or should a per-group route/slug be designed first? This decision also affects the already-shipped Header dropdown, not only a future Homepage card.
4. **Whether the drawing-based-request entry point (§23)** is REQUIRED ON HOMEPAGE, USEFUL BUT OPTIONAL, or BELONGS ON /services ONLY. This audit's own reading (see DRAWING-BASED REQUEST) is BELONGS ON /services ONLY given HOMEPAGE_SPEC.md §16.1's narrow "confirm fit" framing for Homepage — but the fact that /services doesn't implement it either means the owner should also decide when/whether that gap gets closed, independent of Homepage.
5. **`HOMEPAGE_SPEC.md` §16 should be explicitly reconciled** with `AHANASSA_HEADER_FINAL_FROZEN_V2.2.md` §5–§27 — either by superseding §16's destination-link/CTA content model in favor of the current process-narrative approach (documented as an intentional, permanent substitution), or by defining how/when §16's original material/capability-hub model will be built once Processing data exists. Leaving both undecided means a future implementer could legitimately read either document as authoritative and build two different things.

# SERVICES-HOME-P1 BOUNDARY

Not defined — blocked on the owner decisions above. Per the task's own explicit instruction ("Do not silently design the component if authority is incomplete"), no P1 scope is proposed here. Once decision #1 above is answered "yes, Homepage should surface Processing data," the smallest safe P1 boundary would likely mirror the Header's own P5/P6 pattern (a read-only, try/catch-isolated, empty-array-safe consumption of `listPublicProcessingGroups`) — but the card content, link destination, and curation mechanism cannot be scoped until decisions #2–#3 are made, and no P1 should begin while `public_processing_groups` remains a zero-row projection with no verified upstream contract (per P1 FINDING #3).

# FILES CREATED

- `docs/services/SERVICES_HOME_P0_CURRENT_IMPLEMENTATION_AUDIT.md` (this file, and the new `docs/services/` directory it required)

# FILES MODIFIED

None. No runtime code, spec, or migration file was changed by this task.

# TESTS

```
$ npm test
...
ℹ tests 941
ℹ suites 0
ℹ pass 941
ℹ fail 0
ℹ cancelled 0
ℹ skipped 0
ℹ todo 0
```

All 941 pre-existing tests pass, unmodified, including the 42 `lib/processing/*.test.ts` tests (public-repository: 6, security-allowlist: 2, network-isolation: 5, odoo-api-client: 14, sync: 15) and `lib/catalog/homepage-progressive-enhancement.test.ts`'s explicit assertion that `components/home/capabilities.tsx` is a compliant `Reveal` consumer. No test references "Capabilities," "capabilities," or `servicesCopy` by name beyond the one file-path reference in `homepage-progressive-enhancement.test.ts` already cited under JS-OFF — there is no dedicated `capabilities.test.tsx`.

# TSC

```
$ npx tsc --noEmit
(no output, exit 0)
```

Clean.

# BUILD

```
$ npm run build
> vinext build
[1/5] analyze client references... 495 modules transformed, built in 884ms
[2/5] analyze server references... 228 modules transformed, built in 302ms
[3/5] build rsc environment... 487 modules transformed, built in 799ms
[4/5] build client environment... 2010 modules transformed, built in 1.30s
[5/5] build ssr environment... 228 modules transformed, built in 485ms

Route (app)
  ƒ /:locale
  ƒ /:locale/about
  ƒ /:locale/contact
  ƒ /:locale/industries
  ƒ /:locale/markets
  ƒ /:locale/products
  ƒ /:locale/products/:slug
  ƒ /:locale/request
  ƒ /:locale/services
  λ /api/hello
  λ /api/rfqs

Build complete. Run `vinext start` to start the production server.
```

Succeeds cleanly.

# GIT

Working tree was clean before this task began (`18c6793`). The only change introduced by this task is the new file `docs/services/SERVICES_HOME_P0_CURRENT_IMPLEMENTATION_AUDIT.md` (and its new parent directory). No other file in the working tree was touched — verified with `git status --short` and `git diff --check` immediately before committing (see below).

# PRODUCTION SAFETY

- Local D1 migrations were applied only to this worktree's **local** `.wrangler/state` simulation (`--local` flag on every `wrangler d1 migrations apply`/`wrangler d1 execute` call) — no `--remote` flag was ever used, no staging/production D1 database was touched, read, or written.
- No network call was made to `odoo.ahanassa.com` or any other external Odoo endpoint.
- No secret, credential, or environment variable was read, logged, or exposed.
- The local dev server (`npm run dev`, port 3001) was stopped after the audit's live checks completed; no server process was left running.
- No file outside `docs/services/SERVICES_HOME_P0_CURRENT_IMPLEMENTATION_AUDIT.md` was created or modified.
- No push, deploy, or remote git operation was performed.

# NEXT PHASE

`SERVICES-HOME-P1` is **blocked on the five owner decisions listed above**, not ready to scope. The recommended next step is not an implementation task but a short owner-facing decision request covering exactly those five questions — ideally producing a dedicated `docs/services/AHANASSA_SERVICES_HOME_FROZEN_V1.0.md` (or equivalent) that plays the same role for Homepage that `AHANASSA_HEADER_FINAL_FROZEN_V2.2.md` §27 already plays for the Header, before any component code changes.
