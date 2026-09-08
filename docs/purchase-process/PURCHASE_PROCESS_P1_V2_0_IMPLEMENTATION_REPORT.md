# Purchase Process — PP-P1 V2.0 Implementation Report

**Task:** PP-P1 — implement `AHANASSA_PURCHASE_PROCESS_FINAL_FROZEN_V2.0.md` on the Homepage, retiring the legacy six-stage model.
**Scope:** Real runtime code change (component + content + tests). No database, Odoo, RFQ, or deployment change.

```text
PURCHASE PROCESS AUTHORITY: V2.0
COMPONENT: components/home/process.tsx (rewritten)
H2: FROZEN FA / OWNER-APPROVED EN / OWNER-APPROVED AR
SUPPORTING PARAGRAPH: REMOVED
STEP COUNT: EXACTLY 4 (all locales)
CTA: REMOVED
EVALUATION DUPLICATION: REMOVED
PROCUREMENT THEATER: REMOVED
DESKTOP: CONNECTED HORIZONTAL TIMELINE (>= 1024px)
NARROW: CONNECTED VERTICAL TIMELINE (< 1024px)
INTERMEDIATE 2x2: STRUCTURALLY IMPOSSIBLE
SEMANTICS: OL / LI / H3 / SINGLE P
INDEXES: LOCALE-SCRIPTED, TABULAR-NUMS, ARIA-HIDDEN
CONNECTOR: PRESENT, STATIC, NEVER ANIMATED
ICONS: ABSENT     IMAGES: ABSENT
FAKE LIVE PROGRESS: ABSENT
DEDICATED JS: NONE
ODOO / DB_PUBLIC / RFQ DEPENDENCY: ABSENT
TESTS: 1034 PASS / 0 FAIL     TSC: 0 ERRORS     BUILD: SUCCEEDED
```

---

# RESULT

**A. PURCHASE PROCESS V2.0 IMPLEMENTED — LEGACY 6-STEP MODEL RETIRED (FROM THE HOMEPAGE) — READY FOR FREEZE**

Every frozen V2.0 gate is met by the Homepage component, and every P1 finding from the PP-P0 audit is resolved. One residual is recorded honestly and is **out of this task's authorised scope**: the legacy six-stage copy object still exists in `lib/content/homepage.ts` and is still rendered by `/services` and `/contact`. The Homepage no longer reads a single field of it. See **CONTENT OWNERSHIP DECISION** and **RESIDUAL / NEXT PHASE** below — this is a deliberate, documented decision, not an oversight.

---

# PREFLIGHT

- Working directory: `/Users/reza/Developer/ahanassa-website/.claude/worktrees/purchase-process-p1`
- Branch: `worktree-purchase-process-p1`
- **No write-isolation guard, permission denial, or tool safety refusal was encountered at any point.** Every file change in this task used the normal `Write`/`Edit` tools directly. No Bash/Python/heredoc side-channel was used for any write, and no settings or configuration file was modified.

# BASE SHA

`ac06b8dbfa4915fc6af3b3411d5130b5e30b965a` — the PP-P0 audit report commit, confirmed clean before work began.

# AUTHORITIES READ

- `docs/purchase-process/AHANASSA_PURCHASE_PROCESS_FINAL_FROZEN_V2.0.md` — all 41 sections.
- `docs/purchase-process/PURCHASE_PROCESS_P0_CURRENT_IMPLEMENTATION_AUDIT.md` — full audit, in particular PP-P1 IMPLEMENTATION BOUNDARY, FILES TO CREATE/MODIFY/REMOVE, P1 FINDINGS, DOCUMENT INTERNAL CONSISTENCY NOTES.
- Current code: `components/home/process.tsx`, `app/[locale]/page.tsx`, `lib/content/homepage.ts`, `components/home/evaluation-assurance.tsx`, `lib/content/evaluation-assurance.ts`, `components/ui/reveal.tsx`, `components/ui/section-heading.tsx`, `styles/tokens.css`, `styles/theme-extensions.css`.

