# EVALUATION-ASSURANCE-P1 — Frozen V2.1 Implementation Report

Date: 2026-09-07
Repository: `/Users/reza/Developer/ahanassa-website`
Worktree: `.claude/worktrees/evaluation-assurance-p1`
Branch: `worktree-evaluation-assurance-p1`
Task type: **runtime implementation** — new component, new localized content, new tests, legacy component retirement, live browser verification. No migration, no deploy, no push.

```
EVALUATION AUTHORITY: V2.1
CAPABILITIES HOMEPAGE COMPONENT: RETIRED
OLD ASSURANCE HOMEPAGE COMPONENT: RETIRED
EVALUATION COMPONENT: IMPLEMENTED
PROCESSING PROJECTION DEPENDENCY: ABSENT
ODOO DEPENDENCY: ABSENT
DB_PUBLIC DEPENDENCY: ABSENT
EXACT FOUR AXES: PASS
NO CTA: PASS
NO CARD GRID: PASS
READY FOR EA-P2 FREEZE: YES
```

# RESULT

**A — EVALUATION/ASSURANCE V2.1 IMPLEMENTED — LEGACY CAPABILITIES + OLD ASSURANCE RETIRED — READY FOR FREEZE.**

Both v0-baseline components that occupied this Homepage slot (`components/home/capabilities.tsx`, `components/home/assurance.tsx`) are deleted, along with their now-orphaned `homepageCopy` entries. A clean new component, `components/home/evaluation-assurance.tsx`, implements the frozen V2.1 spec: one `<h2>`, one supporting `<p>`, one `<ul>` of exactly four `<li>` rows, each with a decorative `aria-hidden` locale-scripted index, an `<h3>` axis title, and a `<p>` axis copy. No image, no icon, no CTA, no card grid, no interaction, no client JS, no data dependency.

No blocker (classification C) was encountered: the only shared dependency the P0 audit flagged — `lib/content/pages.ts#servicesCopy`, read by both `Capabilities` and `/services` — was left fully intact, and only `Capabilities`' own usage of it was removed.

One implementation decision deviates from the orchestrating task's literal wording and is called out prominently under COMPONENT ARCHITECTURE: the component renders a bare `<h2 id>` rather than `SectionHeading`, because `SectionHeading.eyebrow` is a **required** prop and every natural Persian eyebrow for this concept is on §4.1's forbidden list.

# PREFLIGHT

```
$ pwd
/Users/reza/Developer/ahanassa-website/.claude/worktrees/evaluation-assurance-p1

$ git branch --show-current
worktree-evaluation-assurance-p1

$ git rev-parse HEAD    (before any commit in this task)
c571c455ee05ef11d0857133a6599818818f97b9

$ git status --short
(clean)

$ git log --oneline -3
c571c45 docs: audit Evaluation Assurance V2.1 implementation
98108cb docs: import Evaluation Assurance V2.1 frozen spec
c098f9e docs: audit Homepage Services component
```

Working tree clean at start. Ancestry (`c571c45` descends from `98108cb` and `18c6793`) was accepted from the parent session per its instruction, with a quick log sanity check only — not re-derived.

Import chains were re-verified by fresh repository-wide grep rather than trusted from the parent's summary. All three of the parent's claims held exactly:

```
Capabilities  -> imported only by app/[locale]/page.tsx
                 (+ one path-string reference in
                  lib/catalog/homepage-progressive-enhancement.test.ts:191)
Assurance     -> imported only by app/[locale]/page.tsx
                 (+ one assertion-MESSAGE mention in
                  lib/content/hero-frozen-spec-invariants.test.ts:165 — prose,
                  not a functional dependency)
servicesCopy  -> lib/content/pages.ts (def), components/home/capabilities.tsx,
                 app/[locale]/services/page.tsx  <-- SHARED, must survive
homepageCopy.capabilities -> components/home/capabilities.tsx only
homepageCopy.assurance    -> components/home/assurance.tsx only
```

# BASE SHA

```
c571c455ee05ef11d0857133a6599818818f97b9
```

# AUTHORITATIVE SPEC

`docs/evaluation-assurance/AHANASSA_EVALUATION_ASSURANCE_FINAL_FROZEN_V2.1.md` — read in full (all 51 sections, 1228 lines) before any code was written, together with `docs/evaluation-assurance/EVALUATION_ASSURANCE_P0_CURRENT_IMPLEMENTATION_AUDIT.md` (462 lines). Every content, semantic, visual, accessibility, localization, performance, and data decision below cites the spec section it comes from.

# OWNER DECISION

The P0 audit returned **B — BLOCKED**, on a single narrow question: what happens to the pre-existing `components/home/assurance.tsx` / `homepageCopy.assurance` content, which already occupied this slot's name and position and used "روش ارزیابی" — literally the first of the six generic headings V2.1 §4.1 forbids.

The owner has resolved it: **both** `capabilities.tsx` and `assurance.tsx` are retired from the Homepage, and **neither one's content is migrated** into the new component. This is a clean replacement, not a repurposing. That decision is implemented literally — the new component is a new file with new content, and both old files are deleted rather than edited in place.

