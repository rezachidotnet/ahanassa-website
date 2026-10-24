/**
 * W41 — one run of the daily Bale story (scripts/bale-story/run.ts is the CLI; the workflow on main calls it at
 * 09:00 Tehran, 05:30 UTC). Everything is injected (clock, Bale API, owner alerts, state, render), so the decisions
 * are tested offline.
 *
 * A run, in STORY_MODE owner or owner+channel, on a Tehran working day (Sat–Thu, not a configured holiday):
 *   1. before 09:00 → wait; after 18:00 a story never attempted today is given up and the owner told;
 *   2. the item of the day (rotation.ts; a retry reuses the item already recorded for today);
 *   3. builds the 1080×1920 image + captions and gates every text (no price/claim, source names — required);
 *   4. sends the image to BALE_OWNER_CHAT_ID (sendPhoto, caption «استوری امروز …» + a suggested story text), and in
 *      owner+channel mode also to BALE_CHANNEL_ID as a normal post with the facts and an RFQ button.
 * Idempotent per day and target (state.ts). Every failure alerts the owner (Bale owner chat and/or Telegram).
 */
import { STORY_CONFIG, STORY_ITEMS, type StoryItem } from "../../config/raw-material-stories.ts";
import type { BotApi, SendResult } from "../price-channel/bots.ts";
import { dayKind, minutes, tehranDate, tehranTime } from "../price-channel/calendar.ts";
import { buildStory, type StoryCard } from "./card.ts";
import { channelCaption, channelKeyboard, ownerCaption, storyGate, storyLinks } from "./compose.ts";
import { storyItemFor } from "./rotation.ts";
import { claimStoryAlert, pruneStory, recordId, storyPlan, type StoryMode, type StoryRecord, type StoryState, type StoryTarget } from "./state.ts";

export interface StorySecrets {
  BALE_BOT_TOKEN?: string;
  BALE_OWNER_CHAT_ID?: string;
  BALE_CHANNEL_ID?: string;
}

export interface StoryDeps {
  now: () => Date;
  mode: StoryMode;
  secrets: StorySecrets;
  bale: BotApi | undefined;
  owner: ((text: string) => Promise<void>) | null;
  state: StoryState;
  save: (state: StoryState) => void;
  logoDataUri: string;
  render: (card: StoryCard) => Promise<{ png: Buffer; sha256: string }>;
  sourceNames: readonly string[] | null;
  log?: (line: string) => void;
  items?: readonly StoryItem[];
  config?: typeof STORY_CONFIG;
}

export interface StoryOutcome {
  action: "off" | "skip" | "wait" | "sent" | "nothing" | "hold" | "failed";
  reason: string;
  /** A delivery failed/is uncertain, the gate refused, or nothing could be sent: the job turns red. */
  failed: boolean;
  item: string | null;
  records: string[];
}

export function storyTargets(mode: StoryMode): StoryTarget[] {
  return mode === "owner+channel" ? ["owner", "channel"] : mode === "owner" ? ["owner"] : [];
}

/** The chat of a target; null = not configured. */
export function storyChat(target: StoryTarget, s: StorySecrets): string | null {
  const v = target === "owner" ? s.BALE_OWNER_CHAT_ID : s.BALE_CHANNEL_ID;
  return v && v.trim() ? v.trim() : null;
}

/** The image, captions and buttons of an item, and the gate's verdict. Pure apart from nothing: no render here. */
export function buildStoryPost(item: StoryItem, logoDataUri: string, sourceNames: readonly string[] | null, required: boolean, config = STORY_CONFIG) {
  const links = storyLinks(item, config);
  const card = buildStory(item, links, logoDataUri);
  const captions = { owner: ownerCaption(item, links), channel: channelCaption(item, links) };
  const keyboards = {
    // The owner's button opens the page without UTM tags, so his own taps are not counted as story traffic.
    owner: { inline_keyboard: [[{ text: "صفحهٔ مقصد QR", url: `${config.origin}${item.page ?? config.requestPath}` }]] },
    channel: channelKeyboard(links),
  };
  const problems = storyGate([...card.texts, captions.owner, captions.channel], sourceNames, required);
  return { links, card, captions, keyboards, problems };
}

