import { forwardRef, type AnchorHTMLAttributes } from "react";

/**
 * The project's only internal-link component (architecture V1.1 §4.2, A1).
 *
 * Public pages are static files on an assets-only Worker. vinext's
 * `next/link` navigates and prefetches by requesting `<path>?_rsc=<hash>`,
 * which a static host cannot answer (Spike S1: it returns the HTML page and
 * the router falls back to a full load anyway). So internal navigation is a
 * plain `<a>`: one full page load, no prefetch, no RSC request. Never import
 * `next/link` in app/ or components/ — a test enforces this.
 */
export interface LinkProps extends Omit<AnchorHTMLAttributes<HTMLAnchorElement>, "href"> {
  href: string;
}

const Link = forwardRef<HTMLAnchorElement, LinkProps>(function Link({ href, ...rest }, ref) {
  return <a ref={ref} href={href} {...rest} />;
});

export default Link;
