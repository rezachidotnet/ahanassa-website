import { test } from "node:test";
import assert from "node:assert/strict";
import crypto from "node:crypto";
import { STORY_CONFIG, STORY_ITEMS, type StoryItem } from "../../config/raw-material-stories.ts";
import { RAW_MATERIALS, RAW_MATERIAL_SLUGS, rawMaterialPath, type RawMaterialSlug } from "../content/raw-materials.ts";
import { RAW_MATERIAL_TEMPLATES } from "../downloads/raw-materials-data.ts";
import type { BotApi, SendResult } from "../price-channel/bots.ts";
import { buildStory, renderStory, STORY_SIZE } from "./card.ts";
import { channelCaption, ownerCaption, storyGate, storyLinks, storyTexts } from "./compose.ts";
import { isReady, longestGroupRun, needsFacts, storyItemFor, storySequence, workingDayIndex } from "./rotation.ts";
import { buildStoryPost, runStory, type StoryDeps } from "./run.ts";
import { emptyStoryState, parseStoryMode, type StoryMode, type StoryState } from "./state.ts";

const LOGO = "data:image/png;base64,iVBORw0KGgo=";
const NAMES = ["examplemarket.test", "Other Source"];
const tehran = (day: string, hhmm: string) => new Date(Date.parse(`${day}T${hhmm}:00+03:30`));
const SUN = "2026-10-25";
const FRI = "2026-10-30";

// The config ------------------------------------------------------------------------------------------------------

test("config: unique, URL-safe ids; every ready item has 2–3 sourced facts", () => {
  const ids = STORY_ITEMS.map((i) => i.id);
  assert.equal(new Set(ids).size, ids.length);
  for (const item of STORY_ITEMS) {
    assert.match(item.id, /^[a-z0-9-]+$/, item.id);
    if (!isReady(item)) continue;
    assert.ok(item.facts.length >= 2 && item.facts.length <= 3, `${item.id}: ${item.facts.length} facts`);
    for (const f of item.facts) {
      assert.ok(f.text.trim(), item.id);
      if (f.source.kind === "standard") assert.ok(f.source.ref.trim(), `${item.id}: a standard fact names its reference`);
    }
  }
});

test("config: a story links only to a page that exists (a raw-material page) or the request form", () => {
  const pages = new Set(RAW_MATERIAL_SLUGS.map(rawMaterialPath));
  for (const item of STORY_ITEMS) if (item.page !== null) assert.ok(pages.has(item.page), `${item.id}: ${item.page} is not a site page`);
  for (const item of STORY_ITEMS) for (const f of item.facts) if (f.source.kind === "site") assert.ok(pages.has(f.source.path), `${item.id}: ${f.source.path}`);
});

const latinDigits = (s: string) => s.replace(/[۰-۹]/g, (d) => String("۰۱۲۳۴۵۶۷۸۹".indexOf(d)));

test("config: every number and Latin term of a site or catalog fact is in that source's own text", () => {
  const sourceText = (item: StoryItem, i: number): string => {
    const s = item.facts[i].source;
    if (s.kind === "site") return JSON.stringify(RAW_MATERIALS[s.path.split("/").pop() as RawMaterialSlug].fa);
    if (s.kind === "catalog") {
      return JSON.stringify(
        s.keys.map((key) => {
          const t = RAW_MATERIAL_TEMPLATES.find((x) => x.key === key);
          assert.ok(t, `${item.id}: catalog key ${key}`);
          return [t.name.fa, t.description.fa, t.grade, t.standard];
        }),
      );
    }
    return "";
  };
  for (const item of STORY_ITEMS.filter(isReady)) {
    item.facts.forEach((f, i) => {
      if (f.source.kind === "standard") return;
      const src = latinDigits(sourceText(item, i));
      for (const token of latinDigits(f.text).match(/[A-Za-z0-9]+/g) ?? []) assert.ok(src.includes(token), `${item.id}: «${token}» is not in ${JSON.stringify(f.source)}`);
    });
  }
});

