# PRICE-P1 — Exact Variant Identity + Provider Freshness Policy — Implementation Report

Date: 2026-09-04
Repository: `/Users/reza/Developer/ahanassa-website`
Branch: `feat/header-frozen-v2`

Implements the minimum additive schema/domain foundation `docs/pricing/PRICE_STRIP_V2.1_ARCHITECTURE_DECISIONS.md` §A/§G-§L require, without touching the Price Strip UI/component or the read model (`lib/pricing/repository.ts`, `components/home/price-strip.tsx` — both explicitly out of scope, untouched).

## RESULT

`READY FOR PRICE-P2`

## PREFLIGHT

Branch `feat/header-frozen-v2`, base HEAD `6b5e4f6538c4ae79be1fe2acaeabd31d940fe584`, working tree clean before implementation (one pre-existing untracked file from a prior task, unrelated). Verified before writing any code: `docs/pricing/AHANASSA_PRICE_STRIP_FINAL_FROZEN_V2.1.md` and `docs/pricing/PRICE_STRIP_V2.1_ARCHITECTURE_DECISIONS.md` both exist; latest `migrations_public/` entry is `0007_processing_groups.sql` → next number `0008`, confirmed from disk, not assumed.

## MIGRATION

`migrations_public/0008_price_variant_identity_and_provider_policy.sql` — purely additive: `ALTER TABLE ... ADD COLUMN` (nullable, no default) on the three existing pricing tables + one new `CREATE TABLE price_provider_policies`. Migration `0004` untouched; no table/column dropped or renamed.

**Existing-table inspection before writing the migration** (task §3): all four pricing tables (`public_price_quotes`, `price_product_mappings`, `price_display_products`, `price_sync_state`) confirmed **0 rows** in local D1; `catalog_products` (13 rows) / `product_variants` (237 rows) confirmed real synced data, untouched throughout. The migration was still written as a true additive ALTER regardless of the pricing tables being empty, per the task's own explicit instruction and this directory's standing anti-DROP convention.

## DB_PUBLIC SCHEMA DELTA

```
price_product_mappings  + variant_key TEXT REFERENCES product_variants(xid)   [nullable]
public_price_quotes     + variant_key TEXT REFERENCES product_variants(xid)   [nullable]
                         + idx_public_price_quotes_variant_key
price_display_products  + variant_key TEXT REFERENCES product_variants(xid)   [nullable]
                         + idx_price_display_products_variant_key

price_provider_policies (NEW)
  provider_id             TEXT PRIMARY KEY
  cadence_kind             TEXT NOT NULL CHECK IN ('intraday','daily','weekly','monthly')
  cadence_interval_count    INTEGER NOT NULL DEFAULT 1 CHECK (> 0)
  cadence_interval_unit     TEXT NOT NULL CHECK IN ('hours','days','weeks','months')
  publication_weekdays       TEXT   -- CSV of ISO weekdays 1-7; NULL = every day counts
  timezone                    TEXT NOT NULL DEFAULT 'Asia/Tehran'
  created_at / updated_at
```

## DUAL IDENTITY

`product_key` semantics **entirely unchanged** — still the Product Template public identity, never renamed, never overloaded. `variant_key` is new, carries `product_variants.xid` (never an Odoo integer ID), and is threaded through the full frozen pipeline: curated on `price_product_mappings` → resolved and validated during sync → persisted on `public_price_quotes` → available for curation on `price_display_products`. `lib/pricing/product-mapping.ts#resolveProductMapping` now returns `{ productKey, variantKey }` (was `resolveProductKey` returning a bare string — no other caller existed, so this was a clean rename/extension, not a compatibility shim).

