# PRICE-P0 — Variant Identity + Freshness Policy Architecture Gate

Date: 2026-09-04
Repository: `/Users/reza/Developer/ahanassa-website`
Task type: **READ-ONLY ARCHITECTURE GATE** — zero files modified, zero commits, zero pushes.

# RESULT

`PRICE-P0 ARCHITECTURE GATE: PARTIAL`

# PREFLIGHT

```
pwd                        -> /Users/reza/Developer/ahanassa-website
git branch --show-current  -> feat/header-frozen-v2
git rev-parse HEAD         -> 0900270da65ef50be077a6667bacded9cb3024ce
git status --short         -> ?? docs/pricing/PRICE_STRIP_V2.1_AUDIT.md
```

That one untracked file is the prior-task audit report (unmodified, unaltered, not touched this session) — not disruptive to a read-only gate. No other dirty files.

`git log --oneline --decorate -10`:
```
0900270 (HEAD) docs: record P6/P7 Header services evidence reports
a2f6c7e docs: record P5 durability checkpoint
4108449 feat: connect Header services to DB_PUBLIC processing groups
2967d37 feat: add DB_PUBLIC processing sync and read model
b18d0a6 wip: checkpoint frozen header v2 before lineage repair
06921a2 fix: restore LTR phone control and RFQ/Next-Steps/Head-Office order
2d0ffbd fix: harden migration 0006 ...
ebffff9 fix: atomic slug redirects, HTTP 308 semantics, demand-score reconciliation
57346e4 fix: make Cron Trigger config explicit per environment, empty on staging
e686326 feat: harden homepage product projection and routing
```

Lineage confirmed present in history: Contact/RFQ fix (`06921a2`), Frozen Header v2 (`b18d0a6` + subsequent), Processing P5 (`2967d37`), P6 (`4108449`), P7 evidence (`0900270`). Matches.

# SPEC DURABILITY

`docs/pricing/AHANASSA_PRICE_STRIP_FINAL_FROZEN_V2.1.md` does **not** exist. `find`/`grep` across `docs/`, `01-sources/`, and the full tree found no file matching "FROZEN V2.1" for pricing anywhere.

**SPEC NOT DURABLE IN REPO.**

Analysis below uses the V2.1 requirements as stated in the audit task's own context, exactly as instructed. Not created here.

> **Provenance update (2026-09-04, added during the subsequent Spec Reconciliation task — historical finding above left unaltered):** the real owner-approved artifact was located and committed at `docs/pricing/AHANASSA_PRICE_STRIP_FINAL_FROZEN_V2.1.md` after this gate ran. The statement above was accurate at the time this gate executed — the file genuinely did not exist in the repo yet — and is preserved as historical record, not corrected in place.

# CURRENT PRICE IDENTITY

Exact chain, verified against real source:

```
IncomingPriceQuote.providerProductRef  (provider's own string)
        ↓  [product-mapping.ts#resolveProductKey]
price_product_mappings (provider_id, provider_product_ref) → product_key   [TEXT, manually curated]
        ↓
public_price_quotes.product_key  /  price_display_products.product_key    [TEXT — documented, by convention only, as a "template_xid"]
        ↓  [repository.ts → getPublishedCatalogTemplateTitleByXid(locale, product_key)]
catalog_products  (matched by template_xid — TEMPLATE level, cp.is_active/cp.is_public only)
        ↓
PublicPriceStripItem.title / .href
```

| Hop | Field | Table | Type | Template or Variant | Stable | Publication-gated |
| --- | --- | --- | --- | --- | --- | --- |
| 1 | `provider_product_ref` | (incoming payload) | string, provider-flavored | Neither — provider's own ref | Only as stable as the provider makes it | No |
| 2 | `product_key` (mapping target) | `price_product_mappings` | TEXT, curated | **Documented as `template_xid`** | Yes (manually curated, PK) | No — this table itself has no publication gate |
| 3 | `product_key` | `public_price_quotes`, `price_display_products` | TEXT | **Template** | Yes | No — the quote/display tables have no `is_public` check of their own |
| 4 | `template_xid` | `catalog_products` | TEXT, `NOT NULL UNIQUE` | **Template** | Yes | Yes — `getPublishedCatalogTemplateTitleByXid` checks `cp.is_active=1 AND cp.is_public=1` |

**Critical finding:** at no point in this chain does a **variant-level** identity (`product_variants.xid`) appear. `product_key` is template-only, confirmed by the function name and parameter naming (`getPublishedCatalogTemplateTitleByXid(locale, templateXid)`) that `repository.ts` calls with `display.product_key` as the `templateXid` argument.

# TEMPLATE VS VARIANT ANALYSIS

