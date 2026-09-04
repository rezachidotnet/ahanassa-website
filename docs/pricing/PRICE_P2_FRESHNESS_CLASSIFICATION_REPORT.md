# PRICE-P2 — Freshness Classification Domain Logic — Verification Report

## RESULT

PASS.

## PREFLIGHT

- Working tree at task start: clean except this task's own subsequent changes; no unrelated dirty state.
- `PRICE_STRIP_ENABLED` not set/enabled anywhere in this change. Not touched.
- No push, no deploy, no staging/production D1 migration performed.
- No Odoo, Cloudflare secrets/DNS, or Cron Trigger changes.
- No changes to `docs/pricing/AHANASSA_PRICE_STRIP_FINAL_FROZEN_V2.1.md`.
- No fake/synthetic production data inserted.
- No prior migration rewritten. `migrations_public/0008_price_variant_identity_and_provider_policy.sql` (PRICE-P1) is unmodified by this phase.

## BASE SHA

`9bffc6ca4953c912ccb78940ca655861198e8d52` (PRICE-P1 durability checkpoint, prior HEAD before this phase began).

## PRICE-P2 RUNTIME COMMIT SHA

`fff3d1cdd2041cafb7314a3bf4caedb797a3ac19`

## LEGACY FRESHNESS MODEL

Prior to this phase, freshness was a single boolean (`isStale`) computed by comparing a quote's timestamp against one universal, provider-agnostic 24-hour threshold — the same threshold applied identically to every provider regardless of that provider's actual publication cadence (intraday market feeds, once-daily ERP syncs, weekly/monthly index publications), and applied identically across weekends/holidays with no business-day awareness. `selectWinningQuote`'s legacy behavior also fell back to the highest-priority STALE quote (visibly marked stale) when no fresh quote existed for the target basis.

## NEW CLASSIFIER

`lib/pricing/freshness.ts#classifyQuoteFreshness` — pure, D1-free, deterministic given `{ now, sourceTimestamp, syncedAt, policy }`. Returns one of four states: `"fresh" | "aging" | "stale" | "unavailable"` (`FreshnessState`, defined in `lib/pricing/types.ts` to avoid a circular import with `normalize.ts`). No provider-name branching anywhere in the module.

## FRESH RULE

Zero missed expected publication cycles have elapsed between the quote's effective timestamp and `now`, per its provider's policy.

## AGING RULE

Exactly one missed expected publication cycle has elapsed.

## STALE RULE

Two or more missed expected publication cycles have elapsed.

## UNAVAILABLE RULE

