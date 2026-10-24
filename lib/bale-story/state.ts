/**
 * W41 — the story's durable state (a rolling GitHub Actions artifact, like the price channel's): one record per
 * Tehran day and target (the owner's private chat, the channel), its delivery and the owner alerts already sent.
 *
 * Idempotency is the W23 rule: a record's id is `<date>:<target>`, the state is saved BEFORE the API call, and only
 * a definite API refusal (`failed`) is retried, up to maxAttempts; a delivery left `pending` (the run died) or
 * `uncertain` (no answer: it may be up) is never re-sent automatically — the owner is alerted instead. The id
 * carries no mode, so switching STORY_MODE from owner to owner+channel the same day only adds the channel post.
 */
import type { StoryItem } from "../../config/raw-material-stories.ts";
import type { Delivery } from "../price-channel/state.ts";

export const STORY_STATE_SCHEMA = "bale-story-state.v1" as const;
export type StoryMode = "off" | "owner" | "owner+channel";
export type StoryTarget = "owner" | "channel";

export interface StoryRecord {
  id: string;
  date: string;
  target: StoryTarget;
  /** The item as sent (re-rendered byte-identically for a retry even if the config changed since). */
  item: StoryItem;
  image_sha256: string;
  caption: string;
  delivery: Delivery | null;
}

export interface StoryState {
  schema: typeof STORY_STATE_SCHEMA;
  records: StoryRecord[];
  log: Array<{ at: string; id: string; item_id: string; image_sha256: string; result: Delivery["status"]; message_id?: number; error?: string }>;
  alerts: Array<{ key: string; at: string }>;
}

export const emptyStoryState = (): StoryState => ({ schema: STORY_STATE_SCHEMA, records: [], log: [], alerts: [] });

export function parseStoryState(raw: unknown): StoryState {
  const s = raw as Partial<StoryState> | null;
  if (!s || s.schema !== STORY_STATE_SCHEMA || !Array.isArray(s.records) || !Array.isArray(s.log) || !Array.isArray(s.alerts)) throw new Error(`not a ${STORY_STATE_SCHEMA} file`);
  return s as StoryState;
}

export const parseStoryMode = (v: string | undefined): StoryMode => (v === "owner" || v === "owner+channel" ? v : "off");

export const recordId = (date: string, target: StoryTarget) => `${date}:${target}`;

export type StoryPlan = "send" | "done" | "uncertain" | "gave-up";

export function storyPlan(record: StoryRecord | undefined, maxAttempts: number): StoryPlan {
  const d = record?.delivery;
  if (!d) return "send";
  if (d.status === "sent") return "done";
  if (d.status === "failed") return d.attempts < maxAttempts ? "send" : "gave-up";
  return "uncertain";
}

export function claimStoryAlert(state: StoryState, key: string, at: string): boolean {
  if (state.alerts.some((a) => a.key === key)) return false;
  state.alerts.push({ key, at });
  state.alerts = state.alerts.slice(-500);
  return true;
}

export function pruneStory(state: StoryState, today: string, keepDays: number): void {
  const oldest = new Date(Date.parse(`${today}T00:00:00Z`) - keepDays * 86_400_000).toISOString().slice(0, 10);
  state.records = state.records.filter((r) => r.date >= oldest);
  state.log = state.log.filter((l) => l.at.slice(0, 10) >= oldest);
}
