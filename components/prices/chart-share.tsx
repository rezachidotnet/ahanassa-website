import { Share2 } from "lucide-react";
import { CHART_SHARE_ATTRIBUTE, CHART_SLUG_ATTRIBUTE } from "@/lib/analytics/events";
import { chartShareLinks, chartShareText, PRICE_CHART_COPY } from "@/lib/pricing/price-charts";
import { ChartCopyLink } from "./chart-copy-link";

const LINK = "text-navy hover:text-copper inline-flex min-h-11 items-center gap-2 text-sm font-semibold underline underline-offset-4";

/**
 * W18.3 — «اشتراک در واتساپ» / «اشتراک در تلگرام» on a fa chart page: plain server-rendered links to the apps' share URLs
 * (lib/pricing/price-charts.ts chartShareLinks), no script of their own. The site's one delegated click listener
 * reports chart_share (components/analytics/analytics-runtime.tsx) from `data-chart-share` + `data-chart-slug`, and
 * not whatsapp_click. «اشتراک در بله» is a copy-link button (Bale has no web share URL; components/prices/
 * chart-copy-link.tsx), the one client island here. The shared page's preview is its build-time share image
 * (lib/og/share-images.ts).
 */
export function ChartShare({ slug, url, title }: { slug: string; url: string; title: string }) {
  const links = chartShareLinks(url, title);
  const t = PRICE_CHART_COPY;
  return (
    <div className="flex flex-wrap gap-x-6 gap-y-1">
      {(
        [
          ["whatsapp", links.whatsapp, t.shareWhatsapp],
          ["telegram", links.telegram, t.shareTelegram],
        ] as const
      ).map(([method, href, label]) => (
        <a key={method} href={href} target="_blank" rel="noopener noreferrer" {...{ [CHART_SHARE_ATTRIBUTE]: method, [CHART_SLUG_ATTRIBUTE]: slug }} className={LINK}>
          <Share2 aria-hidden="true" className="size-4 shrink-0" />
          {label}
        </a>
      ))}
      <ChartCopyLink slug={slug} text={chartShareText(url, title)} label={t.shareBale} copiedLabel={t.linkCopied} className={`${LINK} cursor-pointer`} />
    </div>
  );
}
