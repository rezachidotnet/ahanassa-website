import { localizedPath, type Locale } from "../../config/locales.ts";
import { LIVECHAT_PAGE_ORIGIN, LIVECHAT_STATUS_TIMEOUT_MS, LIVECHAT_TIMEOUT_MS, livechatConfig, type LivechatConfig } from "../../config/livechat.ts";
import { GROUP_CARD_COPY, WORKING_HOURS } from "./company.ts";
import type { OpeningSpec } from "./expert-open-state.ts";
import { homeExpertCopy, homeExpertWhatsAppHref } from "./home-expert.ts";

/**
 * W21.2 — «چت با کارشناس» (components/livechat/livechat-button.tsx): a button in the live-chat slot of the homepage
 * expert section (every locale) and a floating button on fa pages only, in the corner where en/ar pages carry the
 * floating WhatsApp button (components/layout/sticky-whatsapp.tsx). A click opens ONE panel per page with Odoo's
 * support page in an iframe (no Odoo JS on the site). All of it exists only while config/livechat.ts is on.
 *
 * Fallback: when the iframe has not loaded within 18 s (W21.3; it says «در حال اتصال به کارشناس…» meanwhile), the panel shows WhatsApp and «ارسال لیست خرید» instead — the
 * same destinations as the expert section. No response-time promise, and «کارشناس آنلاین است» only when Odoo said so.
 */

/** Where a click came from: the `chat_location` of chat_open / chat_load_error / chat_teaser_shown (lib/livechat/events.ts). */
export type LivechatLocation = "home_expert" | "sticky";

export interface LivechatCopy {
  label: string;
  /** The panel's heading and the iframe's accessible name. */
  title: string;
  frameTitle: string;
  /** The status while the iframe loads: shown under the spinner and announced (role="status"). */
  loading: string;
  /** The fallback message. */
  unavailable: string;
  whatsapp: string;
  rfq: string;
  close: string;
  newTab: string;
  /** The desktop teaser bubble (shown only when Odoo reported an operator online). */
  teaser: string;
  /** The mobile teaser dot's screen-reader text. */
  online: string;
  dismiss: string;
}

const copy: Record<Locale, Omit<LivechatCopy, "label" | "whatsapp" | "newTab">> = {
  fa: {
    title: "گفت‌وگو با کارشناس فروش",
    frameTitle: "گفت‌وگوی آنلاین با کارشناس فروش آهن آسا",
    loading: "در حال اتصال به کارشناس…",
    unavailable: "گفت‌وگوی آنلاین الان در دسترس نیست. از این راه‌ها با ما در ارتباط باشید:",
    rfq: "ارسال لیست خرید",
    close: "بستن گفت‌وگو",
    teaser: "سؤالی درباره قیمت یا موجودی دارید؟ کارشناس آنلاین است",
    online: "کارشناس آنلاین است",
    dismiss: "بستن پیام",
  },
  en: {
    title: "Chat with a sales expert",
    frameTitle: "Live chat with an Ahan Assa sales expert",
    loading: "Connecting you to a sales expert…",
    unavailable: "Live chat is not available right now. You can reach us here instead:",
    rfq: "Send your purchase list",
    close: "Close chat",
    teaser: "A question about prices or availability? An expert is online",
    online: "An expert is online",
    dismiss: "Dismiss",
  },
  ar: {
    title: "تحدث مع خبير المبيعات",
    frameTitle: "دردشة مباشرة مع خبير مبيعات آهن آسا",
    loading: "جارٍ الاتصال بخبير المبيعات…",
    unavailable: "الدردشة المباشرة غير متاحة الآن. يمكنك التواصل معنا عبر:",
    rfq: "أرسل قائمة الشراء",
    close: "إغلاق الدردشة",
    teaser: "هل لديك سؤال عن الأسعار أو التوفر؟ خبير متصل الآن",
    online: "خبير متصل الآن",
    dismiss: "إغلاق الرسالة",
  },
};

export function livechatCopy(locale: Locale): LivechatCopy {
  return { ...copy[locale], label: homeExpertCopy[locale].chat, whatsapp: homeExpertCopy[locale].whatsapp.action, newTab: GROUP_CARD_COPY[locale].newTab };
}

export interface LivechatProps {
  locale: Locale;
  config: LivechatConfig;
  timeoutMs: number;
  /** The status page's budget (5 s): no message → the hidden frame goes and no teaser shows. */
  statusTimeoutMs: number;
  /** The `page` origin when the site is not served over https (local preview). */
  pageOrigin: string;
  copy: LivechatCopy;
  /** The fallback destinations: WhatsApp (null without a valid number) and the RFQ form. */
  whatsappHref: string | null;
  rfqHref: string;
  /** Tehran sales hours (company.ts — the same calendar as W21.1's channel): the teaser never shows outside them. */
  hours: readonly OpeningSpec[];
}

/** The live chat's props for a locale, or null while live chat is off (then nothing is rendered). */
export function livechatProps(locale: Locale, config: LivechatConfig | null = livechatConfig()): LivechatProps | null {
  if (!config) return null;
  return {
    locale,
    config,
    timeoutMs: LIVECHAT_TIMEOUT_MS,
    statusTimeoutMs: LIVECHAT_STATUS_TIMEOUT_MS,
    pageOrigin: LIVECHAT_PAGE_ORIGIN,
    copy: livechatCopy(locale),
    whatsappHref: homeExpertWhatsAppHref(locale),
    rfqHref: localizedPath(locale, "/contact"),
    hours: WORKING_HOURS,
  };
}

/** The floating button: fa only (en/ar keep the floating WhatsApp button in that corner). */
export function hasStickyLivechat(locale: Locale): boolean {
  return locale === "fa";
}
