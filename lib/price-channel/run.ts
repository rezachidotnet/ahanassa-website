/**
 * W23 — one run of the price channel (the workflow calls it on its schedule; scripts/price-channel/run.ts is the
 * CLI). Everything it needs is injected (clock, page fetch, bot APIs, state), so the decisions are tested offline.
 *
 * A run, on a Tehran price day (Sat–Thu, not a configured holiday), in mode test or public:
 *   1. retries today's deliveries that a platform refused (definite API error) — never a pending/uncertain one;
 *   2. bulletin task (before 13:35): once per day, from 11:35. Fetch /prices, evaluate the basket, pre-publish checks.
 *      - not ready yet (no prices of the day, or a check fails) → wait for the next run until the 12:40 deadline;
 *      - at the deadline: no prices of the day at all → no post, the owner is told (a day without prices);
 *        the source failed (fetch/parse error, unit, too few valid items, inconsistent re-check) → a short status
 *        notice on the channel + owner alert — never older prices with today's date;
 *      - a change ≥ 5 % is re-checked with a second fetch first; an unconfirmed one holds the post.
 *   3. exception task (13:35–17:00): only after a delivered morning bulletin; ≥ 3 basket items moved ≥ 1 % against
 *      it → one exception post (max 2 a day, never twice for the same data).
 * Every send is logged (data version, text, image hash, time, result) in the state and on stdout.
 */
import { BASKET, CHANNEL_CONFIG, type BasketItem } from "../../config/price-channel.ts";
import { change, evaluateBasket, exceptionMoves, jumpsConfirmed, prePublishCheck, sameKey, suspiciousJumps, type BasketEvaluation, type BasketLine, type ChannelConfig, type ExceptionMove } from "./basket.ts";
import type { BotApi, SendResult } from "./bots.ts";
import { dayKind, minutes, persianDayLabel, tehranDate, tehranTime, weekday, faDigits } from "./calendar.ts";
import { buildCard, cardSubLine, type Card, type CardInput, type CardRow } from "./card.ts";
import {
  bannedWordsIn,
  bulletinCaption,
  captionTexts,
  captionWords,
  exceptionCaption,
  itemLabel,
  keyboard,
  renderCaption,
  statusNotice,
  type CaptionModel,
  type Platform,
  type PostKind,
} from "./compose.ts";
import type { FetchedPage } from "./source.ts";
import { basisOf, claimAlert, deliveryPlan, findPost, nextExceptionSeq, postId, postsOf, prune, recordDay, type ChannelState, type Mode, type PostRecord } from "./state.ts";
import { namesIn } from "../static/source-name-scan.ts";

export const PLATFORMS: readonly Platform[] = ["telegram", "bale"];

export interface Secrets {
  TELEGRAM_BOT_TOKEN?: string;
  TELEGRAM_CHANNEL_ID?: string;
  TELEGRAM_TEST_CHANNEL_ID?: string;
  BALE_BOT_TOKEN?: string;
  BALE_CHANNEL_ID?: string;
  /** Optional: Bale is skipped in TEST mode without it. */
  BALE_TEST_CHANNEL_ID?: string;
  /** Optional: owner alerts go here, else to the Telegram TEST channel. */
  TELEGRAM_OWNER_CHAT_ID?: string;
}

/** The chat a post goes to in a mode; null = not configured (the platform is skipped and the owner told). */
export function chatFor(platform: Platform, mode: Exclude<Mode, "off">, s: Secrets): string | null {
  const v = platform === "telegram" ? (mode === "public" ? s.TELEGRAM_CHANNEL_ID : s.TELEGRAM_TEST_CHANNEL_ID) : mode === "public" ? s.BALE_CHANNEL_ID : s.BALE_TEST_CHANNEL_ID;
  return v && v.trim() ? v.trim() : null;
}

export function parseMode(v: string | undefined): Mode {
  return v === "test" || v === "public" ? v : "off";
}

