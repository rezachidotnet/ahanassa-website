-- Migration: 0008_price_variant_identity_and_provider_policy
-- Database: DB_PUBLIC
--
-- PRICE-P1 (docs/pricing/PRICE_STRIP_V2.1_ARCHITECTURE_DECISIONS.md §A/§K,
-- docs/pricing/PRICE_P0_IDENTITY_FRESHNESS_GATE.md). Purely additive:
-- `ALTER TABLE ... ADD COLUMN` on the three existing pricing tables (all
-- three verified empty in every environment via
-- `wrangler d1 execute DB_PUBLIC --local` immediately before writing this
-- migration — but written as a true additive ALTER regardless of that,
-- per this directory's own standing rule against ever repeating migration
-- 0002's DROP-and-recreate pattern, and per this task's explicit
-- instruction not to assume the tables are empty) + one new CREATE TABLE
-- for provider publication-cadence policy. Migration 0004 itself is
-- untouched; no existing column/table is dropped or renamed.
--
-- ============================================================================
-- A. EXACT VARIANT IDENTITY
-- ============================================================================
--
-- Frozen decision (PRICE_STRIP_V2.1_ARCHITECTURE_DECISIONS.md §A): dual
-- identity. `product_key` (existing, UNCHANGED semantics — Product
-- Template public identity, e.g. `catalog_products.template_xid`) remains
-- the title/routing/grouping identity. `variant_key` (NEW) is the exact
-- Product Variant public identity — `product_variants.xid`, the same
-- durable, `NOT NULL UNIQUE` identity the Catalog domain and RFQ's own
-- `variantXid` precedent already use — and is the commercial PRICE anchor
-- going forward. Never an Odoo integer ID (task's own explicit
-- instruction, matching CLAUDE.md "Stable Identity").
--
-- Added to all three tables the frozen direction names explicitly
-- ("provider mapping -> exact variant identity -> normalized quote ->
-- curated display benchmark. The exact variant identity must survive
-- through the full pipeline."):
--
--   price_product_mappings.variant_key  -- the curator's mapping target
--   public_price_quotes.variant_key     -- carried through at ingestion,
--                                          so a persisted quote's exact
--                                          variant is directly queryable
--                                          without a join back to a
--                                          mapping row that may since have
--                                          changed
--   price_display_products.variant_key  -- the curator's chosen exact
--                                          variant for this display slot
--
-- All three are NULLABLE. This is deliberate, not an oversight — the
-- frozen "Backward Compatibility" law (task §6): a row without a
-- variant_key is not invented one; it simply remains template-level-only
-- and ineligible for exact V2.1 benchmark publication until explicitly
-- curated. Fail-closed application logic (lib/pricing/variant-integrity.ts,
-- wired into lib/pricing/sync-orchestrator.ts) enforces the actual
-- invariant ("variant_key must resolve to a real public Product Variant
-- AND that variant's own template must equal product_key, when both are
-- supplied") — a plain SQLite FOREIGN KEY can express "this must be a
-- real product_variants.xid" but cannot express a cross-column
-- consistency rule against a second column's value, so the FK below is
-- real, additive defense-in-depth (catches a bare typo/dangling
-- reference), not the sole authority. The declared FK is added via a
-- plain ALTER TABLE ADD COLUMN — valid in SQLite/D1 for a nullable column
-- with no default, since NULL trivially satisfies any FK.
PRAGMA foreign_keys = ON;

ALTER TABLE price_product_mappings ADD COLUMN variant_key TEXT REFERENCES product_variants (xid);
ALTER TABLE public_price_quotes    ADD COLUMN variant_key TEXT REFERENCES product_variants (xid);
ALTER TABLE price_display_products ADD COLUMN variant_key TEXT REFERENCES product_variants (xid);

-- Read-model lookups by exact variant (P3's read-model contract will
-- filter/join on this) — mirrors this table's own existing
-- idx_..._product_key indexes exactly. price_product_mappings is not
-- indexed on variant_key — it is looked up exclusively by its own
-- (provider_id, provider_product_ref) primary key, never by variant.
CREATE INDEX idx_public_price_quotes_variant_key    ON public_price_quotes    (variant_key);
CREATE INDEX idx_price_display_products_variant_key ON price_display_products (variant_key);

-- ============================================================================
-- B. PROVIDER PUBLICATION-CADENCE POLICY
-- ============================================================================
--
-- Frozen decision (ARCHITECTURE_DECISIONS.md §G/§H, task §7-10): freshness
-- policy belongs to the price SOURCE/PROVIDER, never hardcoded in
-- TypeScript, never a per-provider `if (provider_id === "odoo")` branch,
-- and never a universal flat "24 hours" rule. One row per `provider_id` —
-- deliberately NOT a per-`price_display_products`-row override in this
-- migration (task §11: "Do NOT add per-price_display_products cadence
-- override in PRICE-P1 unless repository evidence reveals an immediate
-- real requirement" — no such evidence exists; `PROVIDER_REGISTRY` today
-- has exactly one, non-functional, stub provider).
--
-- Smallest deterministic representation capable of expressing intraday /
-- daily / weekly / monthly without a provider-specific code branch
-- (task §9): `cadence_kind` names the business-readable category (the
-- concept the frozen decisions explicitly list as its own item, distinct
-- from "interval/count"); `cadence_interval_count` + `cadence_interval_unit`
-- give the precise numeric cycle length the actual missed-cycle
-- arithmetic needs (e.g. "every 4 hours", "every 1 day", "every 2 weeks").
-- `publication_weekdays` is the piece that satisfies the frozen weekend
-- rule (task §9/§23, spec §24.3): a NULL value means every calendar day
-- counts as a valid publication day (the correct default for
-- intraday/weekly/monthly cadences, where "day of week" isn't the
-- constraining factor); a non-NULL comma-separated ISO-8601 weekday list
-- (1=Monday..7=Sunday, e.g. "1,2,3,4,5") restricts which days count for a
-- day-granularity ("daily") cadence, so a Friday-to-Monday gap for a
-- Mon-Fri source is correctly one missed cycle, never three. Free-text
-- CSV-in-TEXT is this database's own existing convention for a small,
-- bounded list (product_variants.allowed_commercial_units), reused here
-- rather than inventing a new representation; validated fail-closed at
-- the application layer (lib/pricing/provider-policy.ts), not by a SQLite
-- CHECK (which cannot robustly validate CSV structure).
--
-- `timezone` is REQUIRED (NOT NULL) — task §10: "Publication policy must
-- have an explicit timezone where schedule/day boundaries matter. Do not
-- rely on Cloudflare Worker runtime timezone or browser timezone."
-- Defaults to 'Asia/Tehran' (this project's own operating timezone,
-- CLAUDE.md/PROJECT_OVERRIDES.md), never silently inferred per-row.
--
-- Deliberately NOT built in this migration (task §8/§13, spec §24.3): a
-- full market/public-holiday calendar engine. `publication_weekdays`
-- alone is sufficient to prevent the obvious "ordinary weekend"
-- misclassification this task calls out explicitly; a specific-date
-- holiday exception list remains a documented, deliberate future gap
-- (docs/pricing/PRICE_P1_IDENTITY_POLICY_REPORT.md), not silently absent.
--
-- No authoritative `freshness_state` is stored anywhere in this table or
-- migration (task §12, ARCHITECTURE_DECISIONS.md §E) — this table holds
-- POLICY INPUTS only; the actual FRESH/AGING/STALE/UNAVAILABLE
-- classification remains derived at read time (PRICE-P2), every request,
-- from `(now, source_timestamp, this policy)` — never persisted, never
-- computed only-at-sync-time.
CREATE TABLE price_provider_policies (
  provider_id             TEXT PRIMARY KEY,
  cadence_kind            TEXT NOT NULL CHECK (cadence_kind IN ('intraday', 'daily', 'weekly', 'monthly')),
  cadence_interval_count  INTEGER NOT NULL DEFAULT 1 CHECK (cadence_interval_count > 0),
  cadence_interval_unit   TEXT NOT NULL CHECK (cadence_interval_unit IN ('hours', 'days', 'weeks', 'months')),
  publication_weekdays    TEXT,
  timezone                TEXT NOT NULL DEFAULT 'Asia/Tehran',
  created_at              TEXT NOT NULL,
  updated_at              TEXT NOT NULL
);

-- No seed rows — same "no fake/seeded data" discipline as every other
-- pricing table (migrations_public/0004_public_price_quotes.sql's own
-- header). `PROVIDER_REGISTRY` has no real, functional provider yet
-- (lib/pricing/providers/odoo-price-provider.ts deliberately throws); a
-- policy row is only ever inserted once a real provider is actually being
-- activated (docs/pricing/PRICE_PROVIDER_CONTRACT.md §7 "Safe rollout
-- order").
