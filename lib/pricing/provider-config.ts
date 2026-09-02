import { PROVIDER_REGISTRY } from "./provider-registry.ts";
import type { ProviderCurrencyConvention } from "./normalize.ts";

/**
 * Server-side provider activation config — validated, never trusted
 * blindly (docs/pricing/PRICE_PROVIDER_CONTRACT.md "Registry vs. enabled
 * list"). `env.ENABLED_PRICE_PROVIDERS` is a comma-separated list of
 * provider IDs; its ORDER is the provider-priority order
 * (lib/pricing/repository.ts) — reprioritizing requires a config/
 * deployment change, never an edit to homepage/repository code. Default
 * empty (wrangler.jsonc `PRICE_STRIP_ENABLED`/`ENABLED_PRICE_PROVIDERS`,
 * both explicitly off) — nothing is enabled by default.
 */
export function getEnabledProviderIds(env: CloudflareEnv, registry: Record<string, unknown> = PROVIDER_REGISTRY): string[] {
  const raw: string = env.ENABLED_PRICE_PROVIDERS ?? "";
  const ids = raw
    .split(",")
    .map((id) => id.trim())
    .filter((id) => id.length > 0);

  for (const id of ids) {
    if (!(id in registry)) {
      // A configuration error (an unknown provider ID was enabled) — logged
      // explicitly, never silently ignored. The orchestrator (lib/pricing/
      // sync-orchestrator.ts) skips this ID rather than throwing, so one
      // typo in config doesn't take down every other enabled provider.
      console.error("PRICE_PROVIDER_CONFIG_ERROR", { reason: "unknown_provider_id_enabled", providerId: id });
    }
  }

  return ids.filter((id) => id in registry);
}

export interface ReconciliationPolicy {
  /** Default false — soft-deactivation of missing quotes is only even considered when a provider explicitly opts in. */
  allowSnapshotReconciliation: boolean;
  /** Default false — a zero-record full_snapshot never deactivates everything unless a provider explicitly declares its empty response is meaningful, not an outage. */
  allowAuthoritativeEmptySnapshot: boolean;
  /** Undefined = no declared allowance -> any non-zero deactivation under the abnormal-collapse guard is blocked by default. No universal percentage is hardcoded (the owner's explicit instruction) — a real provider declares its own value here once one exists. */
  maxReconciliationDeactivationFraction?: number;
  /** The provider's own quoting-currency convention — declared once, never inferred from the payload (lib/pricing/normalize.ts). */
  currencyConvention: ProviderCurrencyConvention;
}

const DEFAULT_RECONCILIATION_POLICY: ReconciliationPolicy = {
  allowSnapshotReconciliation: false,
  allowAuthoritativeEmptySnapshot: false,
  currencyConvention: "IRR",
};

/**
 * No real provider has a declared policy yet — every provider currently
 * falls back to `DEFAULT_RECONCILIATION_POLICY` (maximally safe: no
 * reconciliation of any kind happens until a real provider explicitly
 * opts in here, once it actually exists).
 */
const PROVIDER_RECONCILIATION_POLICY: Record<string, ReconciliationPolicy> = {};

export function getReconciliationPolicy(providerId: string): ReconciliationPolicy {
  return PROVIDER_RECONCILIATION_POLICY[providerId] ?? DEFAULT_RECONCILIATION_POLICY;
}