Verified directly against `migrations_public/0001_catalog_schema.sql` (superseded) and the **actually active** `migrations_public/0002_catalog_v1_contract.sql`:

- **`catalog_products`** — one row per Odoo `product.template`. `template_xid` (e.g. `"...product_tmpl_rb_aj340"`) is the durable, `NOT NULL UNIQUE` identity. This is a **product family**, e.g. "Ribbed Rebar Aj340 (A2)" — covers every diameter/length of that grade together.
- **`product_variants`** — one row per Odoo `product.product` (sellable variant), FK to `catalog_products`. `xid` (`product_variant_xid`) is its own durable, `NOT NULL UNIQUE` identity, distinct from the template's. Carries `commercial_size`, `section_size`, `grade_code`/`grade_name`, `standard_code`/`standard_name`, `dimensions_json` (e.g. `diameter_mm`), `nominal_weight_json`, `sku` — i.e., exactly the fields that distinguish one size/spec from another within the same template.
- **Publication:** template-level (`catalog_products.is_public`) and variant-level (`product_variants.is_public`) are **independent flags** — a template can be public while individual variants under it are or aren't.
- **Public route:** `/products/[slug]/page.tsx` resolves `slug` against `catalog_products.slug_fa` (via `product_seo_contents`) — **template-level route**. But the page already accepts and uses `?variant={xid}` (`searchParams.variant`), matched against `variants.find(v => v.xid === requestedVariantXid)`, to highlight and scroll-anchor one specific variant row within that template's spec table (`VariantSpecTable`) — **an already-built, already-proven variant-selection-on-a-template-page mechanism**, not something new being proposed.
- **RFQ precedent:** `lib/rfq/item-row-validation.ts`/`catalog-preselection.ts` already carry **both** `templateXid` and `variantXid` side by side per line item — the exact "dual identity" pattern this gate is evaluating for pricing already exists, proven, and shipped for RFQ.

**A price may legitimately link to a template-level page while pricing an exact variant — this is not hypothetical; the routing mechanism for it already exists and is already used elsewhere in this exact codebase.**

# BENCHMARK PRECISION TEST

Given `product_key` is template-only:

- **Rebar A3 size 14 vs 16 vs 18:** if all three sizes exist under one `product_tmpl_rb_aj340` template (the realistic case — a rebar template groups all diameters of one grade), **all three would collapse into the same `product_key`**. `price_display_products` has no column capable of distinguishing them. **Cannot be uniquely priced today.**
- **IPE 14 vs IPE 16:** same failure mode if both sizes share a template.
- **Plate 8mm vs 10mm:** same failure mode — `dimensions_json.thickness_mm` differs only at the variant level, invisible to the pricing schema.
- **SHS 40×40×2 vs 40×40×3:** same failure mode — wall thickness is a variant-level `dimensions_json` field.

None of this requires free-text parsing to resolve *if* variant identity is used — the precision already exists in `product_variants`; it's simply never referenced by the pricing tables today.

**CURRENT IDENTITY PRECISION: INSUFFICIENT** (for the stated benchmark directions, which are explicitly size-specific, not family-generic).

# RECOMMENDED IDENTITY CONTRACT

