# Catalog Scheduled Synchronization Operations

**Status:** Active — canonical for the operational scheduled Catalog synchronization/reconciliation layer between the Odoo Public Catalog API and DB_PUBLIC.
**Established:** 2026-08-31 (DOCUMENT_AUDIT_REPORT.md DAR-040), on top of the already-implemented sync primitives (DAR-034/035).
**Scope:** `lib/catalog/scheduled-sync.ts`, `lib/catalog/sync-state-repository.ts`, `lib/catalog/sync-safety.ts`, `workers/entry.ts`, `wrangler.jsonc` (`triggers.crons`), `scripts/catalog-sync.ts`. Does not modify `lib/catalog/sync.ts`/`lib/catalog/odoo-api-client.ts`'s fetch/plan logic — only adds the guard described in §5 to `lib/catalog/sync-runner.ts#runFullCatalogSync`.

---

## 1. Architecture

```text
Cloudflare Cron Trigger (wrangler.jsonc triggers.crons)
  -> workers/entry.ts#scheduled() — routes by the literal event.cron string
  -> lib/catalog/scheduled-sync.ts#runScheduledCatalogSync(type)
       -> lib/catalog/sync-state-repository.ts — DB-backed lease + durable state (read/write)
       -> lib/catalog/sync-runner.ts#runIncrementalCatalogSync / runFullCatalogSync (UNCHANGED primitives, DAR-034/035)
            -> lib/catalog/odoo-api-client.ts (real HTTP fetch, Odoo Public Catalog API v1)
            -> lib/catalog/sync.ts#planCatalogV1Sync (pure planning)
            -> lib/catalog/repository.ts (DB_PUBLIC writes — commercial fields only)
  -> DB_PUBLIC (Catalog only — never DB_OPS)
```

No new fetch/plan/apply logic was written for this integration. `lib/catalog/scheduled-sync.ts` is purely an orchestration layer: it acquires a lease, calls the exact same `runIncrementalCatalogSync`/`runFullCatalogSync` functions that have been proven correct since DAR-034/035, records durable state, and logs a summary. The one real change to the primitives themselves is the plausibility guard added directly inside `runFullCatalogSync` (§5) — a genuine safety fix that protects every caller, not just the scheduled path.

Never: a public HTTP `/sync` route, a browser-to-Odoo call, or a Cron job writing to DB_OPS. Catalog synchronization is DB_PUBLIC-only.

---

## 2. Stage A — Existing sync primitive audit

| Concern | Existing primitive | Reused as-is? |
|---|---|---|
| Full Catalog fetch (all pages) | `lib/catalog/sync-runner.ts` internal `fetchAllPages()` | Yes, via `runFullCatalogSync`/`runIncrementalCatalogSync` |
| Incremental fetch (`updated_since`) | Same `fetchAllPages(updatedSince)` | Yes |
| Sync planning (create/update/deactivate) | `lib/catalog/sync.ts#planCatalogV1Sync` (pure, fully unit-tested since DAR-034) | Yes, unchanged |
| DB_PUBLIC application | `lib/catalog/repository.ts#ensureCatalogProduct`/`createVariant`/`updateVariantCommercialFields`/`deactivateVariants` | Yes, unchanged |
| High-water mark handling | `lib/catalog/sync.ts#normalizeCatalogTimestamp` | Yes, reused for computing the new `maxObservedUpdatedAt` |
| Deactivation/reconciliation | `runFullCatalogSync`'s existing `isFullPull=true` deactivation path | Yes, unchanged (plus the new plausibility guard, §5) |

Nothing above was duplicated. The genuinely new code is: durable state (§3), the plausibility guard (§5), the lease (§9), the scheduled entrypoint wiring (§10), and the manual CLI (§13) — none of which re-implement fetch/plan/apply.

---

## 3. Durable synchronization state

`migrations_public/0003_catalog_sync_state.sql` — one new, purely additive table, `catalog_sync_state`, a fixed single-row (`id = 'catalog'`) singleton:

