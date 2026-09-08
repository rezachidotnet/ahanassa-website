# Homepage HP-R1 — Reconciliation & Buyer Value Implementation Report

**Phase:** HP-R1 — Apply new Homepage freezes + Buyer Value
**Date:** 2026-09-08
**Branch:** `worktree-hp-r1`
**Report location:** `docs/homepage/HOMEPAGE_HP_R1_RECONCILIATION_IMPLEMENTATION_REPORT.md`

Location rationale: this is a page-level reconciliation governed by the two
page-level freezes in `docs/homepage/`, so the record sits beside them —
matching the established convention where each governed concern keeps its
freeze and its implementation reports in one area directory
(`docs/hero/`, `docs/product-showcase/`, `docs/evaluation-assurance/`,
`docs/purchase-process/`, `docs/pricing/`, `docs/discoverability/`).

```
HOMEPAGE AUTHORITY: Composition V1.0
VISUAL AUTHORITY: Visual System & Motion V1.0
BUYER VALUE AUTHORITY: Buyer Value / Service Promise V1.0
HOMEPAGE ORDER: PASS
EVALUATION ON HOMEPAGE: ABSENT
PURCHASE PROCESS ON HOMEPAGE: ABSENT
PURCHASE PROCESS SPEC: RETAINED
BUYER VALUE: IMPLEMENTED
BUYER VALUE FA: PASS
BUYER VALUE EN: PASS
BUYER VALUE AR: PASS
PRODUCT SHOWCASE ARCHITECTURE: PRESENT
PRODUCT SHOWCASE LOCAL RENDER: PASS
PRODUCT ROOT CAUSE: B — local schema/migration mismatch (migration 0010 unapplied in local DB_PUBLIC)
PRICE STRIP: OMITTED
EVIDENCE: OMITTED
EVIDENCE MIN ELIGIBLE: 100
INDUSTRIES: ELIGIBLE
FINAL CTA: PRESENT
LEGACY HOMEPAGE SECTIONS: ABSENT
ODOO LIVE RENDER DEPENDENCY: ABSENT
DB_PUBLIC DEPENDENCY: Product Showcase only; read server-side inside its own try/catch, fails closed to an omitted section; local D1 migrated 0001-0010, remote 0010 PENDING
REMOTE MIGRATION 0010: PENDING
PUSH: NO
DEPLOY: NO
```

---

# RESULT

**A. HOMEPAGE RECONCILIATION COMPLETE — READY TO CONTINUE REMAINING HOMEPAGE COMPONENTS.**

Justification, and specifically why classification A is defensible here: the
task forbids A while "the Product Showcase omission remains unexplained". It is
not unexplained. It was traced end-to-end to a single, reproduced, non-website
cause — `migrations_public/0010_homepage_eligibility.sql` was never applied to
the local DB_PUBLIC, so the column `homepage_product_rank.show_on_homepage`
that `listHomepageProductCandidates` filters on did not exist, the D1 prepare
threw, the Homepage's scoped catch emptied the candidate list, and the section
correctly omitted itself. Applying 0010 to a **local disposable** copy made the
section render its three real FA templates with routes that all resolve 200.
The website code was correct throughout and needed no fix.

The one honest gap is visual: **no live browser was available** (no Chrome
extension connected), so appearance was verified structurally — server-rendered
DOM and compiled CSS — rather than by looking at rendered pixels. That gap does
not touch composition, content, semantics, data flow or claim safety, all of
which are verified, and it does not block the remaining component work. It is
recorded precisely in RESPONSIVE MATRIX and VISUAL below, and the one number it
affects (the Buyer Value 2×2 breakpoint) is called out in the component's own
doc comment as computed rather than measured.

---

# PREFLIGHT

| Item | Value |
|---|---|
| Working directory | `/Users/reza/Developer/ahanassa-website/.claude/worktrees/hp-r1` |
| Branch | `worktree-hp-r1` |
| Starting HEAD | `6308577d6afaeeb787e947317f77d326945b51b3` |
| Working tree at start | clean |
| Baseline suite | 1034 pass / 0 fail |
| `AGENTS.md` | **NOT FOUND** anywhere in the repository. `CLAUDE.md` is the operating contract and was followed. |
| Toolchain note | The worktree had no `node_modules`. A symlink to the main checkout's `node_modules` was created; it is gitignored and never appears in `git status`. |

No worktree was created, no `git worktree` command was run, no `EnterWorktree`
tool was called. No write-isolation guard, permission denial or tool refusal
was encountered at any point, and none was bypassed.

---

# BASE SHA

`6308577d6afaeeb787e947317f77d326945b51b3` — "docs: record AI search GEO
foundation audit", a descendant of Purchase Process V2.0's freeze `04667f0`.
Confirmed at preflight.

---

# AUTHORITY FILES

Imported byte-for-byte from `~/Downloads/`. Directory placement follows the
established one-directory-per-governed-concern convention:

| Source | Target | Why there |
|---|---|---|
| `AHANASSA_HOMEPAGE_COMPOSITION_AND_CUSTOMER_JOURNEY_FREEZE_V1.0.md` | `docs/homepage/` | Page-level authority |
| `AHANASSA_HOMEPAGE_VISUAL_SYSTEM_AND_MOTION_FREEZE_V1.0.md` | `docs/homepage/` | Page-level authority |
| `AHANASSA_HOMEPAGE_IMPLEMENTATION_PROMPT_AND_CHECKLIST_V1.0.md` | `docs/homepage/` | Procedural artifact for the same concern |
| `AHANASSA_BUYER_VALUE_SERVICE_PROMISE_COMPONENT_FREEZE_V1.0.md` | `docs/buyer-value/` | **Component**-level freeze — every other component freeze (Hero, Product Showcase, Evaluation/Assurance, Purchase Process, Price Strip, Button) lives in its own area directory, so Buyer Value gets one too. This also keeps `docs/homepage/` reserved for page-level authorities, mirroring how `docs/discoverability/` holds site-wide governance. |

`DOCS_INDEX.md` was **not** modified: it indexes root-level and `docs/*.md`
documents but contains no entry for any `docs/<area>/` component-freeze
directory. Hero V2.4, Product Showcase V2.0, Evaluation V2.1 and Purchase
Process V2.0 were all added without `DOCS_INDEX.md` entries; this follows that
precedent rather than inventing a new one.

---

# AUTHORITY HASHES

Recomputed independently at import, and re-verified after the governance commit
to prove the imported documents were never edited:

| File | SHA-256 (source == target) |
|---|---|
| `docs/homepage/AHANASSA_HOMEPAGE_COMPOSITION_AND_CUSTOMER_JOURNEY_FREEZE_V1.0.md` | `22f856cc228a3f63a70432275d33e1fce23fc091c09eb49065737f3d14ccd9f2` |
| `docs/homepage/AHANASSA_HOMEPAGE_VISUAL_SYSTEM_AND_MOTION_FREEZE_V1.0.md` | `b2bdb1c50b7e452466452499f3ceb999eaf6a348971714e72573e5ddb89ec643` |
| `docs/homepage/AHANASSA_HOMEPAGE_IMPLEMENTATION_PROMPT_AND_CHECKLIST_V1.0.md` | `3b00f1453ca2527b6f732ad809561acf09ff74ab66508a42a8eb22a006cf8318` |
| `docs/buyer-value/AHANASSA_BUYER_VALUE_SERVICE_PROMISE_COMPONENT_FREEZE_V1.0.md` | `f8c25f0bdc413cb9cd7a4e6e5eedae1418d830343b7eaded7cff18a6ee0c1020` |

All four match their `~/Downloads/` sources exactly. The four source files were
read only and are unmodified.

---

# AUTHORITY IMPORT COMMIT

`65363b55a3aa90c33bb6b28baae3517397884c6b` — "docs: import frozen Homepage V1
architecture". Four added files, documents only, no runtime change.

---

# AUTHORITY PRECEDENCE

Applied exactly as each document scopes itself:

1. **Composition & Customer Journey V1.0** — section presence, order, message
   ownership, conditional rendering, removal/relocation. Wins on *what renders
   and in what order*.
