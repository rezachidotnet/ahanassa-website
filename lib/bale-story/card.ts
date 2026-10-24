/**
 * W41 — the story image: 1080×1920 (9:16), fa, in the W23 card style (navy/copper, the Estedad fonts, the Ahan Asa
 * mark) and rasterized by the same pipeline (lib/articles/cover-raster.ts). Everything that must be read sits
 * between y≈250 and y≈1700, clear of the story app's top bar and bottom reply bar. Every drawn text is returned for
 * the gate (a raster cannot be scanned afterwards). Pure apart from `renderStory`.
 */
import crypto from "node:crypto";
import { STORY_GROUPS, type StoryItem } from "../../config/raw-material-stories.ts";
import { rasterizeSvg } from "../articles/cover-raster.ts";
import { estimateWidth, fitSize } from "../og/share-images.ts";
import { rtl } from "../price-channel/card.ts";
import { EMAIL, PHONE, REQUEST_TEXT, type StoryLinks } from "./compose.ts";
import { encodeQr, qrSvg } from "./qr.ts";

export const STORY_SIZE = { width: 1080, height: 1920 } as const;
const W = STORY_SIZE.width;
const H = STORY_SIZE.height;
const M = 72;
const NAVY = "#0b2545";
const COPPER = "#b04a2f";
const COPPER_LIGHT = "#f0b8a6";
const MUTED = "#475467";
const SOFT = "#c9d3e0";

export interface StoryCard {
  svg: string;
  texts: string[];
}

const escXml = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

/** Greedy word wrap by estimated width; null when it needs more than `maxLines`. */
export function wrap(text: string, size: number, maxWidth: number, maxLines: number): string[] | null {
  const lines: string[] = [];
  let cur = "";
  for (const word of text.split(/\s+/).filter(Boolean)) {
    const next = cur ? `${cur} ${word}` : word;
    if (estimateWidth(next, size) <= maxWidth || !cur) cur = next;
    else {
      lines.push(cur);
      cur = word;
    }
  }
  if (cur) lines.push(cur);
  return lines.length <= maxLines && lines.every((l) => estimateWidth(l, size) <= maxWidth) ? lines : null;
}

/** The largest size from `sizes` at which `text` wraps into `maxLines`. Throws when none does. */
function fitWrap(text: string, sizes: readonly number[], maxWidth: number, maxLines: number): { size: number; lines: string[] } {
  for (const size of sizes) {
    const lines = wrap(text, size, maxWidth, maxLines);
    if (lines) return { size, lines };
  }
  throw new Error(`story text does not fit: «${text}»`);
}

