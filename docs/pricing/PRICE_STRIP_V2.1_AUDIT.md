# Homepage Price Strip V2.1 — Implementation Architecture Audit

Date: 2026-09-04
Repository: `/Users/reza/Developer/ahanassa-website`
Task type: **READ-ONLY AUDIT** — zero files modified, zero commits, zero pushes.

**Important caveat on "AUTHORITATIVE SPEC":** no file named or resembling "AHANASSA HOMEPAGE PRICE STRIP — FROZEN V2.1" exists anywhere in this repository (`find`/`grep` across `docs/`, `01-sources/`, and the whole tree found nothing). This audit compares the real, existing implementation against the V2.1 requirements as stated inline in the audit task prompt itself — not against a verifiable repo document. Every PASS/FAIL/PARTIAL verdict below is evidence-based against real source/schema/tests, but "compliant with V2.1" specifically means "compliant with the requirements this prompt described," not "verified against a spec file this repo has on record."

# RESULT

`PRICE STRIP V2.1 AUDIT: PARTIAL`

A substantial, well-engineered, provider-agnostic price architecture already exists (implemented and documented as DAR-051, 2026-09-02) — but it predates the specific V2.1 UX/freshness/curation refinements this task describes, and several concrete gaps exist against them.

# PREFLIGHT

```
pwd                        -> /Users/reza/Developer/ahanassa-website
git branch --show-current  -> feat/header-frozen-v2
git rev-parse HEAD         -> 0900270da65ef50be077a6667bacded9cb3024ce
git status --short         -> (empty — clean)
```

`git log --oneline --decorate -10`:
```
0900270 (HEAD -> feat/header-frozen-v2) docs: record P6/P7 Header services evidence reports
a2f6c7e docs: record P5 durability checkpoint
4108449 feat: connect Header services to DB_PUBLIC processing groups
2967d37 feat: add DB_PUBLIC processing sync and read model
b18d0a6 wip: checkpoint frozen header v2 before lineage repair
06921a2 (origin/fix/contact-rfq-layout-direction, fix/contact-rfq-layout-direction) fix: restore LTR phone control and RFQ/Next-Steps/Head-Office order
2d0ffbd (origin/feat/homepage-product-projection, ...) fix: harden migration 0006 to convert historical 301 rows to 308
ebffff9 fix: atomic slug redirects, HTTP 308 semantics, demand-score reconciliation
57346e4 fix: make Cron Trigger config explicit per environment, empty on staging
e686326 feat: harden homepage product projection and routing
```

Lineage confirmed by direct Git inspection (not assumed from the prompt): current HEAD is the tip of the Contact/RFQ-fix → Frozen-Header-v2 → Processing-P5 → Processing-P6 → docs-checkpoint chain, exactly matching the prior-work summary this task provided. Working tree is clean — the audit proceeded with read-only inspection and safe local-D1 reads only (no write, no `--remote`).

# CURRENT PRICE ARCHITECTURE

A complete, provider-agnostic pricing subsystem already exists — implemented, tested, and documented as **DAR-051** (`DOCUMENT_AUDIT_REPORT.md`, 2026-09-02), currently sitting **committed on this very branch** (part of the history above, not a separate uncommitted pass — DAR-051's own "not yet committed" note is now stale; it has since been committed as part of this branch's lineage). It was built for a general "Phase 1" price-strip concept, not specifically against the "V2.1" refinements this audit task describes (trust-guidance copy, AGING/STALE/UNAVAILABLE freshness states, 2-item minimum, market/delivery-basis on the card) — those are the actual gaps below.

# CURRENT FILE INVENTORY

**`lib/pricing/` (12 runtime modules, 3,307 total lines incl. tests):**

| File | Role |
| --- | --- |
| `types.ts` | `IncomingPriceQuote`, `NormalizedPriceQuote`, `PriceProviderFetchResult`, `PublicPriceStripItem` (the only shape the UI ever sees) |
| `normalize.ts` | The single normalization boundary — unit allow-list (`kg`,`ton`,`branch`,`sheet`,`meter`,`piece`), Toman→Rial exact conversion, timestamp validation |
| `money.ts` | Exact-integer Rial↔Toman conversion (`tomanToExactRial`, `rialToTomanForDisplay`) |
| `quote-key.ts` | Provider-namespaced quote identity (`computeQuoteKey`, SHA-256 fallback) |
| `quote-selection.ts` | **Definitive selection policy** — exact-basis match, fresh-before-stale, provider-priority order, `STALE_THRESHOLD_MS = 24h` |
| `sync-safety.ts` | `evaluateReconciliationGate` — safe soft-deactivation gate (mode/completeness/opt-in/zero-rejection/fraction-cap) |
| `provider.ts` | `PriceProvider` interface + `ProviderNotConfiguredError` |
| `provider-registry.ts` | `PROVIDER_REGISTRY` — known-implementation lookup (currently: `odoo` only) |
| `provider-config.ts` | `getEnabledProviderIds`, `ReconciliationPolicy`, `getReconciliationPolicy` |
| `product-mapping.ts` | `resolveProductKey` — curated `(provider_id, provider_product_ref) → product_key`, unmapped = rejected |
| `sync-orchestrator.ts` | `runScheduledPriceSync`, `syncOneProvider` — per-provider failure isolation, lease, atomic `.batch()` upsert/deactivate |
| `repository.ts` | `getHomepagePriceStrip(env, locale)` — the sole public read model |
| `providers/odoo-price-provider.ts` | Registered but **deliberately throws** `ProviderNotConfiguredError` — Odoo's Public Catalog API v1 doesn't expose price |

**Component:** `components/home/price-strip.tsx` (`PriceStrip`) — Server Component, no `"use client"`.

**Migration:** `migrations_public/0004_public_price_quotes.sql` — `public_price_quotes`, `price_product_mappings`, `price_display_products`, `price_sync_state` (all present and applied in local D1; all empty — 0 rows in every table).

**Docs:** `docs/pricing/PRICE_PROVIDER_CONTRACT.md` (156 lines, the closest thing to a spec this repo has for this feature — general architecture, not V2.1-specific).

**Feature flags (`wrangler.jsonc`, both `production` and `staging`):** `PRICE_STRIP_ENABLED: "false"`, `ENABLED_PRICE_PROVIDERS: ""`.

