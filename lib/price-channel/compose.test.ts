import { test } from "node:test";
import assert from "node:assert/strict";
import { evaluateBasket, exceptionMoves, type DayObservation } from "./basket.ts";
import { buildCard } from "./card.ts";
import { bannedWordsIn, bulletinCaption, captionTexts, captionWords, exceptionCaption, MISSING_TEXT, renderCaption, statusNotice } from "./compose.ts";
import { bulletinCard, exceptionCard } from "./run.ts";
import { parsePricePage } from "./source.ts";
import { basePrice, basketRows, pageHtml } from "./test-fixtures.ts";

const AT = (day: string, hhmm = "07:50") => `${day}T${hhmm}:00.000Z`;
const ev = (rows: ReturnType<typeof basketRows>, date: string, history: DayObservation[] = [], weekly = false) => evaluateBasket({ page: parsePricePage(pageHtml(rows)), date, history, snapshotVersion: "snap-1", weekly });
const hist = (date: string, price = basePrice): DayObservation => {
  const e = ev(basketRows(AT(date), price), date);
  return { date, data_version: e.data_version, snapshot_version: null, fetched_at: AT(date), rows: e.rows };
};
const up = (id: string, i: number) => (i % 3 === 0 ? Math.round(basePrice(id, i) * 1.015) : i % 3 === 1 ? Math.round(basePrice(id, i) * 0.99) : basePrice(id, i));
const PAYMENT_TERMS = ["نقد", "چک", "اعتبار", "پرداخت", "اقساط", "پیش‌پرداخت"];

const cases = {
  weekdayWithHistory: ev(basketRows(AT("2026-10-20"), up), "2026-10-20", [hist("2026-10-19")]),
  firstDay: ev(basketRows(AT("2026-10-20"), basePrice), "2026-10-20"),
  twoMissing: ev(basketRows(AT("2026-10-20"), (id, i) => (i < 2 ? null : up(id, i))), "2026-10-20", [hist("2026-10-19")]),
  saturday: ev(basketRows(AT("2026-10-24"), up), "2026-10-24", [hist("2026-10-17"), hist("2026-10-22")], true),
  saturdayMissing: ev(basketRows(AT("2026-10-24"), (id, i) => (i === 4 ? null : up(id, i))), "2026-10-24", [hist("2026-10-17"), hist("2026-10-22")], true),
};

test("caption: 60–100 words in every case (weekday, first day, missing items, Saturday weekly review)", () => {
  for (const [name, e] of Object.entries(cases)) {
    const m = bulletinCaption(e, "telegram", { saturday: name.startsWith("saturday") });
    const n = captionWords(m);
    assert.ok(n >= 60 && n <= 100, `${name}: ${n} words`);
  }
});

test("caption: date, summary, unit, VAT, «selected basket, not the whole market»; no hype, no payment terms", () => {
  const m = bulletinCaption(cases.weekdayWithHistory, "telegram", { saturday: false });
  const text = captionTexts(m).join("\n");
  assert.match(text, /سه‌شنبه ۲۸ مهر ۱۴۰۵/);
  assert.match(text, /نسبت به آخرین روز کاری: ۴ قلم افزایش، ۳ قلم کاهش و ۳ قلم بدون تغییر/);
  assert.match(text, /بیشترین تغییر روزانه: /);
  assert.match(text, /تومان برای هر کیلوگرم/);
  assert.match(text, /با ارزش افزوده/);
  assert.match(text, /سبد منتخب است، نه کل بازار/);
  for (const e of Object.values(cases)) {
    const all = captionTexts(bulletinCaption(e, "bale", { saturday: true })).join("\n");
    assert.deepEqual(bannedWordsIn(all), []);
    assert.deepEqual(PAYMENT_TERMS.filter((w) => all.includes(w)), []);
  }
});

test("missing items: «به‌روزرسانی نشده» in caption and card, never «بدون تغییر» for them", () => {
  const e = cases.twoMissing;
  const text = captionTexts(bulletinCaption(e, "telegram", { saturday: false })).join("\n");
  assert.match(text, new RegExp(`۲ قلم ${MISSING_TEXT}`));
  const card = buildCard({ ...bulletinCard(e, false, "ahanassa.com/prices"), logoDataUri: "data:," });
  assert.equal(card.texts.filter((t) => t === MISSING_TEXT).length, 2);
  assert.equal(card.texts.filter((t) => t === "بدون تغییر").length, e.lines.filter((l) => l.daily?.direction === "none").length);
});

