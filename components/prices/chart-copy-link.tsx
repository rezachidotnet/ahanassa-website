"use client";

import { useEffect, useRef, useState } from "react";
import { Share2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { CHART_SHARE_ATTRIBUTE, CHART_SLUG_ATTRIBUTE, chartShareParams, trackEvent } from "@/lib/analytics/events";
import { pageUrlForHost } from "@/lib/mirror/iran-mirror";
import { chartShareText } from "@/lib/pricing/price-charts";

/** How long «لینک کپی شد» stays on screen. */
const TOAST_MS = 2500;

/** navigator.clipboard, or (an http page, an older browser) a hidden textarea + execCommand("copy"). */
async function copyText(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    const area = document.createElement("textarea");
    area.value = text;
    area.setAttribute("readonly", "");
    area.style.cssText = "position:fixed;top:0;inset-inline-start:-9999px;opacity:0";
    document.body.appendChild(area);
    area.select();
    const ok = document.execCommand("copy");
    area.remove();
    return ok;
  }
}

/**
 * W18.3 — «کپی لینک برای بله» on a fa chart page. Bale publishes no web share URL (docs.bale.ai, bale.ai, ble.ir), so the
 * button copies the page title + link (the same text as the WhatsApp share) and shows «لینک کپی شد». It reports
 * chart_share itself (share_method=bale): the site's click listener only reads links. The toast is always fixed and
 * only its opacity changes, so showing it moves nothing (no CLS); its live region is always in the DOM, so screen
 * readers hear «لینک کپی شد». W27: the copied link names the Iran mirror host when the page is opened there.
 */
export function ChartCopyLink({ slug, url, title, label, copiedLabel, className }: { slug: string; url: string; title: string; label: string; copiedLabel: string; className?: string }) {
  const [copied, setCopied] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  useEffect(() => () => clearTimeout(timer.current), []);

  return (
    <>
      <button
        type="button"
        {...{ [CHART_SHARE_ATTRIBUTE]: "bale", [CHART_SLUG_ATTRIBUTE]: slug }}
        className={className}
        onClick={async () => {
          const share = chartShareParams("bale", slug);
          if (share) trackEvent("chart_share", share);
          if (!(await copyText(chartShareText(pageUrlForHost(url, window.location.hostname), title)))) return;
          setCopied(true);
          clearTimeout(timer.current);
          timer.current = setTimeout(() => setCopied(false), TOAST_MS);
        }}
      >
        <Share2 aria-hidden="true" className="size-4 shrink-0" />
        {label}
      </button>
      <span role="status" className={cn("bg-navy pointer-events-none fixed inset-x-0 bottom-6 z-50 mx-auto w-max max-w-[calc(100vw-2rem)] rounded-[var(--aa-radius-control)] px-4 py-2 text-sm font-semibold text-white shadow-lg transition-opacity", copied ? "opacity-100" : "opacity-0")}>
        {copied ? copiedLabel : ""}
      </span>
    </>
  );
}