**On extending `NormalizedPriceQuote` (task §15's own "inspect whether... must now carry" framing):** decided **NO**. `NormalizedPriceQuote` is `normalize.ts`'s pure, D1-free output — it has no D1 access and therefore cannot itself know a mapped identity. `productKey` was never part of it even before this task (the orchestrator's own local `mapped: Array<{quote, productKey, quoteKey}>` type already carried it separately) — this task extends that same existing local type with `variantKey`, preserving the established normalize/map layering rather than blurring it. `NormalizedPriceQuote` and the public `PublicPriceStripItem` read-model type are both unmodified.

## VARIANT INTEGRITY

`lib/pricing/variant-integrity.ts` — `variantBelongsToTemplate` (pure comparison) + `resolveAndValidateVariant` (D1-touching: resolves a variant xid's real template via `product_variants JOIN catalog_products`, gated on `pv.is_active = 1` only — deliberately not `is_public`, since this checks identity consistency, not display eligibility). Wired into `lib/pricing/sync-orchestrator.ts`: when a mapping carries a `variant_key`, it is validated against the mapping's own `product_key` before being trusted; a mismatch or dangling reference is treated exactly like any other rejected record (increments `rejectedRecordCount`, feeding the existing `sync-safety.ts` reconciliation gate — no new rejection pathway invented). A `null` `variant_key` skips validation entirely and behaves exactly as before this task.

Real FK (`REFERENCES product_variants (xid)`) added as defense-in-depth — **confirmed genuinely enforced** by this D1/Wrangler local runtime (live-tested: inserting a dangling `variant_key` was rejected with `SQLITE_CONSTRAINT_FOREIGNKEY`) — but the actual authoritative gate is the application-level check above, since the FK alone cannot express "belongs to *this specific* `product_key`," only "is *some* real variant."

## BACKWARD COMPATIBILITY

A mapping/quote/display row with `variant_key IS NULL` is fully valid and unaffected — no variant is invented for it, it simply remains template-level and ineligible for exact-variant benchmark selection until curated (fail-closed, per task §6). Live-verified via a dedicated test (`sync-orchestrator.test.ts`: "a mapping with NO variant_key ... still resolves and persists normally"). Existing `quote_key` uniqueness, provenance, `PRICE_STRIP_ENABLED`-off behavior, the Catalog domain, RFQ, Header, and Processing are all untouched — confirmed by the full regression run below, not merely assumed.

## PROVIDER FRESHNESS POLICY

`lib/pricing/provider-policy.ts` — `ProviderPublicationPolicy` (provider_id, cadence kind, interval count+unit, optional weekday restriction, required timezone) + `validateProviderPublicationPolicy` (fail-closed on every malformed shape) + `countExpectedPublicationDaysBetween` (the specific function proving the weekend rule and the no-sync read-time-derivation requirement — see below). No `if (provider_id === "odoo")` or any provider-specific branch exists anywhere in this module — genuinely generic, config-driven.

**No per-`price_display_products` cadence override was added** (task §11) — no repository evidence of an immediate real requirement exists (the only registered provider, `odoo-price-provider.ts`, remains a non-functional stub); adding one now would be exactly the speculative schema the frozen decisions explicitly forbid.

## CADENCE MODEL

`cadence_kind` (`intraday`/`daily`/`weekly`/`monthly`) is the business-readable category the frozen decisions name as its own concept; `cadence_interval_count` + `cadence_interval_unit` (`hours`/`days`/`weeks`/`months`) give the precise numeric cycle length the actual missed-cycle arithmetic needs. All four required kinds are representable with the identical validation/storage shape — proven by 5 tests, one per kind (intraday every-N-hours, plain daily, business-daily, weekly, monthly), zero code branches distinguishing them.

## WEEKEND / EXPECTED PUBLICATION SCHEDULE

`publication_weekdays` (CSV of ISO weekday numbers, `NULL` = every day counts) is the mechanism. Live-tested, exactly matching the task's own named "critical architectural test" (§23): a Mon-Fri business-daily policy counts the Friday→Monday span as **exactly one** expected publication day (Monday) — Saturday/Sunday never count — while an otherwise-identical policy with no weekday restriction correctly counts all three (Sat/Sun/Mon). A full market/public-holiday calendar engine was **not** built — explicitly deferred and documented, per task §8/§13 and spec §24.3, as this codebase's own disclosed, deliberate V1 scope boundary, not a silent gap.

## TIMEZONE

Every policy carries a required (`NOT NULL`) IANA timezone identifier, defaulting to `Asia/Tehran` — never the Worker runtime's or a browser's local time. Validated fail-closed against a small explicit allow-list (`Asia/Tehran`, `UTC` — not a full IANA database, matching this repo's dependency-minimal convention; extending it for a real future provider is a one-line change, never speculative). Weekday computation (`isoWeekdayInTimezone`) uses only the standard-library `Intl.DateTimeFormat` — no new dependency — and is proven genuinely timezone-aware, not silently UTC-only, by a dedicated test showing the same instant resolves to Friday in UTC and Saturday in `Asia/Tehran` (UTC+3:30, past local midnight).

## SOURCE TIMESTAMP INTEGRITY

Unchanged — `source_timestamp` remains the sole freshness authority, `synced_at` remains a documented fallback-only signal (already correct in `lib/pricing/repository.ts` prior to this task, per the PRICE-P0 gate's own audit; this phase did not touch that read path at all). No code path in this task's new/modified files reads or writes `synced_at` in a way that could make an old `source_timestamp` look fresh.

## SECURITY / PRIVACY

Reviewed every new field: `variant_key` is the same public identity already exposed on product detail pages (no new sensitivity). `cadence_kind`/`cadence_interval_count`/`cadence_interval_unit`/`publication_weekdays`/`timezone` are all operational-metadata-about-a-publication-schedule, not commercial data. **Zero** supplier-identity, cost, margin, payment-term, negotiation, private-stock, private-capacity, or internal-note fields were added anywhere — confirmed by direct review of the migration's own column list (nothing else exists to add).

## FILES CREATED

- `migrations_public/0008_price_variant_identity_and_provider_policy.sql`
- `lib/pricing/variant-integrity.ts` / `.test.ts`
- `lib/pricing/provider-policy.ts` / `.test.ts`
- `docs/pricing/PRICE_P1_IDENTITY_POLICY_REPORT.md` (this file)

## FILES MODIFIED

- `lib/pricing/product-mapping.ts` — `resolveProductKey(...)  → string | null` replaced by `resolveProductMapping(...) → ProductMapping | null` (`{ productKey, variantKey }`)
- `lib/pricing/sync-orchestrator.ts` — threads variant identity through mapping resolution, integrity validation, and the `public_price_quotes` upsert (`buildUpsertStatement` gained a `variantKey` parameter/column)
- `lib/pricing/sync-orchestrator.test.ts` — `FakeD1` extended with an optional per-query `.first()` response handler (backward-compatible; every pre-existing test still passes unchanged) + 3 new PRICE-P1 tests

## TEST RESULTS

- `lib/pricing/*.test.ts`: **96/96 pass** (67 pre-existing + 29 new: 3 `variant-integrity.test.ts`, 23 `provider-policy.test.ts`, 3 new cases in `sync-orchestrator.test.ts`)
- Full repository suite (`npm test`): **714/714 pass** (685 pre-existing + 29 new, 0 removed, 0 regressed)
- `npx tsc --noEmit`: clean
- `npm run build`: succeeds, all routes register correctly

## LOCAL D1 MIGRATION RESULT

`npx wrangler d1 migrations apply DB_PUBLIC --local`: applied cleanly (8 commands). Verified live, not assumed:

- All 3 new `variant_key` columns present, nullable, on the correct tables
- `price_provider_policies` table present with the correct CHECK constraints
- `catalog_products`/`product_variants` row counts unchanged (13/237) — real synced data untouched
- Re-running `wrangler d1 migrations apply --local` reports "No migrations to apply!" — idempotent, nothing pending
- FK enforcement genuinely active in this runtime: a dangling `variant_key` insert was rejected (`SQLITE_CONSTRAINT_FOREIGNKEY`); a real variant xid succeeded; a `NULL` `variant_key` succeeded (backward-compat path)
- `price_provider_policies` CHECK constraints genuinely active: an invalid `cadence_kind` was rejected (`SQLITE_CONSTRAINT_CHECK`); a valid business-daily policy succeeded
- All test fixture rows inserted during verification were deleted immediately after; local D1 pricing tables confirmed back at 0 rows before this report was written
- **No `--remote` flag used anywhere in this task.**

## REGRESSION RESULT

Explicitly re-run per named domain (task §25), not merely inferred from the full-suite total:

| Domain | Tests | Result |
| --- | --- | --- |
| Header (`lib/content/*.test.ts`) | 38 | PASS |
| Processing (`lib/processing/*.test.ts`) | 42 | PASS |
| Product Catalog (`lib/catalog/*.test.ts`) | 213 | PASS |
| RFQ (`lib/rfq/*.test.ts`) | 192 | PASS |

Homepage/locale handling: unaffected by construction — no file outside `lib/pricing/` and `migrations_public/` was touched this task, and `components/home/price-strip.tsx`/`lib/pricing/repository.ts` (the only files the Homepage actually renders through) are both untouched.

## GIT

```
branch: feat/header-frozen-v2
base SHA: 6b5e4f6538c4ae79be1fe2acaeabd31d940fe584
```

Working tree confirmed clean before this report was written except the files this task itself produced (plus one unrelated pre-existing untracked file from a prior task). Not pushed. Not deployed.

## NEXT PHASE

`PRICE-P2 — Freshness Classification Domain Logic`

---

`EXACT VARIANT IDENTITY: PASS`
`DUAL IDENTITY INTEGRITY: PASS`
`PROVIDER POLICY MODEL: PASS`
`BUSINESS-DAY SCHEDULE SUPPORT: PASS`
`SOURCE TIMESTAMP AUTHORITY: PASS`
`ADDITIVE MIGRATION SAFETY: PASS`
`PRICE-P1 REGRESSION: PASS`

`AHAN ASA PRICE-P1: PASS`