test("first day: no history → «—» in the card and an honest caption, never invented changes", () => {
  const card = buildCard({ ...bulletinCard(cases.firstDay, false, "ahanassa.com/prices"), logoDataUri: "data:," });
  assert.equal(card.texts.filter((t) => t === "—").length, 10);
  assert.match(captionTexts(bulletinCaption(cases.firstDay, "telegram", { saturday: false })).join(" "), /در دسترس نیست/);
});

test("Saturday: weekly review sentence and the weekly column", () => {
  const text = captionTexts(bulletinCaption(cases.saturday, "telegram", { saturday: true })).join("\n");
  assert.match(text, /مرور هفته برای همین سبد، نسبت به هفته گذشته \(تعداد قلم\): /);
  const card = buildCard({ ...bulletinCard(cases.saturday, true, "ahanassa.com/prices"), logoDataUri: "data:," });
  assert.ok(card.texts.includes("هفتگی"));
  assert.ok(card.texts.includes("ahanassa.com/prices"));
});

test("links: RFQ form pre-filled with the lead product + factory, UTM per platform and post; table link", () => {
  const m = bulletinCaption(cases.weekdayWithHistory, "bale", { saturday: false });
  const req = new URL(m.links.request);
  assert.equal(req.origin + req.pathname, "https://www.ahanassa.com/request");
  assert.equal(req.searchParams.get("variant"), "CVAR-000001");
  assert.equal(req.searchParams.get("factory"), "کارخانه الف");
  assert.equal(req.searchParams.get("utm_source"), "bale");
  assert.equal(req.searchParams.get("utm_campaign"), "price_bulletin");
  assert.equal(req.searchParams.get("utm_content"), "2026-10-20-bulletin");
  assert.equal(new URL(m.links.table).pathname, "/prices");
  assert.equal(new URL(bulletinCaption(cases.weekdayWithHistory, "telegram", { saturday: false }).links.table).searchParams.get("utm_source"), "telegram");
});

test("rendering: Telegram HTML anchors; Bale Markdown links (no parse_mode on Bale); sizes keep LTR marks", () => {
  const m = bulletinCaption(cases.weekdayWithHistory, "telegram", { saturday: false });
  const tg = renderCaption(m, "telegram");
  assert.match(tg, /<a href="https:\/\/www\.ahanassa\.com\/request\?[^"]+">استعلام قیمت برای مقدار و مقصد شما<\/a>/);
  const bale = renderCaption(bulletinCaption(cases.weekdayWithHistory, "bale", { saturday: false }), "bale");
  assert.match(bale, /\[جدول کامل\]\(https:\/\/www\.ahanassa\.com\/prices\?utm_source=bale[^)]*\)/);
  assert.doesNotMatch(bale, /<a /);
  const status = renderCaption(statusNotice("2026-10-20", "telegram"), "telegram", false);
  assert.doesNotMatch(status, /استعلام/);
  assert.doesNotMatch(status, /\d{3}٬\d{3}|[۰-۹]{3}٬[۰-۹]{3}/, "a status notice never carries a price");
});

test("exception caption + card: moves vs the morning bulletin, 60–100 words, the top mover's RFQ link", () => {
  const morning = cases.firstDay.lines;
  const later = ev(basketRows(AT("2026-10-20", "10:05"), (id, i) => (["ipe-140", "ipe-160", "shs-40x40"].includes(id) ? Math.round(basePrice(id, i) * (id === "shs-40x40" ? 1.03 : 1.012)) : basePrice(id, i))), "2026-10-20");
  const { moves } = exceptionMoves(morning, later);
  const m = exceptionCaption(later, moves, "13:40", 1, "telegram");
  const n = captionWords(m);
  assert.ok(n >= 60 && n <= 100, `${n} words`);
  assert.match(m.paragraphs.join("\n"), /نسبت به بولتن صبح امروز، قیمت ۳ قلم/);
  assert.equal(new URL(m.links.request).searchParams.get("variant"), "CVAR-000456");
  assert.equal(new URL(m.links.request).searchParams.get("utm_content"), "2026-10-20-exception1");
  const card = buildCard({ ...exceptionCard(later, morning, "13:40", "ahanassa.com/prices"), logoDataUri: "data:," });
  assert.ok(card.texts.includes("نسبت به صبح"));
  assert.deepEqual(bannedWordsIn(card.texts.join(" ")), []);
});
