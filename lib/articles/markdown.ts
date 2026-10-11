/**
 * W11.1 — the Markdown subset an article body may use (content repo editorial/style-guide.md), parsed
 * into a small tree that components/articles/article-body.tsx renders as React elements. No HTML string
 * is ever produced or injected, so article text cannot add markup, scripts or styles. Pure.
 *
 * Blocks: `##`/`###`/`####` headings (an H1 is an error: the title comes from the frontmatter),
 * paragraphs, `-`/`*`/`+` and `1.` lists (continuation lines indented), GFM pipe tables, `>` quotes, `---`.
 * Inline: **strong**, *em* / _em_, `code`, [text](href), backslash escapes.
 * Refused (the article is not published): images, raw HTML, code fences, link reference definitions.
 */
export type Inline =
  | { t: "text"; v: string }
  | { t: "strong"; c: Inline[] }
  | { t: "em"; c: Inline[] }
  | { t: "code"; v: string }
  | { t: "link"; href: string; c: Inline[] };

export type Block =
  | { t: "heading"; level: 2 | 3 | 4; id: string; c: Inline[] }
  | { t: "p"; c: Inline[] }
  | { t: "list"; ordered: boolean; start: number; items: Inline[][] }
  | { t: "table"; head: Inline[][]; align: ("start" | "center" | "end" | null)[]; rows: Inline[][][] }
  | { t: "quote"; c: Block[] }
  | { t: "hr" };

export interface ParsedMarkdown {
  blocks: Block[];
  /** h2 sections, in order: the table of contents. */
  toc: { id: string; text: string }[];
  /** Every link target in the body, in order. */
  links: string[];
  /** Plain text of the whole body (word count, scans). */
  text: string;
}

export class MarkdownError extends Error {}

const HEADING = /^(#{1,6})\s+(.*?)\s*#*\s*$/;
const BULLET = /^(\s*)([-*+])\s+(.*)$/;
const ORDERED = /^(\s*)(\d{1,3})[.)]\s+(.*)$/;
const HR = /^\s*(?:-\s*){3,}$|^\s*(?:\*\s*){3,}$|^\s*(?:_\s*){3,}$/;
const TABLE_SEPARATOR = /^\s*\|?\s*:?-{1,}:?\s*(\|\s*:?-{1,}:?\s*)*\|?\s*$/;

