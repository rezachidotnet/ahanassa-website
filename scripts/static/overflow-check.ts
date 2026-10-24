/**
 * W25 horizontal-overflow gate: loads pages in headless Chrome at phone widths
 * (mobile emulation, 360 and 390 CSS px) and fails when the page is wider than
 * the viewport (`document.documentElement.scrollWidth > clientWidth`) — the
 * owner's 2026-10-21 report: on a phone the page could be zoomed out and
 * scrolled sideways. Each failure lists the outermost elements that stick out
 * (lib/static/overflow-scan.ts), so the cause can be fixed rather than hidden.
 *
 *   node scripts/static/overflow-check.ts [publicAssetsDir] [--pages /a,/b] [--widths 360,390] [--base-url https://host]
 *
 * Default pages: home, /contact, /prices, /market-indicators, /downloads, /alloy-steel, /alloy-steel/ck45,
 * /tools/weight-calculator (W43), a
 * product page, a price-chart page and the first published article (when the
 * artifact has them), in fa, en and ar where the page exists. Chrome: $CHROME_PATH, else the macOS app path, else `google-chrome`.
 */
import { spawn, type ChildProcess } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { CHROME_START_ATTEMPTS, withRetries } from "../../lib/content-pipeline/smoke-retry.ts";
import { OVERFLOW_SCAN_EXPRESSION, type OverflowScan } from "../../lib/static/overflow-scan.ts";
import { startStaticServer } from "./serve.ts";

const argv = process.argv.slice(2);
const option = (name: string) => {
  const i = argv.indexOf(`--${name}`);
  return i >= 0 ? argv[i + 1] : undefined;
};
const VALUE_OPTIONS = ["--pages", "--widths", "--base-url"];
const positional = argv.filter((a, i) => !a.startsWith("--") && !VALUE_OPTIONS.includes(argv[i - 1]));
const root = path.resolve(positional[0] ?? ".artifact/public-assets");
const baseUrlOption = option("base-url")?.replace(/\/$/, "");
const widths = (option("widths") ?? "360,390").split(",").map(Number);
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
const chromePath = process.env.CHROME_PATH ?? (fs.existsSync("/Applications/Google Chrome.app/Contents/MacOS/Google Chrome") ? "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome" : "google-chrome");

/** The first `<dir>/<name>.html` of a directory in the artifact, as a page path (`/products/x`). */
function firstPage(dir: string): string | null {
  const abs = path.join(root, dir);
  if (!fs.existsSync(abs)) return null;
  const html = fs.readdirSync(abs).filter((f) => f.endsWith(".html") && f !== "404.html" && f !== "index.html").sort()[0];
  return html ? `/${dir}/${html.replace(/\.html$/, "")}` : null;
}

function defaultPages(): string[] {
  const pages: string[] = [];
  for (const prefix of ["", "/en", "/ar"]) {
    const exists = (p: string) => (baseUrlOption !== undefined && p !== "/market-indicators") || fs.existsSync(path.join(root, `${(prefix + p).slice(1) || "index"}.html`));
    // W43: the alloy hub, the guide with the widest weight table (CK45: plate, 3 columns) and the calculator's alloy section.
    for (const p of ["", "/contact", "/prices", "/market-indicators", "/downloads", "/alloy-steel", "/alloy-steel/ck45", "/tools/weight-calculator"]) if (exists(p)) pages.push(prefix + p || "/");
    if (baseUrlOption) continue;
    for (const dir of ["products", "prices/chart", "articles"]) {
      const page = firstPage(`${prefix.slice(1) ? prefix.slice(1) + "/" : ""}${dir}`);
      if (page) pages.push(page);
    }
  }
  return pages;
}
const pages = option("pages")?.split(",").map((p) => p.trim()).filter(Boolean) ?? defaultPages();

const server = baseUrlOption ? { url: baseUrlOption, close: () => {} } : await startStaticServer(root);
let profile!: string;
let chrome!: ChildProcess;
const stopChrome = async (proc: ChildProcess) => {
  const exited = new Promise((r) => proc.once("exit", r));
  proc.kill();
  await Promise.race([exited, sleep(5000)]);
};
const wsUrl = await withRetries(
  async () => {
    profile = fs.mkdtempSync(path.join(os.tmpdir(), "overflow-"));
    const port = 9400 + Math.floor(Math.random() * 400);
    chrome = spawn(chromePath, ["--headless=new", "--disable-gpu", "--no-sandbox", "--hide-scrollbars", `--remote-debugging-port=${port}`, `--user-data-dir=${profile}`, "about:blank"], { stdio: "ignore" });
    let url: string | undefined;
    for (let i = 0; i < 80 && !url; i++) {
      await sleep(250);
      try {
        url = ((await (await fetch(`http://127.0.0.1:${port}/json/list`)).json()) as { type: string; webSocketDebuggerUrl: string }[]).find((t) => t.type === "page")?.webSocketDebuggerUrl;
      } catch {}
    }
    if (!url) {
      await stopChrome(chrome);
      fs.rmSync(profile, { recursive: true, force: true });
      throw new Error(`could not start Chrome at ${chromePath}`);
    }
    return url;
  },
  { attempts: CHROME_START_ATTEMPTS, delayMs: 2000 },
);
const ws = new WebSocket(wsUrl);
await new Promise((r) => ws.addEventListener("open", r));
let id = 0;
const pending = new Map<number, (v: unknown) => void>();
ws.addEventListener("message", (e) => {
  const m = JSON.parse(String(e.data));
  if (m.id && pending.has(m.id)) {
    pending.get(m.id)!(m);
    pending.delete(m.id);
  }
});
const send = (method: string, params: object = {}) =>
  new Promise<{ result?: { result?: { value?: unknown } } }>((r) => {
    const i = ++id;
    pending.set(i, r as (v: unknown) => void);
    ws.send(JSON.stringify({ id: i, method, params }));
  });
const evaluate = async (expression: string) => (await send("Runtime.evaluate", { expression, returnByValue: true, awaitPromise: true })).result?.result?.value;
await send("Page.enable");
await send("Runtime.enable");

let failed = 0;
for (const width of widths) {
  await send("Emulation.setDeviceMetricsOverride", { width, height: 780, deviceScaleFactor: 2, mobile: true });
  for (const page of pages) {
    await send("Page.navigate", { url: `${server.url}${page}` });
    for (let i = 0; i < 75; i++) {
      await sleep(200);
      if ((await evaluate("document.readyState")) === "complete") break;
    }
    // Hydration and the late client content (catalog selector, country names) settle first.
    await sleep(1200);
    const scan = (await evaluate(OVERFLOW_SCAN_EXPRESSION)) as OverflowScan;
    const ok = scan.scrollWidth <= scan.clientWidth;
    if (!ok) failed++;
    console.log(`${ok ? "PASS" : "FAIL"} ${width}px ${page} (scrollWidth ${scan.scrollWidth}, clientWidth ${scan.clientWidth})`);
    if (!ok) for (const o of scan.offenders) console.log(`    ${o.selector}  left ${o.left} right ${o.right} width ${o.width}${o.text ? `  «${o.text}»` : ""}`);
  }
}
ws.close();
await stopChrome(chrome);
server.close();
fs.rmSync(profile, { recursive: true, force: true, maxRetries: 5, retryDelay: 200 });
console.log(`overflow: ${pages.length * widths.length - failed}/${pages.length * widths.length} page views fit the viewport`);
process.exit(failed ? 1 : 0);
