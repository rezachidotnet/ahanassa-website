import { validateProviderPublicationPolicy, type ProviderPublicationPolicy } from "./provider-policy.ts";

/**
 * DB_PUBLIC read access for `price_provider_policies`
 * (migrations_public/0008_price_variant_identity_and_provider_policy.sql)
 * — the small, dedicated repository function task PRICE-P2 §16 asks for
 * ("If runtime selection needs provider policy: create or extend a small
 * DB repository function for policy retrieval. Do not bury SQL inside
 * freshness math."). Takes `db` explicitly rather than calling
 * `getPublicDb()` itself, matching every other `lib/pricing/` repository
 * module's own convention (`product-mapping.ts`, `variant-integrity.ts`)
 * — keeps this file free of any `cloudflare:workers` import, safely
 * importable under plain `node --test`.
 *
 * Every persisted row is re-validated through the SAME
 * `validateProviderPublicationPolicy` boundary PRICE-P1 already built
 * (task §12: "Do not introduce a second unrelated timezone validator") —
 * a malformed persisted row (should be structurally prevented by the
 * table's own CHECK constraints, but never assumed) is never trusted;
 * `getProviderPublicationPolicy` returns `null` for it, which
 * `lib/pricing/freshness.ts#classifyQuoteFreshness` then correctly
 * classifies as UNAVAILABLE rather than falling back to any default.
 */

interface ProviderPolicyRow {
  provider_id: string;
  cadence_kind: string;
  cadence_interval_count: number;
  cadence_interval_unit: string;
  publication_weekdays: string | null;
  timezone: string;
}

function parsePublicationWeekdays(raw: string | null): number[] | null {
  if (!raw) return null;
  const parsed = raw
    .split(",")
    .map((s) => s.trim())
    .filter((s) => s.length > 0)
    .map(Number);
  return parsed.length > 0 ? parsed : null;
}

export async function getProviderPublicationPolicy(db: D1Database, providerId: string): Promise<ProviderPublicationPolicy | null> {
  const row = await db
    .prepare(`SELECT provider_id, cadence_kind, cadence_interval_count, cadence_interval_unit, publication_weekdays, timezone FROM price_provider_policies WHERE provider_id = ?`)
    .bind(providerId)
    .first<ProviderPolicyRow>();
  if (!row) return null;

  const result = validateProviderPublicationPolicy({
    providerId: row.provider_id,
    cadenceKind: row.cadence_kind,
    cadenceIntervalCount: row.cadence_interval_count,
    cadenceIntervalUnit: row.cadence_interval_unit,
    publicationWeekdays: parsePublicationWeekdays(row.publication_weekdays),
    timezone: row.timezone,
  });
  return result.ok ? result.policy : null;
}

/** Fetches every distinct provider's policy in `providerIds` in one pass, skipping duplicates. A provider with no row (or a row that fails validation) simply has no entry in the returned map — callers treat a missing entry as "no policy" (UNAVAILABLE), never a default. */
export async function getProviderPublicationPolicies(db: D1Database, providerIds: string[]): Promise<Map<string, ProviderPublicationPolicy>> {
  const map = new Map<string, ProviderPublicationPolicy>();
  for (const providerId of new Set(providerIds)) {
    const policy = await getProviderPublicationPolicy(db, providerId);
    if (policy) map.set(providerId, policy);
  }
  return map;
}
