/**
 * W23 — the price channel CLI (lib/price-channel/).
 *
 *   node scripts/price-channel/run.ts dry-run [--out <dir>] [--html <saved /prices page>] [--date YYYY-MM-DD]
 *                                             [--state <state.json>] [--kind bulletin|status]
 *     Renders the bulletin of the day (card PNG + SVG, both captions, buttons, summary) to <dir> (default
 *     ./price-channel-dry-run). Reads www.ahanassa.com/prices unless --html is given; --date evaluates another
 *     Tehran day (e.g. the page's last price day before today's publish); --state supplies the history for the
 *     changes (read only). Never sends anything and never writes the state.
 *
 *   node scripts/price-channel/run.ts run --state <state.json>
 *     One scheduled run (the workflow on main). Env: PRICE_CHANNEL_MODE (off|test|public; anything else = off),
 *     PRICE_CHANNEL_TASK (auto|bulletin|exception), the bot secrets by name (TELEGRAM_BOT_TOKEN, TELEGRAM_CHANNEL_ID,
 *     TELEGRAM_TEST_CHANNEL_ID, BALE_BOT_TOKEN, BALE_CHANNEL_ID, optional BALE_TEST_CHANNEL_ID and
 *     TELEGRAM_OWNER_CHAT_ID), AHANASSA_PRICE_SOURCE_NAMES_FILE. The state file is rewritten after every step.
 *     Exit 1 when a delivery failed/is uncertain or the source failed at the deadline.
 */
import fs from "node:fs";
import path from "node:path";
import { parseArgs } from "node:util";
import { CHANNEL_CONFIG } from "../../config/price-channel.ts";
import { evaluateBasket, prePublishCheck, suspiciousJumps } from "../../lib/price-channel/basket.ts";
import { botApi } from "../../lib/price-channel/bots.ts";
import { tehranDate, weekday } from "../../lib/price-channel/calendar.ts";
import { renderCard } from "../../lib/price-channel/card.ts";
import { captionWords } from "../../lib/price-channel/compose.ts";
import { fetchPricePage, parsePricePage, type FetchedPage } from "../../lib/price-channel/source.ts";
import { buildBulletinPost, buildStatusPost, checkTexts, parseMode, runChannel, type Secrets } from "../../lib/price-channel/run.ts";
import { emptyState, parseState, type ChannelState } from "../../lib/price-channel/state.ts";
import { loadSourceNames } from "../../lib/static/source-name-scan.ts";

const repo = path.resolve(import.meta.dirname, "../..");
const logoDataUri = `data:image/jpeg;base64,${fs.readFileSync(path.join(repo, "public/brand/ahan-asa-mark-jpg-512w.jpg")).toString("base64")}`;

const { positionals, values } = parseArgs({
  allowPositionals: true,
  options: { out: { type: "string" }, html: { type: "string" }, date: { type: "string" }, state: { type: "string" }, kind: { type: "string" } },
});
const command = positionals[0];

function readState(file: string | undefined): ChannelState {
  if (!file || !fs.existsSync(file)) return emptyState();
  return parseState(JSON.parse(fs.readFileSync(file, "utf8")));
}

function writeState(file: string, state: ChannelState) {
  const tmp = `${file}.tmp`;
  fs.writeFileSync(tmp, JSON.stringify(state, null, 1) + "\n");
  fs.renameSync(tmp, file);
}

async function loadPage(): Promise<FetchedPage> {
  if (values.html) return { page: parsePricePage(fs.readFileSync(values.html, "utf8")), snapshotVersion: null, fetchedAt: new Date().toISOString() };
  return fetchPricePage(CHANNEL_CONFIG.origin, CHANNEL_CONFIG.pricesPath);
}

