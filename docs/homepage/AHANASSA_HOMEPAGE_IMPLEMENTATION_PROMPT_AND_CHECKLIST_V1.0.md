# AHANASSA Homepage — Implementation Prompt & Checklist V1.0

Date: 2026-09-08
Status: READY FOR IMPLEMENTATION — implementation and verification have not yet been performed by this document.
Purpose: Apply the three approved freezes in the existing website repository.

## How to use

Give Codex this file together with the following three complete documents. Run it in the existing Ahan Asa website checkout. The prompt below authorizes local implementation and verification; it does not authorize deployment or migration.

1. `AHANASSA_HOMEPAGE_VISUAL_SYSTEM_AND_MOTION_FREEZE_V1.0.md`
2. `AHANASSA_HOMEPAGE_COMPOSITION_AND_CUSTOMER_JOURNEY_FREEZE_V1.0.md`
3. `AHANASSA_BUYER_VALUE_SERVICE_PROMISE_COMPONENT_FREEZE_V1.0.md`

## Implementation prompt

You are working on the existing Ahan Asa website. Implement the approved Homepage composition and Buyer Value component, update documentation status, investigate Product Showcase visibility, and deliver a reviewable local result with evidence.

Proceed through preflight, implementation, and validation without stopping for routine implementation choices. Read applicable AGENTS.md and repository instructions first. Do not assume that a branch, commit, local database, or server state from an earlier conversation is still current.

### 1. Authority and scope

Read all three supplied freeze documents in full before edits. Use each within its authority:

- Composition freeze: section presence, order, ownership, and conditional eligibility.
- Visual freeze: global colors, surfaces, typography, spacing, and motion.
- Buyer Value freeze: exact FA/EN/AR copy and component-specific design.
- This checklist: implementation sequence and verification; it does not redefine the freezes.

The user's latest correction is authoritative: speed Evidence requires **at least 100 eligible operational records**, plus quality gates. A raw-row count of 100 is insufficient. Earlier references to 1000 are historical, not the active requirement.

Preserve approved Header V2, Hero, RFQ behavior, catalog architecture, price-provider contracts, and shared localization conventions. Make only changes needed for this scope. Do not redesign the Header or Hero or replace their image, copy, or approved CTA behavior.

No deploy, remote push, merge, production/staging data mutation, Odoo module upgrade, or migration execution. In particular, keep `0010_homepage_eligibility.sql`, if present, pending for the release checklist. Do not mark it applied. Do not fetch secrets or change infrastructure to make a preview pass.

### 2. Preflight and baseline

Record repository root, current branch, full HEAD SHA, and working-tree status. Inspect existing changes and preserve unrelated work; do not reset, clean, or force-checkout. Use an isolated checkout only if necessary and consistent with repository instructions.

Discover actual paths rather than inventing them. Map:

- Homepage composition entry point and locale routing;
- Header, Hero, Evaluation/Assurance, Purchase Process, Products, Price Strip, Evidence, Industries, Final CTA;
- locale dictionaries and shared style/motion tokens;
- catalog public read-model adapter, eligibility filters, sync documentation, and product detail routes;
- tests, preview commands, release checklist, and old specification files.

Capture a before-state screenshot if the documented local preview can run. Record pre-existing failures separately. Do not assume that missing products prove an Odoo sync issue.

If a required freeze is missing, complete useful read-only discovery and report the exact missing input; do not reconstruct canonical translations from memory. Resolve ordinary code-path differences using the actual repository. Escalate only genuine contradictions affecting frozen behavior.

### 3. Documentation and supersession

Place the three supplied freezes in the repository's established documentation location, preserving their content. If already present, compare before replacing; retain unrelated updates and identify conflicting versions.

Create or update a supersession register/addendum linked to those documents. Add a visible status notice to each actual old specification, without deleting its historical body:

- Evaluation / Assurance V2.1: `SUPERSEDED FOR HOMEPAGE — replaced by Buyer Value / Service Promise V1.0`.
- Purchase Process V2.0: `RETAINED OUTSIDE HOMEPAGE — reserved for the dedicated /process page`.

Do not label Purchase Process globally superseded. Record legacy RiskGrid, RoleComparison, ControlPillars, generic TrustBand, and SuitabilityFaq as excluded from the current Homepage, according to the composition freeze.