**Tests:** `lib/pricing/{normalize,money,quote-key,quote-selection,sync-safety,failure-reason,repository,sync-orchestrator}.test.ts` — 67 tests, all pure/D1-free except `repository.test.ts` (flag-gate + import-boundary) and `sync-orchestrator.test.ts` (fake-D1 failure-isolation).

**Not wired:** no Cron Trigger entry in `wrangler.jsonc`/`workers/entry.ts` calls `runScheduledPriceSync` — confirmed by direct `grep`, matches the contract doc's own explicit "deliberately not done in this pass."

# DATA FLOW

Actual current flow, confirmed by reading every hop's source:

```
Odoo (odoo-price-provider.ts — throws, no real data)
        ↓  [PriceProvider.fetchPrices()]
lib/pricing/sync-orchestrator.ts#syncOneProvider
        ↓  [normalizePriceQuote() — normalize.ts]
lib/pricing/normalize.ts  (canonical NormalizedPriceQuote)
        ↓  [resolveProductKey() — product-mapping.ts, rejects unmapped]
public_price_quotes (DB_PUBLIC, migrations_public/0004)
        ↓  [selectWinningQuote() — quote-selection.ts, per price_display_products row]
lib/pricing/repository.ts#getHomepagePriceStrip
        ↓  [server component prop]
components/home/price-strip.tsx
```

This matches the task's example diagram exactly, hop for hop: Provider/Odoo → Provider Adapter → Normalization → Product Mapping → Public Price Projection/DB_PUBLIC → server-side repository → Homepage Price Strip.

**No client-side fetch, no live Odoo fetch during render, no provider fetch during render, no browser-direct provider access** — confirmed: `app/[locale]/page.tsx` is an `async function` Server Component reading `env` (Cloudflare binding) directly server-side; `getHomepagePriceStrip` is called there, not from any client boundary; `price-strip.tsx` has no `"use client"`, no `useEffect`, no `fetch(`.

# DB_PUBLIC SCHEMA

All 4 tables exist and are applied to local D1 (verified via `wrangler d1 execute --local`), all currently **empty (0 rows)**:

- **`public_price_quotes`** — `quote_key` (PK, provider-namespaced), `provider_id`, `provider_product_ref`, `product_key` (NOT NULL — never persisted unmapped), `provider_title` (audit-only), `price_amount_irr` (INTEGER, never REAL), `currency`, `unit`, `market_or_location`, `delivery_basis`, `source_timestamp`, `synced_at`, `source_url`, `status` (`active`/`inactive`, soft-deactivate-never-delete), `created_at`/`updated_at`. Indexes: `idx_public_price_quotes_product_key`, `idx_public_price_quotes_provider_id`.
- **`price_product_mappings`** — `(provider_id, provider_product_ref)` PK → `product_key`. Curated, not inferred.
- **`price_display_products`** — the curation table — `display_price_id` PK, `product_key`, `display_unit`/`display_currency`/`display_market_or_location`/`display_delivery_basis` (the exact target basis), `title_override_*`/`link_override_category_slug` (documented exception path only), `sort_order`, `is_active`. Index: `idx_price_display_products_product_key`.
- **`price_sync_state`** — one row per `provider_id` (not a global singleton, unlike `catalog_sync_state`), lease columns, `last_failure_reason_code` (fixed vocabulary, `lib/pricing/failure-reason.ts`).

**Sufficiency for V2.1:** the schema already carries everything §9/§18 need (identity, price, currency, unit, market, delivery basis, source timestamp, provenance via `provider_id`+`quote_key`, publication config via `price_display_products`). **No new migration is strictly required for the data model itself.** What's missing is entirely at the *read-model output* and *component* layers (see PRICE BASIS / CARD INFORMATION below) — `PublicPriceStripItem` drops `marketOrLocation`/`deliveryBasis` before they ever reach the card, even though the DB has them. Whether a genuine 3-state (FRESH/AGING/STALE) freshness model requires a schema change depends on the implementation approach chosen (see IMPLEMENTATION PLAN) — the raw timestamp data needed already exists; only the *classification* is currently a single boolean computed at read time, not persisted.

# FEATURE FLAG

- **Defined:** `wrangler.jsonc`, `vars.PRICE_STRIP_ENABLED`, string `"false"` in both `env.production` and `env.staging`; no top-level (local-dev) default declared, so it's `undefined` in local dev unless explicitly set.
- **Parsed:** `env.PRICE_STRIP_ENABLED: string | undefined`, checked with `=== "true"` (strict) in two places — `app/[locale]/page.tsx` (outer gate) and `lib/pricing/repository.ts#getHomepagePriceStrip` (inner gate, defense-in-depth). Anything other than the exact string `"true"` — unset, `"false"`, `"1"`, `"TRUE"` — is off. Tested explicitly (`repository.test.ts`, 3 cases).
- **Production-safe default:** **YES** — off in both real environments, confirmed in `wrangler.jsonc`.
- **Disabled → renders nothing:** **YES** — `page.tsx` never even calls `getHomepagePriceStrip` when the flag isn't `"true"` (dynamic `import()` of the whole `lib/pricing/repository` module is skipped entirely); `PriceStrip` itself also returns `null` for an empty `items` array as a second layer.
- **Disabled → zero provider/network work:** **YES**, verified at the *import* level, not just the query level — `repository.ts`'s own doc comment confirms `lib/db/public.ts`/`lib/catalog/editorial-repository.ts` (the `cloudflare:workers`-touching modules) are loaded via dynamic `import()` specifically so they're never loaded at all when the flag is off; test-verified (`repository.test.ts`: "PRICE_STRIP_ENABLED off ... returns [] without importing any DB-touching module").

**Frozen law "disabled Price Strip must not affect Homepage health": PASS.**

# BENCHMARK CURATION

`price_display_products` is exactly the "dedicated curation/publication concern" the task describes — a real, purpose-built table, not `price_display_products` merely as a convention name I'm inventing to match the prompt; it already exists verbatim.

