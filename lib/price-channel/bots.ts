/**
 * W23 — the two bot APIs. Bale's Bot API (docs.bale.ai) follows Telegram's, with these differences that matter here:
 *   base URL         https://tapi.bale.ai/bot<token>/<method>     (Telegram: https://api.telegram.org/bot<token>/…)
 *   formatting       no parse_mode: text is always read as Markdown, links as [text](url)   (Telegram: parse_mode=HTML)
 *   caption length   0–4096 characters                                   (Telegram: 0–1024 after entity parsing)
 *   photo upload     multipart up to 10 MB                               (Telegram: 10 MB)
 *   URL buttons      inline_keyboard with `url` buttons, supported on both
 * Channels are addressed by numeric id or @username on both. Tokens are only ever used to build the request URL;
 * no URL, header or token reaches a log, an error text or the state (`redact`).
 */
import type { Platform } from "./compose.ts";

export type SendResult = { kind: "sent"; messageId: number } | { kind: "failed"; error: string } | { kind: "uncertain"; error: string };

export interface BotApi {
  platform: Platform;
  sendPhoto(chatId: string, png: Buffer, caption: string, keyboard: object): Promise<SendResult>;
  sendMessage(chatId: string, text: string, keyboard?: object): Promise<SendResult>;
}

export const API_BASE: Record<Platform, string> = { telegram: "https://api.telegram.org", bale: "https://tapi.bale.ai" };

/** Removes the token (and any bot URL) from a text. */
export function redact(text: string, token: string): string {
  let t = text;
  if (token) t = t.split(token).join("<token>");
  return t.replace(/bot\d+:[A-Za-z0-9_-]{20,}/g, "bot<token>").slice(0, 300);
}

export function botApi(platform: Platform, token: string, fetchImpl: typeof fetch = fetch, timeoutMs = 60_000): BotApi {
  const call = async (method: string, body: FormData | Record<string, unknown>): Promise<SendResult> => {
    let res: Response;
    try {
      res = await fetchImpl(`${API_BASE[platform]}/bot${token}/${method}`, {
        method: "POST",
        ...(body instanceof FormData ? { body } : { body: JSON.stringify(body), headers: { "content-type": "application/json" } }),
        signal: AbortSignal.timeout(timeoutMs),
      });
    } catch (e) {
      // No answer: the message may or may not be up. Never retried automatically.
      return { kind: "uncertain", error: redact(`no response from ${platform}: ${(e as Error).name}`, token) };
    }
    let json: { ok?: boolean; result?: { message_id?: number }; error_code?: number; description?: string } | null = null;
    try {
      json = await res.json();
    } catch {
      json = null;
    }
    if (json?.ok === true && typeof json.result?.message_id === "number") return { kind: "sent", messageId: json.result.message_id };
    if (json && json.ok === false) return { kind: "failed", error: redact(`${platform} ${json.error_code ?? res.status}: ${json.description ?? "error"}`, token) };
    return { kind: "uncertain", error: redact(`${platform} HTTP ${res.status} without a readable answer`, token) };
  };
  return {
    platform,
    sendPhoto(chatId, png, caption, keyboard) {
      const form = new FormData();
      form.set("chat_id", chatId);
      form.set("caption", caption);
      if (platform === "telegram") form.set("parse_mode", "HTML");
      form.set("reply_markup", JSON.stringify(keyboard));
      form.set("photo", new Blob([new Uint8Array(png)], { type: "image/png" }), "ahanassa-prices.png");
      return call("sendPhoto", form);
    },
    sendMessage(chatId, text, keyboard) {
      return call("sendMessage", { chat_id: chatId, text, ...(platform === "telegram" ? { parse_mode: "HTML", link_preview_options: { is_disabled: true } } : {}), ...(keyboard ? { reply_markup: keyboard } : {}) });
    },
  };
}
