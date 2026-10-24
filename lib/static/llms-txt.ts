import { companyPhoneDisplay, GROUP_COMPANIES, OFFICES, PARENT_ORGANIZATION, WORKING_HOURS_TEXT } from "../content/company.ts";
import { RAW_MATERIAL_SLUGS, RAW_MATERIALS, rawMaterialPath } from "../content/raw-materials.ts";
import { COMPANY_PUBLIC_EMAILS } from "../content/contact-channels.ts";
import { MARKDOWN_ORIGIN, MARKET_INDICATOR_MARKDOWN, markdownFileFor } from "./markdown-mirror.ts";

/**
 * W16.7 — `/llms.txt` (llmstxt.org format) and `/llms-full.txt`, written by the static build from the pages the
 * artifact actually contains, so a link is never to a page that is not published. English text, the company
 * facts of lib/content/company.ts, page names from each page's own H1. Never a price amount, a factory or a price
 * source: the price pages are linked by name only (fa and ar; en has none, D-PRICE-DISPLAY). No date either, so
 * the staging and production files are identical (r4).
 */

export interface LlmsPage {
  /** Artifact path of the HTML page (`en/products/ipe-beam.html`). */
  file: string;
  /** The page's H1, as rendered. */
  h1: string;
}

const url = (file: string) => {
  const route = file === "index.html" ? "" : `/${file.slice(0, -".html".length)}`;
  return `${MARKDOWN_ORIGIN}${route}`;
};
const route = (file: string) => (file === "index.html" ? "/" : `/${file.slice(0, -".html".length)}`);

export function buildLlmsTxt(pages: readonly LlmsPage[]): string {
  const has = new Map(pages.map((p) => [route(p.file), p]));
  const link = (path: string, label?: string, note?: string) => {
    const page = has.get(path);
    if (!page) return null;
    return `- [${label ?? page.h1}](${url(page.file)})${note ? `: ${note}` : ""}`;
  };
  const section = (title: string, lines: (string | null)[], intro?: string) => {
    const kept = lines.filter((l): l is string => l !== null);
    return kept.length ? [`## ${title}`, "", ...(intro ? [intro, ""] : []), ...kept, ""] : [];
  };
  const routes = [...has.keys()];
  const under = (prefix: string) => routes.filter((r) => r.startsWith(prefix)).sort();
  const familyName = (hubRoute: string) => has.get(`/en/products/category/${hubRoute.split("/").pop()}`)?.h1 ?? hubRoute.split("/").pop()!;
  const ahanassa = GROUP_COMPANIES.find((c) => c.id === "ahanassa");
  const hours = WORKING_HOURS_TEXT.en;

  return [
    "# Ahan Assa (آهن آسا)",
    "",
    `> Ahan Assa is a B2B steel procurement partner in Iran: ${ahanassa ? ahanassa.field.en.toLowerCase() : "steel supply"}. Buyers send a list of the steel they need; Ahan Assa reviews it, compares sourcing options from Iranian mills and replies with a quote. Ahan Assa is a member of the ${PARENT_ORGANIZATION.name.en} group (${PARENT_ORGANIZATION.url}), active in steel structures since ${PARENT_ORGANIZATION.foundingDate}.`,
    "",
    "The site is in three languages: Persian (default, no prefix), English (/en) and Arabic (/ar). Daily prices are published on the Persian and Arabic pages only; English pages carry no prices. Raw materials are quoted on request only. Every page also has a Markdown version: add `.md` to the URL (the home page is `/index.md`) or send `Accept: text/markdown`.",
    "",
    ...section("Company", [
      link("/en/about", "About Ahan Assa", "history, what we supply, the group companies, management"),
      link("/about", "درباره آهن آسا (Persian)"),
      link("/ar/about", "من نحن (Arabic)"),
    ]),
    ...section("Products (specifications)", [
      link("/en/products", "All products"),
      ...under("/en/products/category/").map((r) => link(r)),
      ...under("/en/products/").filter((r) => !r.startsWith("/en/products/category/")).map((r) => link(r)),
    ], "Persian pages use the same paths without `/en` (for example /products/category/rebar); Arabic pages use `/ar`."),
    ...section("Daily prices (Persian and Arabic only)", [
      link("/prices", "Daily price list (Persian)", "price, mill, delivery point and date per product"),
      link("/ar/prices", "Daily price list (Arabic)", "price and date per product"),
      // A hub's H1 carries the day's date; the label is the family's English name, so this file stays the same each day.
      ...under("/prices/").filter((r) => !r.startsWith("/prices/chart/")).map((r) => link(r, `${familyName(r)} prices (Persian)`)),
      ...under("/ar/prices/").map((r) => link(r, `${familyName(r)} prices (Arabic)`)),
    ], "Prices are indicative and dated; the final price of an order comes with the quote."),
    // W18.2: the fa chart pages (named by product slug: their H1 is Persian) and the en/ar indicators page.
    ...section("Price charts (Persian only)", under("/prices/chart/").map((r) => link(r, `Price chart and 90-day trend: ${r.split("/").pop()} (Persian)`)), "Ahan Assa's own published daily price of one reference size per product, with a daily data table. A record of past prices, not a forecast."),
    ...section("Steel market indicators (English and Arabic)", [
      link("/en/market-indicators", "Steel market indicators (English)", "iron ore, the US hot-rolled steel producer price index and the US dollar Exchange Center rate in Iran, with sources and dates"),
      link("/ar/market-indicators", "Steel market indicators (Arabic)"),
    ], "Reference indices from public sources, each with its source and date. They are not Ahan Assa selling prices."),
    ...section("Tools", [
      link("/en/tools/weight-calculator", "Steel weight calculator (English)"),
      link("/tools/weight-calculator", "Steel weight calculator (Persian)"),
      link("/ar/tools/weight-calculator", "Steel weight calculator (Arabic)"),
    ]),
    ...section("Steel raw materials (quote on request only)", [
      link("/en/raw-materials", "Steel raw materials"),
      ...RAW_MATERIAL_SLUGS.map((slug) => link(`/en${rawMaterialPath(slug)}`, RAW_MATERIALS[slug].en.name)),
    ]),
    ...section("Export", [link("/en/export", "Steel export from Iran (English)"), link("/ar/export", "Export (Arabic)")]),
    ...section("How to request a quote", [
      link("/en/contact", "Request form (English)"),
      link("/contact", "Request form (Persian)"),
      link("/ar/contact", "Request form (Arabic)"),
    ], "Send the product, grade or standard, sizes and quantity — a bill of materials, an invoice or a simple list is enough. Where the form offers file upload, attach the list as Excel, PDF or a photo; otherwise send files on WhatsApp from the contact page. There is no online checkout: every request is reviewed and answered with a quote."),
    "## Contact",
    "",
    `- Phone: ${companyPhoneDisplay()}`,
    `- ${OFFICES.en.head.label}: ${OFFICES.en.head.address}`,
    `- ${OFFICES.en.tehran.label}: ${OFFICES.en.tehran.address}`,
    `- ${hours.label}: ${hours.lines.join("; ")}`,
    "",
  ].join("\n");
}

