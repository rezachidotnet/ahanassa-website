import { SAFE_TOKEN } from "../analytics/events.ts";

/**
 * W21.2 — the live-chat dataLayer events (docs/analytics/GTM_SETUP.md), kept beside the live-chat button instead of
 * in lib/analytics/events.ts ANALYTICS_EVENTS, so a build with live chat off carries none of their bytes (the shared
 * events module is unchanged). Same privacy rules as buildEvent there: a fixed parameter allowlist, and a value
 * must be a short PII-free token (SAFE_TOKEN), else it is dropped.
 */
export const LIVECHAT_EVENTS = {
  /** The Odoo chat window opened after a click; `chat_location`: home_expert (expert section) | sticky (floating fa button). */
  chat_open: ["chat_location"],
  /**
   * The chat could not open and the WhatsApp / purchase-list links were shown instead; `chat_error`: no_operator
   * (no operator online) | no_channel (the loader set no channel) | script_error | timeout (8 s).
   */
  chat_load_error: ["chat_location", "chat_error"],
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
