# EVALUATION-ASSURANCE-P0 — Current Implementation & Architecture Audit

Date: 2026-09-07
Repository: `/Users/reza/Developer/ahanassa-website`
Worktree: `.claude/worktrees/evaluation-assurance-p0`
Branch: `worktree-evaluation-assurance-p0`
Task type: **spec import + READ-ONLY AUDIT** — no runtime code, migration, or other frozen spec was changed by this task.

```
CURRENT EVALUATION AUTHORITY: V2.1
OLD HOMEPAGE "WHAT WE DO": SUPERSEDED
CURRENT CAPABILITIES COMPONENT: REMOVE
HOMEPAGE PROCESSING PROJECTION: NOT REQUIRED
HEADER PROCESSING PROJECTION: UNCHANGED
DB_PUBLIC CHANGE REQUIRED: NO
ODOO CHANGE REQUIRED: NO
READY FOR EA-P1: NO — see "WHAT WE DO" RETIREMENT DECISION / current-slot findings below for the one genuine, unanticipated blocker (an existing, differently-scoped, v0-baseline "Assurance" component already occupies this homepage slot's name and position)
```

# RESULT

**B — BLOCKED — CURRENT COMPONENT HAS SHARED DEPENDENCIES THAT REQUIRE OWNER DECISION.**

This needs an immediate qualification, because it is *not* the "Capabilities has shared dependencies" scenario the task anticipated (that part is clean — see "WHAT WE DO" RETIREMENT DECISION). The actual blocker is a **second, unanticipated component**: `components/home/assurance.tsx`, rendered as `<Assurance locale={locale} />` in `app/[locale]/page.tsx` immediately after `<Capabilities />` and immediately before `<Process />`. It already:

