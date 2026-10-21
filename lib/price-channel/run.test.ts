import { test } from "node:test";
import assert from "node:assert/strict";
import crypto from "node:crypto";
import type { BotApi, SendResult } from "./bots.ts";
import { botApi, redact } from "./bots.ts";
import type { Card } from "./card.ts";
import type { Platform } from "./compose.ts";
import { runChannel, type RunDeps, type Secrets } from "./run.ts";
import { parsePricePage } from "./source.ts";
import { emptyState, type ChannelState, type Mode } from "./state.ts";
import { basePrice, basketRows, pageHtml } from "./test-fixtures.ts";

const TUE = "2026-10-20";
const AT = (day: string, hhmm = "07:50") => `${day}T${hhmm}:00.000Z`;
/** Tehran «HH:MM» on a day → Date (UTC+03:30). */
const tehran = (day: string, hhmm: string) => new Date(Date.parse(`${day}T${hhmm}:00+03:30`));
const SECRETS: Secrets = { TELEGRAM_BOT_TOKEN: "t", TELEGRAM_CHANNEL_ID: "@pub", TELEGRAM_TEST_CHANNEL_ID: "-100test", BALE_BOT_TOKEN: "b", BALE_CHANNEL_ID: "@balepub", BALE_TEST_CHANNEL_ID: "@baletest" };

interface Call {
  platform: Platform;
  method: "sendPhoto" | "sendMessage";
  chat: string;
  text: string;
}

function fakeApi(platform: Platform, calls: Call[], results: SendResult[] = []): BotApi {
  let id = 100;
  const next = (): SendResult => results.shift() ?? { kind: "sent", messageId: ++id };
  return {
    platform,
    async sendPhoto(chat, _png, caption) {
      calls.push({ platform, method: "sendPhoto", chat, text: caption });
      return next();
    },
    async sendMessage(chat, text) {
      calls.push({ platform, method: "sendMessage", chat, text });
      return next();
    },
  };
}

interface Harness {
  deps: RunDeps;
  calls: Call[];
  alerts: string[];
  fetches: number;
  setHtml(h: string | Error): void;
  queue: Partial<Record<Platform, SendResult[]>>;
}

function harness(opts: { now: Date; mode?: Mode; html: string | Error; state?: ChannelState; secrets?: Secrets; names?: string[] | null; htmlQueue?: string[] }): Harness {
  const calls: Call[] = [];
  const alerts: string[] = [];
  const queue: Harness["queue"] = { telegram: [], bale: [] };
  let html: string | Error = opts.html;
  const h: Harness = {
    calls,
    alerts,
    fetches: 0,
    queue,
    setHtml: (x) => (html = x),
    deps: {
      now: () => opts.now,
      mode: opts.mode ?? "test",
      secrets: opts.secrets ?? SECRETS,
      fetchPage: async () => {
        h.fetches++;
        const cur = opts.htmlQueue?.length ? opts.htmlQueue.shift()! : html;
        if (cur instanceof Error) throw cur;
        return { page: parsePricePage(cur), snapshotVersion: "snap-2026102010000000", fetchedAt: opts.now.toISOString() };
      },
      sleep: async () => {},
      apis: { telegram: fakeApi("telegram", calls, queue.telegram), bale: fakeApi("bale", calls, queue.bale) },
      owner: async (t) => {
        alerts.push(t);
      },
      state: opts.state ?? emptyState(),
      save: () => {},
      logoDataUri: "data:,",
      render: async (card: Card) => ({ png: Buffer.from(card.svg), sha256: crypto.createHash("sha256").update(card.svg).digest("hex") }),
      sourceNames: opts.names === undefined ? ["example-source"] : opts.names,
      log: () => {},
    },
  };
  return h;
}

const fresh = (day = TUE, price = basePrice) => pageHtml(basketRows(AT(day), price));

test("kill switch: mode off reads nothing and sends nothing", async () => {
  const h = harness({ now: tehran(TUE, "11:40"), mode: "off", html: fresh() });
  const o = await runChannel(h.deps);
  assert.equal(o.action, "off");
  assert.equal(h.fetches, 0);
  assert.equal(h.calls.length, 0);
});

test("Friday: no bulletin, no fetch", async () => {
  const h = harness({ now: tehran("2026-10-23", "11:40"), html: fresh("2026-10-23") });
  assert.equal((await runChannel(h.deps)).action, "skip");
  assert.equal(h.fetches, 0);
});