export function buildStory(item: StoryItem, links: StoryLinks, logoDataUri: string): StoryCard {
  const texts: string[] = [];
  const out: string[] = [];
  const right = W - M;
  const text = (s: string, x: number, y: number, size: number, weight: number, fill: string, anchor: "right" | "middle" = "right") => {
    texts.push(s);
    out.push(`<text x="${x}" y="${y}" font-family="Estedad" font-size="${size}" font-weight="${weight}" fill="${fill}" text-anchor="${anchor === "right" ? "end" : "middle"}">${rtl(s)}</text>`);
  };
  /** A Latin-only line (designation, link, e-mail): plain LTR text, anchored at the right edge. */
  const latin = (s: string, x: number, y: number, size: number, weight: number, fill: string, anchor: "end" | "middle" = "end") => {
    texts.push(s);
    out.push(`<text x="${x}" y="${y}" font-family="Estedad" font-size="${size}" font-weight="${weight}" fill="${fill}" text-anchor="${anchor}">${escXml(s)}</text>`);
  };
  const group = STORY_GROUPS[item.group];

  // Navy head: mark, brand, group, the name and its designation.
  const headEnd = 820;
  out.push(`<rect width="${W}" height="${headEnd}" fill="${NAVY}"/><rect width="${W}" height="14" fill="${COPPER}"/>`);
  const logo = 132;
  out.push(`<rect x="${right - logo}" y="250" width="${logo}" height="${logo}" rx="18" fill="#ffffff"/>`);
  out.push(`<image x="${right - logo + 8}" y="258" width="${logo - 16}" height="${logo - 16}" href="${logoDataUri}" preserveAspectRatio="xMidYMid meet"/>`);
  text("آهن آسا", right - logo - 28, 310, 52, 800, "#ffffff");
  text(group.label, right - logo - 28, 366, 34, 600, COPPER_LIGHT);

  const name = fitWrap(item.name, [96, 88, 80, 72], right - M, 2);
  const nameLead = name.size * 1.25;
  let y = item.designation ? 600 : 640;
  if (name.lines.length === 2) y -= nameLead * 0.75;
  for (const l of name.lines) {
    text(l, right, y, name.size, 800, "#ffffff");
    y += nameLead;
  }
  let lastBaseline = y - nameLead;
  if (item.designation) {
    lastBaseline += 84;
    latin(item.designation, right, lastBaseline, fitSize(item.designation, 40, right - M), 600, SOFT);
  }
  out.push(`<rect x="${right - 160}" y="${Math.min(lastBaseline + 44, headEnd - 40)}" width="160" height="10" rx="5" fill="${COPPER}"/>`);

  // Facts: one size for all, the largest whose lines fit the space above the tagline band.
  const factsTop = headEnd + 100;
  const factsBottom = 1290;
  const bulletW = 44;
  const facts = item.facts.slice(0, 3);
  const layout = [42, 40, 38, 36, 34, 32]
    .map((size) => {
      const wrapped = facts.map((f) => wrap(f.text, size, right - M - bulletW, 3));
      if (wrapped.some((w) => !w)) return null;
      const lineCount = wrapped.reduce((n, w) => n + w!.length, 0);
      const height = lineCount * size * 1.45 + (facts.length - 1) * 28 + (item.reference ? 50 : 0);
      return height <= factsBottom - factsTop ? { size, wrapped: wrapped as string[][] } : null;
    })
    .find(Boolean);
  if (!layout) throw new Error(`story facts of ${item.id} do not fit`);
  y = factsTop + layout.size;
  layout.wrapped.forEach((lines) => {
    out.push(`<rect x="${right - 18}" y="${y - layout.size * 0.62}" width="18" height="18" rx="4" fill="${COPPER}"/>`);
    for (const l of lines) {
      text(l, right - bulletW, y, layout.size, 600, NAVY);
      y += layout.size * 1.45;
    }
    y += 28;
  });
  if (item.reference) {
    texts.push(`مرجع: ${item.reference}`);
    out.push(`<text x="${right}" y="${y + 6}" font-family="Estedad" font-size="28" font-weight="400" fill="${MUTED}" text-anchor="end">${rtl(`مرجع: ${item.reference}`)}</text>`);
  }

  // Tagline band.
  const bandY = 1330;
  out.push(`<rect x="${M}" y="${bandY}" width="${W - 2 * M}" height="96" rx="20" fill="${COPPER}"/>`);
  text(group.tagline, W / 2, bandY + 62, fitSize(group.tagline, 40, W - 2 * M - 48), 800, "#ffffff", "middle");

  // QR (left) and the contact block (right).
  const qr = encodeQr(links.story);
  const scale = Math.floor(300 / (qr.modules.length + 8));
  const qrY = 1470;
  const q = qrSvg(qr, M, qrY, scale);
  out.push(`<rect x="${M - 6}" y="${qrY - 6}" width="${q.size + 12}" height="${q.size + 12}" rx="12" fill="#ffffff" stroke="#d0d5dd" stroke-width="3"/>`, q.svg);
  const infoRight = right;
  const infoWidth = right - (M + q.size + 40);
  text(`برای ${REQUEST_TEXT} اسکن کنید`, infoRight, qrY + 50, fitSize(`برای ${REQUEST_TEXT} اسکن کنید`, 38, infoWidth), 800, NAVY);
  latin(links.short, infoRight, qrY + 112, fitSize(links.short, 34, infoWidth), 700, COPPER);
  text(`تلفن: ${PHONE}`, infoRight, qrY + 186, 34, 600, NAVY);
  latin(EMAIL, infoRight, qrY + 246, 34, 600, NAVY);

  // Footer band: the domain (the bottom of a story is covered by the reply bar; nothing essential here).
  out.push(`<rect y="${H - 120}" width="${W}" height="120" fill="${NAVY}"/>`);
  latin("ahanassa.com", W / 2, H - 46, 40, 700, "#ffffff", "middle");

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}"><rect width="${W}" height="${H}" fill="#ffffff"/>${out.join("")}</svg>`;
  return { svg, texts };
}

export async function renderStory(card: StoryCard): Promise<{ png: Buffer; sha256: string }> {
  const { png } = await rasterizeSvg(card.svg, STORY_SIZE, "story");
  return { png, sha256: crypto.createHash("sha256").update(png).digest("hex") };
}
