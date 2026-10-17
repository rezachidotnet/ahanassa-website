/**
 * Live chat (W21.2) — the ONE place the Odoo live chat is switched on. Website side only: the Odoo side (W21.1,
 * ahanassa-odoo PR #29: the im_livechat channel, its operators and chatbot) is deployed separately, so this ships OFF.
 *
 * Owner decision 2026-10-17: no Odoo JS on the site and no 'unsafe-eval' — the chat is Odoo's own support page in
 * an iframe panel (components/livechat/livechat-button.tsx), opened only by a click on «چت با کارشناس». The only
 * CSP change while on is `frame-src https://odoo.ahanassa.com` (lib/security/headers.ts).
 *
 * Switching on = both values below in one commit: LIVECHAT_ENABLED = true AND LIVECHAT_CHANNEL_ID = the channel id
 * from W21.1's D6 step (`env.ref('ahanassa_livechat.channel_sales').id`; it is not 1). A flag alone or an id alone
 * keeps everything off — no button that goes nowhere.
 *
 * Why a committed config and not a per-target env var: the staging and production artifacts must be
 * byte-identical outside the r4 allowlist (lib/static/target-diff-gate.ts), like config/analytics.ts.
 */
export const LIVECHAT_ENABLED: boolean = false;

/** The im_livechat channel id from W21.1 (e.g. 2). */
export const LIVECHAT_CHANNEL_ID: number | null = null;

/**
 * Optional: an Odoo page that reports "an operator is online" to the parent window without loading Odoo JS on
 * the site (W21.1 to provide; the contract is in docs/analytics/GTM_SETUP.md «chat_teaser_shown»). Path only, on
 * LIVECHAT_ORIGIN, e.g. "/ahanassa_livechat/status/2". Null = the teaser never shows: no operator is ever assumed online.
 */
export const LIVECHAT_STATUS_PATH: string | null = null;

/** The only origin the chat may load from; the CSP frame-src allows exactly this origin. */
export const LIVECHAT_ORIGIN = "https://odoo.ahanassa.com";

/** The `page` sent to Odoo when the site itself is not served over https (local preview): never an http:// URL. */
export const LIVECHAT_PAGE_ORIGIN = "https://www.ahanassa.com";

/** The click → loaded budget: past it, the visitor gets the WhatsApp / purchase-list links instead. */
export const LIVECHAT_TIMEOUT_MS = 8_000;

export interface LivechatConfig {
  origin: string;
  /** https://odoo.ahanassa.com/im_livechat/support/<channel id> — `?lang=…&page=…` is added at click time. */
  supportUrl: string;
  /** The availability page (LIVECHAT_STATUS_PATH), or null. */
  statusUrl: string | null;
}

const STATUS_PATH = /^\/[a-z0-9_]+(?:\/[a-z0-9_]+)*\/\d+$/;

/** The effective config, or null (off). Only an https origin, a positive integer channel id and (optional) a plain status path pass. */
export function livechatConfig(enabled: boolean = LIVECHAT_ENABLED, channelId: number | null = LIVECHAT_CHANNEL_ID, origin: string = LIVECHAT_ORIGIN, statusPath: string | null = LIVECHAT_STATUS_PATH): LivechatConfig | null {
  if (!enabled || channelId === null || !Number.isSafeInteger(channelId) || channelId < 1) return null;
  let url: URL;
  try {
    url = new URL(origin);
  } catch {
    return null;
  }
  if (url.protocol !== "https:" || url.origin !== origin) return null;
  return { origin, supportUrl: `${origin}/im_livechat/support/${channelId}`, statusUrl: statusPath && STATUS_PATH.test(statusPath) ? `${origin}${statusPath}` : null };
}

/** The chat iframe's URL for a page: `lang` = the page locale, `page` = the page's https URL without query or hash. */
export function livechatFrameUrl(config: LivechatConfig, locale: "fa" | "en" | "ar", pageUrl: string): string {
  return `${config.supportUrl}?lang=${locale}&page=${encodeURIComponent(pageUrl)}`;
}

/** The CSP frame-src origin while on (https only), else null. */
export function livechatFrameOrigin(config: LivechatConfig | null = livechatConfig()): string | null {
  return config ? config.origin : null;
}