export interface RunDeps {
  now: () => Date;
  mode: Mode;
  task?: "auto" | "bulletin" | "exception";
  secrets: Secrets;
  fetchPage: () => Promise<FetchedPage>;
  sleep: (ms: number) => Promise<void>;
  apis: Partial<Record<Platform, BotApi>>;
  owner: ((text: string) => Promise<void>) | null;
  state: ChannelState;
  save: (state: ChannelState) => void;
  logoDataUri: string;
  render: (card: Card) => Promise<{ png: Buffer; sha256: string }>;
  sourceNames: readonly string[] | null;
  recheckDelayMs?: number;
  log?: (line: string) => void;
  config?: ChannelConfig;
  basket?: readonly BasketItem[];
}

export interface RunOutcome {
  action: "off" | "skip" | "wait" | "posted" | "status" | "no-prices" | "hold" | "nothing";
  reason: string;
  /** A delivery failed or is uncertain, or the source failed at the deadline: the job turns red. */
  failed: boolean;
  posts: string[];
}

// Building posts (pure apart from the injected render) ---------------------------------------------------------------

const BASKET_NOTE = (n: number) => `سبد منتخب ${faDigits(n)} قلم، نه کل بازار · تومان/کیلو · با ارزش افزوده`;

export function bulletinCard(e: BasketEvaluation, saturday: boolean, cardUrl: string): Omit<CardInput, "logoDataUri"> {
  return {
    title: "قیمت روز آهن‌آلات",
    subtitle: persianDayLabel(e.date) + (saturday ? " · مرور هفته" : ""),
    note: BASKET_NOTE(e.lines.length),
    changeHeader: "روزانه",
    changeNote: `روزانه: نسبت به آخرین روز کاری با قیمت معتبر، همان کارخانه و محل تحویل${saturday ? "؛ هفتگی: نسبت به هفته گذشته" : ""}`,
    weeklyColumn: saturday,
    cardUrl,
    rows: e.lines.map((l): CardRow => ({ title: itemLabel(l.item, false), sub: l.row ? cardSubLine(l.row.factory, l.row.location) : null, toman: l.row?.toman ?? null, change: l.daily, weekly: saturday ? l.weekly : undefined })),
  };
}

export function exceptionCard(e: BasketEvaluation, morning: readonly BasketLine[], time: string, cardUrl: string): Omit<CardInput, "logoDataUri"> {
  const rows = morning.map((m): CardRow => {
    const now = m.row ? e.rows.find((r) => sameKey(r, m.row!)) : undefined;
    const c = now && m.row ? change(now.toman, m.row.toman) : null;
    return { title: itemLabel(m.item, false), sub: now ? cardSubLine(now.factory, now.location) : null, toman: now?.toman ?? null, change: c };
  });
  return {
    title: "به‌روزرسانی میان‌روز قیمت",
    subtitle: `${persianDayLabel(e.date)} · ساعت ${faDigits(time)}`,
    note: BASKET_NOTE(morning.length),
    changeHeader: "نسبت به صبح",
    changeNote: "تغییر: نسبت به بولتن صبح امروز، همان کارخانه و محل تحویل",
    weeklyColumn: false,
    cardUrl,
    rows,
  };
}

function contentOf(models: Record<Platform, CaptionModel>, includeRequest: boolean): PostRecord["content"] {
  return {
    telegram: { text: renderCaption(models.telegram, "telegram", includeRequest), keyboard: keyboard(models.telegram, includeRequest) },
    bale: { text: renderCaption(models.bale, "bale", includeRequest), keyboard: keyboard(models.bale, includeRequest) },
  };
}

/** Visible length of a Telegram HTML caption (what its 1024 limit counts). */
export const telegramVisibleLength = (html: string) => html.replace(/<[^>]+>/g, "").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&amp;/g, "&").length;

/**
 * The pre-publish text gate: banned words, 60–100 caption words (photo posts), Telegram's caption limit, and the
 * price-source names (the list is private; required in public mode).
 */