test("config: the items without facts are left out of the rotation (needs facts)", () => {
  const missing = needsFacts().map((i) => i.id);
  assert.deepEqual(missing.sort(), ["coke", "ferrochrome", "ferromanganese", "ferrosilicon", "low-alloy", "scrap", "silicomanganese", "slab"]);
  const seq = storySequence().map((i) => i.id);
  for (const id of missing) assert.ok(!seq.includes(id), id);
  assert.equal(seq.length, STORY_ITEMS.length - missing.length);
});

test("config: every ready item passes the gate and fits the 1080×1920 layout", () => {
  for (const item of STORY_ITEMS.filter(isReady)) {
    const built = buildStoryPost(item, LOGO, NAMES, true);
    assert.deepEqual(built.problems, [], item.id);
    assert.ok(built.card.svg.startsWith(`<svg xmlns="http://www.w3.org/2000/svg" width="${STORY_SIZE.width}" height="${STORY_SIZE.height}"`));
  }
});

// Rotation and calendar -------------------------------------------------------------------------------------------

const item = (id: string, group: StoryItem["group"], facts = 2): StoryItem => ({ id, group, enabled: true, name: id, designation: null, facts: Array.from({ length: facts }, () => ({ text: "x", source: { kind: "standard", ref: "R" } })), page: null, reference: null });

test("rotation: the default list mixes the groups, never more than 2 days of one group in a row (wrapping)", () => {
  const seq = storySequence();
  assert.ok(longestGroupRun(seq) <= STORY_CONFIG.maxGroupRun, seq.map((i) => i.group[0]).join(""));
  assert.equal(new Set(seq.map((i) => i.group)).size, 2);
});

test("rotation: smooth interleave of unequal groups; within a group the config order; disabled items skipped", () => {
  const items = [item("r1", "raw-material"), item("r2", "raw-material"), item("r3", "raw-material"), item("a1", "alloy-steel"), item("a2", "alloy-steel"), { ...item("a3", "alloy-steel"), enabled: false }, item("a4", "alloy-steel", 1)];
  const seq = storySequence(items, "mixed").map((i) => i.id);
  assert.deepEqual(seq, ["r1", "a1", "r2", "a2", "r3"]);
  assert.ok(longestGroupRun(storySequence(items, "mixed")) <= 2);
  assert.deepEqual(storySequence(items, "as-listed").map((i) => i.id), ["r1", "r2", "r3", "a1", "a2"]);
  // A lopsided list cannot meet the rule: the check reports it.
  assert.equal(longestGroupRun(storySequence([item("r1", "raw-material"), item("r2", "raw-material"), item("r3", "raw-material"), item("r4", "raw-material"), item("a1", "alloy-steel")], "mixed")), 4);
});

test("rotation: one item per working day; Fridays and holidays do not advance it", () => {
  const items = [item("a", "raw-material"), item("b", "alloy-steel"), item("c", "raw-material")];
  const cfg = { rotationStart: "2026-10-24", order: "mixed" as const };
  const at = (d: string) => storyItemFor(d, items, cfg)!.id;
  // Sat 24, Sun 25, Mon 26 → a, b, c; Thu 29 → (3 % 3) a... then Fri 30 has no index of its own; Sat 31 follows Thu.
  assert.deepEqual(["2026-10-24", "2026-10-25", "2026-10-26", "2026-10-27"].map(at), ["a", "b", "c", "a"]);
  assert.equal(workingDayIndex("2026-10-31", "2026-10-24") - workingDayIndex("2026-10-29", "2026-10-24"), 1, "Thu → Sat is one step");
  // 2026-12-23 (2 Dey) is an official holiday: Tue 22 → Thu 24 is one step.
  assert.equal(workingDayIndex("2026-12-24", "2026-12-22"), 1);
  assert.equal(workingDayIndex("2026-10-20", "2026-10-24"), 0, "before the start = item 0");
});

// Links and the gate --------------------------------------------------------------------------------------------

