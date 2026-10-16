import { localizedPath, type Locale } from "../../config/locales.ts";
import { isValidWhatsAppNumber, WHATSAPP_BUSINESS_NUMBER } from "./whatsapp.ts";

/**
 * W20.3 (owner instruction 2026-10-16) — the homepage «با کارشناس فروش صحبت کنید» section
 * (components/home/expert-contact.tsx), between the content sections and the Final CTA.
 *
 * B2B buyers want to reach a real person before they buy, with low friction and a choice of channel, so the
 * section offers equal options — phone, WhatsApp, the RFQ form, and the working hours — and nothing else.
 * Facts come from their single sources: the phone (contact-channels.ts), the WhatsApp number (whatsapp.ts) and
 * the hours (company.ts). The person is a ROLE («کارشناس فروش آهن آسا»): no name, photo or testimonial. No
 * response-time promise: none is owner-confirmed, so the reassurance line says only what is true.
 */

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
  list: { title: string; hint: string; action: string };
  /** The hours card's title; its lines are company.ts WORKING_HOURS_TEXT. */
  hoursTitle: string;
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
    list: { title: "ارسال لیست خرید", hint: "فاکتور یا لیست اقلام را در فرم استعلام ثبت کنید.", action: "رفتن به فرم استعلام" },
    hoursTitle: "ساعات پاسخ‌گویی",
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
    list: { title: "Send your purchase list", hint: "Enter your invoice or material list in the request form.", action: "Go to the request form" },
    hoursTitle: "Business hours",
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
    list: { title: "أرسل قائمة الشراء", hint: "سجّل الفاتورة أو قائمة المواد في نموذج الطلب.", action: "الانتقال إلى نموذج الطلب" },
    hoursTitle: "ساعات العمل",
  },
};

/** wa.me link with the section's prefilled greeting in the page's language, or null without a valid number (then the card is not rendered). */
export function homeExpertWhatsAppHref(locale: Locale, number: string | null = WHATSAPP_BUSINESS_NUMBER): string | null {
  if (!isValidWhatsAppNumber(number)) return null;
  return `https://wa.me/${number}?text=${encodeURIComponent(homeExpertCopy[locale].whatsapp.greeting)}`;
}

/** The RFQ form on /contact, at its attachments heading. */
export function homeExpertListHref(locale: Locale): string {
  return `${localizedPath(locale, "/contact")}#${RFQ_FILES_ANCHOR}`;
}