| | Option A (template-only) | Option B (variant-only) | Option C (dual: template for nav, variant for price) |
| --- | --- | --- | --- |
| Correctness | Fails the benchmark precision test | Correct | Correct |
| Migration impact | None | Moderate — `product_key` semantics change under existing (empty) tables | Small — add one nullable/required variant-identity column alongside the existing template one |
| Compatible with current Catalog architecture | N/A | Loses the template-level grouping the catalog/routing already relies on | **Matches it exactly** — mirrors how `catalog_products`/`product_variants` already coexist |
| Future benchmark curation | Cannot express "this exact size" | Can, but loses convenient template-level display grouping/title fallback | Can, and keeps both |
| Quote basis integrity | Ambiguous — a quote_key's basis fields (unit/market/delivery) can't compensate for a missing size dimension | Sound | Sound |
| RFQ handoff consistency | Diverges from RFQ's own model | Diverges (RFQ keeps template context too) | **Matches RFQ's existing `templateXid`+`variantXid` pattern exactly** |
| Odoo/provider mapping | Provider only ever needs to reference *a* product, ambiguously | Provider must supply variant-precise refs (reasonable — real providers quote specific SKUs) | Same requirement as B, with template kept as a derived/looked-up value, not a second thing the provider must supply |
| Future product-page pricing (e.g. showing a variant's own price on its detail page) | Not supportable without rework | Directly supportable | Directly supportable |

**Recommendation: Option C — dual identity.** `price_display_products`/`public_price_quotes` should carry the exact variant identity (`product_variants.xid`) as the commercial-price anchor, while the public title/link continues to resolve through the template (`catalog_products`) for navigation — using the already-existing `?variant={xid}` query mechanism to point at the specific variant within that template page. This is not a new pattern; it's applying RFQ's own proven dual-identity model to pricing.

# SPECIFICATION SOURCE

Evaluated against the four options:

- **A (provider free text):** explicitly forbidden by the frozen law ("provider free-text must not become commercial product identity") and already architecturally blocked (`provider_title` is documented/coded as audit-only, never surfaced).
- **B (`price_display_products` manual text):** viable only as a documented-exception fallback (mirroring the existing `title_override_*` pattern for products with no catalog match at all) — should not be the default path, since it would duplicate data the Catalog already owns and risks drifting from the real synced values.
- **C (authoritative Product Variant/Catalog projection):** **recommended.** `product_variants` already stores `commercialSize`, `sectionSize`, `grade` (code+name), `standard` (code+name), `dimensions` (parsed JSON — e.g. `diameter_mm`), `nominalWeight` — synced verbatim from the real Odoo Public Catalog API, already used by `VariantSpecTable` to render exactly this information on product detail pages today. No new duplicate spec field needs inventing.
- **D:** effectively the same recommendation as C, since C already is "another existing public catalog descriptor."

**Recommendation:**
- Public product name → `catalog_products` (template, via the existing title-by-xid function) — unchanged, still correct.
- Grade / size / dimensions / benchmark spec line → `product_variants` (via the exact variant xid, once identity is fixed per the recommendation above) — reuse the existing fields, do not duplicate them into the pricing schema.

# ROUTING DECISION

Current routes support:
- Template-level page (`/products/[slug]`) — exists.
- **Product page with selected-variant query/state** (`?variant={xid}`) — **already exists and already works**, proven by the current `VariantSpecTable`/`highlightedVariant` code path.
- Category route (`/products?category=...`) — exists as the display-override fallback.
- Dedicated variant-level route — does **not** exist (`product_variants.slug_fa` is optional/nullable — "not every variant needs its own indexable page," per the migration's own comment).

**Recommendation:** Price Card should link to `/products/{template_slug}?variant={variant_xid}` when a real variant mapping exists — reusing the existing mechanism exactly, adding zero new routes, while the card's own visible text (title + specification) makes the exact benchmarked variant unambiguous regardless of what the URL alone shows. **No new route is required.**

# CURRENT FRESHNESS MODEL

Verified directly from source (re-confirmed this session, not assumed from memory):

- `lib/pricing/quote-selection.ts` and `lib/pricing/repository.ts` **each independently declare** `STALE_THRESHOLD_MS = 24 * 60 * 60 * 1000` — a literal, duplicated, hardcoded 24-hour constant.
- **Boolean only:** `isFresh = (now - effectiveTimestamp) <= 24h`. No AGING tier exists in any type, function, or table.
- **Stale fallback is displayed, not hidden:** `selectWinningQuote` explicitly returns the highest-priority stale candidate when no fresh one exists (documented, intentional, tested behavior — `docs/pricing/PRICE_PROVIDER_CONTRACT.md` §10 point 4); `repository.ts` includes it with `isStale: true`; `price-strip.tsx` renders it with a "قیمت قدیمی"/"older price" label.
- **No provider-specific cadence** — the same 24h constant applies uniformly regardless of `provider_id`.
- **No market/business-calendar model** of any kind exists anywhere in this codebase (grep-confirmed — "cadence"/"business calendar"/"market calendar" appear nowhere as real data models, only in unrelated comments).
- **Freshness is computed at read time**, correctly in `quote-selection.ts`/`repository.ts`, **not** in the React component — this part of the architecture is already correctly placed.

All of this matches — and confirms — the audit finding the task asked to be verified, not assumed.

# RECOMMENDED FRESHNESS POLICY OWNERSHIP

| Option | Operational clarity | Data ownership | Handles provider differences | Handles benchmark differences | Maintainability | D1 complexity | Testability |
| --- | --- | --- | --- | --- | --- | --- | --- |
| A — hardcode in TS | Poor — a deploy is required to change cadence for any reason | None (code is the only "record") | No — one constant for everyone | No | Poor at scale | None | Easy but brittle |
| B — persist in `price_display_products` | Confuses "what to show" with "how the source publishes" — a display-config table isn't the natural home for source cadence | Mixed with curation concerns | Only if duplicated per display row (fragile — same provider, different cadence per row, is a data-integrity risk) | Yes | Moderate | Low | Moderate |
| C — persist in provider/source configuration | Correct separation — cadence is a property of the *source*, not of what's curated for display | Matches reality (Odoo intraday, external bulletin daily, benchmark monthly — these are source properties) | **Yes, cleanly** | Only indirectly | Good | Low-moderate (one new small table or extend `price_sync_state`) | Good |
| D — dedicated policy table/model | Most flexible, but likely over-built for the current single-stub-provider reality | Cleanest in the abstract | Yes | Yes | Good, but more moving parts than needed today | Moderate-high | Good |
| E — hybrid (provider default + benchmark override) | Best of both — a sane default per source, with an explicit, rare override for a specific benchmark that genuinely needs one | Correct primary ownership (source), with a documented, narrow exception (mirrors the existing `title_override_*` exception pattern already used elsewhere in this schema) | Yes | Yes, when actually needed | Good | Low-moderate | Good |

**Recommendation: Option E**, structured as Option C's core (provider-level cadence config) with an optional per-`price_display_products`-row override — this mirrors a pattern this schema **already uses** for a different concern (`title_override_fa/en/ar` as a narrow, documented exception over the default catalog-resolved value). Prefer the smallest model that stays correct: start with provider-level cadence only; add the override column only once a real benchmark genuinely needs one, not speculatively.

# REQUIRED POLICY DATA

| Candidate | Classification | Reasoning |
| --- | --- | --- |
| `cadence_type` (e.g. `intraday`/`daily`/`weekly`/`monthly`) | **REQUIRED NOW** | The minimum vocabulary needed to distinguish an Odoo intraday quote from a monthly external benchmark — without it, no non-hardcoded classification is possible at all |
| `cadence_interval` (numeric, e.g. hours between expected publications) | **REQUIRED NOW** | Needed to compute "one cycle missed" (AGING) vs "two+ cycles missed" (STALE) — the actual mechanism the frozen law depends on |
| `expected_publication_time` (time-of-day) | DEFER | Refines *when* within a day a cycle is "due," but a cycle-count-based cadence (missed N intervals) is sufficient for a correct FRESH/AGING/STALE classification without this precision |
| `timezone` | DEFER | Only matters once `expected_publication_time` is introduced; Iran-only sources today make this low-value now |
| `market_calendar` (full holiday engine) | DEFER (explicitly, see BUSINESS CALENDAR DECISION below) | Task itself frames this as something to avoid over-engineering |
| `grace_cycles` (how many missed cycles before AGING→STALE, if not simply "1 vs 2+") | **REQUIRED NOW** | The frozen law itself defines this numerically ("one cycle missed" vs "two or more") — needs to be a named, not implicit, value even if it starts as a fixed default per cadence type |
| `source/provider policy id` (FK linking a quote to its cadence policy) | **REQUIRED NOW** | Without this, cadence can't be looked up per quote at read time at all — this is the join key the whole model depends on |
| `benchmark override` (per-`price_display_products`-row cadence override) | DEFER | Only needed once a real benchmark's cadence genuinely diverges from its provider's default — no evidence that's true today (no real provider/benchmark exists yet) |
| `last source publication timestamp` | **ALREADY EXISTS** — `public_price_quotes.source_timestamp` | No new field needed; this is the freshness *authority* already |
| `last successful sync timestamp` | **ALREADY EXISTS** — `public_price_quotes.synced_at` / `price_sync_state.last_success_at` | No new field needed; already the documented fallback-only signal |

# BUSINESS CALENDAR DECISION

- **A (full holiday/calendar engine now):** rejected — no real provider exists yet to even know what calendar rules would apply; building this now is pure speculation, directly against the task's own "do not over-engineer" instruction.
- **B (provider-level expected publication weekday/time schedule):** the correct minimal fit — "this source normally publishes on business days" is expressible as part of the same `cadence_type`/`cadence_interval` policy (e.g., a `daily` cadence naturally tolerates a weekend gap if the interval is expressed in *expected cycles*, not raw wall-clock hours — a Friday→Monday gap is "one missed cycle" under a business-day-aware daily cadence, not "3 missed 24h windows").
- **C (simple cadence model with explicit market-days later):** effectively B done incrementally — start with a plain interval-based cadence; add explicit weekday awareness only if a real provider's actual publication pattern demonstrates the need.
- **D (another existing calendar utility):** none exists in this codebase to reuse (confirmed by search).

**Recommendation: B, implemented incrementally as C** — a cadence expressed in "expected cycles," not raw elapsed hours, is enough to avoid the flat-24h weekend-penalizing bug without building a calendar engine. This is the smallest correct fix.

# FRESHNESS CALCULATION LOCATION

Comparing the five candidate layers:

- **Provider adapter:** wrong — this layer doesn't know about display curation or read-time "now."
- **Sync normalization:** wrong — this runs only when a sync happens, and (per the No-Sync Stale Transition problem below) freshness must be able to advance even when no sync runs.
- **DB_PUBLIC persisted projection:** wrong as the *sole* source of truth for state, right as the source of the *inputs* (timestamp + policy) freshness is computed from.
- **Repository/read model:** **correct** — this is where it already lives (`quote-selection.ts`/`repository.ts`), and where it must continue to live, since it's the only layer that runs on every request with a fresh "now."
- **React component:** explicitly forbidden by the frozen law, and already correctly avoided today.

**Recommendation:** policy (cadence config) is **persisted** (provider-level table/columns); freshness **state** is **derived at read time** in the repository layer from `(now, source_timestamp, cadence policy)` — never stored as a static value. `source_timestamp` remains authoritative; `synced_at` remains fallback-only, exactly as today.

# PERSISTED VS DERIVED STATE

- **A (persist `freshness_state` in DB_PUBLIC):** fails the critical scenario — if state is written only during sync and no sync runs for 2 days, a quote that should have decayed FRESH→AGING→STALE would still show its last-computed (stale) state, silently wrong, until the next sync happens to run. This is exactly the bug the task is warning against.
- **B (derive at read time from persisted policy + source timestamp):** **correct** — every homepage request recomputes `now - source_timestamp` against the persisted cadence policy, so state is always accurate regardless of when the last sync ran or whether the provider is currently down.
- **C (compute during sync, persist until next sync):** same failure mode as A.

**Recommendation: B.** This is also consistent with what the current code already does correctly for the simple boolean case (`repository.ts` computes `isStale` fresh on every call) — the fix is to make the *classification logic* richer (cadence-aware, 4-state), not to change *when* it's computed.

# NO-SYNC STALE TRANSITION

Directly answered: a quote becomes AGING then STALE **purely by wall-clock time passing**, with **zero** dependency on a new sync arriving — because state is derived at read time (per above), every single homepage render recomputes `now - source_timestamp` against the cadence policy fresh. If the provider has been down for a week and no sync has run, the very next homepage request will correctly compute STALE (and hide the card) without any new quote ever needing to arrive. **Read-time classification is sufficient and correct**; no separate "scheduled freshness reconciliation" job is needed, since nothing needs to be pre-computed or written anywhere — the classification is cheap, pure arithmetic against already-persisted values.

# SOURCE TIMESTAMP VS SYNC TIMESTAMP

- **`source_timestamp`** — the provider's own effective/as-of time. **The freshness authority**, today and going forward.
- **`synced_at`** — when the website's own sync last touched this row. **Documented fallback only**, used exclusively when a provider supplies no `source_timestamp` at all.

**Audited current behavior:** `repository.ts`'s `effectiveTimestamp = winner.sourceTimestamp ?? winner.syncedAt` — correctly falls back only when `source_timestamp` is null, never overrides a present one. **No path found where `synced_at` incorrectly makes an old quote look fresh** — a provider re-syncing an unchanged old value would carry its own unchanged `source_timestamp` forward (the orchestrator never rewrites `source_timestamp` independent of the incoming record), so a stale source value stays correctly stale even after a fresh sync run touches the row. This part of the architecture is already sound and should be preserved unchanged.

# PROVIDER-AGNOSTIC REVIEW

The recommended Option E (provider-level cadence + rare override) keeps the UI and repository layer completely agnostic — `quote-selection.ts`/`repository.ts` would read "this candidate's provider has cadence X" generically, never branching on `provider_id === "odoo"` or any specific source's identity. An Odoo intraday quote, a daily external bulletin, and a monthly benchmark all flow through the exact same classification function with different policy inputs — **no UI change required per source type**, matching the task's own stated requirement.

# PUBLIC READ-MODEL IMPACT

Minimal proposed future `PublicPriceStripItem` shape, keeping only what the UI genuinely needs (operational/provenance fields stay internal):

```ts
interface PublicPriceStripItem {
  templateId: string;        // for the page link (existing concept, renamed for clarity)
  variantId?: string;        // NEW — for the ?variant= query and exact spec resolution; optional only for the documented no-catalog-match exception path
  title: string;              // unchanged — template-resolved
  specification?: string;     // NEW — derived from the variant's grade/size/dimensions, not a duplicated stored field
  priceToman: number;         // unchanged
  unit: string;                // unchanged
  marketOrLocation?: string;   // NEW — currently computed but dropped before reaching this type
  deliveryBasis?: string;      // NEW — same
  effectiveTimestamp: string;  // unchanged — still source_timestamp-authoritative
  freshnessState: "fresh" | "aging" | "stale"; // NEW — replaces the current boolean; "stale"/"unavailable" items are filtered out before this type is ever constructed, so in practice only "fresh"/"aging" ever appear here
  href?: string;                // unchanged in spirit, now composed as `/products/{slug}?variant={variantId}` when a variant mapping exists
}
```

`isStale: boolean` is retired in favor of `freshnessState`, since a boolean cannot express AGING. Provenance fields (`provider_id`, `quote_key`, raw `providerTitle`, cadence policy internals) remain firmly server-side, never added to this type.

# DB MIGRATION DECISION

**MIGRATION REQUIRED: YES.**

The existing schema (0004) cannot represent the required policy/identity correctly, for two independent reasons:

1. **Identity:** `price_product_mappings.product_key`/`price_display_products.product_key`/`public_price_quotes.product_key` are `TEXT` columns with no structural distinction between "this is a template xid" and "this is a variant xid" — there is no column today capable of holding an exact variant reference alongside the template one. A new column (e.g. `variant_key`, nullable for the documented no-catalog-match exception) is needed on at least `price_product_mappings` and `price_display_products`.
2. **Freshness policy:** no table today can express `cadence_type`/`cadence_interval`/a provider→policy relationship at all — `price_sync_state` tracks *operational* sync state (lease, last attempt/success/failure), not *commercial publication cadence*, and conflating the two would be a layering violation. A new small table (or a targeted `ALTER TABLE ... ADD COLUMN` set on a provider-config-shaped table) is needed.

Both changes are **additive** — new nullable columns / a new table alongside the existing, still-empty 0004 tables — consistent with this repository's own established "never DROP a table with real data, always additive" convention (explicitly documented in 0002's own header, which itself was a one-time exception justified only by both tables being verified empty at the time).

# ODOO IMPACT

**ODOO CHANGE REQUIRED: FUTURE ONLY.**

- Does the current public Catalog projection already expose stable variant XID? **Yes** — `product_variants.xid` (`product_variant_xid`) is already synced, real, stable, and unique today, entirely independent of pricing.
- Does the Odoo price provider eventually need to emit variant identity? **Yes, once it's real** — but `odoo-price-provider.ts` is currently a non-functional stub (throws `ProviderNotConfiguredError`); this requirement is inherited by whatever future Odoo-side price API gets built (already flagged in `PRICE_PROVIDER_CONTRACT.md` §14 as needing "a stable external reference matching `product_variants.xid`" — that document *already anticipated* variant-level identity, even though the current `product_key` plumbing doesn't yet honor it end-to-end).
- Does `price_product_mappings` fully isolate this from the Odoo API shape? **Yes** — the mapping table is the correct isolation boundary regardless of what identity shape a future provider emits; only `product-mapping.ts`'s resolution target needs to change (to also resolve/require a `variant_key`), not anything upstream of it.