const escapeRegExp = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
/** The /contact e-mail line as the Markdown mirror renders it: ` Email: [addr](mailto:addr)`. */
const COMPANY_EMAIL_MD = new RegExp(COMPANY_PUBLIC_EMAILS.map((e) => `[ \\t]*Email: \\[${escapeRegExp(e)}\\]\\(mailto:${escapeRegExp(e)}\\)`).join("|"), "g");

/**
 * `/llms-full.txt`: llms.txt followed by the Markdown of every English page (en has no prices). D-W207-EMAIL:
 * the company e-mail lives on /contact only, so its line is cut from the en/contact copy here (en/contact.md
 * keeps it); if the mirror's wording changes, the leak scan fails the build instead of publishing the address.
 * W18.2: the en market-indicators page (index values and the USD/IRR rate, MARKET_INDICATOR_MARKDOWN) is linked from
 * llms.txt but not copied here, so this file keeps carrying no currency rate or index value.
 */
export function buildLlmsFullTxt(llmsTxt: string, pages: readonly LlmsPage[], markdownOf: (mdFile: string) => string | null): string {
  const parts = [llmsTxt.trimEnd()];
  for (const p of [...pages].sort((a, b) => a.file.localeCompare(b.file))) {
    if (!(p.file === "en.html" || p.file.startsWith("en/")) || MARKET_INDICATOR_MARKDOWN.includes(markdownFileFor(p.file) ?? "")) continue;
    const md = markdownFileFor(p.file);
    const text = md ? markdownOf(md) : null;
    if (text) parts.push(text.replace(COMPANY_EMAIL_MD, "").trimEnd());
  }
  return `${parts.join("\n\n---\n\n")}\n`;
}