- **Selection mechanism:** persisted, data-driven — `price_display_products` rows (`is_active`, `sort_order`) drive what's shown, in what order. The homepage does **not** automatically display every quote (`repository.ts` iterates `price_display_products`, not `public_price_quotes`, as its outer loop).
- **Hardcoded SKUs in frontend source:** **none found.** `price-strip.tsx` contains zero product identifiers, zero SKU strings, zero commercial names.
- **Mapping → authoritative identity:** `price_display_products.product_key` is documented and used as a `template_xid`, resolved through `lib/catalog/editorial-repository.ts#getPublishedCatalogTemplateTitleByXid` — the same publication-gated read every public catalog page uses.
- **Display ordering:** stable and curated via `sort_order ASC`, not alphabetical/random/query-order.
- **Current data state:** `price_display_products` has **0 rows** — no benchmark products are actually configured yet. The mechanism is compliant and ready; the *curation itself* (the CORE 4 / OPTIONAL 2 the task describes) has not been done, correctly sequenced behind "a real provider must exist first" per the contract doc's own rollout order.

**Verdict:** mechanism PASS, data not yet populated (expected/correct at this stage, not a defect — no fake SKUs exist to violate the "not authorization to hardcode" rule).

# PRODUCT IDENTITY

- Provider free text (`provider_title`) is **schema-documented and code-enforced as audit-only** — `repository.ts` never reads `provider_title` into `PublicPriceStripItem`; the public `title` field comes exclusively from `getPublishedCatalogTemplateTitleByXid` (catalog `h1`) or, only as a documented fallback with no catalog match, `title_override_{fa,en,ar}`.
- **Destination URL:** `/products/{slug}` from the same authoritative catalog read, or `link_override_category_slug` only as a fallback, or `undefined` (unlinked) if neither exists.
- **No duplicated commercial identity found** — `product_key` reuses the real `template_xid` concept the Catalog domain already owns; no second parallel product-naming/identity system exists in `lib/pricing/`.

**PASS.**

# PROVIDER ARCHITECTURE

`PriceProvider` interface (`provider.ts`) + `PROVIDER_REGISTRY` (lookup-only, "known" ≠ "live") + `ENABLED_PRICE_PROVIDERS` (the actual activation switch, order = priority) is a genuine adapter pattern — `lib/pricing/repository.ts`/`quote-selection.ts`/`sync-orchestrator.ts` never reference Odoo, JSON-2 RPC, or any Odoo-specific field name; they operate entirely on the normalized `NormalizedPriceQuote`/`QuoteCandidate` shapes. `odoo-price-provider.ts` is a stub that throws — swapping it for a real provider (Odoo-enhanced or a third party) requires zero change to normalization, selection, repository, or the component.

**PROVIDER AGNOSTIC: PASS.**

# PRICE BASIS

Exact-basis integrity is enforced at the **selection** layer, not just documented: `quote-selection.ts#matchesBasis` requires `unit`, `currency`, `marketOrLocation`, `deliveryBasis` to all match the `price_display_products` row's declared target basis — an incompatible-basis candidate is filtered out entirely before selection even considers freshness/priority (`exactBasis = candidates.filter(matchesBasis)`, tested: 4 separate "a different X is never returned" tests). **No averaging** occurs anywhere (`selectWinningQuote` always returns exactly one candidate or `null`; explicitly tested "never averages").

**Exact DB columns:** `public_price_quotes.{unit, currency, market_or_location, delivery_basis}` (basis identity) + `{price_amount_irr, source_timestamp, provider_id, quote_key}` (value/provenance) — all present, all typed correctly (INTEGER for money, TEXT for the rest).

**PRICE BASIS INTEGRITY: PASS.**

# PROVENANCE

The schema can answer every question §18 asks:

| Question | Answered by |
| --- | --- |
| Which Product/Variant? | `product_key` (→ `template_xid`) |
| Which provider/source? | `provider_id` |
| Which source quote/record? | `quote_key` |
| When recorded? | `source_timestamp` (authority) / `synced_at` (fallback) |
| Which normalization result? | The row itself is the post-normalization record (no separate raw-payload table, but normalization is deterministic/pure and unit-tested, so the transform is reproducible from the incoming shape) |
| Which market basis? | `market_or_location` |
| Which delivery basis? | `delivery_basis` |
| Which publication configuration? | `price_display_products` row (`display_price_id`) |