export function parseMarkdown(source: string): ParsedMarkdown {
  const lines = source.replace(/\r\n?/g, "\n").split("\n");
  lines.forEach((line, n) => {
    if (/^\s*(```|~~~)/.test(line)) throw new MarkdownError(`line ${n + 1}: code blocks are not supported`);
    if (/!\[[^\]]*\]\(/.test(line)) throw new MarkdownError(`line ${n + 1}: images are not allowed in an article body (the cover is the only image)`);
    if (/<\/?[a-zA-Z!][^>]*>/.test(line)) throw new MarkdownError(`line ${n + 1}: raw HTML is not allowed`);
    if (/^\s{0,3}\[[^\]]+\]:\s*\S/.test(line)) throw new MarkdownError(`line ${n + 1}: link reference definitions are not supported`);
  });
  const state = { headings: 0, links: [] as string[], toc: [] as { id: string; text: string }[] };
  const blocks = parseBlocks(lines, state);
  return { blocks, toc: state.toc, links: state.links, text: blocksText(blocks) };
}

function parseBlocks(lines: string[], state: { headings: number; links: string[]; toc: { id: string; text: string }[] }): Block[] {
  const blocks: Block[] = [];
  const inline = (s: string) => parseInline(s, state.links);
  let i = 0;
  while (i < lines.length) {
    const line = lines[i];
    if (!line.trim()) {
      i++;
      continue;
    }
    const h = HEADING.exec(line);
    if (h) {
      const level = h[1].length;
      if (level === 1) throw new MarkdownError(`line ${i + 1}: an H1 is not allowed (the title is the page's only H1)`);
      if (level > 4) throw new MarkdownError(`line ${i + 1}: headings deeper than #### are not supported`);
      const c = inline(h[2]);
      const id = `section-${++state.headings}`;
      if (level === 2) state.toc.push({ id, text: inlineText(c) });
      blocks.push({ t: "heading", level: level as 2 | 3 | 4, id, c });
      i++;
      continue;
    }
    if (HR.test(line)) {
      blocks.push({ t: "hr" });
      i++;
      continue;
    }
    if (/^\s*>/.test(line)) {
      const quoted: string[] = [];
      while (i < lines.length && /^\s*>/.test(lines[i])) quoted.push(lines[i++].replace(/^\s*>\s?/, ""));
      blocks.push({ t: "quote", c: parseBlocks(quoted, state) });
      continue;
    }
    if (line.includes("|") && i + 1 < lines.length && TABLE_SEPARATOR.test(lines[i + 1]) && lines[i + 1].includes("-")) {
      const head = splitRow(line);
      const align = splitRow(lines[i + 1]).map((c) => (c.startsWith(":") && c.endsWith(":") ? "center" : c.endsWith(":") ? "end" : c.startsWith(":") ? "start" : null));
      if (align.length !== head.length) throw new MarkdownError(`line ${i + 2}: the table separator has ${align.length} cells, the header ${head.length}`);
      i += 2;
      const rows: Inline[][][] = [];
      while (i < lines.length && lines[i].trim() && lines[i].includes("|")) {
        const cells = splitRow(lines[i]);
        if (cells.length > head.length) throw new MarkdownError(`line ${i + 1}: a table row has more cells than the header`);
        while (cells.length < head.length) cells.push("");
        rows.push(cells.map(inline));
        i++;
      }
      blocks.push({ t: "table", head: head.map(inline), align, rows });
      continue;
    }
    const listStart = BULLET.exec(line) ?? ORDERED.exec(line);
    if (listStart && listStart[1].length === 0) {
      const ordered = !BULLET.test(line);
      const items: string[] = [];
      while (i < lines.length) {
        const m = ordered ? ORDERED.exec(lines[i]) : BULLET.exec(lines[i]);
        if (m && m[1].length === 0) {
          items.push(m[3]);
          i++;
          continue;
        }
        // Continuation: an indented, non-blank line that is not another list.
        if (lines[i].trim() && /^\s{2,}/.test(lines[i]) && items.length) {
          if (BULLET.test(lines[i]) || ORDERED.test(lines[i])) throw new MarkdownError(`line ${i + 1}: nested lists are not supported`);
          items[items.length - 1] += ` ${lines[i].trim()}`;
          i++;
          continue;
        }
        break;
      }
      blocks.push({ t: "list", ordered, start: ordered ? Number(listStart[2]) : 1, items: items.map(inline) });
      continue;
    }
    const paragraph: string[] = [];
    while (i < lines.length && lines[i].trim() && !HEADING.test(lines[i]) && !HR.test(lines[i]) && !/^\s*>/.test(lines[i]) && !((BULLET.exec(lines[i]) ?? ORDERED.exec(lines[i]))?.[1] === "")) {
      paragraph.push(lines[i].trim());
      i++;
    }
    blocks.push({ t: "p", c: inline(paragraph.join(" ")) });
  }
  return blocks;
}

function splitRow(line: string): string[] {
  let s = line.trim();
  if (s.startsWith("|")) s = s.slice(1);
  if (s.endsWith("|") && !s.endsWith("\\|")) s = s.slice(0, -1);
  const cells: string[] = [];
  let cur = "";
  for (let k = 0; k < s.length; k++) {
    if (s[k] === "\\" && s[k + 1] === "|") {
      cur += "|";
      k++;
    } else if (s[k] === "|") {
      cells.push(cur.trim());
      cur = "";
    } else cur += s[k];
  }
  cells.push(cur.trim());
  return cells;
}

/** Inline parser: a single left-to-right pass with explicit delimiters (no nesting of the same marker). */
export function parseInline(s: string, links: string[] = []): Inline[] {
  const out: Inline[] = [];
  let text = "";
  const flush = () => {
    if (text) out.push({ t: "text", v: text });
    text = "";
  };
  let k = 0;
  while (k < s.length) {
    const c = s[k];
    if (c === "\\" && k + 1 < s.length && /[\\`*_[\]()#+\-.!|>~]/.test(s[k + 1])) {
      text += s[k + 1];
      k += 2;
      continue;
    }
    if (c === "`") {
      const end = s.indexOf("`", k + 1);
      if (end > k) {
        flush();
        out.push({ t: "code", v: s.slice(k + 1, end) });
        k = end + 1;
        continue;
      }
    }
    if (c === "[") {
      const m = /^\[((?:[^\]\\]|\\.)*)\]\(\s*<?([^)\s>]+)>?(?:\s+"[^"]*")?\s*\)/.exec(s.slice(k));
      if (m) {
        flush();
        links.push(m[2]);
        out.push({ t: "link", href: m[2], c: parseInline(m[1], links) });
        k += m[0].length;
        continue;
      }
    }
    if ((c === "*" || c === "_") && s[k + 1] === c) {
      const end = s.indexOf(c + c, k + 2);
      if (end > k + 2) {
        flush();
        out.push({ t: "strong", c: parseInline(s.slice(k + 2, end), links) });
        k = end + 2;
        continue;
      }
    }
    if (c === "*" || (c === "_" && !/[\p{L}\p{N}]/u.test(s[k - 1] ?? ""))) {
      const end = s.indexOf(c, k + 1);
      if (end > k + 1 && s[k + 1] !== " " && (c === "*" || !/[\p{L}\p{N}]/u.test(s[end + 1] ?? ""))) {
        flush();
        out.push({ t: "em", c: parseInline(s.slice(k + 1, end), links) });
        k = end + 1;
        continue;
      }
    }
    text += c;
    k++;
  }
  flush();
  return out;
}

export function inlineText(nodes: readonly Inline[]): string {
  return nodes.map((n) => (n.t === "text" || n.t === "code" ? n.v : inlineText(n.c))).join("");
}

function blocksText(blocks: readonly Block[]): string {
  return blocks
    .map((b) => {
      switch (b.t) {
        case "heading":
        case "p":
          return inlineText(b.c);
        case "list":
          return b.items.map(inlineText).join("\n");
        case "table":
          return [b.head, ...b.rows].map((r) => r.map(inlineText).join(" ")).join("\n");
        case "quote":
          return blocksText(b.c);
        case "hr":
          return "";
      }
    })
    .join("\n");
}

/** Words of a text (any script); used for the reading time. */
export function countWords(text: string): number {
  return text.split(/\s+/).filter((w) => /[\p{L}\p{N}]/u.test(w)).length;
}

/** Reading time in whole minutes (≥ 1) at 200 words per minute. */
export function readingMinutes(text: string): number {
  return Math.max(1, Math.round(countWords(text) / 200));
}
