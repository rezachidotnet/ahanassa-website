/**
 * Live chat (W21.2) — the ONE place the Odoo live chat is switched on. Website side only: the Odoo side (W21.1,
 * ahanassa-odoo PR #29: the im_livechat channel, its operators and chatbot) is deployed separately. W21.2 shipped OFF; W21.3 switched it ON.
 *
 * Owner decision 2026-10-17: no Odoo JS on the site and no 'unsafe-eval' — the chat is Odoo's own support page in
 * an iframe panel (components/livechat/livechat-button.tsx), opened only by a click on «چت با کارشناس». The only
 * CSP change while on is `frame-src https://odoo.ahanassa.com` (lib/security/headers.ts).
 *
 * The contract is ahanassa-odoo PR #29, docs/runbooks/W21_1_LIVECHAT.md §6: the frame URL below plus `?lang=&page=`,
 * and the frame's postMessage events (ready / opened / minimized / closed).
 *
 * Switching on = both values below in one commit: LIVECHAT_ENABLED = true AND LIVECHAT_FRAME_URL = the channel's
 * support page from W21.1's D6 step (`env.ref('ahanassa_livechat.channel_sales').id`; it is not 1). A flag alone, a
 * URL alone, or any other URL keeps everything off — no button that goes nowhere.
 *
 * Why a committed config and not a per-target env var: the staging and production artifacts must be
 * byte-identical outside the r4 allowlist (lib/static/target-diff-gate.ts), like config/analytics.ts.
 */
export const LIVECHAT_ENABLED: boolean = true;

/**
 * W21.3 (2026-10-22): the production channel's support page — channel_sales = 2 (W21.1 D6), verified live by the owner
 * (a chat creates a CRM lead). Validated by LIVECHAT_FRAME_URL_PATTERN (§6).
 */
export const LIVECHAT_FRAME_URL: string | null = "https://odoo.ahanassa.com/im_livechat/support/2";

/** The only origin the chat may load from; the CSP frame-src allows exactly this origin. */
export const LIVECHAT_ORIGIN = "https://odoo.ahanassa.com";

/** The `page` sent to Odoo when the site itself is not served over https (local preview): never an http:// URL. */
export const LIVECHAT_PAGE_ORIGIN = "https://www.ahanassa.com";

/**
 * The click → ready budget: past it, the visitor gets the WhatsApp / purchase-list links instead. W21.3: 18 s, not
 * W21.2's 8 s — the first load of a language takes 9–15 s on Odoo's single HTTP worker (measured live 2026-10-22;
 * warm loads ≈ 2 s); the panel says «در حال اتصال به کارشناس…» meanwhile.
 */
export const LIVECHAT_TIMEOUT_MS = 18_000;

/** The status page's budget (§6.3): no message within it → the hidden frame is removed and no teaser shows. */
export const LIVECHAT_STATUS_TIMEOUT_MS = 5_000;

export interface LivechatConfig {
  origin: string;
  /** https://odoo.ahanassa.com/im_livechat/support/<channel id> — `?lang=…&page=…` is added at click time. */
  supportUrl: string;
  /**
   * https://odoo.ahanassa.com/im_livechat/status/<channel id> (§6.3, same channel id): a hidden frame that posts one
   * {type: "ahanassa-livechat-status", online} message — online = a chat started now reaches a person. The teaser only.
   */
  statusUrl: string;
}

/** The frame base URL as §6 validates it: exactly https://odoo.ahanassa.com/im_livechat/support/<digits>. */
export const LIVECHAT_FRAME_URL_PATTERN = /^https:\/\/odoo\.ahanassa\.com\/im_livechat\/support\/(\d+)$/;

/** The effective config, or null (off). Only a frame URL matching §6 passes; the status page uses its channel id. */
export function livechatConfig(enabled: boolean = LIVECHAT_ENABLED, frameUrl: string | null = LIVECHAT_FRAME_URL): LivechatConfig | null {
  const channel = enabled && frameUrl ? LIVECHAT_FRAME_URL_PATTERN.exec(frameUrl)?.[1] : undefined;
  if (!channel) return null;
  const origin = LIVECHAT_ORIGIN;
  return { origin, supportUrl: frameUrl!, statusUrl: `${origin}/im_livechat/status/${channel}` };
}

/** The chat iframe's URL for a page: `lang` = the page locale, `page` = the page's https URL without query or hash. */
export function livechatFrameUrl(config: LivechatConfig, locale: "fa" | "en" | "ar", pageUrl: string): string {
  return `${config.supportUrl}?lang=${locale}&page=${encodeURIComponent(pageUrl)}`;
}

/** The CSP frame-src origin while on (https only), else null. */
export function livechatFrameOrigin(config: LivechatConfig | null = livechatConfig()): string | null {
  return config ? config.origin : null;
}
