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

/** Server-side Turnstile verification secret. Undefined until provisioned — see PROJECT_OVERRIDES.md §10. */
export function getTurnstileSecret(): string | undefined {
  return process.env.TURNSTILE_SECRET_KEY || undefined;
}