2. **Visual System & Motion V1.0** — colors, surfaces, geometry, spacing,
   motion, progressive enhancement. Wins on *how it looks and moves*. Its §3
   explicitly disclaims component order and inclusion.
3. **Buyer Value / Service Promise V1.0** — that component's copy, semantics,
   layout, claim safety, accessibility.
4. **Implementation Prompt & Checklist V1.0** — **procedural only**. Where it
   restated a freeze it was followed; it was never allowed to redefine one.

Site-wide baselines preserved and not reopened: AI Search/GEO Discoverability
V1.1, Header V2.0, Hero V2.4, Price Strip V2.1, Product Showcase V2.0, Button
V1.0.

One authority question was resolved by reading rather than assuming: the
**≥100 eligible operational records** rule is stated by the *Composition*
freeze (§6.5, §19.9), not the Buyer Value freeze. Buyer Value §6 only
cross-references it. The Composition freeze is therefore the cited authority
throughout this report.

---

# HOMEPAGE BEFORE STATE

Traced from `app/[locale]/page.tsx` at `6308577`, not assumed:

```
Global Header                     app/[locale]/layout.tsx
  <Hero>                          components/home/hero.tsx
  <PriceStrip>                    components/home/price-strip.tsx      [conditional]
  <ProductShowcase>               components/home/product-showcase.tsx [data-driven]
  <EvaluationAssurance>           components/home/evaluation-assurance.tsx
  <Process>                       components/home/process.tsx
  <Reach>                         components/home/reach.tsx
  <CtaBand>                       components/ui/cta-band.tsx
  <JsonLd> Organization + WebSite
Global Footer                     app/[locale]/layout.tsx
```

**Legacy-name scan across `app/ components/ lib/ styles/ config/`:**
`RiskGrid`, `RoleComparison`, `ProcessSteps`, `ControlPillars`, `TrustBand`,
`SuitabilityFaq`, `Capabilities`, old `Assurance` — **zero occurrences**. All
had already been retired in earlier phases; the only textual hits were
historical explanations inside doc comments. No component file for any of them
exists. Nothing needed removing.

Verified Evidence: **no component, no data contract, no threshold, no metric**
anywhere in the repository. Industries / Use Cases: served by `Reach`, already
in the correct relative slot between the process sections and the Final CTA.

---

# HOMEPAGE AFTER STATE

```
Global Header                     app/[locale]/layout.tsx
  <Hero>                          components/home/hero.tsx              (untouched)
  <PriceStrip>                    components/home/price-strip.tsx       [conditional -> OMITTED]
  <ProductShowcase>               components/home/product-showcase.tsx  (untouched; 3 FA cards locally)
  <BuyerValue>                    components/home/buyer-value.tsx       (NEW)
  — Verified Evidence —           not implemented -> OMITTED, correctly
  <Reach>                         components/home/reach.tsx             [Industries -> ELIGIBLE] (untouched)
  <CtaBand>                       components/ui/cta-band.tsx            (untouched)
  <JsonLd> Organization + WebSite (untouched)
Global Footer                     app/[locale]/layout.tsx               (untouched)
```

The entire code delta in `app/[locale]/page.tsx` is five lines:

```
-import { EvaluationAssurance } from "@/components/home/evaluation-assurance";
-import { Process } from "@/components/home/process";
+import { BuyerValue } from "@/components/home/buyer-value";
-      <EvaluationAssurance locale={locale} />
-      <Process locale={locale} />
+      <BuyerValue locale={locale} />
```

Everything else added to that file is a module-level doc comment recording the
frozen composition and the conditional/supersession reasoning.

---

# COMPOSITION

Matches Composition Freeze §4 exactly. Verified three ways:

1. **Source order** — `lib/content/homepage-composition-invariants.test.ts`
   asserts Hero < PriceStrip < ProductShowcase < BuyerValue < Reach < CtaBand,
   and separately asserts the page returns one flat fragment with no
   reordering wrapper, so source order *is* render order.
2. **The freeze itself** — a test re-reads §4's own ordering block from the
   imported document and asserts it lists those sections in that order, so this
   test file cannot drift from the authority it encodes.
3. **Server HTML** — heading sequence in the live FA render:
   `<h1>` (Hero) → `home-product-showcase-heading` → 3 product `<h3>` →
   `home-buyer-value-heading` → 4 promise `<h3>` → Reach `<h2>` → 5 industry
   `<h3>` → Final CTA `<h2>` → footer headings.

Relative order is preserved under omissions by construction: each conditional
section returns `null` from inside itself, so removing one cannot reorder the
rest. Demonstrated live — the EN and AR renders omit Product Showcase entirely
and every remaining section keeps its position.

---

# SUPERSESSIONS

| Component | Decision | Durable status | Files |
|---|---|---|---|
| Evaluation / Assurance V2.1 | Removed from Homepage rendering; replaced by Buyer Value | **SUPERSEDED FOR HOMEPAGE — replaced by Buyer Value / Service Promise V1.0** | ALL RETAINED: `components/home/evaluation-assurance.tsx`, `lib/content/evaluation-assurance.ts`, `homepageCopy.*.evaluationAssurance`, `docs/evaluation-assurance/**` |
| Purchase Process V2.0 | Removed as an independent Homepage section | **RETAINED OUTSIDE HOMEPAGE — reserved for a dedicated `/process` page.** Explicitly NOT globally superseded. | ALL RETAINED: `components/home/process.tsx`, `lib/content/purchase-process.ts`, `homepageCopy.*.purchaseProcess`, `docs/purchase-process/**` |

