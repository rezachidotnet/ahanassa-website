import type { Locale } from "@/config/locales";
import { LivechatButton } from "@/components/livechat/livechat-button";
import { livechatButton } from "@/lib/content/livechat";

/**
 * W21.2 — the floating «چت با کارشناس» button: fa pages only, and only while live chat is on (config/livechat.ts).
 * It sits where en/ar pages have the floating WhatsApp button (components/layout/sticky-whatsapp.tsx), which is
 * unchanged — the two never share a page. Renders nothing otherwise.
 */
export function StickyLivechat({ locale }: { locale: Locale }) {
  const chat = livechatButton(locale, "sticky");
  if (!chat) return null;
  return <LivechatButton chat={chat} variant="floating" />;
}
