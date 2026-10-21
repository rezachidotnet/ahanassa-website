/**
 * W25.3: measures the fallback-font metrics for Estedad and writes
 *   lib/fonts/estedad-fallback-metrics.json  (the evidence: font hash, ranges, sample size, ratios)
 *   styles/estedad-fallback.css             (the @font-face rules, lib/fonts/estedad-fallback.ts#renderFallbackCss)
 *
 *   node scripts/fonts/estedad-fallback-metrics.ts <publicAssetsDir> [--font-file "<local name>=<path>"]...
 *
 * The sample is the site's own text: every Arabic-script word of the fa and ar home and contact pages, and every
 * Latin word of the en ones, as the built artifact renders them. Each word is laid out in Chrome (so Persian
 * shaping is included) at 100 px, once in Estedad (the exact file in lib/fonts/assets) and once in each fallback
 * font, at 400 and 700; size-adjust = total Estedad width ÷ total fallback width. Ascent/descent come from
 * Estedad's own tables (OS/2 typo metrics; USE_TYPO_METRICS is set).
 *
 * A fallback font must be installed locally or given with --font-file (e.g. Noto Naskh Arabic UI and Roboto on
 * macOS, both OFL, from the Noto and Google Fonts repositories); the script fails if any font cannot be loaded.
 * Chrome: $CHROME_PATH, else the macOS app path, else `google-chrome`.
 */
import { spawn, type ChildProcess } from "node:child_process";
import crypto from "node:crypto";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import fontkit from "@pdf-lib/fontkit";
import {
  ESTEDAD_FALLBACK_FAMILIES,
  FALLBACK_MEASURE_WEIGHT,
  isArabicScript,
  renderFallbackCss,
  unicodeRanges,
  type EstedadFallbackMetrics,
  type FallbackScript,
  type FallbackWeight,
} from "../../lib/fonts/estedad-fallback.ts";
import { startStaticServer } from "../static/serve.ts";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const FONT_FILE = "lib/fonts/assets/Estedad-Variable.woff2";
const argv = process.argv.slice(2);
const root = path.resolve(argv.find((a, i) => !a.startsWith("--") && argv[i - 1] !== "--font-file") ?? ".artifact/public-assets");
const fontFiles = new Map<string, string>();
argv.forEach((a, i) => {
  if (a === "--font-file") {
    const [name, file] = argv[i + 1].split("=");
    fontFiles.set(name, path.resolve(file));
  }
});
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
const chromePath = process.env.CHROME_PATH ?? (fs.existsSync("/Applications/Google Chrome.app/Contents/MacOS/Google Chrome") ? "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome" : "google-chrome");

// --- Estedad's own metrics and coverage --------------------------------------------------------------------------
const fontBytes = fs.readFileSync(path.join(ROOT, FONT_FILE));
const estedad = fontkit.create(fontBytes) as unknown as { unitsPerEm: number; characterSet: number[]; "OS/2": { typoAscender: number; typoDescender: number; typoLineGap: number } };
const os2 = estedad["OS/2"];
const coverage = estedad.characterSet.filter((cp) => cp >= 0x20);
const ranges: Record<FallbackScript, string> = {
  arabic: unicodeRanges(coverage.filter(isArabicScript)),
  latin: unicodeRanges(coverage.filter((cp) => !isArabicScript(cp))),
};

// --- Chrome ------------------------------------------------------------------------------------------------------
const server = await startStaticServer(root);
const profile = fs.mkdtempSync(path.join(os.tmpdir(), "fallback-metrics-"));
const port = 9300 + Math.floor(Math.random() * 400);
const chrome: ChildProcess = spawn(chromePath, ["--headless=new", "--disable-gpu", "--no-sandbox", `--remote-debugging-port=${port}`, `--user-data-dir=${profile}`, "about:blank"], { stdio: "ignore" });
let wsUrl: string | undefined;
for (let i = 0; i < 80 && !wsUrl; i++) {
  await sleep(250);
  try {
    wsUrl = ((await (await fetch(`http://127.0.0.1:${port}/json/list`)).json()) as { type: string; webSocketDebuggerUrl: string }[]).find((t) => t.type === "page")?.webSocketDebuggerUrl;
  } catch {}
}
if (!wsUrl) throw new Error(`could not start Chrome at ${chromePath}`);
const browser = ((await (await fetch(`http://127.0.0.1:${port}/json/version`)).json()) as { Browser: string }).Browser;
const ws = new WebSocket(wsUrl);
await new Promise((r) => ws.addEventListener("open", r));
let id = 0;
const pending = new Map<number, (v: { result?: { result?: { value?: unknown }; exceptionDetails?: unknown } }) => void>();
ws.addEventListener("message", (e) => {
  const m = JSON.parse(String(e.data));
  if (m.id && pending.has(m.id)) {
    pending.get(m.id)!(m);
    pending.delete(m.id);
  }
});
const send = (method: string, params: object = {}) =>
  new Promise<{ result?: { result?: { value?: unknown }; exceptionDetails?: unknown } }>((r) => {
    const i = ++id;
    pending.set(i, r);
    ws.send(JSON.stringify({ id: i, method, params }));
  });
const evaluate = async (expression: string) => {
  const res = await send("Runtime.evaluate", { expression, returnByValue: true, awaitPromise: true });
  if (res.result?.exceptionDetails) throw new Error(JSON.stringify(res.result.exceptionDetails));
  return res.result?.result?.value;
};
await send("Page.enable");
await send("Runtime.enable");

