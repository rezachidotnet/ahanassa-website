/**
 * W41 — which story item a Tehran day shows. Stateless and deterministic: the sequence is built from the config,
 * and a day's item is the sequence entry at its working-day index (Sat–Thu, holidays skipped, the W23/W31 calendar)
 * since `rotationStart`. Fridays and holidays have no story and do not advance the rotation.
 */
import { STORY_CONFIG, STORY_ITEMS, type StoryGroup, type StoryItem } from "../../config/raw-material-stories.ts";
import { addDays, dayKind } from "../price-channel/calendar.ts";

/** Enabled and with at least 2 facts. */
export const isReady = (item: StoryItem) => item.enabled && item.facts.length >= 2;

/** Items left out of the rotation because they have no (or too few) facts. */
export const needsFacts = (items: readonly StoryItem[] = STORY_ITEMS) => items.filter((i) => i.enabled && i.facts.length < 2);

/**
 * The rotation sequence. "mixed": the groups interleaved by smooth weighted round-robin (each group's share of the
 * days follows its item count, spread as evenly as possible; within a group, the config order). "as-listed": the
 * ready items in config order.
 */
export function storySequence(items: readonly StoryItem[] = STORY_ITEMS, order: "mixed" | "as-listed" = STORY_CONFIG.order): StoryItem[] {
  const ready = items.filter(isReady);
  if (order === "as-listed") return ready;
  const groups = [...new Set(ready.map((i) => i.group))];
  const queues = new Map<StoryGroup, StoryItem[]>(groups.map((g) => [g, ready.filter((i) => i.group === g)]));
  const weight = new Map(groups.map((g) => [g, queues.get(g)!.length]));
  const current = new Map(groups.map((g) => [g, 0]));
  const out: StoryItem[] = [];
  for (let k = 0; k < ready.length; k++) {
    let pick: StoryGroup | null = null;
    for (const g of groups) {
      current.set(g, current.get(g)! + weight.get(g)!);
      if (!pick || current.get(g)! > current.get(pick)!) pick = g;
    }
    current.set(pick!, current.get(pick!)! - ready.length);
    out.push(queues.get(pick!)!.shift()!);
  }
  return out;
}

/** The longest run of one group in the sequence, counted cyclically (the rotation wraps around). */
export function longestGroupRun(seq: readonly StoryItem[]): number {
  if (!seq.length) return 0;
  if (seq.every((i) => i.group === seq[0].group)) return seq.length;
  let best = 0;
  let run = 0;
  for (let k = 0; k < seq.length * 2; k++) {
    const i = seq[k % seq.length];
    run = k > 0 && i.group === seq[(k - 1) % seq.length].group ? run + 1 : 1;
    best = Math.max(best, run);
  }
  return Math.min(best, seq.length);
}

/** Working days from `start` up to (not including) `day`; 0 when `day` is on or before `start`. */
export function workingDayIndex(day: string, start: string = STORY_CONFIG.rotationStart): number {
  let n = 0;
  for (let d = start; d < day; d = addDays(d, 1)) if (dayKind(d) === "price-day") n++;
  return n;
}

/** The item of a Tehran working day, or null when nothing is ready. */
export function storyItemFor(day: string, items: readonly StoryItem[] = STORY_ITEMS, config: { rotationStart: string; order: "mixed" | "as-listed" } = STORY_CONFIG): StoryItem | null {
  const seq = storySequence(items, config.order);
  if (!seq.length) return null;
  return seq[workingDayIndex(day, config.rotationStart) % seq.length];
}

/** The next `count` working days from `from` (inclusive) with their items: for the dry run and the report. */
export function upcoming(from: string, count: number, items: readonly StoryItem[] = STORY_ITEMS, config: { rotationStart: string; order: "mixed" | "as-listed" } = STORY_CONFIG): Array<{ date: string; item: StoryItem | null }> {
  const out: Array<{ date: string; item: StoryItem | null }> = [];
  for (let d = from; out.length < count; d = addDays(d, 1)) if (dayKind(d) === "price-day") out.push({ date: d, item: storyItemFor(d, items, config) });
  return out;
}