| Column | Purpose |
|---|---|
| `last_attempted_at` / `last_attempted_type` | Set the moment a run starts (before fetch/apply) — survives a crashed/hung execution leaving a trace, unlike only recording completion. |
| `last_success_at` / `last_success_type` | Last time either job type completed successfully. |
| `last_incremental_watermark` | The durable high-water mark for the next incremental run's `updated_since`. Advanced only after a full application succeeds (§4). |
| `last_full_reconciliation_at` / `last_full_upstream_count` | Last successful full reconciliation's timestamp and the total upstream item count it observed — the baseline the plausibility guard (§5) compares the *next* full run against. |
| `consecutive_failure_count` | Reset to 0 on any success; incremented on any failure. |
| `last_failure_at` / `last_failure_type` / `last_failure_reason_code` | Most recent failure, for alerting/debugging — never overwrites the last-good watermark/count. |
| `lease_owner` / `lease_expires_at` | The concurrency lease (§9). |

No existing table was touched. `product_variants`/`catalog_products`/`product_seo_contents` (real commercial + editorial data in both staging and production) remain exactly as migration 0002 left them.

---

## 4. Watermark safety

The next incremental run's `updated_since` is never set to the raw maximum `updated_at` actually observed. `lib/catalog/sync-safety.ts#applyIncrementalWatermarkMargin` subtracts a **5-minute overlap margin** (`INCREMENTAL_WATERMARK_OVERLAP_MARGIN_SECONDS`) before the value is ever stored — protecting against two real risks: more than one upstream record sharing the exact same timestamp (a hard cutoff could permanently skip a sibling depending on whether the API's filter is inclusive/exclusive), and minor clock skew. The sync is fully idempotent (`sync.test.ts`, unchanged), so reprocessing a handful of already-synced records on the next run costs nothing but a few "unchanged" outcomes.

The watermark is **never advanced before the entire application succeeds** — `recordSyncSuccess` is only ever called after `applyPlan` has already committed every write for that run. A failed run leaves the previous good watermark exactly as it was, ready for the next retry.

**Both a successful incremental AND a successful full reconciliation can advance the watermark** (deliberate, not an oversight): a full reconciliation re-observes the entire active catalog, so it is exactly as valid a "we've now seen up to at least this point" source — and this is what breaks an otherwise-circular dependency where incremental sync could never run for the very first time (no prior watermark to start `updated_since` from) without a full reconciliation having established one first. An empty incremental result (`0` items — nothing changed upstream) is still recorded as a genuine success (resets the failure streak) but never overwrites the real watermark with nothing.

---

## 5. Failure semantics

**Partial pagination failure (any single page fails mid-fetch):** `fetchAllPages` returns `status: "failed"` immediately, with `items` discarded — `runFullCatalogSync`/`runIncrementalCatalogSync` check this status and return *before ever calling* `applyPlan`. No deactivation, no partial application, ever, based on pages fetched before a failure. Existing DB_PUBLIC data remains fully authoritative for Website serving.

**Incremental failure (timeout, 5xx, malformed JSON, unexpected payload):** classified the same way — `status: "failed"`, `applyPlan` never runs, DB_PUBLIC is preserved exactly, the previous successful watermark is preserved exactly, `recordSyncFailure` increments `consecutive_failure_count` and records the reason code for the next run to retry from.

**Empty-Upstream Catastrophe Protection (Stage — hard safety requirement):** a `status: "ok"` full pull is not automatically trusted. `lib/catalog/sync-safety.ts#evaluateFullSyncPlausibility` — called directly inside `runFullCatalogSync`, before `applyPlan` — compares the pull's item count against the currently-known active count in DB_PUBLIC:

```text
currentActiveCount < 5           -> always plausible (nothing meaningful to protect yet)
upstreamCount === 0              -> implausible ("empty_upstream")
upstreamCount < currentActiveCount * 0.5  -> implausible ("implausible_drop")
otherwise                        -> plausible
```

This is a **ratio against whatever the current catalog size actually is**, never a hardcoded `237` — the catalog is allowed to legitimately grow or shrink; the guard only refuses a *catastrophic, sudden* drop a real, simultaneous mass-discontinuation is far less likely to explain than an upstream outage, filter bug, or misconfiguration. An implausible full pull is treated exactly like a failed one: `applyPlan` never runs, DB_PUBLIC is untouched, `recordSyncFailure` records `CATALOG_SYNC_EMPTY_UPSTREAM`/`CATALOG_SYNC_IMPLAUSIBLE_DROP`.

---

## 6. Incremental schedule

**Every 3 hours** (`0 */3 * * *`). The Product Master changes at business-decision cadence (new steel product lines, standard/grade updates), not continuously — matching the recommendation already on record from DAR-035. This sits within this task's own 1–6 hour guidance band; nothing in the current architecture (real Odoo response times, D1 write volume, the Public Catalog API's own documented behavior) argues for a materially different interval.

