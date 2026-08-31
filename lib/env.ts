/**
 * Server-side environment access.
 *
 * Canonical variable name is APP_BASE_URL (SITE_URL is deprecated — see
 * ENVIRONMENT_VARIABLES.md via DOCS_INDEX.md §8 "Engineering, deployment, environments").
 *
 * Never invent production IDs/secrets here. Values with no safe default stay
 * undefined until supplied — do not fabricate a placeholder that looks real.
 */

const CANONICAL_ORIGIN = "https://www.ahanassa.com";

/** The canonical production origin, overridable per-environment via APP_BASE_URL. */
export function getAppBaseUrl(): string {
  const configured = process.env.APP_BASE_URL;
  if (configured) return configured.replace(/\/+$/, "");
  return CANONICAL_ORIGIN;
}

export function getAppEnv(): "local" | "preview" | "staging" | "production" {
  const value = process.env.APP_ENV;
  if (value === "preview" || value === "staging" || value === "production") return value;
  return "local";
}

/** GTM is architecturally required (PROJECT_OVERRIDES.md §5) but the container ID is not yet supplied. */
export function getGtmId(): string | undefined {
  return process.env.NEXT_PUBLIC_GTM_ID || undefined;
}

export interface OdooConfig {
  baseUrl: string;
  database: string;
  apiKey: string;
}

/**
 * Returns Odoo credentials only when ALL are present; never a partial
 * config. Real values are never fabricated — see lib/odoo/adapter.ts for
 * why credential presence alone still isn't sufficient to perform a real
 * sync call (DAR-013, model mapping unresolved).
 */
export function getOdooConfig(): OdooConfig | null {
  const baseUrl = process.env.ODOO_BASE_URL;
  const database = process.env.ODOO_DATABASE;
  const apiKey = process.env.ODOO_API_KEY;
  if (!baseUrl || !database || !apiKey) return null;
  return { baseUrl, database, apiKey };
}

/**
 * Public Catalog API v1 base URL — the same Odoo host as `ODOO_BASE_URL`,
 * reused rather than a new env var since this endpoint needs no credential
 * (`auth=public`, docs/integrations/odoo/catalog-v1/PUBLIC_CATALOG_API_V1.md).
 * Undefined until configured — never fabricated/hardcoded to a production
 * hostname here.
 */
export function getOdooCatalogApiBaseUrl(): string | undefined {
  return process.env.ODOO_BASE_URL || undefined;
}

export interface OdooRfqApiConfig {
  baseUrl: string;
  token: string;
}

/**
 * Odoo Public RFQ Intake API v1 config — `POST /api/v1/rfq`
 * (docs/integrations/odoo/rfq-v1/RFQ_API_CONTRACT_V1.md,
 * DOCUMENT_AUDIT_REPORT.md DAR-041). Deliberately its own credential,
 * `ODOO_RFQ_API_TOKEN` — never the legacy `ODOO_API_KEY` (that key
 * authenticates the old generic JSON-2 transport, `lib/odoo/client.ts`,
 * scoped to a different Odoo permission model and no longer the RFQ
 * delivery path). Reuses `ODOO_BASE_URL` for the host — that value is not a
 * secret, just the shared Odoo origin every integration on this project
 * already points at. Returns null when either half is missing; never a
 * partial config, matching `getOdooConfig()`'s own convention.
 */
export function getOdooRfqApiConfig(): OdooRfqApiConfig | null {
  const baseUrl = process.env.ODOO_BASE_URL;
  const token = process.env.ODOO_RFQ_API_TOKEN;
  if (!baseUrl || !token) return null;
  return { baseUrl, token };
}

/** Server-side Turnstile verification secret. Undefined until provisioned — see PROJECT_OVERRIDES.md §10. */
export function getTurnstileSecret(): string | undefined {
  return process.env.TURNSTILE_SECRET_KEY || undefined;
}

/** Public Turnstile site key — safe to reach browser code. Undefined until provisioned. */
export function getTurnstileSiteKey(): string | undefined {
  return process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY || undefined;
}