test("links: the site page or the request form, with utm_source=bale, utm_medium=story, utm_campaign=<id>", () => {
  const dri = STORY_ITEMS.find((i) => i.id === "dri")!;
  const l = storyLinks(dri);
  assert.equal(l.story, "https://www.ahanassa.com/raw-materials/dri?utm_source=bale&utm_medium=story&utm_campaign=dri");
  assert.equal(l.channel, "https://www.ahanassa.com/raw-materials/dri?utm_source=bale&utm_medium=channel&utm_campaign=dri");
  assert.equal(l.short, "ahanassa.com/raw-materials/dri");
  const g = storyLinks(STORY_ITEMS.find((i) => i.id === "2344")!);
  assert.equal(g.story, "https://www.ahanassa.com/request?utm_source=bale&utm_medium=story&utm_campaign=2344");
});

test("gate: no price, stock, discount, statistics or source name; «استعلام قیمت» and «انبارش» are fine", () => {
  const ok = ["تأمین مطمئن مواد اولیه — استعلام قیمت", "حمل و انبارش ساده‌تر", "دانه‌بندی ۱۰ تا ۳۰ میلی‌متر", "درصد آهن کل"];
  assert.deepEqual(storyGate(ok, NAMES, true), []);
  const bad: Array<[string, RegExp]> = [
    ["قیمت روز شمش", /«قیمت»/],
    ["۲۴۰٬۰۰۰ تومان", /price or currency/],
    ["موجود در انبار", /stock/],
    ["آماده تحویل", /stock/],
    ["با ۱۰٪ تخفیف", /discount/],
    ["عیار ۶۷٪", /statistic/],
    ["۵۰۰ تن در ماه", /statistic/],
    ["۲۰ سال تجربه", /statistic/],
    ["فرصت خرید", /banned words/],
    ["از Other Source", /price-source name/],
    ["EXAMPLE-MARKET", /price-source name/],
  ];
  for (const [text, re] of bad) assert.match(storyGate([text], NAMES, true).join("; "), re, text);
  assert.match(storyGate(["x"], null, true).join(), /not configured/);
  assert.deepEqual(storyGate(["x"], null, false), []);
});

test("captions: the owner caption with the suggested story text; the channel post has facts, contact and the request link", () => {
  const dri = STORY_ITEMS.find((i) => i.id === "dri")!;
  const l = storyLinks(dri);
  const owner = ownerCaption(dri, l);
  assert.ok(owner.startsWith("استوری امروز (آهن اسفنجی (DRI)) — برای انتشار: باز کنید ← افزودن به استوری"));
  assert.match(owner, /متن پیشنهادی استوری:\n.*ahanassa\.com\/raw-materials\/dri/);
  const ch = channelCaption(dri, l);
  for (const f of dri.facts) assert.ok(ch.includes(f.text));
  assert.match(ch, /031-35134/);
  assert.match(ch, /sales@ahanassa\.com/);
  assert.ok(ch.endsWith(`[استعلام قیمت](${l.channel})`));
  assert.ok(storyTexts(dri, l).length > 4);
});

test("card: deterministic render at 1080×1920; brand, contact and QR link inside, every text returned", async () => {
  const hbi = STORY_ITEMS.find((i) => i.id === "hbi")!;
  const card = buildStory(hbi, storyLinks(hbi), LOGO);
  for (const t of ["آهن آسا", "مواد اولیه فولاد", "تأمین مطمئن مواد اولیه — استعلام قیمت", "تلفن: 031-35134", "sales@ahanassa.com", "ahanassa.com/raw-materials/briquette", ...hbi.facts.map((f) => f.text)])
    assert.ok(card.texts.some((x) => x.includes(t) || t.includes(x)), t);
  assert.ok(!/قیمت(?!‏?$)/.test(card.texts.join(" ").split("استعلام قیمت").join("")), "no «قیمت» outside «استعلام قیمت»");
  const a = await renderStory(card);
  const b = await renderStory(card);
  assert.equal(a.sha256, b.sha256);
  assert.equal(a.png.readUInt32BE(16), 1080);
  assert.equal(a.png.readUInt32BE(20), 1920);
});