# SPEC INTERNAL CONSISTENCY — HOW THE TWO KNOWN TENSIONS WERE APPLIED

Both were re-read in the source document and applied exactly as the P0 audit resolved them:

- **Supporting paragraph.** §5 (`H2 -> 4-step process`) and §39 ("Supporting paragraph | None by default") control over §17's illustrative `<p>` in a markup snippet. **No supporting paragraph is rendered in any locale**, and the content model has no field for one.
- **Step 04 title.** §10, §37 and §39 all freeze `تأیید و پیگیری سفارش`; §18's informal mobile mock-up line says `تأیید و اجرا`. The normative sections win. Pinned by a dedicated test that asserts the frozen title AND asserts the mock-up variant is not used.

---

# WHAT CHANGED, PER P0 P1 FINDING

| # | P0 P1 finding | Resolution |
|---|---|---|
| 1 | Wrong step count/model (6 steps, `input`/`activity`/`output`) | Exactly 4 steps (§6), each a `title` + one `body` sentence. The tri-partite internal-SOP framing is gone. |
| 2 | Wrong H2 | Frozen FA H2 `از ارسال درخواست تا خرید چه اتفاقی می‌افتد؟` (§4), verified byte-for-byte against the spec file. |
| 3 | Supporting paragraph present | Removed; no `body`/`subtitle` field exists on the content model (§5/§39). |
| 4 | CTA present | Removed, along with the `next/link` and `localizedPath` imports (§23 "CTA = none"). |
| 5 | Procurement theater / supplier emphasis | The retired "ارزیابی تأمین" (comparing sourcing options) and "هماهنگی تأمین و تحویل" (supplier communication) steps do not exist in the four-step model (§12/§13). |
| 6 | Evaluation/Assurance duplication | No grade/standard/documentation/sourcing-feasibility/payment-term/Incoterm/delivery-criteria language appears; enforced by a test over all three locales (§8.3). |
| 7 | Wrong visual architecture incl. forbidden 2×2 | Replaced by a connected timeline; the 2×2 is now structurally impossible — see **2×2 PROHIBITION** below. |
| 8 | Missing/incorrect semantic details | `aria-labelledby` added; index is `aria-hidden` + locale-scripted + `tabular-nums`; `<dl>` replaced by a single `<p>` per step. |
| 9 | EN/AR localization gap (the P0 blocker) | Resolved by owner-supplied approved EN/AR copy, inserted verbatim. |

---

# VISUAL ARCHITECTURE

Desktop (`>= 1024px`) renders a connected horizontal 4-step timeline; below that, a connected vertical 4-step timeline. Both come from one markup tree:

- `<ol className="mt-14 flex flex-col lg:mt-16 lg:flex-row">`
- each `<li>` is `flex` (rail beside content) when narrow, `lg:flex-col lg:flex-1` (rail above content, four equal columns) at `lg`
- the rail is `flex-col` (index above the vertical rule) when narrow, `lg:flex-row` (index beside the horizontal rule) at `lg`

`lg` compiles to `@media (min-width: 64rem)` = 1024px — confirmed by reading the compiled stylesheet, not assumed. §19 ties the collapse point to actual content fit: at the 80rem container each of the four desktop columns is roughly 215px, which holds the longest FA/AR step copy in about four lines, whereas a 4-up row at tablet width would compress them past readability.

No card, border-box, shadow, icon tile, or decorative box is used (§15/§20). The surface is `bg-background` (clean white) with `text-navy` typography and restrained copper markers/connector, deliberately contrasting the warm-cream Evaluation/Assurance section directly above it (§20).

# 2×2 PROHIBITION — THE PRIMARY REGRESSION GATE

This is proven structurally, not by sampling viewport widths:

