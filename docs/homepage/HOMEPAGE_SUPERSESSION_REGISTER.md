# Homepage Supersession & Relocation Register

**Status:** ACTIVE
**Established:** 2026-09-08 (Homepage HP-R1 reconciliation)
**Governing authority:** `docs/homepage/AHANASSA_HOMEPAGE_COMPOSITION_AND_CUSTOMER_JOURNEY_FREEZE_V1.0.md` §8
**Implementation record:** `docs/homepage/HOMEPAGE_HP_R1_RECONCILIATION_IMPLEMENTATION_REPORT.md`

This register is the single place to look up what is and is not currently part
of the Homepage, and why. It exists because Composition Freeze §8 requires that
retired or relocated components be *marked*, never deleted:

> Historical specifications and files SHOULD NOT be deleted solely because they
> are no longer active. They MUST be marked with the appropriate supersession
> or relocation status to preserve decision history.

---

## 1. Authority set

| Document | Owns |
|---|---|
| `docs/homepage/AHANASSA_HOMEPAGE_COMPOSITION_AND_CUSTOMER_JOURNEY_FREEZE_V1.0.md` | Section presence, order, message ownership, conditional rendering, removal/relocation |
| `docs/homepage/AHANASSA_HOMEPAGE_VISUAL_SYSTEM_AND_MOTION_FREEZE_V1.0.md` | Colors, surfaces, spacing, geometry, motion, progressive enhancement |
| `docs/buyer-value/AHANASSA_BUYER_VALUE_SERVICE_PROMISE_COMPONENT_FREEZE_V1.0.md` | Buyer Value copy, semantics, layout, claim safety, accessibility |
| `docs/homepage/AHANASSA_HOMEPAGE_IMPLEMENTATION_PROMPT_AND_CHECKLIST_V1.0.md` | **Procedural only** — sequence and verification. It MUST NOT redefine the three freezes above. |

Site-wide baselines that continue to apply and were not reopened:
`docs/discoverability/AHANASSA_AI_SEARCH_GEO_DISCOVERABILITY_ARCHITECTURE_GATE_V1.1.md`,
`docs/hero/AHANASSA_HERO_FINAL_FROZEN_V2.4.md`,
`AHANASSA_HEADER_FINAL_FROZEN_V2.0.md`,
`docs/pricing/AHANASSA_PRICE_STRIP_FINAL_FROZEN_V2.1.md`,
`docs/product-showcase/AHANASSA_PRODUCT_SHOWCASE_FINAL_FROZEN_V2.0.md`,
`docs/design-system/AHANASSA_BUTTON_COMPONENT_FINAL_FROZEN_V1.0.md`.

---

## 2. Current Homepage composition (frozen, §4)

```text
Global Header                       always present   app/[locale]/layout.tsx
  Hero                              always present   components/home/hero.tsx
  Price Strip           [conditional]                components/home/price-strip.tsx
  Product Showcase      required architecture        components/home/product-showcase.tsx
  Buyer Value           always present               components/home/buyer-value.tsx
  Verified Evidence     [conditional]                — not implemented, correctly omitted
  Industries / Use Cases[conditional]                components/home/reach.tsx
  Final CTA             always present               components/ui/cta-band.tsx
Global Footer                       always present   app/[locale]/layout.tsx
```

Rendered by `app/[locale]/page.tsx`. Order is asserted by
`lib/content/homepage-composition-invariants.test.ts`.

---

## 3. Supersession and relocation register

| Component / document | Homepage decision | Durable status | Files — ALL RETAINED |
|---|---|---|---|
| Evaluation / Assurance V2.1 | Removed; replaced by Buyer Value | **SUPERSEDED FOR HOMEPAGE** | `components/home/evaluation-assurance.tsx`, `lib/content/evaluation-assurance.ts`, `homepageCopy.*.evaluationAssurance`, `docs/evaluation-assurance/**` |
| Purchase Process V2.0 | Removed as an independent Homepage section | **RETAINED OUTSIDE HOMEPAGE** — reserved for `/process`. *Not* globally superseded. | `components/home/process.tsx`, `lib/content/purchase-process.ts`, `homepageCopy.*.purchaseProcess`, `docs/purchase-process/**` |
| ProcessSteps (legacy) | Not reintroduced separately | Covered by the Hero micro-journey and the future `/process` | No file exists; retired in an earlier phase |
| RiskGrid (legacy) | Excluded | Historical only | No file exists |
| RoleComparison (legacy) | Excluded | Historical only | No file exists |
| ControlPillars (legacy) | Excluded | Its customer value is handled by Buyer Value **without** restoring the old section | No file exists |
| TrustBand (legacy, generic) | Excluded as a generic trust-claim band | May return only through **eligible** Verified Evidence, never as an unsupported claim | No file exists |
| SuitabilityFaq (legacy) | Removed from the Homepage | Belongs on contextual detail pages or `/process` | No file exists |
| Capabilities / old Assurance | Retired in the Evaluation V2.1 phase | Historical only | Deleted in that earlier, separately-authorised phase |

