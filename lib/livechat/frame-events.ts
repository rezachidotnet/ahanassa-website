/**
 * W21.2 — the messages the Odoo chat frame posts to the site (ahanassa-odoo PR #29, docs/runbooks/W21_1_LIVECHAT.md §6;
 * addons/ahanassa_livechat/static/src/embed/frame.js): `{source: "ahanassa-livechat", event}`, posted only to the
 * framing origin. Pure and import-free (unit-tested); components/livechat/livechat-button.tsx acts on the result.
 *
 * - `ready`: the widget started and the chat is open → stop the spinner and the 18 s fallback timer;
 * - `opened`: the chat window is open (after ready) → nothing;
 * - `minimized`: the visitor pressed – in the chat header (the frame reopened it inside) → hide the panel, keep the iframe;
 * - `closed`: the visitor ended the chat → hide the panel and remove the iframe (the next click starts a new chat).
 */
export const LIVECHAT_FRAME_SOURCE = "ahanassa-livechat";
export const LIVECHAT_FRAME_EVENTS = ["ready", "opened", "minimized", "closed"] as const;
export type LivechatFrameEvent = (typeof LIVECHAT_FRAME_EVENTS)[number];

/** The frame event of a message, or null: only from `origin` (https://odoo.ahanassa.com), only this source and these events. */
export function livechatFrameEvent(messageOrigin: string, data: unknown, origin: string): LivechatFrameEvent | null {
  if (messageOrigin !== origin || typeof data !== "object" || data === null) return null;
  const { source, event } = data as { source?: unknown; event?: unknown };
  if (source !== LIVECHAT_FRAME_SOURCE || typeof event !== "string") return null;
  return (LIVECHAT_FRAME_EVENTS as readonly string[]).includes(event) ? (event as LivechatFrameEvent) : null;
}

/**
 * The status page's one message (§6.3/§6.4, https://odoo.ahanassa.com/im_livechat/status/<channel>):
 * `{type: "ahanassa-livechat-status", online: boolean}` — online = a chat started now reaches a person (an operator
 * online, in hours, under the session limit). Returns `online`, or null for anything else (wrong origin, shape or
 * type; extra keys are ignored, as §6.4 allows them to be added later).
 */
export const LIVECHAT_STATUS_TYPE = "ahanassa-livechat-status";

export function livechatStatusMessage(messageOrigin: string, data: unknown, origin: string): boolean | null {
  if (messageOrigin !== origin || typeof data !== "object" || data === null) return null;
  const { type, online } = data as { type?: unknown; online?: unknown };
  return type === LIVECHAT_STATUS_TYPE && typeof online === "boolean" ? online : null;
}