If an old document is absent, record it as not found instead of creating a fake historical original. Link current documentation indexes and the release checklist to the new authority. Do not rewrite historical 1000-record decisions; correct active instructions and explicitly record the 100-record amendment where necessary.

### 4. Homepage composition

Implement this relative order inside the existing global Header/Footer shell:

Hero → Price Strip [eligible only] → Product Showcase → Buyer Value → Verified Evidence [eligible only] → Industries [eligible only] → Final CTA.

Remove Evaluation/Assurance and the independent Purchase Process renderings from Homepage. Remove any rendered legacy sections excluded by the composition freeze. Preserve reusable code and historical specifications; remove obsolete Homepage imports only as appropriate.

Hero remains the sole owner of the short purchase journey. Keep detailed process content available for future /process work. Preserve an existing /process route if present; creating a new detailed page is outside this task. Do not add links to a nonexistent route.

Conditional omission must remove the whole semantic section, including heading and spacing shell. Keep failures isolated so Price, Evidence, or Industries failures do not suppress Buyer Value or Final CTA. Avoid adjacent heavy Navy sections when conditional content is absent, using the frozen surface rules and a light transition where needed.

Do not fabricate prices, evidence, customers, case studies, or products to fill the page. Missing data is not authorization to weaken eligibility.

### 5. Buyer Value implementation

Use the canonical copy in sections 3–5 of the Buyer Value freeze verbatim through the established FA/EN/AR localization system. Do not translate anew or use earlier draft wording.

Required behavior:

- Full-width Warm Cream `#FBF5EB`, aligned to the shared content container.
- Steel Navy `#0B2545` headings, restrained Forge Copper `#B04A2F` eyebrow and decorative markers, readable body text.
- One H2, supporting statement, four H3 promises in the frozen order.
- One semantic unordered list; decorative 01–04 markers hidden from assistive technology.
- Flat 2×2 desktop layout; single-column mobile, with an earlier collapse if localized text requires it.
- A quiet central vertical and horizontal divider in 2×2; only inter-item horizontal dividers in one column.
- No outer floating card, item shadows, stock icons, image panel, accordion, pointer cursor, hover lift, or independent CTA.
- Estedad Variable and genuine RTL for FA/AR, LTR for EN; logical spacing and correct visual/DOM order.
- No truncation, artificial Persian/Arabic tracking, or fixed heights that clip translated text.
- Apply the spacing, typography, and animation limits from the freezes.

Prefer existing server-rendered components and minimal CSS. All text must be visible before hydration and with JavaScript disabled. Motion is optional enhancement: once only, reduced-motion safe, no layout shift, and no observer failure that can leave content invisible. Do not add a large animation dependency for this component.

Keep the approved qualifications: agreed commitments, transport when needed and agreed, and equal seriousness of attention rather than identical commercial terms. No superiority or guaranteed speed claim.

### 6. Product Showcase diagnosis and bounded fix

Trace the actual chain: Homepage import/render → public adapter/query → eligibility → localized names and priorities → image mapping → route resolution → DOM/CSS visibility.

Distinguish with evidence:

1. No eligible data returned.
2. Missing local schema/binding or unsynchronized read model.
3. A code/filter/route defect.
4. Cards rendered but hidden by CSS or motion.
5. An intentional architectural omission, which is not permitted for Products here.

Record safe counts and reason codes where available; do not expose private offers, supplier details, credentials, or customer records. Do not bypass the approved Odoo-to-public-read-model boundary or query private Odoo fields directly from the browser.

Fix a bounded website defect when demonstrated. Preserve the maximum eight cards, configured manual priority, localized labels, stable image governance, and approved catalog eligibility. Do not add inventory > 0 as a new Homepage eligibility condition. Verify rendered product links resolve to the intended localized detail pages, not 404s.

If the cause requires a prohibited migration, sync, infrastructure change, or Odoo work, keep the safe empty fallback and document the exact prerequisite. Deployment alone is not proof of a fix. Use isolated, clearly labeled test fixtures only in tests; never ship them as public catalog data.

### 7. Evidence and other conditional data

Inspect existing evidence infrastructure before changing it. Preserve approved metric definitions and quality gates. Where an active display threshold is already implemented, align it to 100 eligible records through the established configuration or constant.

Minimum verification for an implemented eligibility gate:

- 99 eligible records: hidden.
- 100 eligible records and all quality gates pass: may display.
- 100 or more raw rows but fewer than 100 eligible: hidden.
- 100 eligible records with failed quality/freshness checks: hidden.
- Missing/error state: hidden without blocking other sections.

