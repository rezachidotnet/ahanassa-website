/**
 * W23 — the post texts, built only from the basket evaluation (no free text, no LLM). Rules (owner brief):
 * - caption 60–100 words: the date, a short summary and two links — «استعلام قیمت برای مقدار و مقصد شما» (the RFQ
 *   form pre-filled with a product, UTM per post) and «جدول کامل» (/prices);
 * - always: Toman per kg, «با ارزش افزوده», «سبد منتخب، نه کل بازار»; no payment terms;
 * - a missing item is «به‌روزرسانی نشده», never "no change";
 * - no hype words, no forecasts, no "buy now" (BANNED_WORDS is tested against every composed text).
 * Telegram gets HTML (parse_mode=HTML); Bale has no parse_mode and always reads Markdown ([text](url)).
 */
import { CHANNEL_CONFIG, LEAD_ITEM_ID, type BasketItem } from "../../config/price-channel.ts";
import type { BasketEvaluation, BasketLine, Change, ExceptionMove } from "./basket.ts";
import { faDigits, persianDayLabel } from "./calendar.ts";

export type Platform = "telegram" | "bale";
export type PostKind = "bulletin" | "exception" | "status";

export const MISSING_TEXT = "به‌روزرسانی نشده";
export const LINK_TEXT = { request: "استعلام قیمت برای مقدار و مقصد شما", table: "جدول کامل" } as const;
export const STANDARD_NOTE = "قیمت‌ها به تومان برای هر کیلوگرم و با ارزش افزوده است؛ این سبد منتخب است، نه کل بازار. قیمت نهایی به مقدار و مقصد بستگی دارد.";
const IMAGE_POINTER ="کارخانه و محل تحویل هر قلم در تصویر آمده است.";

/** Words a post must never contain: hype, forecasts, calls to buy. */
export const BANNED_WORDS = ["فوری", "همین حالا", "همین الان", "بخرید", "بخر ", "فرصت", "ارزان‌ترین", "بی‌نظیر", "استثنایی", "پیش‌بینی", "پیش بینی", "انفجار", "سقوط", "جهش", "ریزش", "طوفان", "تضمین", "حتما", "حتماً", "قیمت‌ها بالا خواهد", "خواهد رفت"];

export function bannedWordsIn(text: string): string[] {
  return BANNED_WORDS.filter((w) => text.includes(w));
}

export function wordCount(text: string): number {
  return text.split(/\s+/).filter((w) => /[\p{L}\p{N}]/u.test(w)).length;
}

const pctFmt = new Intl.NumberFormat("fa-IR", { minimumFractionDigits: 1, maximumFractionDigits: 1 });
const amountFmt = new Intl.NumberFormat("fa-IR", { maximumFractionDigits: 0 });

export const formatPercent = (p: number) => `${pctFmt.format(p)}٪`;
export const formatToman = (t: number) => amountFmt.format(t);

/** A size like «40×40×2.5» inside RTL text: U+200E on both sides, or a chat client shows «2.5×40×40». */
export const SIZE_RUN = /\d+(?:\.\d+)?(?:\s*[×xX]\s*\d+(?:\.\d+)?)+/g;

/** «میلگرد آجدار A3 Ø16». `marks` = false for the card (it isolates sizes itself). */
export function itemLabel(item: BasketItem, marks = true): string {
  const label = [item.label.product, item.label.grade, item.label.size].filter(Boolean).join(" ");
  return marks ? label.replace(SIZE_RUN, (m) => `\u200E${m}\u200E`) : label;
}

export function changeWords(c: Change): string {
  return c.direction === "none" ? "بدون تغییر" : `${formatPercent(c.percent)} ${c.direction === "up" ? "افزایش" : "کاهش"}`;
}

export interface Links {
  request: string;
  table: string;
}

export function utm(platform: Platform, kind: PostKind, date: string, seq: number): Record<string, string> {
  return { utm_source: platform, utm_medium: "social", utm_campaign: kind === "bulletin" ? "price_bulletin" : kind === "exception" ? "price_update" : "price_status", utm_content: `${date}-${kind}${kind === "exception" ? seq : ""}` };
}

/** The RFQ form pre-filled with the item (variant, and the factory as the form's editable note) + the table link. */
export function postLinks(platform: Platform, kind: PostKind, date: string, seq: number, line: BasketLine | null, config = CHANNEL_CONFIG): Links {
  const tags = utm(platform, kind, date, seq);
  const req = new URLSearchParams();
  if (line) {
    req.set("variant", line.item.variant);
    if (line.row) req.set("factory", line.row.factory);
  }
  for (const [k, v] of Object.entries(tags)) req.set(k, v);
  return { request: `${config.origin}${config.requestPath}?${req.toString()}`, table: `${config.origin}${config.pricesPath}?${new URLSearchParams(tags).toString()}` };
}

/** A caption before rendering: plain paragraphs + the two links. */
export interface CaptionModel {
  paragraphs: string[];
  links: Links;
}

export function captionWords(m: CaptionModel): number {
  return wordCount([...m.paragraphs, LINK_TEXT.request, LINK_TEXT.table].join(" "));
}

function tally(lines: readonly BasketLine[], pick: (l: BasketLine) => Change | null) {
  const changes = lines.filter((l) => l.status === "ok").map(pick);
  return {
    up: changes.filter((c) => c?.direction === "up").length,
    down: changes.filter((c) => c?.direction === "down").length,
    none: changes.filter((c) => c?.direction === "none").length,
    compared: changes.filter(Boolean).length,
  };
}

