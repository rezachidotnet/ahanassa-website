// Spike S1: static /contact checks against the deployed spike site.
// (1) ?variant= preselection from the static per-locale JSON, desktop+mobile, fa/en/ar;
// (2) ONE end-to-end synthetic submission from the static form (en, desktop) to the
//     spike RFQ Worker (Turnstile test sitekey/secret; Odoo stub) — never production.
import fs from "node:fs";
import { launch, BASE, prefix, sleep } from "./cdp.mjs";

const OUT = process.argv[2];
const b = await launch(9371);
const net = [];
b.on((m) => {
  if (m.method === "Network.requestWillBeSent") net.push({ id: m.params.requestId, url: m.params.request.url, method: m.params.request.method });
  if (m.method === "Network.responseReceived") { const x = net.find((r) => r.id === m.params.requestId); if (x) x.status = m.params.response.status; }
});
const out = { preselection: [], submission: null };
const readSelects = `[...document.querySelectorAll('form select')].map(s => s.value)`;
for (const view of ["desktop", "mobile"]) {
  await b.setView(view);
  for (const loc of ["fa", "en", "ar"]) {
    await b.navigate(`${BASE}${prefix(loc)}/contact?variant=CVAR-000123`);
    await sleep(1500);
    const values = await b.evaluate(readSelects);
    out.preselection.push({ view, loc, hasCategory: values.includes("BOX_SECTION"), hasTemplate: values.includes("CTMPL-000003"), hasVariant: values.includes("CVAR-000123"), values });
    console.log(JSON.stringify(out.preselection.at(-1)));
  }
}
// unknown variant -> "not available" notice, no fabricated selection
await b.setView("desktop");
await b.navigate(`${BASE}/en/contact?variant=CVAR-999999`);
await sleep(1500);
out.unknownVariant = { selects: await b.evaluate(readSelects) };

// End-to-end submission (synthetic data).
await b.navigate(`${BASE}/en/contact?variant=CVAR-000123`);
await sleep(2500);
await b.evaluate(`(() => {
  const set = (el, v) => { const proto = el.tagName === 'SELECT' ? HTMLSelectElement.prototype : el.tagName === 'TEXTAREA' ? HTMLTextAreaElement.prototype : HTMLInputElement.prototype; Object.getOwnPropertyDescriptor(proto, 'value').set.call(el, v); el.dispatchEvent(new Event(el.tagName === 'SELECT' ? 'change' : 'input', { bubbles: true })); };
  set(document.querySelector('input[name=name]'), 'Spike Browser Buyer');
  set(document.querySelector('input[name=company]'), 'Spike S1 synthetic');
  set(document.querySelector('input[name=email]'), 'spike-browser@example.invalid');
  set(document.querySelector('select[name=phoneCountry]'), 'IR');
  set(document.querySelector('input[name=phoneLocal]'), '9120000000');
  const qty = [...document.querySelectorAll('form input')].find(i => /5000/.test(i.placeholder || ''));
  if (qty) set(qty, '12');
  const unit = [...document.querySelectorAll('form select')].find(s => [...s.options].some(o => o.value === 'ton'));
  if (unit) set(unit, 'ton');
  return true;
})()`);
for (let i = 0; i < 40; i++) { if (await b.evaluate(`!document.querySelector('form button[type=submit]')?.disabled`)) break; await sleep(500); }
await sleep(2500); // the form's passive minimum-completion-time check
await b.evaluate(`document.querySelector('form button[type=submit]').click()`);
await sleep(6000);
out.submission = {
  posts: net.filter((r) => r.method === "POST" && /\/api\/rfqs/.test(r.url)).map((r) => ({ url: r.url, status: r.status })),
  preflights: net.filter((r) => r.method === "OPTIONS").length,
  pageShowsReference: await b.evaluate(`/AA-RFQ-[A-Z0-9]+/.test(document.body.innerText)`),
  reference: await b.evaluate(`(document.body.innerText.match(/AA-RFQ-[A-Z0-9]+/) || [null])[0]`),
};
console.log(JSON.stringify({ unknownVariant: out.unknownVariant, submission: out.submission }));
fs.writeFileSync(OUT, JSON.stringify(out, null, 1));
try { b.close(); } catch {}