// The run ---------------------------------------------------------------------------------------------------------

interface Call {
  chat: string;
  caption: string;
  keyboard: object;
}

function harness(opts: { mode?: StoryMode; now: Date; state?: StoryState; results?: SendResult[]; secrets?: StoryDeps["secrets"]; names?: string[] | null; noBale?: boolean }) {
  const calls: Call[] = [];
  const alerts: string[] = [];
  const results = opts.results ?? [];
  let id = 500;
  const bale: BotApi = {
    platform: "bale",
    async sendPhoto(chat, _png, caption, keyboard) {
      calls.push({ chat, caption, keyboard });
      return results.shift() ?? { kind: "sent", messageId: ++id };
    },
    async sendMessage() {
      throw new Error("not used");
    },
  };
  const state = opts.state ?? emptyStoryState();
  const deps: StoryDeps = {
    now: () => opts.now,
    mode: opts.mode ?? "owner",
    secrets: opts.secrets ?? { BALE_BOT_TOKEN: "b", BALE_OWNER_CHAT_ID: "12345", BALE_CHANNEL_ID: "@ahanassa" },
    bale: opts.noBale ? undefined : bale,
    owner: async (t) => {
      alerts.push(t);
    },
    state,
    save: () => {},
    logoDataUri: LOGO,
    render: async (card) => ({ png: Buffer.from(card.svg), sha256: crypto.createHash("sha256").update(card.svg).digest("hex") }),
    sourceNames: opts.names === undefined ? NAMES : opts.names,
    log: () => {},
  };
  return { deps, calls, alerts, state };
}

test("run: STORY_MODE off (default), Fridays and holidays, and before 09:00 send nothing", async () => {
  assert.equal(parseStoryMode(undefined), "off");
  assert.equal(parseStoryMode("public"), "off");
  assert.equal(parseStoryMode("owner+channel"), "owner+channel");
  for (const [mode, now, action] of [["off", tehran(SUN, "09:05"), "off"], ["owner", tehran(FRI, "09:05"), "skip"], ["owner", tehran("2026-12-23", "09:05"), "skip"], ["owner", tehran(SUN, "08:55"), "wait"]] as const) {
    const h = harness({ mode, now });
    const o = await runStory(h.deps);
    assert.equal(o.action, action);
    assert.equal(h.calls.length, 0);
  }
});

test("run: owner mode sends the day's image to the owner chat once; a second run sends nothing", async () => {
  const h = harness({ now: tehran(SUN, "09:02") });
  const o = await runStory(h.deps);
  assert.equal(o.action, "sent");
  assert.equal(o.item, storyItemFor(SUN)!.id);
  assert.equal(h.calls.length, 1);
  assert.equal(h.calls[0].chat, "12345");
  assert.ok(h.calls[0].caption.startsWith("استوری امروز ("));
  assert.ok(!JSON.stringify(h.calls[0].keyboard).includes("utm_"), "the owner's own button carries no UTM tags");
  const again = await runStory({ ...h.deps, now: () => tehran(SUN, "11:00") });
  assert.equal(again.action, "nothing");
  assert.equal(h.calls.length, 1);
  assert.equal(h.alerts.length, 0);
});

