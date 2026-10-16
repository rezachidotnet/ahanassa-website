"use client";

import { useEffect, useRef } from "react";
import { trackEvent, type AnalyticsEventName, type AnalyticsParams } from "@/lib/analytics/events";

/**
 * W18.2: pushes one dataLayer event the first time its PARENT element is at least half in view (gauge_view). Renders
 * an empty hidden span (no layout shift); without IntersectionObserver it reports nothing.
 */
export function TrackWhenVisible<E extends AnalyticsEventName>({ event, params }: { event: E; params?: AnalyticsParams<E> }) {
  const ref = useRef<HTMLSpanElement>(null);
  const key = JSON.stringify(params ?? {});
  useEffect(() => {
    const target = ref.current?.parentElement;
    if (!target || typeof IntersectionObserver === "undefined") return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (!entries.some((e) => e.isIntersecting)) return;
        trackEvent(event, JSON.parse(key) as AnalyticsParams<E>);
        observer.disconnect();
      },
      { threshold: 0.5 },
    );
    observer.observe(target);
    return () => observer.disconnect();
  }, [event, key]);
  return <span ref={ref} hidden />;
}
