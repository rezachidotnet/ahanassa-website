# PRICE-P3.1 — Exact Quote-to-Variant Binding Gate — Verification Report

# RESULT

READY FOR PRICE-P4.

# PREFLIGHT

- `pwd`: `/Users/reza/Developer/ahanassa-website`
- `git branch --show-current`: `feat/header-frozen-v2`
- `git rev-parse HEAD` at task start: `42283fca9afc689c313084345f795ca1d36df002`
- `git status --short` at task start: empty.
- `git log --oneline --decorate -8` at task start:
  ```
  42283fc (HEAD -> feat/header-frozen-v2) docs: record Price Strip P3 read-model report
  24b261c feat: complete exact-variant Price Strip read model
  4918713 docs: record Price Strip P2 verification report
  fff3d1c feat: add cadence-aware price freshness classification
  9bffc6c docs: record Price Strip P1 durability evidence
  a219d23 feat: add exact price variant identity and freshness policy
  6b5e4f6 docs: reconcile Price Strip v2.1 with owner-approved spec
  7204f00 docs: freeze Price Strip v2.1 architecture decisions
  ```
- PRICE-P3 runtime commit `24b261c8c79020c7cdd8bd9fbffb2bf307f7d646` verified present.
- PRICE-P3 report (`docs/pricing/PRICE_P3_READ_MODEL_REPORT.md`) verified present.
- PRICE-P3 report evidence commit `42283fca9afc689c313084345f795ca1d36df002` verified present.
- No unrelated drift found — proceeded.
- `PRICE_STRIP_ENABLED` not touched. No push, no deploy, no remote D1 migration. No Odoo/Cloudflare/DNS changes. No UI redesign. No new migration (none needed — confirmed below).

# INITIAL FINDING

**EXACT VARIANT BINDING ALREADY PRESENT.**

# CANDIDATE QUOTE QUERY

`lib/pricing/repository.ts`, the candidate-quote fetch for one `price_display_products` row:

```sql
SELECT provider_id, unit, currency, market_or_location, delivery_basis, variant_key, price_amount_irr, source_timestamp, synced_at
FROM public_price_quotes
WHERE product_key = ? AND status = 'active'
```

Bound to `display.product_key` only. `variant_key` is selected (read) but **not** part of the `WHERE` clause — confirmed by direct source inspection and by a live D1 run of this exact statement (see LOCAL D1 RESULT).

# VARIANT BINDING LOCATION

Answer to task §2's A/B/C/D question: **C — inside `selectWinningQuote`**, specifically `lib/pricing/quote-selection.ts#matchesBasis`:

```ts
if (target.variantKey !== null) {
  return candidate.variantKey === target.variantKey;
}
return true;
```

`lib/pricing/repository.ts` always constructs `target.variantKey = display.variant_key` for every PRICE-P3 benchmark (the curated-row query itself is `WHERE ... variant_key IS NOT NULL`, so this is never `null` for a real Homepage row) — so every quote-selection call for a Homepage benchmark already has a non-null exact-variant target, and `matchesBasis` enforces a strict `===` equality against it. A sibling variant's `candidate.variantKey` fails this equality; a `null`-variant legacy quote also fails it (since `null !== "the-exact-variant-xid"`).

Template identity is enforced by a **separate** mechanism — the SQL `WHERE product_key = ?` above — so a quote belonging to a different template is never even fetched as a candidate for the wrong display row in the first place, regardless of what its own `variant_key` is. Together, SQL-level `product_key` scoping + pure-function-level `variant_key` equality jointly enforce the full commercial invariant (task §3) — this was already true immediately after PRICE-P3 (which always populates `target.variantKey`), inherited unchanged from the `matchesBasis` exact-variant logic PRICE-P1/P2 originally wrote for a narrower purpose (backward-compatible template-only targets) and never revisited PRICE-P3 needed to add anything to.

No runtime code was changed in this phase — see RUNTIME FIX COMMIT.

# SIBLING VARIANT TEST

PASS. Three new adversarial tests in `lib/pricing/quote-selection.test.ts`, exactly matching task §4's scenario (Template T, Variant A / Variant B, display targets Variant B):
- "Variant A (higher provider priority, fresher timestamp) never wins over Variant B" — Variant B's quote wins despite lower priority and merely AGING freshness.
- Candidate insertion order does not matter (tested both orderings).
- A cheaper sibling-variant candidate does not win over a correct-variant candidate with a much higher price — price never overrides variant identity.

# NULL VARIANT TEST

PASS. Two new tests:
- A legacy template-only quote (`variant_key: null`) never satisfies an exact-variant target, even as the sole candidate.
- Excluded even when it is the *only fresh* candidate among otherwise-eligible sibling-variant quotes (a stacked adversarial case) — the result is `null`, never a fallback.

# WRONG TEMPLATE TEST

PASS — verified live against local D1 (see LOCAL D1 RESULT), since this invariant is enforced at the SQL layer, not inside `selectWinningQuote`, and so cannot be exercised by a pure `quote-selection.test.ts` unit test. A quote whose `product_key` differs from the display row's own `product_key` — even when it carries the display's own real target `variant_key` — is structurally never fetched as a candidate at all.

# PROVIDER PRIORITY RESULT

PASS. The sibling-variant attack test explicitly gives the wrong-variant candidate the *higher* provider priority; the correct-variant candidate still wins. A second test confirms ordinary provider-priority tie-breaking is untouched *among* two candidates that both carry the correct exact variant.

# FRESHNESS RESULT

PASS. The sibling-variant attack test explicitly gives the wrong-variant candidate a *fresher* (FRESH) timestamp against the correct-variant candidate's merely AGING timestamp; the correct-variant (AGING) candidate still wins — freshness tiering never overrides variant identity.

