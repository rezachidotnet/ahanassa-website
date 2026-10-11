import { createElement } from "react";
import type { Locale } from "../../config/locales.ts";
import { WHATSAPP_BUSINESS_NUMBER, WHATSAPP_REL, whatsappCopy, whatsappDrawingsHref } from "../../lib/content/whatsapp.ts";

/**
 * "Send drawings via WhatsApp" (owner decision 2026-10-04, §19 item 5) — a
 * plain link, so it works without JavaScript on /contact. (The RFQ success
 * panel no longer shows it — owner, W10.3; `reference` stays supported.)
 * Renders nothing while no valid WHATSAPP_BUSINESS_NUMBER is configured.
 * Written without JSX so the node test runner can render it.
 */
export function WhatsAppDrawingsLink({ locale, reference, number = WHATSAPP_BUSINESS_NUMBER, className }: { locale: Locale; reference?: string | null; number?: string | null; className?: string }) {
  const href = whatsappDrawingsHref(locale, reference, number);
  if (!href) return null;
  const t = whatsappCopy(locale);
  return createElement(
    "p",
    { className: ["text-muted-foreground text-sm leading-relaxed", className].filter(Boolean).join(" "), "data-whatsapp-drawings": reference ? "confirmation" : "contact" },
    createElement("a", { href, target: "_blank", rel: WHATSAPP_REL, className: "text-navy font-bold underline underline-offset-4" }, t.label),
    " ",
    createElement("span", null, t.hint),
  );
}