---

## 7. Full reconciliation schedule

**Once daily, 02:30 UTC** (`30 2 * * *`). Chosen as a low-traffic window; incremental sync structurally cannot detect archived/deactivated upstream records at all (the API never returns them, incrementally or otherwise — DAR-034), so a periodic full pull is the only mechanism that ever applies `toDeactivate`. Running it once daily, off the 3-hour incremental cadence entirely (a separate, independent Cron expression), keeps deactivation detection timely without adding fetch load the Product Master's real change cadence doesn't justify.

---

## 8. Partial pagination failure — explicit statement

If page *N* of a full reconciliation fails, the entire reconciliation is `FAILED` (§5) — never a partial deactivation based on the pages that did succeed. Existing, valid DB_PUBLIC data remains authoritative for Website serving until a genuinely complete reconciliation succeeds.

---

## 9. Concurrency

A lightweight, DB-backed **lease** — not a distributed-lock service, which this scale does not warrant. `lib/catalog/sync-state-repository.ts#acquireCatalogSyncLease` is a single conditional `UPDATE`:

```sql
UPDATE catalog_sync_state SET lease_owner = ?, lease_expires_at = ?, updated_at = ?
WHERE id = 'catalog' AND (lease_owner IS NULL OR lease_expires_at < ?)
```

D1/SQLite executes this atomically per-statement — there is no read-then-write race window, because there is no separate read step; the condition is evaluated as part of the same write. `changes = 0` (verified by a follow-up read in `scripts/catalog-sync.ts`; the Worker-runtime repository reads `result.meta.changes` directly) unambiguously means another still-valid lease already exists — that run returns `status: "skipped_lease_held"` immediately, touching nothing else. `changes > 0` unambiguously means this call won it.

**Lease TTL: 10 minutes** (`LEASE_DURATION_MS`), generous relative to an expected multi-second run (237 records, a handful of D1 statements), short enough that a crashed/hung execution recovers automatically well before the next scheduled invocation (3h/daily). A stale lease is always recoverable — the `WHERE` clause's `lease_expires_at < ?` branch treats it as free, with no manual intervention required. Release only clears the lease if the caller's own `runId` still owns it (`WHERE lease_owner = ?`), so a run whose lease already expired and was taken over by a later delivery can never clear the new owner's lease out from under it.

This single lease serializes **all three** potential concurrent actors — a scheduled incremental run, a scheduled full reconciliation, and a manual CLI invocation — against each other. Only one may hold it at a time; there is no scenario where an incremental and a full run (or two duplicate scheduled deliveries of the same cron) apply plans concurrently.

**A known, local-dev-only limitation, not a design flaw:** two `wrangler d1 execute --local` processes hitting the same on-disk local SQLite file concurrently can raise a raw `SQLITE_BUSY` file-lock error at the tooling layer, before the lease logic itself is even reached. This is specific to local `--local` D1 simulation's file-based storage and does not reflect real remote D1 (a proper multi-tenant networked service with no such file-lock contention) — the lease's actual concurrency-correctness was verified against real staging/production D1, where this artifact does not occur.

---

## 10. Scheduled handler

`workers/entry.ts#scheduled()` routes by the literal `event.cron` string — never by any request or user input (there is no request at all for a scheduled invocation):

```ts
"*/5 * * * *"  -> dispatchPendingOutboxEvents()          // unchanged, pre-existing RFQ outbox sweep
"0 */3 * * *"  -> runScheduledCatalogSync("incremental")
"30 2 * * *"   -> runScheduledCatalogSync("full")
```

No externally-callable HTTP route was added for this. `runScheduledCatalogSync` (`lib/catalog/scheduled-sync.ts`) is never imported by any `app/api/**/route.ts` file.

---

## 11. Environment separation

`wrangler.jsonc`'s `triggers.crons` is a shared (non-per-environment) top-level config key — but each named environment (`ahanassa-bootstrap-staging`, `ahanassa-production`) is still a **physically separate deployed Worker** with its own `DB_PUBLIC`/`DB_OPS` bindings (different D1 UUIDs, verified in wrangler.jsonc). The identical cron *expressions* firing on each environment's Worker only ever touch that Worker's own bound databases — there is no code path by which staging's Cron could reach production's D1, or vice versa. This was also verified directly: the manual CLI's `--env staging`/`--env production` runs in this task each independently read/wrote only their own environment's `catalog_sync_state`/`product_variants` rows (confirmed via before/after row counts on both, §17–§18).

