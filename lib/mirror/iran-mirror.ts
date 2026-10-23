/**
 * W27 Iran mirror (owner, 2026-10-22). Hamrah-e Aval (MCI) mobile users cannot reach Cloudflare-proxied hostnames, so
 * the site is also served through ArvanCloud CDN:
 *
 *   www.ahanassa.ir, ahanassa.ir → origin www.ahanassa.com (the same static artifact, byte for byte)
 *   api.ahanassa.ir              → origin api.ahanassa.com (the RFQ Worker; no cache)
 *
 * The static HTML is identical on both hosts, so the browser decides at runtime: on a mirror host every call to the
 * RFQ Worker goes to its mirror origin instead. Canonical/hreflang/og/JSON-LD keep pointing to www.ahanassa.com.
 *
 * Hostnames only, never origins: the staging artifact must not contain the production RFQ origin string (r4,
 * lib/static/target-diff-gate.ts), and the map only ever rewrites the production API host.
 */
export const IRAN_MIRROR_HOSTS: readonly string[] = ["www.ahanassa.ir", "ahanassa.ir"];

/** Cloudflare API host → its ArvanCloud mirror host. */
export const IRAN_MIRROR_API_HOSTS: Readonly<Record<string, string>> = { "api.ahanassa.com": "api.ahanassa.ir" };

/** Whether the page is served on the Iran mirror. */
export function isIranMirrorHost(hostname: string): boolean {
  return IRAN_MIRROR_HOSTS.includes(hostname.toLowerCase());
}

/**
 * The RFQ endpoint to call from a page on `pageHostname`: on a mirror host, an absolute https URL on a mapped API host
 * moves to its mirror host (path, query kept); anything else — another host, a relative URL — is returned unchanged.
 */
export function rfqEndpointForHost(endpoint: string, pageHostname: string): string {
  if (!isIranMirrorHost(pageHostname)) return endpoint;
  let url: URL;
  try {
    url = new URL(endpoint);
  } catch {
    return endpoint;
  }
  const mirror = url.protocol === "https:" ? IRAN_MIRROR_API_HOSTS[url.host] : undefined;
  if (!mirror) return endpoint;
  url.host = mirror;
  return url.toString();
}

/**
 * The mirror origins of an RFQ API origin (`https://api.ahanassa.com` → [`https://api.ahanassa.ir`]; any other → []).
 * The static build adds them to the CSP connect-src next to the target's own origin (lib/static/static-rules.ts), so
 * only the production target — the one served through Arvan — allows the mirror.
 */
export function rfqApiMirrorOrigins(rfqApiOrigin: string): string[] {
  let url: URL;
  try {
    url = new URL(rfqApiOrigin);
  } catch {
    return [];
  }
  const mirror = url.protocol === "https:" ? IRAN_MIRROR_API_HOSTS[url.host] : undefined;
  return mirror ? [`https://${mirror}`] : [];
}

/** How long the Turnstile script may take on a mirror host, counted from navigation start (W27). */
export const TURNSTILE_UNREACHABLE_MS = 8_000;

/**
 * W27: on a mirror host, challenges.cloudflare.com may be unreachable too (MCI mobile). The form waits this many ms
 * (the rest of the 8 s budget since navigation start) and then, if the Turnstile script is still missing, explains
 * it and offers WhatsApp / phone / e-mail. Null = not a mirror host: never watched, nothing changes on .com.
 */
export function turnstileUnreachableDelay(pageHostname: string, msSinceNavigationStart: number): number | null {
  if (!isIranMirrorHost(pageHostname)) return null;
  return Math.max(0, TURNSTILE_UNREACHABLE_MS - Math.max(0, msSinceNavigationStart));
}

/** The canonical site host — what canonical/hreflang/og/JSON-LD always name (lib/env.ts). */
export const CANONICAL_SITE_HOST = "www.ahanassa.com";

/**
 * A page URL to hand to someone else (a share link, a copied link) from a page on `pageHostname`: on a mirror host an
 * absolute https URL on the canonical host moves to that mirror host (path, query, hash kept), so a link shared on
 * MCI opens on MCI; anything else is returned unchanged.
 */
export function pageUrlForHost(url: string, pageHostname: string): string {
  if (!isIranMirrorHost(pageHostname)) return url;
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    return url;
  }
  if (parsed.protocol !== "https:" || parsed.host !== CANONICAL_SITE_HOST) return url;
  parsed.host = pageHostname.toLowerCase();
  return parsed.toString();
}