Nothing was deleted. Both frozen specs keep their complete original bodies and
gained a status notice above the title (Implementation Checklist §3: "Add a
visible status notice to each actual old specification, without deleting its
historical body"). A register was added at
`docs/homepage/HOMEPAGE_SUPERSESSION_REGISTER.md`.

Purchase Process is deliberately **not** labelled globally superseded, on the
Buyer Value freeze's own §21: "Purchase Process remains a separate retained
specification for the future /process page and is not superseded by this
component."

Two tests exist purely to fail if a future change deletes any retained file.

**Five superseded assertions were updated, not deleted.** The two existing
frozen-spec invariant files each pinned the *old* Homepage placement. Those
specific assertions are now superseded by Composition §8/§16.5/§16.6, so they
were rewritten to pin the supersession (the Homepage must NOT render the
component, and the files must NOT be deleted). Every content, semantic,
layout and claim-safety assertion in both files is untouched and still passing.

---

# HERO PRESERVATION

`components/home/hero.tsx` is byte-for-byte unmodified. So are its content
fields, its image, its copy, its CTA pair, and its 4-step micro-journey.

Verified in the live FA render: H1 `تأمین فولاد پروژه‌ها`, brand line
`ما مراقب سرمایه شما هستیم.`, reassurance
`ارسال لیست خرید برای شما تعهدی ایجاد نمی‌کند.`, the four rail steps, and the
secondary phone CTA `درخواست قیمت تلفنی` — all present.

Composition §7's duplication gate is enforced structurally, not by keyword
scan: a test asserts the Hero is the **only** Homepage section that renders the
`process` step array at all, and separately that it still does render it (so
removing the rail fails the test rather than silently satisfying it). A
second, copy-level test asserts no multi-word Hero step label appears in the
Buyer Value copy. Single-word labels are deliberately excluded from that scan —
the FA step `خرید` ("purchase") is an ordinary noun that legitimately occurs in
Buyer Value's own approved copy, and banning it would be a false positive
rather than a duplication of the journey.

---

# PRICE STRIP

**OMITTED**, and correctly so. `PRICE_STRIP_ENABLED` is not `"true"`, so
`app/[locale]/page.tsx` never even imports the pricing repository — zero
DB-related code path executes. `components/home/price-strip.tsx` is unmodified;
its provider-agnostic architecture was not touched and **no real-price provider
was activated**.

Omission quality: the component returns `null` *before* any `<section>` or
`<h2>` is constructed, so nothing survives — no empty heading, no shell, no
skeleton, no background band, no placeholder price. Confirmed in the server
HTML: the string `selected-prices-heading` does not appear. A test asserts the
`return null` precedes the first heading marker in the source, so the property
holds structurally rather than by inspection.

---

# PRODUCT SHOWCASE DIAGNOSIS

**Root cause: (B) local schema/migration mismatch.** Not a website defect. No
fix was applied to the website, and none was warranted.

Traced, not guessed:

1. `app/[locale]/page.tsx` calls
   `lib/catalog/editorial-repository.ts#listHomepageProductCandidates`.
2. That query's WHERE clause appends
   `HOMEPAGE_ELIGIBILITY_WHERE_CONDITION = "(hpr.show_on_homepage IS NULL OR hpr.show_on_homepage = 1)"`.
3. `show_on_homepage` is added by `migrations_public/0010_homepage_eligibility.sql`.
4. Inspecting the local D1 store directly
   (`.wrangler/state/v3/d1/miniflare-D1DatabaseObject/f8ff…sqlite` = DB_PUBLIC),
   `d1_migrations` listed **0001–0009 only**. `0010` was never applied, and
   `.schema homepage_product_rank` confirmed the column was absent.
5. Replaying the exact production query against that database reproduced the
   failure verbatim:
   `Error: in prepare, no such column: hpr.show_on_homepage`.
6. That throw is caught by the page's tightly scoped try/catch, logged as
   `HOMEPAGE_PRODUCT_SHOWCASE_READ_ERROR`, and leaves `homepageProducts = []`.
7. `ProductShowcase` returns `null` for zero items (V2.0 §35/§82 "0 cards →
   Section hidden"), so the whole section is omitted.

**Proof of the cause, both directions.** Applying `0010` to a disposable
scratchpad *copy* of the database made the identical query return three real
rows. Then, applying it via
`npx wrangler d1 migrations apply ahanassa-public --local` against the
worktree's own disposable copy of the local D1, wrangler independently reported
`0010_homepage_eligibility.sql` as the **single** pending migration — confirming
the diagnosis without relying on my own reading of the schema — and the live
dev server then rendered three product cards on the FA Homepage.

Ruled out with evidence, not assumption: (A) no eligible data — false for FA,
three eligible templates exist; (C) sync missing/stale — the catalog data is
present and correct, only the website-owned merchandising column was missing;
(D) website filtering defect — the predicate is correct and is deliberately
NULL-safe via LEFT JOIN, exactly as its own doc comment specifies; (E) route
defect — all three routes resolve 200; (F) hidden by CSS/motion — the section
was genuinely absent from the DOM, not merely invisible, and `Reveal` has no
hidden resting state anyway.

**Secondary finding, separate cause.** In **EN and AR** the section is omitted
for a different and also-correct reason: `product_seo_contents` holds three
rows locally, **all `locale='fa'`**. There is no approved, published EN or AR
editorial content, so those locales have genuinely zero eligible candidates —
classification (A), a local content/publication state, not a defect. This is
also a live demonstration that the fail-closed path works: EN and AR drop the
whole section and every other Homepage section still renders.

**No inventory condition was introduced.** `show_on_homepage` remains pure
website merchandising metadata, never written by the Odoo sync, never derived
from price or stock.

---

# PRODUCT SHOWCASE DATA FLOW

```
app/[locale]/page.tsx
  └─ try { listHomepageProductCandidates(locale, { mode }) }        ← scoped catch
       └─ lib/catalog/editorial-repository.ts
            └─ getPublicDb()  →  DB_PUBLIC (D1)
                 SELECT cp.*, s.slug, s.h1, s.intro, rep family/group, hpr.*
                 FROM catalog_products cp
                 JOIN product_seo_contents s ON entity_type='product'
                 LEFT JOIN homepage_product_rank hpr                 ← sparse overlay
                 WHERE  cp.is_active=1 AND cp.is_public=1
                    AND s.locale=? AND s.content_quality_status='approved'
                    AND s.published_at IS NOT NULL AND s.h1 IS NOT NULL   ← shared with /products
                    AND (hpr.show_on_homepage IS NULL OR = 1)             ← Homepage-only gate (0010)
            └─ computeHomepageScore(base + demand + boost) → sort → slice(limit)
  └─ <ProductShowcase items={...}>  → 0 items ⇒ return null (whole section omitted)
       └─ per card: localizedPath(locale, `/products/${p.slug}`)     ← same field /products/[slug] resolves
```

No Odoo call is on this path. **ODOO LIVE RENDER DEPENDENCY: ABSENT** — the
component and the page make zero synchronous Odoo requests; the read model is
DB_PUBLIC only. Failure isolation is asserted by test: the catch contains only
this one read, the price-strip read runs ahead of and outside it, and rendering
happens after both.

---

# PRODUCT SHOWCASE ELIGIBILITY

Local DB_PUBLIC after applying 0010 to the worktree's disposable copy:

| Table | Rows |
|---|---|
| `catalog_products` | 13 |
| `product_seo_contents` | 3 (all `fa`) |
| `product_variants` | 237 |
| `homepage_product_rank` | 0 (sparse overlay — every template reads as eligible) |

| Locale | Eligible | Rendered |
|---|---|---|
| fa | 3 | 3 cards |
| en | 0 | section omitted |
| ar | 0 | section omitted |

`HOMEPAGE_PRODUCT_DISPLAY_COUNT` remains **6** in `lib/catalog/homepage-config.ts`
— deliberately unchanged. The frozen 0–8 composition matrix and the
`.aa-showcase-grid` layout that supports up to eight cards are untouched;
changing the configured count was out of scope. Manual priority, localized
labels, image mapping and zero-inventory independence are all unmodified.

---

# PRODUCT ROUTES

Every rendered FA card link fetched against the live dev server:

| URL | Status |
|---|---|
| `/products` (section CTA) | 200 |
| `/products/square-hollow-section-shs` | 200 |
| `/products/rebar-aj340` | 200 |
| `/products/hot-rolled-plate-s355jr` | 200 |

No 404s, no dead sample slugs, no query-state masquerading as a page. Each
`href` is built from the candidate's own `slug`, the same field
`/products/[slug]` resolves against. EN/AR have no eligible products locally,
so there are no links to validate in those locales — recorded as a data state,
not a pass.

---

# BUYER VALUE IMPLEMENTATION

| File | Change |
|---|---|
| `components/home/buyer-value.tsx` | NEW — the component |
| `lib/content/buyer-value.ts` | NEW — `BUYER_VALUE_PROMISE_COUNT`, `buyerValuePromiseIndex()` |
| `lib/content/homepage.ts` | `buyerValue` field added to the interface and to fa/en/ar |
| `app/[locale]/page.tsx` | renders `<BuyerValue locale={locale} />` after Product Showcase |
| `lib/content/buyer-value-frozen-spec-invariants.test.ts` | NEW — 57 tests |

Naming follows the repo convention exactly (`product-showcase.tsx`,
`evaluation-assurance.tsx`, `process.tsx` → `buyer-value.tsx`), and the content
module mirrors `evaluation-assurance.ts` / `purchase-process.ts`.

---

# BUYER VALUE FA

Eyebrow: `همراهی در خرید`
H2: `آهن آسا چگونه خرید آهن را برای شما آسان می‌کند؟`
Supporting: `از زمان ارسال درخواست تا انجام تعهدات توافق‌شده، بررسی، هماهنگی و پیگیری خرید شما در یک مسیر مشخص ادامه پیدا می‌کند.`

01 `یک کارشناس واقعی، همراه خرید شماست`
> درخواست شما صرفاً یک فرم یا شماره پیگیری نیست؛ یک کارشناس از زمان ارسال درخواست تا انجام تعهدات توافق‌شده، پاسخ‌گو و پیگیر آن است.

02 `اقلام متنوع، در یک مسیر هماهنگ`
> فرقی نمی‌کند درخواست شما یک قلم مشخص باشد یا فهرستی از محصولات با مشخصات و شرایط متفاوت؛ بررسی و هماهنگی آن‌ها در یک مسیر منسجم انجام می‌شود.

03 `کوچک یا عمده، درخواست شما جدی است`
> حجم سفارش، معیار کیفیت توجه ما نیست؛ هر درخواست با استاندارد مشخصی از بررسی، شفافیت و پیگیری دنبال می‌شود.

04 `پیگیری تا تحویل کالا ادامه دارد`
> کار ما با تأیید پیشنهاد تمام نمی‌شود؛ سفارش تا انجام تعهدات توافق‌شده پیگیری می‌شود و در صورت نیاز و توافق، هماهنگی بارگیری و حمل نیز انجام خواهد شد.

**PASS** — all 11 strings assert as verbatim substrings of the imported freeze
document, and the H2 plus all four titles additionally assert against the
Composition freeze §6.4's independently frozen list.

---

# BUYER VALUE EN

Eyebrow: `Support throughout your purchase`
H2: `How does Ahan Asa make buying steel easier for you?`
Supporting: `From submitting your request through completion of the agreed commitments, your purchase follows a clear path of review, coordination, and follow-up.`

01 `A real specialist stays with your request`
> Your request is more than a form or tracking number. A specialist remains available to answer questions and follow it through completion of the agreed commitments.

02 `Diverse items, one coordinated path`
> Whether you need one specific item or a list of products with different specifications and conditions, their review and coordination are handled through one consistent path.

03 `Small or bulk, your request matters`
> Order volume does not determine the quality of our attention. Every request follows a defined standard of review, clarity, and follow-up.

04 `Follow-up continues through delivery`
> Our work does not end when you approve the proposal. We follow the order through the agreed commitments and, when needed and agreed, coordinate loading and transport as well.

**PASS** — 11/11 verbatim.

---

# BUYER VALUE AR

Eyebrow: `مرافقة خلال رحلة الشراء`
H2: `كيف تجعل آهن آسا شراء الحديد أسهل بالنسبة إليك؟`
Supporting: `من إرسال الطلب حتى تنفيذ الالتزامات المتفق عليها، تستمر مراجعة عملية الشراء وتنسيقها ومتابعتها ضمن مسار واضح.`

01 `خبير حقيقي يرافق طلبك`
> طلبك ليس مجرد نموذج أو رقم متابعة؛ يبقى خبير متاحاً للإجابة عن استفساراتك ومتابعة الطلب حتى تنفيذ الالتزامات المتفق عليها.

02 `أصناف متنوعة ضمن مسار منسّق`
> سواء كان طلبك لصنف واحد محدد أو لقائمة منتجات بمواصفات وشروط مختلفة، تتم مراجعتها وتنسيقها ضمن مسار واحد ومنسجم.

03 `صغيراً كان أم بالجملة، يؤخذ طلبك بجدية`
> حجم الطلب لا يحدد مستوى اهتمامنا؛ فكل طلب يخضع لمعيار واضح من المراجعة والشفافية والمتابعة.

04 `تستمر المتابعة حتى استلام البضاعة`
> لا ينتهي دورنا عند موافقتك على العرض؛ نتابع الطلب حتى تنفيذ الالتزامات المتفق عليها، وعند الحاجة وبالاتفاق، ننسق التحميل والنقل أيضاً.

**PASS** — 11/11 verbatim. 33/33 strings across all three locales.

Nothing was translated or paraphrased. The strings were extracted
programmatically from the imported document, and a test re-asserts each one
against that document on every run, so a future copy edit fails loudly.

---

# BUYER VALUE SEMANTICS

Server-rendered DOM, verified in all three locales:

```html
<section aria-labelledby="home-buyer-value-heading" class="… bg-[var(--aa-color-bg-warm)] py-20 lg:py-28">
  <div class="container-x">
    <div class="max-w-2xl">
      <p class="text-copper text-sm font-semibold">…eyebrow…</p>
      <h2 id="home-buyer-value-heading" class="text-navy …">…H2…</h2>
      <p class="text-muted-foreground mt-4 …">…supporting statement…</p>
    </div>
    <ul role="list" class="mt-9 grid md:mt-12 md:grid-cols-2">
      <li …><div class="flex items-baseline gap-4">
              <span aria-hidden="true" class="text-copper …">۰۱</span>
              <h3 class="text-navy text-lg font-bold">…</h3></div>
            <p class="text-muted-foreground mt-3 …">…</p></li>
      … ×4
    </ul>
  </div>
</section>
```

| Requirement | Result |
|---|---|
| `<section aria-labelledby>` → matching `<h2 id>` | PASS |
| `<ul role="list">`, never `<ol>` | PASS — `<ol>` absent |
| Exactly 4 `<li>` | PASS (fa/en/ar) |
| Exactly 4 `<h3>`, one per promise | PASS |
| Decorative index `aria-hidden="true"` | PASS — 4 aria-hidden spans |
| Index never a heading | PASS |
| One `<p>` supporting statement, one `<p>` per promise | PASS |
| No CTA / `<a>` / `<button>` | PASS — 0 anchors, 0 buttons |
| No icon / image / `<svg>` | PASS — 0 |
| No `<dl>`/`<table>`/`<details>` accordion framing | PASS |
| Exactly one page H1, owned by the Hero | PASS — 1 in the whole document |
| Hierarchy eyebrow → H2 → supporting → list | PASS, asserted by source position |

`role="list"` is written out deliberately: Tailwind Preflight sets
`list-style: none`, which drops native list semantics in Safari/VoiceOver, and
§16 requires the promises be "one semantic list".

---

# BUYER VALUE VISUAL

| Frozen rule | Implementation | Verified |
|---|---|---|
| Full-width Warm Cream `#FBF5EB` (§9.1) | `bg-[var(--aa-color-bg-warm)]` → `--aa-color-brand-cream-50: #fbf5eb` | Token chain asserted by test; compiled rule `…bg-\[var\(--aa-color-bg-warm\)\]{background-color:var(--aa-color-bg-warm)}` present |
| H2/H3 Steel Navy `#0B2545` (§9.2/§9.3) | `text-navy` → `--aa-color-brand-navy-900: #0b2545` | asserted |
| Eyebrow + markers Forge Copper `#B04A2F` (§9.2/§9.3) | `text-copper` → `--aa-color-brand-copper-600: #b04a2f` | asserted |
| Copper restrained (§9.3, VS §5.2) | exactly **2** `text-copper` usages in source: the eyebrow and the per-promise index. No `bg-copper`. | asserted by exact count |
| Shared container alignment (§9.1, VS §13) | `container-x`, same as every other section | asserted across all six sections |
| No outer floating card / grid / image / section shadow (§9.1) | no `rounded-*`, `shadow*`, `hairline-grid`, `aspect-*`, `overflow-hidden`, `isolate` | asserted |
| No per-item background, shadow or radius (§9.3) | none present | asserted |
| Not clickable (§14) | no `cursor-pointer`, `hover:*`, `group-hover`, `tabIndex`, `role="button"` | asserted |
| Heading block max line length (§9.2) | `max-w-2xl` | asserted |
| No artificial FA/AR letter-spacing (§12) | the shared `.eyebrow` utility (uppercase + `letter-spacing: 0.16em`) is **deliberately not used**; plain `text-copper text-sm font-semibold` instead. A test also asserts that utility really does still apply tracking, so the decision is revisited if that ever changes. | asserted |

**Card Soup check (VS §7/§21).** After the Hero there are three distinct
archetypes, asserted by test: Product Showcase and Reach on White
(`bg-background`), Buyer Value on Warm Cream, Final CTA on Navy
(`bg-navy-800`). Buyer Value carries no `rounded`/`shadow`/`<Link>`/`hover:`,
while product cards carry `<Link>` + `hover:` — so promises are structurally
distinguishable from actionable cards. The Hero keeps its unique flagship
treatment; nothing else reproduces it.

**Consecutive-Navy check (VS §14/§21.6).** Exactly two Navy surfaces exist —
Hero and Final CTA — and the always-present, always-light Buyer Value sits
between them. That holds even in §10.4's most reduced state (Hero → Products →
Buyer Value → Final CTA) and §10.5's product-failure state (Hero → Buyer Value
→ Final CTA), so a light transition is structurally guaranteed rather than
incidental. Asserted by test.

