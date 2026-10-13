import { ANALYTICS_HOSTNAMES, gtmContainerId } from "../../config/analytics.ts";

/**
 * GTM loading rule (W16.4): the container loads only on a production hostname, or anywhere with
 * `?gtm_debug=` in the URL (GTM Preview / Tag Assistant). Staging and local builds are byte-identical
 * to production (r4) and stay silent by this rule, not by a different build.
 */
export function shouldLoadGtm(hostname: string, search: string, hostnames: readonly string[] = ANALYTICS_HOSTNAMES): boolean {
  return hostnames.includes(hostname) || /[?&]gtm_debug=/.test(search);
}

/** The standard GTM bootstrap, as a script element we create (no inline script: the CSP has no 'unsafe-inline' for scripts). */
export function gtmScriptUrl(id: string): string {
  return `https://www.googletagmanager.com/gtm.js?id=${encodeURIComponent(id)}`;
}

/**
 * Starts GTM once per page: `gtm.start` + the async script. Returns false when there is no valid container
 * ID, the host is not allowed, or it already ran. Called after the window `load` event, so the container
 * never competes with the page's LCP resources; the events pushed before that wait in `dataLayer`.
 */
export function startGtm(win: Window & { dataLayer?: unknown[]; __ahanassaGtm?: boolean }, id: string | null = gtmContainerId()): boolean {
  if (!id || win.__ahanassaGtm || !shouldLoadGtm(win.location.hostname, win.location.search)) return false;
  win.__ahanassaGtm = true;
  (win.dataLayer ??= []).push({ "gtm.start": Date.now(), event: "gtm.js" });
  const script = win.document.createElement("script");
  script.async = true;
  script.src = gtmScriptUrl(id);
  win.document.head.appendChild(script);
  return true;
}
