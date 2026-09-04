import { PROVIDER_REGISTRY } from "./provider-registry.ts";
import { getEnabledProviderIds, getReconciliationPolicy, type ReconciliationPolicy } from "./provider-config.ts";
import { normalizePriceQuote } from "./normalize.ts";
import { resolveProductMapping } from "./product-mapping.ts";
import { resolveAndValidateVariant } from "./variant-integrity.ts";
import { computeQuoteKey } from "./quote-key.ts";
import { evaluateReconciliationGate } from "./sync-safety.ts";
import { reasonCodeForStage, safeErrorMessage, type PriceSyncFailureReasonCode, type SyncStage } from "./failure-reason.ts";
import type { PriceProvider } from "./provider.ts";
import type { NormalizedPriceQuote } from "./types.ts";

/**
 * `runScheduledPriceSync`/`syncOneProvider` touch D1 directly (lease
 * acquisition, atomic upsert/deactivate batch) — per this codebase's own
 * established convention (`lib/catalog/sync-runner.ts`'s own comment:
 * "validated ... rather than by a mock-based unit test"), the REAL D1
 * query behavior is validated live, not with mocked D1 objects. However,
 * per-provider FAILURE ISOLATION — the actual point of this module — is
 * exactly the kind of orchestration-flow logic that genuinely benefits
 * from dependency-injected unit tests (`lib/pricing/sync-orchestrator.test.ts`),
 * so `syncOneProvider`/`runScheduledPriceSync` accept an optional `deps`
 * override for exactly that purpose; every default is the real
 * implementation.
 *
 * NOT wired into workers/entry.ts's cron switch or wrangler.jsonc's
 * triggers.crons in this pass — no real provider is enabled yet
 * (docs/pricing/PRICE_PROVIDER_CONTRACT.md "Safe rollout order"). Calling
 * this function today is a safe no-op (zero enabled providers).
 *
 * Failure isolation contract: the COMPLETE per-provider operation —
 * registry lookup, config resolution, `getPublicDb()`, lease acquisition,
 * provider fetch, normalization, mapping, quote-key generation,
 * upsert/reconciliation, sync-state update — is protected by a single
 * failure boundary per provider. A failure for one provider never
 * prevents a later enabled provider from running (`runScheduledPriceSync`'s
 * loop always continues). If `getPublicDb()` itself fails, recording the
 * failure in `price_sync_state` is impossible by definition (no DB
 * connection) — that case emits a structured error log and returns,
 * WITHOUT claiming persistence that didn't happen. No price row is ever
 * mutated unless the run reaches the "persistence" stage, which is only
 * reachable after a successful lease acquisition.
 */

export interface SyncOneProviderDeps {
  getDb: (providerId: string) => D1Database;
  registry: Record<string, PriceProvider>;
  getPolicy: (providerId: string) => ReconciliationPolicy;
}

// `getPublicDb` (lib/db/public.ts) statically imports `cloudflare:workers`,
// which cannot be resolved outside the actual Workers runtime at all — so
// the real default dependency set is resolved via a dynamic import,
// deferred until a call actually needs it (`resolveDeps` below), keeping
// this module itself safely importable under plain `node --test`
// (lib/pricing/sync-orchestrator.test.ts always supplies its own fake
// `deps`, so this dynamic import is never reached in tests).
async function resolveDeps(deps?: SyncOneProviderDeps): Promise<SyncOneProviderDeps> {
  if (deps) return deps;
  const { getPublicDb } = await import("../db/public.ts");
  return { getDb: () => getPublicDb(), registry: PROVIDER_REGISTRY, getPolicy: getReconciliationPolicy };
}

export async function runScheduledPriceSync(env: CloudflareEnv, deps?: SyncOneProviderDeps): Promise<void> {
  const resolvedDeps = await resolveDeps(deps);
  const enabledProviderIds = getEnabledProviderIds(env, resolvedDeps.registry);
  if (enabledProviderIds.length === 0) {
    console.log("PRICE_SYNC", JSON.stringify({ status: "noop", reason: "no_enabled_providers" }));
    return;
  }

  // Sequential, not Promise.all — deliberately so one provider's failure
  // (already fully isolated within syncOneProvider) can never race with or
  // starve another's D1 lease/batch operations.
  for (const providerId of enabledProviderIds) {
    await syncOneProvider(env, providerId, resolvedDeps);
  }
}

function logSyncEvent(fields: Record<string, unknown>): void {
  // Deliberately only ever logs scalar-safe fields the caller explicitly
  // picked — never the raw error object, never fetchResult/provider
  // payload data, never a credential/secret.
  console.log("PRICE_SYNC", JSON.stringify(fields));
}

function logSyncFailure(providerId: string, stage: SyncStage, reasonCode: PriceSyncFailureReasonCode, error: unknown, persisted: boolean): void {
  console.error("PRICE_SYNC_FAILED", JSON.stringify({ providerId, stage, reasonCode, persisted, error: safeErrorMessage(error) }));
}

