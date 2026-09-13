# Homepage Supersession & Relocation Register

**Status:** ACTIVE
**Established:** 2026-09-08 (Homepage HP-R1 reconciliation)
**Last updated:** 2026-09-13 (Footer redesign status corrected to Done, FOOTER-P0/P1 — CI-CD-P1 governance pass; previously 2026-09-12, Final CTA V1.0, CTA-P1)
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
| `docs/industries/AHANASSA_INDUSTRIES_USE_CASES_COMPONENT_FREEZE_V1.0.md` | Industries / Use Cases copy, sector order, semantics, layout, image policy, publication gate |
| `docs/final-cta/AHANASSA_FINAL_CTA_COMPONENT_FREEZE_V1.0.md` | Final CTA copy, destinations, button hierarchy, Navy surface, Footer boundary, claim safety, accessibility |
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
  Industries / Use Cases[conditional]                components/home/industries.tsx
                                                     (implemented; omitted — no reviewed imagery)
  Final CTA             always present               components/home/final-cta.tsx
                                                     (frozen V1.0; no eligibility gate of any kind)
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
| Reach ("markets" band) | Removed; replaced in the Industries slot by Industries / Use Cases V1.0 | **SUPERSEDED FOR HOMEPAGE** — *not* globally superseded: the industry lists it renders still serve `/industries` and `/markets` | `components/home/reach.tsx`, `homepageCopy.*.reach`, `marketsCopy`/`industriesCopy` in `lib/content/pages.ts` |
| CtaBand (shared closing CTA band) | Removed from the Homepage only; the Final CTA slot is now filled by Final CTA V1.0 | **REPLACED FOR THE HOMEPAGE ONLY — explicitly NOT superseded.** `components/ui/cta-band.tsx` is a SHARED component and remains fully live, unchanged, on six other pages. See §3.1. | `components/ui/cta-band.tsx` and its own `defaults` copy table — untouched |
| ProcessSteps (legacy) | Not reintroduced separately | Covered by the Hero micro-journey and the future `/process` | No file exists; retired in an earlier phase |
| RiskGrid (legacy) | Excluded | Historical only | No file exists |
| RoleComparison (legacy) | Excluded | Historical only | No file exists |
| ControlPillars (legacy) | Excluded | Its customer value is handled by Buyer Value **without** restoring the old section | No file exists |
| TrustBand (legacy, generic) | Excluded as a generic trust-claim band | May return only through **eligible** Verified Evidence, never as an unsupported claim | No file exists |
| SuitabilityFaq (legacy) | Removed from the Homepage | Belongs on contextual detail pages or `/process` | No file exists |
| Capabilities / old Assurance | Retired in the Evaluation V2.1 phase | Historical only | Deleted in that earlier, separately-authorised phase |

Verified 2026-09-08, re-verified 2026-09-12 (IND-P1): none of the legacy names
above appears anywhere in `app/`, `components/`, `lib/`, `styles/` or
`config/`. Both the absence of the rendering and the absence of the files are
asserted by `lib/content/homepage-composition-invariants.test.ts`.

Reach joined the register in IND-P1 on the same terms as Evaluation / Assurance
and Purchase Process before it: its files are RETAINED rather than absent.
CtaBand joined in CTA-P1 on stricter terms still — retained AND still rendering
elsewhere; see §3.1.

### 3.1 CtaBand — a replacement, NOT a supersession

`components/ui/cta-band.tsx` is the one entry in the table above that is **not**
superseded in any sense. It is a **shared** component, and rewriting its copy,
destination or visual treatment in place would silently have changed six pages
that Final CTA V1.0 does not govern:

```text
app/[locale]/products/page.tsx
app/[locale]/products/[slug]/page.tsx
app/[locale]/industries/page.tsx
app/[locale]/markets/page.tsx
app/[locale]/about/page.tsx
app/[locale]/services/page.tsx
```

