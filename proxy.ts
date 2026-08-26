import { NextResponse, type NextRequest } from "next/server";
import { defaultLocale, isLocale } from "@/config/locales";
import { applySecurityHeaders } from "@/lib/security/headers";

/**
 * Locale routing foundation.
 *
 * fa is the default, unprefixed locale: requests to "/", "/about", etc. are
 * rewritten internally to "/fa/..." so app/[locale]/... handles them, while
 * the address bar keeps the unprefixed URL. en/ar arrive already prefixed
 * and pass through unchanged. An explicit "/fa/..." request is redirected to
 * its unprefixed equivalent — fa never gets a visible prefix.
 */
export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const segments = pathname.split("/").filter(Boolean);
  const firstSegment = segments[0];

  let response: NextResponse;

  if (firstSegment === defaultLocale) {
    const rest = segments.slice(1).join("/");
    const url = request.nextUrl.clone();
    url.pathname = rest ? `/${rest}` : "/";
    response = NextResponse.redirect(url, 308);
  } else if (firstSegment && isLocale(firstSegment)) {
    response = NextResponse.next();
  } else {
    const url = request.nextUrl.clone();
    url.pathname = `/${defaultLocale}${pathname === "/" ? "" : pathname}`;
    response = NextResponse.rewrite(url);
  }

  applySecurityHeaders(response.headers);
  return response;
}

export const config = {
  matcher: ["/((?!api|_next|_vercel|.*\\..*|robots.txt|sitemap.xml|sitemaps).*)"],
};