---

# BUYER VALUE RESPONSIVE

**Architecture.** `<ul class="mt-9 grid md:mt-12 md:grid-cols-2">` — one column
below `md`, flat 2×2 at and above it. A four-column state is **structurally
unreachable**: exactly one `grid-cols-*` utility exists in the file and it
declares two tracks; there is no `sm:`/`lg:`/`xl:` column variant, no
`flex-wrap`, no `auto-fit`/`auto-fill`. Asserted by test (the same class of
structural proof the Purchase Process no-2×2 test uses, inverted).

**Compiled-CSS confirmation** (`dist/server/_next/static/css/index.B1lI5Omk.css`):
`.md\:grid-cols-2{grid-template-columns:repeat(2,minmax(0,1fr))}` inside
`@media (min-width:48rem)`. So the breakpoint really is 768px, and
`minmax(0, 1fr)` structurally prevents a long token from forcing horizontal
scroll (§15 "No horizontal scrolling is permitted"). All twelve layout
utilities used by the cells (`md:border-s`, `md:border-t-0`, `md:ps-10`,
`md:pe-10`, `md:pt-10`, `md:pb-10`, `md:pt-0`, `md:pb-0`, `border-t`, `pt-7`,
`pb-7`, `mt-9`, `md:mt-12`) are present in the compiled stylesheet — none was
purged. `md:border-s` compiles to `border-inline-start`, i.e. genuinely
logical.