export function checkTexts(kind: PostKind, models: Record<Platform, CaptionModel>, card: Card | null, content: PostRecord["content"], sourceNames: readonly string[] | null, mode: Exclude<Mode, "off">): string[] {
  const problems: string[] = [];
  const texts = [...captionTexts(models.telegram), ...(card?.texts ?? [])];
  const all = texts.join("\n");
  const banned = bannedWordsIn(all);
  if (banned.length) problems.push(`banned words: ${banned.join(", ")}`);
  if (kind !== "status") {
    const words = captionWords(models.telegram);
    if (words < 60 || words > 100) problems.push(`caption has ${words} words (60–100 required)`);
  }
  if (telegramVisibleLength(content.telegram.text) > 1024) problems.push("Telegram caption is longer than 1024 characters");
  if (content.bale.text.length > 4096) problems.push("Bale caption is longer than 4096 characters");
  if (sourceNames) {
    const hits = namesIn([all, content.telegram.text, content.bale.text].join("\n"), sourceNames);
    if (hits.length) problems.push(`price-source name(s) found (list line ${hits.join(", ")})`);
  } else if (mode === "public") problems.push("the price-source name list is not configured (required in public mode)");
  return problems;
}

export interface BuiltPost {
  post: PostRecord;
  card: Card | null;
  models: Record<Platform, CaptionModel>;
}

export function buildBulletinPost(e: BasketEvaluation, mode: Exclude<Mode, "off">, at: string, snapshotDataVersion: string, logoDataUri: string, config = CHANNEL_CONFIG): BuiltPost {
  const saturday = weekday(e.date) === "Sat";
  const models = { telegram: bulletinCaption(e, "telegram", { saturday }), bale: bulletinCaption(e, "bale", { saturday }) };
  const cardInput = bulletinCard(e, saturday, config.cardUrl);
  const card = buildCard({ ...cardInput, logoDataUri });
  return {
    models,
    card,
    post: { id: postId(mode, e.date, "bulletin"), mode, date: e.date, kind: "bulletin", seq: 0, data_version: snapshotDataVersion, created_at: at, card: cardInput, image_sha256: null, content: contentOf(models, true), basis: basisOf(e.lines), deliveries: {} },
  };
}

export function buildExceptionPost(e: BasketEvaluation, morning: readonly BasketLine[], moves: readonly ExceptionMove[], seq: number, mode: Exclude<Mode, "off">, at: Date, logoDataUri: string, config = CHANNEL_CONFIG): BuiltPost {
  const time = tehranTime(at);
  const models = { telegram: exceptionCaption(e, moves, time, seq, "telegram"), bale: exceptionCaption(e, moves, time, seq, "bale") };
  const cardInput = exceptionCard(e, morning, time, config.cardUrl);
  const card = buildCard({ ...cardInput, logoDataUri });
  return {
    models,
    card,
    post: { id: postId(mode, e.date, "exception", seq), mode, date: e.date, kind: "exception", seq, data_version: e.data_version, created_at: at.toISOString(), card: cardInput, image_sha256: null, content: contentOf(models, true), basis: basisOf(e.lines), deliveries: {} },
  };
}

export function buildStatusPost(date: string, mode: Exclude<Mode, "off">, at: string): BuiltPost {
  const models = { telegram: statusNotice(date, "telegram"), bale: statusNotice(date, "bale") };
  return { models, card: null, post: { id: postId(mode, date, "status"), mode, date, kind: "status", seq: 0, data_version: null, created_at: at, card: null, image_sha256: null, content: contentOf(models, false), basis: [], deliveries: {} } };
}

/** The morning bulletin's basket lines, rebuilt from its stored basis. */
export function morningLines(post: PostRecord, basket: readonly BasketItem[] = BASKET): BasketLine[] {
  return basket.map((item) => {
    const b = post.basis.find((x) => x.item_id === item.id);
    const row = b?.row ?? null;
    return { item, status: row ? "ok" : "missing", reason: row ? null : "missing in the morning bulletin", row, daily: null, dailyBase: null, weekly: null, weeklyBase: null };
  });
}

