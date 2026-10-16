import type { Locale } from "../../config/locales.ts";

/**
 * Drawings / files channel = WhatsApp (owner decision 2026-10-04, architecture
 * §19 item 5, docs/OWNER_DECISIONS.md). There is no upload on the website.
 *
 * WHATSAPP_BUSINESS_NUMBER is the build-time config value: the business number
 * in international format, digits only (country code first, no "+", no
 * spaces), e.g. "98xxxxxxxxxx". It is the same for both build targets (r4).
 * While it is null — or not a valid number — the link is NOT rendered
 * anywhere: never a placeholder. A plain wa.me link: no third-party script,
 * no tracking parameter, rel="noopener noreferrer".
 *
 * Owner-provided business number, 2026-10-05 (W8.1).
 */
export const WHATSAPP_BUSINESS_NUMBER: string | null = "989134222795";

/** International format, digits only: 8–15 digits, no leading 0 (E.164 without "+"). */
export function isValidWhatsAppNumber(value: string | null | undefined): value is string {
  return typeof value === "string" && /^[1-9]\d{7,14}$/.test(value);
}

export const WHATSAPP_REL = "noopener noreferrer";

const copy: Record<Locale, { label: string; hint: string; general: string; withReference: (reference: string) => string }> = {
  fa: {
    label: "ارسال نقشه از طریق واتس‌اپ",
    hint: "نقشه، لیست خرید یا فایل‌ها را در واتس‌اپ بفرستید؛ در وب‌سایت فایل بارگذاری نمی‌شود.",
    general: "سلام. می‌خواهم نقشه یا لیست خرید را برای آهن آسا بفرستم.",
    withReference: (reference) => `سلام. نقشه و فایل‌های درخواست ${reference} را می‌فرستم.`,
  },
  en: {
    label: "Send drawings via WhatsApp",
    hint: "Send drawings, material lists or files on WhatsApp; the website does not take uploads.",
    general: "Hello. I would like to send drawings or a material list to Ahan Asa.",
    withReference: (reference) => `Hello. I am sending the drawings and files for request ${reference}.`,
  },
  ar: {
    label: "إرسال المخططات عبر واتساب",
    hint: "أرسل المخططات أو قوائم المواد أو الملفات عبر واتساب؛ لا يقبل الموقع رفع الملفات.",
    general: "مرحبًا. أود إرسال مخططات أو قائمة مواد إلى آهن آسا.",
    withReference: (reference) => `مرحبًا. أرسل المخططات والملفات الخاصة بالطلب ${reference}.`,
  },
};

/**
 * W20.1 (owner instruction 2026-10-16) — the floating WhatsApp button, en and ar pages only (fa already has its
 * contact paths): its accessible name and the short prefilled greeting in the page's language.
 */
export const STICKY_WHATSAPP_LOCALES = ["en", "ar"] as const satisfies readonly Locale[];

const stickyCopy: Record<(typeof STICKY_WHATSAPP_LOCALES)[number], { label: string; greeting: string }> = {
  en: { label: "Chat with Ahan Asa on WhatsApp", greeting: "Hello Ahan Asa, I have a question about steel supply." },
  ar: { label: "تواصل مع آهن آسا عبر واتساب", greeting: "مرحبًا آهن آسا، لديّ استفسار عن توريد الحديد." },
};

export function hasStickyWhatsApp(locale: Locale): locale is (typeof STICKY_WHATSAPP_LOCALES)[number] {
  return (STICKY_WHATSAPP_LOCALES as readonly Locale[]).includes(locale);
}

/** The floating button's link and label, or null on fa or without a valid number (then nothing is rendered). */
export function stickyWhatsApp(locale: Locale, number: string | null = WHATSAPP_BUSINESS_NUMBER): { href: string; label: string } | null {
  if (!hasStickyWhatsApp(locale) || !isValidWhatsAppNumber(number)) return null;
  const { label, greeting } = stickyCopy[locale];
  return { href: `https://wa.me/${number}?text=${encodeURIComponent(greeting)}`, label };
}

export function whatsappCopy(locale: Locale) {
  return copy[locale];
}

/** The prefilled message: with the RFQ tracking number (AA-RFQ-…) when there is one. */
export function whatsappMessage(locale: Locale, reference?: string | null): string {
  return reference ? copy[locale].withReference(reference) : copy[locale].general;
}

/** https://wa.me/<number>?text=<prefilled>, or null when no valid number is configured (then nothing is rendered). */
export function whatsappDrawingsHref(locale: Locale, reference?: string | null, number: string | null = WHATSAPP_BUSINESS_NUMBER): string | null {
  if (!isValidWhatsAppNumber(number)) return null;
  return `https://wa.me/${number}?text=${encodeURIComponent(whatsappMessage(locale, reference))}`;
}
