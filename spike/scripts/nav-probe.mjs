// Spike S1: client-navigation probe. For each locale: load a start page,
// scroll + hover header links (prefetch triggers), then CLICK a chain of
// internal links and record, per click, whether the browser made a full
// Document request or an RSC fetch (?_rsc= / RSC: 1 / *.rsc), plus status codes.
import fs from "node:fs";
import { launch, BASE, prefix, sleep } from "./cdp.mjs";

const OUT = process.argv[2];
const port = Number(process.argv[3] ?? 9351);
const b = await launch(port);
const reqs = new Map();
b.on((m) => {
  if (m.method === "Network.requestWillBeSent") {
    const r = m.params.request;
    const h = Object.fromEntries(Object.entries(r.headers || {}).map(([k, v]) => [k.toLowerCase(), v]));
    const rsc = /[?&]_rsc=/.test(r.url) || /\.rsc(\?|$)/.test(r.url) || h["rsc"] === "1";
    reqs.set(m.params.requestId, { url: r.url.replace(BASE, ""), type: m.params.type, method: r.method, rsc });
  }
  if (m.method === "Network.responseReceived" && reqs.has(m.params.requestId)) {
    const x = reqs.get(m.params.requestId);
    x.status = m.params.response.status;
    x.contentType = m.params.response.headers["content-type"] ?? m.params.response.headers["Content-Type"];
  }
});
const snapshot = () => [...reqs.values()];
const clickHref = async (selector) => {
  const pt = await b.evaluate(`(() => { const a = document.querySelector(${JSON.stringify(selector)}); if (!a) return null; a.scrollIntoView({block:"center"}); const r = a.getBoundingClientRect(); return { href: a.getAttribute('href'), x: r.left + r.width/2, y: r.top + r.height/2 }; })()`);
  if (!pt) return null;
  await b.send("Input.dispatchMouseEvent", { type: "mouseMoved", x: pt.x, y: pt.y });
  await sleep(300);
  await b.send("Input.dispatchMouseEvent", { type: "mousePressed", x: pt.x, y: pt.y, button: "left", clickCount: 1 });
  await b.send("Input.dispatchMouseEvent", { type: "mouseReleased", x: pt.x, y: pt.y, button: "left", clickCount: 1 });
  for (let i = 0; i < 40; i++) { await sleep(250); try { if ((await b.evaluate("document.readyState")) === "complete") break; } catch {} }
  await sleep(1500);
  return pt.href;
};

const results = [];
for (const view of ["desktop", "mobile"]) {
  await b.setView(view);
  for (const loc of ["fa", "en", "ar"]) {
    const P = prefix(loc);
    reqs.clear();
    await b.navigate(`${BASE}${P}/`);
    const steps = [{ step: "load", url: `${P}/` }];
    // prefetch triggers: scroll the page and hover every visible header link
    const height = await b.evaluate("document.documentElement.scrollHeight");
    for (let y = 0; y <= height; y += 500) { await b.evaluate(`window.scrollTo(0, ${y})`); await sleep(100); }
    await b.evaluate("window.scrollTo(0,0)");
    const links = await b.evaluate(`[...document.querySelectorAll('header a[href]')].filter(a => a.getBoundingClientRect().width > 0).map(a => { const r = a.getBoundingClientRect(); return { x: r.left + r.width/2, y: r.top + r.height/2 }; })`);
    for (const l of links) { await b.send("Input.dispatchMouseEvent", { type: "mouseMoved", x: l.x, y: l.y }); await sleep(150); }
    await sleep(1500);
    // click chain: a product-category link -> a product card -> a per-variant RFQ link -> /contact
    const chain = [
      `main a[href*="/products/category/"]`,
      `main a[href*="/products/"]:not([href*="/category/"])`,
      `main a[href*="/contact?variant="]`,
    ];
    for (const sel of chain) {
      const before = new Set(reqs.keys());
      const href = await clickHref(sel);
      const fresh = [...reqs.entries()].filter(([k]) => !before.has(k)).map(([, v]) => v);
      steps.push({
        step: `click ${sel}`,
        href,
        landedOn: (await b.evaluate("location.pathname + location.search")),
        documentRequests: fresh.filter((r) => r.type === "Document").map((r) => `${r.status} ${r.url}`),
        rscRequests: fresh.filter((r) => r.rsc).map((r) => `${r.status} ${r.url}`),
      });
    }
    const preselected = await b.evaluate(`[...document.querySelectorAll('select')].map(s => s.value).filter(Boolean).slice(0,3)`);
    const all = snapshot();
    const row = { view, loc, steps, preselectedSelectValues: preselected, totalRequests: all.length, rscRequestsTotal: all.filter((r) => r.rsc).length, rscUrls: [...new Set(all.filter((r) => r.rsc).map((r) => `${r.status} ${r.url}`))], non2xx: all.filter((r) => r.status && r.status >= 400).map((r) => `${r.status} ${r.url}`) };
    results.push(row);
    console.log(JSON.stringify({ view, loc, rsc: row.rscRequestsTotal, docs: steps.map((s) => s.documentRequests?.length ?? 1), landed: steps.map((s) => s.landedOn ?? s.url), preselected, non2xx: row.non2xx.length }));
  }
}
fs.writeFileSync(OUT, JSON.stringify(results, null, 1));
b.close();