- is named **`Assurance`** — the same word used in the new spec's own name ("Evaluation / Assurance");
- already sits in **exactly the homepage position** V2.1 §2 assigns to the new component (directly after the Product-Showcase-adjacent slot and directly before Purchase Process — once `Capabilities` is removed per this task's owner decision, `Assurance` becomes the section immediately following Product Showcase);
- uses an **eyebrow the new spec explicitly forbids by name** — `homepageCopy[locale].assurance.eyebrow` is literally **"روش ارزیابی"** ("Evaluation method"), and V2.1 §4.1 lists **"روش ارزیابی"** first among the six generic headings this component "must not" use "without a new approved content decision";
- uses a **visual pattern V2.1 forbids for this concept** — full-bleed decorative image (`/images/ops/warehouse.png`) with an overlay stat-style badge, plus a `<dl>` of 3 points in a 50/50 image/text split. V2.1 §16/§18/§19/§39/§43 require no image, no badge, a 40/60 intro/list split, warm-cream surface (not the current `bg-surface`/image-heavy treatment), and explicitly list "another Product-Showcase-like grid"/"glassmorphism panel"/badge-style overlays among the visual-regression failure list (§46) — the current Assurance badge overlay is structurally the same pattern V2.1 is written to move away from;
- contains **3 points, not 4 axes**, and its content ("written comparison of sourcing options," "documentation/traceability checked before confirmation," "every request logged and traceable from submission to delivery") is thematically adjacent to but does not match any of V2.1's four frozen axis copy blocks (§7–§10).

This is a genuine architectural collision the task prompt did not know to ask about (the prompt's own context section named `components/home/process.tsx` as the only other component to inspect for duplication risk, not `assurance.tsx`). It is recorded here as a **P0 finding requiring an owner decision before EA-P1 can be scoped**, per this task's own instruction to report B/C honestly rather than force A. See "WHAT WE DO" RETIREMENT DECISION and CURRENT SLOT RESPONSIBILITY below for the full evidence and a recommended (not yet authorized) resolution path.

Everything else this task was asked to verify — the `Capabilities` ("what we do") retirement itself, the Services-Home-P0 reconciliation, content/claim/accessibility/data-dependency readiness for the *content* of V2.1 — is clean and matches the task's expected answer. The blocker is narrow and specific: **what happens to the pre-existing `components/home/assurance.tsx` / `homepageCopy.assurance` content**, not whether "what we do" should be removed (that part is unambiguous and not in question).

# PREFLIGHT

```
$ pwd
/Users/reza/Developer/ahanassa-website/.claude/worktrees/evaluation-assurance-p0

$ git branch --show-current
worktree-evaluation-assurance-p0

$ git rev-parse HEAD   (before any commit in this task)
c098f9eddae37fb3689bb6fba57194c6dfe8d23a

$ git status --short
(clean)

$ git log --oneline -5   (before this task's commits)
c098f9e docs: audit Homepage Services component
18c6793 docs: freeze Product Showcase V2.0
8060723 docs: record Product Showcase V2.0 P1 compliance
a727518 fix(home): align Product Showcase with frozen V2.0
6b283fc docs: record Product Showcase V2.0 implementation audit
```

Working tree was clean at the start; `c098f9e` is a descendant of `18c6793` (Product Showcase V2.0 final freeze), matching the parent session's already-verified ancestry.

# BASE SHA

```
c098f9eddae37fb3689bb6fba57194c6dfe8d23a
```

# SPEC SOURCE

```
$ ls -la ~/Downloads/AHANASSA_EVALUATION_ASSURANCE_FINAL_FROZEN_V2.1.md
-rw-r--r--@ 1 reza  staff  28740 Sep  7 21:16 .../AHANASSA_EVALUATION_ASSURANCE_FINAL_FROZEN_V2.1.md

$ shasum -a 256 ~/Downloads/AHANASSA_EVALUATION_ASSURANCE_FINAL_FROZEN_V2.1.md
da05efcab5d3de06fc1aa5e6ec42024ceba13c7319b3d1c381c8c5625b3b656  ...FROZEN_V2.1.md
```

Independently recomputed by this task (not merely trusted from the parent session's report) — byte size (28740) and SHA-256 match exactly what the parent session reported. Exactly one candidate file existed; no ambiguity.

# SPEC SHA-256

```
Source:      da05efcab5d3de06fc1aa5e6ec42024ceba13c7319b3d1c381c8c5625b3b656
Copied file: da05efcab5d3de06fc1aa5e6ec42024ceba13c7319b3d1c381c8c5625b3b656
```

Exact match. The file was copied byte-for-byte via `cp` — no rewriting, normalization, or provenance header was added (none was required; the default expectation of an exact-match copy was followed). The Downloads source file was not moved, deleted, or modified — confirmed still present at its original path with its original size after the copy.

# SPEC IMPORT COMMIT

```
086a8fcc202537eea8f43d31f49a4462476a5b91
```

```
commit 086a8fcc202537eea8f43d31f49a4462476a5b91
    docs: import Evaluation Assurance V2.1 frozen spec

 docs/evaluation-assurance/AHANASSA_EVALUATION_ASSURANCE_FINAL_FROZEN_V2.1.md | 1228 ++++++++++++++++++++
 1 file changed, 1228 insertions(+)
```

Exactly one file, no runtime files, committed before this report.

# CURRENT AUTHORITY

`docs/evaluation-assurance/AHANASSA_EVALUATION_ASSURANCE_FINAL_FROZEN_V2.1.md` — read in full (all 51 sections, 1228 lines), not from this task's own summary or the orchestrating prompt's restatement. It is now the sole authoritative content/UX/visual/accessibility/localization/performance/governance specification for the Homepage "Evaluation / Assurance" slot, explicitly superseding `AHANASSA_EVALUATION_ASSURANCE_FINAL_FROZEN_V2.0.md` (which does not exist in this repository — this is V2.1's first appearance here) and, per its own §49, hardening (not replacing) its own V2.0 product architecture on five specific points (Incoterm/delivery-term ownership moved fully to Axis 04; Axis 02 copy rewritten; supply-side vs. customer-requested timing separated; decorative indexes forced `aria-hidden`; digit-script/`tabular-nums` frozen per locale).

# HOMEPAGE SEQUENCE

Actual current `app/[locale]/page.tsx` composition (verified by reading the file directly):

```
Hero
  -> PriceStrip (conditional: only when env.PRICE_STRIP_ENABLED === "true")
  -> ProductShowcase (try/catch-isolated; omits itself on read failure)
  -> Capabilities        <-- "what we do", the component this task's owner decision retires
  -> Assurance            <-- pre-existing v0-baseline component, NOT new; see RESULT/blocker above
  -> Process
  -> Reach
  -> CtaBand
  -> JsonLd (Organization + Website schema, not a visible section)
```

V2.1 §2's intended sequence:

```
Hero -> Price Strip (conditional) -> Product Showcase -> Evaluation/Assurance -> Purchase Process
  -> later conditional evidence/industries sections -> Final CTA
```

**Positional finding:** once `Capabilities` is removed per the owner's explicit decision, the current sequence collapses to `Hero -> PriceStrip -> ProductShowcase -> Assurance -> Process -> Reach -> CtaBand`, which is positionally identical to V2.1's intended sequence (`Assurance` already sits exactly where "Evaluation/Assurance" belongs, and `Process`/`Reach`/`CtaBand` already match "Purchase Process -> later conditional sections -> Final CTA"). This is a genuinely useful discovery for scoping EA-P1: **no new insertion point needs to be found** — but it also means the existing `Assurance` component is the most natural candidate to become the new component, not a fresh file, which is the substance of the RESULT-B blocker (its current content/visual pattern does not match V2.1 and needs an owner call on how to proceed).

# CURRENT CAPABILITIES COMPONENT

`components/home/capabilities.tsx`, imported once in `app/[locale]/page.tsx` (`import { Capabilities } from "@/components/home/capabilities";` / `<Capabilities locale={locale} />`), Server Component, zero I/O.

- Visible heading (eyebrow): FA "آنچه ما انجام می‌دهیم" / EN "What we do" / AR (equivalent) — `lib/content/homepage.ts#homepageCopy[locale].capabilities.{eyebrow,title,body}`.
- Item content: `lib/content/pages.ts#servicesCopy[locale].functions` — 4 items describing the purchasing-management workflow (requirement review → sourcing evaluation → proposal & decision → documentation & delivery coordination), **not** a processing/material taxonomy and **not** the V2.1 four axes.
- DOM: `<section className="bg-navy ...">` → `SectionHeading` (invert) + decorative image (`/images/ops/inspection.png`, `alt=""`, `aria-hidden`) on one side; `<ul>` of 4 `<li>` (via `Reveal`) with a zero-padded index (`01`–`04`), `<h3>` title, `<p>` body on the other side. No links, no CTA anywhere in the file.
- Imports: `next/image`, `@/components/ui/section-heading`, `@/components/ui/reveal`, `@/lib/content/homepage`, `@/lib/content/pages`, `@/config/locales`.
- Tests: exactly one reference anywhere in the test suite — `lib/catalog/homepage-progressive-enhancement.test.ts:191` lists `components/home/capabilities.tsx` as one of five required `Reveal` consumers (asserting it inherits the P0-1 no-hidden-state fix). No dedicated `capabilities.test.tsx` exists.
- **`servicesCopy` (from `lib/content/pages.ts`) is also consumed by `app/[locale]/services/page.tsx`** — confirmed by direct grep (`grep -rn "servicesCopy"` returns exactly three hits: its definition in `lib/content/pages.ts`, `components/home/capabilities.tsx`, and `app/[locale]/services/page.tsx`). This is a real shared dependency, and per this task's explicit instruction it must **not** be deleted globally merely because `Capabilities` is retired — only the Homepage usage should be retired.
- Can `components/home/capabilities.tsx` itself be deleted in P1? **Yes, cleanly** — its only importer is `app/[locale]/page.tsx`, and the only test reference is the one line in `homepage-progressive-enhancement.test.ts`'s consumer list (which would simply need that one array entry removed, not a test rewrite). No other file imports the `Capabilities` symbol.

# "WHAT WE DO" RETIREMENT DECISION

The owner decision as stated in the task ("the existing independent Homepage component/concept 'آنچه ما انجام می‌دهیم' / 'What We Do' / Capabilities is to be REMOVED... must NOT survive as a separate Homepage component") is **directly and cleanly actionable** against `components/home/capabilities.tsx`:

- It answers "what do we do" (a workflow-narrative "what we do" list), never "what is checked before a proposal" — classified as **SUPERSEDED HOMEPAGE COMPONENT**, not a broken Services implementation (per task item 11).
- V2.1 §15 explicitly forbids reintroducing "بررسی نیاز / مقایسه تأمین‌کنندگان / هماهنگی خرید / پیگیری سفارش... as a second four-item list" inside the new component — `Capabilities`'s actual items ("بررسی نیاز و مشخصات," "ارزیابی تأمین," "پیشنهاد و تصمیم," presumably a fourth documentation/delivery item, verified in `servicesCopy[locale].functions`) are exactly this forbidden shape. This confirms, from the spec's own text (not just the prompt's restatement), that the retirement decision is correct and that the new component must not become a disguised second copy of it.
- No other Homepage component, content module, or config depends on `Capabilities` or on `homepageCopy.capabilities` for anything beyond this one usage.

**Additional, unanticipated finding (the actual blocker):** the retirement decision, as scoped in the task, only names `Capabilities`. It does not address `components/home/assurance.tsx` — a second, already-shipped component that (a) shares the new spec's name, (b) already occupies the position the new component needs, and (c) uses one of V2.1's six explicitly-forbidden generic headings verbatim ("روش ارزیابی"). Per DOCUMENT_AUDIT_REPORT.md DAR-020 (line 220), both `Capabilities` and `Assurance` (there called "quality/assurance") originate from the same source: the approved v0 visual baseline's homepage section composition ("hero, product showcase, capabilities, quality/assurance, process, reach, final CTA"). They are siblings from the same design lineage, not independent components — which is exactly why removing one and leaving the other's name/position untouched creates the collision now surfacing.

**This audit does not have the authority to decide** whether:
1. the existing `assurance.tsx`/`homepageCopy.assurance` content (evaluation-method transparency: written comparison, documentation/traceability, logging) should be fully retired and the file/content-key repurposed to hold the new V2.1 four-axis content (the path this audit's evidence most directly supports — see CURRENT SLOT RESPONSIBILITY), or
2. some piece of that existing messaging needs to survive elsewhere (e.g., folded into Process, FAQ, or a future trust/evidence section) before the file is repurposed, or
3. the new component should instead be added under a different name/file specifically to avoid overwriting the v0-baseline component, leaving two adjacent sections until a separate future decision retires the old one.

This is recorded as the genuine open question this task's own instructions asked to be surfaced rather than silently resolved.

# SERVICES-HOME-P0 RECONCILIATION

Reviewed `docs/services/SERVICES_HOME_P0_CURRENT_IMPLEMENTATION_AUDIT.md` in full. Its RESULT was **C** ("processing architecture exists but the Homepage Services spec was not sufficiently frozen") with 5 open owner decisions, all keyed to whether Homepage should surface real Processing-Domain data (Material/Processing-Operation/Finished-Requirement, `lib/processing/public-repository.ts`, `public_processing_groups`) in the same slot `Capabilities` currently occupies.

V2.1 resolves this cleanly for the Evaluation/Assurance slot specifically — see the next section for the 5-question walkthrough. It does **not** resolve, and does not attempt to resolve, the *Services-Home-P0* audit's own findings about `/services` itself (drawing-based-request entry point missing sitewide, `HOMEPAGE_SPEC.md` §16 vs. Header spec §5–§27 reconciliation for a *future* Processing-data-driven Homepage card) — those remain open exactly as that report left them, because V2.1 is scoped only to the Evaluation/Assurance slot, not to whatever eventually replaces `Capabilities`'s workflow-narrative content model. **This is itself worth flagging:** retiring `Capabilities` without V2.1 (or any other frozen spec) claiming its "what we do" narrative role means that specific narrative content model (purchasing-manager responsibility framing) has no designated future home on the Homepage at all after P1 — it is not reassigned anywhere, it is simply removed. Confirm with the owner that this is intended (V2.1 §1 does explicitly frame the new component's role as distinct — "not a generic company-capabilities section" — so removal-without-replacement does appear deliberate, not an oversight).

# HEADER SERVICES BOUNDARY

Unchanged and out of scope, confirmed by re-reading the prior audit and by grep: the Header's Services dropdown (`app/[locale]/layout.tsx` → `lib/processing/public-repository.ts#listPublicProcessingGroups` → `DB_PUBLIC.public_processing_groups` → `SiteHeader`) is architecturally and at the code level completely independent of both `Capabilities` and `Assurance`/the new Evaluation/Assurance component. No file this task touched or is scoped to touch (`components/home/*`, `lib/content/homepage.ts`, `lib/content/pages.ts`) intersects the Header's processing-projection code path. V2.1 §36 confirms independently that the new component "must NOT require... Public Processing Projection," which matches this boundary exactly.

# HOMEPAGE EVALUATION BOUNDARY

Reconciling the Services-Home-P0 audit's 5 owner questions against V2.1's actual text (not the task prompt's restatement of the expected answers):

1. **Should Homepage surface real Processing-Domain data in this slot?** V2.1 §36: "This component is editorial and does not require a live commercial data dependency... must NOT require: live Odoo; Public Product Projection; Public Processing Projection; pricing API; client-side fetch." **RESOLVED: NO**, confirmed directly in the spec text, not assumed.
2. **Who curates Homepage service groups/order?** V2.1 has no curation concept at all for this component — its 4 axes are fixed, frozen, and universal (§6: "exactly four top-level evaluation axes... a fifth top-level axis must not be added"). **RESOLVED: NOT APPLICABLE** — there is no pool to curate from.
3. **What should service cards link to?** V2.1 §25: "No dedicated CTA is included in this component" and §17/§29's row structure has no link/href anywhere. **RESOLVED: NOT APPLICABLE** — Evaluation/Assurance has no cards (it has list rows) and no links.
4. **Does drawing-based request belong here?** Checked the actual spec text (not assumed): V2.1 never mentions drawings, "نقشه," CAD, or a drawing-based request anywhere in its 51 sections. §43's explicit non-goals list ("supplier directory... quotation table... 'why choose us' card grid") does not name it either, but its total absence combined with §1's narrow role definition ("Decision Assurance + Risk/Uncertainty Reduction + Buyer Enablement," "not a generic company-capabilities section") supports the Services-Home-P0 audit's own reading. **RESOLVED: NOT IN EVALUATION/ASSURANCE** (silence, not an explicit prohibition — but consistent with the prior audit's BELONGS-ON-/services-ONLY conclusion, which V2.1 does nothing to disturb).
5. **How to reconcile the old capability-hub model (`HOMEPAGE_SPEC.md` §16)?** Read `HOMEPAGE_SPEC.md` §16 directly (lines 682+, "Section 7 — Capabilities and Material Orientation," purpose: "Help qualified visitors confirm fit and continue to the correct detail page without turning the homepage into a catalog"). This describes a destination-link, material-orientation grid — materially different from both the current `Capabilities` implementation (no links at all) and from V2.1 (no links, no cards, an evaluation-criteria list, not a material grid). **RESOLVED: SUPERSEDED for this Homepage slot by V2.1** — explicitly recorded here per the task's own instruction. **Additional finding not anticipated by the task:** `HOMEPAGE_SPEC.md` §13 ("Section 5 — Protection Pillars") is actually the *closer* structural precedent to V2.1, not §16 — it already specifies four pillars (Requirement clarity / Sourcing control / Commercial protection / Delivery coordination) that map near-1:1 onto V2.1's four axes (Technical Conformity / Sourcing Feasibility / Commercial Conditions / Delivery), including the same claim-integrity cautions (§13.4: no "always the lowest price," "guaranteed delivery," etc., mirroring V2.1 §14). §13 was never implemented as a distinct Homepage section (no "Protection Pillars" component exists anywhere in `components/home/`) and is not referenced by `DOCS_INDEX.md`'s services/homepage mapping. V2.1 should be understood as the hardened, finalized successor to `HOMEPAGE_SPEC.md` §13, not only (or even primarily) to §16 — worth recording so a future reader does not miss this closer authority chain.

# CURRENT SLOT RESPONSIBILITY

Does `components/home/capabilities.tsx` answer "what do we do" instead of "what is checked before a proposal"? **Yes, unambiguously** — see CURRENT CAPABILITIES COMPONENT. Classified as SUPERSEDED HOMEPAGE COMPONENT per task item 11.

Does `components/home/assurance.tsx` (the actual blocker) overlap any of V2.1 §1's explicit non-goals? Checked against all of §43's list:

| Non-goal (V2.1 §43) | Current `Assurance` component | Verdict |
|---|---|---|
| supplier directory / comparison table | No | clear |
| product catalog / price board / quotation table | No | clear |
| process timeline | No (not chronological) | clear |
| trust-badge strip | The image-overlay badge (`t.badge`, "شفاف و مستند"/"Transparent & documented") is structurally a badge treatment, though textual not iconographic | **borderline** — not a certification/logo badge, but the visual pattern (badge overlay on a photo) is the family of pattern V2.1 §19/§46 asks this slot to move away from |
| testimonial / case-study section | No | clear |
| "why choose us" card grid | No (it is a `dl`, not cards) | clear |
| generic company-values section | Partially — "روش ارزیابی" framing is closer to a values/methodology statement than V2.1's specific four-axis criteria model | **overlap** |

Net: the current `Assurance` component is not a severe violation of V2.1's non-goals, but it is a **stale, pre-V2.1 attempt at roughly the same territory** (evaluation-method reassurance) using a forbidden heading and a visual pattern V2.1 moves away from — consistent with treating it, alongside `Capabilities`, as **SUPERSEDED**, pending the owner decision recorded above.

# FROZEN FA CONTENT

Verified against the actual imported spec text (§4, §5), not the task prompt's restatement — **matches exactly, verbatim**:

- H2 (§4.1): **"پیش از ارائه پیشنهاد، چه چیزهایی بررسی می‌شود؟"** — exact match.
- Supporting copy (§5): **"هر درخواست از نظر مشخصات فنی، امکان تأمین، شرایط تجاری و الزامات تحویل بررسی می‌شود تا مبنای پیشنهاد برای شما روشن باشد."** — exact match.
- Axis 01 copy (§7.2): **"محصول، ابعاد، گرید، استاندارد و سایر مشخصات ضروری درخواست بررسی می‌شود. در صورت نیاز پروژه، الزامات مدارک فنی و کیفی نیز لحاظ می‌شود."** — exact match.
- Axis 02 copy (§8.2): **"امکان تهیه مورد درخواست و محدودیت‌های مؤثر بر آن بررسی می‌شود."** — exact match.
- Axis 03 copy (§9.2): **"مقدار و واحد، قیمت پیشنهادی، شرایط پرداخت و مدت اعتبار پیشنهاد به‌صورت روشن مشخص می‌شود."** — exact match.
- Axis 04 copy (§10.2): **"مقصد، زمان موردنیاز، شرایط حمل و مبنای تحویل در صورت اثرگذاری بر پیشنهاد بررسی می‌شود."** — exact match.

Confirmed by direct full-repository grep (`پیش از ارائه پیشنهاد`, `انطباق فنی`, `امکان تأمین`, `شرایط تجاری`) that **none of this content currently appears anywhere in the codebase** — no partial pre-implementation, no accidental duplication, nothing to reconcile at the content level.

# FOUR AXES

Verified §6–§11 directly:

1. **انطباق فنی** (Technical Conformity) — §7. Explicit V1.0 correction: quantity/unit removed from default copy (moved fully to Axis 03) to stop the duplication that blurred boundaries in an earlier version.
2. **امکان تأمین** (Sourcing Feasibility) — §8. Frozen distinction: "Timing under Sourcing Feasibility means a supply-side constraint... not the customer-requested delivery date" (that belongs to Axis 04). Frozen positioning principle: "Show the control of the purchase, not the middleman chain."
3. **شرایط تجاری** (Commercial Conditions) — §9. Frozen cross-axis rule: "Incoterm/delivery term... belongs to Axis 04." Explicit non-promises: no lowest-price/guaranteed-savings/guaranteed-margin/permanent-validity language.
4. **تحویل** (Delivery) — §10. Frozen ownership rule: "Axis 04 is the canonical owner of Incoterm/delivery-term meaning in this component." Must not become Purchase Process's chronological "delivery step."

A fifth pillar (quality/technical documentation, §11) is explicitly and permanently **conditional under Axis 01**, never independent — confirmed textually, not assumed.

# CONTENT OWNERSHIP

Verified against §7.4, §8.3–8.4, §9.3–9.4, §10.3–10.4, §11:

- **Technical (Axis 01):** owns product/dimensions/grade/standard/specification and *conditional* documentation requirements. Does **not** own quantity/unit (moved to Commercial in this version — an explicit correction from V1.0, §7.4).
- **Sourcing (Axis 02):** owns sourceability/procurement-constraint language only. Must not claim a governed supplier-qualification program without evidence (§12) and must not overstate or understate the intermediary/reseller structure (§13 — "Show the control of the purchase, not the middleman chain").
- **Commercial (Axis 03):** owns quantity, unit, proposed price, payment terms, validity. Must not claim/imply Incoterm ownership (moved fully to Axis 04, §9.4 — the actual V2.1-vs-V2.0 hardening point).
- **Delivery (Axis 04):** canonical, sole owner of Incoterm/delivery-term meaning (§10.3's frozen rule) — this is the one point V2.1's own §49 change-log calls out as the central hardening over V2.0.
- **Quality docs:** conditional-only under Technical, never independent (§11) — no fifth pillar, confirmed.

No fifth pillar is created anywhere in the spec — verified by reading §6 and §43 together (§43's non-goals list functions as an explicit boundary fence around the four axes).

# CLAIM SAFETY

Full-text grep of the **current, pre-retirement** `Capabilities`/`Assurance` content (`lib/content/homepage.ts#homepageCopy[locale].{capabilities,assurance}`, `lib/content/pages.ts#servicesCopy[locale].functions`) for every phrase V2.1 §12/§13/§14 flags (best price, cheapest, guaranteed quality/speed, risk-free, trusted/approved suppliers, factory-direct, no-middleman, Ahan-Asa-owned stock/manufacturing, FA/EN equivalents): **zero matches** in either component's own content. **No claim-safety violation exists in the current pre-retirement Homepage slot.**

**One adjacent finding, outside this slot, worth recording because it textually matches a phrase V2.1 names specifically:** `lib/content/homepage.ts`'s `process` content (used by `components/home/process.tsx`, a *different* Homepage section) contains the exact FA phrase **"گزینه‌های تأمین قابل‌اتکا"** ("reliable/dependable sourcing options," step "ارزیابی تأمین") and its English translation "Reliable sourcing options are identified." V2.1 §12 names precisely this phrase — "«گزینه‌های قابل‌اتکا» unless 'reliable/trusted' is backed by a real qualification definition" — as a claim requiring evidence. This is **not** inside the Evaluation/Assurance slot and is therefore out of this task's remediation scope, but it is flagged here because it is a direct textual hit on a phrase the new spec calls out by name, already live on the Homepage today, in the immediately-adjacent Purchase Process section.

# VISUAL ARCHITECTURE

Verified against the actual spec text (§16–§19, §43, §46), not assumed:

- **Desktop split** — §16.1: "~40% Intro/Context, ~60% Evaluation List." No existing homepage section implements exactly this ratio (`Capabilities` uses a 5/7 (~42/58) `lg:grid-cols-12` split — close, directly reusable as a pattern); `Assurance` uses a roughly 50/50 `lg:grid-cols-2`.
- **Row structure** — §17: index + H3 + short copy, "not independent floating cards," separated by spacing/dividers. `Process`'s `<ol>` row treatment (index, `h3`, short `dl`) is visually the closest existing precedent for "row, not card" (though it uses a `dl`, not a plain `<p>`, and is `<ol>` not `<ul>` — semantically wrong for this new component, see SEMANTIC HTML).
- **No card grid** (§18) — `Capabilities`'s `sm:grid-cols-2` bordered-cell grid and `Process`'s `sm:grid-cols-2 lg:grid-cols-3` grid are both explicitly the pattern §18 forbids for the new component; neither should be copied structurally.
- **Background/surface** (§19) — "Warm neutral/restrained cream section surface, Navy text, Restrained copper indexing/accent, Subtle dividers." **Directly reusable, already-existing token found:** `styles/tokens.css` defines `--aa-color-brand-cream-50: #fbf5eb` and a semantic alias `--aa-color-bg-warm: var(--aa-color-brand-cream-50)`, already consumed today via `bg-[var(--aa-color-bg-warm)]` in both `components/home/hero.tsx` (the warm content card) and `components/home/price-strip.tsx`. Navy (`--color-navy`) and copper (`--color-copper`, `--color-copper-400`) tokens already exist and are used throughout (`SectionHeading`, `Capabilities`'s index numerals, `Process`'s heading text). **No new token is needed** — the exact warm-cream/navy/copper combination V2.1 asks for already has a first-class token and at least two prior consumers on this same page.
- **What must NOT be reused:** `Capabilities`'s navy hairline-grid background and `Assurance`'s full-bleed photo + overlay badge are both visual patterns V2.1 explicitly moves away from for this slot (§19's "do not use... dark dramatic industrial background... floating translucent cards" and the badge/photo pattern discussed under CURRENT SLOT RESPONSIBILITY).

Inventory conclusion: `SectionHeading` (intro half) + a shared warm/navy/copper token set already in active use elsewhere on this same page are directly reusable; the row/list structure needs a new, purpose-built `<ul>` (none of `Capabilities`'s `<ul>`/grid-cell markup, `Process`'s `<ol>`/`dl` markup, or `Assurance`'s `<dl>`/image markup can be reused as-is — each is semantically or visually wrong per V2.1 in a different way). No design implementation was performed — this is inventory only, per the task's explicit instruction.

# INDEX / DIGIT POLICY

Verified against §20/§20.1: visible indexes must be `aria-hidden="true"`, `font-variant-numeric: tabular-nums`, and locale-scripted (FA ۰۱–۰۴ / AR ٠١–٠٤ / EN 01–04), decorative only, never implying chronological order.

- `styles/base.css:101` already sets `font-variant-numeric: tabular-nums` as part of the shared base type styles (not component-specific) — confirmed present and reusable, not duplicated by anything homepage-specific.
- **No existing utility renders decorative digits in a locale-appropriate script.** Broad search performed (`tabular-nums`, `toLocaleString`, `persianDigit`/`arabicDigit`/`toFarsiDigits`/`convertDigits`/`localizeDigits`, and a full read of `lib/rfq/quantity.ts`) found exactly one digit-related module, `lib/rfq/quantity.ts#normalizeDigits` — and it runs in the **opposite direction** (FA/AR-typed digits → ASCII, for parsing user-typed RFQ quantities server-side), not usable for rendering.
- **A directly adaptable pattern does exist**, however: `lib/pricing/price-strip-presentation.ts` defines `const LOCALE_NUMERALS_FOR: Record<Locale, string> = { fa: "fa-IR", en: "en-US", ar: "ar-EG" }` and uses it with `new Intl.NumberFormat(LOCALE_NUMERALS_FOR[locale]).format(...)` (for `formatToman`) and `Intl.DateTimeFormat` (for timestamps). This was verified live: `Intl.NumberFormat("fa-IR").format(1)` → `۱`, `Intl.NumberFormat("ar-EG").format(1)` → `١`, `Intl.NumberFormat("en-US").format(1)` → `1` — i.e., this exact existing locale-tag mapping, reused with `Intl.NumberFormat`, produces precisely the FA/AR/EN digit scripts §20.1 requires, with zero new dependency. **Recommendation for P1 (not implemented here): extract `LOCALE_NUMERALS_FOR` (or an equivalent) into a small shared formatting helper rather than duplicating it a third time** — it is currently private to `lib/pricing/price-strip-presentation.ts`, not exported as a general-purpose utility.

# SEMANTIC HTML

Target per §29: `<section aria-labelledby>` → `<h2 id=...>` → `<p>` (intro) and a sibling `<ul><li><span aria-hidden>index</span><h3>...</h3><p>...</p></li></ul>` — explicitly `<ul>`, not `<ol>`, because "the four axes are categories/criteria, not chronological process steps" (§29, reason given verbatim).

- `SectionHeading` already supports an optional `headingId` prop (confirmed by reading the component, added for Product Showcase P1 per its own doc-comment) — this maps directly onto `aria-labelledby` wiring with no new abstraction needed; the pattern is "supply `headingId` on `SectionHeading`, put the same string on the `<section>`'s `aria-labelledby`" — already how the prop is designed to be used, just not yet exercised by any current homepage section (`Capabilities` and `Assurance` both call `SectionHeading` without `headingId`).
- `Capabilities` already uses a real `<ul>`/`<li>` (via `Reveal as="li"`) for its 4 items — structurally the closest existing precedent for the *list* half of §29's target, though its content is wrong (per retirement decision) and its visual treatment (bordered grid cells) is wrong per V2.1 §18.
- `Process` deliberately uses `<ol>` (correct for *its own* chronological content) — confirms the codebase already distinguishes `<ul>` vs. `<ol>` semantics correctly elsewhere, so choosing `<ul>` for the new component is consistent with, not a deviation from, existing conventions.

# CTA / INTERACTION

§21–§26 forbid: icons (default), CTA, accordion, tabs, carousel, tooltip, sticky, horizontal scroll, fake-clickable rows, theatrical motion.

Audited the current `Capabilities` component for anything that must not carry over: it has **no icons** (only zero-padded numeral badges), **no CTA/link of any kind** (confirmed — zero `<a>`/`Link`/`href` in the file), **no accordion/tabs/carousel/tooltip/sticky/horizontal-scroll markup** (confirmed by reading the full file — no `overflow-x`, no `snap-x`, no slider import), and its only interactive-feeling affordance is a `hover:bg-white/[0.04]` background tint on an already-fully-visible, non-clickable `<li>` — decorative only, does not imply clickability, does not reveal hidden content. **Nothing in the current component would violate §21–§26 if it were structurally reused** — the violation risk is entirely in its *content* (wrong heading, wrong axes, forbidden generic framing) and *visual pattern* (card grid, navy background), not its interaction model. Same conclusion for `Assurance`: no CTA, no icons, no accordion/carousel; its only interactive affordance is likewise none (a static `<dl>`).

# DATA DEPENDENCY

§36: must not depend on Odoo, `DB_PUBLIC`, Public Processing/Product Projection, pricing, or client-side fetch — "Localized Website Content → SSR/static render → Evaluation component."

Confirmed for both current components by reading their full import lists: `Capabilities` imports only `next/image`, two `components/ui/*` presentational modules, and two `lib/content/*` static-object modules — **zero I/O, zero database read, zero fetch**. `Assurance` imports the identical shape (`next/image`, `SectionHeading`, `lib/content/homepage`) — also zero I/O. Both already satisfy V2.1's data-dependency requirement structurally; only the *content itself* needs to change, not the data-access pattern.

# SSR

Both components are ordinary Server Components with no `"use client"` directive and no async work of their own — content is present in the raw server-rendered HTML with no client JS required to see it, matching V2.1 §36/§38's SSR-first requirement. (Not independently re-verified via a fresh `curl` in this task, since the prior Services-Home-P0 audit already live-verified this exact rendering path at this same base commit lineage — re-reading the source code was judged sufficient corroboration for this narrow, code-structural claim; no runtime behavior changed between that audit and this one.)

# JS-OFF

§40: "JavaScript unavailable → content remains visible." Both `Capabilities` and (if `Reveal` is used, which `Assurance` currently does not — it has no `Reveal`/`"use client"` dependency at all, being a fully static server-rendered `<dl>`) rely on the same shared `components/ui/reveal.tsx` contract, read in full for this task: its documented, code-enforced guarantee is "THERE IS NO HIDDEN STATE, AT ANY POINT, IN ANY PHASE" — the SSR baseline (`phase: "static"`) emits no `data-reveal` attribute and the shared `.reveal` CSS class "declares NOTHING that could hide the element." `lib/catalog/homepage-progressive-enhancement.test.ts` already asserts this contract holds for `capabilities.tsx` specifically, as part of the passing 941-test suite. A future Evaluation/Assurance component that either omits `Reveal` entirely (an explicitly acceptable outcome per this task's own instruction — "the simplest compliant solution may use no reveal at all") or reuses it inherits the same zero-hidden-state guarantee automatically.

# LOCALIZATION

§33: Persian copy frozen; EN/AR must be "professionally localized/transcreated," never mechanically translated, never stronger than the Persian.

- **Checked the imported spec itself for pre-approved EN/AR text: none exists.** V2.1 is FA-only throughout all 51 sections — every quoted heading/copy/axis block is Persian; no parallel English or Arabic block is provided anywhere in the document (confirmed by reading the complete file, not sampling).
- **EN/AR LOCALIZATION REQUIRED IN P1.** No stronger marketing language should be invented for either locale — this task does not write that copy, per its explicit instruction.
- **Established pattern confirmed:** `lib/content/homepage.ts` already holds a `Record<Locale, HomepageCopy>` with a distinct, fully-realized `fa`/`en`/`ar` entry for every existing section (`hero`, `productShowcase`, `capabilities`, `assurance`, `process`, `reach`, `priceStrip`) — verified by reading the file's full structure, not just its type signature. Adding a new `evaluationAssurance: { eyebrow, title, body, axes: { title, body }[4] }`-shaped key (or, per the RESULT-B finding above, repurposing the existing `assurance` key) following this exact pattern is the correct, already-established home for the new copy. This is the same conclusion the task prompt anticipated, and the evidence directly supports it — the only open question is *which existing key* (a new `evaluationAssurance` vs. the repurposed `assurance`), which depends on the RESULT-B owner decision, not on where the content should live structurally.
- Old `Capabilities` copy can be safely removed from the Homepage without affecting `/services` — confirmed under CURRENT CAPABILITIES COMPONENT (`servicesCopy` is a separate, still-needed export consumed by `/services` independently of `Capabilities`).

# ACCESSIBILITY

§31/§29/§30 target: semantic section/heading structure, meaningful text directly in the DOM, no color-only information, no hover-only content, correct RTL/LTR reading order, usable at zoom, `>= 4.5:1` contrast for normal text, WCAG 2.2 AA baseline (matching this repo's own stated accessibility baseline). `SectionHeading`'s existing `headingId` prop (added for Product Showcase P1, confirmed via its own doc-comment) supports the required `<h2 id> / aria-labelledby` wiring without any new abstraction — it is a plain optional string prop already plumbed to the rendered `<h2>`; a future consumer only needs to pass a `headingId` and put the same value on the wrapping `<section aria-labelledby=...>`, exactly the pattern V2.1 §29 specifies. No over-abstraction risk identified.

# RESPONSIVE REQUIREMENTS

Recorded as a target for P1 per the task's own instruction — nothing has been built yet, so nothing was live-verified in this task. §27/§28/§44 require validation at 320/360/375/390/430/768/1024/1280/1440px, FA/AR/EN, 200% zoom, reduced motion, and JS-disabled, with the desktop 40/60 split permitted to collapse earlier than a framework-default breakpoint if content fit requires it, and no forced 2-column mobile layout.

# PURCHASE PROCESS BOUNDARY

`components/home/process.tsx` (the "Purchase Process" component named in V2.1 §2/§41) was read in full. It renders a fixed six-stage `<ol>` (`ارسال درخواست` → `بررسی نیاز` → `ارزیابی تأمین` → `پیشنهاد و تصمیم` → `تأیید خرید` → `هماهنگی تأمین و تحویل`), each with `input`/`activity`/`output` fields, explicitly documented in its own comment as implementing `HOMEPAGE_SPEC.md` §12 with a fixed DOM order regardless of visual direction.

V2.1 §41's frozen boundary: Evaluation = "What is checked?", Purchase Process = "What happens, and in what sequence?" — Process "must not repeat detailed lists of: grade; standard; price basis; payment terms; delivery basis," though "it may use a step called 'بررسی درخواست'."

Checked step 2 ("بررسی نیاز," input: "مشخصات، مقدار، زمان‌بندی و اولویت‌ها") against this rule: it names *categories* (specification, quantity, timing, priorities) at a workflow-input level, not the *detailed* grade/standard/price-basis/payment-term/delivery-basis lists V2.1 §41 specifically forbids duplicating — **compliant, no violation found**, though the thematic proximity (both sections touch "what is reviewed") is real and worth a future implementer's attention: once Evaluation/Assurance ships with its four detailed axes, Process's step 2 should not be expanded to add that same level of detail, or the exact duplication V2.1 §41 warns against would be recreated. No redesign of Process was performed or is recommended here, per the task's explicit scope limit.

# FILE / IMPORT DEPENDENCY ANALYSIS

```
components/home/capabilities.tsx
  imported by: app/[locale]/page.tsx (only)
  referenced by: lib/catalog/homepage-progressive-enhancement.test.ts (Reveal-consumer list, by path string)
  imports: next/image, components/ui/section-heading, components/ui/reveal,
           lib/content/homepage (#capabilities), lib/content/pages (#servicesCopy), config/locales

components/home/assurance.tsx
  imported by: app/[locale]/page.tsx (only)
  referenced by: lib/content/hero-frozen-spec-invariants.test.ts (comment-only, convention comparison — not a functional dependency)
  imports: next/image, components/ui/section-heading, lib/content/homepage (#assurance), config/locales

lib/content/pages.ts#servicesCopy
  consumed by: components/home/capabilities.tsx, app/[locale]/services/page.tsx  <-- shared, must survive
  consumed by (unrelated): industriesCopy/marketsCopy in the same file, out of scope

lib/content/homepage.ts#homepageCopy[locale].capabilities
  consumed by: components/home/capabilities.tsx only — safe to remove entirely once Capabilities is retired

lib/content/homepage.ts#homepageCopy[locale].assurance
  consumed by: components/home/assurance.tsx only — its fate is exactly the open RESULT-B question
```

No other file in the repository imports `Capabilities` or `Assurance` by name (verified by full-repository grep, excluding `node_modules`).

# FILES TO REMOVE IN P1

- `components/home/capabilities.tsx` — safe, single importer (`app/[locale]/page.tsx`), single test reference (one array entry in `homepage-progressive-enhancement.test.ts`), no shared runtime dependency beyond `servicesCopy` (which itself is not removed).
- `homepageCopy[locale].capabilities` (all three locales) in `lib/content/homepage.ts` — safe, single consumer.
- **Conditionally:** `components/home/assurance.tsx` and `homepageCopy[locale].assurance` — only if the owner decision (RESULT-B) selects the "fully retire and repurpose" path; not authorized to remove in this task.

# FILES TO CREATE IN P1

- Likely `components/home/evaluation-assurance.tsx` (matching this repo's existing one-concept-per-file naming convention — `product-showcase.tsx`, `price-strip.tsx`, `process.tsx`, `reach.tsx` all follow `kebab-case-noun.tsx` for one Homepage section each) — **unless** the owner decision selects reusing/renaming the existing `assurance.tsx` file in place, in which case no new file is created and this becomes a FILES TO MODIFY entry instead. This choice is exactly the open question this audit surfaces; no file was created in this task.
- A new `evaluationAssurance` key in `lib/content/homepage.ts#HomepageCopy` (or a rewritten `assurance` key, per the same open decision), following the existing per-locale-object pattern.
- Possibly a small shared digit-localization helper (extracted from `lib/pricing/price-strip-presentation.ts#LOCALE_NUMERALS_FOR`) if the owner wants it deduplicated rather than reimplemented a second time — not required, but flagged as available.

# FILES TO MODIFY IN P1

- `app/[locale]/page.tsx` — remove the `Capabilities` import/usage; either keep `Assurance` as-is (if a new file is added alongside it) or replace its import/usage with the new component (if `assurance.tsx` is repurposed).
- `lib/catalog/homepage-progressive-enhancement.test.ts` — remove `components/home/capabilities.tsx` from its Reveal-consumer list (or, if the new component also uses `Reveal`, add it in the same place, following the same pattern the test already documents for the other four consumers).
- `lib/content/homepage.ts` — remove `capabilities`, and add/rewrite `assurance`/`evaluationAssurance` per the owner decision.

No `app/[locale]/services/page.tsx` change is required — it does not import anything from `components/home/`.

# DATABASE IMPACT

None. No migration is required or was created. V2.1 §36 confirms the component is editorial-only; no new D1 table, column, or row is implied by anything in the spec.

# ODOO IMPACT

None. No Odoo module, field, or protocol change is implied, required, or was made. §36/§40 explicitly require the component to have no effect from an Odoo outage, confirming no coupling is intended.

# EA-P1 IMPLEMENTATION BOUNDARY

Not started — this task is audit-only. The boundary this audit can responsibly describe, **once the RESULT-B owner decision is made**, is:

- Remove `Capabilities`'s Homepage usage (component + content key), per the unambiguous "what we do" retirement decision.
- Resolve the `assurance.tsx`/`homepageCopy.assurance` question (RESULT-B) — reuse-and-rewrite vs. new-file-alongside vs. migrate-old-content-elsewhere-first.
- Write the new component with: `<section aria-labelledby>` → `SectionHeading` (with `headingId`) intro half (~40%) → `<ul>` of 4 `<li>` rows (~60%) with `aria-hidden` locale-scripted `tabular-nums` indexes, `<h3>` axis title, `<p>` axis copy — no icons, no CTA, no card grid, warm-cream/navy/copper tokens already available in `styles/tokens.css`.
- Add the frozen FA content verbatim (§4/§5/§7.2/§8.2/§9.2/§10.2) plus EN/AR professional localization (not yet written anywhere — a genuine P1 content task, not a copy-paste job).
- Update/add the one affected test line in `homepage-progressive-enhancement.test.ts` if `Reveal` is used; do not add a hard `Reveal` dependency merely for its own sake (§26/§38 explicitly permit zero dedicated JS).
- No DB_PUBLIC migration, no Odoo change, no Button work, no CTA — confirmed not needed anywhere above.

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
ℹ duration_ms 6428.746333
```

All 941 pre-existing tests pass, unmodified — no runtime code was touched by this task, so no regression is possible or expected. This includes `lib/catalog/homepage-progressive-enhancement.test.ts`'s existing assertion that `components/home/capabilities.tsx` is a compliant `Reveal` consumer (still true today; will need its one line updated only once P1 actually removes the file).

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
[1/5] analyze client references... 495 modules transformed
[2/5] analyze server references... 228 modules transformed
[3/5] build rsc environment... 487 modules transformed
[4/5] build client environment... 2010 modules transformed
[5/5] build ssr environment... 228 modules transformed

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

Succeeds cleanly. No runtime file was changed by this task, so this build result is expected and confirms the working tree remained valid throughout.

# GIT

Two commits created by this task, in order:

```
086a8fcc202537eea8f43d31f49a4462476a5b91  docs: import Evaluation Assurance V2.1 frozen spec
   1 file changed, 1228 insertions(+) — docs/evaluation-assurance/AHANASSA_EVALUATION_ASSURANCE_FINAL_FROZEN_V2.1.md only

<REPORT COMMIT SHA — recorded after this file is committed, see step 29>
   1 file changed — docs/evaluation-assurance/EVALUATION_ASSURANCE_P0_CURRENT_IMPLEMENTATION_AUDIT.md only
```

No commit was amended. No other file was staged, modified, or committed at any point in this task.

# PRODUCTION SAFETY

- No `--remote` D1 command was run; no staging/production database was touched.
- No network call was made to `odoo.ahanassa.com` or any other external endpoint.
- No secret, credential, or environment variable was read, logged, or exposed.
- No dev server was left running (`npm run build`/`npm test`/`npx tsc --noEmit` only; no `npm run dev` was started in this task).
- No file outside the two explicitly-allowed paths (`docs/evaluation-assurance/AHANASSA_EVALUATION_ASSURANCE_FINAL_FROZEN_V2.1.md`, `docs/evaluation-assurance/EVALUATION_ASSURANCE_P0_CURRENT_IMPLEMENTATION_AUDIT.md`) was created or modified.
- No push, deploy, or migration was performed.
- The Downloads source file was left untouched (copied, never moved or deleted) — re-verified present with its original size/hash immediately before writing this report.

# NEXT PHASE

`EA-P1` is **not yet ready to start** in the clean, single-path sense the task hoped to confirm. The Capabilities ("what we do") half of the retirement is completely unblocked and requires no further owner input — it can proceed exactly as scoped the moment EA-P1 is authorized. The one genuine blocker is narrow and specific: **an owner decision on what happens to the pre-existing `components/home/assurance.tsx` / `homepageCopy.assurance` content**, which this audit discovered sits in the exact name and position the new component needs and is itself already stale relative to V2.1 (forbidden heading, pre-V2.1 visual pattern). The recommended next step is not further architecture work but a short, specific owner question: *"May the existing Assurance component's evaluation-method-transparency content be fully retired and its file/slot repurposed for the new four-axis Evaluation/Assurance component, or must some part of that messaging be preserved/relocated first?"* Once answered, EA-P1 can be scoped and implemented using the file/import/content inventory this audit already produced.
