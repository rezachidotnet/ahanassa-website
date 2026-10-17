import type { Locale } from "@/config/locales";
import { LivechatButton, LivechatHost } from "@/components/livechat/livechat-button";
import { hasStickyLivechat, livechatProps } from "@/lib/content/livechat";

/**
 * W21.2 — the live chat's site-wide part, only while live chat is on (config/livechat.ts): the one chat panel every
 * «چت با کارشناس» button on the page opens (every locale: the homepage expert section has one), and on fa pages
 * the floating button. The floating button sits where en/ar pages have the floating WhatsApp button
 * (components/layout/sticky-whatsapp.tsx), which is unchanged — the two never share a page. Renders nothing otherwise.
 */
export function SiteLivechat({ locale }: { locale: Locale }) {
  const chat = livechatProps(locale);
  if (!chat) return null;
  return (
    <>
      {hasStickyLivechat(locale) && <LivechatButton chat={chat} variant="floating" />}
      <LivechatHost chat={chat} />
    </>
  );
}
