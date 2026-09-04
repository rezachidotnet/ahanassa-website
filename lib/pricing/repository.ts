import type { Locale } from "../../config/locales.ts";
import { buildPriceStripItem, type PriceStripDisplayInput } from "./price-strip-item.ts";
import { MAX_HOMEPAGE_PRICE_STRIP_ITEMS } from "./price-strip-config.ts";
import type { QuoteCandidate } from "./quote-selection.ts";
import type { PublicPriceStripItem } from "./types.ts";

interface DisplayProductRow {
  display_price_id: string;
  product_key: string;
  /** Guaranteed non-null by this file's own `WHERE variant_key IS NOT NULL` — see the query below. */
  variant_key: string;
  display_unit: string;
  display_currency: string;
  display_market_or_location: string | null;
  display_delivery_basis: string | null;
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
 * Homepage price strip's read model (docs/pricing/PRICE_PROVIDER_CONTRACT.md;
 * PRICE-P2 for freshness/selection; PRICE-P3 for the exact-variant public
 * read-model contract). Gated on `PRICE_STRIP_ENABLED` — when off, no
 * query is executed at all, and (deliberately, via dynamic `import()`
 * below rather than a module-top-level static import) the
 * `cloudflare:workers`-touching modules this function needs
 * (`lib/db/public.ts`, `lib/catalog/editorial-repository.ts`,
 * `lib/pricing/provider-policy-repository.ts`) are never even loaded — the
 * flag gate is enforced at the import level, not just the query level.
 * This also makes the gate itself directly unit-testable under plain
 * `node --test` (`cloudflare:workers` cannot be resolved outside the
 * actual Workers runtime at all — see lib/pricing/repository.test.ts).
 *
 * `app/[locale]/page.tsx` already checks the same flag before calling this
 * at all — this is defense in depth, not the sole gate.
 *
 * PRICE-P3: only curated rows with an exact `variant_key` are Homepage
 * V2.1-eligible at all (task §4) — a legacy template-only row is excluded
 * at the source, never guessed a variant for. This function is also
 * strictly a fetch-and-orchestrate layer: every actual decision (which
 * quote wins, whether it's fresh enough, whether the exact variant is
 * currently publication-eligible, what its title/spec/href are) is made by
 * the pure `lib/pricing/price-strip-item.ts#buildPriceStripItem` and the D1
 * resolvers it's given — this file never re-implements any part of that
 * policy itself (task §13).
 *
 * Failure isolation (task §18): a single display row's own quote-fetch or
 * catalog-resolution failure is caught and logged per-row — it excludes
 * only that one benchmark, never the whole strip. The outer try/catch
 * covers genuinely DB-wide failures (the initial curated-row query, the
 * batched policy lookup) and returns `[]` for those, same as a legitimately
 * empty result — the homepage must never 500, but the failure must never
 * look identical to "the table just has no rows yet" in logs/monitoring.
 *
 * Query pattern (task §19): 1 (curated display rows) + N (quote candidates,
 * one query per active curated row) + 1 (batched provider policy lookup,
 * across every distinct provider among all candidates) + N (exact-variant
 * catalog anchor, one query per active curated row) = 2N + 2. Not batched
 * further in this phase — `price_display_products` is a small,
 * owner-curated table (never the full public catalog), so N stays small by
 * construction; batching the per-row queries would add real complexity for
 * a bound that's already tight in practice (task §19 "avoid premature
 * optimization"). The eligibility/freshness/display cap
 * (`MAX_HOMEPAGE_PRICE_STRIP_ITEMS`) is applied AFTER this full pass, never
 * as a pre-filter `LIMIT` — see price-strip-config.ts.
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
    const { resolvePublicPriceStripVariantAnchor } = await import("../catalog/editorial-repository.ts");
    const { getProviderPublicationPolicies } = await import("./provider-policy-repository.ts");

    const db = getPublicDb();

    // Stable order (task §16): sort_order plus a deterministic tie-break
    // (display_price_id) — never left to SQLite's unspecified row order.
    const displayRows = await db
      .prepare(
        `SELECT display_price_id, product_key, variant_key, display_unit, display_currency, display_market_or_location, display_delivery_basis
         FROM price_display_products
         WHERE is_active = 1 AND variant_key IS NOT NULL
         ORDER BY sort_order ASC, display_price_id ASC`,
      )
      .all<DisplayProductRow>();
    const displays = displayRows.results ?? [];

    // Candidate quotes per display row, fetched up front so the policy
    // batch lookup below can resolve every involved provider in one call
    // (never a per-row network/policy fetch). A single row's own
    // quote-fetch failure is isolated here — it is simply treated as "no
    // candidates for this row," never aborting the whole strip.
    const candidatesByDisplay = new Map<string, QuoteCandidate[]>();
    const allProviderIds = new Set<string>();
    for (const display of displays) {
      try {
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
      } catch (rowError) {
        console.error("PRICE_STRIP_ITEM_QUOTE_FETCH_ERROR", JSON.stringify({ displayPriceId: display.display_price_id, message: rowError instanceof Error ? rowError.message : String(rowError) }));
      }
    }

    const policies = await getProviderPublicationPolicies(db, [...allProviderIds]);
    const now = new Date();

    const items: PublicPriceStripItem[] = [];
    for (const display of displays) {
      const candidates = candidatesByDisplay.get(display.display_price_id) ?? [];
      const displayInput: PriceStripDisplayInput = {
        displayPriceId: display.display_price_id,
        templateXid: display.product_key,
        variantXid: display.variant_key,
        target: {
          unit: display.display_unit,
          currency: display.display_currency,
          marketOrLocation: display.display_market_or_location,
          deliveryBasis: display.display_delivery_basis,
          variantKey: display.variant_key,
        },
      };

      try {
        const variantAnchor = await resolvePublicPriceStripVariantAnchor(display.product_key, display.variant_key, locale);
        const item = buildPriceStripItem(displayInput, candidates, enabledProviderOrder, policies, variantAnchor, now);
        if (item) items.push(item);
      } catch (rowError) {
        console.error("PRICE_STRIP_ITEM_RESOLUTION_ERROR", JSON.stringify({ displayPriceId: display.display_price_id, message: rowError instanceof Error ? rowError.message : String(rowError) }));
      }
    }

    return items.slice(0, MAX_HOMEPAGE_PRICE_STRIP_ITEMS);
  } catch (error) {
    console.error("PRICE_STRIP_READ_ERROR", JSON.stringify({ message: error instanceof Error ? error.message : String(error) }));
    return [];
  }
}