// --- the sample: the site's own words ----------------------------------------------------------------------------
const PAGES: Record<FallbackScript, string[]> = { arabic: ["/", "/contact", "/ar", "/ar/contact"], latin: ["/en", "/en/contact"] };
const WORD: Record<FallbackScript, RegExp> = {
  arabic: /^[؀-ۿݐ-ݿࡰ-ࣿﭐ-﷿ﹰ-﻿‌]+$/,
  latin: /^[!-~ -ɏ]+$/,
};
const words: Record<FallbackScript, string[]> = { arabic: [], latin: [] };
for (const script of ["arabic", "latin"] as const) {
  for (const page of PAGES[script]) {
    await send("Page.navigate", { url: `${server.url}${page}` });
    for (let i = 0; i < 75 && (await evaluate("document.readyState")) !== "complete"; i++) await sleep(200);
    const text = String(await evaluate("document.body.innerText"));
    words[script].push(...text.split(/\s+/).filter((w) => WORD[script].test(w)));
  }
}

// --- measure ------------------------------------------------------------------------------------------------------
interface Probe {
  name: string;
  weight: number;
  local?: string;
  base64?: string;
}
const probes: Probe[] = [400, 700].map((weight) => ({ name: `m-estedad-${weight}`, weight, base64: fontBytes.toString("base64") }));
for (const fam of ESTEDAD_FALLBACK_FAMILIES)
  for (const face of fam.faces) {
    const file = face.local.map((n) => fontFiles.get(n)).find(Boolean);
    probes.push({ name: `m-${fam.family}-${face.script}-${face.weight}`, weight: FALLBACK_MEASURE_WEIGHT[face.weight], ...(file ? { base64: fs.readFileSync(file).toString("base64") } : { local: face.local[0] }) });
  }

const MEASURE = `async (probes, words) => {
  const loaded = {};
  for (const p of probes) {
    const src = p.local ? 'local("' + p.local + '")' : Uint8Array.from(atob(p.base64), (c) => c.charCodeAt(0)).buffer;
    const face = new FontFace(p.name, src, { weight: p.local ? "normal" : "100 900" });
    try { await face.load(); document.fonts.add(face); loaded[p.name] = true; } catch { loaded[p.name] = false; }
  }
  const box = document.createElement("div");
  box.style.cssText = "position:absolute;top:0;left:0;width:100000px;font-size:100px;line-height:1;white-space:nowrap;direction:rtl";
  document.body.replaceChildren(box);
  const width = (family, weight, list) => {
    box.style.fontFamily = '"' + family + '"';
    box.style.fontWeight = String(weight);
    box.replaceChildren(...list.map((w) => Object.assign(document.createElement("span"), { textContent: w, style: "display:inline-block" })));
    let sum = 0;
    for (const s of box.children) sum += s.getBoundingClientRect().width;
    return sum;
  };
  const out = {};
  for (const p of probes) out[p.name] = loaded[p.name] ? { arabic: width(p.name, p.weight, words.arabic), latin: width(p.name, p.weight, words.latin) } : null;
  return out;
}`;
const widths = (await evaluate(`(${MEASURE})(${JSON.stringify(probes)}, ${JSON.stringify(words)})`)) as Record<string, Record<FallbackScript, number> | null>;
ws.close();
chrome.kill();
server.close();
await sleep(500);
fs.rmSync(profile, { recursive: true, force: true, maxRetries: 5, retryDelay: 200 });

const missing = Object.entries(widths).filter(([, v]) => !v).map(([k]) => k);
if (missing.length) {
  console.error(`could not load: ${missing.join(", ")} — install the font or pass --font-file "<local name>=<path>"`);
  process.exit(1);
}

const sizeAdjust: EstedadFallbackMetrics["sizeAdjust"] = {};
for (const fam of ESTEDAD_FALLBACK_FAMILIES) {
  sizeAdjust[fam.family] = { arabic: {} as Record<FallbackWeight, number>, latin: {} as Record<FallbackWeight, number> };
  for (const face of fam.faces) {
    const w = FALLBACK_MEASURE_WEIGHT[face.weight];
    const ratio = widths[`m-estedad-${w}`]![face.script] / widths[`m-${fam.family}-${face.script}-${face.weight}`]![face.script];
    sizeAdjust[fam.family][face.script][face.weight] = Number(ratio.toFixed(4));
  }
}

const metrics: EstedadFallbackMetrics = {
  schema: "estedad-fallback-metrics.v1",
  font: {
    file: FONT_FILE,
    sha256: crypto.createHash("sha256").update(fontBytes).digest("hex"),
    unitsPerEm: estedad.unitsPerEm,
    ascent: os2.typoAscender,
    descent: os2.typoDescender,
    lineGap: os2.typoLineGap,
  },
  ranges,
  measured: {
    date: new Date().toISOString().slice(0, 10),
    browser,
    pages: [...PAGES.arabic, ...PAGES.latin],
    words: { arabic: words.arabic.length, latin: words.latin.length },
  },
  sizeAdjust,
};
fs.writeFileSync(path.join(ROOT, "lib/fonts/estedad-fallback-metrics.json"), JSON.stringify(metrics, null, 2) + "\n");
fs.writeFileSync(path.join(ROOT, "styles/estedad-fallback.css"), renderFallbackCss(metrics));
console.log(JSON.stringify({ words: metrics.measured.words, sizeAdjust }, null, 2));
process.exit(0);
