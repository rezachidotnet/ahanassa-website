/**
 * Hydration gate (architecture V1.1 §7.1 step 5, A7): loads static pages in
 * headless Chrome and fails on any React error (e.g. #418 text mismatch) or
 * uncaught exception. For /contact it also proves hydration completed: the
 * country <option> labels, rendered as ISO codes in static HTML, are
 * replaced by localized names after hydration. On every page it also
 * hovers each link and fails on any RSC request (`?_rsc=`, `*.rsc`,
 * `RSC: 1`) — architecture V1.1 §4.2 (A1): plain <a> navigation only.
 *
 *   node scripts/static/hydration-check.ts [publicAssetsDir] [--all]
 * Chrome: $CHROME_PATH, else the macOS app path, else `google-chrome`.
 */
import { spawn } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { startStaticServer } from "./serve.ts";

const root = path.resolve(process.argv.find((a, i) => i >= 2 && !a.startsWith("--")) ?? ".artifact/public-assets");
const all = process.argv.includes("--all");
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
const chromePath = process.env.CHROME_PATH ?? (fs.existsSync("/Applications/Google Chrome.app/Contents/MacOS/Google Chrome") ? "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome" : "google-chrome");

const pages: string[] = all
  ? fs
      .readdirSync(root, { recursive: true })
      .map(String)
      .filter((f) => f.endsWith(".html") && !f.endsWith("404.html"))
      .map((f) => `/${f.replace(/\.html$/, "").replace(/(^|\/)index$/, "")}`)
  : ["/contact", "/en/contact", "/ar/contact"];

const server = await startStaticServer(root);
const profile = fs.mkdtempSync(path.join(os.tmpdir(), "hydration-"));
const port = 9400 + Math.floor(Math.random() * 400);
const chrome = spawn(chromePath, ["--headless=new", "--disable-gpu", "--no-sandbox", `--remote-debugging-port=${port}`, `--user-data-dir=${profile}`, "about:blank"], { stdio: "ignore" });
let wsUrl: string | undefined;
for (let i = 0; i < 80 && !wsUrl; i++) {
  await sleep(250);
  try {
    wsUrl = ((await (await fetch(`http://127.0.0.1:${port}/json/list`)).json()) as { type: string; webSocketDebuggerUrl: string }[]).find((t) => t.type === "page")?.webSocketDebuggerUrl;
  } catch {}
}
if (!wsUrl) throw new Error(`could not start Chrome at ${chromePath}`);
const ws = new WebSocket(wsUrl);
await new Promise((r) => ws.addEventListener("open", r));
let id = 0;
const pending = new Map<number, (v: unknown) => void>();
let errors: string[] = [];
let rscRequests: string[] = [];
ws.addEventListener("message", (e) => {
  const m = JSON.parse(String(e.data));
  if (m.id && pending.has(m.id)) {
    pending.get(m.id)!(m);
    pending.delete(m.id);
  }
  if (m.method === "Network.requestWillBeSent") {
    const req = m.params.request as { url: string; headers: Record<string, string> };
    const rscHeader = Object.entries(req.headers ?? {}).some(([k, v]) => k.toLowerCase() === "rsc" && v === "1");
    if (/[?&]_rsc=|\.rsc(\?|$)/.test(req.url) || rscHeader) rscRequests.push(req.url.replace(server.url, ""));
  }
  if (m.method === "Runtime.exceptionThrown") errors.push(`exception: ${m.params.exceptionDetails.exception?.description ?? m.params.exceptionDetails.text}`.slice(0, 300));
  if (m.method === "Runtime.consoleAPICalled" && m.params.type === "error") errors.push(`console.error: ${m.params.args.map((a: { value?: unknown; description?: string }) => a.value ?? a.description).join(" ")}`.slice(0, 300));
});
const send = (method: string, params: object = {}) =>
  new Promise<{ result?: { result?: { value?: unknown } } }>((r) => {
    const i = ++id;
    pending.set(i, r as (v: unknown) => void);
    ws.send(JSON.stringify({ id: i, method, params }));
  });
await send("Runtime.enable");
await send("Page.enable");
await send("Network.enable");
const evaluate = async (expression: string) => (await send("Runtime.evaluate", { expression, returnByValue: true, awaitPromise: true })).result?.result?.value;

const results: { page: string; ok: boolean; errors: string[]; hydrated?: boolean; sampleOption?: string }[] = [];
for (const page of pages) {
  errors = [];
  rscRequests = [];
  await send("Page.navigate", { url: `${server.url}${page}` });
  for (let i = 0; i < 60; i++) {
    await sleep(200);
    if ((await evaluate("document.readyState")) === "complete") break;
  }
  await sleep(1000);
  // Prefetch triggers: hover every visible link (viewport/hover prefetch would fire an RSC request).
  const points = ((await evaluate(`[...document.querySelectorAll("a[href^='/']")].map(a => { const r = a.getBoundingClientRect(); return r.width > 0 && r.height > 0 && r.top >= 0 && r.top < innerHeight ? [r.left + r.width / 2, r.top + r.height / 2] : null; }).filter(Boolean).slice(0, 60)`)) ?? []) as [number, number][];
  for (const [x, y] of points) await send("Input.dispatchMouseEvent", { type: "mouseMoved", x, y });
  await sleep(800);
  const row: (typeof results)[number] = { page, ok: true, errors: [...errors] };
  if (rscRequests.length) row.errors.push(`RSC requests: ${rscRequests.slice(0, 5).join(", ")}`);
  if (page.endsWith("/contact")) {
    const option = String((await evaluate(`document.querySelector('select[name=phoneCountry] option[value="IR"]')?.textContent ?? ""`)) ?? "");
    row.sampleOption = option;
    row.hydrated = option.length > 0 && !/^\+\d+ IR$/.test(option.trim());
    if (!row.hydrated) row.errors.push(`not hydrated: country option still "${option}"`);
  }
  const reactErrors = row.errors.filter((e) => /Minified React error|Hydration|hydrat|exception:|RSC requests/i.test(e));
  row.ok = reactErrors.length === 0 && row.hydrated !== false;
  results.push(row);
}
ws.close();
const exited = new Promise((r) => chrome.once("exit", r));
chrome.kill();
await Promise.race([exited, sleep(5000)]);
server.close();
try {
  fs.rmSync(profile, { recursive: true, force: true, maxRetries: 5, retryDelay: 200 });
} catch {
  // a leftover temp profile must not fail the gate
}
for (const r of results) console.log(`${r.ok ? "PASS" : "FAIL"} ${r.page}${r.sampleOption !== undefined ? ` (IR option: "${r.sampleOption}")` : ""}${r.errors.length ? ` — ${r.errors.join(" | ")}` : ""}`);
const failed = results.filter((r) => !r.ok);
console.log(`hydration: ${results.length - failed.length}/${results.length} pages clean`);
process.exit(failed.length ? 1 : 0);
