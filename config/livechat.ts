/**
 * Live chat (W21.2) — the ONE place the Odoo im_livechat widget is switched on. Website side only: the
 * Odoo side (W21.1, the im_livechat channel and its operators) is deployed separately, so this ships OFF.
 *
 * Switching on = both values below in one commit: LIVECHAT_ENABLED = true AND LIVECHAT_LOADER_URL = the
 * channel's loader URL from Odoo (Live Chat → Channels → the channel → Widget tab, the first <script src>).
 * A flag alone, a URL alone, or a URL on any other origin keeps everything off — no button that goes nowhere.
 *
 * While off the site carries none of it: no button, no client JS, no Odoo origin in the CSP
 * (lib/security/headers.ts). While on, the page still loads NO Odoo JS until a visitor clicks
 * «چت با کارشناس» (components/livechat/livechat-button.tsx, lib/livechat/odoo-widget.ts).
 *
 * Why a committed config and not a per-target env var: the staging and production artifacts must be
 * byte-identical outside the r4 allowlist (lib/static/target-diff-gate.ts), like config/analytics.ts.
 */
export const LIVECHAT_ENABLED: boolean = false;

/** e.g. "https://odoo.ahanassa.com/im_livechat/loader/1" — the channel id comes from W21.1. */
export const LIVECHAT_LOADER_URL: string | null = null;

/** The only origin the widget may load from; the CSP allows exactly this origin (and its wss://). */
export const LIVECHAT_ORIGIN = "https://odoo.ahanassa.com";

/** The click → open budget: past it, the visitor gets the WhatsApp / purchase-list links instead. */
export const LIVECHAT_TIMEOUT_MS = 8_000;

export interface LivechatConfig {
  /** https://odoo.ahanassa.com/im_livechat/loader/<channel id> — sets `odoo.__session_info__.livechatData`. */
  loaderUrl: string;
  /** The widget bundle that reads livechatData and mounts the chat (Odoo 17+ embed code, second <script>). */
  assetsUrl: string;
  origin: string;
}

const LOADER_PATH = /^\/im_livechat\/loader\/\d+$/;

/** The effective config, or null (off). Only a loader URL on LIVECHAT_ORIGIN, path /im_livechat/loader/<id>, passes. */
export function livechatConfig(enabled: boolean = LIVECHAT_ENABLED, loaderUrl: string | null = LIVECHAT_LOADER_URL, origin: string = LIVECHAT_ORIGIN): LivechatConfig | null {
  if (!enabled || !loaderUrl) return null;
  let url: URL;
  try {
    url = new URL(loaderUrl);
  } catch {
    return null;
  }
  if (url.origin !== origin || !LOADER_PATH.test(url.pathname) || url.search || url.hash || url.username || url.password) return null;
  return { loaderUrl: url.href, assetsUrl: `${origin}/im_livechat/assets_embed.js`, origin };
}

/** The CSP origins while on: the https origin and its websocket (Odoo's bus runs on wss://<host>/websocket). */
export function livechatCspOrigins(config: LivechatConfig | null = livechatConfig()): { https: string; wss: string } | null {
  if (!config) return null;
  return { https: config.origin, wss: config.origin.replace(/^https:/, "wss:") };
}
