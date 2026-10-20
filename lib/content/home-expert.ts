import { localizedPath, type Locale } from "../../config/locales.ts";
import { isValidWhatsAppNumber, WHATSAPP_BUSINESS_NUMBER } from "./whatsapp.ts";
import { SALES_EXPERT, type SalesExpertProfile } from "./company.ts";
import { homepageCopy } from "./homepage.ts";
import type { OpenStateLabels } from "./expert-open-state.ts";

/**
 * W20.3 (owner instruction 2026-10-16) — the homepage «با کارشناس فروش صحبت کنید» section
 * (components/home/expert-contact.tsx), between the content sections and the Final CTA.
 *
 * B2B buyers want to reach a real person before they buy, with low friction and a choice of channel, so the
 * section offers equal options — phone, WhatsApp, the RFQ form, and the working hours — and nothing else.
 * Facts come from their single sources: the phone (contact-channels.ts), the WhatsApp number (whatsapp.ts) and
 * the hours (company.ts). The person is a ROLE («کارشناس فروش آهن آسا») unless a real expert is configured
 * (SALES_EXPERT). No response-time promise: none is owner-confirmed, so the reassurance line says only what is true.
 *
 * Redesign (owner feedback 2026-10-16, freeze amendment A2): two layouts behind one build-time switch, the RFQ
 * («ارسال فاکتور یا لیست خرید», CTA_STRATEGY §4) as the section's one primary action, and a live «open now» line.
 */

/**
 * Build-time layout switch, the same for both static targets:
 * - "A" Concierge card — one elevated card: the expert/intro and the live hours at the reading start, three action
 *   tiles at the reading end (RFQ primary).
 * - "B" Split band — a benefit headline, three proof points from approved homepage copy, and a button row.
 */
export const EXPERT_SECTION_VARIANT: "A" | "B" = "A";

/** The `link_location` / `cta_location` of every link in the section (lib/analytics/events.ts). */
export const HOME_EXPERT_LOCATION = "home_expert";

/** /contact's attachments heading (components/contact/rfq-files-field.tsx). Shown only while uploads are on; without it the link opens the form's page. */
export const RFQ_FILES_ANCHOR = "rfq-files-title";

export interface HomeExpertCopy {
  /** The role, shown above the H2 — never a person's name. */
  role: string;
  title: string;
  /** One line of reassurance (no response-time promise). */
  body: string;
  phone: { title: string; hint: string };
  whatsapp: { title: string; hint: string; action: string; greeting: string };
  /** The primary action: the approved RFQ label (CTA_STRATEGY §4) and what to send. */
  rfq: { title: string; hint: string };
  /** The hours block's title; its lines are company.ts WORKING_HOURS_TEXT. */
  hoursTitle: string;
  /** Variant B's short benefit headline (the H2 there). */
  bandTitle: string;
  /** The live «open now» line (components/home/expert-open-status.tsx); `{time}`/`{day}` are filled in. */
  status: OpenStateLabels;
  /** The live-chat button's label (W21.2: lib/content/livechat.ts; nothing while config/livechat.ts is off). */
  chat: string;
}