No provider policy resolvable for the quote's provider; the effective timestamp is missing/malformed (fails `Date.parse`); the effective timestamp is materially in the future (beyond the existing 5-minute skew tolerance, `FUTURE_TIMESTAMP_SKEW_ALLOWANCE_MS`); or the policy's `cadenceIntervalUnit` is unsupported (defensive — should be unreachable given P1's upstream `validateProviderPublicationPolicy`, but fails closed rather than defaulting).

## EXPECTED-CYCLE MODEL

`lib/pricing/provider-policy.ts#countMissedExpectedCycles(policy, from, to)` dispatches on `policy.cadenceIntervalUnit` (never `cadenceKind`, which remains a purely descriptive/audit label):
- `hours` → fixed-length millisecond-interval counting.
- `days` → reuses PRICE-P1's existing `countExpectedPublicationDaysBetween` (business-day/weekday-aware, timezone-aware).
- `weeks` → fixed-length 7×interval-count-day millisecond counting.
- `months` → genuine calendar-month arithmetic via `Intl.DateTimeFormat`-derived year/month parts in the policy's timezone, not a 30-day approximation.
- unsupported unit → `null`, which the classifier maps to `UNAVAILABLE`.

`to.getTime() <= from.getTime()` short-circuits to `0` (no negative/zero-elapsed-time cycle counts).

## INTRADAY RESULT

PASS. `lib/pricing/freshness.test.ts`: within-cycle → FRESH, one missed cycle → AGING, two missed cycles → STALE, all verified against an explicit 4-hour-cadence policy. `lib/pricing/provider-policy.test.ts` additionally verifies `countMissedExpectedCycles` directly for 2h/4h intervals and confirms intraday cadences ignore `publicationWeekdays`.

## DAILY RESULT

PASS. Normal FRESH/AGING/STALE progression verified in `freshness.test.ts`.

## WEEKLY RESULT

PASS. Verified in both `provider-policy.test.ts` (1-week/2-week interval arithmetic) and `freshness.test.ts` (end-to-end FRESH/AGING/STALE classification through a weekly policy).

## MONTHLY RESULT

PASS. Verified via genuine calendar-month semantics, including the critical single-day-boundary-crossing proof (e.g. Aug 31 → Sep 1 counts as 1 missed cycle, which a fixed 30-day-window approximation would incorrectly count as 0), same-month, exact-one-month, two-month, 2-month-interval, and year-boundary (Dec→Jan) cases in `provider-policy.test.ts`; end-to-end FRESH/AGING/STALE classification confirmed in `freshness.test.ts`.

## WEEKEND/BUSINESS-DAY RESULT

PASS — the mandated critical test case. For a business-daily policy (`publicationWeekdays: [1,2,3,4,5]`), a Friday-morning quote is verified FRESH through Friday itself, remains a valid non-STALE state through Saturday and Sunday (`freshnessState !== "stale"`, in fact still `"fresh"` since no expected publication day has yet been missed), becomes AGING only once Monday (the next expected business day) arrives (exactly one missed cycle), and becomes STALE only once Tuesday arrives (two missed business days: Monday and Tuesday). A weekend alone never advances the classification past FRESH. See `freshness.test.ts` tests tagged "business-daily".

## TIMEZONE RESULT

PASS. Reuses PRICE-P1's existing timezone-aware weekday validator (`isoWeekdayInTimezone`, via `countExpectedPublicationDaysBetween`) — no second timezone validator was introduced (task §12). `freshness.test.ts` verifies a UTC instant that falls on different local calendar days in UTC vs. `Asia/Tehran` does not fabricate a false missed cycle for a Tehran-timezone business-daily policy.

## NO-SYNC TRANSITION RESULT

PASS — the mandated proof. `freshness.test.ts` ("no-sync progression") holds `sourceTimestamp`/`syncedAt`/`policy` fixed and classifies three different `now` values, producing FRESH → AGING → STALE purely from the passage of time. No database write, sync call, or reconciliation of any kind occurs in `classifyQuoteFreshness` or any function it calls — it is a pure function of its four inputs.

## SOURCE TIMESTAMP VS SYNCED_AT

PASS. `classifyQuoteFreshness` computes `effectiveTimestampRaw = sourceTimestamp ?? syncedAt` — `source_timestamp` is authoritative whenever present; `synced_at` is used only as a fallback when `source_timestamp` is `null`. Verified directly: a quote with an old `source_timestamp` but a freshly-updated `synced_at` still classifies STALE (re-syncing does not launder staleness), and a quote with `source_timestamp: null` correctly falls back to `synced_at`.

## FUTURE/MALFORMED TIMESTAMP BEHAVIOR

PASS. A timestamp that fails `Date.parse` classifies `UNAVAILABLE` (fail-closed, never guessed). A timestamp more than `FUTURE_TIMESTAMP_SKEW_ALLOWANCE_MS` (5 minutes — reused unchanged from `lib/pricing/normalize.ts`, exported rather than duplicated) ahead of `now` classifies `UNAVAILABLE`; a timestamp within that tolerance classifies normally.

## QUOTE SELECTION RESULT

PASS. `lib/pricing/quote-selection.ts#selectWinningQuote` rewritten: filters to exact-basis candidates (unit/currency/market/delivery-basis, plus exact `variantKey` match when the target has curated one), classifies each via `classifyQuoteFreshness` using its own provider's policy, prefers FRESH over AGING regardless of provider priority, breaks ties within a tier by configured provider priority order, and never returns a STALE or UNAVAILABLE winner — returns `null` instead (the frozen V2.1 supersession of the legacy stale-fallback). 18 tests in `quote-selection.test.ts`, including an explicit "a STALE-only candidate set returns null" and "an UNAVAILABLE-only candidate set (missing policy) returns null" test pair.

## MISSING POLICY RESULT

PASS. A provider with no resolvable `price_provider_policies` row (or absent from the `policies` map passed to `selectWinningQuote`) classifies every one of its quotes `UNAVAILABLE`, which the selector never returns as a winner. `lib/pricing/provider-policy-repository.ts#getProviderPublicationPolicy(db, providerId)` returns `null` for a missing row or a row that fails `validateProviderPublicationPolicy` — never a partially-valid/defaulted policy.

## LEGACY 24H REMOVAL

Confirmed removed. `freshness.test.ts` includes an explicit regression proof: a quote aged exactly 25 hours under a 48-hour-cadence intraday policy still classifies FRESH — a hardcoded universal 24-hour rule would have wrongly classified it AGING/STALE. No remaining reference to a fixed 24-hour threshold exists anywhere in `lib/pricing/`.

## FILES CREATED

- `lib/pricing/freshness.ts`
- `lib/pricing/freshness.test.ts`
- `lib/pricing/provider-policy-repository.ts`

## FILES MODIFIED

- `lib/pricing/normalize.ts` (exported `FUTURE_TIMESTAMP_SKEW_ALLOWANCE_MS` for reuse)
- `lib/pricing/provider-policy.ts` (added `countMissedExpectedCycles` and its cadence-unit dispatch helpers)
- `lib/pricing/provider-policy.test.ts` (added ~20 tests for the new dispatcher)
- `lib/pricing/quote-selection.ts` (rewritten selection semantics)
- `lib/pricing/quote-selection.test.ts` (rewritten, 18 tests)
- `lib/pricing/repository.ts` (`getHomepagePriceStrip` rewritten: batched candidate fetch, batched policy lookup, new selection call signature)
- `lib/pricing/types.ts` (added `FreshnessState`; replaced `PublicPriceStripItem.isStale: boolean` with `freshnessState: FreshnessState`)
- `components/home/price-strip.tsx` (minimal compile-fix swap from `isStale` to `freshnessState === "aging"`; no UI redesign — AGING-specific copy explicitly deferred to a later phase, per task instruction not to redesign the UI in this phase)

## PRICING TEST RESULTS

`npx tsx --test lib/pricing/*.test.ts` → **143 pass, 0 fail** (includes 26 in the new `freshness.test.ts`, 37 in the extended `provider-policy.test.ts`, 18 in the rewritten `quote-selection.test.ts`, plus all pre-existing pricing tests unchanged/passing).

## FULL TEST RESULTS

`npm test` (full repository suite) → **761 pass, 0 fail**.

## TYPESCRIPT RESULT

`npx tsc --noEmit` → clean, 0 errors.

## BUILD RESULT

`npm run build` (`vinext build`) → succeeded. All 11 routes built (`/:locale`, `/:locale/about`, `/:locale/contact`, `/:locale/industries`, `/:locale/markets`, `/:locale/products`, `/:locale/products/:slug`, `/:locale/request`, `/:locale/services`, `/api/hello`, `/api/rfqs`). `tsconfig.tsbuildinfo` restored via `git restore` after the build (generated artifact, never committed).

## REGRESSION RESULT

PASS, all four named domains re-run individually with zero failures:
- Header/content: `npx tsx --test lib/content/*.test.ts` → 38 pass.
- Processing: `npx tsx --test lib/processing/*.test.ts` → 42 pass.
- Product Catalog: `npx tsx --test lib/catalog/*.test.ts` → 213 pass.
- RFQ/Contact: `npx tsx --test lib/rfq/*.test.ts` → 192 pass.

## GIT

- Commit A (runtime + tests only): `fff3d1cdd2041cafb7314a3bf4caedb797a3ac19` — `feat: add cadence-aware price freshness classification`.
- Commit B (this report; evidence only): recorded after this file is committed — see final response for its SHA.
- No amendment of Commit A. No push. No force operations.
- A pre-existing untracked file, `docs/pricing/PRICE_P1_DURABILITY_CHECKPOINT.md`, was left over from the prior PRICE-P1 durability-checkpoint phase (that phase's own scope did not require committing it). It is documentation/evidence only, contains no runtime or migration content, and is folded into Commit B alongside this report so that the working tree is genuinely clean at the end of this phase, per this phase's explicit "git status --short must be empty" requirement. It is not part of PRICE-P2's runtime scope.

## PRODUCTION SAFETY

No staging/production D1 migration executed. No local D1 test fixture data was inserted or needed for this phase — all new logic (`classifyQuoteFreshness`, `countMissedExpectedCycles`, `selectWinningQuote`) is pure/deterministic and fully covered by `node --test`/`tsx --test` without touching any database. `PRICE_STRIP_ENABLED` remains untouched (not set to `"true"` anywhere). `lib/pricing/provider-policy-repository.ts` is new D1-touching code but is a thin, directly-inspectable read (`SELECT ... FROM price_provider_policies WHERE provider_id = ?`) delegating all validation to P1's existing `validateProviderPublicationPolicy` — it introduces no new SQL write path and was not exercised against live D1 in this phase (matches this repo's convention of live-verifying schema/migration-adjacent SQL specifically, which P1 already did for the underlying table; this phase adds no new migration).

## REMAINING RISKS

- `provider-policy-repository.ts` has not been live-verified against an actual local D1 instance in this phase (only unit-level trust in its SQL shape and its delegation to already-tested validation). A future phase wiring `PRICE_STRIP_ENABLED=true` end-to-end should include a live D1 smoke test of this repository function.
- `price-strip.tsx`'s AGING-state copy currently reuses the pre-existing "stale" label/wording (`t.staleLabel`) as a placeholder rather than dedicated AGING copy — flagged inline in the component as deferred, not a defect, but a known follow-up for whichever phase does the UI/copy work (frozen spec §24.2).
- No production/staging quote or policy data exists yet to exercise this classifier against; all verification is against synthetic inputs in pure unit tests, consistent with this phase's explicit "do not insert fake production data" constraint.

## NEXT PHASE

PRICE-P3 (or whichever phase is next authorized) can build the Homepage Price Strip UI's FRESH/AGING presentation and `PRICE_STRIP_ENABLED` activation path on top of this classifier and `getHomepagePriceStrip`, without needing to revisit the freshness domain logic itself.

## AHAN ASA PRICE-P2: PASS
