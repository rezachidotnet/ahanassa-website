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

/**
 * A group logo (W17.1): `/brand/group/<id>.webp` with a `.png` fallback, trimmed and at most 400×160, made from
 * the owner's files (~/claude-reports/ahanassa/group-logos/, 2026-10-14; all raster, so no SVG). width/height are
 * the files' own, so the box is reserved before load.
 */
export interface GroupLogo {
  webp: string;
  png: string;
  width: number;
  height: number;
}

const groupLogo = (id: string, width: number, height: number): GroupLogo => ({ webp: `/brand/group/${id}.webp`, png: `/brand/group/${id}.png`, width, height });

/**
 * The group's companies, in the owner's order, with the solar year each started. `url` null = this site (no link).
 * `logo` null = no logo supplied. AiSanat's logo is the «فناساخت» mark in aisanat.jpg (owner decision, W17.5, 2026-10-14).
 */
export const GROUP_COMPANIES: ReadonlyArray<{ id: string; url: string | null; domain: string; sinceSolar: number; name: Record<Locale, string>; field: Record<Locale, string>; logo: GroupLogo | null }> = [
  { id: "fazasazeh", url: "https://fazasazeh.ir", domain: "fazasazeh.ir", sinceSolar: 1376, name: { fa: "فضاسازه نقش جهان", en: "Fazasazeh Naghsh-e Jahan", ar: "فضاسازه نقش جهان" }, field: { fa: "طراحی و اجرای سازه‌های فلزی", en: "Design and erection of steel structures", ar: "تصميم الهياكل المعدنية وتنفيذها" }, logo: groupLogo("fazasazeh", 191, 160) },
  { id: "sipanel", url: "https://www.sipanelco.com", domain: "sipanelco.com", sinceSolar: 1394, name: { fa: "سی‌پانل", en: "SiPanel", ar: "سي بانل" }, field: { fa: "پوشش سالن‌های صنعتی", en: "Cladding of industrial halls", ar: "تغطية الصالات الصناعية" }, logo: groupLogo("sipanel", 400, 77) },
  { id: "avizsazeh", url: "https://www.avizsazeh.com", domain: "avizsazeh.com", sinceSolar: 1400, name: { fa: "آویز سازه", en: "Aviz Sazeh", ar: "آويز سازه" }, field: { fa: "سقف کاذب سالن‌ها", en: "Suspended ceilings for halls", ar: "الأسقف المعلقة للصالات" }, logo: groupLogo("avizsazeh", 319, 160) },
  { id: "ahanassa", url: null, domain: "ahanassa.com", sinceSolar: 1403, name: { fa: "آهن آسا", en: "Ahan Asa", ar: "آهن آسا" }, field: { fa: "تأمین فولاد ساختمان و صنعت", en: "Steel supply for construction and industry", ar: "توريد الحديد للبناء والصناعة" }, logo: groupLogo("ahanassa", 149, 160) },
  { id: "aisanat", url: "https://aisanat.ir", domain: "aisanat.ir", sinceSolar: 1405, name: { fa: "آی‌صنعت", en: "AiSanat", ar: "آي صنعت" }, field: { fa: "خدمات فناوری اطلاعات ویژهٔ این صنعت", en: "IT services for this industry", ar: "خدمات تقنية المعلومات لهذا القطاع" }, logo: groupLogo("aisanat", 400, 128) },
];

/** A group company by id (throws on an unknown id, so a renamed entry fails the build, not the page). */
export function groupCompany(id: string): (typeof GROUP_COMPANIES)[number] {
  const company = GROUP_COMPANIES.find((c) => c.id === id);
  if (!company) throw new Error(`unknown group company: ${id}`);
  return company;
}

/** The anchor of the group section on /about (app/[locale]/about/page.tsx). */
export const ABOUT_GROUP_ANCHOR = "group";

/**
 * W16.6 — the one group line in the site footer: «آهن آسا، عضو گروه <فضاسازه نقش جهان>», where the group name
 * links to PARENT_ORGANIZATION.url, then «شرکت‌های گروه» linking to /about#group. The other group sites are linked
 * only from /about and from the contextual box below, never site-wide.
 */
export const GROUP_FOOTER_COPY: Record<Locale, { before: string; after: string; companies: string }> = {
  fa: { before: "آهن آسا، عضو گروه ", after: "", companies: "شرکت‌های گروه" },
  en: { before: "Ahan Asa, a member of the ", after: " group", companies: "Group companies" },
  ar: { before: "آهن آسا، عضو في مجموعة ", after: "", companies: "شركات المجموعة" },
};

