/**
 * Public-artifact leak scan (architecture V1.1 §7.1 step 3, A6). Pure: the
 * caller passes file paths + contents; tests and the artifact gate share it.
 *
 * 1. Forbidden commercial/private fields (cost, supplier, margin, stock,
 *    purchase price, …) as JSON keys anywhere in public files, plus the
 *    server-only `categoryLabel` in public JSON.
 * 2. E-mail addresses / phone numbers other than the company's own.
 * 3. Persian text on en/ar pages and in en/ar public JSON, after removing
 *    the explicit allowlist below. On en, any Arabic-script text is
 *    Persian-or-Arabic leakage unless allowlisted; on ar, Arabic is the page
 *    language, so only Persian-specific letters/digits are flagged.
 */

/**
 * Intentional Persian (or other non-page-language) strings that may appear
 * on every locale. Each entry names its single source; a test asserts the
 * string still occurs there verbatim, so the allowlist cannot drift.
 */
export const PERSIAN_ALLOWLIST: ReadonlyArray<{ text: string; reason: string; source: string }> = [
  { text: "ما مراقب سرمایه شما هستیم.", reason: "brand tagline", source: "lib/metadata/site.ts" },
  { text: "آهن آسا", reason: "brand name", source: "lib/metadata/site.ts" },
  { text: "فارسی", reason: "language label", source: "config/locales.ts" },
  { text: "العربية", reason: "language label", source: "config/locales.ts" },
  { text: "اصفهان، خیابان هزارجریب، کوی آزادگان، پلاک 6", reason: "address (fa)", source: "components/layout/SiteFooter.tsx" },
  { text: "آزادگان", reason: "address proper noun inside the ar address", source: "components/layout/SiteFooter.tsx" },
  { text: "صفحه مورد نظر یافت نشد.", reason: "trilingual 404 line", source: "app/[locale]/not-found.tsx" },
  { text: "الصفحة غير موجودة.", reason: "trilingual 404 line", source: "app/[locale]/not-found.tsx" },
];

export const ALLOWED_CONTACTS = ["you@company.com"] as const;

const FORBIDDEN_KEYS = /"(standard_price|cost_price|purchase_price|buy_price|landed_cost|supplier|supplier_id|supplier_name|supplierinfo|seller_ids|vendor_id|margin|internal_margin[a-z_]*|margin_percent|qty_available|virtual_available|free_qty|stock|stock_quant|stock_level|on_hand)"\s*:/gi;
const SERVER_ONLY_PUBLIC_JSON_KEYS = /"(categoryLabel|selection_json|family_name)"\s*:/g;
const EMAIL = /[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/g;
const PHONE = /(?:\+98|0098)[\s-]?9\d{2}[\s-]?\d{3}[\s-]?\d{4}|\b09\d{9}\b/g;
/** Letters and digits Persian has but Arabic does not: پ چ ژ گ ک ی and ۰–۹. */
const PERSIAN_SPECIFIC = /[پچژگکی۰-۹]/;
const ARABIC_SCRIPT = /[؀-ۿݐ-ݿﭐ-﷿ﹰ-﻿]/;

export interface LeakFinding {
  file: string;
  kind: "forbidden_field" | "server_only_field" | "contact" | "persian_on_en" | "persian_on_ar";
  match: string;
}

export function fileLocale(path: string): "fa" | "en" | "ar" | null {
  if (/^\/?en(\/|\.html$|$)/.test(path) || /\.en\.json$/.test(path)) return "en";
  if (/^\/?ar(\/|\.html$|$)/.test(path) || /\.ar\.json$/.test(path)) return "ar";
  if (/\.(html|json)$/.test(path)) return "fa";
  return null;
}

/** Text a person or crawler can read from an HTML file: tags removed, but inline JSON-LD and RSC data kept (they ship to every visitor). */
function htmlText(html: string): string {
  return html.replace(/<style[\s\S]*?<\/style>/gi, " ").replace(/<[^>]+>/g, " ");
}

export function stripAllowlisted(text: string, allowlist = PERSIAN_ALLOWLIST): string {
  let out = text;
  // Longest first, so a full address is removed before its proper-noun fragment.
  for (const entry of [...allowlist].sort((a, b) => b.text.length - a.text.length)) out = out.split(entry.text).join(" ");
  return out;
}

export function scanPublicFile(path: string, content: string, companyPhones: readonly string[] = []): LeakFinding[] {
  const findings: LeakFinding[] = [];
  const isVendorJs = path.includes("/_next/") || path.startsWith("_next/");
  for (const m of content.matchAll(FORBIDDEN_KEYS)) findings.push({ file: path, kind: "forbidden_field", match: m[1] });
  if (path.endsWith(".json")) for (const m of content.matchAll(SERVER_ONLY_PUBLIC_JSON_KEYS)) findings.push({ file: path, kind: "server_only_field", match: m[1] });
  if (!isVendorJs) {
    for (const m of content.matchAll(EMAIL)) if (!ALLOWED_CONTACTS.includes(m[0] as (typeof ALLOWED_CONTACTS)[number])) findings.push({ file: path, kind: "contact", match: m[0] });
    for (const m of content.matchAll(PHONE)) {
      const digits = m[0].replace(/\D/g, "");
      if (!companyPhones.some((p) => p.replace(/\D/g, "").endsWith(digits.slice(-10)))) findings.push({ file: path, kind: "contact", match: m[0] });
    }
  }
  const locale = fileLocale(path);
  if (locale === "en" || locale === "ar") {
    const text = stripAllowlisted(path.endsWith(".html") ? htmlText(content) : content);
    const offending = new Set<string>();
    for (const token of text.split(/[\s"'<>{}()[\]:,;|\\«»؛،.!?]+/)) {
      if (!token) continue;
      if (locale === "en" ? ARABIC_SCRIPT.test(token) : PERSIAN_SPECIFIC.test(token)) offending.add(token);
    }
    for (const token of offending) findings.push({ file: path, kind: locale === "en" ? "persian_on_en" : "persian_on_ar", match: token });
  }
  return findings;
}
