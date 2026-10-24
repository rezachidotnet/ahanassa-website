/**
 * W41 — the daily Bale story CLI (lib/bale-story/).
 *
 *   node scripts/bale-story/run.ts dry-run [--out <dir>] [--date YYYY-MM-DD] [--item <id>] [--all] [--days <n>]
 *     Renders the story of the day (or of --item, or --all ready items) to <dir> (default ./bale-story-dry-run):
 *     story.png + story.svg, both captions, the buttons and a summary with the gate's verdict; plus rotation.json
 *     (the next --days working days, default 30) and needs-facts.json. Never sends anything, never writes a state.
 *     The gate checks the price-source names when AHANASSA_PRICE_SOURCE_NAMES_FILE is set (reported otherwise).
 *
 *   node scripts/bale-story/run.ts run --state <state.json>
 *     One scheduled run (the workflow on main, 09:00 Tehran). Env: STORY_MODE (off|owner|owner+channel; anything
 *     else = off), BALE_BOT_TOKEN, BALE_OWNER_CHAT_ID, BALE_CHANNEL_ID (owner+channel only), the owner-alert
 *     fallbacks TELEGRAM_BOT_TOKEN + TELEGRAM_OWNER_CHAT_ID (optional), AHANASSA_PRICE_SOURCE_NAMES_FILE (required
 *     to send). The state file is rewritten after every step. Exit 1 when the story could not be delivered.
 */
import fs from "node:fs";
import path from "node:path";
import { parseArgs } from "node:util";
import { STORY_CONFIG, STORY_ITEMS } from "../../config/raw-material-stories.ts";
import { renderStory } from "../../lib/bale-story/card.ts";
import { suggestedStoryText } from "../../lib/bale-story/compose.ts";
import { longestGroupRun, needsFacts, storyItemFor, storySequence, upcoming } from "../../lib/bale-story/rotation.ts";
import { buildStoryPost, runStory } from "../../lib/bale-story/run.ts";
import { emptyStoryState, parseStoryMode, parseStoryState, type StoryState } from "../../lib/bale-story/state.ts";
import { botApi } from "../../lib/price-channel/bots.ts";
import { tehranDate } from "../../lib/price-channel/calendar.ts";
import { ownerAlerter } from "../../lib/price-channel/owner.ts";
import { loadSourceNames } from "../../lib/static/source-name-scan.ts";

const repo = path.resolve(import.meta.dirname, "../..");
const logoDataUri = `data:image/jpeg;base64,${fs.readFileSync(path.join(repo, "public/brand/ahan-asa-mark-jpg-512w.jpg")).toString("base64")}`;

const { positionals, values } = parseArgs({
  allowPositionals: true,
  options: { out: { type: "string" }, date: { type: "string" }, item: { type: "string" }, all: { type: "boolean" }, days: { type: "string" }, state: { type: "string" } },
});
const command = positionals[0];

function writeState(file: string, state: StoryState) {
  const tmp = `${file}.tmp`;
  fs.writeFileSync(tmp, JSON.stringify(state, null, 1) + "\n");
  fs.renameSync(tmp, file);
}

