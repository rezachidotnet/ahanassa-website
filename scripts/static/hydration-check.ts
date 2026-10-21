/**
 * Hydration gate (architecture V1.1 §7.1 step 5, A7): loads static pages in
 * headless Chrome and fails on any React error (e.g. #418 text mismatch) or
 * uncaught exception. For /contact it also proves hydration completed: the
 * country <option> labels, rendered as ISO codes in static HTML, are
 * replaced by localized names after hydration. On every page it also
 * hovers each link and fails on any RSC request (`?_rsc=`, `*.rsc`,
 * `RSC: 1`) — architecture V1.1 §4.2 (A1): plain <a> navigation only.
 *
 *   node scripts/static/hydration-check.ts [publicAssetsDir] [--all] [--pages /a,/b] [--strict-console]
 *        [--base-url https://host] [--expect-snapshot snap-…]
 * Chrome: $CHROME_PATH, else the macOS app path, else `google-chrome`. W17.5: a Chrome that does not come up is
 * started again (fresh port and profile), up to 3 starts, before "could not start Chrome" fails the run.
 *
 * W4 additions: `--strict-console` fails a page on ANY console.error or exception (interactive pages:
 * form, filters); `--pages` limits the page list; `--base-url` checks a deployed host instead of the
 * local server (staging smoke); `--expect-snapshot` requires every /contact page to carry that
 * snapshot_version (the version the RFQ form sends; W25: in the page itself, no longer fetched from
 * /manifest.public.json) and to load its RFQ catalog file.
 */
import { spawn, type ChildProcess } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { CHROME_START_ATTEMPTS, withRetries } from "../../lib/content-pipeline/smoke-retry.ts";
import { startStaticServer } from "./serve.ts";

const argv = process.argv.slice(2);
const option = (name: string) => {
  const i = argv.indexOf(`--${name}`);
  return i >= 0 ? argv[i + 1] : undefined;
};
const VALUE_OPTIONS = ["--pages", "--base-url", "--expect-snapshot"];
const positional = argv.filter((a, i) => !a.startsWith("--") && !VALUE_OPTIONS.includes(argv[i - 1]));
const root = path.resolve(positional[0] ?? ".artifact/public-assets");
const all = argv.includes("--all");
const strictConsole = argv.includes("--strict-console");
const baseUrlOption = option("base-url")?.replace(/\/$/, "");
const expectSnapshot = option("expect-snapshot");
const pagesOption = option("pages")?.split(",").map((p) => p.trim()).filter(Boolean);
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
const chromePath = process.env.CHROME_PATH ?? (fs.existsSync("/Applications/Google Chrome.app/Contents/MacOS/Google Chrome") ? "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome" : "google-chrome");

const pages: string[] = pagesOption
  ? pagesOption
  : all
  ? fs
      .readdirSync(root, { recursive: true })
      .map(String)
      .filter((f) => f.endsWith(".html") && !f.endsWith("404.html"))
      .map((f) => `/${f.replace(/\.html$/, "").replace(/(^|\/)index$/, "")}`)
  : ["/contact", "/en/contact", "/ar/contact"];

