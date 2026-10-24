/**
 * W41 — the story texts: links with UTM tags, the owner's caption (with a suggested story text) and the channel
 * post's caption, and the gate every text passes before anything is sent: no price, no stock/availability, no
 * discount or hype, no statistics, the W23 banned words, and the private price-source name list.
 * Bale has no parse_mode: captions are read as Markdown ([text](url)), so plain text drops the markup characters.
 */
import { STORY_CONFIG, STORY_GROUPS, type StoryItem } from "../../config/raw-material-stories.ts";
import { CONTACT_SALES_EMAIL } from "../content/contact-channels.ts";
import { companyPhoneDisplay } from "../content/company.ts";
import { BANNED_WORDS, escMd } from "../price-channel/compose.ts";
import { namesIn } from "../static/source-name-scan.ts";

export const PHONE = companyPhoneDisplay();
export const EMAIL = CONTACT_SALES_EMAIL;
export const REQUEST_TEXT = "استعلام قیمت";

export interface StoryLinks {
  /** What the QR in the image opens (utm_medium=story). */
  story: string;
  /** The channel post's link and button (utm_medium=channel). */
  channel: string;
  /** Printed under the QR: the page without scheme, www or tags. */
  short: string;
}

export function storyLinks(item: StoryItem, config: { origin: string; requestPath: string } = STORY_CONFIG): StoryLinks {
  const path = item.page ?? config.requestPath;
  const url = (medium: string) => `${config.origin}${path}?${new URLSearchParams({ utm_source: "bale", utm_medium: medium, utm_campaign: item.id }).toString()}`;
  return { story: url("story"), channel: url("channel"), short: `${config.origin.replace(/^https?:\/\/(www\.)?/, "")}${path}` };
}

/** The suggested story text the owner can paste (Bale stories take a short caption). */
export function suggestedStoryText(item: StoryItem, links: StoryLinks): string {
  const tagline = STORY_GROUPS[item.group].tagline.replace(new RegExp(`\\s*—\\s*${REQUEST_TEXT}$`), "");
  return `${item.name} — ${tagline}. برای ${REQUEST_TEXT}، کد QR را اسکن کنید یا به ${links.short} بروید.`;
}

/** sendPhoto caption to the owner's private chat. */
export function ownerCaption(item: StoryItem, links: StoryLinks): string {
  return [`استوری امروز (${escMd(item.name)}) — برای انتشار: باز کنید ← افزودن به استوری`, "", "متن پیشنهادی استوری:", escMd(suggestedStoryText(item, links))].join("\n");
}

/** The channel post (STORY_MODE=owner+channel): the facts, the tagline, contact and the request link. */
export function channelCaption(item: StoryItem, links: StoryLinks): string {
  return [
    escMd(item.name),
    ...(item.designation ? [escMd(item.designation)] : []),
    "",
    ...item.facts.map((f) => `• ${escMd(f.text)}`),
    "",
    escMd(STORY_GROUPS[item.group].tagline),
    `تلفن: ${PHONE} · ${escMd(EMAIL)}`,
    "",
    `[${REQUEST_TEXT}](${links.channel})`,
  ].join("\n");
}

export const channelKeyboard = (links: StoryLinks) => ({ inline_keyboard: [[{ text: REQUEST_TEXT, url: links.channel }]] });

/** Every plain text of an item's story (before rendering), for the gate. */
export function storyTexts(item: StoryItem, links: StoryLinks): string[] {
  return [item.name, item.designation ?? "", ...item.facts.map((f) => f.text), item.reference ?? "", STORY_GROUPS[item.group].label, STORY_GROUPS[item.group].tagline, suggestedStoryText(item, links)].filter(Boolean);
}

/** Claims a story must never make. Each entry: a label for the problem and the pattern. */
const CLAIMS: ReadonlyArray<[string, RegExp]> = [
  ["a price or currency", /تومان|ریال|دلار|یورو|درهم|[$€]|\bUSD\b|\bIRR\b|\bIRT\b/i],
  ["stock or availability", /موجود|انبار(?!ش)|آماده(ٔ|ی)?\s*(تحویل|ارسال)|تحویل\s*(فوری|سریع|آنی)|ظرفیت|بدون\s*محدودیت/],
  ["a discount or hype word", /تخفیف|ارزان|حراج|بهترین|برترین|بزرگ‌?ترین|بی‌?رقیب|اولین|پیشرو|شمارهٔ?\s*(یک|۱)|رتبهٔ?/],
  ["a statistic", /[0-9۰-۹]\s*(٪|%|درصد)|[0-9۰-۹]+\s*(هزار|میلیون)?\s*(تن|مشتری|پروژه|سال\s*تجربه)|سال\s*تجربه|مشتری\s*راضی/],
];

/**
 * The gate. `sourceNames` null = the private list is not configured: a problem when sending (`required`), only
 * reported in a dry run.
 */
export function storyGate(texts: readonly string[], sourceNames: readonly string[] | null, required: boolean): string[] {
  const problems: string[] = [];
  const all = texts.join("\n");
  // «قیمت» only as «استعلام قیمت».
  if (/قیمت/.test(all.split(REQUEST_TEXT).join(""))) problems.push("«قیمت» outside «استعلام قیمت»");
  for (const [label, re] of CLAIMS) if (re.test(all)) problems.push(`${label}: «${re.exec(all)![0]}»`);
  const banned = BANNED_WORDS.filter((w) => all.includes(w));
  if (banned.length) problems.push(`banned words: ${banned.join(", ")}`);
  if (sourceNames) {
    const hits = namesIn(all, sourceNames);
    if (hits.length) problems.push(`price-source name(s) found (list line ${hits.join(", ")})`);
  } else if (required) problems.push("the price-source name list is not configured (required to send)");
  return problems;
}