export const homeExpertCopy: Record<Locale, HomeExpertCopy> = {
  fa: {
    role: "کارشناس فروش آهن آسا",
    title: "با کارشناس فروش صحبت کنید",
    body: "پیش از خرید، مشخصات، مقدار و شرایط تحویل را با کارشناس فروش در میان بگذارید؛ از هر راهی که برایتان راحت‌تر است.",
    phone: { title: "تماس تلفنی", hint: "در ساعات کاری با کارشناس فروش صحبت کنید." },
    whatsapp: {
      title: "پیام در واتس‌اپ",
      hint: "سؤال یا لیست خود را در واتس‌اپ بفرستید.",
      action: "گفت‌وگو در واتس‌اپ",
      greeting: "سلام، می‌خواهم با کارشناس فروش آهن آسا صحبت کنم.",
    },
    rfq: { title: "ارسال فاکتور یا لیست خرید", hint: "فاکتور یا لیست اقلام را در فرم استعلام ثبت کنید." },
    hoursTitle: "ساعات پاسخ‌گویی",
    bandTitle: "پیش از خرید، با کارشناس فروش صحبت کنید",
    status: {
      open: "اکنون در ساعات کاری · تا ساعت {time}",
      closed: "خارج از ساعات کاری · از {day} ساعت {time}",
      today: "امروز",
      tomorrow: "فردا",
      days: { Saturday: "شنبه", Sunday: "یکشنبه", Monday: "دوشنبه", Tuesday: "سه‌شنبه", Wednesday: "چهارشنبه", Thursday: "پنجشنبه", Friday: "جمعه" },
    },
    chat: "چت با کارشناس",
  },
  en: {
    role: "Ahan Asa sales expert",
    title: "Talk to a sales expert",
    body: "Before you buy, go over specifications, quantities and delivery with a sales expert — through whichever channel suits you.",
    phone: { title: "Call us", hint: "Speak with a sales expert during business hours." },
    whatsapp: {
      title: "Message on WhatsApp",
      hint: "Send your question or material list on WhatsApp.",
      action: "Chat on WhatsApp",
      greeting: "Hello, I would like to talk to an Ahan Asa sales expert.",
    },
    rfq: { title: "Send your invoice or purchase list", hint: "Enter your invoice or material list in the request form." },
    hoursTitle: "Business hours",
    bandTitle: "Talk to a sales expert before you buy",
    status: {
      open: "Open now · until {time}",
      closed: "Closed · opens {day} {time}",
      today: "today",
      tomorrow: "tomorrow",
      days: { Saturday: "Saturday", Sunday: "Sunday", Monday: "Monday", Tuesday: "Tuesday", Wednesday: "Wednesday", Thursday: "Thursday", Friday: "Friday" },
    },
    chat: "Chat with an expert",
  },
  ar: {
    role: "خبير مبيعات آهن آسا",
    title: "تحدّث مع خبير المبيعات",
    body: "قبل الشراء، ناقش المواصفات والكميات وشروط التسليم مع خبير المبيعات، عبر القناة التي تناسبك.",
    phone: { title: "اتصل بنا", hint: "تحدّث مع خبير المبيعات خلال ساعات العمل." },
    whatsapp: {
      title: "راسلنا عبر واتساب",
      hint: "أرسل سؤالك أو قائمة المواد عبر واتساب.",
      action: "المحادثة عبر واتساب",
      greeting: "مرحبًا، أودّ التحدث مع خبير مبيعات آهن آسا.",
    },
    rfq: { title: "أرسل الفاتورة أو قائمة الشراء", hint: "سجّل الفاتورة أو قائمة المواد في نموذج الطلب." },
    hoursTitle: "ساعات العمل",
    bandTitle: "تحدّث مع خبير المبيعات قبل الشراء",
    status: {
      open: "مفتوح الآن · حتى {time}",
      closed: "مغلق · يفتح {day} {time}",
      today: "اليوم",
      tomorrow: "غدًا",
      days: { Saturday: "السبت", Sunday: "الأحد", Monday: "الاثنين", Tuesday: "الثلاثاء", Wednesday: "الأربعاء", Thursday: "الخميس", Friday: "الجمعة" },
    },
    chat: "الدردشة مع خبير",
  },
};

/** wa.me link with the section's prefilled greeting in the page's language, or null without a valid number (then the card is not rendered). */
export function homeExpertWhatsAppHref(locale: Locale, number: string | null = WHATSAPP_BUSINESS_NUMBER): string | null {
  if (!isValidWhatsAppNumber(number)) return null;
  return `https://wa.me/${number}?text=${encodeURIComponent(homeExpertCopy[locale].whatsapp.greeting)}`;
}

/**
 * Variant B's three proof points — approved homepage copy only, never a new claim: a real specialist stays with the
 * request and one coordinated path for diverse items (Buyer Value promises 1–2), and the Hero's non-commitment line.
 */
export function homeExpertProofs(locale: Locale): string[] {
  const home = homepageCopy[locale];
  return [home.buyerValue.promises[0].title, home.buyerValue.promises[1].title, home.hero.reassurance];
}

/** The RFQ form on /contact, at its attachments heading. */
export function homeExpertListHref(locale: Locale): string {
  return `${localizedPath(locale, "/contact")}#${RFQ_FILES_ANCHOR}`;
}

/** The real expert's avatar for this locale, or null without a configured photo and first name (no placeholder person). */
export function homeExpertProfile(locale: Locale, profile: SalesExpertProfile | null = SALES_EXPERT): { src: string; width: number; height: number; name: string; role: string } | null {
  const name = profile?.firstName[locale]?.trim();
  if (!profile || !name || !profile.photo.src.trim() || !(profile.photo.width > 0 && profile.photo.height > 0)) return null;
  return { ...profile.photo, name, role: homeExpertCopy[locale].role };
}
