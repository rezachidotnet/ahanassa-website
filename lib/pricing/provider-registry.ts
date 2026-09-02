import { odooPriceProvider } from "./providers/odoo-price-provider.ts";
import type { PriceProvider } from "./provider.ts";

/**
 * All KNOWN provider implementations — a lookup table, NOT an enabled
 * list. Being present here means "this code exists," never "this is
 * live" — activation is `lib/pricing/provider-config.ts`'s job, driven by
 * server-side environment configuration
 * (docs/pricing/PRICE_PROVIDER_CONTRACT.md "Registry vs. enabled list").
 */
export const PROVIDER_REGISTRY: Record<string, PriceProvider> = {
  odoo: odooPriceProvider,
};