test("bulletin: one photo per platform to the TEST chats, every send logged with data version, text, image hash", async () => {
  const h = harness({ now: tehran(TUE, "11:40"), html: fresh() });
  const o = await runChannel(h.deps);
  assert.equal(o.action, "posted");
  assert.equal(o.failed, false);
  assert.deepEqual(h.calls.map((c) => [c.platform, c.method, c.chat]), [["telegram", "sendPhoto", "-100test"], ["bale", "sendPhoto", "@baletest"]]);
  const st = h.deps.state;
  assert.equal(st.days.length, 1);
  assert.equal(st.posts[0].deliveries.telegram?.status, "sent");
  assert.equal(st.log.length, 2);
  for (const l of st.log) {
    assert.equal(l.result, "sent");
    assert.match(l.data_version ?? "", /^snap-2026102010000000:[0-9a-f]{16}$/);
    assert.match(l.image_sha256 ?? "", /^[0-9a-f]{64}$/);
    assert.ok(l.text.length > 100);
  }
});

test("public mode: the public chats", async () => {
  const h = harness({ now: tehran(TUE, "11:40"), html: fresh(), mode: "public" });
  await runChannel(h.deps);
  assert.deepEqual(h.calls.map((c) => c.chat), ["@pub", "@balepub"]);
});

test("idempotent: a second run the same day (any slot) sends nothing again", async () => {
  const h = harness({ now: tehran(TUE, "11:40"), html: fresh() });
  await runChannel(h.deps);
  const again = harness({ now: tehran(TUE, "12:10"), html: fresh(), state: h.deps.state });
  const o = await runChannel(again.deps);
  assert.equal(o.action, "nothing");
  assert.equal(again.calls.length, 0);
  assert.equal(again.fetches, 0);
});

test("independent platforms: Telegram refused, Bale sent → the next run retries Telegram only, with the same image", async () => {
  const h = harness({ now: tehran(TUE, "11:40"), html: fresh() });
  h.queue.telegram!.push({ kind: "failed", error: "telegram 400: Bad Request: chat not found" });
  const o = await runChannel(h.deps);
  assert.equal(o.failed, true);
  assert.equal(h.deps.state.posts[0].deliveries.bale?.status, "sent");
  assert.equal(h.alerts.length, 1);
  const r = harness({ now: tehran(TUE, "12:10"), html: fresh(), state: h.deps.state });
  const o2 = await runChannel(r.deps);
  assert.deepEqual(r.calls.map((c) => c.platform), ["telegram"]);
  assert.equal(o2.failed, false);
  assert.equal(r.deps.state.posts[0].deliveries.telegram?.attempts, 2);
  assert.equal(r.deps.state.posts[0].deliveries.telegram?.status, "sent");
});

test("a refused delivery is retried at most maxAttempts times, then the owner is told once", async () => {
  let state = emptyState();
  let sends = 0;
  for (const hhmm of ["11:40", "12:00", "12:20", "12:40", "13:00"]) {
    const h = harness({ now: tehran(TUE, hhmm), html: fresh(), state });
    h.queue.telegram!.push({ kind: "failed", error: "telegram 403: Forbidden" }, { kind: "failed", error: "telegram 403: Forbidden" });
    await runChannel(h.deps);
    sends += h.calls.filter((c) => c.platform === "telegram").length;
    state = h.deps.state;
  }
  assert.equal(sends, 3);
  assert.ok(state.alerts.some((a) => a.key.endsWith("telegram:gave-up")));
});

test("uncertain delivery (no answer) is never resent automatically; the owner is alerted", async () => {
  const h = harness({ now: tehran(TUE, "11:40"), html: fresh() });
  h.queue.bale!.push({ kind: "uncertain", error: "no response from bale: TimeoutError" });
  await runChannel(h.deps);
  const r = harness({ now: tehran(TUE, "12:00"), html: fresh(), state: h.deps.state });
  const o = await runChannel(r.deps);
  assert.equal(r.calls.length, 0);
  assert.equal(o.failed, false);
  assert.equal(h.deps.state.posts[0].deliveries.bale?.status, "uncertain");
  assert.ok(h.alerts.some((a) => /uncertain/.test(a)));
});

