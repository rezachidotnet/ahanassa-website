"use client";

import { useEffect } from "react";
import type { Locale } from "@/config/locales";
import { CHART_RFQ_ATTRIBUTE, CHART_SLUG_ATTRIBUTE, clickEventFor, expertClickEvent, familyFromPath, isRfqHref, linkLocation, rfqCtaLocation, trackEvent } from "@/lib/analytics/events";
import { startGtm } from "@/lib/analytics/gtm";

/** The article page's <article> (it reports article_cta_click instead). */
const ARTICLE_SCOPE = '[data-analytics-scope="article"]';

/**
 * W16.4 (D-SEO): the site's measurement runtime, once per page from the locale layout. Renders nothing
 * (no layout shift). It
 *   1. records the page language in the dataLayer (`page_locale`, for the GA4 tag),
 *   2. reports phone_click / whatsapp_click for EVERY `tel:` / WhatsApp link on the page with one
 *      delegated listener — the links themselves stay plain server-rendered anchors,
 *   3. reports rfq_cta_click for every RFQ link (`/contact`, `/request`) outside an article (an article
 *      reports its own article_cta_click, components/analytics/article-analytics.tsx), with the catalog family
 *      when the link, the page (`data-product-family`) or the URL names one,
 *   4. reports expert_call_click / expert_whatsapp_click / expert_rfq_click / expert_chat_click for the homepage
 *      expert section's actions (`data-expert-action`, W20.3), on top of the events above,
 *   5. starts GTM after the window `load` event (lib/analytics/gtm.ts: production hostname or
 *      `?gtm_debug=` only), so Google's script never competes with the page's own LCP resources.
 */
export function AnalyticsRuntime({ locale }: { locale: Locale }) {
  useEffect(() => {
    const w = window as Window & { dataLayer?: unknown[] };
    (w.dataLayer ??= []).push({ page_locale: locale });

    const onClick = (e: MouseEvent) => {
      const link = e.target instanceof Element ? e.target.closest("a[href]") : null;
      const event = link ? clickEventFor(link.getAttribute("href") ?? "") : null;
      const expert = link ? expertClickEvent(link.getAttribute("data-expert-action")) : null;
      if (link && expert) trackEvent(expert, { expert_variant: link.closest("[data-expert-variant]")?.getAttribute("data-expert-variant") ?? undefined });
      if (link && event) trackEvent(event, { link_location: linkLocation(link) });
      else if (link && isRfqHref(link.getAttribute("href") ?? "") && !link.closest(ARTICLE_SCOPE)) {
        const family = link.closest("[data-product-family]")?.getAttribute("data-product-family") ?? document.querySelector("[data-product-family]")?.getAttribute("data-product-family") ?? familyFromPath(window.location.pathname);
        trackEvent("rfq_cta_click", { cta_location: rfqCtaLocation(link, window.location.pathname) ?? undefined, product_family: family ?? undefined });
        // W18.2: «قیمت قطعی برای حجم شما» of a price gauge or a chart page also reports chart_to_rfq.
        const chartCta = link.closest(`[${CHART_RFQ_ATTRIBUTE}]`);
        if (chartCta) trackEvent("chart_to_rfq", { cta_location: chartCta.getAttribute(CHART_RFQ_ATTRIBUTE) ?? undefined, product_slug: chartCta.getAttribute(CHART_SLUG_ATTRIBUTE) ?? undefined, product_family: family ?? undefined });
      }
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