Eligible public evidence must carry the approved metric definition, source/window qualifications, sample size, and last-updated information. Do not invent a calculation window, statistical definition, or new Odoo schema: these freezes do not define them.

If the gate/calculation contract is absent, keep Evidence hidden and record the missing contract as a concrete follow-up. Do not report the evidence pipeline complete. Preserve existing collection infrastructure so it can operate before publication is eligible.

Price Strip must remain provider-agnostic and omit itself when no current attributable price is eligible. Industries must contain supportable content; otherwise omit it. Do not create marketing substitutes.

### 8. Validation

Run the repository's documented relevant checks: type checking, lint/build and focused tests as applicable. Report exact commands, results, and pre-existing failures. Do not introduce a test suite that merely repeats static copy.

Use meaningful behavior checks for composition, conditional isolation, implemented evidence boundaries, and product routes. Full-data fixtures may verify branches in an isolated test environment; label them as fixtures, not proof of live operational eligibility.

Inspect screenshots in all three locales at desktop and mobile widths. Include FA at a common laptop width and a wide desktop width; check tablet reflow. Suggested widths: 390, 768, 1366, 1920 CSS px, adjusted to the repository's supported viewport policy.

Verify:

- Correct full and reduced-data ordering, no obsolete sections or empty shells.
- Exact Buyer Value content, four promises, flat layout and responsive dividers.
- One Homepage H1; proper H2/H3 structure and list semantics.
- No clipping/overflow; complete text at 200% browser zoom.
- Text contrast, keyboard focus on real controls, locale reading order.
- Reduced motion, JavaScript disabled, and failed motion initialization.
- Product cards both present in DOM and visibly rendered when eligible.
- Valid localized product destinations; stable image ratios and loading geometry.
- Header/Hero, telephone field LTR behavior, primary RFQ routes, and Final CTA remain intact.
- No material new layout shift or unnecessary client bundle dependency.

Save and inspect screenshots; a screenshot's existence alone is not a visual pass. If browser or data access prevents a check, mark it NOT RUN or BLOCKED with the reason. Never equate build success with completed visual verification.

### 9. Deliverables and final report

Provide changed code, documentation status updates, and an implementation report in the repository's established report location. Leave changes reviewable locally. Do not create a commit unless existing session authorization or repository instructions explicitly call for one; never push or deploy in this task.

The report must contain:

1. RESULT: complete / complete with blocked verification / blocked, supported by evidence.
2. PREFLIGHT: branch, full starting HEAD, initial worktree and existing failures.
3. CHANGES: actual paths and customer-visible outcomes.
4. COMPOSITION: rendered sections and conditional omissions.
5. PRODUCT DIAGNOSIS: observed cause, evidence, fix or remaining prerequisite.
6. EVIDENCE: active threshold, quality gate status, checks, and missing infrastructure.
7. VERIFICATION: commands/results and screenshot paths by locale/viewport.
8. DOCUMENTATION: supersession notices and release checklist changes.
9. GIT: final status and any commits actually created under existing authorization.
10. RELEASE FOLLOW-UP: pending migrations, data prerequisites, and unverified gates; explicitly confirm no deploy or migration execution.

Do not claim staging readiness while product omission remains unexplained or required checks are blocked. Complete the independent local work even if an external prerequisite cannot be satisfied.

## Review checklist

- [ ] All three freezes read; exact canonical translations used.
- [ ] Current repository/branch/HEAD verified; unrelated work preserved.
- [ ] Old specification statuses updated without deleting history.
- [ ] Homepage order matches the composition freeze.
- [ ] Evaluation and standalone Process removed from Homepage; Process reusable code retained.
- [ ] Buyer Value implemented as the approved flat multilingual component.
- [ ] Product Showcase preserved and its visibility diagnosis evidenced.
- [ ] Conditional sections omit cleanly and fail independently.
- [ ] Active Evidence threshold is 100 eligible records where implemented; quality gates preserved.
- [ ] No invented public content or unqualified promises.
- [ ] Desktop/mobile FA/EN/AR screenshots inspected.
- [ ] JavaScript failure, reduced motion, zoom, keyboard, and routes checked.
- [ ] Relevant code checks pass, or limitations explicitly recorded.
- [ ] No deployment, migration execution, remote push, or production/staging data changes.
- [ ] Final report separates implemented behavior from blocked or future work.