No Odoo change is needed for the website-side schema/policy hardening this gate is evaluating — only for eventually making the Odoo price provider itself real, which is already out of scope and already documented as such.

# SECURITY / PRIVACY

The recommended additions (`variant_key`, `cadence_type`/`cadence_interval`, a provider-policy table) are all **public-operational metadata** — a variant identity is the same public identity already exposed on product detail pages; a cadence type/interval describes *how often a source publishes*, not any commercial-sensitive detail. None of the candidates evaluated above touch supplier identity, internal cost, margin, private capacity, negotiation terms, or private commercial notes — consistent with the existing schema's own discipline (verified in the prior audit: zero cost/margin/supplier columns exist anywhere in DB_PUBLIC). Freshness configuration does not need to be rendered publicly (only the derived `freshnessState` does) — the raw cadence numbers can stay purely internal/operational if desired, though there's no privacy reason they couldn't be public either.

# REQUIRED TEST MATRIX

**Variant identity:**
- Same template, two variants with different `dimensions_json.diameter_mm` map to two distinct, non-colliding price entries.
- A provider mapping resolving to a variant that doesn't belong to the mapping's declared template is rejected (data-integrity guard).
- Provider free text (`providerTitle`) never influences which variant/template is selected — identity resolution ignores it entirely.
- Given the same variant twice (idempotent re-sync), the resolved identity is byte-identical.
- Template page link remains stable/shared across two different display entries that reference two different variants of the same template.

