import type { FetchLike } from "./family-fetch.ts";

/**
 * W32 (D-IR-7): staff notices and alerts from the domestic intake to a private Bale group. Bale is domestic
 * (tapi.bale.ai, IPv4; P0 T4), so this works during an international cutoff — when alerts matter most.
 *
 * NO personal data, ever: a new-RFQ notice carries the reference and counts only; an alert carries a condition and
 * numbers. Staff open the domestic admin view for details. `assertNoPii` is a last line of defence: a text with an
 * e-mail address or a phone-like digit run is refused before it leaves the server.
 * The token is never logged (a failure is logged as its HTTP status class only).
 */
export const BALE_API = "https://tapi.bale.ai";

export interface BaleConfig {
  token: string | null;
  chatId: string | null;
}

const EMAIL = /[^\s@]+@[^\s@]+\.[^\s@]+/;
// 7+ digits in a row (Latin or Persian/Arabic-Indic), optionally split by spaces/dashes — a phone number shape.
const PHONE = /(?:[0-9۰-۹٠-٩][\s-]?){7,}/;

export function assertNoPii(text: string): void {
  // An RFQ reference (AA-RFQ- + 8 Crockford chars) may be all digits by chance; it is not personal data.
  const scrubbed = text.replace(/\bAA-RFQ-[0-9A-HJKMNP-TV-Z]{1,40}\b/g, "AA-RFQ-x");
  if (EMAIL.test(scrubbed) || PHONE.test(scrubbed)) throw new Error("bale: refusing a text that looks like it carries personal data");
}

export type BaleSend = (text: string) => Promise<boolean>;

export function baleSender(cfg: BaleConfig, fetchImpl: FetchLike = fetch, timeoutMs = 10_000): BaleSend {
  return async (text) => {
    assertNoPii(text);
    if (!cfg.token || !cfg.chatId) return false;
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    try {
      const res = await fetchImpl(`${BALE_API}/bot${cfg.token}/sendMessage`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ chat_id: cfg.chatId, text }),
        signal: controller.signal,
      });
      const ok = res.ok && ((await res.json().catch(() => null)) as { ok?: boolean } | null)?.ok === true;
      if (!ok) console.error(JSON.stringify({ operation: "ir.bale", result: "error", httpStatus: res.status }));
      return ok;
    } catch (err) {
      console.error(JSON.stringify({ operation: "ir.bale", result: "error", errorClass: err instanceof Error ? err.name : "unknown" }));
      return false;
    } finally {
      clearTimeout(timer);
    }
  };
}

const faDigits = (n: number) => String(n).replace(/\d/g, (d) => "۰۱۲۳۴۵۶۷۸۹"[Number(d)]);

/** «درخواست جدید (سرور داخلی) AA-RFQ-…: ۳ قلم، ۱ فایل» — reference + counts, nothing else. */
export function newRfqNotice(env: string, reference: string, items: number, files: number): string {
  const tag = env === "production" ? "" : ` [${env}]`;
  return `درخواست جدید (سرور داخلی)${tag} ${reference}: ${faDigits(items)} قلم، ${faDigits(files)} فایل. جزئیات در پنل داخلی.`;
}
