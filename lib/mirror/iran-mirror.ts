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
/**
 * W30 (P1): + new.ahanassa.ir, the shadow host on which the domestic copy (iransrv, deploy/iran/) is proven before the
 * owner moves www.ahanassa.ir's Arvan origin to it. Same behaviour as the other mirror hosts (its form posts to
 * api.ahanassa.ir); canonical/hreflang/og/JSON-LD stay on www.ahanassa.com on every host.
 */
/**
 * W32 (W29 P2, owner rules 2026-10-22): the domestic RFQ intake is proven on its own API hosts BEFORE api.ahanassa.ir
 * is switched (that switch is NOT part of P2):
 *
 *   page host            its form posts to            Arvan origin of that API host
 *   www.ahanassa.ir      api.ahanassa.ir              api.ahanassa.com (the Worker) — unchanged
 *   ahanassa.ir          api.ahanassa.ir              idem
 *   new.ahanassa.ir      api-new.ahanassa.ir          iransrv, production intake (shadow API host; created by the owner)
 *   staging.ahanassa.ir  api-staging.ahanassa.ir      iransrv, staging intake
 *
 * Only the target's own API host is ever rewritten (`from`): a production page never posts to the staging intake and
 * vice versa. Which captcha the form shows is then the API's answer (GET /api/rfqs/capabilities), not the host's.
 */
export const IRAN_PAGE_API_HOSTS: Readonly<Record<string, { from: string; to: string }>> = {
  "www.ahanassa.ir": { from: "api.ahanassa.com", to: "api.ahanassa.ir" },
  "ahanassa.ir": { from: "api.ahanassa.com", to: "api.ahanassa.ir" },
  "new.ahanassa.ir": { from: "api.ahanassa.com", to: "api-new.ahanassa.ir" },
  "staging.ahanassa.ir": { from: "api-staging.ahanassa.com", to: "api-staging.ahanassa.ir" },
};

export const IRAN_MIRROR_HOSTS: readonly string[] = Object.keys(IRAN_PAGE_API_HOSTS);

/** Whether the page is served on the Iran mirror. */
export function isIranMirrorHost(hostname: string): boolean {
  return IRAN_MIRROR_HOSTS.includes(hostname.toLowerCase());
}

/**
 * The RFQ endpoint to call from a page on `pageHostname`: on a mirror host, an absolute https URL on a mapped API host
 * moves to its mirror host (path, query kept); anything else — another host, a relative URL — is returned unchanged.
 */
export function rfqEndpointForHost(endpoint: string, pageHostname: string): string {
  const map = IRAN_PAGE_API_HOSTS[pageHostname.toLowerCase()];
  if (!map) return endpoint;
  let url: URL;
  try {
    url = new URL(endpoint);
  } catch {
    return endpoint;
  }
  if (url.protocol !== "https:" || url.host !== map.from) return endpoint;
  url.host = map.to;
  return url.toString();
}

/**
 * The mirror origins of an RFQ API origin — every API host a page of this target may be sent to on an Iran host:
 * `https://api.ahanassa.com` → [`https://api.ahanassa.ir`, `https://api-new.ahanassa.ir`];
 * `https://api-staging.ahanassa.com` → [`https://api-staging.ahanassa.ir`]; any other → []. The static build adds
 * them to the CSP connect-src next to the target's own origin (lib/static/static-rules.ts).
 */
export function rfqApiMirrorOrigins(rfqApiOrigin: string): string[] {
  let url: URL;
  try {
    url = new URL(rfqApiOrigin);
  } catch {
    return [];
  }
  if (url.protocol !== "https:") return [];
  return [...new Set(Object.values(IRAN_PAGE_API_HOSTS).filter((m) => m.from === url.host).map((m) => `https://${m.to}`))];
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
