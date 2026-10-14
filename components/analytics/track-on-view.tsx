"use client";

import { useEffect } from "react";
import { trackEvent, type AnalyticsEventName, type AnalyticsParams } from "@/lib/analytics/events";

/** W16.4: pushes one dataLayer event when the page that renders it is viewed (renders nothing). */
export function TrackOnView<E extends AnalyticsEventName>({ event, params }: { event: E; params?: AnalyticsParams<E> }) {
  const key = JSON.stringify(params ?? {});
  useEffect(() => {
    trackEvent(event, JSON.parse(key) as AnalyticsParams<E>);
  }, [event, key]);
  return null;
}
