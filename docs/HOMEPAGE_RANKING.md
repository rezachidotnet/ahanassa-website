# Homepage Ranking

Homepage Product Architecture Hardening, 2026-09-03. Companion to `docs/CATALOG_PUBLIC_ROUTES.md` §16-19 — that document covers *which* products are eligible; this one covers *what order* they appear in.

---

## 1. Score formula

```
Homepage Score = Base Priority + Demand Score + Manual Boost
```

Implemented in `lib/ranking/score.ts#computeHomepageScore`:

- **`base` mode:** `score = basePriority + manualBoost` — the demand term is completely ignored, not merely zeroed-but-computed (defense in depth: a caller that forgets to skip the demand-aggregation query in base mode still gets a correct score).
- **`auto` mode:** `score = basePriority + demandScore + manualBoost`, where `demandScore` is produced by `lib/ranking/demand-aggregation.ts#aggregateDemandSignals`.

**v1 is deliberately a single honest signal (code review hardening pass, DAR-054):** `demandScore` is one exponentially-decayed count of distinct accepted RFQs per template — not two separately-named terms. An earlier version computed "RFQ frequency" and "distinct RFQ count" as two identically-derived accumulators (both summing the exact same per-signal decay weight) and added them together, which was double-counting one observation under two names, not two independent signals. A genuinely independent "distinct CUSTOMER demand" signal — the originally-envisioned second term — would need a safe, verified customer identity to group by; no such identity exists in the current RFQ schema without inventing customer fingerprinting or using IP (both explicitly out of scope). That second term is deferred until a real, privacy-safe identity is available, rather than faked by re-weighting the same count under a different name.

Ranking operates strictly at **Product/Template level** (`catalog_products`/`templateXid`) — never per-variant. `rfq_items.product_ref` (the field the demand aggregator reads) is populated with the template's `templateXid`, not a variant xid (confirmed in `lib/rfq/catalog-preselection.ts#buildCatalogItemRecord`), so "rebar Ø16" and "rebar Ø18" always contribute to the same demand bucket.

Ties (including the all-zero/no-demand-yet case) are broken deterministically by `templateXid` ascending (`lib/ranking/score.ts#sortByHomepageScore`) — never by insertion/D1-scan order, so the homepage's order is stable and reproducible across renders even before any real demand data exists.

---

## 2. Base priority

Stored on `homepage_product_rank.base_priority` (`migrations_public/0005_homepage_projection.sql`), one row per `catalog_products.id`, default `0`. No existing `sort_order`/priority/rank field was found anywhere in the pre-existing schema (`catalog_products`/`product_variants` were checked directly) that could safely be reused, and no pre-approved initial ordering exists — every template starts at a neutral `0` rather than a fabricated ranking. A template with no `homepage_product_rank` row at all (the normal case until an editor sets one) reads as `0` via the repository's `LEFT JOIN`, not an error.

