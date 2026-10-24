/**
 * W23 — the bulletin card: a vertical 1080×1350 image (4:5, full width in both apps on a phone) drawn as SVG and
 * rasterized with the site's own share-image pipeline (lib/articles/cover-raster.ts: resvg + the committed Estedad
 * fonts). The Ahan Assa mark and the short site URL are inside the image. Pure apart from `renderCard`.
 *
 * Estedad has no ▲/▼ glyph, so the arrows are drawn as paths; the colour repeats the arrow and the % (W20.1 tones:
 * up green, down red), never alone. Every drawn text is returned for the pre-publish checks (a raster cannot be
 * scanned afterwards).
 */
import crypto from "node:crypto";
import { rasterizeSvg } from "../articles/cover-raster.ts";
import { fitSize } from "../og/share-images.ts";
import type { Change } from "./basket.ts";
import { formatPercent, formatToman, MISSING_TEXT, SIZE_RUN } from "./compose.ts";

export const CARD_SIZE = { width: 1080, height: 1350 } as const;
const W = CARD_SIZE.width;
const H = CARD_SIZE.height;
const M = 56;
const NAVY = "#0b2545";
const COPPER = "#b04a2f";
const MUTED = "#475467";
const ROW_BG = "#f2f4f7";
/**
 * An RTL line for resvg (lib/og/share-images.ts rtlText, plus sizes): U+200F at both ends, every Latin run and every
 * size run («40×40×2.5», as ONE run — × is not Latin) isolated LTR, never nested (resvg misplaces nested isolates).
 */
const LATIN_RUN = /[A-Za-z0-9Ø](?:[A-Za-z0-9Ø.,/ -]*[A-Za-z0-9Ø])?/g;
const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
const iso = (s: string) => `\u2066${esc(s)}\u2069`;
export function rtl(s: string): string {
  let out = "";
  let last = 0;
  const plain = (t: string) => t.replace(LATIN_RUN, "\u0000$&\u0001").split(/(\u0000[^\u0001]*\u0001)/).map((p) => (p.startsWith("\u0000") ? iso(p.slice(1, -1)) : esc(p))).join("");
  for (const m of s.matchAll(SIZE_RUN)) {
    out += plain(s.slice(last, m.index)) + iso(m[0]);
    last = m.index + m[0].length;
  }
  return `\u200F${out}${plain(s.slice(last))}\u200F`;
}
const TONE = { up: "#157347", down: "#b42318", none: "#344054" } as const;

export interface CardRow {
  title: string;
  /** «factory، delivery place»; null when missing. */
  sub: string | null;
  toman: number | null;
  change: Change | null;
  /** Saturday only. */
  weekly?: Change | null;
}

export interface CardInput {
  title: string;
  subtitle: string;
  /** Under the subtitle: unit, VAT, «سبد منتخب، نه کل بازار». */
  note: string;
  /** Under the table: what the change column compares against. */
  changeNote: string;
  /** The change column header («روزانه», or «نسبت به صبح» on an exception post). */
  changeHeader: string;
  rows: readonly CardRow[];
  weeklyColumn: boolean;
  cardUrl: string;
  logoDataUri: string;
}

export interface Card {
  svg: string;
  texts: string[];
}

interface T {
  x: number;
  y: number;
  size: number;
  weight?: 400 | 600 | 700 | 800;
  fill?: string;
  /** "right" = anchored at its right edge (RTL start). */
  align?: "right" | "left";
}