if (command === "dry-run") {
  const out = path.resolve(values.out ?? "bale-story-dry-run");
  fs.mkdirSync(out, { recursive: true });
  const date = values.date ?? tehranDate(new Date());
  const names = loadSourceNames();
  const seq = storySequence();
  const chosen = values.all ? seq : values.item ? STORY_ITEMS.filter((i) => i.id === values.item) : [storyItemFor(date)].filter((i) => i !== null);
  if (!chosen.length) throw new Error(values.item ? `no story item ${values.item}` : "no story item is ready");
  let failed = false;
  for (const [n, item] of chosen.entries()) {
    const dir = chosen.length > 1 ? path.join(out, `${String(seq.indexOf(item) + 1).padStart(2, "0")}-${item.id}`) : out;
    fs.mkdirSync(dir, { recursive: true });
    const built = buildStoryPost(item, logoDataUri, names, false);
    const { png, sha256 } = await renderStory(built.card);
    fs.writeFileSync(path.join(dir, "story.png"), png);
    fs.writeFileSync(path.join(dir, "story.svg"), built.card.svg.replace(/data:image\/jpeg;base64,[A-Za-z0-9+/=]+/g, "logo.jpg"));
    fs.writeFileSync(path.join(dir, "caption.owner.md"), built.captions.owner + "\n");
    fs.writeFileSync(path.join(dir, "caption.channel.md"), built.captions.channel + "\n");
    fs.writeFileSync(path.join(dir, "buttons.json"), JSON.stringify(built.keyboards, null, 1) + "\n");
    const summary = {
      item: item.id,
      group: item.group,
      rotation_position: seq.indexOf(item) + 1,
      qr_url: built.links.story,
      channel_url: built.links.channel,
      suggested_story_text: suggestedStoryText(item, built.links),
      facts: item.facts,
      text_gate: built.problems,
      source_name_scan: names ? "ran" : "not_run (AHANASSA_PRICE_SOURCE_NAMES_FILE unset)",
      image_sha256: sha256,
    };
    fs.writeFileSync(path.join(dir, "summary.json"), JSON.stringify(summary, null, 1) + "\n");
    if (built.problems.length) failed = true;
    console.log(`${n + 1}/${chosen.length} ${item.id}: gate ${built.problems.length ? built.problems.join("; ") : "OK"}${names ? "" : " (source names not checked)"} → ${dir}`);
  }
  const days = Number(values.days ?? 30);
  fs.writeFileSync(
    path.join(out, "rotation.json"),
    JSON.stringify({ order: STORY_CONFIG.order, rotation_start: STORY_CONFIG.rotationStart, sequence: seq.map((i) => `${i.group}:${i.id}`), longest_group_run: longestGroupRun(seq), max_group_run: STORY_CONFIG.maxGroupRun, upcoming: upcoming(date, days).map((d) => ({ date: d.date, item: d.item?.id ?? null })) }, null, 1) + "\n",
  );
  fs.writeFileSync(path.join(out, "needs-facts.json"), JSON.stringify(needsFacts().map((i) => ({ id: i.id, group: i.group, name: i.name, todo: i.todo ?? null })), null, 1) + "\n");
  if (longestGroupRun(seq) > STORY_CONFIG.maxGroupRun) console.log(`warning: a group runs ${longestGroupRun(seq)} days in a row (max ${STORY_CONFIG.maxGroupRun}): add items to the smaller group or reorder`);
  console.log(`dry run ${date}: nothing sent → ${out}`);
  if (failed) process.exitCode = 1;
} else if (command === "run") {
  if (!values.state) throw new Error("run needs --state <file>");
  const stateFile = path.resolve(values.state);
  const env = process.env;
  const bale = env.BALE_BOT_TOKEN ? botApi("bale", env.BALE_BOT_TOKEN) : undefined;
  const telegram = env.TELEGRAM_BOT_TOKEN ? botApi("telegram", env.TELEGRAM_BOT_TOKEN) : undefined;
  const state = values.state && fs.existsSync(stateFile) ? parseStoryState(JSON.parse(fs.readFileSync(stateFile, "utf8"))) : emptyStoryState();
  const outcome = await runStory({
    now: () => new Date(),
    mode: parseStoryMode(env.STORY_MODE),
    secrets: { BALE_BOT_TOKEN: env.BALE_BOT_TOKEN, BALE_OWNER_CHAT_ID: env.BALE_OWNER_CHAT_ID, BALE_CHANNEL_ID: env.BALE_CHANNEL_ID },
    bale,
    owner: ownerAlerter({ bale, baleChat: env.BALE_OWNER_CHAT_ID, telegram, telegramChat: env.TELEGRAM_OWNER_CHAT_ID }),
    state,
    save: (s) => writeState(stateFile, s),
    logoDataUri,
    render: renderStory,
    sourceNames: loadSourceNames(),
  });
  writeState(stateFile, state);
  console.log(JSON.stringify({ event: "outcome", ...outcome }));
  if (env.GITHUB_STEP_SUMMARY) fs.appendFileSync(env.GITHUB_STEP_SUMMARY, `### Bale story\n\n- action: **${outcome.action}**\n- item: ${outcome.item ?? "none"}\n- reason: ${outcome.reason}\n`);
  if (outcome.failed) process.exitCode = 1;
} else {
  console.error("usage: run.ts dry-run [--out dir] [--date YYYY-MM-DD] [--item id] [--all] [--days n] | run --state file");
  process.exitCode = 2;
}
