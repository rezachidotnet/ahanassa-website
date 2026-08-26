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