export async function runStory(deps: StoryDeps): Promise<StoryOutcome> {
  const config = deps.config ?? STORY_CONFIG;
  const items = deps.items ?? STORY_ITEMS;
  const log = deps.log ?? ((l: string) => console.log(l));
  const nowDate = deps.now();
  const at = nowDate.toISOString();
  const date = tehranDate(nowDate);
  const t = minutes(tehranTime(nowDate));
  const state = deps.state;
  const outcome: StoryOutcome = { action: "nothing", reason: "", failed: false, item: null, records: [] };

  if (deps.mode === "off") return { ...outcome, action: "off", reason: "STORY_MODE is off" };
  const kind = dayKind(date);
  if (kind !== "price-day") return { ...outcome, action: "skip", reason: `${date} is a ${kind}: no story` };
  if (t < minutes(config.sendFrom)) return { ...outcome, action: "wait", reason: `before ${config.sendFrom} Tehran` };
  pruneStory(state, date, config.historyDays);

  const alert = async (key: string, text: string) => {
    if (!claimStoryAlert(state, `${date}:${key}`, at)) return;
    deps.save(state);
    log(`owner alert: ${text}`);
    try {
      await deps.owner?.(`[Ahan Asa Bale story · ${deps.mode} · ${date}] ${text}`);
    } catch (e) {
      log(`owner alert could not be sent: ${(e as Error).message}`);
    }
  };

  const today = state.records.filter((r) => r.date === date);
  const item = today[0]?.item ?? storyItemFor(date, items, config);
  if (!item) {
    await alert("no-item", "no story item is ready (every item is disabled or needs facts); nothing sent.");
    return { ...outcome, action: "failed", reason: "no ready story item", failed: true };
  }
  outcome.item = item.id;

  const todo: StoryTarget[] = [];
  for (const target of storyTargets(deps.mode)) {
    const rec = today.find((r) => r.target === target);
    const plan = storyPlan(rec, config.maxAttempts);
    if (plan === "done") continue;
    if (plan === "uncertain" || plan === "gave-up") {
      outcome.failed = true;
      await alert(`${target}:${plan}`, `story ${recordId(date, target)}: ${plan === "uncertain" ? "delivery uncertain (no answer from Bale); not resent automatically — check the chat" : "gave up after repeated Bale API errors"}.`);
      continue;
    }
    if (!rec && t > minutes(config.sendUntil)) {
      outcome.failed = true;
      await alert(`${target}:late`, `no story was sent to the ${target} chat by ${config.sendUntil} Tehran (the scheduled run did not start in time); today is skipped.`);
      continue;
    }
    todo.push(target);
  }
  if (!todo.length) return { ...outcome, action: outcome.failed ? "failed" : "nothing", reason: outcome.failed ? "nothing sendable (see the owner alerts)" : `today's story (${item.id}) was already sent` };

  const built = buildStoryPost(item, deps.logoDataUri, deps.sourceNames, true, config);
  if (built.problems.length) {
    await alert("gate", `story ${item.id} not sent, text gate: ${built.problems.join("; ")}`);
    return { ...outcome, action: "hold", reason: `text gate: ${built.problems.join("; ")}`, failed: true };
  }
  const image = await deps.render(built.card);
  const stored = today.find((r) => r.image_sha256);
  if (stored && stored.image_sha256 !== image.sha256) {
    await alert("rerender", `story ${item.id}: the re-rendered image differs from the one already sent today; not sent.`);
    return { ...outcome, action: "failed", reason: "re-rendered image differs", failed: true };
  }

  for (const target of todo) {
    const chat = storyChat(target, deps.secrets);
    if (!chat || !deps.bale) {
      outcome.failed = true;
      await alert(`${target}:not-configured`, `Bale ${target} chat is not configured (BALE_BOT_TOKEN or ${target === "owner" ? "BALE_OWNER_CHAT_ID" : "BALE_CHANNEL_ID"} missing); skipped.`);
      continue;
    }
    const id = recordId(date, target);
    let rec = state.records.find((r) => r.id === id);
    if (!rec) {
      rec = { id, date, target, item, image_sha256: image.sha256, caption: built.captions[target], delivery: null } satisfies StoryRecord;
      state.records.push(rec);
    }
    const attempts = (rec.delivery?.attempts ?? 0) + 1;
    rec.delivery = { status: "pending", attempts, at };
    deps.save(state);
    let res: SendResult;
    try {
      res = await deps.bale.sendPhoto(chat, image.png, rec.caption, built.keyboards[target]);
    } catch (e) {
      res = { kind: "uncertain", error: `send threw: ${(e as Error).name}` };
    }
    const doneAt = deps.now().toISOString();
    rec.delivery = res.kind === "sent" ? { status: "sent", attempts, at: doneAt, message_id: res.messageId } : { status: res.kind, attempts, at: doneAt, error: res.error };
    const entry = { at: doneAt, id, item_id: item.id, image_sha256: image.sha256, result: res.kind, ...(res.kind === "sent" ? { message_id: res.messageId } : { error: res.error }) };
    state.log.push(entry);
    deps.save(state);
    log(JSON.stringify({ event: "story-send", ...entry }));
    if (res.kind === "sent") outcome.records.push(id);
    else {
      outcome.failed = true;
      const last = res.kind === "failed" && attempts >= config.maxAttempts;
      const next = res.kind === "uncertain" ? "not resent automatically — check the chat" : last ? "gave up" : `retried on the next run (attempt ${attempts} of ${config.maxAttempts})`;
      await alert(last ? `${target}:gave-up` : `${target}:${res.kind}:${attempts}`, `story ${id} (${item.id}) ${res.kind}: ${res.error}; ${next}.`);
    }
  }
  const action = outcome.records.length ? "sent" : "failed";
  return { ...outcome, action, reason: outcome.records.length ? `story ${item.id} sent to ${outcome.records.join(", ")}` : `story ${item.id}: nothing delivered` };
}