**Freshness:**
- FRESH: within one cadence interval → shown, no aging label.
- AGING: exactly one interval missed → shown, with the "last known price" wording, real timestamp visible.
- STALE: two+ intervals missed → card entirely absent from the returned array.
- UNAVAILABLE: no candidate at all → card entirely absent (already covered today, should remain covered).
- Odoo-cadence (intraday/daily) candidate: correct FRESH/AGING boundary math.
- External-bulletin (daily) candidate: correct FRESH/AGING boundary math, independently of the Odoo case.
- Monthly-benchmark candidate: correct FRESH/AGING boundary math at a much longer interval — proves the model isn't secretly hardcoded to a day-scale unit.
- No-sync passage-of-time: a quote with a fixed `source_timestamp` and no new sync transitions FRESH→AGING→STALE purely as the test's injected "now" advances — no mock sync run involved.
- Weekend/non-publication-day: a Friday-published daily-cadence quote is not incorrectly AGING/STALE on Saturday/Sunday under a business-day-aware interval.
- `source_timestamp` vs `synced_at`: a re-synced-but-unchanged old quote (fresh `synced_at`, old `source_timestamp`) is correctly classified by the old timestamp, not the new sync time.
- STALE is provably absent from `getHomepagePriceStrip`'s returned array (not just "marked stale" as today).
- AGING items are provably present with a distinguishable state field the UI can render its "last known price" wording from.

