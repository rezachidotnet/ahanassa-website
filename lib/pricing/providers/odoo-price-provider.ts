import { ProviderNotConfiguredError, type PriceProvider } from "../provider.ts";
import type { PriceProviderFetchResult } from "../types.ts";

/**
 * Odoo price provider — NOT YET FUNCTIONAL, and deliberately so.
 *
 * The current Odoo Public Catalog API v1
 * (docs/integrations/odoo/catalog-v1/PUBLIC_CATALOG_API_V1.md) does not
 * expose price at all: "Supplier, supplier site, offers, purchase
 * prices/currency/payment, private MOQ/availability, margins... are
 * structurally unavailable." Activating this provider for real requires an
 * Odoo-side API change this task does not make — see
 * docs/pricing/PRICE_PROVIDER_CONTRACT.md "Activating the Odoo provider"
 * for the exact payload/fields that would need to exist.
 *
 * `fetchPrices` THROWS rather than resolving `[]` or an empty
 * `PriceProviderFetchResult` — this must surface as an explicit "cannot
 * run" state if it is ever accidentally added to `ENABLED_PRICE_PROVIDERS`,
 * never a silently successful empty sync (docs/pricing/PRICE_PROVIDER_CONTRACT.md
 * "Registry vs. enabled list").
 */
export const odooPriceProvider: PriceProvider = {
  id: "odoo",
  async fetchPrices(): Promise<PriceProviderFetchResult> {
    throw new ProviderNotConfiguredError("odoo", "the Odoo Public Catalog API v1 does not expose price data yet");
  },
};
