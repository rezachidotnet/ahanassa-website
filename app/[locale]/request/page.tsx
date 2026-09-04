import { permanentRedirect } from "next/navigation";
import { isLocale, localizedPath } from "@/config/locales";

interface PageProps {
  params: Promise<{ locale: string }>;
}

/**
 * `/request` — the frozen primary Header CTA destination
 * (AHANASSA_HEADER_FINAL_FROZEN_V2.0.md §40.2, §58.1). The actual RFQ/
 * purchase-list form implementation lives at `/contact`
 * (`app/[locale]/contact/page.tsx`) — redesigning the RFQ form/its own
 * dedicated entry experience is explicitly out of this Header task's scope
 * ("Do NOT redesign... RFQ form internals"). This route exists purely so
 * the frozen CTA target resolves to real, working content rather than a
 * 404, via a permanent redirect to the existing form — not a duplicated
 * page, not fabricated content. A future task may build a genuinely
 * distinct `/request` experience (broader intake formats per §40.3-40.5);
 * this redirect is the smallest correct interim implementation.
 */
export default async function RequestPage({ params }: PageProps) {
  const { locale: rawLocale } = await params;
  const locale = isLocale(rawLocale) ? rawLocale : "fa";
  permanentRedirect(localizedPath(locale, "/contact"));
}