const server = baseUrlOption ? { url: baseUrlOption, close: () => {} } : await startStaticServer(root);
const removeProfile = (dir: string) => {
  try {
    fs.rmSync(dir, { recursive: true, force: true, maxRetries: 5, retryDelay: 200 });
  } catch {
    // a leftover temp profile must not fail the gate
  }
};
const stopChrome = async (proc: ChildProcess) => {
  const exited = new Promise((r) => proc.once("exit", r));
  proc.kill();
  await Promise.race([exited, sleep(5000)]);
};
// W17.5: a Chrome that does not come up (2026-10-14, "could not start Chrome") is retried with a fresh port and
// profile, up to CHROME_START_ATTEMPTS starts; the last failure keeps its message (lib/content-pipeline/smoke-retry.ts).
let profile!: string;
let chrome!: ChildProcess;
const wsUrl = await withRetries(
  async () => {
    profile = fs.mkdtempSync(path.join(os.tmpdir(), "hydration-"));
    const port = 9400 + Math.floor(Math.random() * 400);
    chrome = spawn(chromePath, ["--headless=new", "--disable-gpu", "--no-sandbox", `--remote-debugging-port=${port}`, `--user-data-dir=${profile}`, "about:blank"], { stdio: "ignore" });
    let url: string | undefined;
    for (let i = 0; i < 80 && !url; i++) {
      await sleep(250);
      try {
        url = ((await (await fetch(`http://127.0.0.1:${port}/json/list`)).json()) as { type: string; webSocketDebuggerUrl: string }[]).find((t) => t.type === "page")?.webSocketDebuggerUrl;
      } catch {}
    }
    if (!url) {
      await stopChrome(chrome);
      removeProfile(profile);
      throw new Error(`could not start Chrome at ${chromePath}`);
    }
    return url;
  },
  { attempts: CHROME_START_ATTEMPTS, delayMs: 2000, onRetry: (attempt, error) => console.error(`Chrome start attempt ${attempt}/${CHROME_START_ATTEMPTS} failed (${error instanceof Error ? error.message : String(error)}); retrying`) },
);
const ws = new WebSocket(wsUrl);
await new Promise((r) => ws.addEventListener("open", r));
let id = 0;
const pending = new Map<number, (v: unknown) => void>();
let errors: string[] = [];
let rscRequests: string[] = [];
const catalogRequests = new Map<string, string>(); // requestId -> url (/data/rfq-catalog.*)
let catalogLoads: { url: string; status: number }[] = [];
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
    if (/\/data\/rfq-catalog\.[^/]*\.json(\?|$)/.test(req.url)) catalogRequests.set(m.params.requestId, req.url);
  }
  if (m.method === "Network.responseReceived" && catalogRequests.has(m.params.requestId)) catalogLoads.push({ url: catalogRequests.get(m.params.requestId)!.replace(server.url, ""), status: m.params.response.status });
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

const results: { page: string; ok: boolean; errors: string[]; hydrated?: boolean; sampleOption?: string; snapshotVersion?: string | null }[] = [];
for (const page of pages) {
  errors = [];
  rscRequests = [];
  catalogLoads = [];
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
    if (expectSnapshot) {
      for (let i = 0; i < 20 && catalogLoads.length === 0; i++) await sleep(200);
      // The page's own HTML (as served) carries the version the form sends with the RFQ.
      const html = String((await evaluate("fetch(location.href, { cache: \"no-store\" }).then((r) => r.text())")) ?? "");
      const version = html.includes(`\\"${expectSnapshot}\\"`) || html.includes(`"${expectSnapshot}"`) ? expectSnapshot : (/snap-[0-9a-f]{16}/.exec(html)?.[0] ?? null);
      row.snapshotVersion = version;
      if (version !== expectSnapshot) row.errors.push(`snapshot: page carries ${version ?? "no snapshot_version"}, expected ${expectSnapshot}`);
      const catalog = catalogLoads.find((l) => l.status === 200);
      if (!catalog) row.errors.push(`snapshot: no RFQ catalog file loaded (${catalogLoads.map((l) => `${l.url} ${l.status}`).join(", ") || "none requested"})`);
    }
  }
  const reactErrors = row.errors.filter((e) => strictConsole || /Minified React error|Hydration|hydrat|exception:|RSC requests|snapshot:/i.test(e));
  row.ok = reactErrors.length === 0 && row.hydrated !== false;
  results.push(row);
}
ws.close();
await stopChrome(chrome);
server.close();
removeProfile(profile);
for (const r of results) console.log(`${r.ok ? "PASS" : "FAIL"} ${r.page}${r.sampleOption !== undefined ? ` (IR option: "${r.sampleOption}")` : ""}${r.snapshotVersion !== undefined ? ` (form snapshot: ${r.snapshotVersion})` : ""}${r.errors.length ? ` — ${r.errors.join(" | ")}` : ""}`);
const failed = results.filter((r) => !r.ok);
console.log(`hydration: ${results.length - failed.length}/${results.length} pages clean`);
process.exit(failed.length ? 1 : 0);