Not all of this is publicly rendered (correctly, per the task's own "not all fields must be publicly rendered") — `PublicPriceStripItem` intentionally exposes only `title`/`priceToman`/`unit`/`isStale`/`effectiveTimestamp`/`href`.

**PROVENANCE: PASS.**

# FRESHNESS

**This is the audit's most significant architectural gap.**

- **Current model:** a single boolean, computed identically (duplicated as a literal `24 * 60 * 60 * 1000` constant) in both `quote-selection.ts` and `repository.ts`. `isFresh = (now - effectiveTimestamp) <= 24h`. That's it — **confirmed: this is exactly the simplistic `age < 24h` rule** the task asked me to identify explicitly if found. There is no AGING tier, no UNAVAILABLE tier, no source-specific cadence, no business-calendar handling, no configurable-per-provider threshold.
- **Where computed:** correctly in the read-model/selection layer (`lib/pricing/quote-selection.ts` + `lib/pricing/repository.ts`), **not** as ad-hoc date math inside the React card — `price-strip.tsx` only receives a pre-computed `isStale: boolean` and an `effectiveTimestamp` string; it does no date arithmetic of its own beyond formatting for display. This part of the architecture law ("freshness logic belongs in integration/read-model, not the visual card") is **already honored**.
- **STALE handling — the actual violation:** `selectWinningQuote` explicitly falls back to and *returns* a stale candidate when no fresh one exists ("Only when no fresh compatible quote exists at all, fall back to the highest-priority stale compatible quote" — by design, per the existing contract doc §10). `repository.ts` then includes it in the returned array with `isStale: true`, and `price-strip.tsx` renders it with a "قیمت قدیمی"/"Older price" label. **This directly contradicts the V2.1 rule "STALE → Homepage card hidden."** The existing architecture's own documented intent was "show a marked-stale price rather than nothing" — a reasonable but different design decision than V2.1's "hide it."
- **UNAVAILABLE:** effectively achieved for the *no-candidate-at-all* case (`selectWinningQuote` returns `null` → `repository.ts`'s `if (!winner) continue` → that display row is skipped) — this part already matches "UNAVAILABLE → hidden."
- **AGING (a third, distinct tier with visible "last known price" wording):** does not exist in any form.

**FRESHNESS MODEL: FAIL** (the underlying age-computation plumbing is soundly placed in the right layer, but the actual state model — 2 states instead of 4, and STALE deliberately shown instead of hidden — does not match V2.1's rules).

# FAILURE ISOLATION

Extensively engineered and unit-tested (`sync-orchestrator.test.ts`, fake-D1 injection) — behavior confirmed by reading `sync-orchestrator.ts` and its tests directly, not merely trusting the contract doc's own description:

| Failure | Behavior |
| --- | --- |
| Timeout | `reasonCodeForStage` maps `TimeoutError`/`AbortError` → `provider_timeout`; existing rows untouched (failure occurs before persistence stage is ever reached) |
| 500 / non-2xx | → `provider_unavailable`; same isolation |
| Malformed payload | Provider adapter's own responsibility to throw during `fetchPrices()` → same path as above |
| Partial response | `complete: false` on the fetch result → reconciliation gate blocks deactivation (`incomplete_fetch`) but valid upserts among what WAS returned still apply |
| Mapping failure (unmapped ref) | Individual record rejected (not persisted), doesn't throw — `rejectedRecordCount > 0` blocks reconciliation this run, but doesn't stop the run or touch other rows |
| DB error (`getPublicDb()` fails) | Caught, logged as `PRICE_SYNC_FAILED` with `reasonCode: "database_unavailable"`, `persisted: false` (correctly never claims a write it couldn't make) — test-verified: "no existing price rows are mutated when getPublicDb fails" |
| No new quote (empty snapshot) | Gated by `allowAuthoritativeEmptySnapshot` (default `false`) — an empty response is treated as suspicious by default, existing rows preserved, `suspicious_empty_snapshot` recorded |

One provider's failure never blocks another (`syncOneProvider` iterates sequentially, each wrapped in its own try/catch — test: "the first provider may fail while the second enabled provider still executes"). Provider failure **never** wipes last-known-good data, creates zero prices, fabricates replacements, or can cause a Homepage 500 (the read path's own `try/catch` in `repository.ts` independently guarantees this regardless of sync-side behavior).

**LAST-KNOWN-GOOD SAFETY: PASS.**

# SSR / NETWORK ISOLATION

- **Server or Client Component?** Server — no `"use client"` in `price-strip.tsx` or `app/[locale]/page.tsx`.
- **`useEffect`?** None.
- **`fetch()`?** None in `price-strip.tsx`, `page.tsx`, or `repository.ts` — everything is D1 (`db.prepare(...).bind(...).all()`), never HTTP `fetch`.
- **Loading state?** None — no spinner/skeleton anywhere in the component.
- **Hydration-dependent price insertion?** None — data arrives as a server-rendered prop, present in the initial HTML.
- **Provider/Odoo import in the Homepage render path?** None — `price-strip.tsx` imports only `next/link`, locale utilities, `homepageCopy`, and the `PublicPriceStripItem` type; `repository.ts` (server-only, called from `page.tsx`) imports `quote-selection.ts`/`money.ts` (pure) and, only when the flag is on, `lib/db/public.ts`/`lib/catalog/editorial-repository.ts` — never `lib/pricing/providers/*` or `sync-orchestrator.ts`.

**NO LIVE ODOO RENDER PATH: PASS. NO CLIENT PRICE FETCH: PASS.**

# HOMEPAGE PLACEMENT

`app/[locale]/page.tsx` JSX order: `<Hero/>` → `<PriceStrip/>` → `<ProductShowcase/>` → `<Capabilities/>` → ... — matches the frozen sequence **Header → Hero → Price Strip → Product Showcase** exactly (Header lives in the shared `layout.tsx`, outside this page, correctly not duplicated here).

**PASS.**

- Homepage-only: confirmed — `PriceStrip`/`price-strip.tsx` is imported nowhere except `app/[locale]/page.tsx` (one incidental doc-comment cross-reference in `product-showcase.tsx`, not an import).
- Not part of Header: confirmed — `SiteHeader.tsx` has zero reference to pricing.
- Not sticky: confirmed — `<section className="border-border bg-surface border-b py-10">`, no `sticky`/`fixed` class.
- Not global: confirmed, same import-graph check.
- Not on About/Services/Industries/Contact: confirmed — none of those page files import `price-strip.tsx` or `lib/pricing/*`.

# CARD INFORMATION

Auditing `components/home/price-strip.tsx`'s actual rendered fields against the frozen card hierarchy:

| Field | Status |
| --- | --- |
| Product public name | **IMPLEMENTED** — `item.title`, sourced from the authoritative catalog read |
| Specification | **MISSING** — no distinct specification line exists; `title` is the only text identifying the product (no size/grade/spec shown separately) |
| Price | **IMPLEMENTED** — `item.priceToman`, `Intl.NumberFormat`-formatted, locale-aware digits |
| Unit | **IMPLEMENTED** — `/{item.unit}` suffix |
| Timestamp | **IMPLEMENTED** — `t.updatedPrefix` + formatted `effectiveTimestamp` |
| Market/location (when material) | **MISSING** — `PublicPriceStripItem` doesn't even carry `marketOrLocation` (it's dropped in `repository.ts` before the card-facing type); the DB has it, the read model discards it |
| Delivery basis (when material) | **MISSING** — same as above, `deliveryBasis` is dropped before reaching the card |

**Forbidden-by-default items — correctly absent:**
- Independent CTA button per card — **absent** (correct)
- Fake product destination — **absent** (correct; `href` is `undefined`, never a placeholder link, when no real catalog match exists)
- Decorative image — **absent** (correct)
- Promotional badge — **absent** (correct)
- Gain/loss theatrics — **absent** (correct; no percentage-change/arrow/color-coded delta anywhere)

**Verdict:** the required-vs-forbidden split is well-respected, but two required fields (Specification, Market/location, Delivery-basis-when-material) are genuinely absent — not merely unstyled, structurally unavailable at the type level.

# TRUST GUIDANCE

Searched `lib/content/homepage.ts`'s `priceStrip` copy object and `price-strip.tsx`'s full JSX: only `heading`, `updatedPrefix`, `staleLabel` exist. **No plain-language market-guidance sentence exists anywhere** (no fa/en/ar equivalent of the V2.1-preferred «این قیمت‌ها راهنمای بازار هستند...» sentence, nor any other framing text), no tooltip, no disclaimer of any kind near the strip.

**TRUST GUIDANCE: FAIL.**

# VISUAL / RESPONSIVE

Read directly from `price-strip.tsx`'s Tailwind classes and `styles/theme-extensions.css`'s token mapping (not redesigned, not modified):

- **Section background:** `bg-surface` → `var(--aa-color-bg-subtle)` → `--aa-color-neutral-50` = `#f9fafb` — a cool light gray. **The design system already has a warm cream token** (`--aa-color-bg-warm` → `--aa-color-brand-cream-50` = `#fbf5eb`) that exists but is **not used here** — a concrete, easily-identified gap against "warm neutral/cream section."
- **Card background:** `bg-background` → `--aa-color-bg-canvas` = `#ffffff` — genuinely white. **Matches.**
- **Border:** `border-border`, subtle. **Matches.**
- **Radius/shadow:** `rounded-[var(--aa-radius-md)]`, `shadow-[var(--aa-shadow-xs)]` — restrained, uses design tokens not ad-hoc values. **Matches.**
- **Typography:** `text-navy` for both heading and price. **Matches.**
- **Copper accent:** `hover:border-copper` only, on hover — limited, not decorative. **Matches.**
- **No market-board aesthetic** — no ticker styling, no gain/loss color-coding. **Matches.**
- **Mobile scrolling:** `flex snap-x snap-mandatory gap-3 overflow-x-auto` + `snap-start` per card — genuine CSS-native horizontal scroll + scroll-snap, **zero JS carousel/autoplay/marquee logic anywhere in the file** (grep-confirmed: no `setInterval`, no `useEffect`, no carousel library import). **Matches "forbidden: autoplay/JS carousel/marquee/ticker/auto-advance."**
- **Card width:** `min-w-52 shrink-0` — fixed minimum card width driving the reflow, but there is no explicit breakpoint-based column logic (no `grid-cols-*` reflow rules for medium/tablet as the task describes "5–6 often 3×2") — the current layout is a single continuous horizontal scroll row at every viewport width, not a responsive grid that reflows into rows at wider breakpoints. This is a **real deviation** from the "Medium: reflow before cards become too narrow" / "Tablet: 2–3 columns" direction — the current implementation is horizontal-scroll-only at all sizes, not grid-then-scroll.

**Note per task instruction:** contrast/exact pixel-rendering claims are not made here from source alone — see ACCESSIBILITY below for what is/isn't provable statically.

# ACCESSIBILITY

Statically provable from source (no live render performed — none requested for this audit, and the task explicitly says not to claim visual-contrast PASS from source alone):

| Item | Status | Evidence |
| --- | --- | --- |
| Semantic `<section>` | IMPLEMENTED | `<section>` used |
| `aria-labelledby` heading association | **MISSING** | `<section>` has no `aria-labelledby`; `<h2>` has no `id` — the frozen preferred pattern (`<section aria-labelledby="...">` + matching heading `id`) is not implemented |
| List semantics (`<ul><li>`) | **NON-COMPLIANT** | Items render as `<div>`s inside a `<div>` flex container — no `<ul>`/`<li>` anywhere in the component |
| Optional real `<a>` | IMPLEMENTED | `<Link>` used when `item.href` exists; a plain non-interactive `<div>` when it doesn't (no fake link, no `role="button"` on a div) |
| No clickable generic div | IMPLEMENTED | Confirmed — the no-href branch is a plain, non-interactive `<div>` |
| No nested interactive controls | IMPLEMENTED | Each card has at most one interactive element (the wrapping `<Link>` itself, when present) |
| `focus-visible` | Not overridden | No `outline-none` anywhere in the file — inherits the site-wide focus ring (same convention already verified correct for the Header in prior sessions) |
| Keyboard operability | Follows from `<Link>` being a real anchor | No custom keyboard handling exists or is needed, since there's no custom interactive widget |
| No hover-only required content | IMPLEMENTED | All text (title/price/unit/timestamp/stale label) is always visible in the DOM, no hover-reveal |
| No `aria-live` | IMPLEMENTED | None present (correct — a server-rendered static list doesn't need it) |
| No inappropriate menu/listbox/carousel ARIA | IMPLEMENTED | Zero `role=` attributes anywhere in the file |
| RTL/LTR | Partially provable | `dir="ltr"` explicitly set on the price/unit line (correct — numbers should stay LTR in RTL contexts); the rest inherits page `dir` |
| Bidi handling for units/grades/numbers | Cannot verify statically for the full price+unit+currency string composition | The `dir="ltr"` wrapper is a reasonable static signal, but genuine bidi correctness (e.g. a mixed Persian title + LTR number + Persian unit suffix) needs a real render to confirm — **classified as REQUIRES LIVE VERIFICATION, not claimed PASS/FAIL here** |

**ACCESSIBILITY REGRESSION** (i.e., does the current component regress anything already established elsewhere): N/A, no prior accessibility baseline existed for this specific component to regress from — but the two MISSING/NON-COMPLIANT items above are real gaps against the V2.1 preferred markup, not merely style preferences.

# ROUTING

- **Current card href behavior:** `Link` to `/products/{slug}` when a real catalog match exists (via `getPublishedCatalogTemplateTitleByXid`), or `/products?category={slug}` when only `link_override_category_slug` is set, or `undefined` (informational-only card, no click affordance) when neither exists.
- **Fake/dead routes:** none found — every non-`undefined` href traces back to a real, existing route pattern (`/products/[slug]/page.tsx` exists; `/products` with a query filter exists).
- **Card without destination:** confirmed to remain purely informational — the `undefined`-href branch renders a plain `<div>`, never a disabled-looking link or a placeholder `#` href.

**PASS** (routing behavior is honest; whether the *specific* slugs currently resolve to real published pages depends on `price_display_products` being populated with real, currently-published `product_key`s — untestable until that curation happens, since the table is empty).

# "VIEW ALL PRICES"

No such link exists anywhere in `price-strip.tsx`, `lib/content/homepage.ts`, or any other homepage-related file (grep-confirmed, fa/en/ar phrase search included). **Nothing to classify as a violation** — the frozen law ("no link until a real destination exists") is trivially satisfied by the link's total absence, not by a considered decision documented in-repo. Worth noting explicitly as a non-issue rather than silently skipping it.

# PERFORMANCE

- **D1 queries:** `getHomepagePriceStrip` issues `1 + 2N` queries for `N` active `price_display_products` rows (`1` for the display-products list, then per row: `1` for candidate quotes + `1` inside `getPublishedCatalogTemplateTitleByXid`). No `JOIN` is used anywhere in this module. With the task's own intended max of 6 cards, worst case is 13 small, indexed queries per homepage render — not a `JOIN`-optimized single query, but bounded and cheap at this scale. Flagged as an **N+1 pattern worth consolidating** if/when curation grows, not a current performance problem.
- **SSR path:** fully server-side, no client round-trip.
- **Client bundle impact:** zero — no `"use client"` boundary, no JS shipped for this component beyond what Tailwind/Next already emit globally.
- **Layout shift risk:** low — server-rendered, present in initial HTML, no loading shell to swap out.
- **Interaction JS:** zero — scrolling is native browser behavior (`overflow-x-auto` + `scroll-snap-type` via Tailwind's `snap-x snap-mandatory`), matching the frozen "near-zero custom interaction JS" preference exactly.

# EXISTING TEST COVERAGE

**67/67 pricing tests pass** (`npx tsx --test lib/pricing/*.test.ts`, verified this session). Breakdown:

| Category | Files | Coverage |
| --- | --- | --- |
| Normalization | `normalize.test.ts` | 11 cases — unit/amount/timestamp validation, currency-convention isolation |
| Money | `money.test.ts` | Round-trip Toman↔Rial exactness |
| Quote identity | `quote-key.test.ts` | Provider-namespacing, hash-fallback determinism/collision-avoidance |
| Selection/freshness | `quote-selection.test.ts` | Exact-basis matching (4 dedicated tests), fresh-before-stale, priority order, never-averages, stale-fallback |
| Reconciliation safety | `sync-safety.test.ts` | Full gate matrix — mode, completeness, opt-in, zero-rejection, empty-snapshot, fraction-cap |
| Failure classification | `failure-reason.test.ts` | Stage→reason-code mapping |
| Read-model gate | `repository.test.ts` | Flag-off import-boundary proof (3 cases) |
| Orchestrator failure isolation | `sync-orchestrator.test.ts` | Fake-D1 injected failures — DB unavailable, lease failure, unknown provider, first-provider-failure-doesn't-block-second, no-mutation-on-init-failure |

**What does NOT exist:**
- **Zero component/render tests for `price-strip.tsx` itself** — no source-text invariant test file exists for it at all (unlike, e.g., `lib/content/header-frozen-spec-invariants.test.ts` for the Header). Nothing pins its semantic markup, its zero-item-hides behavior, its stale-still-shown behavior, or its card field rendering.
- **Zero visual/responsive/viewport tests.**
- **Zero accessibility runtime tests** (only what's provable from the absence of ARIA-widget patterns, above).
- **Zero security/privacy-specific tests** beyond the general "never logs raw payload/credentials" code-level discipline (not independently tested).

**Responsive Acceptance Matrix readiness (task §22):**

| Dimension | Status |
| --- | --- |
| Viewports (320/360/390/768/1024/1280/1440) | MISSING — no test references any of these widths for this component |
| Locales (FA/AR/EN) | PARTIAL — `formatToman`/`formatUpdatedAt` locale-awareness is exercised indirectly by the general locale infrastructure, but no price-strip-specific locale test exists |
| Keyboard-only | MISSING |
| 200%/400% zoom | MISSING |
| Reduced-motion | MISSING (moot today — no motion/animation exists to reduce, but no test asserts this) |
| 0 prices | COVERED (indirectly) — `repository.test.ts` proves `[]` on flag-off; `PriceStrip`'s `items.length === 0 → null` is source-visible but untested directly |
| 1 price | MISSING — no test proves what happens with exactly 1 item (current code would render it — a real V2.1 gap, see GAP TABLE) |
| 2 prices | MISSING |
| 6 prices | MISSING — no test proves a 7th item is ever excluded (current code has no cap at all) |
| FRESH/AGING/STALE/UNAVAILABLE | PARTIAL — `quote-selection.test.ts` covers fresh/stale/no-candidate (3 of the 4 V2.1 states; AGING doesn't exist to test) |
| Invalid basis | COVERED — `quote-selection.test.ts`'s 4 "different X never returned" tests |
| Read-model failure | COVERED — `repository.ts`'s `catch` path exists but is not directly unit-tested for the "genuine query error" case specifically (only the flag-off path is tested; the try/catch's error branch is unexercised by any test) |

# REGRESSION BOUNDARIES

Files shared between the Price Strip and other established domains — any future V2.1 work must not break these:

| Shared file | Shared with |
| --- | --- |
| `app/[locale]/page.tsx` | Hero, ProductShowcase, Capabilities, Assurance, Process, Reach, CtaBand, JsonLd — the whole homepage composition |
| `lib/catalog/editorial-repository.ts#getPublishedCatalogTemplateTitleByXid` | Product Catalog (same publication-gate function the catalog pages themselves depend on) |
| `lib/content/homepage.ts` | Hero and every other homepage section's copy object |
| `config/locales.ts` (`localizedPath`, `Locale`) | Every locale-aware component in the repo, including the just-completed Header work |
| `wrangler.jsonc` `vars` block | `HOMEPAGE_RANKING_MODE`, `ODOO_*`, Turnstile — any edit here risks the same account-wide Cron-Trigger-cap issue already documented for Processing (P5/P6) |
| `workers/entry.ts` `scheduled()` | Catalog sync, Processing sync (P5/P6) — wiring a future price-sync Cron here must use the same failure-isolated `ctx.waitUntil` pattern already established, not a `Promise.all` |
| `migrations_public/` sequence | Next available number is `0008` (0001–0007 exist; 0004 is this feature's own migration, already applied) |

No overlap exists with `lib/content/nav.ts`, `SiteHeader.tsx`, `lib/processing/*`, or `lib/rfq/*` — the Price Strip domain is cleanly isolated from Header/Processing/RFQ at the file level today.

# V2.1 GAP TABLE

| Area | Frozen V2.1 Requirement | Current State | Verdict | Required Change |
| --- | --- | --- | --- | --- |
| Placement | Header→Hero→Price Strip→Product Showcase | Exactly this order in `page.tsx` | ✅ COMPLIANT | None |
| Feature flag | Default OFF, disabled = zero work | `PRICE_STRIP_ENABLED` off everywhere, import-level gate | ✅ COMPLIANT | None |
| Real-data-only | 0 real prices → render nothing, no fake fallback | No fake/demo data anywhere; empty tables render nothing | ✅ COMPLIANT | None |
| Benchmark curation | Dedicated curation table, no hardcoded SKUs | `price_display_products` exists, unpopulated | ⚠️ MECHANISM READY, DATA EMPTY | Populate curation once a provider exists |
| Product identity | Catalog-authoritative name/URL, provider text never shown | Fully enforced via `getPublishedCatalogTemplateTitleByXid` | ✅ COMPLIANT | None |
| Provider abstraction | UI must not depend on Odoo payload | Clean `PriceProvider` interface, zero Odoo coupling above the adapter | ✅ COMPLIANT | None |
| Public projection | DB_PUBLIC read model, no live Odoo | `public_price_quotes`/`price_display_products` + `repository.ts` | ✅ COMPLIANT | None |
| Provenance | Product/provider/quote/timestamp/basis all traceable | All present in schema | ✅ COMPLIANT | None |
| Quote basis | Exact-basis matching, never mixed/averaged | Enforced in `quote-selection.ts`, tested | ✅ COMPLIANT | None |
| Freshness | 4-state FRESH/AGING/STALE/UNAVAILABLE, not read-time ad-hoc math | 2-state boolean, flat 24h threshold, correctly placed in read-model layer (not the card) but wrong state model | ❌ GAP | Introduce AGING tier + hide-on-STALE |
| Stale handling | STALE → card hidden | STALE is shown, labeled "older price" | ❌ GAP | Filter out stale winners instead of returning them |
| 2-item threshold | 0/1 → hide, 2+ → show, max 6 | No threshold logic exists at all — 1 item renders, no max-6 cap | ❌ GAP | Add `items.length < 2` guard + cap query/slice at 6 |
| SSR | Server-rendered, in initial HTML | Fully server-rendered | ✅ COMPLIANT | None |
| No live Odoo | Zero synchronous Odoo dependency in render | Confirmed | ✅ COMPLIANT | None |
| No client fetch | No `useEffect`/client fetch | Confirmed | ✅ COMPLIANT | None |
| Trust helper text | Visible plain-language guidance near heading | Does not exist | ❌ GAP | Add copy + render it |
| Card information | Product+spec, price+unit, market/delivery-basis-when-material | Spec/market/delivery-basis all missing from the card (dropped before reaching `PublicPriceStripItem`) | ❌ GAP | Extend `PublicPriceStripItem` + card markup |
| Routing | Real destination or no link, never fabricated | Confirmed honest | ✅ COMPLIANT | None |
| Mobile scrolling | Native CSS scroll-snap, no JS carousel | Confirmed | ✅ COMPLIANT | None |
| Semantic HTML | `<section aria-labelledby>` → `<h2>` → `<ul><li>` | `<section>`/`<h2>` present but disconnected; items are `<div>`s, no `<ul>`/`<li>` | ❌ GAP | Add `aria-labelledby`/heading `id`, convert to `<ul>/<li>` |
| Accessibility | Focus-visible, no forbidden ARIA, real anchors | Mostly compliant; the semantic-HTML gap above is the accessibility gap | ⚠️ PARTIAL | Same fix as Semantic HTML |
| Failure isolation | Provider failure never wipes/breaks Homepage | Extensively engineered and tested | ✅ COMPLIANT | None |
| Performance | Minimal queries, no JS carousel | N+1 query pattern (bounded, cheap at max-6 scale); zero interaction JS | ⚠️ PARTIAL | Optional consolidation, not urgent at target scale |
| Tests | Cover the full responsive/data-state matrix | Strong pure-logic coverage (67 tests); zero component/render/responsive tests | ⚠️ PARTIAL | Add component-level source-text invariant tests (this repo's established pattern) once UI work happens |

# ARCHITECTURAL VERDICT

**B. FOUNDATION COMPLIANT — TARGETED HARDENING REQUIRED.**

The existing `lib/pricing/` architecture (provider abstraction, normalization boundary, exact-basis selection, safe reconciliation, failure isolation, feature-flag gating, SSR-only rendering) is sound, well-tested, and should be **preserved, not rewritten**. Every genuine gap found — freshness state model, 2-item threshold, trust copy, card field completeness, semantic markup — is a **targeted addition or a scoped edit to `repository.ts`/`price-strip.tsx`/`types.ts`**, not evidence of a structural mismatch. Nothing found here rises to "C" (no correction to the existing data-flow architecture is needed) or "D" (no rebuild justification exists — the foundation is exactly the pattern V2.1 itself describes).

# RECOMMENDED IMPLEMENTATION PHASES

*(Derived from the actual gaps above — not the illustrative example in the task prompt. DO NOT EXECUTE.)*

**P-PRICE-1 — Freshness model hardening**
- Objective: replace the flat 24h boolean with a 3-tier FRESH/AGING/STALE classification and make STALE hide the card (UNAVAILABLE already hides correctly).
- Files likely affected: `lib/pricing/quote-selection.ts` (or a new `lib/pricing/freshness.ts` pure module), `lib/pricing/repository.ts`, `lib/pricing/types.ts` (`PublicPriceStripItem` needs a freshness-state field, not just `isStale`), their `.test.ts` files.
- DB migration: **No** — the raw timestamp data already exists; this is a read-time classification change only (unless a persisted "freshness cadence per provider" concept is deliberately chosen instead of a single threshold — a design decision, not a foregone requirement).
- Risk: Low — pure-logic layer, already has an established unit-test pattern to extend.
- Validation gate: extend `quote-selection.test.ts` with AGING-boundary cases; confirm `repository.ts` no longer returns a STALE item at all.

**P-PRICE-2 — Card information + trust copy**
- Objective: add specification/market/delivery-basis fields to the card contract; add the trust-guidance sentence.
- Files likely affected: `lib/pricing/types.ts` (`PublicPriceStripItem`), `lib/pricing/repository.ts` (stop dropping `marketOrLocation`/`deliveryBasis`), `components/home/price-strip.tsx`, `lib/content/homepage.ts` (new copy keys, fa/en/ar).
- DB migration: **No** — the underlying columns already exist in `public_price_quotes`/`price_display_products`.
- Risk: Low — additive type/prop changes, no behavior change to existing fields.
- Validation gate: a new source-text/behavioral test proving the trust copy renders and the new fields appear when material.

**P-PRICE-3 — Minimum/maximum display count**
- Objective: hide the strip entirely at 0 or 1 valid item; cap at 6.
- Files likely affected: `components/home/price-strip.tsx` (or `lib/pricing/repository.ts`, to avoid even fetching more than needed).
- DB migration: **No.**
- Risk: Low.
- Validation gate: a direct test (or the repo's established source-text-invariant pattern) proving 0/1-item inputs render nothing and a 7-item input is capped at 6.

**P-PRICE-4 — Semantic markup / accessibility**
- Objective: `<section aria-labelledby>` connected to the `<h2>`'s `id`; convert the card list to `<ul>/<li>`.
- Files likely affected: `components/home/price-strip.tsx` only.
- DB migration: **No.**
- Risk: Low — pure markup change, same visual output achievable with `list-style:none`/flex-on-`ul` (no CSS redesign required, per this task's "do not redesign" instruction being respected in the follow-up phase too).
- Validation gate: a new component source-text test (mirroring `header-frozen-spec-invariants.test.ts`'s established pattern) pinning the semantic structure.

**P-PRICE-5 — Benchmark curation + responsive/visual verification**
- Objective: once a real provider exists (out of this repo's current scope — see `docs/pricing/PRICE_PROVIDER_CONTRACT.md` §14), populate `price_display_products` with the CORE 4 + OPTIONAL 2 real catalog products; run the full responsive/accessibility acceptance matrix (§22) against real rendered data at the 7 required viewports × 3 locales.
- Files likely affected: none in source — pure D1 data population + verification.
- DB migration: **No.**
- Risk: Medium — this is the first phase that touches real commercial-adjacent data; requires the provider itself to exist first (blocked on an Odoo-side API change, per the contract doc, or an alternative approved provider).
- Validation gate: live dev-server + browser verification at every viewport/locale/data-state combination in §22's matrix.

# RISKS

- **Freshness redesign (P-PRICE-1) changes the existing, already-documented, already-tested "show stale rather than nothing" contract** (`docs/pricing/PRICE_PROVIDER_CONTRACT.md` §10, point 4) — this is a deliberate architecture decision reversal, not a bug fix. It should be confirmed with whoever owns the V2.1 spec before implementation, since it directly contradicts a documented, tested, intentional design choice made in DAR-051.
- **No real provider exists** — every phase above except P-PRICE-5 can be built and tested with synthetic *test* fixtures (mirroring this session's own read-only verification approach), but nothing can be verified against real commercial data until an Odoo-side API change or an alternative provider is approved and implemented. This is outside this repository's current scope entirely.
- **The "AUTHORITATIVE SPEC" document does not exist in this repo** — every V2.1 requirement audited here came from the task prompt's own inline description. If a real spec document exists elsewhere (not committed to this repo), gaps identified here should be reconciled against it before implementation, since this audit could not consult it directly.

  > **Provenance update (2026-09-04, added during the subsequent Spec Reconciliation task — this bullet left unaltered above as historical record):** the real owner-approved artifact was located and committed at `docs/pricing/AHANASSA_PRICE_STRIP_FINAL_FROZEN_V2.1.md`. It is substantially larger and more detailed than the task-prompt paraphrase this audit worked from (61 sections spanning versions 1.0–2.1, vs. the ~24-point compilation available at the time), but the gaps identified in this audit's own findings above (freshness model, trust guidance, card fields, semantic markup, 2-item threshold, visual surface color) were independently re-confirmed as real and consistent with the full spec, not artifacts of an incomplete paraphrase — see `docs/pricing/PRICE_STRIP_V2.1_ARCHITECTURE_DECISIONS.md`'s consistency review.

# OPEN QUESTIONS

1. ~~Does a real "AHANASSA HOMEPAGE PRICE STRIP — FROZEN V2.1" document exist outside this repository?~~ **Resolved 2026-09-04:** yes — supplied and committed at `docs/pricing/AHANASSA_PRICE_STRIP_FINAL_FROZEN_V2.1.md` during the Spec Reconciliation task.
2. Is the "show stale, labeled, rather than hide" behavior (current, documented, tested) truly superseded by V2.1's "hide on stale," or does V2.1 intend a narrower reinterpretation (e.g., "stale" in V2.1 means something closer to what this codebase calls a genuinely old/unavailable quote, while a *recently*-stale quote might still be shown as "AGING")? This materially changes the scope of P-PRICE-1.
3. Which real provider is intended to eventually populate this? The only registered adapter (`odoo-price-provider.ts`) is a stub by design, per a confirmed Odoo API limitation — is a non-Odoo provider under consideration, or is this blocked entirely on an Odoo-side change?
4. Is "Specification" (task §10) intended to be a distinct DB column (not currently modeled anywhere in `public_price_quotes`/`price_display_products`), or derived from the existing catalog `template_xid`'s own spec data (which the Catalog domain already stores, e.g. `dimensions_json`)? This affects whether P-PRICE-2 needs a new migration after all.

# GIT STATUS

```
git status --short   -> (empty — clean, unchanged from preflight)
```

No file was created, modified, or deleted during this audit. `docs/pricing/PRICE_STRIP_V2.1_AUDIT.md` (this file) is the only filesystem change, written as the task's own explicit final deliverable.

# PRODUCTION SAFETY

- Files modified by audit: **NONE** (source/tests/migrations/other docs — untouched)
- Commits: **NONE**
- Push: **NO**
- Deploy: **NO**
- Production D1 migration: **NO**
- Staging D1 migration: **NO**
- Odoo writes: **NO** (Odoo was not accessed at all this session)
- Cloudflare config changes: **NO**
- Local D1 reads performed (read-only `SELECT`/`sqlite_master` queries against the existing local dev D1 instance only, via `wrangler d1 execute --local`) — zero writes, zero `--remote` flag used, zero fake/demo data inserted.

---

`PRICE STRIP SOURCE-OF-TRUTH: PASS`
`PUBLIC PRICE PROJECTION: PASS`
`BENCHMARK CURATION: PASS` *(mechanism; data population is a separate, correctly-deferred future step)*
`PRICE BASIS INTEGRITY: PASS`
`PROVENANCE: PASS`
`FRESHNESS POLICY: FAIL`
`LAST-KNOWN-GOOD SAFETY: PASS`
`SSR / NO-LIVE-ODOO: PASS`
`V2.1 UX CONTRACT: FAIL`
`V2.1 TEST COVERAGE: PARTIAL`

`AHAN ASA PRICE STRIP V2.1 AUDIT: PARTIAL`