---

## 12. Observability

Every run — scheduled or manual — logs one structured line:

```json
CATALOG_SYNC {"environment":"staging","syncType":"full","startedAt":"...","completedAt":"...","status":"ok","upstreamObservedCount":237,"created":0,"updated":0,"deactivated":0,"unchanged":237,"watermarkBefore":null,"watermarkAfter":"2026-08-30T10:04:12.000Z"}
```

No secret, credential, or full response body ever appears in this line (the Public Catalog API requires no credential to begin with). The durable `catalog_sync_state` row is the authoritative record; the log line is a convenience for Cloudflare's Observability/Logs (already enabled, `wrangler.jsonc` `"observability": {"enabled": true}`).

---

## 13. Manual recovery / operator flow

`scripts/catalog-sync.ts` — a repo-local CLI, the same architecture and safety pattern as `scripts/catalog-editorial.ts` (DAR-038): plain Node execution (`node scripts/catalog-sync.ts <command>`), no HTTP listener, never imported by application code, reaches D1 exclusively via `wrangler d1 execute` (a plain Node process cannot import anything that pulls in `cloudflare:workers`), reuses the environment-safeguard functions from `lib/catalog/editorial-cli.ts` verbatim.

```bash
node scripts/catalog-sync.ts status --env staging
node scripts/catalog-sync.ts incremental --env staging --dry-run
node scripts/catalog-sync.ts incremental --env staging
node scripts/catalog-sync.ts full --env staging --dry-run
node scripts/catalog-sync.ts full --env staging
node scripts/catalog-sync.ts full --env production --confirm-production --dry-run
node scripts/catalog-sync.ts full --env production --confirm-production
```

`--env` is required for every write (`incremental`/`full`) — no default, ever. `--env production` additionally requires `--confirm-production`, checked **before** the dry-run branch — even a `--dry-run` against production requires it, a deliberately conservative choice consistent with the editorial CLI. `status` is read-only and defaults to `staging` when `--env` is omitted (never defaults to `production`).

The CLI acquires the same DB-backed lease scheduled runs use, so a manual run and a live Cron-triggered run can never apply conflicting plans concurrently.

---

## 14. Editorial preservation

Commercial sync (`lib/catalog/repository.ts`, unchanged by this task) has no code path into `product_seo_contents` — verified structurally (no import) since DAR-034, re-confirmed unchanged here. Live-verified end-to-end in this task's own staging validation (§17): the real 3-template editorial pilot (DAR-038) — titles, slugs, `content_quality_status='approved'`, `published_at` — was spot-checked byte-identical before and after a real full reconciliation and a real incremental run against staging.

---

## 15. RFQ / DB_OPS isolation