test("run: owner+channel also posts it on the channel with the RFQ button; switching modes mid-day adds only the channel", async () => {
  const both = harness({ mode: "owner+channel", now: tehran(SUN, "09:02") });
  await runStory(both.deps);
  assert.deepEqual(both.calls.map((c) => c.chat), ["12345", "@ahanassa"]);
  assert.match(JSON.stringify(both.calls[1].keyboard), /utm_medium=channel/);
  assert.match(both.calls[1].caption, /\[استعلام قیمت\]\(https:\/\/www\.ahanassa\.com\//);

  const h = harness({ mode: "owner", now: tehran(SUN, "09:02") });
  await runStory(h.deps);
  const o = await runStory({ ...h.deps, mode: "owner+channel", now: () => tehran(SUN, "10:00") });
  assert.deepEqual(h.calls.map((c) => c.chat), ["12345", "@ahanassa"]);
  assert.deepEqual(o.records, [`${SUN}:channel`]);
});

test("run: a refused send is retried on the next run (same item and image), then given up with an owner alert", async () => {
  const fail: SendResult = { kind: "failed", error: "bale 400: Bad Request" };
  const h = harness({ now: tehran(SUN, "09:02"), results: [fail, fail, fail] });
  const first = await runStory(h.deps);
  assert.equal(first.failed, true);
  assert.match(h.alerts.join("\n"), /retried on the next run \(attempt 1 of 3\)/);
  await runStory({ ...h.deps, now: () => tehran(SUN, "09:30"), items: [] }); // the config changed: the recorded item is reused
  await runStory({ ...h.deps, now: () => tehran(SUN, "10:00") });
  assert.equal(h.calls.length, 3);
  assert.equal(new Set(h.calls.map((c) => c.caption)).size, 1);
  assert.match(h.alerts.join("\n"), /gave up/);
  const after = await runStory({ ...h.deps, now: () => tehran(SUN, "10:30") });
  assert.equal(h.calls.length, 3);
  assert.equal(after.failed, true);
});

test("run: an uncertain or interrupted send is never resent; the owner is told", async () => {
  const h = harness({ now: tehran(SUN, "09:02"), results: [{ kind: "uncertain", error: "no response from bale: TimeoutError" }] });
  await runStory(h.deps);
  await runStory({ ...h.deps, now: () => tehran(SUN, "09:30") });
  assert.equal(h.calls.length, 1);
  assert.match(h.alerts.join("\n"), /not resent automatically/);
  // A run that died mid-call leaves "pending": same rule.
  const p = harness({ now: tehran(SUN, "09:02") });
  p.state.records.push({ id: `${SUN}:owner`, date: SUN, target: "owner", item: storyItemFor(SUN)!, image_sha256: "x", caption: "c", delivery: { status: "pending", attempts: 1, at: "t" } });
  const o = await runStory(p.deps);
  assert.equal(p.calls.length, 0);
  assert.equal(o.failed, true);
});

test("run: a missing chat secret, a missing source-name list or a too-late run sends nothing and alerts the owner", async () => {
  const noChat = harness({ mode: "owner+channel", now: tehran(SUN, "09:02"), secrets: { BALE_BOT_TOKEN: "b", BALE_OWNER_CHAT_ID: "12345" } });
  const o1 = await runStory(noChat.deps);
  assert.deepEqual(noChat.calls.map((c) => c.chat), ["12345"]);
  assert.equal(o1.failed, true);
  assert.match(noChat.alerts.join("\n"), /BALE_CHANNEL_ID missing/);

  const noNames = harness({ now: tehran(SUN, "09:02"), names: null });
  const o2 = await runStory(noNames.deps);
  assert.equal(o2.action, "hold");
  assert.equal(noNames.calls.length, 0);
  assert.match(noNames.alerts.join("\n"), /source name list is not configured|price-source name list is not configured/);

  const late = harness({ now: tehran(SUN, "18:30") });
  const o3 = await runStory(late.deps);
  assert.equal(late.calls.length, 0);
  assert.equal(o3.failed, true);
  assert.match(late.alerts.join("\n"), /by 18:00 Tehran/);
  // The same alert is not repeated by the next late run.
  await runStory({ ...late.deps, now: () => tehran(SUN, "19:00") });
  assert.equal(late.alerts.length, 1);
});

test("run: no ready item alerts the owner", async () => {
  const h = harness({ now: tehran(SUN, "09:02") });
  const o = await runStory({ ...h.deps, items: [item("x", "raw-material", 0)] });
  assert.equal(o.action, "failed");
  assert.match(h.alerts.join("\n"), /no story item is ready/);
});
