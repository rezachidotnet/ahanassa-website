import { localizedPath, type Locale } from "../../config/locales.ts";
import { LIVECHAT_TIMEOUT_MS, livechatConfig, type LivechatConfig } from "../../config/livechat.ts";
import { GROUP_CARD_COPY } from "./company.ts";
import { homeExpertCopy, homeExpertWhatsAppHref } from "./home-expert.ts";

/**
 * W21.2 — the «چت با کارشناس» button's copy and props (components/livechat/livechat-button.tsx), in two places:
 * the live-chat slot of the homepage expert section (every locale) and a floating button on fa pages only, in the
 * corner where en/ar pages carry the floating WhatsApp button (components/layout/sticky-whatsapp.tsx). Both exist
 * only while config/livechat.ts is on.
 *
 * Fallback: when the widget cannot open (no operator online, no channel, a load error or 8 s without an open
 * window), the visitor gets WhatsApp and «ارسال لیست خرید» instead — the same destinations as the expert section.
 * No response-time promise and no «online» claim unless Odoo itself reported an operator online.
 */

/** Where a button sits: the `chat_location` of chat_open / chat_load_error (lib/analytics/events.ts). */
export type LivechatLocation = "home_expert" | "sticky";

export interface LivechatCopy {
  label: string;
  /** Screen-reader status while the widget loads (the button shows a spinner). */
  loading: string;
  /** Screen-reader text of the green dot, shown only when Odoo reported an operator online. */
  online: string;
  /** The fallback panel's message. */
  unavailable: string;
  whatsapp: string;
  rfq: string;
  close: string;
  newTab: string;
}

const copy: Record<Locale, Omit<LivechatCopy, "label" | "whatsapp" | "newTab">> = {
  fa: {
    loading: "در حال اتصال به کارشناس…",
    online: "کارشناس آنلاین است",
    unavailable: "گفت‌وگوی آنلاین الان در دسترس نیست. از این راه‌ها با ما در ارتباط باشید:",
    rfq: "ارسال لیست خرید",
    close: "بستن",
  },
  en: {
    loading: "Connecting to an expert…",
    online: "An expert is online",
    unavailable: "Live chat is not available right now. You can reach us here instead:",
    rfq: "Send your purchase list",
    close: "Close",
  },
  ar: {
    loading: "جارٍ الاتصال بخبير…",
    online: "خبير متصل الآن",
    unavailable: "الدردشة المباشرة غير متاحة الآن. يمكنك التواصل معنا عبر:",
    rfq: "أرسل قائمة الشراء",
    close: "إغلاق",
  },
};

export function livechatCopy(locale: Locale): LivechatCopy {
  return { ...copy[locale], label: homeExpertCopy[locale].chat, whatsapp: homeExpertCopy[locale].whatsapp.action, newTab: GROUP_CARD_COPY[locale].newTab };
}

export interface LivechatButtonProps {
  config: LivechatConfig;
  timeoutMs: number;
  location: LivechatLocation;
  copy: LivechatCopy;
  /** The fallback destinations: WhatsApp (null without a valid number) and the RFQ form. */
  whatsappHref: string | null;
  rfqHref: string;
}

/** The button's props for a locale and location, or null while live chat is off (then nothing is rendered). */
export function livechatButton(locale: Locale, location: LivechatLocation, config: LivechatConfig | null = livechatConfig()): LivechatButtonProps | null {
  if (!config) return null;
  if (location === "sticky" && !hasStickyLivechat(locale)) return null;
  return { config, timeoutMs: LIVECHAT_TIMEOUT_MS, location, copy: livechatCopy(locale), whatsappHref: homeExpertWhatsAppHref(locale), rfqHref: localizedPath(locale, "/contact") };
}

/** The floating button: fa only (en/ar keep the floating WhatsApp button in that corner). */
export function hasStickyLivechat(locale: Locale): boolean {
  return locale === "fa";
}
