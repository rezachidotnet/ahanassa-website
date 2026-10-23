import { Share2 } from "lucide-react";
import { PRICE_CHART_COPY } from "@/lib/pricing/price-charts";
import { ChartCopyLink } from "./chart-copy-link";
import { ChartShareLink } from "./chart-share-link";

const LINK = "text-navy hover:text-copper inline-flex min-h-11 items-center gap-2 text-sm font-semibold underline underline-offset-4";

/**
 * W18.3 — «اشتراک در واتساپ» / «اشتراک در تلگرام» on a fa chart page: plain server-rendered links to the apps' share URLs
 * (lib/pricing/price-charts.ts chartShareLinks), no script of their own. The site's one delegated click listener
 * reports chart_share (components/analytics/analytics-runtime.tsx) from `data-chart-share` + `data-chart-slug`, and
 * not whatsapp_click. «کپی لینک برای بله» is a copy-link button (Bale has no web share URL; components/prices/
 * chart-copy-link.tsx), the one client island here. The shared page's preview is its build-time share image
 * (lib/og/share-images.ts). W27: the links (ChartShareLink) and the copied text name the Iran mirror host instead of
 * www.ahanassa.com when the page is opened there; the prerendered HTML keeps the canonical URL.
 */
export function ChartShare({ slug, url, title }: { slug: string; url: string; title: string }) {
  const t = PRICE_CHART_COPY;
  return (
    <div className="flex flex-wrap gap-x-6 gap-y-1">
      {(
        [
          ["whatsapp", t.shareWhatsapp],
          ["telegram", t.shareTelegram],
        ] as const
      ).map(([method, label]) => (
        <ChartShareLink key={method} method={method} slug={slug} url={url} title={title} className={LINK}>
          <Share2 aria-hidden="true" className="size-4 shrink-0" />
          {label}
        </ChartShareLink>
      ))}
      <ChartCopyLink slug={slug} url={url} title={title} label={t.shareBale} copiedLabel={t.linkCopied} className={`${LINK} cursor-pointer`} />
    </div>
  );
}
