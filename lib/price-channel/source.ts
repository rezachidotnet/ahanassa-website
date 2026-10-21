/**
 * W23 — the bulletin's ONLY data source: the fa price table www.ahanassa.com serves (/prices, the same page as
 * /fa/prices) plus /manifest.public.json (the snapshot version it was built from). No Odoo call, no other site,
 * no LLM: every number in a post comes from these two public files and the deterministic code in this folder.
 *
 * The table rows carry stable attributes the site's price gate already checks (lib/static/price-gate.ts):
 *   <tr data-aa-family data-aa-factory> … <a>product name</a> …
 *   <td data-aa-price-cell="CVAR-…" data-aa-price-rank="N"> <span class="… font-bold">۱۲۳٬۴۵۶</span> …
 *     <span …>factory، delivery place</span><time dateTime="ISO">…</time> … </td>
 *   <td …><span dir="ltr">size</span></td></tr>
 * A row that does not parse cleanly is dropped (counted in `skipped`), never half-read.
 */

export interface PageRow {
  variant: string;
  family: string;
  productName: string;
  size: string;
  factory: string;
  /** The delivery place as the page writes it after «factory، » («درب کارخانه», «انبار تهران» …). */
  location: string;
  /** Integer Toman per kg (the page's unit, VAT included). */
  toman: number;
  /** The price's publication instant (ISO, from the cell's <time dateTime>). */
  publishedAt: string;
  rank: number;
}

export interface PricePage {
  rows: PageRow[];
  /** The table header states Toman per kilogram (the unit check). */
  unitTomanPerKg: boolean;
  skipped: number;
}

const PERSIAN_DIGITS = "۰۱۲۳۴۵۶۷۸۹";
const ARABIC_DIGITS = "٠١٢٣٤٥٦٧٨٩";

/** «۱۲۵٬۳۰۱» → 125301; null unless the text is digits with optional thousands separators only. */
export function parsePersianInteger(text: string): number | null {
  const ascii = text
    .trim()
    .replace(/[۰-۹]/g, (d) => String(PERSIAN_DIGITS.indexOf(d)))
    .replace(/[٠-٩]/g, (d) => String(ARABIC_DIGITS.indexOf(d)));
  if (!/^\d{1,3}([٬,]\d{3})*$|^\d+$/.test(ascii)) return null;
  const n = Number(ascii.replace(/[٬,]/g, ""));
  return Number.isSafeInteger(n) ? n : null;
}

const decode = (s: string) =>
  s
    .replace(/&#x([0-9a-f]+);/gi, (_, h: string) => String.fromCodePoint(parseInt(h, 16)))
    .replace(/&#(\d+);/g, (_, d: string) => String.fromCodePoint(Number(d)))
    .replace(/&quot;/g, '"')
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&amp;/g, "&")
    .trim();

/** The unit header the fa table prints above its price column. */
export const UNIT_HEADER = /تومان\s*\/\s*کیلوگرم/;

export function parsePricePage(html: string): PricePage {
  const rows: PageRow[] = [];
  let skipped = 0;
  for (const m of html.matchAll(/<tr\b([^>]*)>([\s\S]*?)<\/tr>/g)) {
    const attrs = m[1];
    const body = m[2];
    if (!body.includes("data-aa-price-cell=")) continue;
    const family = /data-aa-family="([^"]*)"/.exec(attrs)?.[1];
    const factory = /data-aa-factory="([^"]*)"/.exec(attrs)?.[1];
    const cell = /<td\b[^>]*data-aa-price-cell="([^"]+)"[^>]*data-aa-price-rank="(\d+)"[^>]*>([\s\S]*?)<\/td>/.exec(body);
    const name = /<th\b[^>]*>\s*<a\b[^>]*>([^<]+)<\/a>/.exec(body)?.[1];
    const after = cell ? body.slice(body.indexOf(cell[0]) + cell[0].length) : "";
    const size = /<span dir="ltr">([^<]+)<\/span>/.exec(after)?.[1];
    const price = cell ? /<span class="[^"]*font-bold[^"]*">([^<]+)<\/span>/.exec(cell[3])?.[1] : undefined;
    const place = cell ? /<span class="[^"]*">([^<]+)<\/span><time\b/.exec(cell[3])?.[1] : undefined;
    const time = cell ? /<time\b[^>]*dateTime="([^"]+)"/i.exec(cell[3])?.[1] : undefined;
    const toman = price ? parsePersianInteger(decode(price)) : null;
    const fac = factory ? decode(factory) : "";
    const placeText = place ? decode(place) : "";
    const location = placeText.startsWith(`${fac}، `) ? placeText.slice(fac.length + 2).trim() : "";
    if (!cell || !family || !fac || !name || !size || toman === null || !location || !time || Number.isNaN(Date.parse(time))) {
      skipped++;
      continue;
    }
    rows.push({ variant: cell[1], family: decode(family), productName: decode(name), size: decode(size), factory: fac, location, toman, publishedAt: new Date(time).toISOString(), rank: Number(cell[2]) });
  }
  return { rows, unitTomanPerKg: UNIT_HEADER.test(html), skipped };
}

export interface FetchedPage {
  page: PricePage;
  snapshotVersion: string | null;
  fetchedAt: string;
}

/** Fetches /prices (cache-busted) and the public manifest. Throws on HTTP or network failure. */
export async function fetchPricePage(origin: string, pricesPath: string, fetchImpl: typeof fetch = fetch, now: () => Date = () => new Date()): Promise<FetchedPage> {
  const headers = { "cache-control": "no-cache", "user-agent": "ahanassa-price-channel/1" };
  const ts = now().getTime();
  const res = await fetchImpl(`${origin}${pricesPath}?ts=${ts}`, { headers, redirect: "follow", signal: AbortSignal.timeout(30_000) });
  if (res.status !== 200) throw new Error(`${pricesPath} returned HTTP ${res.status}`);
  const page = parsePricePage(await res.text());
  let snapshotVersion: string | null = null;
  try {
    const m = await fetchImpl(`${origin}/manifest.public.json?ts=${ts}`, { headers, signal: AbortSignal.timeout(20_000) });
    if (m.status === 200) {
      const v = ((await m.json()) as { snapshot_version?: unknown } | null)?.snapshot_version;
      if (typeof v === "string" && /^snap-[0-9a-z]+$/.test(v)) snapshotVersion = v;
    }
  } catch {
    // The manifest only labels the data version; the page itself is the data.
  }
  return { page, snapshotVersion, fetchedAt: now().toISOString() };
}