if (command === "dry-run") {
  const out = path.resolve(values.out ?? "price-channel-dry-run");
  fs.mkdirSync(out, { recursive: true });
  const date = values.date ?? tehranDate(new Date());
  const state = readState(values.state);
  const fetched = await loadPage();
  const e = evaluateBasket({ page: fetched.page, date, history: state.days, snapshotVersion: fetched.snapshotVersion, weekly: weekday(date) === "Sat" });
  const built = values.kind === "status" ? buildStatusPost(date, "test", new Date().toISOString()) : buildBulletinPost(e, "test", new Date().toISOString(), e.data_version, logoDataUri);
  const problems = checkTexts(built.post.kind, built.models, built.card, built.post.content, loadSourceNames(), "test");
  let imageSha: string | null = null;
  if (built.card) {
    const { png, sha256 } = await renderCard(built.card);
    imageSha = sha256;
    fs.writeFileSync(path.join(out, "card.png"), png);
    fs.writeFileSync(path.join(out, "card.svg"), built.card.svg.replace(/data:image\/jpeg;base64,[A-Za-z0-9+/=]+/g, "logo.jpg"));
  }
  fs.writeFileSync(path.join(out, "caption.telegram.html"), built.post.content.telegram.text + "\n");
  fs.writeFileSync(path.join(out, "caption.bale.md"), built.post.content.bale.text + "\n");
  fs.writeFileSync(path.join(out, "buttons.json"), JSON.stringify({ telegram: built.post.content.telegram.keyboard, bale: built.post.content.bale.keyboard }, null, 1) + "\n");
  const pre = prePublishCheck(e);
  const summary = {
    date,
    kind: built.post.kind,
    data_version: e.data_version,
    snapshot_version: fetched.snapshotVersion,
    page_rows: fetched.page.rows.length,
    page_rows_skipped: fetched.page.skipped,
    unit_toman_per_kg: e.unitOk,
    valid_items: `${e.validCount}/${e.lines.length}`,
    pre_publish: pre,
    suspicious_jumps: suspiciousJumps(e).map((l) => l.item.id),
    caption_words: built.post.kind === "status" ? null : captionWords(built.models.telegram),
    text_gate: problems,
    image_sha256: imageSha,
    items: e.lines.map((l) => ({ id: l.item.id, status: l.status, reason: l.reason, factory: l.row?.factory ?? null, location: l.row?.location ?? null, toman: l.row?.toman ?? null, daily: l.daily, daily_base: l.dailyBase, weekly: l.weekly })),
  };
  fs.writeFileSync(path.join(out, "summary.json"), JSON.stringify(summary, null, 1) + "\n");
  console.log(`dry run ${date}: ${e.validCount}/${e.lines.length} valid items, pre-publish ${pre.ok ? "OK" : `NOT OK (${pre.problems.join("; ")})`}, text gate ${problems.length ? problems.join("; ") : "OK"} → ${out} (nothing sent)`);
} else if (command === "run") {
  if (!values.state) throw new Error("run needs --state <file>");
  const stateFile = path.resolve(values.state);
  const env = process.env;
  const secrets: Secrets = {
    TELEGRAM_BOT_TOKEN: env.TELEGRAM_BOT_TOKEN,
    TELEGRAM_CHANNEL_ID: env.TELEGRAM_CHANNEL_ID,
    TELEGRAM_TEST_CHANNEL_ID: env.TELEGRAM_TEST_CHANNEL_ID,
    BALE_BOT_TOKEN: env.BALE_BOT_TOKEN,
    BALE_CHANNEL_ID: env.BALE_CHANNEL_ID,
    BALE_TEST_CHANNEL_ID: env.BALE_TEST_CHANNEL_ID,
    TELEGRAM_OWNER_CHAT_ID: env.TELEGRAM_OWNER_CHAT_ID,
  };
  const telegram = secrets.TELEGRAM_BOT_TOKEN ? botApi("telegram", secrets.TELEGRAM_BOT_TOKEN) : undefined;
  const bale = secrets.BALE_BOT_TOKEN ? botApi("bale", secrets.BALE_BOT_TOKEN) : undefined;
  const ownerChat = secrets.TELEGRAM_OWNER_CHAT_ID || secrets.TELEGRAM_TEST_CHANNEL_ID;
  const state = readState(stateFile);
  const task = env.PRICE_CHANNEL_TASK === "bulletin" || env.PRICE_CHANNEL_TASK === "exception" ? env.PRICE_CHANNEL_TASK : "auto";
  const outcome = await runChannel({
    now: () => new Date(),
    mode: parseMode(env.PRICE_CHANNEL_MODE),
    task,
    secrets,
    fetchPage: () => fetchPricePage(CHANNEL_CONFIG.origin, CHANNEL_CONFIG.pricesPath),
    sleep: (ms) => new Promise((r) => setTimeout(r, ms)),
    apis: { telegram, bale },
    owner: telegram && ownerChat ? async (text) => {
      const r = await telegram.sendMessage(ownerChat, text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;"));
      if (r.kind !== "sent") throw new Error(r.error);
    } : null,
    state,
    save: (s) => writeState(stateFile, s),
    logoDataUri,
    render: renderCard,
    sourceNames: loadSourceNames(),
  });
  writeState(stateFile, state);
  console.log(JSON.stringify({ event: "outcome", ...outcome }));
  if (env.GITHUB_STEP_SUMMARY) fs.appendFileSync(env.GITHUB_STEP_SUMMARY, `### Price channel\n\n- action: **${outcome.action}**\n- reason: ${outcome.reason}\n- posts: ${outcome.posts.join(", ") || "none"}\n`);
  if (outcome.failed) process.exitCode = 1;
} else {
  console.error("usage: run.ts dry-run [--out dir] [--html file] [--date YYYY-MM-DD] [--state file] [--kind bulletin|status] | run --state file");
  process.exitCode = 2;
}