1. The `<ol>`'s exact class tokens are `mt-14 flex flex-col lg:mt-16 lg:flex-row` — read out of the server-rendered HTML.
2. It carries **no** class that sets `flex-wrap`. The only `flex-wrap` rules in the compiled stylesheet are `.flex-wrap`, `.sm\:flex-wrap` and `.aa-showcase-grid`, none of which the `<ol>` carries.
3. The only bare-element rule for `ol` in the compiled stylesheet is `ol,ul,menu{list-style:none}`, which sets no `flex-wrap`.
4. Therefore `flex-wrap` keeps its CSS initial value `nowrap`, and **a nowrap flex container has exactly one flex line by definition**.

Consequently: below 1024px the list is one column × four rows; at/above 1024px it is four columns × one row. **A 2×2 (or any 2×N) state is not representable at any viewport width.** No `grid`/`grid-cols-*` utility appears anywhere in the component, which is how the retired implementation produced the forbidden `sm:grid-cols-2` state.

# CONNECTOR

A 1px copper rule (`bg-copper/40`) rendered as an `aria-hidden` `<span>`: vertical (`w-px flex-1`) below each index when narrow, horizontal (`lg:h-px lg:w-auto`, inset by the logical `lg:ms-4`) beside it on desktop. Because it spans each item's full extent, it meets the next item's index with no visual break.

It is rendered for steps 01–03 only, so the line terminates on step 04 rather than trailing off — confirmed in the rendered HTML (exactly three connector spans per locale).

It is **static**: no `animation`, `transition`, `duration`, or easing utility is present, and a test asserts none can be added. There is no "current step", "completed", `aria-current`, progress bar, or checkmark styling anywhere (§21/§22/§38.5/§38.6). Chronology is additionally carried by DOM order, the `<ol>`, and the visible numbers, so the section still reads correctly if the connector's colour is not perceived at all (§31).

# SEMANTIC HTML

```text
<section id="process" aria-labelledby="home-purchase-process-heading">
  <h2 id="home-purchase-process-heading">…</h2>
  <ol>
    <li> <span aria-hidden="true">۰۱</span> <span aria-hidden="true"/>connector  <h3>…</h3> <p>…</p> </li>
    … ×4
  </ol>
</section>
```

`<ol>`, never `<ul>` (§17). This is the deliberate **inverse** of `components/home/evaluation-assurance.tsx`, whose axes are non-chronological criteria and therefore use `<ul>`. A test asserts both halves of that contract: Process must contain `<ol>` and no `<ul>`; Evaluation/Assurance must keep `<ul>` and must never gain an `<ol>`.

No `SectionHeading` is used. Its `eyebrow` prop is required (verified in its current signature), no eyebrow copy is approved, and every natural Persian candidate sits on §4's forbidden list — so a bare `<h2 id>` pointed at by `aria-labelledby` is used, the same shape `evaluation-assurance.tsx` and `price-strip.tsx` already use on this page. `id="process"` is retained so any existing deep link to `/fa#process` does not regress.

# INDEX / DIGIT POLICY, AND THE REUSE-VS-EXTRACT DECISION

Indexes are derived per locale at render time via `purchaseStepIndex(locale, i)` in the new `lib/content/purchase-process.ts` — FA `۰۱–۰۴`, AR `٠١–٠٤`, EN `01–04`, always `aria-hidden="true"` and `tabular-nums`, never stored as literal digits in the content module (§32).

**Decision: neither (a) import `evaluationAxisIndex` as-is, nor (b) extract a shared `locale-index.ts` — but a third option: a new sibling module following the pattern this repository has already set twice.** Justification:

- `lib/content/evaluation-assurance.ts` **already documents this exact trade-off** for the identical situation: "`lib/pricing/price-strip-presentation.ts` has an equivalent private map, but the Price Strip is a frozen component and is deliberately NOT refactored to share this one — a second small pure constant is cheaper than reopening a frozen file." Evaluation/Assurance V2.1 is likewise frozen. Following the repository's own established convention beats inventing a new one.
- Option (a) is semantically wrong: importing a function named `evaluationAxisIndex` into the Process component would couple two components whose specs (§3, §16) go out of their way to separate, and whose doc-comments assert **opposite** meanings — Evaluation's says the numbers "do not imply chronological order", Process's §16 says they represent real order. A single shared function would have to document both at once.
- Option (b) would have meant editing `lib/content/evaluation-assurance.ts`, a frozen component's content module, for a four-line pure function.

