/**
 * Measurement configuration (W16.4, decision D-SEO) — the ONE place the
 * Google Tag Manager container and the GA4 property are set. GA4 itself is
 * configured INSIDE the GTM container (docs/analytics/GTM_SETUP.md); the
 * site only loads GTM and pushes dataLayer events.
 *
 * Both IDs were supplied by the owner on 2026-10-13 (W16.2/W16.4 follow-up;
 * PROJECT_OVERRIDES.md §5). GA4 loads ONLY through the "Google tag" inside the
 * GTM container (docs/analytics/GTM_SETUP.md step 1) — the site never adds a
 * gtag.js snippet, so a page view is never counted twice. A test enforces that.
 *
 * Why a committed config and not a per-target env var: the staging and
 * production artifacts must be byte-identical outside the r4 allowlist
 * (lib/static/target-diff-gate.ts). The container is the same for both; the
 * browser decides by hostname whether to load it (ANALYTICS_HOSTNAMES), so
 * staging traffic never reaches GA4.
 */
export const GTM_CONTAINER_ID: string | null = "GTM-TFN25VZQ";

/** GA4 measurement ID — documentation only: it is entered in the GTM "Google tag", never used by the site's code. */
export const GA4_MEASUREMENT_ID: string | null = "G-C8MZB6DXPZ";

/** Hostnames that load GTM. Any other host (staging, local) loads it only with `?gtm_debug=` (Tag Assistant preview). */
export const ANALYTICS_HOSTNAMES: readonly string[] = ["www.ahanassa.com"];

export const GTM_CONTAINER_ID_PATTERN = /^GTM-[A-Z0-9]{4,12}$/;
export const GA4_MEASUREMENT_ID_PATTERN = /^G-[A-Z0-9]{4,16}$/;

/** The container ID when it is set and well-formed, else null (a malformed value never reaches a script URL). */
export function gtmContainerId(id: string | null = GTM_CONTAINER_ID): string | null {
  return id && GTM_CONTAINER_ID_PATTERN.test(id) ? id : null;
}
