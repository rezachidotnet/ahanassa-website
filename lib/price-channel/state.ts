/**
 * W23 — the channel's durable state: the basket history (one validated observation per price day), every composed
 * post with its per-platform delivery, the send log and the owner alerts already sent. The workflow keeps it as a
 * rolling GitHub Actions artifact (download before the run, upload after it, always), one run at a time.
 *
 * Idempotency: a post has a stable id (mode, Tehran day, kind, sequence) and each platform's delivery moves
 *   (none) → pending → sent | failed | uncertain
 * and the state is saved BEFORE every API call. Only a definite API refusal (`failed`: the API answered ok=false)
 * is retried, up to maxAttempts. A delivery left `pending` (the run died mid-call) or `uncertain` (network error or
 * timeout: the post may be up) is never sent again automatically — the owner is alerted instead. So a retry can
 * never duplicate a post. Telegram and Bale are tracked separately: one failing never blocks the other.
 */
import type { BasketItem } from "../../config/price-channel.ts";
import type { DayObservation, ObservedRow } from "./basket.ts";
import type { CardInput } from "./card.ts";
import type { Platform, PostKind } from "./compose.ts";

export const STATE_SCHEMA = "price-channel-state.v1" as const;
export type Mode = "off" | "test" | "public";
export type DeliveryStatus = "pending" | "sent" | "failed" | "uncertain";

export interface Delivery {
  status: DeliveryStatus;
  attempts: number;
  at: string;
  message_id?: number;
  error?: string;
}

export interface PlatformContent {
  /** The caption (photo) or text (status notice), exactly as sent. */
  text: string;
  keyboard: { inline_keyboard: Array<Array<{ text: string; url: string }>> };
}

export interface PostRecord {
  id: string;
  mode: Exclude<Mode, "off">;
  date: string;
  kind: PostKind;
  seq: number;
  data_version: string | null;
  created_at: string;
  /** The card without its logo (re-rendered byte-identically for a retry); null for a text-only status notice. */
  card: Omit<CardInput, "logoDataUri"> | null;
  image_sha256: string | null;
  content: Record<Platform, PlatformContent>;
  /** The basket rows the post showed (the exception check compares against the morning bulletin's). */
  basis: Array<{ item_id: string; row: ObservedRow | null }>;
  deliveries: Partial<Record<Platform, Delivery>>;
}

export interface SendLogEntry {
  at: string;
  post_id: string;
  platform: Platform;
  mode: Exclude<Mode, "off">;
  kind: PostKind;
  data_version: string | null;
  text: string;
  image_sha256: string | null;
  result: DeliveryStatus | "skipped";
  message_id?: number;
  error?: string;
}

export interface ChannelState {
  schema: typeof STATE_SCHEMA;
  days: DayObservation[];
  posts: PostRecord[];
  log: SendLogEntry[];
  alerts: Array<{ key: string; at: string }>;
}

export function emptyState(): ChannelState {
  return { schema: STATE_SCHEMA, days: [], posts: [], log: [], alerts: [] };
}

/** Parses a saved state; throws on anything else (the workflow then stops instead of starting over and re-posting). */
export function parseState(raw: unknown): ChannelState {
  const s = raw as Partial<ChannelState> | null;
  if (!s || s.schema !== STATE_SCHEMA || !Array.isArray(s.days) || !Array.isArray(s.posts) || !Array.isArray(s.log) || !Array.isArray(s.alerts)) throw new Error(`not a ${STATE_SCHEMA} file`);
  return s as ChannelState;
}

export const postId = (mode: Exclude<Mode, "off">, date: string, kind: PostKind, seq = 0) => `${mode}:${date}:${kind}:${seq}`;

export function findPost(state: ChannelState, id: string): PostRecord | undefined {
  return state.posts.find((p) => p.id === id);
}

export function postsOf(state: ChannelState, mode: Exclude<Mode, "off">, date: string, kind?: PostKind): PostRecord[] {
  return state.posts.filter((p) => p.mode === mode && p.date === date && (!kind || p.kind === kind));
}

export type DeliveryPlan = "send" | "done" | "uncertain" | "gave-up";

/** What to do with one platform of one post. */
export function deliveryPlan(post: PostRecord, platform: Platform, maxAttempts: number): DeliveryPlan {
  const d = post.deliveries[platform];
  if (!d) return "send";
  if (d.status === "sent") return "done";
  if (d.status === "failed") return d.attempts < maxAttempts ? "send" : "gave-up";
  return "uncertain";
}

/** The next exception post of the day: null when the cap is reached or this data was already posted. */
export function nextExceptionSeq(state: ChannelState, mode: Exclude<Mode, "off">, date: string, dataVersion: string, maxPerDay: number): { seq: number } | { skip: string } {
  const done = postsOf(state, mode, date, "exception");
  if (done.some((p) => p.data_version === dataVersion)) return { skip: "an exception post for this exact data already exists" };
  if (done.length >= maxPerDay) return { skip: `the daily cap of ${maxPerDay} exception posts is reached` };
  return { seq: done.length + 1 };
}

/** Adds (or replaces) a day's observation and drops days older than `keepDays`. */
export function recordDay(state: ChannelState, day: DayObservation, keepDays: number): void {
  const oldest = new Date(Date.parse(`${day.date}T00:00:00Z`) - keepDays * 86_400_000).toISOString().slice(0, 10);
  state.days = [...state.days.filter((d) => d.date !== day.date && d.date >= oldest), day].sort((a, b) => (a.date < b.date ? -1 : 1));
}

/** True the first time an alert key is seen (then remembered). */
export function claimAlert(state: ChannelState, key: string, at: string): boolean {
  if (state.alerts.some((a) => a.key === key)) return false;
  state.alerts.push({ key, at });
  state.alerts = state.alerts.slice(-500);
  return true;
}

/** Keeps the state bounded: posts/logs of the history window only. */
export function prune(state: ChannelState, today: string, keepDays: number): void {
  const oldest = new Date(Date.parse(`${today}T00:00:00Z`) - keepDays * 86_400_000).toISOString().slice(0, 10);
  state.posts = state.posts.filter((p) => p.date >= oldest);
  state.log = state.log.filter((l) => l.at.slice(0, 10) >= oldest);
}

export function basisOf(lines: ReadonlyArray<{ item: BasketItem; row: ObservedRow | null }>): PostRecord["basis"] {
  return lines.map((l) => ({ item_id: l.item.id, row: l.row }));
}
