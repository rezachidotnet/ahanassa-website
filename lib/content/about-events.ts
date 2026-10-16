import type { Locale } from "../../config/locales.ts";

/**
 * W20.2 (owner, 2026-10-16) — /about «رویدادها», the group statement and the newest «مسیر ما» milestone.
 * Only the facts the owner gave: the 29th Isfahan Building Industry Exhibition (Isfahan Buildexpo 1405),
 * 7–10 Mehr 1405 = 29 Sep–2 Oct 2026, Isfahan International Exhibition Center, with Ahan Asa's stand there
 * (the owner's closing-ceremony photo and farewell video). No award, visitor or deal figure is stated — none was given.
 */

/** The exhibition, as the Event JSON-LD and the page state it. Dates are the poster's (Iran time, +03:30). */
export const EXPO_1405 = {
  id: "expo-1405",
  startDate: "2026-09-29",
  endDate: "2026-10-02",
  /** Solar Hijri year. */
  yearSolar: 1405,
  name: {
    fa: "بیست‌ونهمین نمایشگاه تخصصی صنعت ساختمان اصفهان",
    en: "29th Isfahan Building Industry Exhibition (Isfahan Buildexpo 1405)",
    ar: "المعرض التخصصي التاسع والعشرون لصناعة البناء في أصفهان",
  } satisfies Record<Locale, string>,
  dates: {
    fa: "۷ تا ۱۰ مهر ۱۴۰۵",
    en: "29 September – 2 October 2026 (7–10 Mehr 1405 SH)",
    ar: "29 سبتمبر – 2 أكتوبر 2026 (7–10 مهر 1405 هـ.ش)",
  } satisfies Record<Locale, string>,
  venue: {
    fa: "شهر نمایشگاهی اصفهان (مرکز نمایشگاه‌های بین‌المللی اصفهان)",
    en: "Isfahan International Exhibition Center",
    ar: "مركز أصفهان الدولي للمعارض",
  } satisfies Record<Locale, string>,
  locality: { fa: "اصفهان", en: "Isfahan", ar: "أصفهان" } satisfies Record<Locale, string>,
} as const;

/** The three media files: identity paths of the image pipeline (lib/media/image-sources.ts) and the video. */
export const EXPO_1405_MEDIA = {
  poster: { src: "/images/about/expo-1405-poster.jpg", width: 884, height: 1280 },
  closing: { src: "/images/about/expo-1405-closing.jpg", width: 1080, height: 810 },
  /**
   * H.264 High 720×1280, AAC, faststart, ≈5 MB (Workers asset limit 25 MiB; W20.2 target ≤ 8 MB). Burned-in Persian
   * subtitles, no caption track. Workers Static Assets answer a Range request with the whole file (200, no 206;
   * checked on the live edge 2026-10-16), and Safari will not play a progressive MP4 without byte ranges, so the
   * same streams are also packaged as HLS (fMP4 segments, `ffmpeg -c copy`, no re-encode) — plain GETs Safari
   * plays natively. The <video> lists HLS first and the MP4 second; a browser without HLS takes the MP4.
   */
  video: { src: "/media/about/expo-1405-farewell.mp4", type: "video/mp4", hls: "/media/about/expo-1405-farewell/index.m3u8", hlsType: "application/vnd.apple.mpegurl", width: 720, height: 1280, posterFrame: "/images/about/expo-1405-farewell-frame.jpg" },
} as const;

export interface AboutEventsCopy {
  title: string;
  lead: string;
  datesLabel: string;
  venueLabel: string;
  posterAlt: string;
  posterCaption: string;
  closingAlt: string;
  closingCaption: string;
  videoTitle: string;
  videoCaption: string;
  /** Shown inside <video> by a browser that cannot play it. */
  videoFallback: string;
  /** Event JSON-LD description. */
  description: string;
}