Independently, manually editable later (no admin UI exists yet — this is a deliberate, documented gap, not a silent one; direct D1 writes via the existing operator tooling convention are the interim path, matching how `lib/catalog/sync-runner.ts`'s own manual-CLI precedent works).

---

## 3. Demand aggregation — privacy boundary

```
DB_OPS (rfq_items, rfqs)
  -> aggregate-only read (lib/ranking/aggregation-orchestrator.ts#fetchRfqDemandSignals)
  -> pure decay/aggregate (lib/ranking/demand-aggregation.ts, no D1 involved)
  -> safe derived metric (one numeric demand_score per templateXid)
  -> DB_PUBLIC write (homepage_product_rank.demand_score)
```

The **only** DB_OPS columns ever read are `rfq_items.product_ref` and `rfqs.created_at`, filtered to `rfqs.status NOT IN ('spam', 'cancelled')` (the safe "accepted" set — no new qualification/status value was invented) and deduplicated per `(rfq_id, product_ref)` so multiple line items for the same template within one RFQ count as one demand signal, not several. **Nothing else ever leaves DB_OPS** — no email, phone, customer name, IP, notes, quantity, or any other RFQ content. The **only** thing ever written to DB_PUBLIC is `homepage_product_rank.demand_score` (a `REAL`) + `demand_computed_at` — never a raw RFQ row, never anything customer-identifying.

Abuse-filtering (Turnstile, rate limiting) is never duplicated here — an RFQ only reaches `rfqs`/`rfq_items` at all after passing the existing `lib/security/turnstile.ts`/`lib/security/rate-limit.ts` gates at submission time (`lib/rfq/service.ts`).

Large tonnage never dominates: `DemandSignal` (`lib/ranking/demand-aggregation.ts`) carries only `{ templateXid, occurredAt }` — no quantity field exists on the type at all, so a single very-large RFQ cannot outweigh many smaller, more frequent ones. The signal is distinct-accepted-RFQ count, decayed by recency.

**Full reconciliation, not additive-only (DAR-054):** `runDemandAggregation` treats every successful run as the CURRENT aggregate truth, not an incremental update. It re-evaluates every template it has ever scored before (every row currently in `homepage_product_rank`), union'd with every template that has a current signal — a template that previously had demand but has none today (e.g. its only qualifying RFQ was later marked spam/cancelled by staff) is explicitly written back to `demand_score = 0`, never left at its last nonzero value. An entirely empty current signal set does NOT short-circuit as "nothing to do" — it still clears every previously-tracked row to 0 if any exist; only a run with zero current signals AND zero previously-tracked rows is a true no-op (no write attempted at all). The whole reconciliation for one run — every upsert and every zero-out — is applied in a single D1 `.batch()`: a failure partway through leaves `homepage_product_rank` completely untouched, never partially updated. `base_priority`/`manual_boost` are structurally impossible for this write to touch — the `ON CONFLICT` clause only ever sets `demand_score`/`demand_computed_at`/`updated_at`.

---

## 4. Decay

Continuous exponential decay (`lib/ranking/decay.ts#exponentialDecayWeight`), not hard day-boundary buckets — `weight = 0.5 ^ (ageInDays / halfLifeDays)`.

`DEMAND_HALF_LIFE_DAYS = 30` — explicit, documented, and deliberately conservative rather than fitted against real traffic (none exists yet at the volume needed to tune it). Chosen as roughly one B2B steel-procurement quoting cycle: a single RFQ six months old should barely move today's ranking; a real current demand spike should show up within days. Changing this constant is a one-line, documented change, not a behavioral guess baked into a formula.

---

## 5. Manual boost

`homepage_product_rank.manual_boost` — a plain signed integer, independently editable/resettable, applied in **both** ranking modes (an editorial pin/demotion is a presentation decision, not a demand signal, so it is not gated on `auto` mode). Never written by `lib/ranking/aggregation-orchestrator.ts` (which only ever touches `demand_score`/`demand_computed_at`) and never derived from or written back to Odoo.

---

## 6. Ranking mode kill switch

`env.HOMEPAGE_RANKING_MODE` (`wrangler.jsonc` `vars`, both `production` and `staging`, default `"base"`) — resolved via `lib/ranking/score.ts#resolveHomepageRankingMode`, which maps exactly `"auto"` to auto mode and **everything else** (missing, empty, misspelled, any other value) safely to `"base"`. Never throws. Follows the exact same plain-string-var convention `PRICE_STRIP_ENABLED`/`ENABLED_PRICE_PROVIDERS` already established — no new feature-flag platform, no KV binding added (none exists in `wrangler.jsonc` today).

Flipping to `"auto"` is a separate, later, explicit deployment step, never bundled with an app-code deploy — matching the price strip's own documented rollout discipline (`docs/pricing/PRICE_PROVIDER_CONTRACT.md` §"Safe rollout order").

---

## 7. Computation cadence

`lib/ranking/aggregation-orchestrator.ts#runDemandAggregation` is written, unit-testable both at the pure-logic layer (`lib/ranking/demand-aggregation.test.ts`, `lib/ranking/decay.test.ts`, `lib/ranking/score.test.ts`) AND at the orchestration-flow layer via injected fake D1 dependencies (`lib/ranking/aggregation-orchestrator.test.ts` — proves full-reconciliation-to-zero, `base_priority`/`manual_boost` preservation, and atomic all-or-nothing failure, since `DemandAggregationDeps` never has a static top-level `cloudflare:workers` dependency, unlike most of this repo's D1-touching repository code), and validated live (its exact DB_OPS read query and DB_PUBLIC upsert statement were run directly against real local D1 data during implementation — see this task's final report). It is **deliberately not wired into `workers/entry.ts`'s cron switch or `wrangler.jsonc`'s `triggers.crons`** in this pass, mirroring `lib/pricing/sync-orchestrator.ts#runScheduledPriceSync`'s own precedent (also written/tested but not cron-wired until a real price provider exists). Here the reason is symmetric: ranking only matters once `HOMEPAGE_RANKING_MODE=auto` is actually turned on, so scheduling real D1 work for a mode nothing currently uses would be wasted. Wiring a `DEMAND_AGGREGATION_CRON` case into `workers/entry.ts#scheduled()` calling `runDemandAggregation` is a deferred, one-line manual step for that later moment — each run re-reads the full current RFQ demand history (not incremental) and recomputes decay against "now", so scores always reflect current decayed demand on every run, without needing a watermark.

It reads the full accepted-RFQ history each run rather than incrementally, by design: RFQ volume for a B2B steel procurement site is expected to stay small enough that this is materially simpler than a watermark-based incremental design, and decay naturally makes old demand's contribution shrink toward (but never exactly reach) zero on every recomputation — it does not need to be explicitly reset.

---

## 8. Sync Health observability

Not part of ranking directly, but built in the same pass (this task's §3 "one acceptable gap"): `lib/catalog/sync-health.ts#evaluateCatalogSyncHealth` (pure, unit-tested) + `lib/catalog/sync-state-repository.ts#getCatalogSyncHealth` (D1-backed) surface `lastSuccessAt`/`ageSinceSuccessMs`/`consecutiveFailureCount`/`isHealthy` from the existing `catalog_sync_state` table — no new table, no external alerting vendor integration. A read primitive for whatever surface (internal CLI, log line, future admin view) chooses to consume it.
