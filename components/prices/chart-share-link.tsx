"use client";

import { useEffect, useState, type ReactNode } from "react";
import { CHART_SHARE_ATTRIBUTE, CHART_SLUG_ATTRIBUTE } from "@/lib/analytics/events";
import { pageUrlForHost } from "@/lib/mirror/iran-mirror";
import { chartShareLinks } from "@/lib/pricing/price-charts";

/**
 * One WhatsApp/Telegram share link of a chart page (components/prices/chart-share.tsx). Prerendered with the page's
 * canonical URL, exactly as before; W27: on the Iran mirror (www.ahanassa.ir / ahanassa.ir) the shared URL is switched
 * to that host after hydration, so a link shared on MCI opens on MCI (lib/mirror/iran-mirror.ts).
 */
export function ChartShareLink({ method, slug, url, title, className, children }: { method: "whatsapp" | "telegram"; slug: string; url: string; title: string; className: string; children: ReactNode }) {
  const [sharedUrl, setSharedUrl] = useState(url);
  useEffect(() => setSharedUrl(pageUrlForHost(url, window.location.hostname)), [url]);
  return (
    <a href={chartShareLinks(sharedUrl, title)[method]} target="_blank" rel="noopener noreferrer" {...{ [CHART_SHARE_ATTRIBUTE]: method, [CHART_SLUG_ATTRIBUTE]: slug }} className={className}>
      {children}
    </a>
  );
}