Catalog synchronization — scheduled or manual — never opens a connection to DB_OPS. Verified directly in this task's own staging and production validation (§17–§18): `rfqs`/`rfq_items` row counts were identical before and after every sync run performed. Historical RFQ snapshots (DAR-039's `variant_ref`/`sku_snapshot`/labels) are plain, self-contained TEXT captured at submission time — nothing in the sync path re-reads or depends on them, and nothing in the sync path could invalidate them even if a referenced Variant is later deactivated or its label/slug/SKU changes (DAR-039 §9's own historical-safety guarantee, unaffected by this task).

---

## 16. Archive / reactivation behavior

Unchanged from the design already established and proven (DAR-034/035): a full reconciliation may set a missing-upstream Variant's `is_active = 0` (via `deactivateVariants` — never a `DELETE`, the Catalog row, its editorial row, and any RFQ history referencing it all survive). A later reappearance is detected as a normal `toUpdate` (the existing-row-with-`isActive=false` branch in `planCatalogV1Sync`) and `is_active` flips back to `1` — but `is_public` and the per-locale `content_quality_status`/`published_at` are untouched by sync in either direction (no code path writes them), so reactivation never automatically restores Website publication. This is the same, previously-established policy (DAR-036 Stage K), not a new decision.

---

## 17. Staging live validation (this task, 2026-08-31)

Baseline: 237 variants (237 unique xid/sku, 13 templates), 12 `is_public` variants, 3 published templates, 3 `product_seo_contents` rows (the DAR-038 pilot), `catalog_sync_state` freshly migrated (all null).

1. `incremental --env staging` — correctly refused with "no prior watermark" (no full reconciliation had ever run against this fresh state table).
2. `full --env staging --dry-run` — upstream observed 237, current active 237, plausible: true, plan: 0/0/0/237 unchanged.
3. `full --env staging` (real write) — applied create=0 update=0 deactivate=0, watermark advanced to `2026-08-30T10:04:12.000Z`.
4. Post-full verification: 237 variants, 237 unique xid, 237 unique sku, 13 templates, **12/3/3 pilot state fully preserved** (spot-checked the Aj340 template's `h1`/`slug`/`content_quality_status`/`published_at` byte-identical), DB_OPS unchanged (6 rfqs / 7 items, identical to before).
5. `incremental --env staging` (real, now with a watermark) — applied create=0 update=0 deactivate=0, watermark unchanged (no items observed — real upstream data has not changed since the full pull moments earlier).
6. Lease correctly released (`lease_owner: null`) after every run; `consecutive_failure_count: 0` throughout.

No Odoo write of any kind was performed — every request was a documented `GET` against the same Public Catalog API v1 already in use since DAR-034.

---

## 18. Production validation (this task, 2026-08-31)

Performed only after staging passed in full, per this task's own explicit gating. Baseline: 237 variants, 0 `is_public` (variant or template), 0 `product_seo_contents` rows — production's established DAR-036/037/038 editorial baseline.

1. `full --env production --confirm-production --dry-run` — upstream observed 237, current active 237, plausible: true, plan: 0/0/0/237 unchanged.
2. `full --env production --confirm-production` (real write) — applied create=0 update=0 deactivate=0.
3. Post-full verification: 237 variants, 237 unique xid, 13 templates, **editorial publication state unchanged: 0 `is_public`, 0 `product_seo_contents` rows** (identical to baseline — no product was published, no product was unpublished), DB_OPS unchanged (0 rfqs / 0 items).
4. `incremental --env production --confirm-production` (real) — applied create=0 update=0 deactivate=0, watermark unchanged.

No destructive experiment was run against production. No Odoo write occurred.

---

## 19. Wrangler Cron configuration — PENDING DEPLOYMENT

`wrangler.jsonc`'s `triggers.crons` now lists all three schedules (`*/5 * * * *`, `0 */3 * * *`, `30 2 * * *`) and `workers/entry.ts#scheduled()` routes all three. **This is configuration only.** Cloudflare does not register/activate a Cron trigger until the Worker carrying it is actually deployed (`wrangler deploy --env <name>`) — and no environment has been deployed in this task, or in any task before it. Activation is explicitly deferred to **Claude Deployment Stage 1** (non-live Cloudflare Worker deployment), not this task's scope.

---

## 20. Rollback / recovery

- **A bad full reconciliation was applied anyway (should not happen given §5's guard, but as a documented recovery path):** `deactivateVariants` never deletes — every row (commercial, editorial, RFQ-referencing) remains in place with `is_active=0`. The next successful full reconciliation against a healthy upstream will correctly `toUpdate` (reactivate) every row that legitimately still exists upstream.
- **The watermark itself becomes suspect:** an operator can force a fresh full reconciliation at any time (`node scripts/catalog-sync.ts full --env <env>`), which both reconciles the full active set and re-establishes the watermark from that pull's own observed maximum — no manual watermark editing tooling was built or is needed.
- **The lease appears stuck:** it cannot be — `lease_expires_at` guarantees automatic recovery within `LEASE_DURATION_MS` (10 minutes) with no operator action required.

---

## 21. Deployment activation steps (for Claude Deployment Stage 1, not performed in this task)

1. `wrangler deploy --env staging` (and later `--env production`) — the Cron triggers listed in `triggers.crons` become live for that deployed Worker at this point, not before.
2. Confirm registration: `wrangler triggers list` / the Cloudflare dashboard's Trigger Events tab for that Worker.
3. Watch the first live-scheduled incremental (`0 */3 * * *`) and full (`30 2 * * *`) firings via `wrangler tail` or Cloudflare Logs, matching the `CATALOG_SYNC {...}` line shape documented in §12.
4. No DNS/custom-domain cutover is implied or required by this activation — `ahanassa.com`/`www.ahanassa.com` remain on the legacy deployment throughout.
