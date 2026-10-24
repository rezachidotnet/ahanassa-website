/**
 * W41 — the daily Bale story (lib/bale-story/): the ONE owner-editable list of what the story shows, in rotation.
 * The Bale Bot API has no story method, so a run sends the ready 1080×1920 image to the owner's private Bale chat
 * and the owner adds it to the story by hand (STORY_MODE=owner+channel also posts it on the channel).
 *
 * Owner rules (W41 brief + addendum, 2026-10-24):
 * - fa only; NO price (raw materials and these grades are price-on-request), no stock, availability, discount or
 *   statistics claim — lib/bale-story/compose.ts gates every text, and the price-source name list too;
 * - 2–3 technical facts per item, each with its `source`: our own site page (lib/content/raw-materials.ts), the
 *   catalog extract (lib/downloads/raw-materials-data.ts, the Odoo catalog's public fields), or a cited standard /
 *   manufacturer datasheet (alloy grades: the W39 study's grade reference, ~/claude-reports/ahanassa/W39_ALLOY_STUDY.md
 *   §3.1/§10). Never a fact without one;
 * - an item with fewer than 2 facts is "needs facts" and stays out of the rotation until filled;
 * - `page`: the matching site page (fa, unprefixed), or null → the request form. Never a page that does not exist
 *   (a test checks every path against the site's routes);
 * - `id` is the utm_campaign: keep it stable once used.
 *
 * Rotation (lib/bale-story/rotation.ts): one item per Iranian working day (Sat–Thu, config/iran-holidays.ts
 * skipped), counted from `rotationStart`. `order: "mixed"` spreads the groups evenly (within a group, the list
 * order below) so no group shows more than `maxGroupRun` days in a row; `order: "as-listed"` uses this list exactly.
 * To reorder, move items; to pause one, set `enabled: false`.
 */
export type StoryGroup = "raw-material" | "alloy-steel";

export type FactSource =
  /** A page of this site whose copy states the fact. */
  | { kind: "site"; path: string }
  /** Raw-material templates of the catalog extract (their `key`s). */
  | { kind: "catalog"; keys: readonly string[] }
  /** A standard or a manufacturer/distributor datasheet, as cited. */
  | { kind: "standard"; ref: string };

export interface StoryFact {
  text: string;
  source: FactSource;
}

export interface StoryItem {
  /** Stable id = utm_campaign. */
  id: string;
  group: StoryGroup;
  enabled: boolean;
  /** The story title. */
  name: string;
  /** A Latin designation line under the title (W.Nr · EN name · AISI equivalent); null for none. */
  designation: string | null;
  /** 2–3 facts; empty = needs facts (left out of the rotation). */
  facts: readonly StoryFact[];
  /** The site page the QR and the link open (fa, unprefixed), or null → the request form. */
  page: string | null;
  /** A short reference line printed under the facts (the standard), or null. */
  reference: string | null;
  /** Why the item has no facts yet / what it needs (owner note; never shown). */
  todo?: string;
}

export const STORY_GROUPS: Record<StoryGroup, { label: string; tagline: string }> = {
  "raw-material": { label: "مواد اولیه فولاد", tagline: "تأمین مطمئن مواد اولیه — استعلام قیمت" },
  "alloy-steel": { label: "فولاد آلیاژی و ابزار", tagline: "تأمین مطمئن فولاد آلیاژی و ابزار — استعلام قیمت" },
};

const site = (path: string): FactSource => ({ kind: "site", path });
const catalog = (...keys: string[]): FactSource => ({ kind: "catalog", keys });
const std = (ref: string): FactSource => ({ kind: "standard", ref });

const NEEDS_FACTS_RAW = "not in our catalog or site pages yet: add 2–3 facts from a cited standard or supplier sheet, or a site page first";
const NEEDS_FACTS_ALLOY = "no single grade or cited sheet in W39 for this query: pick the grade (e.g. 1.7225 / 42CrMo4) and cite its standard";

