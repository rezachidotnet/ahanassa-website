import { test } from "node:test";
import assert from "node:assert/strict";
import type { BotApi, SendResult } from "./bots.ts";
import type { Platform } from "./compose.ts";
import { ownerAlerter } from "./owner.ts";

function api(platform: Platform, sent: Array<{ platform: Platform; chat: string; text: string }>, result: SendResult | Error = { kind: "sent", messageId: 1 }): BotApi {
  return {
    platform,
    async sendPhoto() {
      throw new Error("not used");
    },
    async sendMessage(chat, text) {
      sent.push({ platform, chat, text });
      if (result instanceof Error) throw result;
      return result;
    },
  };
}

test("owner alerts: no target configured → no alerter", () => {
  assert.equal(ownerAlerter({}), null);
  const sent: never[] = [];
  assert.equal(ownerAlerter({ bale: api("bale", sent) }), null, "a token without a chat is not a target");
  assert.equal(ownerAlerter({ telegram: api("telegram", sent), telegramChat: " " }), null);
});

test("owner alerts: with BALE_OWNER_CHAT_ID they also go to Bale; the Telegram path is unchanged (HTML-escaped)", async () => {
  const sent: Array<{ platform: Platform; chat: string; text: string }> = [];
  const alert = ownerAlerter({ telegram: api("telegram", sent), telegramChat: "-100owner", bale: api("bale", sent), baleChat: "12345" })!;
  await alert("bulletin test:2026-10-25:bulletin:0 on bale failed: <x> & [y] *z* _w_");
  assert.deepEqual(sent.map((s) => [s.platform, s.chat]), [["telegram", "-100owner"], ["bale", "12345"]]);
  assert.equal(sent[0].text, "bulletin test:2026-10-25:bulletin:0 on bale failed: &lt;x&gt; &amp; [y] *z* _w_");
  // Bale reads Markdown: the markup characters are dropped, never sent half-parsed.
  assert.equal(sent[1].text, "bulletin test:2026-10-25:bulletin:0 on bale failed: <x> & y z w");
});

test("owner alerts: Bale only (Telegram absent) works", async () => {
  const sent: Array<{ platform: Platform; chat: string; text: string }> = [];
  const alert = ownerAlerter({ bale: api("bale", sent), baleChat: "12345", telegramChat: "-100owner" })!;
  await alert("hello");
  assert.deepEqual(sent.map((s) => s.platform), ["bale"]);
});

test("owner alerts: one chat failing never stops the other; the failure is reported after both were tried", async () => {
  const sent: Array<{ platform: Platform; chat: string; text: string }> = [];
  const alert = ownerAlerter({ telegram: api("telegram", sent, { kind: "failed", error: "telegram 403: blocked" }), telegramChat: "1", bale: api("bale", sent), baleChat: "2" })!;
  await assert.rejects(alert("x"), /telegram: telegram 403: blocked/);
  assert.deepEqual(sent.map((s) => s.platform), ["telegram", "bale"]);
  const sent2: Array<{ platform: Platform; chat: string; text: string }> = [];
  const alert2 = ownerAlerter({ telegram: api("telegram", sent2), telegramChat: "1", bale: api("bale", sent2, new TypeError("fetch failed")), baleChat: "2" })!;
  await assert.rejects(alert2("x"), /bale: TypeError/);
  assert.equal(sent2.length, 2);
});