test("a run that died mid-send (pending) is never resent", async () => {
  const h = harness({ now: tehran(TUE, "11:40"), html: fresh() });
  await runChannel(h.deps);
  h.deps.state.posts[0].deliveries.bale = { status: "pending", attempts: 1, at: AT(TUE, "08:10") };
  const r = harness({ now: tehran(TUE, "12:00"), html: fresh(), state: h.deps.state });
  await runChannel(r.deps);
  assert.equal(r.calls.length, 0);
});

test("missing data: yesterday's prices only → wait before the deadline; at the deadline no post, owner told", async () => {
  const stale = fresh("2026-10-19");
  const early = harness({ now: tehran(TUE, "11:40"), html: stale });
  assert.equal((await runChannel(early.deps)).action, "wait");
  assert.equal(early.calls.length, 0);
  const late = harness({ now: tehran(TUE, "12:40"), html: stale, state: early.deps.state });
  const o = await runChannel(late.deps);
  assert.equal(o.action, "no-prices");
  assert.equal(late.calls.length, 0, "never yesterday's prices with today's date");
  assert.equal(late.alerts.length, 1);
});

test("source failure at the deadline → a short status notice (text only, no prices), once", async () => {
  const h = harness({ now: tehran(TUE, "12:40"), html: new Error("/prices returned HTTP 522") });
  const o = await runChannel(h.deps);
  assert.equal(o.action, "status");
  assert.equal(o.failed, true);
  assert.deepEqual(h.calls.map((c) => [c.platform, c.method]), [["telegram", "sendMessage"], ["bale", "sendMessage"]]);
  assert.doesNotMatch(h.calls[0].text, /[۰-۹]{2,3}٬[۰-۹]{3}/);
  const again = harness({ now: tehran(TUE, "13:00"), html: new Error("still down"), state: h.deps.state });
  await runChannel(again.deps);
  assert.equal(again.calls.length, 0);
});

test("too few valid items (7/10) at the deadline → status notice, not a bulletin", async () => {
  const h = harness({ now: tehran(TUE, "12:40"), html: pageHtml(basketRows(AT(TUE), (id, i) => (i < 3 ? null : basePrice(id, i)))) });
  assert.equal((await runChannel(h.deps)).action, "status");
  assert.ok(h.calls.every((c) => c.method === "sendMessage"));
});

test("suspicious jump: unconfirmed by the second fetch → no post this run; confirmed → posted", async () => {
  const seed = harness({ now: tehran("2026-10-19", "11:40"), html: fresh("2026-10-19") });
  await runChannel(seed.deps);
  const jumpy = pageHtml(basketRows(AT(TUE), (id, i) => (id === "ipe-200" ? Math.round(basePrice(id, i) * 1.08) : basePrice(id, i))));
  const held = harness({ now: tehran(TUE, "11:40"), html: jumpy, htmlQueue: [jumpy, fresh()], state: seed.deps.state });
  const o = await runChannel(held.deps);
  assert.equal(o.action, "wait");
  assert.equal(held.calls.length, 0);
  const ok = harness({ now: tehran(TUE, "12:00"), html: jumpy, state: held.deps.state });
  assert.equal((await runChannel(ok.deps)).action, "posted");
  assert.equal(ok.fetches, 2);
});

test("exception post: ≥ 3 items moved ≥ 1 % vs the morning bulletin → posted once per data; max 2 a day", async () => {
  const morning = harness({ now: tehran(TUE, "11:40"), html: fresh() });
  await runChannel(morning.deps);
  const moved = (f: number) => pageHtml(basketRows(AT(TUE, "10:00"), (id, i) => (["rebar-a3-12", "ipe-140", "plate-st37-10"].includes(id) ? Math.round(basePrice(id, i) * f) : basePrice(id, i))));
  // Two items only → nothing.
  const quiet = harness({ now: tehran(TUE, "13:40"), html: pageHtml(basketRows(AT(TUE, "10:00"), (id, i) => (["rebar-a3-12", "ipe-140"].includes(id) ? basePrice(id, i) * 2 : basePrice(id, i)))), state: morning.deps.state });
  assert.equal((await runChannel(quiet.deps)).action, "nothing");
  let state = quiet.deps.state;
  const run = async (html: string, hhmm = "13:40") => {
    const h = harness({ now: tehran(TUE, hhmm), html, state });
    const o = await runChannel(h.deps);
    state = h.deps.state;
    return { o, h };
  };
  const first = await run(moved(1.02));
  assert.equal(first.o.action, "posted");
  assert.deepEqual(first.h.calls.map((c) => c.method), ["sendPhoto", "sendPhoto"]);
  assert.match(first.h.calls[0].text, /میان‌روز/);
  assert.equal((await run(moved(1.02), "14:00")).o.action, "nothing", "same data → no duplicate");
  assert.equal((await run(moved(1.03), "14:20")).o.action, "posted");
  const capped = await run(moved(1.04), "14:40");
  assert.equal(capped.o.action, "nothing");
  assert.match(capped.o.reason, /cap of 2/);
});

