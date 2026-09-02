import type { PriceProviderFetchResult } from "./types.ts";

/**
 * Provider adapter contract (docs/pricing/PRICE_PROVIDER_CONTRACT.md). A
 * provider adapter is responsible for setting `mode`/`complete` accurately
 * on its returned `PriceProviderFetchResult` — the sync orchestrator
 * (lib/pricing/sync-orchestrator.ts) never guesses completeness from the
 * data alone, and its safe-reconciliation gate depends entirely on these
 * two fields being honest.
 */
export interface PriceProvider {
  id: string;
  fetchPrices(env: CloudflareEnv): Promise<PriceProviderFetchResult>;
}

/**
 * Thrown by a provider adapter when it cannot run at all (e.g. the
 * upstream API doesn't yet expose the data this provider needs) — this
 * must surface as an explicit "cannot run" failure, never a silently
 * successful empty/partial result.
 */
export class ProviderNotConfiguredError extends Error {
  constructor(providerId: string, reason: string) {
    super(`Price provider "${providerId}" is not configured: ${reason}`);
    this.name = "ProviderNotConfiguredError";
  }
}
