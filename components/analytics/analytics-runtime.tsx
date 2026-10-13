"use client";

import { useEffect } from "react";
import type { Locale } from "@/config/locales";
import { clickEventFor, linkLocation, trackEvent } from "@/lib/analytics/events";
import { startGtm } from "@/lib/analytics/gtm";

/**
 * W16.4 (D-SEO): the site's measurement runtime, once per page from the locale layout. Renders nothing
 * (no layout shift). It
 *   1. records the page language in the dataLayer (`page_locale`, for the GA4 tag),
 *   2. reports phone_click / whatsapp_click for EVERY `tel:` / WhatsApp link on the page with one
 *      delegated listener — the links themselves stay plain server-rendered anchors,
 *   3. starts GTM after the window `load` event (lib/analytics/gtm.ts: production hostname or
 *      `?gtm_debug=` only), so Google's script never competes with the page's own LCP resources.
 */
export function AnalyticsRuntime({ locale }: { locale: Locale }) {
  useEffect(() => {
    const w = window as Window & { dataLayer?: unknown[] };
    (w.dataLayer ??= []).push({ page_locale: locale });

    const onClick = (e: MouseEvent) => {
      const link = e.target instanceof Element ? e.target.closest("a[href]") : null;
      const event = link ? clickEventFor(link.getAttribute("href") ?? "") : null;
      if (link && event) trackEvent(event, { link_location: linkLocation(link) });
    };
    document.addEventListener("click", onClick, { capture: true });

    const start = () => startGtm(window);
    if (document.readyState === "complete") start();
    else window.addEventListener("load", start, { once: true });

    return () => {
      document.removeEventListener("click", onClick, { capture: true });
      window.removeEventListener("load", start);
    };
  }, [locale]);

  return null;
}