test("exception check without a delivered morning bulletin does nothing", async () => {
  const h = harness({ now: tehran(TUE, "13:40"), html: fresh() });
  assert.equal((await runChannel(h.deps)).action, "skip");
  assert.equal(h.calls.length, 0);
});

test("public mode refuses to post without the private price-source name list", async () => {
  const h = harness({ now: tehran(TUE, "11:40"), html: fresh(), mode: "public", names: null });
  const o = await runChannel(h.deps);
  assert.equal(o.action, "hold");
  assert.equal(h.calls.length, 0);
  assert.ok(h.alerts.some((a) => /name list is not configured/.test(a)));
});

test("a listed source name anywhere in the texts blocks the post", async () => {
  const h = harness({ now: tehran(TUE, "11:40"), html: pageHtml(basketRows(AT(TUE), basePrice).map((r) => ({ ...r, factory: "Example-Source" }))), names: ["example-source"] });
  assert.equal((await runChannel(h.deps)).action, "hold");
  assert.equal(h.calls.length, 0);
});

test("Bale without a TEST channel is skipped in TEST mode (logged), Telegram still posts", async () => {
  const h = harness({ now: tehran(TUE, "11:40"), html: fresh(), secrets: { ...SECRETS, BALE_TEST_CHANNEL_ID: "" } });
  await runChannel(h.deps);
  assert.deepEqual(h.calls.map((c) => c.platform), ["telegram"]);
  assert.ok(h.deps.state.log.some((l) => l.platform === "bale" && l.result === "skipped"));
});

test("bots: Telegram HTML photo vs Bale (no parse_mode, own base URL); tokens never leak into errors", async () => {
  const seen: Array<{ url: string; form: FormData }> = [];
  const fetchImpl = (async (url: string, init: RequestInit) => {
    seen.push({ url, form: init.body as FormData });
    return new Response(JSON.stringify(url.includes("tapi.bale.ai") ? { ok: false, error_code: 400, description: "bad bot123456:AAAAAAAAAAAAAAAAAAAAAAAAAA" } : { ok: true, result: { message_id: 7 } }));
  }) as unknown as typeof fetch;
  const tg = await botApi("telegram", "123456:SECRET", fetchImpl).sendPhoto("@c", Buffer.from("png"), "cap", { inline_keyboard: [] });
  assert.deepEqual(tg, { kind: "sent", messageId: 7 });
  assert.equal(seen[0].url, "https://api.telegram.org/bot123456:SECRET/sendPhoto");
  assert.equal(seen[0].form.get("parse_mode"), "HTML");
  const bale = await botApi("bale", "999:BALESECRET", fetchImpl).sendPhoto("@c", Buffer.from("png"), "cap", { inline_keyboard: [] });
  assert.equal(seen[1].url, "https://tapi.bale.ai/bot999:BALESECRET/sendPhoto");
  assert.equal(seen[1].form.get("parse_mode"), null);
  assert.equal(bale.kind, "failed");
  assert.doesNotMatch(JSON.stringify(bale), /AAAAAAAA|BALESECRET/);
  const down = await botApi("telegram", "123456:SECRET", (async () => {
    throw new TypeError("fetch failed https://api.telegram.org/bot123456:SECRET/sendPhoto");
  }) as unknown as typeof fetch).sendMessage("@c", "x");
  assert.equal(down.kind, "uncertain");
  assert.doesNotMatch(JSON.stringify(down), /SECRET/);
  assert.equal(redact("x 123456:SECRET y", "123456:SECRET"), "x <token> y");
});
