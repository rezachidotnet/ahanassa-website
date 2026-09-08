# Purchase Process — PP-P0 Current Implementation Audit

**Task:** PP-P0 — import `AHANASSA_PURCHASE_PROCESS_FINAL_FROZEN_V2.0.md` and audit the current homepage Purchase Process implementation against it.
**Scope:** Read-only audit. No runtime code changes were made in this phase.

```text
PURCHASE PROCESS AUTHORITY: V2.0
CURRENT PROCESS COMPONENT: components/home/process.tsx
SUPPORTING PARAGRAPH: PRESENT
EXACT FOUR STEPS: FAIL
CUSTOMER APPROVAL BEFORE EXECUTION: PASS
EVALUATION DUPLICATION: PRESENT
DESKTOP: OTHER
INTERMEDIATE 2×2: PRESENT
MOBILE: OTHER
SEMANTICS: OL
CTA: PRESENT
ICONS: ABSENT
IMAGES: ABSENT
FAKE LIVE PROGRESS: ABSENT
ODOO DEPENDENCY: ABSENT
DB_PUBLIC DEPENDENCY: ABSENT
CLIENT FETCH: ABSENT
FA: GAP
EN: GAP
AR: GAP
DB_PUBLIC CHANGE REQUIRED: NO
ODOO CHANGE REQUIRED: NO
RFQ ARCHITECTURE CHANGE REQUIRED: NO
PP-P1 READY: NO
```

---

# RESULT

**C. REQUIRES OWNER-APPROVED EN/AR LOCALIZATION BEFORE PP-P1** (with substantial targeted implementation gaps also present — see P1/P2 findings).

The frozen V2.0 spec's four-step FA copy, H2, and structural rules are unambiguous and directly implementable — none of the content/architecture gaps below require an owner decision on their own; they are ordinary catch-up work against an already-approved authority. What genuinely blocks full PP-P1 execution is that, unlike Evaluation/Assurance V2.1 (which embeds approved EN/AR "transcreations" in its own §33), Purchase Process V2.0 contains **no approved English or Arabic step copy at all** — only the Persian text plus English/Arabic used as the document's own analysis language. Implementing FA-only would leave EN/AR pages showing the old, now-inconsistent six-step content, or force this audit to invent translations, which is explicitly prohibited. PP-P1 for FA can, in principle, proceed once the owner explicitly accepts FA-only rollout or supplies/approves EN/AR copy — that decision is out of scope for this audit and is called out rather than assumed.

---

# PREFLIGHT

- Working directory: `/Users/reza/Developer/ahanassa-website/.claude/worktrees/purchase-process-p0`
- Branch: `worktree-purchase-process-p0`
- HEAD before this task: `70a99677ce02b386fea5d4f97702a8b5425acfa3` (clean working tree, confirmed via `git status --short`)
- No write-isolation guard, permission denial, or tool safety refusal was encountered at any point in this task. All writes used Read/Write/Edit/Bash `cp`/`mkdir` directly inside this worktree.

---

# BASE SHA

`70a99677ce02b386fea5d4f97702a8b5425acfa3` — "docs: freeze Evaluation Assurance V2.1"

---

# SPEC SOURCE

- File: `~/Downloads/AHANASSA_PURCHASE_PROCESS_FINAL_FROZEN_V2.0.md`
- Size: 21588 bytes (independently confirmed via `wc -c`)
- Source untouched after copy: confirmed present at the same path/size after the copy operation; only copied, never moved or deleted.

# SPEC SHA-256

`c2b232e42d5d74258474f28c41779872fb85949ed63fa31894e787432844a5da`

Independently computed via `shasum -a 256` on both:
- `~/Downloads/AHANASSA_PURCHASE_PROCESS_FINAL_FROZEN_V2.0.md`
- `docs/purchase-process/AHANASSA_PURCHASE_PROCESS_FINAL_FROZEN_V2.0.md`

Both hashes match exactly. No normalization, correction, or rewrite was applied.

# SPEC IMPORT COMMIT

`7fc912144c8da7b68a9d48517feab7fa50de995e` — "docs: import Purchase Process V2.0 frozen spec" (1 file changed, 1034 insertions, new file `docs/purchase-process/AHANASSA_PURCHASE_PROCESS_FINAL_FROZEN_V2.0.md`).

---

# CURRENT AUTHORITY