# DECISION TABLE

| Question | Current | Options | Recommendation | Migration Impact |
| --- | --- | --- | --- | --- |
| Product template vs variant | Template-only (`catalog_products.template_xid`) | A/B/C | **C — dual identity** | Additive column(s) |
| Price mapping identity | `product_key` = template xid, no variant granularity | A/B/C | **C** | Additive (`variant_key`) |
| Public title ownership | `catalog_products` via publication-gated read | Unchanged is correct | Keep as-is | None |
| Specification ownership | Not sourced at all today (missing from `PublicPriceStripItem`) | A/B/C/D | **C — `product_variants`** | None (columns already exist) |
| Card routing | Template-only link | New route / query-state / category-only | **Existing `?variant=` query-state mechanism** | None |
| Freshness policy owner | Hardcoded TS constant | A/B/C/D/E | **E — provider default + rare override** | New table/columns |
| Freshness persistence | N/A (boolean derived at read time already) | Persist state / derive at read time / compute-at-sync | **Derive at read time from persisted policy** | New policy table only, not a state table |
| Source cadence | None (flat 24h for everyone) | Per-provider | **Per-provider `cadence_type`/`cadence_interval`** | New table/columns |
| Business calendar | None | Full engine / weekday schedule / simple cadence+later / other | **Simple cycle-based cadence (B/C)** | Covered by the cadence columns above, no separate calendar table |
| State calculation location | Repository/read-model (correct) | Provider/sync/DB/repository/component | **Keep in repository/read-model** | None — architecture already correct here |