# BASIS INTEGRITY

PASS. Pre-existing tests (unchanged, re-verified) confirm unit/currency/market/delivery-basis mismatches are still excluded exactly as before; the "never averages" test still passes. Variant-binding enforcement is additive to, not a replacement for, the existing basis-matching logic in the same `matchesBasis` function.

# LOCAL D1 RESULT

Used, local-only, no `--remote` flag. Fixtures clearly test-only (`test-p31-*` quote keys), deleted immediately after the check, final row count confirmed back to 0.

Fixture: three rows in `public_price_quotes` —
- `test-p31-a`: `product_key = 'test-p31-template-1'`, `variant_key` = real xid for rebar Ø10 (Variant A).
- `test-p31-b`: `product_key = 'test-p31-template-1'`, `variant_key` = real xid for rebar Ø16 (Variant B).
- `test-p31-wrong-template`: `product_key = 'test-p31-template-2'` (a **different** template), `variant_key` = the SAME real xid as Variant B — i.e. "wrong template, right variant" (task §6).

Ran the exact repository SQL scoped to `product_key = 'test-p31-template-1'`. Result: **exactly** `test-p31-a` and `test-p31-b` returned; `test-p31-wrong-template` never appears, despite carrying a `variant_key` that would otherwise match. This proves task §6's scenario is excluded, and confirms — by the fact that BOTH Variant A's and Variant B's quotes came back from a query scoped only by `product_key` — that the SQL layer itself does not narrow by `variant_key` (matching the CANDIDATE QUOTE QUERY finding exactly: that narrowing happens purely in `matchesBasis`).

# FILES MODIFIED

- `lib/pricing/quote-selection.test.ts` (6 new tests: 3 sibling-variant attack scenarios, 2 NULL-variant-quote scenarios, 1 same-exact-variant priority sanity check). No production/runtime file modified — `lib/pricing/repository.ts`, `lib/pricing/quote-selection.ts`, `lib/pricing/price-strip-item.ts`, `lib/pricing/types.ts`, and `lib/catalog/editorial-repository.ts` are all byte-for-byte unchanged from PRICE-P3's runtime commit (`24b261c`).

# RUNTIME FIX COMMIT

NONE — no defect was found; no runtime/behavior code was changed.

(The 6 new proof tests were committed separately, as they are not a "fix": `3d865cef8be7af4e3c4fa15081958a7513b0abd8` — "test: prove exact quote-to-variant binding gate holds (PRICE-P3.1)".)

# PRICING TESTS

`npx tsx --test lib/pricing/*.test.ts` → **168 pass, 0 fail** (up from PRICE-P3's 162; +6, all in `quote-selection.test.ts`).

# FULL TESTS

`npm test` (full repository suite) → **793 pass, 0 fail** (up from 787).

# TSC

`npx tsc --noEmit` → clean, 0 errors.

# BUILD

`npm run build` (`vinext build`) → succeeded, all 11 routes built. `tsconfig.tsbuildinfo` restored via `git restore` after the build.

# REGRESSION

Full suite (`npm test`, 793 pass, 0 fail) covers every domain; no separate per-domain re-run was needed since the only change in this phase was additive test cases inside `lib/pricing/quote-selection.test.ts` — a file with zero production import surface into Header/Processing/Catalog/RFQ/Homepage/locale code. `npx tsx --test lib/pricing/*.test.ts` (168 pass) confirms zero regression within the pricing domain itself, including every PRICE-P1/P2/P3 test written in prior phases.

# GIT

- No runtime fix commit (none needed — see RUNTIME FIX COMMIT).
- Test-proof commit: `3d865cef8be7af4e3c4fa15081958a7513b0abd8` — "test: prove exact quote-to-variant binding gate holds (PRICE-P3.1)".
- Report commit (this file; evidence only): recorded after this file is committed — see the final response for its SHA.
- No amendment of any prior commit. No push. No force operations.

# PRODUCTION SAFETY

No migration was needed or applied — `public_price_quotes.variant_key` already exists (migration 0008) with its own index (`idx_public_price_quotes_variant_key`); no SQL-level `AND variant_key = ?` filter was added (not needed — see NEXT PHASE), so that index was not required for this phase's own query pattern, only confirmed present for future use if a query-level filter is ever added. No staging/production D1 touched, no `--remote` flag used, no fake data left in any table (confirmed via a post-cleanup row count).

# NEXT PHASE

No code change is required before PRICE-P4. One documented, deliberately-not-taken option for a future phase (not a defect, an optional hardening): task §7/§9 suggested an SQL-level `AND variant_key = ?` filter as a "preferred defense." This phase did not add it, because (a) the invariant is already fully enforced without it (proven above, both by unit tests and live D1), (b) doing so would fetch fewer rows per query but the curated set is small (≤6 benchmarks) so the performance benefit is negligible, and (c) `matchesBasis` already needs to run for every other basis dimension (unit/currency/market/delivery-basis) regardless, so a partial SQL-level narrowing would not remove the pure-layer check, only duplicate part of it — task §7 itself allows "retain a pure defense-in-depth equality check ... if consistent with existing architecture," and the existing architecture already has exactly that as the primary (not merely defense-in-depth) mechanism. If a future phase's query patterns change (e.g. true batching across many curated rows), revisit adding the SQL-level filter at that time using the already-existing `idx_public_price_quotes_variant_key` index.

PRICE-P4 can proceed to Homepage Price Strip UI work with full confidence that a benchmark's exact variant identity cannot be silently substituted by a sibling variant under any combination of provider priority, freshness, price, or insertion order.