All six still import it and still render `<CtaBand locale={locale} />`
unchanged, with its own approved copy ("فاکتور یا لیست خرید دارید؟" /
"Have an invoice or purchase list ready?" / "هل لديك فاتورة أو قائمة شراء
جاهزة؟"), its own `/contact` destinations and its own photographic Navy-800
treatment. **Only the Homepage's USE of it was replaced** — the Homepage simply
stopped importing it, exactly as it stopped importing `reach.tsx` and
`evaluation-assurance.tsx` before it. Not one byte of `cta-band.tsx` changed in
CTA-P1.

Final CTA V1.0 §13 ("Reuse the current Final CTA component ... where
practical; do not create a duplicate section") is satisfied by this reading:
there is exactly ONE closing conversion block on the Homepage, and the frozen
V1.0 copy, `/request` destination, `tel:` secondary action, flat Navy surface
and Cream/outline button hierarchy are all incompatible with what the six other
pages still need from the shared band. A per-page conditional inside one shared
component would have been the duplicate-behavior trap, not the avoidance of it.

Both halves are asserted by tests: `lib/content/final-cta-frozen-spec-invariants.test.ts`
("components/ui/cta-band.tsx is NOT superseded, NOT modified, and still serves
six other pages") and `lib/content/homepage-composition-invariants.test.ts`
("the shared CtaBand is no longer the Homepage's closing CTA, but is UNCHANGED
and still serves six other pages").

---

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
| Industries / Use Cases | **PUBLISHED — gate closed 2026-09-12** | `components/home/industries.tsx` implements the frozen V1.0 three-sector composition with complete FA/EN/AR copy. Industries V1.0 §10 gates publication on approved scope + complete localized copy + **reviewed imagery** + a server-side enable state. All four are now met: the owner supplied and approved three sector images on 2026-09-12, and they were imported under `public/images/industries/` with full provenance records in `lib/media/provenance-registry.ts` — this repository's first media registry (`01-sources/MEDIA_GUIDELINES.md` §27). That registry is what unblocked publication: the section was never short of pictures, it was short of *provenance*, and §5's "Unknown provenance defaults to `restricted`" made every unrecorded asset unpublishable. The section now renders in fa/en/ar. See §5.2 below. |
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

### 5.2 Industries / Use Cases — the image gate, now CLOSED

**Status: RESOLVED 2026-09-12.** The gate described here through IND-P1 is
closed; the section publishes. Kept as history, not as an outstanding item.

The owner supplied three approved sector images. Each was visually inspected
against its V1.0 §8 slot subject, copied (never moved) from the owner's
originals, renamed descriptively, and recorded in the provenance registry:

| Slot | Required subject (V1.0 §8) | Must not be | Asset now published |
|---|---|---|---|
| `construction` | A building site, structural steel erection or reinforcement context | A steel yard or logistics scene | `/images/industries/construction-site.png` — steel-frame building under construction, rebar and stock sections in the foreground |
| `petrochemical-oil-gas` | An industrial process facility / piping context | A **steel mill** — that is a different sector | `/images/industries/petrochemical-facility.png` — process towers and elevated pipe racks; **not** a steel mill |
| `manufacturing-fabrication` | A workshop, steel fabrication or production line context | A storage warehouse | `/images/industries/fabrication-workshop.png` — radial drill press working a steel I-beam; **not** storage |

All three are natively 1448×1086 = exactly 4:3, so the `object-cover` treatment
crops nothing and no focal-point override was needed. None is a Hero image, a
product packshot, a collage or an icon illustration; none carries a visible
customer logo or any legible text; all render with empty `alt` as decorative
sector illustration; and none is captioned or described as a real Ahan Asa
project (§8; `01-sources/MEDIA_GUIDELINES.md` §4.4 and §29). Each registry
record carries `notAhanAsaProjectEvidence: true` as an explicit, test-enforced
flag rather than prose.

**What actually unblocked it was the registry, not the pictures.** IND-P1 was
blocked because NO asset anywhere in this repository carried recorded
provenance, and §5 states "Unknown provenance defaults to `restricted`" while
`restricted` media "Must not be published". `lib/media/provenance-registry.ts`
is the repository's first implementation of `MEDIA_GUIDELINES.md` §27, and it
enforces that §5 default in code: unknown provenance, restricted rights or a
non-approved status resolve to `restricted` regardless of the truth class a
record claims for itself. The three assets are classified `conceptual` — the
conservative floor, because nothing supplied with them establishes whether they
are photographs or generated imagery, and asserting `verified-context` without
evidence would itself be fabricated provenance.

The IND-P1 rejections still stand and must not be revisited: substituting a
near-miss repository photograph, fabricating provenance, hotlinking an external
image, and shipping a gradient placeholder. Full inventory and reasoning:
`docs/industries/INDUSTRIES_P1_V1_0_IMPLEMENTATION_REPORT.md`; the unblock
itself: `docs/industries/INDUSTRIES_MEDIA_UNBLOCK_AND_P2_FREEZE_REPORT.md`.

The ~21 pre-existing images under `public/images/` remain **unregistered and
therefore still unclassified**. Publishing them into any new surface requires
recording their provenance first; their absence from the registry is the honest
state and does not retroactively bless them.

---

## 6. Pending / not done in this phase

| Item | Status |
|---|---|
| `migrations_public/0010_homepage_eligibility.sql` | **PENDING remote application.** Applied to a local disposable D1 only, for diagnosis. Must not be marked applied. |
| Verified Evidence component + publication contract | Not started. Deliberately deferred. |
| Industries / Use Cases redesign | **Done and PUBLISHED.** Frozen V1.0 implemented and wired in IND-P1; the image gate in §5.2 was closed on 2026-09-12 and the section now renders in fa/en/ar. |
| Final CTA redesign | **Done (CTA-P1).** Frozen V1.0 implemented as `components/home/final-cta.tsx` and wired as the last Homepage content section. No eligibility gate, no data dependency, no outstanding asset. See `docs/final-cta/FINAL_CTA_P1_V1_0_IMPLEMENTATION_REPORT.md`. |
| Footer redesign | **Done (FOOTER-P0/P1).** Narrow reconciliation complete — stale product links, the EN/AR Persian-category localization leak, verified phone, and heading hierarchy addressed; both defects the GEO-G0 audit and the HP-R1 FOOTER FOLLOW-UP flagged are resolved. See `docs/footer/FOOTER_P1_RECONCILIATION_IMPLEMENTATION_REPORT.md`. |
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