Note recorded for the owner (carried forward from the P0 audit's own SERVICES-HOME-P0 RECONCILIATION section, still true after this task): retiring `Capabilities` removes the "what we do" / purchasing-manager-responsibility narrative from the Homepage entirely, with no designated future home. V2.1 §1 frames this as deliberate ("not a generic company-capabilities section"), and this task treated it as intended, but nothing in the current frozen corpus reassigns that narrative.

# LEGACY CAPABILITIES RETIREMENT

Deleted `components/home/capabilities.tsx` (46 lines). Removed its import and `<Capabilities locale={locale} />` usage from `app/[locale]/page.tsx`. Removed `homepageCopy[locale].capabilities` (eyebrow/title/body) from the `HomepageCopy` interface and from all three locale objects in `lib/content/homepage.ts`.

Removed `"components/home/capabilities.tsx"` from the `Reveal`-consumer list in `lib/catalog/homepage-progressive-enhancement.test.ts` (one array entry — the file no longer exists, so that test would otherwise fail on a missing file). No other line of that test changed; every other P0-1 invariant it pins is untouched.

`lib/content/pages.ts#servicesCopy` was **NOT** touched. It is still exported, still consumed by `app/[locale]/services/page.tsx`, and a dedicated regression test now pins that fact so a future cleanup cannot over-delete it.

# LEGACY ASSURANCE RETIREMENT

Deleted `components/home/assurance.tsx` (44 lines). Removed its import and `<Assurance locale={locale} />` usage from `app/[locale]/page.tsx`. Removed `homepageCopy[locale].assurance` (eyebrow/title/body/badge/points) from the interface and from all three locale objects.

Its content — "روش ارزیابی" / "Evaluation method" / "منهجية التقييم", the "شفاف و مستند" overlay badge, and the three-point `<dl>` (written sourcing comparison / documentation-and-traceability / request logging) — was **not** migrated anywhere. A dedicated test asserts that none of those strings reappear in the new component's copy in any locale.

`lib/content/hero-frozen-spec-invariants.test.ts:165` still mentions `assurance.tsx` inside an assertion **message** ("matching assurance.tsx's convention"). That is prose in a failure string, not a functional dependency, and the test passes unchanged. It was deliberately left alone because the Hero V2.4 artifacts are frozen and the cost of a now-stale doc reference is lower than the cost of touching a frozen-spec test file for a cosmetic edit. Recorded here so a future reader is not surprised by it.

# HOMEPAGE SEQUENCE

`app/[locale]/page.tsx` now composes:

```
Hero
  -> PriceStrip           (conditional on env.PRICE_STRIP_ENABLED, unchanged)
  -> ProductShowcase      (try/catch-isolated, unchanged)
  -> EvaluationAssurance  <-- NEW, replaces both Capabilities and Assurance
  -> Process
  -> Reach
  -> CtaBand
  -> JsonLd
```

Exactly matches V2.1 §2. The full diff to this file is four lines: two imports removed, one added; two elements removed, one added. Nothing else on the page changed — the price-strip gating, the Product Showcase failure isolation, the ranking-mode resolution, the metadata block, and the JSON-LD graph are byte-identical.

Live-verified in the browser for all three locales (see SSR / RESPONSIVE MATRIX): `Node.compareDocumentPosition` reports Product Showcase before Evaluation/Assurance before Process, with a real, populated Product Showcase rendering above it.

# COMPONENT ARCHITECTURE

New file: `components/home/evaluation-assurance.tsx` (104 lines), following the repository's one-concept-per-file `kebab-case-noun.tsx` convention (`product-showcase.tsx`, `price-strip.tsx`, `process.tsx`, `reach.tsx`).

New file: `lib/content/evaluation-assurance.ts` (51 lines) — a pure, dependency-free module exporting `EVALUATION_AXIS_COUNT` and `evaluationAxisIndex(locale, index)`. Split out from the component so the locale digit policy is directly unit-testable under plain `node --test` rather than only assertable as source text.

Ordinary Server Component. No `"use client"`. Its complete import list is three entries:

```ts
import { homepageCopy } from "@/lib/content/homepage";
import { evaluationAxisIndex } from "@/lib/content/evaluation-assurance";
import type { Locale } from "@/config/locales";
```

**Deliberate deviation from the task prompt — `SectionHeading` is not used.** The prompt directed using `SectionHeading`'s `headingId` prop. On inspection, `SectionHeading`'s signature is:

```ts
{ eyebrow: string; title: string; body?: string; ...; headingId?: string }
```

`eyebrow` is **required**, and V2.1 §29's frozen structure has no eyebrow at all. Satisfying that prop would have meant inventing a Persian eyebrow, and every natural candidate for this concept ("روش ارزیابی", "آنچه بررسی می‌کنیم", ...) is on §4.1's explicit forbidden list — the exact copy the P0 audit flagged as the blocker. The alternatives were (a) invent forbidden copy, (b) make `eyebrow` optional on a shared component consumed by many sections, or (c) render the `<h2 id>` directly.

(c) was chosen. It is not a novel pattern: `components/home/price-strip.tsx` — a frozen component on this same page — already renders `<h2 id="selected-prices-heading">` inline with no `SectionHeading` and no eyebrow. The `aria-labelledby` / `<h2 id>` wiring V2.1 §29 requires is satisfied identically, and no shared component was modified. This is flagged prominently because it is the one place the implementation does not follow the task's literal instruction.

**No `Reveal`.** V2.1 §38 targets "0 dedicated interaction JS" and §26 makes motion optional; the task prompt explicitly permitted the simplest compliant implementation with no reveal. `components/ui/reveal.tsx` was read in full and does carry the P0-1 zero-hidden-state guarantee, so using it would have been safe — but not using it is strictly simpler and makes SSR, JS-off, and reduced-motion literally the same render, with nothing to verify. A test pins the absence so a future edit adding a theatrical stagger fails loudly.

# CONTENT OWNERSHIP

All user-facing copy lives in `lib/content/homepage.ts` under a new `evaluationAssurance` key on the existing `Record<Locale, HomepageCopy>`, following the established per-section pattern exactly:

```ts
evaluationAssurance: {
  title: string;             // the H2
  body: string;              // supporting copy
  axes: { title: string; body: string }[];   // exactly 4
};
```

No `eyebrow` field (see COMPONENT ARCHITECTURE). No copy is inlined in the component — a test asserts there is **zero** literal user-facing text in JSX text position anywhere in the file.

`lib/content/pages.ts#servicesCopy` is **not** reused. This is new, independent content, per the task's explicit instruction and V2.1 §15.

The decorative 01–04 indexes are deliberately **not** stored as content. They are derived at render time from the locale, so a future copy edit cannot desynchronize the visible numbering from the DOM order (V2.1 §20.1: "digit localization must not change semantic list order"). A test asserts no digit literals appear in the copy module.

# FA CONTENT

Frozen Persian, copied character-for-character from the spec and pinned by exact-equality tests:

- **H2** (§4.1): `پیش از ارائه پیشنهاد، چه چیزهایی بررسی می‌شود؟`
- **Supporting** (§5): `هر درخواست از نظر مشخصات فنی، امکان تأمین، شرایط تجاری و الزامات تحویل بررسی می‌شود تا مبنای پیشنهاد برای شما روشن باشد.`
- **01 انطباق فنی** (§7.2): `محصول، ابعاد، گرید، استاندارد و سایر مشخصات ضروری درخواست بررسی می‌شود. در صورت نیاز پروژه، الزامات مدارک فنی و کیفی نیز لحاظ می‌شود.`
- **02 امکان تأمین** (§8.2): `امکان تهیه مورد درخواست و محدودیت‌های مؤثر بر آن بررسی می‌شود.`
- **03 شرایط تجاری** (§9.2): `مقدار و واحد، قیمت پیشنهادی، شرایط پرداخت و مدت اعتبار پیشنهاد به‌صورت روشن مشخص می‌شود.`
- **04 تحویل** (§10.2): `مقصد، زمان موردنیاز، شرایط حمل و مبنای تحویل در صورت اثرگذاری بر پیشنهاد بررسی می‌شود.`

Verified three ways: exact-equality unit tests against the content module; substring presence in the raw SSR HTML fetched by `curl`; and `textContent` read from the live rendered DOM in Chrome.

# EN CONTENT

Approved English baseline, used verbatim, never strengthened past the Persian (§33), pinned by exact-equality tests:

- H2: `What is reviewed before a proposal is presented?`
- Supporting: `Each request is reviewed for technical specifications, sourcing feasibility, commercial conditions, and delivery requirements so the basis of the proposal is clear to you.`
- 01 Technical conformity: `The product, dimensions, grade, standard, and other essential request specifications are reviewed. Where required by the project, technical and quality documentation requirements are also considered.`
- 02 Sourcing feasibility: `The feasibility of sourcing the requested item and the constraints that materially affect it are reviewed.`
- 03 Commercial conditions: `The quantity and unit, proposed price, payment terms, and proposal validity period are stated clearly.`
- 04 Delivery: `Destination, required timing, transport conditions, and delivery basis are reviewed when they affect the proposal.`

# AR CONTENT

Approved Arabic baseline, used verbatim, never strengthened (§33), pinned by exact-equality tests:

- H2: `ما الذي تتم مراجعته قبل تقديم العرض؟`
- Supporting: `تتم مراجعة كل طلب من حيث المواصفات الفنية، وإمكانية التوريد، والشروط التجارية، ومتطلبات التسليم، بحيث يكون أساس العرض واضحًا لكم.`
- 01 المطابقة الفنية: `تتم مراجعة المنتج والأبعاد والدرجة والمواصفة القياسية وسائر المواصفات الأساسية للطلب. وعند حاجة المشروع، تؤخذ متطلبات الوثائق الفنية ووثائق الجودة في الاعتبار أيضًا.`
- 02 إمكانية التوريد: `تتم مراجعة إمكانية توفير الصنف المطلوب والقيود المؤثرة في إمكانية توريده.`
- 03 الشروط التجارية: `يتم توضيح الكمية والوحدة والسعر المقترح وشروط الدفع ومدة صلاحية العرض بصورة واضحة.`
- 04 التسليم: `تتم مراجعة الوجهة والموعد المطلوب وشروط النقل وأساس التسليم عندما تكون مؤثرة في العرض.`

No "guarantee / best price / trusted supplier / approved supplier / factory-direct" language was introduced in any locale — asserted explicitly (see CLAIM SAFETY).

# FOUR AXES

Exactly four, in the frozen order, in every locale (§6):

| # | FA | EN | AR |
|---|---|---|---|
| 01 | انطباق فنی | Technical conformity | المطابقة الفنية |
| 02 | امکان تأمین | Sourcing feasibility | إمكانية التوريد |
| 03 | شرایط تجاری | Commercial conditions | الشروط التجارية |
| 04 | تحویل | Delivery | التسليم |

`EVALUATION_AXIS_COUNT === 4` is a named exported constant, and a test asserts `axes.length === EVALUATION_AXIS_COUNT` for fa/en/ar. Titles and copies are asserted distinct within each locale, and free of placeholder/`undefined`/raw-key leakage (§40).

No fifth axis. Technical/quality documentation stays conditional inside Axis 01 (§11), exactly as the frozen copy words it. No "what we do" second list — a test asserts none of `بررسی نیاز` / `مقایسه تأمین‌کنندگان` / `هماهنگی خرید` / `پیگیری سفارش` / "What we do" / `ما نقوم به` / `آنچه ما انجام می‌دهیم` appears in any locale's copy (§15).

# AXIS BOUNDARIES

Enforced by dedicated executable tests, not only by having copied the right strings:

- **Technical owns** product / dimensions / grade / standard / essential specs, plus *conditional* technical-and-quality documentation. **Does not own** quantity or commercial unit — §7.4's explicit V1.0 correction. Test: `fa.axes[0].body` must not contain `مقدار`; `en.axes[0].body` must not match `/quantity/i`.
- **Sourcing owns** sourceability and the constraints that materially affect it. No supplier-qualification claim (§12) — covered by CLAIM SAFETY.
- **Commercial owns** quantity and unit, proposed price, payment terms, validity period. Test: `fa.axes[2].body` contains `مقدار و واحد`; `en.axes[2].body` matches `/quantity and unit/i`.
- **Delivery owns** destination, required timing, transport conditions, and delivery basis — the canonical owner of Incoterm/delivery-term meaning (§10.3). Test: `fa.axes[3].body` contains `مبنای تحویل` while `fa.axes[2].body` does **not**; `en.axes[3].body` matches `/delivery basis/i` while `en.axes[2].body` matches neither `/delivery basis/i` nor `/incoterm/i`. This is precisely the §9.4/§49 hardening point V2.1 exists to enforce, so it is pinned in both directions rather than only asserted positively.

# VISUAL ARCHITECTURE

```
<section aria-labelledby>            warm cream surface, subtle bottom border
  <div class="container-x">
    <div class="grid gap-12 lg:grid-cols-12 lg:gap-16">
      <div class="lg:col-span-5">    ~41.7%  H2 + supporting <p>
      <ul  class="lg:col-span-7">    ~58.3%  4 rows, divide-y
```

- **Desktop split (§16.1 "~40% intro / ~60% list")**: 5/12 and 7/12 of a 12-column grid = 41.67% / 58.33%.
- **Stacking (§28)**: the grid is single-column below `lg` (= `@media (width >= 64rem)` = 1024px), so tablet stacks earlier than a 40/60 split would allow. §28 explicitly permits stacking earlier than a framework default when localized content fit calls for it; FA/AR/EN axis copy at 768px in a 58%-wide column produces a narrow measure, so it stacks instead.
- **Surface (§19)**: `bg-[var(--aa-color-bg-warm)]` → `--aa-color-brand-cream-50` → `#fbf5eb`. Reuses the existing token already consumed by `hero.tsx` and `price-strip.tsx`; no new token was introduced. Live-confirmed computed `background-color: rgb(251, 245, 235)`.
- **Text**: `text-navy` → `#0b2545` for H2 and every H3. `text-muted-foreground` → `#475467` for supporting and axis copy.
- **Index accent**: `text-copper` → `#b04a2f`, at `text-sm` (14px) against `text-lg` (18px) H3 — restrained and smaller than the row heading, per §20.
- **Rows (§17)**: `<li class="py-7 first:pt-0 last:pb-0">`, separated by `divide-y divide-border`. Not independent cards — no per-row border box, background, radius, or shadow.
- **Directions are logical throughout** (`flex` + `gap`, `ms`/`me`-free, no physical left/right, no `rtl:` override), so FA/AR RTL and EN LTR share one implementation (§34).

Not used, per §19/§46: no image, no dark industrial background, no gradient as primary surface, no glassmorphism, no floating translucent card, no overlay badge, no carousel, no scrollytelling.

# NO-CARD-GRID VERIFICATION

The `<ul>` className is `divide-border divide-y self-start lg:col-span-7` — no `grid`, no `grid-cols-*`, no `rounded`, no `shadow`, no background. The `<li>` className is `py-7 first:pt-0 last:pb-0` — no border box, no radius, no shadow, no backdrop-blur, no background.

Two tests extract those exact classNames from source and assert the absence of each pattern, so a future edit that turns the rows into four cards fails. Confirmed visually in the live browser at 407px in all three locales: the rows read as an editorial list separated by hairline rules and whitespace, structurally distinct from the card-based Product Showcase directly above it (§18's stated reason for forbidding a card grid here).

The only `grid` in the component is the outer two-region `lg:grid-cols-12` intro/list split, which is layout, not a card grid.

# NO-ICON VERIFICATION

No `lucide-react` import, no icon component, no inline `<svg>`, no icon-name string anywhere. Asserted by test for the library import, the `<svg>` element, and each of `ArrowUpRight` / `Check` / `CheckCircle` / `Shield` / `Truck` / `Gear` / `Settings` (§21's named "gear / shield / truck / currency / check-circle" examples).

Live DOM check: `sec.querySelectorAll('img,svg,picture,video').length === 0` in fa, en, and ar. Also no image import, no image element, and no `.png/.jpg/.webp/.svg` reference (§39: "No image is required for this section").

# INDEX POLICY

Implemented in `lib/content/evaluation-assurance.ts`:

```ts
const LOCALE_NUMERALS_FOR: Record<Locale, string> = { fa: "fa-IR", en: "en-US", ar: "ar-EG" };
new Intl.NumberFormat(LOCALE_NUMERALS_FOR[locale], { minimumIntegerDigits: 2, useGrouping: false }).format(index + 1)
```

A broad prior search for an existing localized-digit render utility found none. `lib/rfq/quantity.ts#normalizeDigits` runs the opposite direction (FA/AR → ASCII, for parsing). `lib/pricing/price-strip-presentation.ts` holds an equivalent **private** `LOCALE_NUMERALS_FOR` map; it was deliberately **not** extracted and shared, because the Price Strip is frozen and reopening it for a refactor is a worse trade than a second small pure constant. That decision is documented in the new module's doc comment.

Output, asserted by test and observed live:

```
FA -> ۰۱ ۰۲ ۰۳ ۰۴    (U+06F0..U+06F4)
AR -> ٠١ ٠٢ ٠٣ ٠٤    (U+0660..U+0664, code points read from the live DOM)
EN -> 01 02 03 04
```

Rendering (§20): `<span aria-hidden="true" className="text-copper shrink-0 text-sm font-semibold tabular-nums">`. Live computed style confirms `font-variant-numeric: tabular-nums`, `color: rgb(176, 74, 47)`, `font-size: 14px` versus the H3's `18px`. Tests assert `aria-hidden`, `tabular-nums`, `text-sm`, and the absence of `rounded`/`bg-`/`border` on the index span (§20: "Do not style the numbers as prominent badges or step indicators"). A further test asserts digit scripts are never mixed within a locale and that no digit literal is stored in the copy module.

# SEMANTIC HTML

Rendered structure (exact SSR output, EN, abridged):

```html
<section aria-labelledby="home-evaluation-assurance-heading" class="...bg-[var(--aa-color-bg-warm)]...">
  <div class="container-x"><div class="grid ... lg:grid-cols-12">
    <div class="lg:col-span-5">
      <h2 id="home-evaluation-assurance-heading">What is reviewed before a proposal is presented?</h2>
      <p>Each request is reviewed for ...</p>
    </div>
    <ul class="divide-border divide-y self-start lg:col-span-7">
      <li><div><span aria-hidden="true" class="... tabular-nums">01</span>
              <h3>Technical conformity</h3></div>
          <p>The product, dimensions, grade, ...</p></li>
      ... x4
    </ul>
  </div></div>
</section>
```

`<ul>`, never `<ol>` (§29 — criteria, not chronological steps): live DOM reports `listTag: "UL"` and `sec.querySelectorAll('ol').length === 0`. Heading hierarchy is H2 for the section and H3 per axis (§30); the decorative number is never a heading. Tests pin exactly one `<h2>`, the `<h3>` element, the absence of `<h1>`/`<h4>`, and that no heading element wraps `evaluationAxisIndex`.

Live page-wide heading order (AR): `H1` (Hero) → `H2` (Product Showcase) + its H3s → `H2` (Evaluation) + 4 H3s → `H2` (Process) + its H3s. No skipped level, no heading used for styling.

# NO-CTA VERIFICATION

No `next/link` import, no `<Link>`, no `<a>`, no `<button>`, no `<Button>`, no `href`, no `localizedPath` (§25). Asserted by test.

Live DOM, all three locales: `sec.querySelectorAll('a,button,[role=button],details,summary,input,select,[tabindex],[aria-expanded]').length === 0`. The Chrome accessibility tree for the section shows only `region → heading → generic → list → 4 × (listitem → heading + generic)` — no interactive node of any kind, in contrast with the Product Showcase region immediately above it, whose links are listed.

Rows also do not *look* clickable (§24/§46): a test asserts the component contains no `hover:`, `group-hover:`, `peer-`, `cursor-pointer`, `onClick`, `tabIndex`, `title=`, `aria-expanded`, `aria-controls`, `<details>`, `<summary>`, `role="tab"`, `snap-`, `overflow-x`, or `sticky`.

# DATA DEPENDENCY

Zero. The component's complete import list is the localized content module, the pure index helper, and a type — asserted by a test that reads the import statements and compares the sorted list against an exact expected array, so adding any fourth import fails.

A further test asserts the source contains none of `cloudflare:workers`, `DB_PUBLIC`, `DB_OPS`, `odoo`/`Odoo`, `@/lib/catalog`, `@/lib/pricing`, `@/lib/processing`, `public_processing_groups`, `listHomepageProductCandidates`, or `getHomepagePriceStrip` (§36).

No client fetch, no `useState`/`useEffect`/`useRef`/`useMemo`, no `"use client"`, no `return null` omission path. Odoo, DB_PUBLIC, the Product/Processing projections, and pricing can all be unavailable with no effect on this section (§40).

**PROCESSING PROJECTION DEPENDENCY: ABSENT. ODOO DEPENDENCY: ABSENT. DB_PUBLIC DEPENDENCY: ABSENT.**

# HEADER SERVICES BOUNDARY

Untouched and unaffected. The Header's Services dropdown path (`app/[locale]/layout.tsx` → `lib/processing/public-repository.ts#listPublicProcessingGroups` → `DB_PUBLIC.public_processing_groups` → `SiteHeader`) shares no file with anything this task changed. The complete set of files modified between `c571c45` and the runtime commit is eight files, none of which is in `app/[locale]/layout.tsx`, `components/layout/`, or `lib/processing/`. `/services` itself is unchanged: `app/[locale]/services/page.tsx` was not modified, and `lib/content/pages.ts` was not modified.

# SSR

`curl` against the dev server, all three locales, no JavaScript involved:

```
GET /fa -> 308 -> / -> 200, 240426 bytes
GET /en -> 200, 237217 bytes
GET /ar -> 200, 240193 bytes
```

For each locale, all 14 checked strings (H2, supporting copy, 4 axis titles, 4 axis copies, 4 index digits) were present in the raw server-rendered HTML: **fa 14/14, en 14/14, ar 14/14.**

The same fetch confirmed the retired content is gone from the server output in every locale: `روش ارزیابی`, `Evaluation method`, `منهجية التقييم`, `آنچه ما انجام می‌دهیم`, `What we do`, `ما نقوم به`, `شفاف و مستند`, `Transparent & documented`, `warehouse.png`, `inspection.png` — **none present**.

Structural counts parsed directly out of the raw HTML fragment, per locale: 1 `<section aria-labelledby>`, 1 `<h2>`, 1 `<ul>`, 0 `<ol>`, 4 `<li>`, 4 `<h3>`, 5 `<p>`, 4 `aria-hidden` index spans, 0 `<img>`, 0 `<svg>`, 0 `<a>`, 0 `<button>`, `tabular-nums` present, `--aa-color-bg-warm` present, `data-reveal` absent, `reveal` class absent.

# JS-OFF

This sandbox has no true JavaScript-disable toggle, so the same method used by the Product Showcase audits in this arc was used again, and is disclosed as such: **raw `curl` HTML + inspection of the compiled CSS for any rule that could hide the section.** It is not a real browser with scripting turned off.

That said, the argument here is stronger than for the Showcase, because the section has no JS at all:

1. Every string is already present in the `curl`-fetched HTML (see SSR) — nothing is injected client-side.
2. The section never uses the `.reveal` class and emits no `data-reveal` attribute, so the entire `Reveal` progressive-enhancement mechanism is irrelevant to it.
3. The served stylesheet was fetched (`/app/globals.css`, 73804 bytes) and every rule block whose selector contains any of the 32 utility classes this section uses was scanned for `opacity: 0`, `display: none`, `visibility: hidden`, or `content-visibility: hidden`. **Result: NONE.** A test additionally asserts no `opacity-0`, `invisible`, `hidden`, or `sr-only` class appears in the component (with `aria-hidden` correctly excluded from that check).

There is therefore no state — JS failed, JS blocked, hydration crashed, animation frozen, reduced motion — in which any of this content can be hidden, because nothing ever hides it.

# RESPONSIVE MATRIX

**Honest disclosure, matching the standard of every prior audit in this arc:** the sandbox browser window did **not** honor `resize_window`. It reported success for a 1440×900 request, but `window.innerWidth` stayed at **407 CSS px** (`outerWidth` 406, `screen` 1440×900, DPR 2) for the entire session. This is the same class of failure previous sessions recorded (windows pinned near ~1232px or ~814px); this time it pinned near ~407px. Every "live" row below is therefore a real observation at ~407 CSS px, and every wider row is CSS-reading only.

| Viewport | FA | EN | AR | How verified |
|---|---|---|---|---|
| ~407 CSS px (actual window) | PASS | PASS | PASS | **LIVE** — rendered, screenshotted, DOM+computed-style measured |
| ~320 CSS px effective | PASS | — | PASS | **LIVE (zoom proxy)** — `documentElement.style.zoom = 1.272` on the 407px window; `scrollWidth === clientWidth`, zero elements inside the section exceeding the viewport |
| ~204 CSS px effective | — | — | PASS | **LIVE (zoom proxy)** — 200% zoom; no horizontal overflow, all 4 axes and all 5 paragraphs still rendered |
| 360 / 375 / 390 / 430 | PASS (inferred) | PASS (inferred) | PASS (inferred) | **CSS reading** — these all sit between the two live-measured widths (320 and 407) in the same single-column, no-media-query regime; no rule changes between them |
| 768 / 1024 boundary | — | — | — | **CSS READING ONLY** — `lg` compiles to `@media (width >= 64rem)`; below 1024px the grid stays single-column, so 768 renders stacked exactly like the live 407px case |
| 1024 / 1280 / 1440 | — | — | — | **CSS READING ONLY** — at `>= 64rem` the compiled bundle applies `.lg\:grid-cols-12 { grid-template-columns: repeat(12, minmax(0,1fr)) }`, `.lg\:col-span-5 { grid-column: span 5 / span 5 }`, `.lg\:col-span-7 { grid-column: span 7 / span 7 }` → the ~41.7/58.3 split of §16.1. **The desktop two-column layout was never seen rendered.** |

Live-observed at ~407px, all three locales: single-column, DOM reading order H2 → supporting → axis 01 → 02 → 03 → 04 (§27), no two-column compression, no carousel, no accordion, no sticky intro, and `document.documentElement.scrollWidth === clientWidth` (no horizontal document scroll).

# ZOOM / REFLOW

Performed with `documentElement.style.zoom` on the live AR page, since the sandbox rejects Chrome's own zoom shortcuts and the window would not resize. Disclosed as a proxy for browser page zoom, not native zoom.

| Zoom | Effective CSS width | Page horizontal overflow | Elements inside this section exceeding the viewport |
|---|---|---|---|
| 100% | 407.0 px | no | 0 |
| 127% (≈ the 320px WCAG 1.4.10 reflow target) | 320.0 px | **no** | **0** |
| 200% | 203.5 px | no | 0 |
| 400% (of this 407px window ≈ 102px effective) | 101.8 px | yes (page) | **0** |

At every level, all four axis headings and all five paragraphs remained rendered with non-zero height — no clipping, no truncation, no content lost.

The page-level overflow at the extreme ~102px effective width is **not** attributable to this section. The overflowing elements were enumerated and every one belongs elsewhere: `DIV.max-w-2xl` / `P.eyebrow` / `H2.mt-5 …` (the shared `SectionHeading` used by other sections) and `LI.reveal` / `DIV.border-border bg-background …` / `DL.mt-4 …` (the Purchase Process card grid). Zero elements inside the Evaluation/Assurance section exceeded the viewport at any zoom tested. That ~102px condition is also far beyond the WCAG requirement, which is satisfied at 320px — where the page has no overflow at all.

# ACCESSIBILITY

Confirmed against the actual rendered DOM and the Chrome accessibility tree, not inferred from source:

```
region  "ما الذي تتم مراجعته قبل تقديم العرض؟"      <- section, named by its own h2
  heading "ما الذي تتم مراجعته قبل تقديم العرض؟"
  generic "تتم مراجعة كل طلب من حيث المواصفات …"    <- supporting <p>
  list
    listitem -> heading "المطابقة الفنية"   + generic "تتم مراجعة المنتج والأبعاد …"
    listitem -> heading "إمكانية التوريد"    + generic "تتم مراجعة إمكانية توفير …"
    listitem -> heading "الشروط التجارية"    + generic "يتم توضيح الكمية والوحدة …"
    listitem -> heading "التسليم"           + generic "تتم مراجعة الوجهة والموعد …"
```

Exactly the `section → h2 → ul → li → h3` structure §29 requires. **The decorative index numbers do not appear anywhere in the accessibility tree at all**, which is the strongest available confirmation that `aria-hidden="true"` is doing its job — compare the Purchase Process listitems in the same tree, whose `dt`/`dd` values *do* appear. The list semantics are exposed as `list`/`listitem`, not as an ordered sequence.

Also verified: `dir="rtl"`/`lang="fa"`, `dir="rtl"`/`lang="ar"`, `dir="ltr"`/`lang="en"` on `<html>` with correct visual and DOM reading order in each; no information conveyed by color alone (every axis carries a real text heading); nothing hidden behind hover (there is no hover state); no keyboard trap or focusable element (there are none); text remains usable and complete at 200% and beyond; no horizontal document scrolling caused by this section. WCAG 2.2 AA baseline (§31) upheld.

# CONTRAST

Computed from the colors actually read off the live rendered elements, against the section's live computed background `rgb(251, 245, 235)` = `#fbf5eb`:

| Element | Color | Ratio | Requirement | Result |
|---|---|---|---|---|
| H2, 30–40px bold | `#0b2545` navy | **14.19:1** | 3:1 (large) | PASS |
| H3 axis titles, 18px bold | `#0b2545` navy | **14.19:1** | 3:1 (large) | PASS |
| Supporting copy, 16px | `#475467` | **7.09:1** | 4.5:1 | PASS |
| Axis copy, 14px | `#475467` | **7.09:1** | 4.5:1 | PASS |
| Decorative index, 14px, `aria-hidden` | `#b04a2f` copper | **5.01:1** | n/a (decorative) | PASS anyway |
| Row divider | `#eaecf0` | 1.09:1 | n/a (non-text, decorative) | see note |

All user-facing normal-size text clears §32's `>= 4.5:1` with margin. The copper index is decorative and `aria-hidden`, so no text-contrast threshold applies to it, but it clears 4.5:1 regardless. The dividers are low-contrast by design and are **not** the only means of distinguishing rows (§22) — row padding and a real `<h3>` per row carry the grouping, so losing the divider entirely costs no information. There are no interactive controls in this component, so no non-text UI-component contrast requirement applies (§32).

# CLAIM SAFETY

The approved FA/EN/AR baselines were copied verbatim rather than paraphrased, and then verified by exact-equality assertions against the spec text — so the claim surface is exactly what was approved.

An executable regression test scans every locale's `evaluationAssurance` copy for 30 prohibited phrases drawn from §12/§13/§14/§45, in all three languages:

```
FA: بهترین قیمت · ارزان‌ترین · خرید مطمئن · تضمین · تأمین سریع · بدون ریسک ·
    بهترین تأمین‌کننده · قابل‌اتکا · تأییدشده · تضمین‌شده · بدون واسطه ·
    فروش مستقیم کارخانه · تولید مستقیم · موجودی انبار
EN: best price · cheapest · lowest price · guarantee · guaranteed · risk-free ·
    risk free · trusted supplier · approved supplier · vetted supplier ·
    factory-direct · factory direct · no middleman · without intermediaries ·
    owned stock · our own stock · we manufacture
AR: أفضل سعر · الأرخص · ضمان · مضمون · بدون وسيط · مورد معتمد · موردين موثوق · مخزوننا
```

**Zero matches in any locale.** A second test applies the same check to the component source itself, so a future hardcoded claim also fails. A third test asserts the FA H2 is never any of §4.1's six forbidden generic headings, naming `روش ارزیابی` explicitly — the exact heading the P0 audit found live in the retired component. A fourth test asserts no chronological/step framing (`مرحله`, `خطوة`, "Step 1", arrows, connectors) appears in the copy or the markup (§45.6).

Note carried forward, **out of scope and unchanged**: the P0 audit flagged that `homepageCopy.process` (the *Purchase Process* section, a different component) contains `گزینه‌های تأمین قابل‌اتکا` / "Reliable sourcing options are identified" — a direct textual hit on the softer phrase §12 names by name. That is not inside the Evaluation/Assurance slot, this task did not touch it, and it remains open exactly as the P0 audit left it.

# PURCHASE PROCESS BOUNDARY

`components/home/process.tsx` was read but **not modified** — no redesign, no content change, no reordering. Its `<ol>` semantics remain correct for its own chronological content, and its step 2 ("بررسی نیاز", inputs "مشخصات، مقدار، زمان‌بندی و اولویت‌ها") still names workflow-level categories rather than the detailed grade/standard/price-basis/payment-term/delivery-basis lists §41 forbids duplicating.

The new component holds up its side of §41's mandatory boundary: it answers "what is checked", never "what happens next". It uses `<ul>` not `<ol>`; it has no "Step"/`مرحله`/`خطوة` language, no arrows, no sequential connector graphics, no progress indicator, and no numbered-step styling (the indexes are `aria-hidden` scanning aids that the accessibility tree does not expose at all). Both the copy and the markup are pinned against this by test.

Forward-looking risk, recorded not fixed: now that the four detailed axes ship, Purchase Process step 2 must not later be expanded to that same level of detail, or §41's duplication is recreated from the other side.

# FILES REMOVED

```
components/home/capabilities.tsx   (46 lines)  — sole importer was app/[locale]/page.tsx
components/home/assurance.tsx      (44 lines)  — sole importer was app/[locale]/page.tsx
```

Plus, inside `lib/content/homepage.ts`: the `capabilities` and `assurance` fields on the `HomepageCopy` interface and all six corresponding locale objects (3 locales × 2 keys).

**Asset files were deliberately NOT deleted.** `/images/ops/warehouse.png` is still referenced by `app/[locale]/industries/page.tsx:38` and must stay. `/images/ops/inspection.png` is now unreferenced by any code (verified by repository-wide grep), but was left in place: the task classified this as a low-priority nicety where leaving an unused file is safer than an incorrect deletion, and `public/images/ops/` is shared asset territory.

# FILES CREATED

```
components/home/evaluation-assurance.tsx                          (104 lines)
lib/content/evaluation-assurance.ts                                (51 lines)
lib/content/evaluation-assurance-frozen-spec-invariants.test.ts   (479 lines)
```

# FILES MODIFIED

```
app/[locale]/page.tsx                              (+2 / -4)   imports + composition only
lib/content/homepage.ts                            (+95 / -56) interface + 3 locale objects + module doc
lib/catalog/homepage-progressive-enhancement.test.ts (-1)      one Reveal-consumer array entry
```

Complete set of files differing between `c571c45` and the runtime commit — eight, exactly the eight listed across FILES REMOVED / CREATED / MODIFIED. No frozen component (Header, Hero, Product Showcase, Price Strip, shared Button), no `01-sources/`, no `logo/`, no `design-reference/`, no `wrangler.jsonc`, no migration, and no `lib/content/pages.ts` was touched.

# RUNTIME COMMIT

```
a9e68480e08771d9accbfff4e7c73fb34d0f9c44
feat(home): implement frozen Evaluation Assurance V2.1

 app/[locale]/page.tsx                                |   6 +-
 components/home/assurance.tsx                        |  44 --
 components/home/capabilities.tsx                     |  46 --
 components/home/evaluation-assurance.tsx             | 104 +++++
 lib/catalog/homepage-progressive-enhancement.test.ts |   1 -
 ...ssurance-frozen-spec-invariants.test.ts           | 479 +++++++++++++++++
 lib/content/evaluation-assurance.ts                  |  51 +++
 lib/content/homepage.ts                              | 151 ++++---
 8 files changed, 732 insertions(+), 150 deletions(-)
```

`tsconfig.tsbuildinfo` is tracked in this repository but has not been committed since `53ab302`; it was restored to its committed state rather than included, matching the convention every prior implementation commit in this arc followed.

# EVALUATION TESTS

`lib/content/evaluation-assurance-frozen-spec-invariants.test.ts` — **43 tests, 43 pass, 0 fail.**

Naming and style follow `lib/content/header-frozen-spec-invariants.test.ts` / `hero-frozen-spec-invariants.test.ts` and the source-text-invariant convention of `lib/catalog/homepage-progressive-enhancement.test.ts` (no React render-testing framework exists in this repo). The content module and the index helper are plain data / pure functions with no `cloudflare:workers` reachability, so they are imported and asserted directly; the JSX component is pinned as comment-stripped source text.

Coverage by group:

- **Legacy retirement (6)** — both files deleted from disk; no import or element for either in `page.tsx`; no residual import in `page.tsx`, `/services/page.tsx`, or the new component; `capabilities`/`assurance` keys gone from all three locales; retired Assurance copy not migrated; `servicesCopy` and its `/services` consumer preserved.
- **Homepage sequence (2)** — exactly one `<EvaluationAssurance>`; Product Showcase < Evaluation/Assurance < Process by source position.
- **Content regression (7)** — exact FA H2, FA supporting copy, 4 FA axis titles, 4 FA axis copies; full EN baseline; full AR baseline; no placeholder/duplicate/empty strings.
- **Four axes + boundaries (4)** — exactly 4 per locale against the named constant; no "what we do" list; quantity/unit under Commercial not Technical; delivery basis under Delivery not Commercial (asserted in both directions).
- **Index policy (4)** — frozen FA/AR/EN digit scripts; no script mixing and two-digit padding; `aria-hidden` + `tabular-nums` + smaller-than-heading + not-a-badge; indexes never stored as content.
- **Semantics (4)** — `aria-labelledby`/`<h2 id>` wiring; `<ul>` present and `<ol>` absent; H2/H3 hierarchy with the index never a heading; supporting and axis copy are real `<p>` elements.
- **Visual contract (5)** — no image/asset/background-image; no icon library, `<svg>`, or named icon; no link/button/`href`/route helper; no card grid on `<ul>` or `<li>`; warm-cream surface + navy + copper and no dark/gradient/glassmorphism; dividers subtle.
- **Interaction / motion / data (6)** — no disclosure/hover/sticky/scroll affordance; no chronological framing; server component with no client state, no `Reveal`, no `<noscript>`; nothing hidden; exact three-import list and no Odoo/DB/projection/pricing reference; no data-driven omission path.
- **Claim safety (5)** — FA H2 never one of the six forbidden headings; 30 prohibited phrases absent from all three locales' copy; prohibited phrases absent from the component source; no literal user-facing text in the component.

# FULL TESTS

```
$ npm test
ℹ tests 984
ℹ suites 0
ℹ pass 984
ℹ fail 0
ℹ cancelled 0
ℹ skipped 0
ℹ todo 0
ℹ duration_ms 6517.90325
```

**941 pre-existing (the recorded P0 baseline) + 43 new = 984.** Zero pre-existing tests broke and zero were removed. The single pre-existing test file touched (`homepage-progressive-enhancement.test.ts`) lost one array entry pointing at a now-deleted file; all of its assertions still run and still pass, including the whole P0-1 no-hidden-state contract for the remaining four `Reveal` consumers.

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
[1/5] analyze client references...
[2/5] analyze server references...
[3/5] build rsc environment...
[4/5] build client environment...
[5/5] build ssr environment...

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

Succeeds cleanly. Route table unchanged from the P0 baseline — this task added no route.

# GIT

Two commits, in order, neither amended, neither pushed:

```
a9e68480e08771d9accbfff4e7c73fb34d0f9c44  feat(home): implement frozen Evaluation Assurance V2.1
   8 files changed, 732 insertions(+), 150 deletions(-)

<REPORT COMMIT SHA — recorded in the parent session's hand-back>
   docs: record Evaluation Assurance V2.1 implementation
   1 file changed — this report only
```

`git diff --check` was clean before staging. Files were staged individually by name; `git add -A` was never used. `git status --short` is clean after both commits.

# PRODUCTION SAFETY

- No push. No deploy. No `wrangler deploy`, no `vinext-cloudflare deploy`.
- No `--remote` D1 command. The only database commands run were `npx wrangler d1 migrations apply ahanassa-public --local` and `... ahanassa-ops --local`, plus one `d1 execute --local` that inserted three throwaway catalog fixture rows so the Product Showcase would render above the new section for the ordering check. All of it lives in this worktree's gitignored `.wrangler/` state, never leaves the machine, and touches no staging or production database.
- Those fixture rows are obviously synthetic (`intro: "local verification fixture"`) and exist only in local sandbox state. No fabricated catalog data entered the repository, the content modules, or any commit.
- No network call to `odoo.ahanassa.com` or any external endpoint.
- No secret, credential, or environment variable was read, logged, or exposed.
- Dev server started on port 3000 (after confirming no port conflict) and **stopped** at the end; port 3000 verified free. The browser tab opened for verification was **closed**.
- Frozen artifacts untouched: Header V2.2, Hero V2.4, Product Showcase V2.0, Price Strip (still disabled), shared Button V1.0. No `01-sources/`, `logo/`, `design-reference/`, `wrangler.jsonc`, or migration file was modified. No migration was created.

# REMAINING RISKS

1. **The desktop 40/60 layout has never been seen rendered.** The sandbox window would not resize past ~407 CSS px, so the `lg` two-column split is verified only by reading the compiled CSS (`@media (width >= 64rem)` + `col-span-5`/`col-span-7`/`grid-cols-12`). The rules are unambiguous and the arithmetic is exact, but a human should eyeball 1024/1280/1440 in FA, EN, and AR before EA-P2 freeze — particularly for §28's concerns about narrow measure and orphaned headings in the 41.7%-wide intro column.
2. **JS-off is proven by construction, not by a real no-JS browser.** The section ships no JS and the stylesheet contains no rule that can hide it, which is a stronger position than the Showcase had — but no browser with scripting genuinely disabled was used, because this sandbox offers no such toggle.
3. **Zoom was exercised via `documentElement.style.zoom`, not native browser zoom.** Behavior is expected to be equivalent for reflow purposes, but it is a proxy.
4. **`SectionHeading` is not used here.** That is deliberate and justified (see COMPONENT ARCHITECTURE), but it means the Homepage now has two heading idioms: `SectionHeading` for eyebrow-bearing sections, and a bare `<h2 id>` for Price Strip and Evaluation/Assurance. If a future task wants one idiom, the clean fix is making `SectionHeading.eyebrow` optional — which touches a shared component and should be its own scoped change, not a side effect of this one.
5. **`/images/ops/inspection.png` is now unreferenced** but intentionally retained. Harmless; flagged only so a future asset audit is not surprised.
6. **`hero-frozen-spec-invariants.test.ts:165` still names `assurance.tsx`** in an assertion message. Cosmetic staleness in a frozen-spec test file, left untouched on purpose.
7. **The "what we do" narrative now has no Homepage home** (see OWNER DECISION). Believed intended; worth one explicit owner confirmation.
8. **Purchase Process `گزینه‌های تأمین قابل‌اتکا` remains live** on the Homepage — a §12-named phrase in an adjacent, out-of-scope section, still open from the P0 audit.

# READY FOR FREEZE

**YES.** Every gate in V2.1 §47's Final Acceptance Matrix is satisfied, and every one is backed by either an executable test, a live browser observation, or an explicitly-labelled CSS reading. The recommended next step is the separate Purchase Process component freeze the spec's §51 names, plus a human pass over the desktop breakpoints listed under REMAINING RISKS.