**Dividers (§10),** from the four literal cell class strings in the SSR output:

| # | Class | 2×2 role | 1-column role |
|---|---|---|---|
| 01 | `pb-7 md:pb-10 md:pe-10` | no rule | no top border (first item) |
| 02 | `border-border border-t pt-7 pb-7 md:border-t-0 md:border-s md:ps-10 md:pt-0 md:pb-10` | **vertical** rule | inter-item rule |
| 03 | `border-border border-t pt-7 pb-7 md:pe-10 md:pt-10 md:pb-0` | **horizontal** rule | inter-item rule |
| 04 | `border-border border-t pt-7 md:border-s md:ps-10 md:pt-10` | both rules meet | inter-item rule; no bottom border |

Exactly one vertical (cells 02+04) and one horizontal (cells 03+04) rule in the
2×2 — cell 02 explicitly switches its mobile `border-t` off at `md`, which is
what prevents a second horizontal rule. In one column: rules between adjacent
items only, none before the first, none after the last (no `border-b` anywhere).
All rules use `border-border` (`--aa-color-border-subtle`, neutral-200), never
Copper. Both rules are drawn inside `container-x`, inset from the section edge
by the page gutter, with the section's 80/112px vertical padding keeping the
vertical rule clear of the top and bottom. All asserted by test.

**Breakpoint justification — and its honest limit.** At 768px the container is
768 − 2×23px gutter = 722px, each column 361px, each text measure ~321px after
the 40px divider-side padding; against the longest approved string per locale
that is roughly 4–5 lines of 14px body and 2 lines of 18px H3, inside §12's
two-line H3 target. **These figures are computed from the container/gutter
arithmetic and character counts, not read off a rendered browser** — live
measurement was blocked. This limitation is also recorded in the component's own
doc comment so it cannot be mistaken later for a measured result. Nothing else
in the component depends on the exact breakpoint value; a future session with a
real browser should run §20's locale sweep and may move it later.

**Directional utilities** are entirely logical — no `border-l/r`, `pl-/pr-`,
`ml-/mr-`, `text-left/right` anywhere — so FA/AR RTL and EN LTR share one
implementation. Confirmed live: `<html dir="rtl">` for fa/ar, `dir="ltr"` for en.

---

# BUYER VALUE CLAIM SAFETY

Every §6 qualification is preserved verbatim and pinned by test:

| §6 rule | Implementation |
|---|---|
| `تعهدات توافق‌شده` rather than an unlimited "all commitments" claim | asserted present in FA/EN/AR supporting statements (`agreed commitments`, `الالتزامات المتفق عليها`); `همه تعهدات` / "all commitments" / "every commitment" / `جميع الالتزامات` asserted absent |
| `در صورت نیاز و توافق` for loading and transport | asserted present in promise 04 in all three locales (`when needed and agreed`, `وعند الحاجة وبالاتفاق`); "free transport/delivery", `حمل رایگان`, `النقل مجاني` asserted absent |
| Equal **seriousness of attention**, never identical commercial terms | promise 03 asserted to contain `کیفیت توجه` / `quality of our attention` / `مستوى اهتمامنا`; `قیمت یکسان`, "same price", "same terms", `نفس السعر` asserted absent |

Prohibited claims asserted absent in all three locales: cheapest / best price /
lowest price / highest quality / fastest / guarantee(d) / same commercial terms
/ always available, plus the FA and AR equivalents. Nothing implies an RFQ is a
binding purchase (`خرید قطعی`, "binding", `شراء ملزم` asserted absent).

The scan is **scoped to this component's own copy** rather than swept across
unrelated site content, avoiding the brittleness the task warned about. Two
scans deliberately exclude single-word tokens (the Hero step `خرید` and the
evaluation axis `تحویل`), because those are ordinary nouns whose presence is
not a duplicated message — the message-ownership rules are instead enforced
structurally.

Boundary tests also confirm Buyer Value did not absorb a neighbour's job: it
does not repeat the Hero's multi-word journey steps, and it does not carry any
Evaluation/Assurance axis title.

---

# BUYER VALUE MOTION

**No motion at all.** The simplest compliant implementation was chosen, exactly
as §13 permits and the task prefers, and as both sibling frozen editorial
components already do.

- No `"use client"`, no hooks, no `IntersectionObserver`, no `Reveal`.
- No `animate-*`, `transition`, `duration-*`, `delay-*`, `ease-*`, `@keyframes`,
  and no animation library.
- Consequently the SSR render, the JS-disabled render, the failed-hydration
  render and the `prefers-reduced-motion` render are **identical bytes**.

This is strictly stronger than reusing `components/ui/reveal.tsx`. That
component's P1 fix contract — no hidden state at any point, hidden appearance
living only inside keyframes — was read before deciding; not animating at all
removes the failure mode entirely rather than mitigating it. No `opacity-0`,
`invisible`, `translate-y`, `sr-only`, or display-hiding utility exists in the
component; a class-token test enforces that while still permitting the required
`aria-hidden="true"` on the decorative index. None of §13's prohibited patterns
(number counting, process-connector drawing, per-item directional entrances,
bounce, hover elevation) is present.

---

# VERIFIED EVIDENCE

**OMITTED — and no publication contract exists to align.**

Searched the entire repository for an evidence implementation: no
`VerifiedEvidence`/`Evidence` component, no metric definition, no calculation
window, no exclusion rule, no freshness gate, no sample-size gate, no
last-updated field, no threshold constant. The only textual hits for "evidence"
are unrelated doc-comment prose in the Hero, Price Strip, and Odoo adapter.

Therefore, per the task's own instruction and Composition §6.5, **there was
nothing to align and nothing was built**. No component, no placeholder, no
skeleton, no invented metric, no marketing substitute. No test was written that
mocks a production metric contract solely to have something to assert — that
would have manufactured the appearance of a pipeline that does not exist.

What *is* asserted: no Evidence section renders, no Evidence component file was
created, and no ungoverned operational statistic (percentage, or an
hours/minutes/days figure in FA/EN/AR) appears anywhere in the Homepage copy.

---

# EVIDENCE THRESHOLD

**≥ 100 ELIGIBLE operational records — not 100 raw rows — plus all applicable
data-quality gates.**

