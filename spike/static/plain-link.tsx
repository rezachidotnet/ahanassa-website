import { forwardRef, type AnchorHTMLAttributes } from "react";

type Href = string | { pathname?: string; query?: Record<string, string>; hash?: string };

/**
 * Spike S1 — `next/link` replacement for the fully static build (aliased in
 * vite.config.ts only when SPIKE_STATIC_EXPORT=1). vinext's client router
 * fetches `<path>?_rsc=<hash>` for navigation and prefetch; Static Assets
 * ignores the query and returns the HTML document, so the router falls back
 * to a full load anyway (spike evidence: nav-local-rsc-links.json). A plain
 * <a> gives the same full-page navigation with zero RSC/prefetch requests.
 * Link-only props (prefetch, replace, scroll, shallow, locale, …) are dropped.
 */
const PlainLink = forwardRef<HTMLAnchorElement, Omit<AnchorHTMLAttributes<HTMLAnchorElement>, "href"> & { href: Href; prefetch?: unknown; replace?: unknown; scroll?: unknown; shallow?: unknown; locale?: unknown; legacyBehavior?: unknown; passHref?: unknown; onNavigate?: unknown }>(function PlainLink(
  { href, prefetch: _p, replace: _r, scroll: _s, shallow: _sh, locale: _l, legacyBehavior: _lb, passHref: _ph, onNavigate: _on, ...rest },
  ref,
) {
  const url =
    typeof href === "string"
      ? href
      : `${href.pathname ?? ""}${href.query ? `?${new URLSearchParams(href.query).toString()}` : ""}${href.hash ? `#${href.hash}` : ""}`;
  return <a ref={ref} href={url} {...rest} />;
});

export default PlainLink;
