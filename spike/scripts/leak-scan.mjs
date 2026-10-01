// Spike S1: leak scan over every file in the static output.
// (1) forbidden commercial/private fields in HTML/JSON/RSC/JS,
// (2) e-mail addresses / phone numbers other than the company's own,
// (3) Persian-script text in en/ar pages and en/ar JSON (visible text only for HTML).
import fs from "node:fs";
import path from "node:path";

const root = path.resolve(process.argv[2]);
const out = process.argv[3];
const allowedContacts = (process.argv[4] ?? "").split(",").filter(Boolean);
const files = [];
const walk = (d) => { for (const e of fs.readdirSync(d, { withFileTypes: true })) { const p = path.join(d, e.name); e.isDirectory() ? walk(p) : files.push(p); } };
walk(root);
const textual = files.filter((f) => /\.(html|json|rsc|js|txt|xml|css)$/.test(f) || path.basename(f).startsWith("_"));
const FORBIDDEN = /\b(standard_price|cost_price|purchase_price|purchase price|supplier(_id|_name|info)?|seller_ids|vendor_id|margin|internal_margin\w*|qty_available|virtual_available|free_qty|stock_quant|stock_level|on_hand|landed_cost|buy_price)\b/gi;
const EMAIL = /[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/g;
const PHONE = /(?:\+98|0098|\b0)9\d{9}\b|\+98[\s-]?\d{2,3}[\s-]?\d{3,4}[\s-]?\d{4}/g;
// Arabic-script letters that exist in Persian but NOT in Arabic (پ چ ژ گ ک ی) — a Persian-specific signal usable on ar pages.
const PERSIAN_ONLY = /[پچژگکی]/;
const ARABIC_SCRIPT = /[؀-ۿ]/;
const visibleText = (html) => html.replace(/<script[\s\S]*?<\/script>/gi, " ").replace(/<style[\s\S]*?<\/style>/gi, " ").replace(/<[^>]+>/g, " ");
const findings = { forbidden: [], contacts: [], persianOnEn: [], persianOnAr: [] };
for (const f of textual) {
  const rel = "/" + path.relative(root, f);
  const body = fs.readFileSync(f, "utf8");
  const isVendorJs = rel.startsWith("/_next/");
  for (const m of body.matchAll(FORBIDDEN)) {
    const ctx = body.slice(Math.max(0, m.index - 40), m.index + 40).replace(/\s+/g, " ");
    findings.forbidden.push({ file: rel, match: m[0], vendorJs: isVendorJs, ctx });
  }
  for (const re of [EMAIL, PHONE]) for (const m of body.matchAll(re)) {
    if (allowedContacts.some((a) => m[0].includes(a))) continue;
    if (isVendorJs) continue;
    findings.contacts.push({ file: rel, match: m[0] });
  }
  const loc = rel.startsWith("/en/") || rel === "/en.html" || /rfq-catalog\.en\.json$/.test(rel) ? "en" : rel.startsWith("/ar/") || rel === "/ar.html" || /rfq-catalog\.ar\.json$/.test(rel) ? "ar" : null;
  if (!loc || !/\.(html|json)$/.test(rel)) continue;
  const text = rel.endsWith(".html") ? visibleText(body) : body;
  const tokens = text.split(/[\s"<>{}:,\[\]]+/).filter((t) => (loc === "en" ? ARABIC_SCRIPT : PERSIAN_ONLY).test(t));
  if (tokens.length) (loc === "en" ? findings.persianOnEn : findings.persianOnAr).push({ file: rel, count: tokens.length, sample: [...new Set(tokens)].slice(0, 12) });
}
const summary = {
  filesScanned: textual.length,
  forbiddenOutsideVendorJs: findings.forbidden.filter((x) => !x.vendorJs).length,
  forbiddenInVendorJs: findings.forbidden.filter((x) => x.vendorJs).length,
  nonCompanyContacts: findings.contacts.length,
  enFilesWithArabicScript: findings.persianOnEn.length,
  arFilesWithPersianOnlyLetters: findings.persianOnAr.length,
};
fs.writeFileSync(out, JSON.stringify({ summary, findings }, null, 1));
console.log(JSON.stringify(summary));