`docs/purchase-process/AHANASSA_PURCHASE_PROCESS_FINAL_FROZEN_V2.0.md` is now the sole authoritative Purchase Process specification, per `CLAUDE.md` §2 precedence and the frozen-spec pattern already established by Evaluation/Assurance V2.1, Product Showcase V2.0, Hero V2.4, and Header/Navigation V2.2. It supersedes any Purchase Process description implied by `01-sources/HOMEPAGE_SPEC.md` §12 (the six-stage model cited in the current component's own doc-comment) for this component specifically.

---

# DOCUMENT INTERNAL CONSISTENCY NOTES

Both tensions named in the task prompt were verified as real by reading the actual imported document (not assumed):

**A. Supporting paragraph (§5 / Final Acceptance Matrix §39 vs. §17 semantic-HTML example).**
§5 states plainly: "No separate supporting paragraph is used by default," with the frozen rule `H2 ↓ 4-step process` (not `H2 ↓ paragraph ↓ 4-step process`). §39's Final Acceptance Matrix repeats: "Supporting paragraph | None by default." However, §17's semantic-HTML example literally contains:
```html
<h2 id="purchase-process-heading">...</h2>
<p>...</p>
```
This is a genuine textual tension — confirmed at spec lines 476-479. Operational interpretation used in this audit (as instructed, not modifying the spec): **no supporting paragraph** — the explicit content rule (§5) and the Final Acceptance Matrix (§39, the later and more specific gate list) control over a generic illustrative markup snippet.

**B. Step 04 title (§10 vs. §18 mobile example).**
§10's heading, its "Preferred public copy" H3, and both Acceptance Matrices (§37, §39) all freeze Step 04 as **"تأیید و پیگیری سفارش"** (confirmed at spec lines 156, 246, 254, 904, 964). §18's mobile-layout illustration, however, lists the fourth item as "۰۴ — تأیید و اجرا" (spec line 521). Confirmed real. Operational implementation title used in this audit: **"تأیید و پیگیری سفارش"** — the repeatedly-frozen title in the normative sections and both acceptance matrices controls over one informal mobile-layout mockup line.

**No third inconsistency was found** inside the document itself on this reading. **One documentation-completeness gap relative to a sibling frozen spec was found and is reported below as an EN/AR readiness finding, not as a spec-internal inconsistency:** Evaluation/Assurance V2.1 embeds its own approved EN/AR "transcreations" (referenced as §33 in that spec, and confirmation in `lib/content/homepage.ts`'s doc-comment: "EN/AR are the approved transcreations (§33)"). Purchase Process V2.0 contains no equivalent EN/AR step-copy section anywhere in its 41 sections — only Persian content plus English used as the document's own analytical/descriptive language (e.g., "Customer question: How do I start?" is document narration, not site copy). This is a real absence, not a conflicting authority, so it did not trigger a stop — it is carried into the EN/AR readiness findings and the RESULT classification instead.

---

# CURRENT HOMEPAGE SEQUENCE

Traced `app/[locale]/page.tsx` (lines 92-104). Exact current render order:

```text
Hero
 ↓
PriceStrip
 ↓
ProductShowcase
 ↓
EvaluationAssurance   (exactly one instance, imported once, rendered once)
 ↓
Process               (components/home/process.tsx — the audited component)
 ↓
Reach                 (the "later conditional section")
 ↓
CtaBand               (the Final CTA)
```

This matches the frozen spec's §3 expected position (`Product Showcase ↓ Evaluation/Assurance ↓ Purchase Process ↓ Later conditional sections ↓ Final CTA`) exactly. `EvaluationAssurance` is confirmed as a single component instance immediately before `Process`, and is not modified by this audit. A pre-existing test (`lib/content/evaluation-assurance-frozen-spec-invariants.test.ts:123`, "Homepage order is Product Showcase -> Evaluation/Assurance -> Purchase Process (§2)") already asserts `evaluation < process` in `app/[locale]/page.tsx`'s source text — this passed in the full test run (see TESTS below) and was not modified.

---

# CURRENT COMPONENT

`components/home/process.tsx` — confirmed via `find components/home` and by tracing the `Process` import in `app/[locale]/page.tsx:11,98`. No other candidate component exists (no `purchase-process.tsx`, no duplicate).

Composition trace: `HomePage` → `<Process locale={locale} />` → `homepageCopy[locale].process` (from `lib/content/homepage.ts`) for all copy → `SectionHeading` (eyebrow/title/body) → `<ol>` of `Reveal`-wrapped `<li>` → `<Link>` (`next/link`) to `/contact` for a bottom CTA. No data dependency beyond the static content module; no icons or images are used.

---

# CURRENT CONTENT OWNERSHIP

`lib/content/homepage.ts`, the `process: { eyebrow, title, body, cta, steps: [{title, input, activity, output}] } }` field of `HomepageCopy`, populated per locale (`fa`/`en`/`ar`) in the exported `homepageCopy` object (lines 77-83 interface, 141-154 fa, 206-219 en, 271-283 ar). This is the same editorial-content module already used by Hero, Product Showcase, Evaluation/Assurance, Reach, and Price Strip — i.e., the correct architectural home for Process copy is already established; only its **shape** needs to change for PP-P1 (see FILES TO MODIFY).

---

# CURRENT DATA FLOW

```text
lib/content/homepage.ts (static, in-repo, locale-keyed object)
   ↓
components/home/process.tsx (Server Component, no "use client", no fetch)
   ↓
SSR/static HTML
```

Confirmed by source inspection (no `fetch`, no D1/Odoo import, no `env` usage in `process.tsx`) and confirmed live by curling the dev server (see SSR/JS-OFF below): the full six-step Persian content is present in the initial HTML response with no client-side data loading. This already satisfies the frozen spec's §27 data-boundary rule; the content **model** (6 stages, extra fields) is what's wrong, not the render/data architecture.

---

# FA CONTENT

Current (`lib/content/homepage.ts` fa.process):
- eyebrow: `"روند خرید"` — this exact string is one of five generic headings §4 explicitly names as forbidden for the **H2** ("روند خرید" heads that list). Here it is used as the eyebrow, not the H2 itself, but it is drawn from the same forbidden vocabulary and should not carry forward.
- title (renders as H2): `"از ارسال درخواست تا هماهنگی تحویل، در شش مرحله."` — does not match the frozen H2 at all.
- body (renders as supporting paragraph): `"هر مرحله یک ورودی مشخص از شما و یک خروجی مشخص از ما دارد."`
- cta: `"برای شروع چه اطلاعاتی لازم است؟"` (linked to `/contact`)
- 6 steps, each with `title`, `input`, `activity`, `output` (an internal-process input/activity/output framework, not the frozen `title` + `body` shape): ارسال درخواست, بررسی نیاز, ارزیابی تأمین, پیشنهاد و تصمیم, تأیید خرید, هماهنگی تأمین و تحویل.

All of the above was independently confirmed present in server-rendered HTML via `curl` against the local dev server (see SSR/JS-OFF).

# EN CONTENT

Current (`lib/content/homepage.ts` en.process): parallel 6-stage structure — "Purchasing process" / "From request to delivery coordination, in six stages." / "Every stage has a clear input from you and a clear output from us." / CTA "What information do I need to get started?" / steps: Request submission, Requirement review, Sourcing evaluation, Proposal & decision, Purchase confirmation, Sourcing & delivery coordination. Same structural mismatch as FA. No approved English copy for the frozen four-step model exists anywhere (see EN/AR READINESS).

# AR CONTENT

Current (`lib/content/homepage.ts` ar.process): parallel 6-stage Arabic structure (مسار الشراء / من إرسال الطلب إلى تنسيق التسليم، في ست مراحل. / etc.), same mismatch. No approved Arabic copy for the frozen four-step model exists anywhere.

---

# H2

**Required (spec §1, §4, §39):** `از ارسال درخواست تا خرید چه اتفاقی می‌افتد؟`

**Current:** `از ارسال درخواست تا هماهنگی تحویل، در شش مرحله.` — confirmed both in source (`lib/content/homepage.ts:143`) and in the live server-rendered `<h2>` (curl output). Does not match. **FAIL.**

---

# SUPPORTING PARAGRAPH

**Required (per the operational resolution of Consistency Note A above):** none by default.

**Current:** **PRESENT** — `"هر مرحله یک ورودی مشخص از شما و یک خروجی مشخص از ما دارد."`, rendered via `SectionHeading`'s `body` prop directly under the H2, confirmed live in the SSR HTML. This is exactly the class of "generic explanatory paragraph" §5 names as an example of what not to add (the spec's own illustrative example, «درخواست شما در چند گام روشن پیش می‌رود.», is different wording but the same category the current copy falls into). **Flagged for removal in PP-P1**, per the task's own §14 guidance.

---

# FOUR STEPS

**Required exactly (spec §6-§10, §37, §39 — independently re-verified against the actual imported document, not only the task prompt's restatement):**
1. ارسال درخواست — لیست خرید یا مشخصات نیاز خود را ارسال می‌کنید.
2. بررسی درخواست — درخواست بررسی می‌شود و اگر اطلاعاتی برای تکمیل آن لازم باشد، با شما هماهنگ می‌کنیم.
3. دریافت پیشنهاد — پیشنهاد و شرایط مرتبط برای بررسی و تصمیم‌گیری شما ارائه می‌شود.
4. تأیید و پیگیری سفارش — پس از تأیید پیشنهاد، سفارش بر اساس شرایط توافق‌شده وارد مرحله اجرا و پیگیری می‌شود.

These match the task prompt's restatement verbatim; confirmed against spec lines 172, 199, 228, 254.

**Current:** 6 steps, not 4. Step 1 title matches ("ارسال درخواست") but its body copy differs (current: "فاکتور، لیست خرید یا نیاز پروژه" framed as an `input` field, not a full sentence). Steps 2-6 do not correspond 1:1 to the frozen 4 steps — Step 3 ("ارزیابی تأمین" / sourcing evaluation with an explicit "مقایسه گزینه‌های تأمین" / comparing sourcing options activity) and Step 6 ("هماهنگی تأمین و تحویل" / sourcing & delivery coordination, naming "ارتباط با تأمین‌کننده" / supplier communication) have no equivalent in the frozen four-step model and actively violate its internal-procurement-theater and no-supplier-emphasis rules (see below). **FAIL.**

---

# CUSTOMER APPROVAL GATE

**Required (spec §11):** `Request ↓ Review ↓ Proposal ↓ Customer approval ↓ Execution`, never `Request ↓ Automatic purchase/order commitment`.

**Current:** Structurally preserved, despite the wrong step count. The 6-stage sequence is: Request → Requirement review → Sourcing evaluation → Proposal & decision → **Purchase confirmation (input: "your final approval")** → Sourcing & delivery coordination (execution). Step 5's `input` field is explicitly "تأیید نهایی شما" / "Your final approval" and its `output` is "شرایط خرید به‌صورت مکتوب تأیید می‌شود" (purchase terms confirmed in writing) — a genuine, explicit customer-approval checkpoint sits before the execution/coordination stage. Nothing in the current copy implies that submitting a request itself creates a purchase commitment. **PASS** on this specific, narrow gate — this is the one place the current implementation's underlying intent already agrees with the frozen spec, even though its step model and wording must still change.

---

# EVALUATION / PROCESS BOUNDARY

**Required (spec §8.3, §12, §35):** Process must not repeat Evaluation/Assurance's detailed criteria (grade, standard, technical documentation, sourcing feasibility, commercial terms, Incoterm, delivery checklist) and must not expose a comparison matrix.

**Current: PRESENT (duplication/leakage found).**
- Step 3, "ارزیابی تأمین" (Sourcing evaluation), with `activity`: "شناسایی و مقایسه گزینه‌های تأمین مناسب" (identifying and **comparing** suitable sourcing options) — this both (a) duplicates the conceptual territory of the Evaluation/Assurance axis "امکان تأمین" (Sourcing feasibility, `lib/content/homepage.ts:128-130`, `evaluationAssurance.axes[1]`) as a separate public-facing Process **step**, and (b) is precisely the "comparison matrix" pattern §12 says must not be exposed merely to look sophisticated.
- Step 6, "هماهنگی تأمین و تحویل", with `activity` naming "ارتباط با تأمین‌کننده" (supplier communication) — touches the same territory as the Evaluation/Assurance "تحویل" (Delivery) axis and separately violates the no-supplier-emphasis rule (see next section).

---

# INTERNAL PROCUREMENT THEATER

**Searched for:** supplier discovery, supplier RFQ, supplier comparison, manager approval, PO creation, accounting, warehouse receipt, invoice matching, Odoo states — in `components/home/process.tsx` and the `process` copy in `lib/content/homepage.ts` (all three locales).

**Found:**
- FA Step 3 activity: "شناسایی و مقایسه گزینه‌های تأمین مناسب" — supplier/sourcing-option comparison exposed publicly.
- FA Step 6 activity: "هماهنگی مستندات، ارتباط با تأمین‌کننده و نقاط عطف تحویل" — explicit "ارتباط با تأمین‌کننده" (supplier communication) and internal documentation coordination.
- EN/AR mirror both (e.g. EN: "Identifying and comparing suitable sourcing options"; "Coordinating documentation, supplier communication, and delivery milestones").
- The component's own `input` / `activity` / `output` tri-partite framing for all six steps is itself an internal-SOP style model (`labels.activity` literally renders as "اقدام آهن آسا" / "Ahan Asa's activity" per locale) — closer to an operational runbook than the frozen spec's plain "what happens, in what sequence" customer narrative.

No literal mentions of PO creation, accounting, warehouse receipt, invoice matching, or Odoo state names were found — those specific terms are absent. But supplier discovery/comparison and supplier communication are present, which the spec (§12, §13) forbids just as clearly. **PRESENT — flagged as a P1 finding.**

---

# CLAIM INTEGRITY

Searched `components/home/process.tsx` and the `process` copy (fa/en/ar) for: best/lowest price, guaranteed availability/delivery, quote/delivery-within-X-time, 24/7 support, dedicated account manager, approved/trusted suppliers, factory-direct, no-middleman, Ahan Asa-owned manufacturing/stock, and FA/AR equivalents.

**None found.** The current copy makes no SLA, ownership, or superlative claims. This is the one content-integrity dimension where the current implementation is already clean; no P0 claim-integrity finding for this component.

---

# REQUEST INPUT CLAIMS

Step 1 current copy names only "فاکتور، لیست خرید یا نیاز پروژه" (invoice, purchase list, or project requirement) / EN "Invoice, purchase list, or project requirement" / AR equivalent. No mention of photo OCR, voice RFQ, drawing interpretation, or Excel/PDF extraction anywhere in the Process content, and `CLAUDE.md` §7 confirms the only owner-confirmed primary-conversion input method is "ارسال فاکتور / لیست خرید" (invoice/BOM/material-list submission). **Compliant** with §7's request-input governance — no future-capability claim leaking into current public copy.

---

# VISUAL ARCHITECTURE

Current markup (`components/home/process.tsx:25`):
```html
<ol class="border-border mt-14 grid gap-px border-t border-s sm:grid-cols-2 lg:grid-cols-3">
```
No connector element of any kind exists — only `border-e`/`border-b` on each cell, producing a bordered grid/table look, not a chronological timeline. Breakpoints (Tailwind defaults: `sm`=640px, `lg`=1024px):
- `< 640px`: no `grid-cols-*` class applies — implicit single-column grid (steps stack vertically, each in its own bordered box, no connecting line).
- `640-1023px`: `grid-cols-2` — a 2-column grid of bordered boxes.
- `>= 1024px`: `grid-cols-3` — a 3-column, 2-row grid of bordered boxes.

Classification: **OTHER (bordered grid, not a timeline) at every breakpoint.**

---

# DESKTOP TIMELINE

**Required:** connected horizontal 4-step timeline.
**Current:** 3-column × 2-row bordered grid of 6 items at `lg`+ widths. No horizontal connector; no timeline reading direction. **FAIL — classified OTHER / GRID.**

---

# MOBILE TIMELINE

**Required:** connected vertical 4-step timeline, all steps visible, no swipe.
**Current:** below 640px, items stack in a single column (all 6 visible, no swipe/carousel — confirmed absent in source), but as a stack of individually bordered boxes with no connecting line communicating chronology. **Classified OTHER** — vertically stacked, but not a "vertical timeline" in the spec's sense (no connector).

---

# 2×2 PROHIBITION

**Required:** no 2×2 (or 2×N) intermediate grid state between the horizontal and vertical layouts.
**Current: PRESENT.** The `sm:grid-cols-2` breakpoint (640-1023px) renders a 2-column grid of the six step boxes — architecturally exactly the pattern §14 forbids, independent of the fact that there are 6 items here rather than 4.

---

# FOUR-CARD GRID PROHIBITION

**Required:** steps must not read as independent marketing cards; connector + typography + numbering should carry chronology, no border boxes/shadows/detached panels.
**Current: violated.** Each step is rendered as an individually bordered panel (`border-e border-b p-7`) inside a bordered grid — a "six-card grid" pattern, structurally the same class of layout §15 forbids for four steps. No shadows or hover states were found, but the bordered-panel/detached-cell treatment itself is the forbidden pattern.

---

# CONNECTOR

**Required:** a static connector communicating chronology; must never animate, fill, or show current/completed state.
**Current:** no connector element exists at all — only cell borders forming a grid. There is nothing to violate the animation rule (no connector to animate), but the spec's positive requirement (a connector that carries chronology) is also unmet. **Absent, not merely non-animated.**

---

# FAKE LIVE PROGRESS

Searched `components/home/process.tsx` and its copy for: completed, current, active, pending, progress, status, checkmark, green/completed-node styling, animated progress. **None found.** **ABSENT** — compliant with §22.

---

# INDEX POLICY

**Required:** locale-scripted zero-padded visible indexes (FA ۰۱-۰۴, AR ٠١-٠٤, EN 01-04), `aria-hidden="true"`, `tabular-nums`, semantic order carried by `<ol>` alone.

**Current:** the visible index is rendered as `String(i + 1).padStart(2, "0")` (`process.tsx:30`) — **always Western/Latin digits regardless of locale** (no `Intl.NumberFormat`/locale-numeral handling), and **not** marked `aria-hidden` — it sits inside the same flex row as the `<h3>` with no `aria-hidden` attribute, so assistive technology would read the raw "01" text as part of the heading row. Not `tabular-nums` either.

For PP-P1, `lib/content/evaluation-assurance.ts#evaluationAxisIndex(locale, index)` is a good reuse candidate: it is a small, generic, pure `Intl.NumberFormat`-based function (`minimumIntegerDigits: 2, useGrouping: false`) that already produces exactly the FA/AR/EN digit forms the Process spec requires (§32 matches Evaluation/Assurance's §20 digit policy verbatim). It is not axis-specific in mechanism, only in name and doc-comment. **Identified only, not implemented**: PP-P1 should either (a) import `evaluationAxisIndex` directly despite its name (cheapest, but semantically confusing for a non-axis caller), or (b) extract the same logic into a new, neutrally-named shared module (e.g. `lib/content/locale-index.ts`) used by both components, leaving the frozen `evaluation-assurance.tsx`/`.ts` files untouched (per this task's and the general scope-discipline rule against reopening frozen components). Option (b) is the cleaner long-term choice and does not require modifying any frozen file — `lib/content/evaluation-assurance.ts` would keep its own copy or re-export, decided at P1 time.

---

# SEMANTIC HTML

**Required:** `<section aria-labelledby>` → `<h2>` → `<ol>` → `<li>` → decorative `aria-hidden` index → `<h3>` → `<p>`.

**Current:**
- `<section id="process" ...>` with **no `aria-labelledby`** (uses a plain `id` for the anchor/scroll-target, not for heading association).
- `SectionHeading` renders the eyebrow/H2/body (not inspected line-by-line here since it's a shared, unmodified component — its `title` prop becomes the H2).
- `<ol>` is used (correct list type — matches spec's requirement that order is semantically meaningful, unlike Evaluation/Assurance's `<ul>`). **This one structural choice is already correct.**
- `<li>` (via `Reveal as="li"`) wraps each step — correct element.
- Index number: plain `<span>`, not `aria-hidden` (see INDEX POLICY above) — **incorrect**.
- `<h3>` step title — correct.
- Step body is **not** a single `<p>` — it's a `<dl>` with three `<dt>`/`<dd>` pairs (input/activity/output) — **does not match** the frozen `<h3>...</h3><p>...</p>` shape.

**Net: SEMANTICS classified OL** (the list type itself is right), but the surrounding structure (missing `aria-labelledby`, non-hidden index, `<dl>` instead of `<p>`) needs rework.

---

# RTL / LTR

`border-s`/`border-e` (logical start/end) are used for the grid borders, and `ms`/`me`-style logical spacing is the established pattern elsewhere on this page (e.g., Evaluation/Assurance). No locale-specific divergent markup was found in `process.tsx` — one shared component serves fa/en/ar. This part of the implementation approach is compliant in spirit; it will carry forward cleanly once the grid is replaced with a timeline, since the same logical-property discipline already exists in this component and its siblings.

---

# CTA / INTERACTION

**Required:** no CTA inside the component (§23); no accordion/tabs/carousel/modal/tap-to-reveal (§32 acceptance matrix).

**Current: CTA PRESENT.** A `<Link>` ("برای شروع چه اطلاعاتی لازم است؟" → `/contact`) renders below the step list (`process.tsx:52-54`). No accordion, tabs, carousel, or modal was found — the only interactive element is this one text-link CTA. **FAIL** on the CTA gate specifically; PASS on every other interaction-type prohibition.

---

# MOTION

`Reveal` is used (`process.tsx:27`, `as="li"`, `delay={i * 60}` per item). Confirmed via `components/ui/reveal.tsx`'s current doc-comment that this is the P0-1-fixed version: "THERE IS NO HIDDEN STATE, AT ANY POINT, IN ANY PHASE" — SSR baseline is fully visible, JS/IntersectionObserver/`prefers-reduced-motion` failures all degrade to visible, and an element already on-screen at mount is never animated. This satisfies the frozen spec's "one soft section reveal ... no animation prerequisite for reading" and reduced-motion requirements for the section-level entrance. With 6 items at 60ms each, the stagger runs up to ~300ms — not an egregious "long stagger," but it will shrink automatically to ~180ms (4 × 60ms) once the step count is corrected to 4 in PP-P1. There is no connector to animate (none exists), so the "connector must never animate" rule is trivially unviolated today, but only because there is no connector yet.

---

# DATA DEPENDENCY

Confirmed by source inspection: no Odoo API, no `Public Product Projection`, no `Public Processing Projection`, no RFQ live state, no client-side `fetch`, no order data. `components/home/process.tsx` imports only `homepageCopy` (static object) and shared UI/locale utilities. **Fully compliant with §27** — this is an editorial, SSR-only component today and requires no data-layer change in PP-P1.

---

# SSR

Confirmed live: `npm run dev` (vinext dev server on `localhost:3000`, after applying local D1 migrations for `ahanassa-public` and `ahanassa-ops` — both already present in this worktree and applied cleanly, no schema drift), then `curl` against `http://localhost:3000/fa` (and its 308 redirect chain from `/fa/`). The full six-step Persian content — H2 text, eyebrow, all six step titles, and the CTA text — is present verbatim in the raw HTML response, before any JavaScript executes. This is a `curl`-based, non-JS verification, not a live browser check (see "static vs. browser verification" note below).

# JS-OFF

Same `curl` evidence as SSR above stands in directly for a JS-off check: since `curl` never executes JavaScript, the presence of all six step titles/bodies and the H2 in the raw response body confirms the current component already satisfies "all steps remain visible without JS" and "no client fetch is required to render content" (§29). This property will carry forward once the content model changes to 4 steps.

---

# RESPONSIVE MATRIX

**Method disclosure:** the Claude-in-Chrome browser extension was not connected in this session (`tabs_context_mcp` returned "Browser extension is not connected"), so **no live browser rendering or viewport-resize verification was performed**. Everything below is **static/code-based verification** — reading the actual Tailwind breakpoint classes in `components/home/process.tsx` against Tailwind's default breakpoint table (`sm`=640px, `lg`=1024px) — not an observed render at 320/360/375/390/430/768/1024/1280/1440px. This matches the disclosed pattern from prior audits in this arc, where true viewport-width forcing has repeatedly been unavailable in this sandbox.

Derived (from source, not observed) breakpoint behavior:
- `< 640px` (320-599px band, covers 320/360/375/390/430): implicit 1-column grid — all 6 step boxes stacked vertically, no connector.
- `640-1023px` (covers a slice near 768px): `grid-cols-2` — 2-column × 3-row grid.
- `>= 1024px` (covers 1024/1280/1440): `grid-cols-3` — 3-column × 2-row grid.

No horizontal-overflow classes (`overflow-x-*`) were found, so horizontal document overflow is unlikely at any width, but this was not visually confirmed. **No breakpoint in the current implementation ever produces a horizontal-timeline-to-vertical-timeline collapse** — it is a grid at every width. This is a structural (code-level) fact, not something that requires a live browser to establish, but the *visual* claim ("no clipped labels," "no overlapping lines," actual measured collapse point) could not be independently confirmed without a working browser session.

# ZOOM / REFLOW

Not independently verified live (same browser-extension limitation as above). No `overflow: hidden` or fixed-pixel-width containers were found on the step content in source, which is favorable, but text-reflow-at-200%-zoom behavior was not observed.

---

# ACCESSIBILITY

- Section labelled by H2: **no** — `<section id="process">` has no `aria-labelledby` pointing at the H2's id (unlike Evaluation/Assurance's `aria-labelledby={HEADING_ID}` pattern).
- H2 present: yes (via `SectionHeading`), but wrong text (see H2).
- H3 per step: yes, correct.
- `<ol>`/`<li>`: yes, correct list type for a chronological sequence.
- Index `aria-hidden`: **no** — plain, non-hidden `<span>` (see INDEX POLICY).
- Chronology understandable without color: yes in principle (DOM order + numbering), though the numbering isn't hidden from AT, so screen-reader users currently hear a redundant "01" before each heading rather than relying on cleanly-hidden decoration plus true list order.
- Reading order: matches DOM order; no CSS reordering (`order-*`) was found.
- Zoom/text enlargement, horizontal scroll: not independently verified live (browser unavailable); no fixed-width/`overflow-x` red flags in source.
- No interaction required to access content: **mostly true**, except the CTA link — but a link is not itself a barrier to reading the four (six, currently) steps.
- Text contrast: uses the same shared design tokens (`text-navy`, `text-navy-600`, `text-muted-foreground`, `text-surface-2`) already relied on by Evaluation/Assurance and Product Showcase; not independently re-measured pixel-by-pixel in this audit, but inherited from an already-in-production token system rather than novel colors.

---

# PERFORMANCE

No images, no icons, no third-party libraries beyond the shared `Reveal` primitive (already used elsewhere on the page), no network calls. The only JS is `Reveal`'s `IntersectionObserver`-based entrance effect, already budgeted for and audited as part of Product Showcase/Evaluation-Assurance. No LCP/CLS/INP red flags found in source; not independently measured with real performance tooling in this audit (no live browser session).

---

# TEST COVERAGE

Searched for tests referencing "process" (filtering out unrelated hits like `lib/processing/*` — the catalog Processing-Group sync feature, an unrelated homonym — and Node's `process` global):

- **No dedicated test file exists** for `components/home/process.tsx` or for the `process` field of `lib/content/homepage.ts` (no `process*.test.ts` under `lib/content/` or `components/home/`, unlike Evaluation/Assurance's `lib/content/evaluation-assurance-frozen-spec-invariants.test.ts` and Hero's `hero-frozen-spec-invariants.test.ts`).
- One incidental assertion exists: `lib/content/evaluation-assurance-frozen-spec-invariants.test.ts:123`, `"Homepage order is Product Showcase -> Evaluation/Assurance -> Purchase Process (§2)"`, which greps `app/[locale]/page.tsx`'s source text for `<Process` and `<EvaluationAssurance` ordering. This passed in the full run and was not touched.
- `lib/content/hero-frozen-spec-invariants.test.ts:79` has a test titled "Process rail is a real semantic `<ol>`/`<li>` list..." — this is about the **Hero's** unrelated 4-item "process" summary rail (`homepageCopy.hero.process`, a different field), not the Purchase Process component. Noted to avoid false-positive attribution.
- No test covers current Process semantics, responsiveness, no-data-dependency, or claim integrity specifically. **No tests were added in this P0 phase**, per instructions.

---

# P0 FINDINGS

None. No finding in this audit rises to "request submission implies automatic purchase commitment," "false manufacturer/direct claim," "hardcoded live-status theater," or "broken semantic chronology" (the `<ol>` is present and in correct DOM order, even though the step count/copy is wrong). The customer-approval gate is structurally intact. All gaps found are P1/P2/P3 in severity.

# P1 FINDINGS

1. **Wrong step count and step model** — 6 steps (Request submission, Requirement review, Sourcing evaluation, Proposal & decision, Purchase confirmation, Sourcing & delivery coordination) instead of the frozen exactly-4 (ارسال درخواست, بررسی درخواست, دریافت پیشنهاد, تأیید و پیگیری سفارش).
2. **Wrong H2** — current FA H2 doesn't match the frozen text at all.
3. **Supporting paragraph present** — must be removed per the operational resolution of Consistency Note A.
4. **CTA present** — must be removed; V2.0 requires no dedicated CTA in this component.
5. **Internal procurement theater / supplier emphasis** — Step 3 ("مقایسه گزینه‌های تأمین" / comparing sourcing options) and Step 6 ("ارتباط با تأمین‌کننده" / supplier communication) expose internal sourcing/supplier mechanics the spec (§12, §13) says must not appear on the public Homepage.
6. **Evaluation/Assurance duplication** — Step 3's sourcing-comparison framing and Step 6's delivery-coordination framing overlap the Evaluation/Assurance "امکان تأمین" and "تحویل" axes' territory.
7. **Wrong visual architecture** — a bordered grid (2-col at `sm`, 3-col at `lg`) rather than a connected horizontal/vertical timeline; includes the specifically-forbidden 2-column intermediate state and a "six-card grid" panel treatment.
8. **Missing/incorrect semantic details** — no `aria-labelledby` on the `<section>`; visible index not `aria-hidden`; step body rendered as `<dl>` (input/activity/output) instead of a single `<p>`; index digits not locale-scripted (always Latin, not `tabular-nums`).
9. **EN/AR localization gap** — no approved English or Arabic copy exists anywhere for the frozen four-step model (see EN/AR READINESS in the summary and Consistency Notes). This is the item driving the RESULT=C classification.

# P2 FINDINGS

1. No connector element exists at all (positive requirement unmet, though nothing to animate incorrectly either).
2. Reveal stagger currently spans up to ~300ms across 6 items; will shrink to ~180ms once corrected to 4 items — worth reconfirming against the spec's motion budget at that point, though not itself a violation.
3. Locale-index utility duplication risk — `evaluationAxisIndex` is a good reuse candidate but is awkwardly named for a non-axis caller; a small shared extraction is cleaner than either duplicating the `Intl.NumberFormat` logic or importing a misleadingly-named function from a frozen sibling file.
4. Live browser-based responsive/zoom/contrast verification could not be performed (extension not connected) — flagged as a residual verification gap for whoever executes PP-P1, not a code defect.

# P3 FINDINGS

1. `process.tsx`'s doc-comment cites `HOMEPAGE_SPEC.md §12`'s six-stage model as its authority — this comment itself needs updating once PP-P1 lands, to instead cite the new frozen V2.0 spec (a documentation-hygiene cleanup, not a behavior change).
2. The `eyebrow` field/prop usage should be reconsidered — the current eyebrow text ("روند خرید") is drawn from the frozen spec's own forbidden-heading vocabulary (§4), even though it's used as an eyebrow rather than the H2 itself; whether a bare `<h2 id>` (à la Evaluation/Assurance, which needed no eyebrow) is more appropriate is a P1-time content-copy decision, listed here only as a minor observation.

---

# FILES TO CREATE IN PP-P1

- Possibly a new shared, neutrally-named locale-index utility (e.g. `lib/content/locale-index.ts`) if the reuse-vs-duplicate decision favors extraction over importing `evaluationAxisIndex` as-is (see INDEX POLICY). Not required if PP-P1 instead imports the existing function directly.
- Possibly a new focused test file (e.g. `lib/content/process-frozen-spec-invariants.test.ts`, mirroring the Evaluation/Assurance and Hero pattern) — tests are out of scope for P0 but should be added in PP-P1 per `CLAUDE.md` §4.8.

# FILES TO MODIFY IN PP-P1

- `components/home/process.tsx` — full rewrite of markup: 4-step `<ol>`/`<li>`/`<h3>`/`<p>` structure, `aria-labelledby` on the `<section>`, `aria-hidden` + locale-scripted `tabular-nums` index, a static (non-animated) connector, direction-aware (RTL/LTR) horizontal-to-vertical timeline layout with no 2×2 intermediate, removal of the CTA link, removal of the `<dl>` input/activity/output framework.
- `lib/content/homepage.ts` — the `process` field's shape must change from `{ eyebrow, title, body, cta, steps: [{title, input, activity, output}] }` (6 entries) to something matching the frozen model, e.g. `{ title, steps: [{title, body}] }` (exactly 4 entries, no eyebrow/body/cta) — pending the EN/AR localization decision noted in RESULT.
- `app/[locale]/page.tsx` — likely unaffected (the `<Process locale={locale} />` call site itself doesn't need to change), but should be re-verified once the component's prop surface is finalized.

# FILES TO REMOVE IN PP-P1

None identified. No legacy/unused asset was found specifically tied to the current Process implementation (no dedicated icon/image assets are used).

---

# DATABASE IMPACT

None required. Purchase Process is, and remains, a purely editorial component (`lib/content/homepage.ts` → SSR HTML). No `DB_PUBLIC` schema, migration, or read path is implicated.

# ODOO IMPACT

None required. No Odoo API, adapter, or state is read by this component today or under the frozen spec.

# RFQ IMPACT

None required. No RFQ D1 tables, queue, or live state is read by this component today or under the frozen spec.

---

# PP-P1 IMPLEMENTATION BOUNDARY

Smallest exact boundary, per the frozen spec's own §27 data-boundary rule and this audit's findings:

- `components/home/process.tsx` (rewrite)
- `lib/content/homepage.ts` (content-shape change, FA content at minimum; EN/AR pending the localization decision)
- Possibly one new small shared utility file for the locale-index digits (see FILES TO CREATE)
- Possibly one new focused test file
- `app/[locale]/page.tsx` — touch only if the component's prop contract changes; the import/composition itself does not need to move

**Explicitly out of scope for PP-P1, per the frozen spec and `CLAUDE.md`:** any `DB_PUBLIC` migration, any Odoo integration change, any Public Processing Projection change, any RFQ architecture change, any new CTA/route/live-state feature. None of the findings above require touching any of these.

---

# TESTS

`npm test` (`node --test lib/**/*.test.ts components/**/*.test.ts`): **984 passing, 0 failing, 0 cancelled, 0 skipped, 0 todo** (duration ~6.58s). No test was added, removed, or modified by this audit. The pre-existing homepage-ordering assertion (`evaluation < process` in `app/[locale]/page.tsx`) is included in this count and passed.

# TSC

`npx tsc --noEmit`: **0 errors.**

# BUILD

`npm run build` (`vinext build`): **succeeded.** All 5 build stages completed (client references, server references, RSC environment, client environment, SSR environment); route manifest listed all expected routes including `/:locale` (the homepage). No build errors or warnings beyond the normal build-stage progress output.

---

# GIT

- `git status --short` after this task's two commits: **clean.**
- One incidental side-effect was found and reverted before finalizing: running `npx tsc --noEmit` touched the tracked `tsconfig.tsbuildinfo` file (a normal tsc incremental-build cache that happens to be committed in this repo). This was reverted with `git checkout -- tsconfig.tsbuildinfo` before the report commit, since it is not one of the two files this task is authorized to change.
- `~/Downloads/AHANASSA_PURCHASE_PROCESS_FINAL_FROZEN_V2.0.md` still exists, untouched, at 21588 bytes with the same SHA-256, after both commits.

---

# PRODUCTION SAFETY

No production or staging system was touched. All verification (tests, `tsc`, `build`, dev server, D1 migrations) ran entirely inside this local worktree against **local-only** D1 state (`.wrangler/state/v3/d1`, database ids literally named `REPLACE_WITH_REAL_D1_DATABASE_ID_PUBLIC`/`_OPS` in the local emulator, not the real staging/production D1 bindings). No `--remote` flag was used on any `wrangler` command. No deploy, push, or migration against a real environment occurred. The local dev server (`localhost:3000`, pid confirmed via `lsof`) was stopped before finishing this task.

# NEXT PHASE

**PP-P1** (implementation), gated on one owner decision this audit surfaces rather than resolves: whether to (a) implement the frozen FA four-step model now and accept temporarily-stale/mismatched EN/AR content until owner-approved translations exist, or (b) hold FA implementation until EN/AR copy is supplied/approved so all three locales ship in lockstep, consistent with how Evaluation/Assurance V2.1 shipped its own EN/AR "transcreations" as part of its frozen spec. This audit does not assume either answer. Once that's resolved, the PP-P1 boundary above (`components/home/process.tsx`, `lib/content/homepage.ts`, optional shared index utility, optional new test file) is a self-contained, database/Odoo/RFQ-free implementation task.