export async function syncOneProvider(env: CloudflareEnv, providerId: string, depsOverride?: SyncOneProviderDeps): Promise<void> {
  const deps = await resolveDeps(depsOverride);
  let db: D1Database;
  try {
    db = deps.getDb(providerId);
  } catch (error) {
    // No DB connection at all — recording the failure in price_sync_state
    // is impossible by definition. Log it; never claim it was persisted.
    logSyncFailure(providerId, "get_db", reasonCodeForStage("get_db", error), error, false);
    return;
  }

  const now = new Date().toISOString();
  let leaseOwner: string | null = null;
  let stage: SyncStage = "registry_lookup";

  try {
    const provider = deps.registry[providerId];
    if (!provider) {
      stage = "registry_lookup";
      throw new Error(`provider "${providerId}" is not in the registry`);
    }

    stage = "config_resolution";
    const policy = deps.getPolicy(providerId);

    stage = "lease_acquisition";
    leaseOwner = crypto.randomUUID();
    const leased = await acquireLease(db, providerId, leaseOwner, now);
    if (!leased) {
      logSyncEvent({ providerId, status: "skipped_lease_held" });
      leaseOwner = null; // never actually acquired — nothing to release
      return;
    }

    stage = "provider_fetch";
    const fetchResult = await provider.fetchPrices(env);

    stage = "normalize_map";
    const normalized: NormalizedPriceQuote[] = [];
    let rejectedRecordCount = 0;
    for (const incoming of fetchResult.quotes) {
      const result = normalizePriceQuote(incoming, providerId, policy.currencyConvention);
      if (!result.ok) {
        rejectedRecordCount += 1;
        continue;
      }
      normalized.push(result.quote);
    }

    const mapped: Array<{ quote: NormalizedPriceQuote; productKey: string; variantKey: string | null; quoteKey: string }> = [];
    for (const quote of normalized) {
      const mapping = await resolveProductMapping(db, providerId, quote.providerProductRef);
      if (!mapping) {
        rejectedRecordCount += 1;
        continue;
      }

      // Variant integrity (PRICE-P1 §5): a curated variant_key must
      // resolve to a real, active variant belonging to THIS mapping's own
      // template — never trusted merely because a string is present. A
      // mismatch/dangling reference is treated exactly like any other
      // rejected record (never silently downgraded to "template-only" —
      // that would mask a real data-integrity problem in the curated
      // mapping itself, which the sync's own rejectedRecordCount-driven
      // reconciliation gate (sync-safety.ts) needs to see).
      if (mapping.variantKey) {
        const validVariant = await resolveAndValidateVariant(db, mapping.variantKey, mapping.productKey);
        if (!validVariant) {
          rejectedRecordCount += 1;
          continue;
        }
      }

      const quoteKey = await computeQuoteKey(quote);
      mapped.push({ quote, productKey: mapping.productKey, variantKey: mapping.variantKey, quoteKey });
    }

    const previousActiveKeys = await getActiveQuoteKeys(db, providerId);
    const incomingKeySet = new Set(mapped.map((m) => m.quoteKey));
    const missingKeys = [...previousActiveKeys].filter((k) => !incomingKeySet.has(k));

    const gate = evaluateReconciliationGate({
      mode: fetchResult.mode,
      complete: fetchResult.complete,
      rejectedRecordCount,
      incomingKeyCount: mapped.length,
      missingKeyCount: missingKeys.length,
      previousActiveKeyCountForProvider: previousActiveKeys.size,
      policy,
    });

    stage = "persistence";
    const statements = mapped.map(({ quote, productKey, variantKey, quoteKey }) => buildUpsertStatement(db, quoteKey, providerId, productKey, variantKey, quote, now));

    if (gate.shouldReconcile && missingKeys.length > 0) {
      for (const key of missingKeys) {
        statements.push(db.prepare(`UPDATE public_price_quotes SET status = 'inactive', updated_at = ? WHERE quote_key = ? AND provider_id = ?`).bind(now, key, providerId));
      }
    }

    if (statements.length > 0) {
      await db.batch(statements);
    }

    stage = "record_outcome";
    const gateReasonCode = gate.shouldReconcile ? null : gate.concern;
    await recordSyncOutcome(db, providerId, now, gateReasonCode);

    logSyncEvent({
      providerId,
      status: gateReasonCode ? "completed_with_concern" : "success",
      concern: gateReasonCode,
      upserted: mapped.length,
      rejected: rejectedRecordCount,
      reconciled: gate.shouldReconcile,
      deactivated: gate.shouldReconcile ? missingKeys.length : 0,
    });
  } catch (error) {
    const reasonCode = reasonCodeForStage(stage, error);
    try {
      await recordSyncFailure(db, providerId, now, reasonCode);
      logSyncFailure(providerId, stage, reasonCode, error, true);
    } catch (persistError) {
      // The write to price_sync_state itself failed too — never claim it
      // succeeded. Log both the original failure and this one.
      logSyncFailure(providerId, stage, reasonCode, error, false);
      logSyncFailure(providerId, "record_outcome", "persistence_failed", persistError, false);
    }
  } finally {
    if (leaseOwner) {
      try {
        await releaseLease(db, providerId, leaseOwner);
      } catch (releaseError) {
        console.error("PRICE_SYNC_LEASE_RELEASE_FAILED", JSON.stringify({ providerId, error: safeErrorMessage(releaseError) }));
      }
    }
  }
}

