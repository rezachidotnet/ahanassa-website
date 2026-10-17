import type { LivechatConfig } from "../../config/livechat.ts";

/**
 * W21.2 — loads the Odoo im_livechat widget on demand and opens it. Nothing here runs at page load: the first
 * call comes from a click on «چت با کارشناس» (components/livechat/livechat-button.tsx).
 *
 * Odoo's embed code is two classic scripts, in this order (Live Chat → Channels → Widget, Odoo 17+):
 *   1. /im_livechat/loader/<channel id> — sets `window.odoo.__session_info__.livechatData`, whose availability flag
 *      (`isAvailable`; `can_load_livechat` in later versions) is true only while an operator of the channel is online;
 *   2. /im_livechat/assets_embed.js — reads livechatData and mounts the widget: an element `.o-livechat-root`
 *      holding an open shadow root with Odoo's own launcher button `.o-livechat-LivechatButton`.
 * We add them as <script> elements (no inline script; the CSP allows the Odoo origin only while live chat is on),
 * then click Odoo's launcher, which opens the chat window.
 *
 * Outcomes: `open` (the chat window was asked to open; an operator is online), or an error reason —
 * `no_channel` (the loader ran but set no livechatData: wrong or deleted channel), `no_operator` (no operator
 * online: Odoo would mount no button), `script_error` (a script failed to load), `timeout` (no open within the
 * budget). The caller shows WhatsApp and the purchase list on any error. The selectors below are Odoo's
 * (W21.1 confirms them against the deployed Odoo 19); a change there surfaces as `timeout`, never as a dead page.
 */
export type LivechatError = "no_channel" | "no_operator" | "script_error" | "timeout";
export type LivechatResult = { ok: true } | { ok: false; reason: LivechatError };

export const ODOO_ROOT_SELECTOR = ".o-livechat-root";
export const ODOO_LAUNCHER_SELECTOR = ".o-livechat-LivechatButton";
/** An already open chat window (Odoo restores an ongoing conversation on its own). */
export const ODOO_CHAT_WINDOW_SELECTOR = ".o-mail-ChatWindow";
const POLL_MS = 100;

type OdooWindow = { odoo?: { __session_info__?: { livechatData?: unknown } } };

/** livechatData from the loader, or null when the loader set none (no such channel). */
export function readLivechatAvailability(win: unknown): { available: boolean } | null {
  const data = (win as OdooWindow | null)?.odoo?.__session_info__?.livechatData;
  if (!data || typeof data !== "object") return null;
  const flags = data as Record<string, unknown>;
  return { available: (flags.isAvailable ?? flags.can_load_livechat) === true };
}

/** Odoo's launcher inside the widget's shadow root, an open chat window, or null (not mounted yet). */
export function findOdooWidget(doc: Pick<Document, "querySelector">): { launcher: HTMLElement | null; chatOpen: boolean } | null {
  const shadow = doc.querySelector(ODOO_ROOT_SELECTOR)?.shadowRoot;
  if (!shadow) return null;
  const chatOpen = shadow.querySelector(ODOO_CHAT_WINDOW_SELECTOR) !== null;
  const launcher = shadow.querySelector<HTMLElement>(ODOO_LAUNCHER_SELECTOR);
  return launcher || chatOpen ? { launcher, chatOpen } : null;
}

function addScript(doc: Document, src: string, role: "loader" | "assets"): Promise<void> {
  return new Promise((resolve, reject) => {
    const script = doc.createElement("script");
    script.src = src;
    script.async = false;
    script.dataset.livechat = role;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error("script_error"));
    doc.head.appendChild(script);
  });
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

/** Polls until Odoo's widget is mounted, then opens the chat (clicks the launcher unless a window is already open). */
async function openWhenMounted(doc: Document, isCancelled: () => boolean): Promise<void> {
  for (;;) {
    if (isCancelled()) return;
    const widget = findOdooWidget(doc);
    if (widget) {
      if (!widget.chatOpen) widget.launcher?.click();
      return;
    }
    await sleep(POLL_MS);
  }
}

let loaded: Promise<LivechatResult> | null = null;

/**
 * Loads the widget (once per page; a failed attempt can be retried by another click) and opens the chat,
 * within `timeoutMs`. Never throws.
 */
export function openOdooLivechat(config: LivechatConfig, timeoutMs: number, win: Window = window): Promise<LivechatResult> {
  const doc = win.document;
  if (loaded) {
    return loaded.then(async (result) => {
      if (result.ok) await openWhenMounted(doc, () => false);
      return result;
    });
  }
  let cancelled = false;
  const attempt = (async (): Promise<LivechatResult> => {
    try {
      await addScript(doc, config.loaderUrl, "loader");
    } catch {
      return { ok: false, reason: "script_error" };
    }
    if (cancelled) return { ok: false, reason: "timeout" };
    const availability = readLivechatAvailability(win);
    if (!availability) return { ok: false, reason: "no_channel" };
    if (!availability.available) return { ok: false, reason: "no_operator" };
    // The bundle mounts the widget once per page: after a timed-out attempt it may still arrive, so never add it twice.
    if (!doc.querySelector('script[data-livechat="assets"]')) {
      try {
        await addScript(doc, config.assetsUrl, "assets");
      } catch {
        return { ok: false, reason: "script_error" };
      }
    }
    await openWhenMounted(doc, () => cancelled);
    return { ok: true };
  })();
  let timer: ReturnType<typeof setTimeout> | undefined;
  const timeout = new Promise<LivechatResult>((resolve) => {
    timer = setTimeout(() => {
      cancelled = true;
      resolve({ ok: false, reason: "timeout" });
    }, timeoutMs);
  });
  const result = Promise.race([attempt, timeout]).then((r) => {
    clearTimeout(timer);
    // Only a success is kept: after an error the next click starts over (the loader re-checks operator presence).
    if (!r.ok) loaded = null;
    else setOnline();
    return r;
  });
  loaded = result;
  return result;
}

/**
 * «An operator is online»: true only after Odoo's loader reported an available operator AND its widget mounted —
 * never assumed. Shared by every live-chat button on the page (useSyncExternalStore).
 */
let online = false;
const listeners = new Set<() => void>();

function setOnline(): void {
  online = true;
  for (const listener of listeners) listener();
}

export function isLivechatOnline(): boolean {
  return online;
}

export function subscribeLivechatOnline(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

/** Tests only. */
export function resetOdooLivechatForTests(): void {
  loaded = null;
  online = false;
}