export function buildCard(input: CardInput): Card {
  const texts: string[] = [];
  const out: string[] = [];
  const text = (s: string, o: T) => {
    texts.push(s);
    out.push(`<text x="${o.x}" y="${o.y}" font-family="Estedad" font-size="${o.size}" font-weight="${o.weight ?? 400}" fill="${o.fill ?? NAVY}" text-anchor="${(o.align ?? "right") === "right" ? "end" : "start"}">${rtl(s)}</text>`);
  };
  const right = W - M;

  // Header: mark, title, date, note.
  const logo = 112;
  out.push(`<rect x="${right - logo}" y="44" width="${logo}" height="${logo}" rx="14" fill="#ffffff" stroke="#e4e7ec" stroke-width="2"/>`);
  out.push(`<image x="${right - logo + 6}" y="50" width="${logo - 12}" height="${logo - 12}" href="${input.logoDataUri}" preserveAspectRatio="xMidYMid meet"/>`);
  const headRight = right - logo - 24;
  const headWidth = headRight - M;
  text(input.title, { x: headRight, y: 100, size: fitSize(input.title, 52, headWidth), weight: 800 });
  text(input.subtitle, { x: headRight, y: 148, size: fitSize(input.subtitle, 32, headWidth), weight: 600, fill: COPPER });
  text(input.note, { x: right, y: 205, size: fitSize(input.note, 24, right - M), fill: MUTED });

  // Columns (RTL: product | price | change | weekly), x = each column's right edge.
  const cols = input.weeklyColumn ? { price: 540, daily: 300, weekly: 150 } : { price: 470, daily: 210, weekly: 0 };
  const productWidth = right - 16 - (cols.price + 24);
  const headY = 228;
  out.push(`<rect x="${M}" y="${headY}" width="${W - 2 * M}" height="48" rx="10" fill="${NAVY}"/>`);
  const head = (s: string, x: number) => text(s, { x, y: headY + 33, size: 24, weight: 700, fill: "#ffffff" });
  head("محصول، کارخانه و محل تحویل", right - 16);
  head("تومان/کیلو", cols.price);
  head(input.changeHeader, cols.daily);
  if (input.weeklyColumn) head("هفتگی", cols.weekly);

  const rowH = 92;
  const y0 = headY + 56;
  input.rows.forEach((r, i) => {
    const y = y0 + i * rowH;
    if (i % 2 === 0) out.push(`<rect x="${M}" y="${y}" width="${W - 2 * M}" height="${rowH - 4}" rx="8" fill="${ROW_BG}"/>`);
    text(r.title, { x: right - 16, y: y + 38, size: fitSize(r.title, 32, productWidth), weight: 700 });
    if (r.sub) text(r.sub, { x: right - 16, y: y + 72, size: fitSize(r.sub, 22, productWidth), fill: MUTED });
    if (r.toman === null) {
      text(MISSING_TEXT, { x: cols.price, y: y + 54, size: 24, weight: 600, fill: MUTED });
      return;
    }
    text(formatToman(r.toman), { x: cols.price, y: y + 56, size: 36, weight: 800 });
    out.push(changeCell(r.change, cols.daily, y + 54, texts));
    if (input.weeklyColumn) out.push(changeCell(r.weekly ?? null, cols.weekly, y + 54, texts));
  });

  const tableEnd = y0 + input.rows.length * rowH;
  text(input.changeNote, { x: right, y: tableEnd + 34, size: fitSize(input.changeNote, 22, right - M), fill: MUTED });

  // Footer: the mark + brand at the start edge, the short site URL at the end edge.
  const fy = H - 84;
  out.push(`<rect x="0" y="${fy}" width="${W}" height="84" fill="${NAVY}"/>`);
  out.push(`<rect x="${right - 56}" y="${fy + 14}" width="56" height="56" rx="8" fill="#ffffff"/>`);
  out.push(`<image x="${right - 52}" y="${fy + 18}" width="48" height="48" href="${input.logoDataUri}" preserveAspectRatio="xMidYMid meet"/>`);
  text("آهن آسا", { x: right - 72, y: fy + 54, size: 32, weight: 800, fill: "#ffffff" });
  texts.push(input.cardUrl);
  out.push(`<text x="${M}" y="${fy + 54}" font-family="Estedad" font-size="32" font-weight="700" fill="#ffffff" text-anchor="start">${input.cardUrl}</text>`);

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}"><rect width="${W}" height="${H}" fill="#ffffff"/><rect width="${W}" height="10" fill="${COPPER}"/>${out.join("")}</svg>`;
  return { svg, texts };
}

/** ▲/▼ + «۱٫۲٪», «بدون تغییر», or «—» (nothing comparable), right-aligned at x. */
function changeCell(c: Change | null, x: number, y: number, texts: string[]): string {
  const label = !c ? "—" : c.direction === "none" ? "بدون تغییر" : formatPercent(c.percent);
  texts.push(label);
  const fill = c ? TONE[c.direction] : MUTED;
  const size = c && c.direction !== "none" ? 30 : 22;
  if (!c || c.direction === "none") return `<text x="${x}" y="${y}" font-family="Estedad" font-size="${size}" font-weight="600" fill="${fill}" text-anchor="end">${rtl(label)}</text>`;
  // The arrow at the right (read first), the value to its left.
  const ax = x - 9;
  const tri = c.direction === "up" ? `M${ax - 9} ${y - 6} L${ax + 9} ${y - 6} L${ax} ${y - 22} Z` : `M${ax - 9} ${y - 20} L${ax + 9} ${y - 20} L${ax} ${y - 4} Z`;
  return `<path d="${tri}" fill="${fill}"/><text x="${x - 26}" y="${y}" font-family="Estedad" font-size="${size}" font-weight="700" fill="${fill}" text-anchor="end">${rtl(label)}</text>`;
}

export async function renderCard(card: Card): Promise<{ png: Buffer; sha256: string }> {
  const { png } = await rasterizeSvg(card.svg, CARD_SIZE, "price card");
  return { png, sha256: crypto.createHash("sha256").update(png).digest("hex") };
}

export const cardSubLine = (factory: string, location: string) => `${factory}، ${location}`;