Verified 2026-09-08: none of the legacy names above appears anywhere in
`app/`, `components/`, `lib/`, `styles/` or `config/`. Both the absence of the
rendering and the absence of the files are asserted by
`lib/content/homepage-composition-invariants.test.ts`.

**Supersession never means deletion.** Two tests exist specifically to fail if
a future change deletes a retained file:
`homepage-composition-invariants.test.ts` ("supersession removed RENDERING
only — every superseded file survives") and the equivalent assertions inside
each component's own frozen-spec invariants file.

---

## 4. Message ownership (§7 duplication gate)

| Message | Sole primary owner |
|---|---|
| What Ahan Asa does | Hero |
| Short four-step purchase path | **Hero only** — no later section may repeat it |
| Current attributable price orientation | Price Strip |
| What products can be requested | Product Showcase |
| Why choose Ahan Asa | Buyer Value |
| Proof that promises are delivered | Verified Evidence (when eligible) |
| Where/for whom the offer is relevant | Industries / Use Cases |
| Final action | Final CTA |
| Detailed purchase process | Dedicated `/process` page (does not exist yet) |

---

## 5. Conditional-section eligibility, as implemented

| Section | State on 2026-09-08 | Why |
|---|---|---|
| Price Strip | **OMITTED** | `PRICE_STRIP_ENABLED` is not `"true"`, so no DB code path runs at all. Provider-agnostic architecture untouched; no real-price provider was activated. |
| Verified Evidence | **OMITTED — no contract exists** | No evidence metric, calculation window, exclusion rule, freshness gate, sample-size gate or publication threshold exists anywhere in the repository. §6.5 forbids a marketing substitute, so nothing was invented to fill the slot. |
| Industries / Use Cases | **ELIGIBLE — renders** | `components/home/reach.tsx` renders the already-approved, non-fabricated industries list shared verbatim with `/industries` and `/markets` (`lib/content/pages.ts`). No invented projects, customers, volumes, logos or case studies. |
| Product Showcase | **Required architecture; data-driven** | Renders when the public projection returns eligible candidates; fails closed to full omission otherwise. Its absence is a data state, never an architecture change (§6.3, §18). |

### 5.1 Verified Evidence — the active threshold

The **active** publication rule is:

> at least **100 ELIGIBLE operational records** — not 100 raw rows — **plus**
> all applicable data-quality, freshness and sample-size gates.

Source: Composition Freeze §6.5 and §19.9, and the Implementation Checklist §1
("A raw-row count of 100 is insufficient. Earlier references to 1000 are
historical, not the active requirement").

There is **nothing to align** in code today: no threshold constant, gate or
metric definition exists to update. Historical documents mentioning 1000 are
left unedited as history. When the contract is first authored it must satisfy,
at minimum, the checklist §7 boundary table: 99 eligible → hidden; 100 eligible
with all gates passing → may display; ≥100 raw but <100 eligible → hidden; 100
eligible with a failed quality/freshness check → hidden; missing/error →
hidden without blocking other sections.

---

## 6. Pending / not done in this phase

| Item | Status |
|---|---|
| `migrations_public/0010_homepage_eligibility.sql` | **PENDING remote application.** Applied to a local disposable D1 only, for diagnosis. Must not be marked applied. |
| Verified Evidence component + publication contract | Not started. Deliberately deferred. |
| Industries / Use Cases redesign | Not started. Current safe output preserved as-is. |
| Final CTA redesign | Not started. Present and compliant; no redesign was required. |
| Footer redesign | Not started. Two known defects recorded in the GEO-G0 audit remain open — see the implementation report's FOOTER FOLLOW-UP. |
| `/process` route and page | Not created. Purchase Process V2.0 is reserved for it. |
| Organization/WebSite schema emitted only from the noindex homepage | Known GEO-G0 defect, deliberately not fixed here — see PRE-STAGING GEO FOLLOW-UP in the implementation report. |

---

## 7. Change control

Per Composition Freeze §18, a versioned supersession is required to:

- add or remove a Homepage section;
- change the frozen order;
- return Purchase Process or Evaluation / Assurance to the Homepage;
- transfer a primary message from one component to another;
- weaken conditional evidence or catalog eligibility behavior;
- replace the single primary RFQ conversion goal.

And, critically:

> An implementation bug, missing local data, or temporary deployment state MUST
> NOT be recorded as an architecture change.