// The run ---------------------------------------------------------------------------------------------------------------

export async function runChannel(deps: RunDeps): Promise<RunOutcome> {
  const config = deps.config ?? CHANNEL_CONFIG;
  const basket = deps.basket ?? BASKET;
  const log = deps.log ?? ((l: string) => console.log(l));
  const nowDate = deps.now();
  const at = nowDate.toISOString();
  const date = tehranDate(nowDate);
  const t = minutes(tehranTime(nowDate));
  const state = deps.state;
  const outcome: RunOutcome = { action: "nothing", reason: "", failed: false, posts: [] };

  if (deps.mode === "off") return { ...outcome, action: "off", reason: "PRICE_CHANNEL_MODE is off (kill switch)" };
  const mode = deps.mode;
  const kind = dayKind(date);
  if (kind !== "price-day") return { ...outcome, action: "skip", reason: `${date} is a ${kind}: no bulletin` };
  prune(state, date, config.historyDays);

  const alert = async (key: string, text: string) => {
    if (!claimAlert(state, `${mode}:${date}:${key}`, at)) return;
    deps.save(state);
    log(`owner alert: ${text}`);
    try {
      await deps.owner?.(`[Ahan Asa price channel · ${mode} · ${date}] ${text}`);
    } catch (e) {
      log(`owner alert could not be sent: ${(e as Error).message}`);
    }
  };

  const deliver = async (post: PostRecord, png: Buffer | null) => {
    for (const platform of PLATFORMS) {
      const plan = deliveryPlan(post, platform, config.maxAttempts);
      if (plan === "done") continue;
      if (plan === "uncertain" || plan === "gave-up") {
        outcome.failed = true;
        await alert(`${post.id}:${platform}:${plan}`, `${post.kind} ${post.id} on ${platform}: ${plan === "uncertain" ? "delivery uncertain (no answer from the API); not resent automatically — check the channel" : "gave up after repeated API errors"}.`);
        continue;
      }
      const chat = chatFor(platform, mode, deps.secrets);
      const api = deps.apis[platform];
      const content = post.content[platform];
      if (!chat || !api) {
        state.log.push({ at, post_id: post.id, platform, mode, kind: post.kind, data_version: post.data_version, text: content.text, image_sha256: post.image_sha256, result: "skipped", error: "not configured" });
        log(JSON.stringify({ event: "send", post_id: post.id, platform, mode, result: "skipped", reason: "not configured" }));
        await alert(`${platform}:not-configured`, `${platform} is not configured for ${mode} mode (token or channel secret missing); skipped.`);
        continue;
      }
      const attempts = (post.deliveries[platform]?.attempts ?? 0) + 1;
      post.deliveries[platform] = { status: "pending", attempts, at };
      deps.save(state);
      let res: SendResult;
      try {
        res = png ? await api.sendPhoto(chat, png, content.text, content.keyboard) : await api.sendMessage(chat, content.text, content.keyboard);
      } catch (e) {
        res = { kind: "uncertain", error: `send threw: ${(e as Error).name}` };
      }
      const doneAt = deps.now().toISOString();
      post.deliveries[platform] = res.kind === "sent" ? { status: "sent", attempts, at: doneAt, message_id: res.messageId } : { status: res.kind, attempts, at: doneAt, error: res.error };
      const entry = { at: doneAt, post_id: post.id, platform, mode, kind: post.kind, data_version: post.data_version, text: content.text, image_sha256: post.image_sha256, result: res.kind, ...(res.kind === "sent" ? { message_id: res.messageId } : { error: res.error }) };
      state.log.push(entry);
      deps.save(state);
      log(JSON.stringify({ event: "send", ...entry, text_chars: content.text.length, text: undefined }));
      if (res.kind !== "sent") {
        outcome.failed = true;
        const last = res.kind === "failed" && attempts >= config.maxAttempts;
        const next = res.kind === "uncertain" ? "not resent automatically — check the channel" : last ? "gave up" : `retried on the next run (attempt ${attempts} of ${config.maxAttempts})`;
        await alert(last ? `${post.id}:${platform}:gave-up` : `${post.id}:${platform}:${res.kind}:${attempts}`, `${post.kind} ${post.id} on ${platform} ${res.kind}: ${res.error}; ${next}.`);
      }
    }
  };

  const renderStored = async (post: PostRecord): Promise<Buffer | null> => {
    if (!post.card) return null;
    const r = await deps.render(buildCard({ ...post.card, logoDataUri: deps.logoDataUri }));
    if (post.image_sha256 && r.sha256 !== post.image_sha256) throw new Error(`re-rendered card of ${post.id} differs from the posted one`);
    return r.png;
  };

  // 1. Retries of today's refused deliveries.
  for (const post of postsOf(state, mode, date)) {
    if (!PLATFORMS.some((p) => post.deliveries[p]?.status === "failed" && deliveryPlan(post, p, config.maxAttempts) === "send")) continue;
    try {
      await deliver(post, await renderStored(post));
      outcome.posts.push(post.id);
    } catch (e) {
      outcome.failed = true;
      await alert(`${post.id}:rerender`, (e as Error).message);
    }
  }

  const publish = async (built: BuiltPost): Promise<boolean> => {
    const problems = checkTexts(built.post.kind, built.models, built.card, built.post.content, deps.sourceNames, mode);
    if (problems.length) {
      outcome.failed = true;
      await alert(`${built.post.id}:text-gate`, `${built.post.kind} not posted, text gate: ${problems.join("; ")}`);
      return false;
    }
    let png: Buffer | null = null;
    if (built.card) {
      const r = await deps.render(built.card);
      png = r.png;
      built.post.image_sha256 = r.sha256;
    }
    state.posts.push(built.post);
    deps.save(state);
    await deliver(built.post, png);
    outcome.posts.push(built.post.id);
    return true;
  };

  const task = deps.task && deps.task !== "auto" ? deps.task : t < minutes(config.exceptionFrom) ? "bulletin" : "exception";

  const fetchAndEvaluate = async (weekly: boolean): Promise<{ fetched: FetchedPage | null; e: BasketEvaluation | null; error: string | null }> => {
    try {
      const fetched = await deps.fetchPage();
      const e = evaluateBasket({ page: fetched.page, date, history: state.days, snapshotVersion: fetched.snapshotVersion, weekly, basket, config });
      return { fetched, e, error: null };
    } catch (err) {
      return { fetched: null, e: null, error: (err as Error).message };
    }
  };

  /** Re-fetch and confirm every suspicious move exactly; true when confirmed (or nothing to confirm). */
  const recheck = async (suspicious: readonly BasketLine[], weekly: boolean): Promise<boolean> => {
    if (!suspicious.length) return true;
    await deps.sleep(deps.recheckDelayMs ?? 45_000);
    const again = await fetchAndEvaluate(weekly);
    return Boolean(again.e && jumpsConfirmed(suspicious, again.e));
  };

  if (task === "bulletin") {
    const existing = findPost(state, postId(mode, date, "bulletin")) ?? findPost(state, postId(mode, date, "status"));
    if (existing) return { ...outcome, action: outcome.posts.length ? "posted" : "nothing", reason: `today's ${existing.kind} post already exists (${existing.id})` };
    if (t < minutes(config.bulletinFrom)) return { ...outcome, action: "wait", reason: `before ${config.bulletinFrom} Tehran` };
    const deadline = t >= minutes(config.bulletinDeadline);
    const saturday = weekday(date) === "Sat";
    const { fetched, e, error } = await fetchAndEvaluate(saturday);
    let problem: string | null = error ? `the price page could not be read: ${error}` : null;
    let stale = false;
    if (e && fetched) {
      const check = prePublishCheck(e, config);
      if (!fetched.page.rows.length) problem = "the price page has no readable price rows";
      else if (e.validCount === 0 && e.unitOk && e.lines.every((l) => l.reason === "no validated price of the day")) stale = true;
      else if (!check.ok) problem = check.problems.join("; ");
    }
    if (!problem && !stale && e) {
      const suspicious = suspiciousJumps(e, config);
      if (suspicious.length) {
        const ok = await recheck(suspicious, saturday);
        if (!ok) problem = `a change of ${config.suspiciousJumpPercent}% or more (${suspicious.map((s) => s.item.id).join(", ")}) was not confirmed by a second fetch`;
        else await alert("jumps-confirmed", `large daily change confirmed by a second fetch: ${suspicious.map((s) => `${s.item.id} ${s.daily!.exact.toFixed(2)}%`).join(", ")}.`);
      }
    }
    if (stale || problem) {
      const why = stale ? "no basket item has a price of the day yet" : problem!;
      if (!deadline) return { ...outcome, action: "wait", reason: `not ready: ${why}; next run (deadline ${config.bulletinDeadline})` };
      if (stale) {
        await alert("no-prices", `no validated prices of the day by ${config.bulletinDeadline} Tehran; no bulletin today.`);
        return { ...outcome, action: "no-prices", reason: why };
      }
      await alert("source-failed", `bulletin not posted: ${why}. A status notice goes to the channel.`);
      await publish(buildStatusPost(date, mode, at));
      return { ...outcome, action: "status", reason: why, failed: true };
    }
    const ev = e!;
    recordDay(state, { date, data_version: ev.data_version, snapshot_version: fetched!.snapshotVersion, fetched_at: fetched!.fetchedAt, rows: ev.rows }, config.historyDays);
    deps.save(state);
    const ok = await publish(buildBulletinPost(ev, mode, at, ev.data_version, deps.logoDataUri, config));
    return { ...outcome, action: ok ? "posted" : "hold", reason: ok ? `bulletin ${ev.validCount}/${ev.lines.length} items, data ${ev.data_version}` : "text gate failed" };
  }

  // Exception task.
  if (!deps.task || deps.task === "auto") {
    if (t < minutes(config.exceptionFrom) || t > minutes(config.exceptionUntil)) return { ...outcome, action: "skip", reason: "outside the exception window" };
  }
  const morning = findPost(state, postId(mode, date, "bulletin"));
  if (!morning || !PLATFORMS.some((p) => morning.deliveries[p]?.status === "sent")) return { ...outcome, action: "skip", reason: "no delivered morning bulletin today" };
  const { e, error } = await fetchAndEvaluate(false);
  if (!e) {
    await alert("exception-fetch", `exception check could not read the price page: ${error}`);
    return { ...outcome, action: "nothing", reason: `exception check: ${error}` };
  }
  const base = morningLines(morning, basket);
  const { trigger, moves } = exceptionMoves(base, e, config);
  if (!trigger) return { ...outcome, action: "nothing", reason: `${moves.length} basket item(s) moved ≥ ${config.exception.percent}% since the morning bulletin (need ${config.exception.items})` };
  const seq = nextExceptionSeq(state, mode, date, e.data_version, config.exception.maxPerDay);
  if ("skip" in seq) return { ...outcome, action: "nothing", reason: seq.skip };
  const big = moves.filter((m) => Math.abs(m.change.exact) >= config.suspiciousJumpPercent);
  if (big.length) {
    const asLines = big.map((m) => ({ item: m.item, status: "ok" as const, reason: null, row: m.now, daily: m.change, dailyBase: null, weekly: null, weeklyBase: null }));
    if (!(await recheck(asLines, false))) {
      await alert("exception-unconfirmed", "exception post held: a large move since the morning was not confirmed by a second fetch.");
      return { ...outcome, action: "hold", reason: "unconfirmed large move" };
    }
  }
  const ok = await publish(buildExceptionPost(e, base, moves, seq.seq, mode, nowDate, deps.logoDataUri, config));
  return { ...outcome, action: ok ? "posted" : "hold", reason: ok ? `exception ${seq.seq}: ${moves.length} item(s) moved` : "text gate failed" };
}
