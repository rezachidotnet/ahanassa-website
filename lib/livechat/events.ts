import { SAFE_TOKEN } from "../analytics/events.ts";

/**
 * W21.2 — the live-chat dataLayer events (docs/analytics/GTM_SETUP.md), kept beside the live-chat button instead of
 * in lib/analytics/events.ts ANALYTICS_EVENTS, so a build with live chat off carries none of their bytes (the shared
 * events module is unchanged). Same privacy rules as buildEvent there: a fixed parameter allowlist, and a value
 * must be a short PII-free token (SAFE_TOKEN), else it is dropped.
 */
export const LIVECHAT_EVENTS = {
  /** The chat panel opened and Odoo's chat page loaded in it; `chat_location`: home_expert (expert section) | sticky (floating fa button). */
  chat_open: ["chat_location"],
  /** Odoo's chat page did not load within 18 s (W21.3; W21.2: 8 s) and the WhatsApp / purchase-list links were shown instead; `chat_error`: timeout. */
  chat_load_error: ["chat_location", "chat_error"],
  /**
   * The floating button's teaser appeared (Odoo reported an operator online, in sales hours, once per session);
   * `chat_teaser`: bubble (desktop) | dot (mobile); `chat_trigger`: dwell (45 s on a price/product/chart page) | second_product.
   */
  chat_teaser_shown: ["chat_location", "chat_teaser", "chat_trigger"],
} as const satisfies Record<string, readonly string[]>;

export type LivechatEventName = keyof typeof LIVECHAT_EVENTS;
export type LivechatEventParams<E extends LivechatEventName> = Partial<Record<(typeof LIVECHAT_EVENTS)[E][number], string>>;

export function buildLivechatEvent<E extends LivechatEventName>(event: E, params: LivechatEventParams<E>): Record<string, string> {
  const out: Record<string, string> = { event };
  const allowed: readonly string[] = LIVECHAT_EVENTS[event];
  for (const [key, value] of Object.entries(params as Record<string, unknown>)) {
    if (allowed.includes(key) && typeof value === "string" && SAFE_TOKEN.test(value)) out[key] = value;
  }
  return out;
}

/** Pushes one event to `window.dataLayer` (created if missing). A no-op outside the browser; never throws. */
export function trackLivechatEvent<E extends LivechatEventName>(event: E, params: LivechatEventParams<E>): void {
  if (typeof window === "undefined") return;
  try {
    const w = window as unknown as { dataLayer?: unknown[] };
    (w.dataLayer ??= []).push(buildLivechatEvent(event, params));
  } catch {
    // Measurement must never break the page.
  }
}
