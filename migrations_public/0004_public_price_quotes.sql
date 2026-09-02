-- Migration: 0004_public_price_quotes
-- Database: DB_PUBLIC
--
-- Homepage "latest prices" strip (docs/pricing/PRICE_PROVIDER_CONTRACT.md).
-- Purely additive (CREATE TABLE only) — no existing table touched, same
-- discipline as 0003_catalog_sync_state.sql.
--
-- Provider-agnostic by design: Odoo is only the first *possible* provider
-- (its Public Catalog API v1 does not expose price today — see
-- lib/pricing/providers/odoo-price-provider.ts, which deliberately throws
-- rather than returning fabricated/empty data). No row in this migration
-- is ever seeded with example/placeholder data; the homepage strip renders
-- nothing until a real provider is configured, enabled, and successfully
-- synced (PRICE_STRIP_ENABLED, wrangler.jsonc — default OFF).

-- One row per distinct QUOTE, not per product — a provider may publish
-- multiple prices for one product across unit/currency/market/delivery
-- basis, so (provider_id, provider_product_ref) alone is not a unique
-- identity. `quote_key` is provider-namespaced (never a bare
-- provider-supplied ref, which is not globally unique across providers)
-- and computed at ingestion time (lib/pricing/sync-orchestrator.ts) as
-- `${provider_id}:${provider_quote_ref}` when the provider supplies a
-- stable per-quote reference, else a SHA-256 hex digest of a structured
-- `[provider_product_ref, unit, currency, market_or_location,
-- delivery_basis]` array — hashing avoids any raw-delimiter-collision risk
-- from string concatenation.
CREATE TABLE public_price_quotes (
  quote_key                TEXT PRIMARY KEY,
  provider_id               TEXT NOT NULL,
  provider_product_ref      TEXT NOT NULL,
  -- Always mapped before a row exists — the orchestrator never persists an
  -- unmapped quote (lib/pricing/product-mapping.ts). Never nullable.
  product_key                TEXT NOT NULL,
  -- Source/audit metadata ONLY — never the public-facing title. The
  -- internal catalog (via `price_display_products.product_key`) is the
  -- sole title/link authority (docs/pricing/PRICE_PROVIDER_CONTRACT.md).
  provider_title             TEXT,
  -- Exact integer Rial — never SQLite REAL/floating point. A Toman-quoting
  -- provider's value is converted (x10, exact integer multiplication) at
  -- normalization time, before this table is ever touched.
  price_amount_irr           INTEGER NOT NULL,
  currency                   TEXT NOT NULL DEFAULT 'IRR',
  unit                       TEXT NOT NULL,
  market_or_location         TEXT,
  delivery_basis              TEXT,
  -- Effective/source timestamp — the staleness-freshness AUTHORITY at read
  -- time (lib/pricing/repository.ts). Nullable only because some providers
  -- may not supply one; synced_at is the documented fallback for that case
  -- only, never a blanket substitution.
  source_timestamp            TEXT,
  synced_at                   TEXT NOT NULL,
  source_url                  TEXT,
  -- Lifecycle status, not a validity gate — invalid/rejected records are
  -- never persisted at all (rejected before this table is touched).
  -- 'active' = returned by the provider's most recent successful sync;
  -- 'inactive' = soft-deactivated because a later successful sync no
  -- longer returned this quote_key (mirrors catalog's own
  -- deactivate-never-delete convention). A FAILED sync never changes this.
  status                      TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive')),
  created_at                  TEXT NOT NULL,
  updated_at                  TEXT NOT NULL
);

CREATE INDEX idx_public_price_quotes_product_key ON public_price_quotes (product_key);
CREATE INDEX idx_public_price_quotes_provider_id ON public_price_quotes (provider_id);

-- Manually curated (provider_id, provider_product_ref) -> internal
-- product_key mapping. Never inferred from a provider-supplied name/title
-- — an unmapped quote is rejected, not guessed.
CREATE TABLE price_product_mappings (
  provider_id           TEXT NOT NULL,
  provider_product_ref  TEXT NOT NULL,
  product_key           TEXT NOT NULL,
  created_at            TEXT NOT NULL,
  updated_at            TEXT NOT NULL,
  PRIMARY KEY (provider_id, provider_product_ref)
);

-- Owner-curated display configuration for the homepage strip — NOT a
-- second product-title source. `display_price_id` (not `product_key`) is
-- the primary key because the same internal product may later need more
-- than one display entry (e.g. two different markets) — `product_key`
-- stays an indexed, non-unique lookup column.
CREATE TABLE price_display_products (
  display_price_id            TEXT PRIMARY KEY,
  product_key                  TEXT NOT NULL,
  -- The exact quote basis this display entry targets — a fixed lookup key,
  -- never inferred at query time, so the read model can never compare or
  -- substitute an incompatible unit/currency/market/delivery basis.
  display_unit                 TEXT NOT NULL,
  display_currency             TEXT NOT NULL DEFAULT 'IRR',
  display_market_or_location   TEXT,
  display_delivery_basis        TEXT,
  -- Nullable, documented exception path ONLY (a price line with no exact
  -- catalog-product equivalent) — the default path resolves title/link via
  -- the internal catalog (lib/catalog/editorial-repository.ts) by
  -- `product_key`, never these columns, when a catalog match exists.
  title_override_fa            TEXT,
  title_override_en            TEXT,
  title_override_ar            TEXT,
  link_override_category_slug   TEXT,
  sort_order                    INTEGER NOT NULL DEFAULT 0,
  is_active                     INTEGER NOT NULL DEFAULT 1,
  created_at                    TEXT NOT NULL,
  updated_at                    TEXT NOT NULL
);

CREATE INDEX idx_price_display_products_product_key ON price_display_products (product_key);

-- One row per provider_id (providers succeed/fail independently, unlike
-- catalog's single global sync) — same lease-acquisition pattern as
-- catalog_sync_state (migrations_public/0003_catalog_sync_state.sql).
CREATE TABLE price_sync_state (
  provider_id                  TEXT PRIMARY KEY,
  last_attempted_at            TEXT,
  last_success_at              TEXT,
  consecutive_failure_count    INTEGER NOT NULL DEFAULT 0,
  last_failure_at              TEXT,
  -- Values include ordinary fetch/validation failures AND the v4
  -- safe-reconciliation outcomes that deliberately preserved existing rows
  -- rather than reconciling: 'provider_not_configured', 'provider_unavailable',
  -- 'incomplete_fetch', 'critical_normalization_failure',
  -- 'partial_validation_or_mapping_failure', 'suspicious_empty_snapshot',
  -- 'suspicious_count_collapse'. Every one of these means "existing rows
  -- were deliberately left untouched," never a silent successful sync.
  last_failure_reason_code      TEXT,
  lease_owner                   TEXT,
  lease_expires_at              TEXT,
  created_at                    TEXT NOT NULL,
  updated_at                    TEXT NOT NULL
);