function buildUpsertStatement(
  db: D1Database,
  quoteKey: string,
  providerId: string,
  productKey: string,
  variantKey: string | null,
  quote: NormalizedPriceQuote,
  now: string,
): D1PreparedStatement {
  return db
    .prepare(
      `INSERT INTO public_price_quotes (
         quote_key, provider_id, provider_product_ref, product_key, variant_key, provider_title,
         price_amount_irr, currency, unit, market_or_location, delivery_basis,
         source_timestamp, synced_at, source_url, status, created_at, updated_at
       ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'active', ?, ?)
       ON CONFLICT (quote_key) DO UPDATE SET
         product_key = excluded.product_key, variant_key = excluded.variant_key, provider_title = excluded.provider_title,
         price_amount_irr = excluded.price_amount_irr, currency = excluded.currency,
         unit = excluded.unit, market_or_location = excluded.market_or_location,
         delivery_basis = excluded.delivery_basis, source_timestamp = excluded.source_timestamp,
         synced_at = excluded.synced_at, source_url = excluded.source_url,
         status = 'active', updated_at = excluded.updated_at`,
    )
    .bind(
      quoteKey,
      providerId,
      quote.providerProductRef,
      productKey,
      variantKey,
      quote.providerTitle ?? null,
      quote.priceAmountIrr,
      quote.currency,
      quote.unit,
      quote.marketOrLocation ?? null,
      quote.deliveryBasis ?? null,
      quote.sourceTimestamp ?? null,
      now,
      quote.sourceUrl ?? null,
      now,
      now,
    );
}

async function acquireLease(db: D1Database, providerId: string, leaseOwner: string, now: string): Promise<boolean> {
  await ensureSyncStateRow(db, providerId, now);
  const leaseExpiresAt = new Date(Date.now() + 10 * 60 * 1000).toISOString();
  const result = await db
    .prepare(
      `UPDATE price_sync_state SET lease_owner = ?, lease_expires_at = ?, last_attempted_at = ?, updated_at = ?
       WHERE provider_id = ? AND (lease_owner IS NULL OR lease_expires_at < ?)`,
    )
    .bind(leaseOwner, leaseExpiresAt, now, now, providerId, now)
    .run();
  return (result.meta.changes ?? 0) > 0;
}

async function ensureSyncStateRow(db: D1Database, providerId: string, now: string): Promise<void> {
  await db
    .prepare(`INSERT INTO price_sync_state (provider_id, consecutive_failure_count, created_at, updated_at) VALUES (?, 0, ?, ?) ON CONFLICT (provider_id) DO NOTHING`)
    .bind(providerId, now, now)
    .run();
}

async function releaseLease(db: D1Database, providerId: string, leaseOwner: string): Promise<void> {
  await db.prepare(`UPDATE price_sync_state SET lease_owner = NULL, lease_expires_at = NULL WHERE provider_id = ? AND lease_owner = ?`).bind(providerId, leaseOwner).run();
}

async function recordSyncOutcome(db: D1Database, providerId: string, now: string, failureReasonCode: PriceSyncFailureReasonCode | null): Promise<void> {
  if (failureReasonCode) {
    await recordSyncFailure(db, providerId, now, failureReasonCode);
  } else {
    await db.prepare(`UPDATE price_sync_state SET consecutive_failure_count = 0, last_success_at = ?, updated_at = ? WHERE provider_id = ?`).bind(now, now, providerId).run();
  }
}

async function recordSyncFailure(db: D1Database, providerId: string, now: string, reasonCode: PriceSyncFailureReasonCode): Promise<void> {
  await ensureSyncStateRow(db, providerId, now);
  await db
    .prepare(
      `UPDATE price_sync_state SET consecutive_failure_count = consecutive_failure_count + 1, last_failure_at = ?, last_failure_reason_code = ?, updated_at = ? WHERE provider_id = ?`,
    )
    .bind(now, reasonCode, now, providerId)
    .run();
}

async function getActiveQuoteKeys(db: D1Database, providerId: string): Promise<Set<string>> {
  const result = await db.prepare(`SELECT quote_key FROM public_price_quotes WHERE provider_id = ? AND status = 'active'`).bind(providerId).all<{ quote_key: string }>();
  return new Set((result.results ?? []).map((r) => r.quote_key));
}
