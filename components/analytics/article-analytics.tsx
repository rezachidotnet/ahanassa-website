"use client";

import { useEffect, useRef } from "react";
import { articleCtaLocation, isRfqHref, trackEvent } from "@/lib/analytics/events";

/** The observer's root extends this far above the viewport: "at or above the bottom of the screen". */
const REACHED_MARGIN = "1000000px 0px 0px 0px";

/**
 * D-ARTICLE-METRICS: the article page's two events. Rendered once, as the last child of the relatively
 * positioned wrapper around the article body; it is itself the 75% sentinel (an invisible 1px line at
 * `top: 75%` of the body). No scroll listener:
 *   - article_read: an IntersectionObserver on the sentinel, once per page view, then disconnected. The root
 *     reaches far above the screen (REACHED_MARGIN), so the sentinel counts as reached once it is anywhere
 *     above the bottom of the screen: a jump past it (End key, a contents link, a fast fling) never shows it
 *     on screen, and a plain observer would miss that;
 *   - article_cta_click: one delegated click listener on the enclosing <article data-analytics-scope="article">
 *     (where the layout's rfq_cta_click stays silent), for RFQ links only
 *     (`/contact`, `/request`); the location comes from the link's `data-article-cta` mark.
 * Slug and language only — never the title.
 */
export function ArticleAnalytics({ slug, lang }: { slug: string; lang: string }) {
  const ref = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    const sentinel = ref.current;
    if (!sentinel) return;
    const params = { article_slug: slug, article_lang: lang };

    let observer: IntersectionObserver | null = null;
    if (typeof IntersectionObserver === "function") {
      observer = new IntersectionObserver((entries) => {
        if (!entries.some((e) => e.isIntersecting)) return;
        observer?.disconnect();
        observer = null;
        trackEvent("article_read", params);
      }, { rootMargin: REACHED_MARGIN });
      observer.observe(sentinel);
    }

    const article = sentinel.closest<HTMLElement>('[data-analytics-scope="article"]');
    const onClick = (e: MouseEvent) => {
      const link = e.target instanceof Element ? e.target.closest("a[href]") : null;
      if (link && isRfqHref(link.getAttribute("href") ?? "")) trackEvent("article_cta_click", { ...params, cta_location: articleCtaLocation(link) });
    };
    article?.addEventListener("click", onClick, { capture: true });

    return () => {
      observer?.disconnect();
      article?.removeEventListener("click", onClick, { capture: true });
    };
  }, [slug, lang]);

  return <span ref={ref} aria-hidden="true" data-article-read-sentinel="" className="pointer-events-none absolute inset-x-0 top-3/4 h-px" />;
}
