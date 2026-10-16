import type { Locale } from "@/config/locales";
import { WhatsAppIcon } from "@/components/icons/whatsapp-icon";
import { stickyWhatsApp, WHATSAPP_REL } from "@/lib/content/whatsapp";

/**
 * W20.1 (owner instruction 2026-10-16) — floating WhatsApp button on en and ar pages only (lib/content/whatsapp.ts
 * `stickyWhatsApp`; nothing on fa or without a valid number). A plain server-rendered wa.me link with a short
 * prefilled greeting: the delegated listener of components/analytics/analytics-runtime.tsx reports it as
 * `whatsapp_click`, `link_location: sticky`. Bottom inline-end corner (right in LTR, left in RTL), 56×56 px,
 * above the safe-area inset; hidden in print and on any page with a submit form, i.e. the /contact enquiry form (styles/theme-extensions.css), so
 * it never covers the form's buttons. The site has no cookie/consent banner. White on success-700 (5.87:1), with a white ring that keeps it distinct over the navy footer.
 */
export function StickyWhatsApp({ locale }: { locale: Locale }) {
  const link = stickyWhatsApp(locale);
  if (!link) return null;
  return (
    <a
      href={link.href}
      target="_blank"
      rel={WHATSAPP_REL}
      aria-label={link.label}
      title={link.label}
      data-sticky-whatsapp=""
      className="fixed end-4 bottom-[max(1rem,env(safe-area-inset-bottom))] z-30 inline-flex size-14 items-center justify-center rounded-full bg-[var(--aa-color-success-700)] text-white shadow-[var(--aa-shadow-md)] ring-2 ring-white transition-colors hover:bg-[#0f5c38] print:hidden"
    >
      <WhatsAppIcon className="size-7" />
    </a>
  );
}