export const STORY_ITEMS: readonly StoryItem[] = [
  // Raw materials (the owner's default list, then the addendum's additions).
  {
    id: "steel-ingot",
    group: "raw-material",
    enabled: true,
    name: "شمش فولاد",
    designation: null,
    facts: [
      { text: "محصول نیمه‌تمام ریخته‌گری پیوسته با مقطع چهارگوش؛ خوراک نورد میلگرد، نبشی، ناودانی و مقاطع سبک", source: site("/raw-materials/billet") },
      { text: "گریدهای رایج 3SP و 5SP طبق استاندارد GOST 380", source: site("/raw-materials/billet") },
      { text: "گرید 5SP کربن بیشتری دارد و معمولاً برای نورد میلگرد با استحکام بالاتر به کار می‌رود", source: site("/raw-materials/billet") },
    ],
    page: "/raw-materials/billet",
    reference: "GOST 380",
  },
  {
    id: "billet-bloom",
    group: "raw-material",
    enabled: true,
    name: "بیلت و بلوم",
    designation: "3SP · 5SP · GOST 380",
    facts: [
      { text: "بیلت: مقطع چهارگوش ۱۰۰، ۱۲۵ یا ۱۵۰ میلی‌متر، طول ۶ یا ۱۲ متر، گرید 3SP یا 5SP", source: catalog("billet_3sp", "billet_5sp") },
      { text: "بلوم: مقطع چهارگوش ۲۰۰ یا ۲۵۰ میلی‌متر، طول سفارشی، گرید 5SP", source: catalog("bloom_5sp") },
      { text: "هر دو از ریخته‌گری پیوسته؛ سایزهای ۱۲۰ و ۱۳۰ میلی‌متر و گریدهای آلیاژی با استعلام", source: catalog("billet_3sp", "bloom_5sp") },
    ],
    page: "/raw-materials/billet",
    reference: null,
  },
  { id: "slab", group: "raw-material", enabled: true, name: "اسلب", designation: null, facts: [], page: null, reference: null, todo: NEEDS_FACTS_RAW },
  {
    id: "iron-ore-concentrate",
    group: "raw-material",
    enabled: true,
    name: "کنسانترهٔ سنگ آهن",
    designation: null,
    facts: [
      { text: "پس از خردایش و جدایش، عیار آهن بالاتری از سنگ خام دارد", source: site("/raw-materials/iron-ore") },
      { text: "ماده اولیهٔ ساخت گندله", source: site("/raw-materials/iron-ore") },
      { text: "در سه ردهٔ عیار آهن؛ فروش به تن و بر اساس وزن باسکول", source: catalog("iron_ore_concentrate") },
    ],
    page: "/raw-materials/iron-ore",
    reference: null,
  },
  {
    id: "pellet",
    group: "raw-material",
    enabled: true,
    name: "گندلهٔ سنگ آهن",
    designation: "DR · BF",
    facts: [
      { text: "از کنسانترهٔ سنگ آهن ساخته می‌شود", source: site("/raw-materials/iron-ore") },
      { text: "گرید DR برای احیای مستقیم و گرید BF برای کورهٔ بلند", source: catalog("iron_ore_pellet") },
      { text: "فروش به تن و بر اساس وزن باسکول", source: catalog("iron_ore_pellet") },
    ],
    page: "/raw-materials/iron-ore",
    reference: null,
  },
  {
    id: "dri",
    group: "raw-material",
    enabled: true,
    name: "آهن اسفنجی (DRI)",
    designation: "Direct Reduced Iron",
    facts: [
      { text: "از احیای گندله یا سنگ آهن با گاز، بدون ذوب، به دست می‌آید", source: site("/raw-materials/dri") },
      { text: "خوراک کورهٔ قوس الکتریکی و القایی، همراه یا به‌جای قراضه", source: site("/raw-materials/dri") },
      { text: "معیار کیفیت: آهن کل، درجهٔ متالیزاسیون، کربن، گوگرد و فسفر", source: site("/raw-materials/dri") },
    ],
    page: "/raw-materials/dri",
    reference: null,
  },
  {
    id: "hbi",
    group: "raw-material",
    enabled: true,
    name: "بریکت آهن اسفنجی (HBI)",
    designation: "Hot Briquetted Iron",
    facts: [
      { text: "آهن اسفنجی که در دمای بالا فشرده و به قالب‌های متراکم تبدیل شده است", source: site("/raw-materials/briquette") },
      { text: "در برابر اکسید شدن دوباره، پایدارتر از آهن اسفنجی معمولی", source: site("/raw-materials/briquette") },
      { text: "حمل و انبارش ساده‌تر، به‌ویژه در مسیرهای طولانی و صادراتی", source: site("/raw-materials/briquette") },
    ],
    page: "/raw-materials/briquette",
    reference: null,
  },
  {
    id: "lump-ore",
    group: "raw-material",
    enabled: true,
    name: "سنگ آهن دانه‌بندی",
    designation: null,
    facts: [
      { text: "دانه‌بندی ۱۰ تا ۳۰ میلی‌متر، در دو ردهٔ عیار آهن", source: catalog("lump_ore") },
      { text: "نرمهٔ سنگ آهن: ۰ تا ۱۰ میلی‌متر", source: catalog("iron_ore_fines") },
      { text: "در درخواست: عیار آهن (Fe) و حداکثر گوگرد، فسفر، سیلیس و رطوبت", source: site("/raw-materials/iron-ore") },
    ],
    page: "/raw-materials/iron-ore",
    reference: null,
  },
  { id: "coke", group: "raw-material", enabled: true, name: "کک متالورژی", designation: null, facts: [], page: null, reference: null, todo: NEEDS_FACTS_RAW },
  { id: "scrap", group: "raw-material", enabled: true, name: "قراضه و ضایعات آهن", designation: null, facts: [], page: null, reference: null, todo: NEEDS_FACTS_RAW },
  { id: "ferrosilicon", group: "raw-material", enabled: true, name: "فروسیلیس", designation: null, facts: [], page: null, reference: null, todo: NEEDS_FACTS_RAW },
  { id: "ferromanganese", group: "raw-material", enabled: true, name: "فرومنگنز", designation: null, facts: [], page: null, reference: null, todo: NEEDS_FACTS_RAW },
  { id: "ferrochrome", group: "raw-material", enabled: true, name: "فروکروم", designation: null, facts: [], page: null, reference: null, todo: NEEDS_FACTS_RAW },
  { id: "silicomanganese", group: "raw-material", enabled: true, name: "سیلیکومنگنز", designation: null, facts: [], page: null, reference: null, todo: NEEDS_FACTS_RAW },

  // Alloy and tool steels (owner addendum; the grades of the Search Console queries). Facts: W39 §3.1, its cited
  // standards and datasheets (§10). No origin, mill or market listing is ever named here.
  {
    id: "7131",
    group: "alloy-steel",
    enabled: true,
    name: "فولاد سمانته 7131",
    designation: "1.7131 · 16MnCr5 · AISI 5115 (≈)",
    facts: [
      { text: "فولاد سمانتاسیون (کربن‌دهی سطحی) طبق EN ISO 683-3", source: std("EN ISO 683-3") },
      { text: "کاربرد: چرخ‌دنده، پین و بادامک کربن‌دهی‌شده", source: std("EN ISO 683-3; Kovintrade 1.7131 sheet (W39 §10)") },
      { text: "شکل عرضه: میلگرد گرد، آنیل‌شده", source: std("Kovintrade 1.7131 sheet (W39 §10)") },
    ],
    page: null,
    reference: "EN ISO 683-3",
  },
  {
    id: "2312",
    group: "alloy-steel",
    enabled: true,
    name: "فولاد قالب پلاستیک 2312",
    designation: "1.2312 · 40CrMnMoS8-6 · AISI P20+S (≈)",
    facts: [
      { text: "فولاد ابزار قالب پلاستیک طبق EN ISO 4957", source: std("EN ISO 4957") },
      { text: "کاربرد: صفحه و بدنهٔ قالب تزریق پلاستیک", source: std("Oberste-Beulmann 1.2312 datasheet; Meusburger material qualities (W39 §10)") },
      { text: "شکل عرضه: تسمهٔ آهنگری و میلگرد، پیش‌سخت‌شده ۲۸۰ تا ۳۲۵ برینل", source: std("Oberste-Beulmann 1.2312 datasheet; Kovintrade 1.2312 forged (W39 §10)") },
    ],
    page: null,
    reference: "EN ISO 4957",
  },
  {
    id: "2510",
    group: "alloy-steel",
    enabled: true,
    name: "فولاد ابزار 2510",
    designation: "1.2510 · 100MnCrW4 · AISI O1 (≈)",
    facts: [
      { text: "فولاد ابزار سردکار روغن‌سخت طبق EN ISO 4957", source: std("EN ISO 4957") },
      { text: "کاربرد: گیج، قالب‌های کوچک، سنبه و تیغه", source: std("EN ISO 4957 (W39 §3.1 C)") },
      { text: "شکل عرضه: میلگرد گرد، آنیل‌شده تا ۲۳۰ برینل", source: std("EN ISO 4957 (W39 §3.1 C)") },
    ],
    page: null,
    reference: "EN ISO 4957",
  },
  {
    id: "2344",
    group: "alloy-steel",
    enabled: true,
    name: "فولاد گرمکار 2344",
    designation: "1.2344 · X40CrMoV5-1 · AISI H13 (≈)",
    facts: [
      { text: "فولاد ابزار گرمکار طبق EN ISO 4957", source: std("EN ISO 4957") },
      { text: "کاربرد: قالب دایکست، اکستروژن و قطعات قالب آهنگری", source: std("EN ISO 4957 (W39 §3.1 C)") },
      { text: "شکل عرضه: میلگرد گرد، آنیل‌شده تا ۲۲۹ برینل", source: std("EN ISO 4957 (W39 §3.1 C)") },
    ],
    page: null,
    reference: "EN ISO 4957",
  },
  {
    // Owner list: «2210» and «میل نقره‌ای» are the same grade (W39 §3.1 C): one story.
    id: "2210",
    group: "alloy-steel",
    enabled: true,
    name: "میل نقره‌ای 2210",
    designation: "1.2210 · 115CrV3 · AISI L2 (≈)",
    facts: [
      { text: "فولاد ابزار طبق EN ISO 4957", source: std("EN ISO 4957") },
      { text: "کاربرد: پین پران، محور و سنبه", source: std("EN ISO 4957 (W39 §3.1 C)") },
      { text: "شکل عرضه: میل گرد سنگ‌خورده و پولیش‌شده با تلرانس h9، آنیل‌شده", source: std("EN ISO 4957 (W39 §3.1 C)") },
    ],
    page: null,
    reference: "EN ISO 4957",
  },
  {
    id: "5920",
    group: "alloy-steel",
    enabled: true,
    name: "فولاد سمانته نیکل‌دار 5920",
    designation: "1.5920 · 18CrNi8",
    facts: [
      { text: "فولاد سمانتاسیون نیکل‌دار طبق استاندارد قدیمی DIN 17210", source: std("DIN 17210 (withdrawn; W39 §3.1 A)") },
      { text: "کاربرد: چرخ‌دنده‌های سنگین کربن‌دهی‌شده", source: std("DIN 17210 (W39 §3.1 A)") },
      { text: "شکل عرضه: میلگرد گرد، آنیل‌شده", source: std("DIN 17210 (W39 §3.1 A)") },
    ],
    page: null,
    reference: "DIN 17210",
  },
  {
    id: "hadfield",
    group: "alloy-steel",
    enabled: true,
    name: "فولاد هادفیلد (منگنزی)",
    designation: "1.3401 · X120Mn12 · ASTM A128",
    facts: [
      { text: "فولاد پرمنگنز برای قطعات تحت ضربه و سایش؛ قطعات ریختگی طبق ASTM A128", source: std("ASTM A128; Industeel Creusabro M datasheet (W39 §10)") },
      { text: "کاربرد: فک سنگ‌شکن، آستر آسیا و قطعات ریل", source: std("West Yorkshire Steel, manganese steel (W39 §10)") },
      { text: "شکل عرضه: بیشتر قطعهٔ ریختگی؛ ورق و میلگرد نیز", source: std("ASTM A128; West Yorkshire Steel (W39 §10)") },
    ],
    page: null,
    reference: "ASTM A128",
  },
  {
    // Owner list: «خشکه هوایی» and «HSS/تندبر» are the same grade family (W39 §3.1 C): one story, the common M2.
    id: "hss",
    group: "alloy-steel",
    enabled: true,
    name: "فولاد تندبر (HSS، خشکه هوایی)",
    designation: "1.3343 · HS6-5-2C · AISI M2 (≈)",
    facts: [
      { text: "فولاد تندبر طبق EN ISO 4957", source: std("EN ISO 4957; Böhler S600 datasheet (W39 §10)") },
      { text: "کاربرد: ابزار برش، قلاویز، بروچ و رندهٔ تراشکاری", source: std("Böhler S600 datasheet (W39 §10)") },
      { text: "شکل عرضه: میلگرد گرد، آنیل‌شده تا ۲۶۹ برینل", source: std("EN ISO 4957; Böhler S600 datasheet (W39 §10)") },
    ],
    page: null,
    reference: "EN ISO 4957",
  },
  {
    id: "a105",
    group: "alloy-steel",
    enabled: true,
    name: "فولاد A105",
    designation: "ASTM A105/A105M",
    facts: [
      { text: "فولاد کربنی آهنگری‌شده برای اجزای لوله‌کشی طبق ASTM A105", source: std("ASTM A105/A105M") },
      { text: "کاربرد: فلنج، اتصالات و بدنهٔ شیر", source: std("ASTM A105/A105M") },
      { text: "شکل عرضه: میلگرد آهنگری، نرمالیزه", source: std("ASTM A105/A105M (W39 §3.1 A)") },
    ],
    page: null,
    reference: "ASTM A105",
  },
  { id: "low-alloy", group: "alloy-steel", enabled: true, name: "فولاد کم‌آلیاژ", designation: null, facts: [], page: null, reference: null, todo: NEEDS_FACTS_ALLOY },
];

export const STORY_CONFIG = {
  origin: "https://www.ahanassa.com",
  /** fa is the unprefixed default locale: this is /fa/request. */
  requestPath: "/request",
  /** Tehran time the story goes out (the workflow slot: 05:30 UTC); a later run the same day still sends it. */
  sendFrom: "09:00",
  /** After this (Tehran), a day without a sent story is given up and the owner told. */
  sendUntil: "18:00",
  /** The first rotation day (item 0 of the sequence). */
  rotationStart: "2026-10-25",
  order: "mixed" as "mixed" | "as-listed",
  /** No group more than this many days in a row (mixed order; a check warns when the list makes it impossible). */
  maxGroupRun: 2,
  /** A definite API refusal is retried on the next runs up to this many attempts. */
  maxAttempts: 3,
  /** History kept in the state (days). */
  historyDays: 120,
} as const;
