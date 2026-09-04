import type { Locale } from "../../config/locales.ts";
import { rialToTomanForDisplay } from "./money.ts";
import { selectWinningQuote, type QuoteCandidate } from "./quote-selection.ts";
import type { PublicPriceStripItem } from "./types.ts";

interface DisplayProductRow {
  display_price_id: string;
  product_key: string;
  variant_key: string | null;
  display_unit: string;
  display_currency: string;
  display_market_or_location: string | null;
  display_delivery_basis: string | null;
  title_override_fa: string | null;
  title_override_en: string | null;
  title_override_ar: string | null;
  link_override_category_slug: string | null;
}

interface QuoteRow {
  provider_id: string;
  unit: string;
  currency: string;
  market_or_location: string | null;
  delivery_basis: string | null;
  variant_key: string | null;
  price_amount_irr: number;
  source_timestamp: string | null;
  synced_at: string;
}

/**
 * Homepage price strip's read model (docs/pricing/PRICE_PROVIDER_CONTRACT.md,
 * PRICE-P2 for the freshness/selection rewrite). Gated on
 * `PRICE_STRIP_ENABLED` — when off, no query is executed at all, and
 * (deliberately, via dynamic `import()` below rather than a
 * module-top-level static import) the `cloudflare:workers`-touching
 * modules this function needs (`lib/db/public.ts`,
 * `lib/catalog/editorial-repository.ts`, `lib/pricing/provider-policy-repository.ts`)
 * are never even loaded — the flag gate is enforced at the import level,
 * not just the query level. This also makes the gate itself directly
 * unit-testable under plain `node --test` (`cloudflare:workers` cannot be
 * resolved outside the actual Workers runtime at all — see
 * lib/pricing/repository.test.ts).
 *
 * `app/[locale]/page.tsx` already checks the same flag before calling
 * this at all — this is defense in depth, not the sole gate. Returns `[]`
 * for a legitimately empty result; a genuine query/schema error is
 * caught, logged as a structurally distinguishable event, and ALSO
 * returns `[]` — the homepage must never break, but the failure must
 * never look identical to "the table just has no rows yet" in
 * logs/monitoring.
 *
 * Selection + freshness policy live in the pure, unit-tested
 * `lib/pricing/quote-selection.ts#selectWinningQuote` /
 * `lib/pricing/freshness.ts#classifyQuoteFreshness` — this function's job
 * is only to fetch every candidate quote for a display entry plus its
 * provider(s)' publication policies and its title/link, then delegate the
 * actual decision. A STALE or UNAVAILABLE winner is never returned by
 * `selectWinningQuote` at all (PRICE-P2) — this function never needs to
 * (and never does) filter/hide an item after the fact; every item this
 * function returns is already Homepage-eligible by construction.
 */
export async function getHomepagePriceStrip(env: CloudflareEnv, locale: Locale): Promise<PublicPriceStripItem[]> {
  const priceStripEnabled: string | undefined = env.PRICE_STRIP_ENABLED;
  if (priceStripEnabled !== "true") {
    return [];
  }

  const enabledProvidersRaw: string | undefined = env.ENABLED_PRICE_PROVIDERS;
  const enabledProviderOrder = (enabledProvidersRaw ?? "")
    .split(",")
    .map((id) => id.trim())
    .filter(Boolean);

  try {
    const { getPublicDb } = await import("../db/public.ts");
    const { getPublishedCatalogTemplateTitleByXid } = await import("../catalog/editorial-repository.ts");
    const { getProviderPublicationPolicies } = await import("./provider-policy-repository.ts");

    const db = getPublicDb();
    const displayRows = await db.prepare(`SELECT * FROM price_display_products WHERE is_active = 1 ORDER BY sort_order ASC`).all<DisplayProductRow>();
    const displays = displayRows.results ?? [];

    // Fetch every candidate quote per display entry up front, then resolve
    // exactly the set of providers actually involved across all of them in
    // one batched policy lookup — never a live/network fetch (task §16),
    // DB_PUBLIC only.
    const candidatesByDisplay = new Map<string, QuoteCandidate[]>();
    const allProviderIds = new Set<string>();
    for (const display of displays) {
      const candidatesResult = await db
        .prepare(`SELECT provider_id, unit, currency, market_or_location, delivery_basis, variant_key, price_amount_irr, source_timestamp, synced_at FROM public_price_quotes WHERE product_key = ? AND status = 'active'`)
        .bind(display.product_key)
        .all<QuoteRow>();

      const candidates: QuoteCandidate[] = (candidatesResult.results ?? []).map((row) => ({
        providerId: row.provider_id,
        unit: row.unit,
        currency: row.currency,
        marketOrLocation: row.market_or_location,
        deliveryBasis: row.delivery_basis,
        variantKey: row.variant_key,
        priceAmountIrr: row.price_amount_irr,
        sourceTimestamp: row.source_timestamp,
        syncedAt: row.synced_at,
      }));
      candidatesByDisplay.set(display.display_price_id, candidates);
      for (const c of candidates) allProviderIds.add(c.providerId);
    }

    const policies = await getProviderPublicationPolicies(db, [...allProviderIds]);
    const now = new Date();

    const items: PublicPriceStripItem[] = [];
    for (const display of displays) {
      const candidates = candidatesByDisplay.get(display.display_price_id) ?? [];
      const winner = selectWinningQuote(
        candidates,
        { unit: display.display_unit, currency: display.display_currency, marketOrLocation: display.display_market_or_location, deliveryBasis: display.display_delivery_basis, variantKey: display.variant_key },
        enabledProviderOrder,
        policies,
        now,
      );
      if (!winner) continue;

      const catalogMatch = await getPublishedCatalogTemplateTitleByXid(locale, display.product_key);
      const override = locale === "fa" ? display.title_override_fa : locale === "ar" ? display.title_override_ar : display.title_override_en;
      const title = catalogMatch?.title ?? override;
      if (!title) continue;
      const href = catalogMatch ? `/products/${catalogMatch.slug}` : display.link_override_category_slug ? `/products?category=${display.link_override_category_slug}` : undefined;

      const effectiveTimestamp = winner.candidate.sourceTimestamp ?? winner.candidate.syncedAt;
      const { toman } = rialToTomanForDisplay(winner.candidate.priceAmountIrr);

      items.push({
        displayPriceId: display.display_price_id,
        title,
        priceToman: toman,
        unit: display.display_unit,
        freshnessState: winner.freshness,
        effectiveTimestamp,
        href,
      });
    }
    return items;
  } catch (error) {
    console.error("PRICE_STRIP_READ_ERROR", JSON.stringify({ message: error instanceof Error ? error.message : String(error) }));
    return [];
  }
}