/**
 * W16.6 — «خدمات مکمل گروه»: SiPanel (industrial hall / shed cladding) and Aviz Sazeh (hall suspended ceilings),
 * shown only on the pages of products those services go with: beams (IPE/INP), hollow sections and profiles
 * (box), and coated sheet (galvanized, PPGI / pre-painted) once the catalog has it. `{sipanel}` and `{avizsazeh}`
 * mark where each brand-name link goes.
 */
export const GROUP_SERVICES_COPY: Record<Locale, { title: string; text: string }> = {
  fa: {
    title: "خدمات مکمل گروه",
    text: "برای پوشش سالن‌های صنعتی و سوله، {sipanel} و برای سقف کاذب سالن‌ها، {avizsazeh} از شرکت‌های گروه فضاسازه نقش جهان هستند.",
  },
  en: {
    title: "Complementary services from the group",
    text: "For cladding industrial halls and sheds, see {sipanel}; for suspended ceilings in halls, see {avizsazeh}. Both are companies of the Fazasazeh Naghsh-e Jahan group.",
  },
  ar: {
    title: "خدمات مكمّلة من المجموعة",
    text: "لتغطية الصالات الصناعية والهناجر: {sipanel}، وللأسقف المعلقة للصالات: {avizsazeh}، وكلتاهما من شركات مجموعة فضاسازه نقش جهان.",
  },
};

/** Catalog codes the box goes with (snapshot: category BEAM ⇢ group BEAMS, forms IPE/INP; BOX_SECTION ⇢ RHS/SHS). */
const GROUP_SERVICES_CODES = new Set(["BEAM", "BEAMS", "IPE", "INP", "BOX_SECTION", "RHS", "SHS", "HOLLOW_SECTIONS_PROFILES"]);
/** Coated sheet is not in the catalog yet; matched by code or name when it arrives. */
const COATED_SHEET_PATTERN = /GALVAN|PPGI|PRE_?PAINT|COLOU?R_?COAT|گالوانیزه|رنگی/i;

/** True when any of the page's catalog codes or names (category, family, group, form) is one the box goes with. */
export function showGroupServices(codesOrNames: ReadonlyArray<string | null | undefined>): boolean {
  return codesOrNames.some((v) => typeof v === "string" && v.length > 0 && (GROUP_SERVICES_CODES.has(v) || COATED_SHEET_PATTERN.test(v)));
}

/** «از ۱۳۹۴» /"since 1394 SH (2015–16)" / «منذ 1394 هـ.ش (2015–2016)». Gregorian span = the solar year's two years. */
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

/** Offices (D-COMPANY-INFO): Isfahan head office, Tehran coordination office (no separate phone); read by /about, /contact and the footer. Addresses use Latin digits in every locale, like the phone (owner, 2026-10-13). */
export const OFFICES: Record<Locale, { head: { label: string; address: string }; tehran: { label: string; address: string } }> = {
  fa: {
    head: { label: "دفتر مرکزی", address: "اصفهان، خیابان هزارجریب، کوی آزادگان، پلاک 6" },
    tehran: { label: "دفتر هماهنگی تهران", address: "تهران، خیابان ستارخان، پلاک 660، کد پستی 1454954166" },
  },
  en: {
    head: { label: "Head office", address: "Hezar Jarib Street, Kooy Azadegan, No. 6, Isfahan, Iran" },
    tehran: { label: "Tehran coordination office", address: "Sattarkhan Street, No. 660, Tehran, Iran — postal code 1454954166" },
  },
  ar: {
    head: { label: "المكتب الرئيسي", address: "شارع هزار جريب، حي آزادگان، رقم 6، أصفهان، إيران" },
    tehran: { label: "مكتب التنسيق في طهران", address: "شارع ستارخان، رقم 660، طهران، إيران — الرمز البريدي 1454954166" },
  },
};

/** W17.1 — the /about group logo cards: the logo's alt text and the hidden note on a link that opens a new tab. */
export const GROUP_CARD_COPY: Record<Locale, { logoAlt: (name: string) => string; newTab: string }> = {
  fa: { logoAlt: (name) => `لوگوی ${name}`, newTab: "(در زبانهٔ جدید باز می‌شود)" },
  en: { logoAlt: (name) => `${name} logo`, newTab: "(opens in a new tab)" },
  ar: { logoAlt: (name) => `شعار ${name}`, newTab: "(يُفتح في علامة تبويب جديدة)" },
};
