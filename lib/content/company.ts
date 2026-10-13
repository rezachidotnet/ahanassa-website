import type { Locale } from "../../config/locales.ts";
import { CONTACT_PHONE_E164 } from "./contact-channels.ts";

/**
 * Company facts shared by /about and /contact (W16.3, owner-approved About text 2026-10-13; D-COMPANY-INFO).
 * Only what the owner supplied — never extend this file with a fact the owner has not given.
 *
 * Structured values (opening hours, parent organization) are written so that the JSON-LD of PR #47 can read
 * them as they are; this PR adds no JSON-LD.
 */

/**
 * Parent group (owner, 2026-10-13): «فضاسازه نقش جهان», https://fazasazeh.ir, founded 1376 SH (1997) in
 * steel-structure design and erection. For PR #47's JSON-LD: parentOrganization { name, url, foundingDate: "1997" }.
 */
export const PARENT_ORGANIZATION = {
  name: { fa: "فضاسازه نقش جهان", en: "Fazasazeh Naghsh-e Jahan", ar: "فضاسازه نقش جهان" } satisfies Record<Locale, string>,
  url: "https://fazasazeh.ir",
  foundingYearSolar: 1376,
  foundingDate: "1997",
} as const;

/** The group's companies, in the owner's order, with the solar year each started. `url` null = this site (no link). */
export const GROUP_COMPANIES: ReadonlyArray<{ id: string; url: string | null; domain: string; sinceSolar: number; name: Record<Locale, string>; field: Record<Locale, string> }> = [
  { id: "fazasazeh", url: "https://fazasazeh.ir", domain: "fazasazeh.ir", sinceSolar: 1376, name: { fa: "فضاسازه نقش جهان", en: "Fazasazeh Naghsh-e Jahan", ar: "فضاسازه نقش جهان" }, field: { fa: "طراحی و اجرای سازه‌های فلزی", en: "Design and erection of steel structures", ar: "تصميم الهياكل المعدنية وتنفيذها" } },
  { id: "sipanel", url: "https://sipanelco.com", domain: "sipanelco.com", sinceSolar: 1394, name: { fa: "سی‌پانل", en: "SiPanel", ar: "سي بانل" }, field: { fa: "پوشش سالن‌های صنعتی", en: "Cladding of industrial halls", ar: "تغطية الصالات الصناعية" } },
  { id: "avizsazeh", url: "https://avizsazeh.com", domain: "avizsazeh.com", sinceSolar: 1400, name: { fa: "آویز سازه", en: "Aviz Sazeh", ar: "آويز سازه" }, field: { fa: "سقف کاذب سالن‌ها", en: "Suspended ceilings for halls", ar: "الأسقف المعلقة للصالات" } },
  { id: "ahanassa", url: null, domain: "ahanassa.com", sinceSolar: 1403, name: { fa: "آهن آسا", en: "Ahan Asa", ar: "آهن آسا" }, field: { fa: "تأمین فولاد ساختمان و صنعت", en: "Steel supply for construction and industry", ar: "توريد الحديد للبناء والصناعة" } },
  { id: "aisanat", url: "https://aisanat.ir", domain: "aisanat.ir", sinceSolar: 1405, name: { fa: "آی‌صنعت", en: "AiSanat", ar: "آي صنعت" }, field: { fa: "خدمات فناوری اطلاعات ویژهٔ این صنعت", en: "IT services for this industry", ar: "خدمات تقنية المعلومات لهذا القطاع" } },
];

/** «از ۱۳۹۴» / "since 1394 SH (2015–16)" / «منذ 1394 هـ.ش (2015–2016)». Gregorian span = the solar year's two years. */
export function sinceLabel(locale: Locale, solar: number): string {
  if (locale === "fa") return `از ${solar.toLocaleString("fa-IR", { useGrouping: false })}`;
  const g = solar + 621;
  return locale === "en" ? `since ${solar} SH (${g}–${String(g + 1).slice(2)})` : `منذ ${solar} هـ.ش (${g}–${g + 1})`;
}

/**
 * Working hours (owner, 2026-10-13): Saturday–Wednesday 08:00–17:00, Thursday 08:00–12:00, Iran time. The
 * structured form is schema.org's OpeningHoursSpecification shape (dayOfWeek / opens / closes).
 */
export const WORKING_HOURS = [
  { dayOfWeek: ["Saturday", "Sunday", "Monday", "Tuesday", "Wednesday"], opens: "08:00", closes: "17:00" },
  { dayOfWeek: ["Thursday"], opens: "08:00", closes: "12:00" },
] as const;

export const WORKING_HOURS_TEXT: Record<Locale, { label: string; lines: string[] }> = {
  fa: { label: "ساعات پاسخ‌گویی", lines: ["شنبه تا چهارشنبه ۸ تا ۱۷", "پنجشنبه ۸ تا ۱۲"] },
  en: { label: "Business hours", lines: ["Saturday to Wednesday, 8:00–17:00", "Thursday, 8:00–12:00 (Iran time)"] },
  ar: { label: "ساعات العمل", lines: ["من السبت إلى الأربعاء، 8:00–17:00", "الخميس، 8:00–12:00 (بتوقيت إيران)"] },
};

/** The company phone as shown to visitors: «031-35134», from the one stored number (both its local and +98 forms). */
export function companyPhoneDisplay(stored: string = CONTACT_PHONE_E164): string {
  const digits = stored.replace(/\D/g, "").replace(/^98/, "");
  const local = digits.startsWith("0") ? digits : `0${digits}`;
  return `${local.slice(0, 3)}-${local.slice(3)}`;
}

/** Offices (D-COMPANY-INFO): Isfahan head office, Tehran office (no separate phone). */
export const OFFICES: Record<Locale, { head: { label: string; address: string }; tehran: { label: string; address: string } }> = {
  fa: {
    head: { label: "دفتر مرکزی", address: "اصفهان، خیابان هزارجریب، کوی آزادگان، پلاک ۶" },
    tehran: { label: "دفتر تهران", address: "تهران، خیابان ستارخان، پلاک ۶۶۰، کد پستی ۱۴۵۴۹۵۴۱۶۶" },
  },
  en: {
    head: { label: "Head office", address: "Hezar Jarib Street, Kooy Azadegan, No. 6, Isfahan, Iran" },
    tehran: { label: "Tehran office", address: "Sattarkhan Street, No. 660, Tehran, Iran — postal code 1454954166" },
  },
  ar: {
    head: { label: "المكتب الرئيسي", address: "شارع هزار جريب، حي آزادگان، رقم 6، أصفهان، إيران" },
    tehran: { label: "مكتب طهران", address: "شارع ستارخان، رقم 660، طهران، إيران — الرمز البريدي 1454954166" },
  },
};