**Consequently `lib/content/evaluation-assurance.ts` was NOT modified**, and the frozen Evaluation/Assurance component and its 43 tests are untouched and passing. The cost of the duplication is bounded and pinned: a test asserts `purchaseStepIndex` and `evaluationAxisIndex` agree digit-for-digit across all three locales and all four indexes, so the two copies cannot silently drift.

# CONTENT OWNERSHIP DECISION — AND A GENUINE SURPRISE THE P0 AUDIT MISSED

The P0 audit's PP-P1 boundary assumed the `process` field of `HomepageCopy` could simply be reshaped. **It cannot.** `homepageCopy[locale].process` has two consumers besides the Homepage:

- `app/[locale]/services/page.tsx:26` — renders `process.eyebrow`, `process.title`, `process.body` through `SectionHeading`, plus `process.steps[].activity`.
- `app/[locale]/contact/page.tsx:69` — renders `process.steps.slice(0, 3)` with `step.title` and `step.activity` as its "next steps" list.

Reshaping `process` to the frozen `{ title, steps: [{title, body}] }` would break both at compile time. Repairing `/services` would have required either **inventing an eyebrow and supporting paragraph** (prohibited — no approved copy exists, and every natural candidate is on §4's forbidden list) or **restructuring the `/services` page**, which this task is explicitly not authorised to do.

**Decision: additive, not destructive.**

- Added a new `purchaseProcess: { title, steps: { title, body }[] }` field — exactly `title` + `steps`, no `eyebrow`, no `body`, no `cta`, exactly four steps — consumed only by `components/home/process.tsx`. Its shape follows the sibling `evaluationAssurance` field's structural pattern.
- Left the legacy `process` field byte-for-byte unchanged, with a doc-comment stating that it is NOT the Homepage Purchase Process, that it survives only for `/services` and `/contact`, that it is out of V2.0's scope, and that its sourcing-comparison and supplier-communication wording must never be reintroduced on the Homepage.

The Homepage therefore renders none of the retired six-stage model — verified in the server-rendered HTML of all three locales. Nothing about `/services` or `/contact` changed; both were re-verified as HTTP 200 with their content unchanged.

# FA / EN / AR CONTENT — PINNED VERBATIM

All nine Persian strings were verified **programmatically, character-for-character, against the imported frozen spec document itself** before use, and that cross-check is also encoded as a permanent test ("every pinned Persian string appears verbatim in the imported frozen spec").

**FA (frozen):**

- H2: `از ارسال درخواست تا خرید چه اتفاقی می‌افتد؟`
- 01 `ارسال درخواست` / `لیست خرید یا مشخصات نیاز خود را ارسال می‌کنید.`
- 02 `بررسی درخواست` / `درخواست بررسی می‌شود و اگر اطلاعاتی برای تکمیل آن لازم باشد، با شما هماهنگ می‌کنیم.`
- 03 `دریافت پیشنهاد` / `پیشنهاد و شرایط مرتبط برای بررسی و تصمیم‌گیری شما ارائه می‌شود.`
- 04 `تأیید و پیگیری سفارش` / `پس از تأیید پیشنهاد، سفارش بر اساس شرایط توافق‌شده وارد مرحله اجرا و پیگیری می‌شود.`

**EN (owner-approved, inserted exactly as supplied):**

- H2: `What happens from request submission through to purchase?`
- 01 `Submit a request` / `You send your purchase list or the specifications of what you need.`
- 02 `Request review` / `We review your request and, if any information is needed to complete it, we coordinate with you.`
- 03 `Receive a proposal` / `A proposal and the related terms are presented for your review and decision.`
- 04 `Approval and order follow-up` / `After you approve the proposal, the order moves into execution and follow-up based on the agreed terms.`

**AR (owner-approved, inserted exactly as supplied):**

- H2: `ماذا يحدث من إرسال الطلب حتى الشراء؟`
- 01 `إرسال الطلب` / `ترسل قائمة مشترياتك أو مواصفات احتياجك.`
- 02 `مراجعة الطلب` / `تتم مراجعة طلبك، وإذا كانت هناك معلومات لازمة لاستكماله، نتواصل معك لاستكمالها.`
- 03 `استلام العرض` / `يُقدَّم لك العرض والشروط المرتبطة به لمراجعته واتخاذ القرار.`
- 04 `التأكيد ومتابعة الطلب` / `بعد تأكيدك للعرض، ينتقل الطلب إلى مرحلة التنفيذ والمتابعة وفقًا للشروط المتفق عليها.`

No supporting paragraph and no CTA exist in any locale. Nothing was paraphrased, strengthened, or invented.

# RTL / LTR

One shared, direction-aware implementation (§33). Every axis-sensitive utility is logical rather than physical: flex direction, `gap-*`, `ms-4`, `pe-8`. A test asserts the component contains no `ml-`/`mr-`/`pl-`/`pr-`/`left-`/`right-`/`border-l`/`border-r`/`text-left`/`text-right`, and no `rtl:`/`ltr:` mirrored variant. FA/AR therefore lay the horizontal timeline out right-to-left and EN left-to-right from identical markup, with step 01 at the reading-start edge in every locale. There is no per-locale component.

# CLAIM SAFETY

The approved copy contains no prohibited claim, and this is enforced permanently:

- A test scans all three locales for best/lowest price, cheapest, guarantee/guaranteed, risk-free, trusted/approved/vetted supplier, factory-direct, no-middleman, 24/7, dedicated account manager, within-24-hours, and the FA/AR equivalents.
- A second test asserts **no bare numeral appears anywhere** in this copy, closing off timing/SLA claims at the character level (§26/§38.11).
- A third test forbids claiming unavailable request-input capabilities — OCR, voice, drawing interpretation, Excel/PDF extraction (§7.3).
- A fourth asserts no prohibited claim is hardcoded in the component source.
- A fifth asserts the customer-approval-before-execution gate is preserved: step 04 is conditioned on the customer approving the proposal in all three locales (§11/§38.9).
- A sixth asserts the component holds no literal user-facing text of its own — every rendered value is an expression from the localized content module.

# DATA DEPENDENCY — STILL ZERO

Confirmed by test and by source inspection: no `cloudflare:workers`, `DB_PUBLIC`, `DB_OPS`, Odoo, `@/lib/catalog`, `@/lib/pricing`, `@/lib/processing`, RFQ state, projection read, or client fetch. The component's imports are exactly three — `@/config/locales`, `@/lib/content/homepage`, `@/lib/content/purchase-process` — pinned by a `deepEqual` assertion, none of which can perform I/O. There is no `return null`, so the section has no data-driven omission path (§27/§29).

No migration was created or applied against any remote environment. No `DB_PUBLIC` schema, Odoo adapter, Processing Projection, or RFQ architecture was touched.

# MOTION / FAILURE BEHAVIOR

`Reveal` was removed entirely (§28 "0 dedicated interaction JS", §21 "Motion is optional"), matching the choice `evaluation-assurance.tsx` already made. SSR, JS-off, and `prefers-reduced-motion` are therefore the identical render — there is no enhancement that can fail. The section carries zero hiding utilities (verified: 0 of 31 class attributes contain `hidden`/`sr-only`/`invisible`/`opacity-0`), carries no `reveal` class and no `data-reveal` attribute, and needs no `<noscript>` duplicate.

Because `components/home/process.tsx` is no longer a `Reveal` consumer, the factual consumer inventory in `lib/catalog/homepage-progressive-enhancement.test.ts` was updated to match reality (verified by grep: the remaining consumers are `product-showcase.tsx`, `reach.tsx`, `services/page.tsx`). This was a test-fact correction, not a weakening: a comment records why Process is absent, and the new test file asserts Process must **not** import `Reveal`.

---

# FILES CREATED

- `lib/content/purchase-process.ts` — `PURCHASE_STEP_COUNT` and `purchaseStepIndex()`.
- `lib/content/purchase-process-frozen-spec-invariants.test.ts` — 50 tests.
- `docs/purchase-process/PURCHASE_PROCESS_P1_V2_0_IMPLEMENTATION_REPORT.md` — this report.

# FILES MODIFIED

- `components/home/process.tsx` — full rewrite.
- `lib/content/homepage.ts` — added `purchaseProcess` (interface + fa/en/ar); documented the retained legacy `process` field.
- `lib/catalog/homepage-progressive-enhancement.test.ts` — Reveal consumer inventory corrected.

# FILES REMOVED

None.

# FILES DELIBERATELY NOT TOUCHED

`app/[locale]/page.tsx` — re-verified after the rewrite: the prop contract is unchanged (`<Process locale={locale} />`), so the call site needed no edit, exactly as the P0 audit predicted. Frozen components Header V2.2, Hero V2.4, Product Showcase V2.0, Evaluation/Assurance V2.1 (component **and** `lib/content/evaluation-assurance.ts`), Price Strip, and shared Button V1.0 are all untouched. `/services` and `/contact` are untouched.

---

# VALIDATION

| Check | Result |
|---|---|
| `npx tsc --noEmit` | **0 errors** |
| `npm test` | **1034 tests, 1034 pass, 0 fail, 0 cancelled, 0 skipped, 0 todo** |
| New test file alone | **50 tests, 50 pass, 0 fail** |
| Baseline reconciliation | 984 pre-existing + 50 new = 1034. No pre-existing test was deleted or weakened. |
| `npm run build` (`vinext build`) | **succeeded** — all 5 build stages, route manifest lists `/:locale` |
| `git diff --check` | clean |

One pre-existing test failed on first run and was fixed by correcting a factual inventory, not by relaxing an assertion: `homepage-progressive-enhancement.test.ts` hardcoded `components/home/process.tsx` as a `Reveal` consumer, which §28 makes false.

---

# VERIFICATION METHOD — LIVE-OBSERVED vs. CODE/CSS READING ONLY

**The Claude-in-Chrome browser extension was NOT connected in this session** (`tabs_context_mcp` returned "Browser extension is not connected"), exactly as in the PP-P0 audit. **No live browser rendering, no screenshot, no viewport resize, and no live accessibility-tree read was performed.** Nothing below is a fabricated browser observation.

**Verified against a REAL RUNNING SERVER (dev server on `localhost:3100`, `curl`, executing no JavaScript):**

- FA, EN and AR homepages return 200 and contain the new H2 and all four step titles and bodies in the raw server-rendered HTML.
- The Process section renders in the correct position, after Evaluation/Assurance.
- Per locale, exactly one `<ol>`, four `<li>`, four `<h3>`, four `<p>`, zero `<ul>`, zero `<dl>/<dt>/<dd>`.
- Zero `<a>`, `<button>`, `href`, `<svg>`, `<img>` inside the section — no CTA, no icon, no image.
- Zero `grid-cols` on the section.
- Exactly three connector spans per locale (none after step 04).
- `aria-labelledby="home-purchase-process-heading"` present and matching the `<h2 id>`.
- Correct locale digits rendered inside `aria-hidden="true"` spans carrying `tabular-nums`: FA `۰۱–۰۴`, AR `٠١–٠٤`, EN `01–04`.
- The retired six-step content is **absent** from all three homepages — checked for `ارزیابی تأمین`, `تأیید خرید`, `هماهنگی تأمین و تحویل`, `روند خرید`, `در شش مرحله`, `Sourcing evaluation`, `Purchase confirmation`, `Sourcing & delivery coordination`, `in six stages`, `تقييم التوريد`, `تأكيد الشراء`, `تنسيق التوريد والتسليم`, `في ست مراحل`.
- `/fa/services`, `/fa/contact`, `/en/services` all still return 200 with their legacy content intact.
- **JS-off proof:** `curl` never executes JavaScript, so the presence of all four steps in the raw response body is direct evidence. Reinforced by inspecting the section's 31 class attributes — **none** contains `hidden`, `sr-only`, `invisible`, or `opacity-0` — and by confirming the section carries no `reveal` class and no `data-reveal` attribute, so no hiding rule in the compiled stylesheet can apply to it.

**Verified by reading the COMPILED STYLESHEET (`dist/client/_next/static/css/index.D90Aa8_k.css`), not by observing a rendered viewport:**

- `lg` compiles to `@media (min-width: 64rem)` = 1024px.
- `.flex-col{flex-direction:column}` and `.lg\:flex-row{flex-direction:row}` both compile.
- `.group-last\/step\:pb-0:is(:where(.group\/step):last-child *){padding-bottom:0}` compiles, so the final step drops its trailing spacing.
- `.lg\:ms-4{margin-inline-start:…}`, `.lg\:h-px{height:1px}`, `.lg\:w-auto{width:auto}` all compile.
- The `flex-wrap` analysis underpinning the 2×2 proof above.

**NOT verified — residual gaps, stated plainly:**

- No live screenshot at any viewport width. The "no 2×2" claim rests on the structural CSS argument above (a nowrap flex container has exactly one line), which is a stronger guarantee than sampling widths, but it is **not** a visual observation.
- Actual rendered contrast ratios were not measured. The component reuses only existing in-production tokens (`text-navy`, `text-muted-foreground`, `text-copper`, `bg-background`) already relied on by Evaluation/Assurance and Product Showcase; no new colour was introduced.
- Text reflow at 200% zoom, real RTL glyph layout, and the absence of clipped labels or overlapping connectors were not visually confirmed. No `overflow-x` utility and no fixed-pixel width exists on the section, and `min-w-0` on each step guards against flex overflow, but this is source-level reasoning.
- The accessibility structure was confirmed from the **server-rendered DOM**, not from a live accessibility tree.

# CLEAN-UP

The dev server started for this verification (port 3100, chosen to avoid a conflict with another worktree already holding port 3000) was stopped; port 3100 confirmed free afterwards. No browser tab was opened, because no browser session was available. `tsconfig.tsbuildinfo`, which `tsc` touches as a tracked incremental-build cache, was reverted before committing, following the PP-P0 audit's precedent.

# PRODUCTION SAFETY

No production or staging system was touched. **No push, no deploy, no remote D1 migration.** D1 migrations were applied with `--local` only (`ahanassa-public`, `ahanassa-ops`), against the local emulator state in this worktree; `--remote` was never used. No Odoo call, no queue write, no `DB_PUBLIC` change, no schema migration authored.

# GIT

- Runtime commit: `e38fadb8760fa99657d05966207b83442b3610e1` — "feat(home): implement frozen Purchase Process V2.0" (5 files).
- Report commit: this file, committed alone immediately after. Neither commit was amended; neither was pushed.

---

# RESIDUAL / NEXT PHASE

**Residual (recorded, not resolved here):** the legacy six-stage narrative still ships on `/services` and `/contact`. Its sourcing-comparison and supplier-communication wording is exactly what V2.0 §12/§13 forbid **on the Homepage**; those two pages have no frozen spec of their own, and repairing them needs owner-approved copy (`/services` in particular needs an eyebrow and supporting paragraph, which cannot be invented). A guard test pins the coupling so it stays visible.

**Recommended next phase: PP-P2 — an independent final freeze gate for Purchase Process V2.0**, mirroring the Evaluation/Assurance arc's own P2 pattern: re-audit this implementation against all 41 sections and both acceptance matrices, and close the live-browser verification gap above (responsive screenshots at 320/360/375/390/430/768/1024/1280/1440px in FA/AR/EN, measured contrast, 200% zoom reflow) if a working browser session is available at that time.

**Separately recommended:** a small, owner-gated task to give `/services` and `/contact` their own approved copy so the legacy `process` field can be retired outright.