export const ABOUT_EVENTS_COPY: Record<Locale, AboutEventsCopy> = {
  fa: {
    title: "رویدادها",
    lead: "در این نمایشگاه، آهن آسا با غرفهٔ خود حضور داشت.",
    datesLabel: "تاریخ",
    venueLabel: "محل برگزاری",
    posterAlt: "پوستر بیست‌ونهمین نمایشگاه تخصصی صنعت ساختمان اصفهان، ۷ تا ۱۰ مهر ۱۴۰۵، شهر نمایشگاهی اصفهان",
    posterCaption: "پوستر نمایشگاه",
    closingAlt: "عکس گروهی در غرفهٔ آهن آسا در مراسم اختتامیهٔ نمایشگاه صنعت ساختمان اصفهان ۱۴۰۵",
    closingCaption: "مراسم اختتامیه، غرفهٔ آهن آسا",
    videoTitle: "ویدئوی خداحافظی نمایشگاه",
    videoCaption: "ویدئوی خداحافظی از نمایشگاه (حدود ۳۰ ثانیه)",
    videoFallback: "مرورگر شما پخش این ویدئو را پشتیبانی نمی‌کند.",
    description: "حضور آهن آسا با غرفهٔ خود در بیست‌ونهمین نمایشگاه تخصصی صنعت ساختمان اصفهان.",
  },
  en: {
    title: "Events",
    lead: "Ahan Asa took part with its own stand in the 29th Isfahan Building Industry Exhibition.",
    datesLabel: "Dates",
    venueLabel: "Venue",
    posterAlt: "Poster of the 29th Isfahan Building Industry Exhibition, 29 September to 2 October 2026, Isfahan International Exhibition Center",
    posterCaption: "Exhibition poster",
    closingAlt: "Group photo at the Ahan Asa stand at the closing ceremony of Isfahan Buildexpo 1405",
    closingCaption: "Closing ceremony, Ahan Asa stand",
    videoTitle: "Farewell video from the exhibition",
    videoCaption: "Farewell video from the exhibition (about 30 seconds, Persian)",
    videoFallback: "Your browser cannot play this video.",
    description: "Ahan Asa took part with its own stand in the 29th Isfahan Building Industry Exhibition.",
  },
  ar: {
    title: "الفعاليات",
    lead: "شاركت آهن آسا بجناحها في المعرض التخصصي التاسع والعشرين لصناعة البناء في أصفهان.",
    datesLabel: "التاريخ",
    venueLabel: "المكان",
    posterAlt: "ملصق المعرض التخصصي التاسع والعشرين لصناعة البناء في أصفهان، من 29 سبتمبر إلى 2 أكتوبر 2026، مركز أصفهان الدولي للمعارض",
    posterCaption: "ملصق المعرض",
    closingAlt: "صورة جماعية في جناح آهن آسا خلال الحفل الختامي لمعرض صناعة البناء في أصفهان 2026",
    closingCaption: "الحفل الختامي، جناح آهن آسا",
    videoTitle: "فيديو الوداع من المعرض",
    videoCaption: "فيديو الوداع من المعرض (نحو 30 ثانية، بالفارسية)",
    videoFallback: "متصفحك لا يدعم تشغيل هذا الفيديو.",
    description: "شاركت آهن آسا بجناحها في المعرض التخصصي التاسع والعشرين لصناعة البناء في أصفهان.",
  },
};

/** The anchor of the events section, which the last «مسیر ما» milestone links to. */
export const ABOUT_EVENTS_ANCHOR = "events";

/** «مسیر ما»: the exhibition as the latest milestone, after the seven owner-approved ones of lib/content/about.ts. */
export const EXPO_MILESTONE: Record<Locale, { year: string; event: string }> = {
  fa: { year: "مهر ۱۴۰۵", event: "حضور در بیست‌ونهمین نمایشگاه تخصصی صنعت ساختمان اصفهان" },
  en: { year: "Mehr 1405 SH (Sep–Oct 2026)", event: "Ahan Asa takes part in the 29th Isfahan Building Industry Exhibition" },
  ar: { year: "مهر 1405 هـ.ش (سبتمبر–أكتوبر 2026)", event: "مشاركة آهن آسا في المعرض التخصصي التاسع والعشرين لصناعة البناء في أصفهان" },
};

/**
 * «گروه ما»: one strong group line and two facts, all derived from lib/content/company.ts (GROUP_COMPANIES):
 * the number of companies and the year the group began. The line restates the existing approved intro
 * («زنجیرهٔ کاملی از خدمات صنعت ساخت») — no new claim.
 */
export const GROUP_STATEMENT_COPY: Record<Locale, { statement: string; companies: (n: number) => string; since: (solar: number) => string; parentBadge: string; currentBadge: string }> = {
  fa: {
    statement: "یک گروه، زنجیرهٔ کامل خدمات صنعت ساخت",
    companies: (n) => `${n.toLocaleString("fa-IR")} شرکت`,
    since: (solar) => `فعال از ${solar.toLocaleString("fa-IR", { useGrouping: false })}`,
    parentBadge: "شرکت مادر",
    currentBadge: "همین سایت",
  },
  en: {
    statement: "One group, a complete chain of construction-industry services",
    companies: (n) => `${n} companies`,
    since: (solar) => `Active since ${solar} SH (${solar + 621})`,
    parentBadge: "Parent company",
    currentBadge: "This site",
  },
  ar: {
    statement: "مجموعة واحدة، سلسلة متكاملة من خدمات قطاع البناء",
    companies: (n) => `${n} شركات`,
    since: (solar) => `تعمل منذ ${solar} هـ.ش (${solar + 621})`,
    parentBadge: "الشركة الأم",
    currentBadge: "هذا الموقع",
  },
};