Authority: Composition Freeze §6.5 ("public display remains disabled until at
least **100 eligible operational records** exist … reaching 100 raw rows alone
does not override data-quality failures") and §19.9; restated by Implementation
Checklist §1 ("A raw-row count of 100 is insufficient. Earlier references to
1000 are historical, not the active requirement").

A test pins both halves of that sentence against the imported document, so the
threshold cannot be quietly softened to "rows" or reverted to 1000. The
threshold is also recorded in
`docs/homepage/HOMEPAGE_SUPERSESSION_REGISTER.md` §5.1.

**No historical document was rewritten.** Documents mentioning 1000 remain
untouched as history. No active implementation, config or constant needed
changing, because none exists.

---

# EVIDENCE QUALITY GATES

None implemented; none preserved, because there was nothing to preserve. When
the contract is first authored it must satisfy at minimum the Implementation
Checklist §7 boundary table, recorded in the register for the next phase:

| Condition | Required behavior |
|---|---|
| 99 eligible records | hidden |
| 100 eligible + all quality gates pass | may display |
| ≥100 raw rows but <100 eligible | hidden |
| 100 eligible with a failed quality/freshness check | hidden |
| Missing / error state | hidden, without blocking other sections |

Eligible public evidence must additionally carry the approved metric
definition, source and window qualifications, sample size, and last-updated
time (§6.5). The calculation window, statistical definition and any Odoo schema
are **not** defined by these freezes and must not be invented.

---

# INDUSTRIES

**ELIGIBLE — renders, unchanged.** `components/home/reach.tsx` was not modified.

It occupies the Industries / Use Cases slot and already sat in the correct
relative position. Its content is the already-approved, non-fabricated
`marketsCopy[locale].industries` array — the identical list published on
`/industries` and `/markets`, asserted by test to be deep-equal to
`industriesCopy[locale].industries` so the Homepage can never drift into a
separate unreviewed list.

§6.6 compliance: no invented projects, customers, volumes, logos or case
studies. Asserted by test — no `logo` reference anywhere in the component, and
its single image is a decorative operations photograph carrying `alt=""` plus
`aria-hidden="true"`, claiming nothing. No redesign was attempted; this phase
only confirmed eligibility and preserved the current safe output.

---

# FINAL CTA

**PRESENT, unmodified.** `components/ui/cta-band.tsx` was not touched.

It retains the single primary RFQ goal (`ارسال فاکتور یا لیست خرید` →
`/contact`) with one secondary consultation link to the same destination — no
competing third primary action. Nothing implies checkout, an instant binding
quotation, or an automatic purchase: asserted by a test scanning all three
locales' Homepage copy for "add to cart", "buy now", "checkout", `سبد خرید`,
`پرداخت آنلاین`, `سلة التسوق`. The Hero's non-commitment reassurance is
asserted still present in every locale.

No composition defect prevented compliance, so per the task's instruction no
redesign was performed.

---

# CONDITIONAL FAILURE ISOLATION

Each conditional section owns its own visibility and returns `null` before
emitting any markup, so an omission removes the **whole semantic section** — no
empty `<h2>`, no wrapper, no background band, no skeleton. Asserted structurally:
for both Price Strip and Product Showcase, the `return null;` precedes the first
heading marker in the source.

Independence is asserted three ways:

- The price-strip read runs on its own path, **before and outside** the
  Showcase's try/catch; a test asserts `getHomepagePriceStrip` never appears
  inside that try body.
- The Showcase catch only empties `homepageProducts`, which has exactly one
  consumer — so §10.5's fail-closed composition falls out automatically.
- Rendering happens after both reads; no section renders inside a failure
  boundary.
- Buyer Value, the Final CTA and the Hero contain no `return null` at all, so
  no data failure can suppress them.

**Demonstrated live, not just asserted:** the EN and AR Homepages omit Product
Showcase entirely (zero eligible candidates) and still render Buyer Value's four
promises, Industries, and the Final CTA in the correct order. The FA Homepage
omits the Price Strip while rendering everything else.

---

# LEGACY HOMEPAGE COMPONENTS

**ABSENT — verified, not assumed.** A scan of `app/ components/ lib/ styles/
config/` for `RiskGrid`, `RoleComparison`, `ProcessSteps`, `ControlPillars`,
`TrustBand`, `SuitabilityFaq`, `Capabilities` and the old `Assurance` returned
**zero occurrences**. All had been retired in earlier phases; no obsolete import
or rendering call remained to remove.

Two tests now lock this: none of those tags renders on the Homepage and none is
imported, and no corresponding component file exists in `components/home/`. All
historical documentation about them is untouched, and the register records each
one's §8 disposition — including that ControlPillars' customer value is handled
by Buyer Value **without** restoring the old section, and that a generic
TrustBand may return only through eligible Verified Evidence.

---

# MOBILE / DESKTOP PARITY

Preserved. Buyer Value renders one promise list from one content source with no
per-viewport branch — asserted by test: exactly one `t.promises.map(`, and no
`hidden`/`md:hidden`/`lg:hidden`/`sm:hidden` utility anywhere. Layout differs
between viewports (2×2 vs one column); meaning, headings, promise text and
reading order do not.

No Homepage section gained a mobile-only omission. Product links, data
eligibility and the structured-data relationship are viewport-independent —
all decided server-side before any CSS applies.

---

# SSR

All primary Homepage content is present in the server HTML before any
JavaScript runs. Verified by fetching the rendered pages:

| Locale | Status | Bytes | Buyer Value `<li>` / `<h3>` | Showcase |
|---|---|---|---|---|
| fa | 200 | 209,054 | 4 / 4 | 3 cards |
| en | 200 | 168,943 | 4 / 4 | omitted (0 eligible) |
| ar | 200 | 172,145 | 4 / 4 | omitted (0 eligible) |

All four FA promises appear as plain text in the server HTML, with the
locale-scripted markers `۰۱ ۰۲ ۰۳ ۰۴` (AR `٠١…`, EN `01…`). Buyer Value is a
server component with no client bundle contribution. No component on the page
has an `opacity: 0` baseline.

---

# JS-OFF

**SOURCE-SSR STRUCTURAL PROOF + STATIC-COMPILED-CSS VERIFIED.** This is
explicitly *not* a browser JavaScript-disable test — no browser was available.

The proof is that Buyer Value has no JavaScript to fail: no `"use client"`, no
hooks, no observer, no `Reveal`, no animation. The `curl`-fetched server HTML
already contains the complete section — all four promises, both headings, every
divider class — and the compiled stylesheet contains every rule that styles it.
A browser that never executes a line of the page's JavaScript therefore
receives and paints exactly what was verified above. Nothing in the component
is gated on hydration.

For the rest of the page, the pre-existing `Reveal` progressive-enhancement
contract is unchanged and its tests still pass.

---

# RESPONSIVE MATRIX

| Target | Method | Result |
|---|---|---|
| FA desktop/laptop 1366 | **NOT RUN — BLOCKED** | no browser connected |
| FA wide desktop 1920 | **NOT RUN — BLOCKED** | no browser connected |
| FA tablet 768 | **NOT RUN — BLOCKED** | no browser connected |
| FA mobile 390 | **NOT RUN — BLOCKED** | no browser connected |
| EN desktop 1366 / mobile 390 | **NOT RUN — BLOCKED** | no browser connected |
| AR RTL desktop 1366 / mobile 390 | **NOT RUN — BLOCKED** | no browser connected |
| 2×2 ≥768px, 1 column <768px | **STATIC-COMPILED-CSS VERIFIED** | `.md\:grid-cols-2{grid-template-columns:repeat(2,minmax(0,1fr))}` inside `@media (min-width:48rem)` |
| Divider geometry, both layouts | **STATIC-COMPILED-CSS VERIFIED** + **SOURCE-SSR STRUCTURAL PROOF** | all cell classes present in compiled CSS and in the rendered DOM |
| No four-column state | **SOURCE-SSR STRUCTURAL PROOF** | one `grid-cols` utility in the file, two tracks |
| No horizontal overflow | **STATIC-COMPILED-CSS VERIFIED** | `minmax(0,1fr)` floor on both tracks |
| RTL/LTR direction | **SOURCE-SSR STRUCTURAL PROOF** | `<html dir="rtl">` fa/ar, `dir="ltr"` en; `border-inline-start` in compiled CSS; zero physical directional utilities |
| Content parity across viewports | **SOURCE-SSR STRUCTURAL PROOF** | one list, no viewport-conditional utility |

**BLOCKED — reason:** `mcp__claude-in-chrome__list_connected_browsers` returned
an empty list. No Chrome extension is connected to this session, so no page
could be opened, resized, or screenshotted at any width. **No baseline "before"
screenshots were captured either, for the same reason.** No setting, permission
or security control was weakened to try to force it.

---

# ZOOM

**NOT RUN — BLOCKED.** 200% browser zoom cannot be exercised without a browser.

Structural factors that bear on §16's zoom requirement, recorded as reasoning
rather than as verification: all type is set in `rem`/Tailwind scale units with
no fixed pixel heights; no item has a fixed height that could clip translated
text; the grid tracks use `minmax(0, 1fr)`, which prevents a track from
exceeding its share and forcing page-level horizontal scroll; and no content is
inside an `overflow-hidden` container. These make the zoom outcome likely to
pass but do **not** constitute verification.

---

# REDUCED MOTION

**SOURCE-SSR STRUCTURAL PROOF — and vacuously satisfied.** Buyer Value declares
no animation, transition, or transform of any kind, so
`prefers-reduced-motion: reduce` has nothing to disable and the reduced-motion
render is byte-identical to the normal render.

The site-wide reduced-motion block remains intact in the compiled CSS
(`@media (prefers-reduced-motion:reduce){*,:before,:after{…animation-duration:.01ms!important…}}`),
together with the `Reveal`-specific neutralisation, so the rest of the page is
unaffected. Live browser confirmation: NOT RUN — BLOCKED.

---

# ACCESSIBILITY

| Requirement (§16) | Status | How verified |
|---|---|---|
| Real H2 in the page hierarchy | PASS | SSR DOM + test |
| Promise titles are H3 | PASS | 4 `<h3>` in SSR DOM |
| One semantic list | PASS | `<ul role="list">`, 4 `<li>` |
| Decorative numbers hidden from AT | PASS | 4 × `aria-hidden="true"` |
| Exactly one page H1 (Hero's) | PASS | 1 `<h1>` in the whole document |
| No focus introduced on non-interactive items | PASS | 0 anchors, 0 buttons, no `tabIndex` |
| Reading order matches visual order | PASS (structural) | DOM order is promise order; no CSS reordering (no `order-*`, `flex-direction: reverse`, or grid placement) |
| Copper not the only distinction | PASS | grouping carried by `<h3>`, padding and dividers as well |
| Contrast | **NOT MEASURED** | Navy `#0B2545` and Copper `#B04A2F` on Warm Cream `#FBF5EB` are the approved brand pairings already used site-wide, but no contrast measurement was run in this session |
| 200% zoom | **NOT RUN — BLOCKED** | see ZOOM |
| Complete with CSS motion disabled and JS unavailable | PASS | no motion, no JS |

Keyboard-only navigation: **NOT RUN — BLOCKED**. Structurally, Buyer Value adds
no focusable element at all, so it cannot introduce a focus-order defect;
existing focus behavior elsewhere is unchanged because no other component was
modified.

---

# PERFORMANCE

No new dependency, no animation library, no client bundle growth: Buyer Value
is a server component with zero client JavaScript. `npm run build` completes
cleanly (228 modules in the SSR environment).

No new I/O: the component performs zero reads. Net effect on the Homepage is a
small reduction in rendered work — two sections removed, one lighter section
added, and the removed `Process`/`EvaluationAssurance` were themselves
zero-I/O.

Layout shift: none introduced. The component renders no image and no media,
declares no animation, and reserves no deferred geometry — there is nothing
that can shift after paint.

---

# AI / GEO SAFETY

No hidden SEO text, hidden AI prompts, agent-only instructions, keyword
stuffing, fake expert attribution, or machine-only content layer was added
anywhere. Asserted by test across the page and all five section components:

- no `<noscript>` content duplicate;
- no `dangerouslySetInnerHTML`;
- no `display:none` / `visibility:hidden` / negative `text-indent` keyword layer;
- no alternate `aria-label` text layer in Buyer Value;
- all four promises are ordinary server-rendered text, identical for humans and
  crawlers, with no per-viewport or per-agent variation.

The three locales are asserted to be genuinely distinct translations rather
than duplicated keyword strings (§17). Structured data is asserted to remain
`Organization` + `WebSite` only — nothing derived from a conditional section, so
omitted products, evidence or industries are never represented as if visible
(§14). Discoverability V1.1 and the GEO-G0 governance documents were not
modified.

---

# STRUCTURED DATA FOLLOW-UP

**PRE-STAGING GEO FOLLOW-UP — not fixed here, by instruction.**

The GEO-G0 foundation audit found that `Organization` and `WebSite` structured
data are emitted **only** from `app/[locale]/page.tsx`, which is
`indexable: false` — so the site's primary entity declarations sit on a
`noindex` page. That is unchanged by this phase (the `JsonLd` call was not
touched) and was deliberately not opportunistically fixed.

Recommended for a pre-staging phase: move the Organization/WebSite graph to the
shared layout so it is emitted on every page, or emit it from an indexable
surface. Independently fixable at any time; does not block Homepage component
work.

---

# FOOTER FOLLOW-UP

**FOOTER FOLLOW-UP REQUIRED — not fixed here, by instruction.**

`components/layout/SiteFooter.tsx` was not modified. Two defects already
recorded by the GEO-G0 audit remain open:

1. **Stale sample taxonomy.** The global footer links
   `?category=long/flat/semi/raw` — a divergent sample taxonomy that the real
   catalog filter parser ignores, present on every page.
2. **Hardcoded Persian labels** not localized for EN/AR.

Neither was needed for this reconciliation to function, and both sit outside
its scope, so both were left untouched and are recorded here as required
follow-up rather than silently changed.

---

# FILES CREATED

| Path | Commit |
|---|---|
| `docs/homepage/AHANASSA_HOMEPAGE_COMPOSITION_AND_CUSTOMER_JOURNEY_FREEZE_V1.0.md` | 65363b5 |
| `docs/homepage/AHANASSA_HOMEPAGE_VISUAL_SYSTEM_AND_MOTION_FREEZE_V1.0.md` | 65363b5 |
| `docs/homepage/AHANASSA_HOMEPAGE_IMPLEMENTATION_PROMPT_AND_CHECKLIST_V1.0.md` | 65363b5 |
| `docs/buyer-value/AHANASSA_BUYER_VALUE_SERVICE_PROMISE_COMPONENT_FREEZE_V1.0.md` | 65363b5 |
| `components/home/buyer-value.tsx` | de5f99c |
| `lib/content/buyer-value.ts` | de5f99c |
| `lib/content/buyer-value-frozen-spec-invariants.test.ts` | de5f99c |
| `lib/content/homepage-composition-invariants.test.ts` | de5f99c |
| `docs/homepage/HOMEPAGE_SUPERSESSION_REGISTER.md` | 480a1b7 |
| `docs/homepage/HOMEPAGE_HP_R1_RECONCILIATION_IMPLEMENTATION_REPORT.md` | this report's own commit |

# FILES MODIFIED

| Path | Change | Commit |
|---|---|---|
| `app/[locale]/page.tsx` | composition: −2 imports/renders, +1; composition doc comment | de5f99c |
| `lib/content/homepage.ts` | `buyerValue` interface field + fa/en/ar content | de5f99c |
| `lib/content/evaluation-assurance-frozen-spec-invariants.test.ts` | superseded Homepage-placement assertions → supersession assertions | de5f99c |
| `lib/content/purchase-process-frozen-spec-invariants.test.ts` | superseded Homepage-placement assertions → relocation assertions | de5f99c |
| `docs/evaluation-assurance/AHANASSA_EVALUATION_ASSURANCE_FINAL_FROZEN_V2.1.md` | status notice prepended; body untouched | 480a1b7 |
| `docs/purchase-process/AHANASSA_PURCHASE_PROCESS_FINAL_FROZEN_V2.0.md` | status notice prepended; body untouched | 480a1b7 |

# FILES REMOVED

**None.** No file was deleted in any commit. This is deliberate and enforced by
test: `components/home/evaluation-assurance.tsx`, `components/home/process.tsx`,
`lib/content/evaluation-assurance.ts`, `lib/content/purchase-process.ts` and
both frozen spec documents are asserted to still exist.

---

# RUNTIME COMMIT

`de5f99c02289d94ff868ec53fdd134022a79c9e9` — "feat(home): reconcile Homepage
journey and add Buyer Value". 8 files changed, 1631 insertions, 35 deletions.

# GOVERNANCE COMMIT

`480a1b7` — "docs: reconcile Homepage composition authority". 3 files changed,
230 insertions, 0 deletions. **Not NONE** — the two status notices and the
supersession register were genuinely required beyond what the authority import
covered.

---

# FOCUSED TESTS

| File | Tests |
|---|---|
| `lib/content/buyer-value-frozen-spec-invariants.test.ts` | 57 |
| `lib/content/homepage-composition-invariants.test.ts` | 32 |
| **New focused total** | **89 pass / 0 fail** |

Plus net +3 in the two edited invariant files (2 replaced by 3; 2 replaced by
4). Total delta +92, exactly matching 1126 − 1034.

Coverage, mirroring the rigor of the existing frozen-spec invariant files:

*Composition* — frozen order; Hero→Showcase→Buyer Value; Price Strip optional
and correctly positioned; Evaluation absent; standalone Process absent; both
retained on disk; Evidence omitted with no substitute; Industries eligible and
sharing the published list; Final CTA always present; relative order preserved
under omission; conditional independence; legacy sections and files absent; one
H1; H2 per section; no placeholder heading on omission; no `/process` link;
CTA progression; archetype variety; no consecutive Navy; container alignment;
no hidden crawler layer; structured-data scope; the ≥100-eligible threshold.

*Buyer Value* — all 33 FA/EN/AR strings pinned and cross-checked against the
imported freeze; exactly 4 promises in frozen order; `<ul role="list">` not
`<ol>`; 4 `<li>` each with `<h3>` and one `<p>`; `aria-hidden` indexes derived
not stored; no CTA/icons/images/pointer/hover/accordion; Warm Cream, Navy and
Copper token chains resolved to their hex values; Copper usage count; no card
treatment; 2×2/1-column architecture proved by class-absence; four literal cell
class strings; divider geometry in both layouts; logical directional utilities;
no client JS; no hidden resting state; no prohibited motion; content parity;
zero data dependency; unconditional rendering.

*Claim safety* — approved copy pinned; agreed-commitments, needs-and-agreement,
and quality-of-attention qualifications each asserted present and their
strengthened forms asserted absent; scoped to this component's copy only.

*Product Showcase* — existing coverage extended, not duplicated: the
architecture must remain in the composition, the projection read must stay
wired, no sample data, whole-section omission, failure isolation, single
consumer of the candidate list. The existing
`homepage-eligibility.test.ts`, `homepage-showcase-layout.test.ts`,
`homepage-showcase-resilience.test.ts`,
`homepage-progressive-enhancement.test.ts` and
`homepage-source-isolation.test.ts` already cover max-8 composition, priority,
localized labels, stock-independence and link building, and all still pass
unmodified.

*Evidence* — only the absence of a gate is asserted. **No mock production metric
contract was invented** to satisfy a test that would not otherwise be needed.

# FULL TESTS

```
npm test
ℹ tests 1126
ℹ pass 1126
ℹ fail 0
```

Baseline was 1034 pass / 0 fail. **No pre-existing test was broken.** Five
assertions were deliberately updated because the new frozen authority
supersedes what they asserted; that is recorded in SUPERSESSIONS above.

# TSC

```
npx tsc --noEmit
```
Exit 0, no diagnostics.

`tsconfig.tsbuildinfo` is tracked but was restored rather than committed —
matching the precedent of every recent component-freeze commit, none of which
included it.

# BUILD

```
npm run build
✓ 228 modules transformed
Build complete.
```
All nine routes plus two API routes built. No warnings introduced.

# GIT

```
65363b5  docs: import frozen Homepage V1 architecture
de5f99c  feat(home): reconcile Homepage journey and add Buyer Value
480a1b7  docs: reconcile Homepage composition authority
<this>   docs: record Homepage HP-R1 reconciliation
```

Four commits, in the required order, on `worktree-hp-r1`, from base `6308577`.
No commit was amended. **No push. No merge. No deploy.** The report is committed
alone. `node_modules` (a symlink) and `.wrangler/` are gitignored and never
appear in `git status`.

# MIGRATION STATUS

`migrations_public/0010_homepage_eligibility.sql` — **PENDING remote
application. NOT applied remotely.**

It was applied only to disposable LOCAL copies, purely for diagnosis:

1. a scratchpad copy of the local DB_PUBLIC sqlite file, outside the repository;
2. the worktree's own `.wrangler/state` copy, via
   `npx wrangler d1 migrations apply ahanassa-public --local`.

`--local` never contacts Cloudflare. The main checkout's `.wrangler` state was
copied, not moved, and is unchanged. No `--remote` flag was used anywhere, and
the configured `database_id` is still the placeholder
`REPLACE_WITH_REAL_D1_DATABASE_ID_PUBLIC`, so a remote apply was not even
possible. The migration is documented as PENDING here and in the register, and
is marked applied nowhere.

**Release consequence:** until 0010 is applied to the real DB_PUBLIC, the
Homepage Product Showcase will fail closed and omit itself in that environment,
exactly as it did locally. This is the concrete prerequisite for the section to
appear — it belongs on the release checklist, not in code.

# PRODUCTION SAFETY

Not performed, not attempted: push, deploy, merge, remote migration, production
or staging data mutation, Odoo module upgrade, Odoo API call, Cloudflare WAF
change, DNS change, secret fetch, price-provider activation, or any fabrication
of prices, evidence, products, customers or statistics.

Not touched: Header, Hero (image/copy/CTA/micro-journey), Product Showcase's
frozen visual/content rules, the Price Strip's provider-agnostic architecture,
the AI Search/GEO V1.1 governance documents, `01-sources/`, `logo/`,
`design-reference/`.

No write-isolation guard, permission denial or tool safety refusal was
encountered, and none was bypassed. No `EnterWorktree` tool was called, no
worktree was created, no `git worktree` command was run. No settings file was
modified.

# DEFERRED COMPONENTS

Deliberately **not** designed or implemented in this phase, per the stop
instruction:

| Component | State |
|---|---|
| Verified Evidence | No component, no metric, no gate. Correctly omitted. Needs a publication contract before anything can be built. |
| Industries / Use Cases | Current safe output preserved unchanged. No redesign. |
| Final CTA | Present and compliant. No redesign — no defect required one. |
| Footer | Not redesigned. Two GEO-G0 defects remain open (see FOOTER FOLLOW-UP). |
| `/process` page and route | Not created. Purchase Process V2.0 is reserved for it. |

# NEXT PHASE

Recommended order, none of it started here:

1. **Live visual verification** of Buyer Value in FA/EN/AR at 390/768/1366/1920,
   plus 200% zoom, reduced motion, and keyboard-only navigation — the one gap
   this phase could not close. Confirm the computed 768px 2×2 breakpoint
   against real rendered text (Buyer Value §20's long-content stress test) and
   move it later if any locale reads cramped.
2. **Apply migration 0010** to the real DB_PUBLIC as a release-checklist step,
   then confirm the Product Showcase renders in that environment. Publish
   approved EN/AR editorial content so the section is not FA-only.
3. **Author the Verified Evidence publication contract** — metric definition,
   exclusions, calculation window, freshness and sample-size gates, source and
   last-updated — against the ≥100-eligible threshold and the checklist §7
   boundary table. Only then build the component.
4. **Footer follow-up** — wire or remove the stale `?category=` links; localize
   the hardcoded Persian labels for EN/AR.
5. **Pre-staging GEO follow-up** — emit Organization/WebSite structured data
   from an indexable surface rather than only the noindex homepage.
6. Industries / Use Cases and Final CTA redesigns, if and when the owner
   commissions them.
