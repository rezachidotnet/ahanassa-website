/**
 * W41 — owner alerts to every configured private chat: Telegram (TELEGRAM_OWNER_CHAT_ID, else the Telegram TEST
 * channel — the W23 path, unchanged) and Bale (BALE_OWNER_CHAT_ID, added in W41). Either may be absent; with
 * neither, there is no alerter. Every target is tried; a failure of any one is reported (thrown) after all were
 * tried, so one chat failing never stops the other from getting the alert.
 */
import type { BotApi } from "./bots.ts";
import { escMd } from "./compose.ts";

export interface OwnerTargets {
  telegram?: BotApi;
  /** TELEGRAM_OWNER_CHAT_ID, else TELEGRAM_TEST_CHANNEL_ID. */
  telegramChat?: string | null;
  bale?: BotApi;
  /** BALE_OWNER_CHAT_ID. */
  baleChat?: string | null;
}

const escHtml = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

export function ownerAlerter(t: OwnerTargets): ((text: string) => Promise<void>) | null {
  const targets: Array<{ name: string; send: (text: string) => ReturnType<BotApi["sendMessage"]> }> = [];
  const tgChat = t.telegramChat?.trim();
  const baleChat = t.baleChat?.trim();
  // Telegram reads HTML (parse_mode=HTML); Bale always reads Markdown.
  if (t.telegram && tgChat) targets.push({ name: "telegram", send: (text) => t.telegram!.sendMessage(tgChat, escHtml(text)) });
  if (t.bale && baleChat) targets.push({ name: "bale", send: (text) => t.bale!.sendMessage(baleChat, escMd(text)) });
  if (!targets.length) return null;
  return async (text) => {
    const errors: string[] = [];
    for (const target of targets) {
      try {
        const r = await target.send(text);
        if (r.kind !== "sent") errors.push(`${target.name}: ${r.error}`);
      } catch (e) {
        errors.push(`${target.name}: ${(e as Error).name}`);
      }
    }
    if (errors.length) throw new Error(errors.join("; "));
  };
}