const count = (n: number) => `${faDigits(n)} قلم`;

export function leadLine(e: BasketEvaluation): BasketLine | null {
  return e.lines.find((l) => l.item.id === LEAD_ITEM_ID && l.status === "ok") ?? e.lines.find((l) => l.status === "ok") ?? null;
}

export function bulletinCaption(e: BasketEvaluation, platform: Platform, opts: { saturday: boolean; basketSize?: number }): CaptionModel {
  const size = opts.basketSize ?? e.lines.length;
  const p: string[] = [`قیمت روز آهن‌آلات — سبد منتخب ${count(size)}`, `${persianDayLabel(e.date)}، از جدول قیمت آهن آسا`];
  const t = tally(e.lines, (l) => l.daily);
  const missing = e.lines.filter((l) => l.status === "missing").length;
  let summary = t.compared ? `نسبت به آخرین روز کاری: ${count(t.up)} افزایش، ${count(t.down)} کاهش و ${count(t.none)} بدون تغییر.` : "مقایسه با آخرین روز کاری برای این سبد در دسترس نیست.";
  if (missing) summary += ` ${count(missing)} ${MISSING_TEXT} است.`;
  p.push(summary);
  const biggest = e.lines.filter((l) => l.daily && l.daily.direction !== "none").sort((a, b) => Math.abs(b.daily!.exact) - Math.abs(a.daily!.exact))[0];
  if (biggest) p.push(`بیشترین تغییر روزانه: ${itemLabel(biggest.item)}، ${changeWords(biggest.daily!)}.`);
  if (opts.saturday) {
    const w = tally(e.lines, (l) => l.weekly);
    p.push(w.compared ? `مرور هفته برای همین سبد، نسبت به هفته گذشته (تعداد قلم): ${faDigits(w.up)} افزایش، ${faDigits(w.down)} کاهش و ${faDigits(w.none)} بدون تغییر.` : "مرور هفته برای همین سبد: داده هفته گذشته برای مقایسه در دسترس نیست.");
  }
  const links = postLinks(platform, "bulletin", e.date, 0, leadLine(e));
  // The pointer to the image is optional: dropped when it would take the caption over 100 words (Saturday).
  const withPointer = { paragraphs: [...p, IMAGE_POINTER, STANDARD_NOTE], links };
  return captionWords(withPointer) <= 100 ? withPointer : { paragraphs: [...p, STANDARD_NOTE], links };
}

export function exceptionCaption(e: BasketEvaluation, moves: readonly ExceptionMove[], time: string, seq: number, platform: Platform): CaptionModel {
  const p = [`به‌روزرسانی میان‌روز قیمت — سبد منتخب`, `${persianDayLabel(e.date)}، ساعت ${faDigits(time)}`, `نسبت به بولتن صبح امروز، قیمت ${count(moves.length)} از سبد منتخب دست‌کم ${faDigits(CHANNEL_CONFIG.exception.percent)}٪ تغییر کرده است:`];
  for (const m of moves.slice(0, 5)) p.push(`${itemLabel(m.item)}: ${changeWords(m.change)}`);
  p.push("کارخانه، محل تحویل و قیمت هر قلم در تصویر آمده است.", STANDARD_NOTE);
  const top = moves[0];
  const line = top ? (e.lines.find((l) => l.item.id === top.item.id) ?? null) : null;
  return { paragraphs: p, links: postLinks(platform, "exception", e.date, seq, line) };
}

export function statusNotice(date: string, platform: Platform): CaptionModel {
  return {
    paragraphs: [
      `اطلاع‌رسانی آهن آسا — ${persianDayLabel(date)}`,
      "قیمت‌های امروز هنوز برای انتشار در این کانال تأیید نشده است. قیمت روزهای قبل با تاریخ امروز منتشر نمی‌شود.",
      "پس از بررسی، قیمت روز در جدول سایت در دسترس است.",
    ],
    links: postLinks(platform, "status", date, 0, null),
  };
}

const escHtml = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
/** Bale always parses Markdown: drop the markup characters from plain text (never present in our copy anyway). */
export const escMd = (s: string) => s.replace(/[*_`[\]]/g, "");

/** The caption as each platform reads it. `includeRequest` = false for the status notice. */
export function renderCaption(m: CaptionModel, platform: Platform, includeRequest = true): string {
  const body = m.paragraphs.map((x) => (platform === "telegram" ? escHtml(x) : escMd(x)));
  const link = (text: string, url: string) => (platform === "telegram" ? `<a href="${escHtml(url)}">${escHtml(text)}</a>` : `[${escMd(text)}](${url})`);
  const links = [...(includeRequest ? [link(LINK_TEXT.request, m.links.request)] : []), link(LINK_TEXT.table, m.links.table)];
  return `${body.join("\n")}\n\n${links.join("\n")}`;
}

/** The URL buttons under a post (both platforms support inline URL buttons). */
export function keyboard(m: CaptionModel, includeRequest = true): { inline_keyboard: Array<Array<{ text: string; url: string }>> } {
  return { inline_keyboard: [...(includeRequest ? [[{ text: LINK_TEXT.request, url: m.links.request }]] : []), [{ text: LINK_TEXT.table, url: m.links.table }]] };
}

/** Every plain text of a caption (for the banned-word and source-name checks). */
export function captionTexts(m: CaptionModel): string[] {
  return [...m.paragraphs, LINK_TEXT.request, LINK_TEXT.table];
}
