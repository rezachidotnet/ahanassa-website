// Minimal Chrome DevTools Protocol helper (headless Chrome; Spike S1 — base URL from SPIKE_BASE).
import { spawn } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

export const BASE = process.env.SPIKE_BASE;
const CH = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
export const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
export const VIEWS = {
  desktop: { width: 1440, height: 900, deviceScaleFactor: 1, mobile: false },
  mobile: { width: 390, height: 844, deviceScaleFactor: 3, mobile: true },
};
export const prefix = (loc) => (loc === "fa" ? "" : `/${loc}`);

export async function launch(port = 9340) {
  const prof = fs.mkdtempSync(path.join(os.tmpdir(), "cdp-"));
  const chrome = spawn(CH, ["--headless=new", "--disable-gpu", `--remote-debugging-port=${port}`, `--user-data-dir=${prof}`, "about:blank"], { stdio: "ignore" });
  let wsUrl;
  for (let i = 0; i < 60 && !wsUrl; i++) {
    await sleep(250);
    try { wsUrl = (await (await fetch(`http://127.0.0.1:${port}/json/list`)).json()).find((t) => t.type === "page")?.webSocketDebuggerUrl; } catch {}
  }
  const ws = new WebSocket(wsUrl);
  await new Promise((r) => ws.addEventListener("open", r));
  let id = 0;
  const pending = new Map();
  const listeners = new Set();
  ws.addEventListener("message", (e) => {
    const m = JSON.parse(e.data);
    if (m.id && pending.has(m.id)) { pending.get(m.id)(m); pending.delete(m.id); }
    if (m.method) for (const l of listeners) l(m);
  });
  const send = (method, params = {}) => new Promise((r) => { const i = ++id; pending.set(i, r); ws.send(JSON.stringify({ id: i, method, params })); });
  await send("Page.enable"); await send("Runtime.enable"); await send("Network.enable"); await send("Log.enable");
  const evaluate = async (expression) => {
    const r = await send("Runtime.evaluate", { expression, awaitPromise: true, returnByValue: true });
    if (r.result?.exceptionDetails) throw new Error(r.result.exceptionDetails.exception?.description ?? "evaluate failed");
    return r.result?.result?.value;
  };
  const setView = async (v) => { await send("Emulation.setDeviceMetricsOverride", VIEWS[v]); await send("Emulation.setTouchEmulationEnabled", { enabled: VIEWS[v].mobile }); };
  const navigate = async (url) => {
    await send("Page.navigate", { url });
    for (let i = 0; i < 80; i++) { await sleep(250); try { if ((await evaluate("document.readyState")) === "complete") break; } catch {} }
    await sleep(1500); // hydration + idle prefetch
  };
  const close = () => { try { ws.close(); } catch {} chrome.kill(); fs.rmSync(prof, { recursive: true, force: true }); };
  return { send, evaluate, setView, navigate, close, on: (fn) => listeners.add(fn), off: (fn) => listeners.delete(fn) };
}