# ARCHITECTURAL VERDICT

**B. TARGETED WEBSITE-SIDE SCHEMA/POLICY HARDENING REQUIRED.**

The foundation (`lib/pricing/` provider abstraction, normalization, selection, failure isolation, SSR-only rendering) remains valid and should not be touched. What's needed is scoped: (1) add variant-level identity alongside the existing template identity in the mapping/display/quote tables, and (2) add a small provider-cadence policy concept to replace the hardcoded 24h boolean with the required 4-state model. Neither requires an Odoo change today (Option C is ruled out) and neither is close to justifying a rebuild (Option D is ruled out) — everything needed already exists elsewhere in this exact codebase (variant identity in the Catalog domain, dual-identity precedent in RFQ, the `?variant=` routing mechanism) and simply needs to be *connected* to the pricing domain, not invented.

# RECOMMENDED IMPLEMENTATION PHASES

*(Derived from this gate's findings — DO NOT EXECUTE.)*

**PRICE-P1 — Identity + freshness-policy schema migration**
- Goal: add `variant_key` (nullable TEXT) to `price_product_mappings`/`price_display_products`/`public_price_quotes`; add a provider-cadence policy table (`price_provider_cadence` or similar — `provider_id` PK/FK, `cadence_type`, `cadence_interval`), plus an optional per-display-row override column.
- Files: new `migrations_public/0008_*.sql` (additive only, next available number).
- Migration: **Yes.**
- Odoo impact: None.
- Tests: schema-shape/uniqueness verified live against local D1 (this repo's established convention for D1-touching schema work).
- Gate: migration applies cleanly to local D1; existing (empty) tables unaffected; `npm test`/`tsc`/`build` unchanged.

**PRICE-P2 — Freshness pure-domain logic**
- Goal: replace the flat-24h boolean with a pure, cadence-aware FRESH/AGING/STALE/UNAVAILABLE classifier.
- Files: new/extended `lib/pricing/freshness.ts` (or extend `quote-selection.ts`), its `.test.ts`.
- Migration: No (consumes P1's schema).
- Odoo impact: None.
- Tests: the full freshness matrix above.
- Gate: all new + existing `lib/pricing/*.test.ts` pass; the existing "show stale" test in `quote-selection.test.ts` is deliberately updated (a documented behavior-reversal, flagged for owner sign-off, not silently changed).

**PRICE-P3 — Read-model contract**
- Goal: extend `getHomepagePriceStrip`/`PublicPriceStripItem` to resolve variant identity, specification, market/delivery-basis, and the new `freshnessState`; filter STALE/UNAVAILABLE out of the returned array.
- Files: `lib/pricing/repository.ts`, `lib/pricing/types.ts`, their tests.
- Migration: No.
- Odoo impact: None.
- Tests: `repository.test.ts` extended; the variant-identity test matrix above.
- Gate: `PRICE_STRIP_ENABLED`-off import-boundary test still passes unchanged.

**PRICE-P4 — Price Strip component/semantics**
- Goal: render specification/market/delivery-basis when material, AGING wording, trust-guidance copy, 2-item minimum/6-item cap, `<ul>/<li>`+`aria-labelledby` semantics (carried over from the prior audit's separate gap list, not new to this gate).
- Files: `components/home/price-strip.tsx`, `lib/content/homepage.ts`.
- Migration: No.
- Odoo impact: None.
- Tests: a new component source-text invariant test file (mirroring `header-frozen-spec-invariants.test.ts`'s established pattern).
- Gate: manual/live verification of AGING wording and the 2/6 thresholds with synthetic local-D1 test fixtures (deleted after).

**PRICE-P5 — Live verification / benchmark curation**
- Goal: once a real provider exists, populate `price_product_mappings`/`price_display_products` with real variant-precise mappings for the CORE 4 + OPTIONAL 2 benchmarks; run the full responsive/accessibility acceptance matrix.
- Files: none in source (pure D1 data).
- Migration: No.
- Odoo impact: depends entirely on whatever provider is chosen — out of this repo's current scope.
- Tests: live dev-server + browser verification.
- Gate: real data, real variant links, real freshness states observed end-to-end.

# RISKS

- **P2 reverses a currently intentional, documented, tested design decision** ("show stale rather than nothing" — `PRICE_PROVIDER_CONTRACT.md` §10 point 4). This should be explicitly confirmed as a deliberate V2.1 supersession before implementation, not treated as a bug fix.
- **Variant-level identity requires real provider data to actually be precise** — until a real provider exists, this is schema/logic readiness only; nothing can be end-to-end proven against real variant-precise quotes yet.
- **Cadence policy design (Option E) is a genuine new concept for this codebase** — no existing precedent to copy verbatim (unlike identity, which has strong RFQ precedent); the smallest-correct version proposed here should be reviewed once implemented, since "smallest correct" is a judgment call this gate made from available evidence, not a certainty.

# OPEN QUESTIONS

1. Does V2.1 genuinely intend to reverse the existing "show stale, labeled" behavior, or does it intend AGING to absorb what the current code calls "stale" (i.e., the current 24h boundary becomes the FRESH/AGING boundary, and a *new*, longer threshold becomes the AGING/STALE boundary)? This changes whether P2 is a reversal or an extension.
2. For the "REQUIRED NOW" cadence fields — should `cadence_type` be a small fixed enum (`intraday`/`daily`/`weekly`/`monthly`) or a raw interval-in-seconds/hours value? An enum is more self-documenting; a raw interval is more flexible for an odd real-world cadence. No evidence yet from a real provider to decide confidently.
3. Should the variant-identity migration also retroactively rename `product_key` to something less ambiguous (e.g. `template_key`) now that a `variant_key` sibling exists, or leave the name as-is to minimize diff size? Purely a naming/clarity call, not an architecture one.

# GIT STATUS

```
git status --short -> ?? docs/pricing/PRICE_STRIP_V2.1_AUDIT.md   (unchanged prior-session file; nothing touched this session besides writing this report)
```

# PRODUCTION SAFETY

- Files modified: **NONE**
- Files created: **NONE** (besides this report, the task's own explicit deliverable)
- Commit: **NONE**
- Push: **NO**
- Deploy: **NO**
- Production/staging D1 migration: **NO**
- Odoo writes: **NO** (Odoo not accessed at all)
- Cloudflare config changes: **NO**

---

`EXACT BENCHMARK IDENTITY: FAIL`
`CATALOG AUTHORITY: PASS`
`SPECIFICATION OWNERSHIP: FAIL`
`FRESHNESS POLICY OWNERSHIP: FAIL`
`NO-SYNC STALE TRANSITION: FAIL`
`SOURCE TIMESTAMP INTEGRITY: PASS`
`PROVIDER-AGNOSTIC FRESHNESS: PASS` *(architecturally ready — the current single-boolean model happens to already be provider-agnostic; the recommended richer model preserves this)*
`V2.1 MIGRATION DECISION: NOT READY` *(schema change identified and scoped, not yet built)*

`AHAN ASA PRICE-P0 ARCHITECTURE GATE: PARTIAL`
