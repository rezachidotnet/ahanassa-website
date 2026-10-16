/**
 * W16.7 — Markdown for agents, built into the static artifact (the zone is on Cloudflare Free, so Cloudflare's
 * own "Markdown for Agents" conversion is not available).
 *
 * Every public HTML page `X.html` gets a sibling `X.md`: the page's `<main>` converted to Markdown, with a short
 * front matter (title, canonical URL, language). The Markdown is derived ONLY from the page's rendered visible
 * text, so it can never say more than the HTML that already passed the price, leak and publication gates
 * (D-PRICE-DISPLAY per locale: fa price + factory + place + date, ar price + date, en no price). The artifact
 * gate re-checks that (`checkMarkdownMirrors`) and runs the leak, publication, article and source-name scans
 * over the `.md` files too.
 *
 * Serving (no Worker script; the static Worker stays assets-only):
 * - `/about.md` is a plain asset; the asset server types `.md` as text/markdown; charset=utf-8.
 * - `Accept: text/markdown` on `/about` is mapped to `/about.md` by the zone's URL rewrite rules
 *   (`MARKDOWN_REWRITE_RULES`, Cloudflare Free "Rewrite URL" rules — set in the dashboard, see the W16.7 report).
 *   `markdownRequestPath` is the same mapping in code; the local static server (scripts/static/serve.ts) uses it.
 * - `_headers` sends `Vary: Accept` on every response, and marks `/*.md` noindex (the HTML page is the indexed URL).
 */

export const MARKDOWN_ORIGIN = "https://www.ahanassa.com";
export const MARKDOWN_CONTENT_TYPE = "text/markdown; charset=utf-8";

const NOT_FOUND_PAGES = new Set(["404.html", "en/404.html", "ar/404.html"]);

/** `about.html` → `about.md`, `index.html` → `index.md`, `en.html` → `en.md`; null for the 404 pages and non-HTML. */
export function markdownFileFor(htmlFile: string): string | null {
  if (!htmlFile.endsWith(".html") || NOT_FOUND_PAGES.has(htmlFile)) return null;
  return `${htmlFile.slice(0, -".html".length)}.md`;
}

/** The Markdown URL of a page path: `/` → `/index.md`, `/en/about` → `/en/about.md`; null when there is none to map. */
export function markdownPathForPage(pathname: string): string | null {
  if (pathname === "/") return "/index.md";
  if (pathname.endsWith("/") || pathname.startsWith("/_next/") || /\.[a-z0-9]+$/i.test(pathname.slice(pathname.lastIndexOf("/")))) return null;
  return `${pathname}.md`;
}

/** True when the Accept header lists text/markdown with a non-zero q (browsers never send it). */
export function acceptsMarkdown(accept: string | null | undefined): boolean {
  if (!accept) return false;
  return accept.split(",").some((part) => {
    const [type, ...params] = part.trim().toLowerCase().split(";").map((s) => s.trim());
    if (type !== "text/markdown") return false;
    const q = params.find((p) => p.startsWith("q="));
    return q === undefined || Number(q.slice(2)) > 0;
  });
}

/**
 * The path a request is served from: the `.md` asset when the client asks for Markdown (or the URL already ends in
 * `.md`), else the request path unchanged (HTML stays the default). Mirrors MARKDOWN_REWRITE_RULES.
 */
export function markdownRequestPath(pathname: string, accept: string | null | undefined): string {
  if (!acceptsMarkdown(accept)) return pathname;
  return markdownPathForPage(pathname) ?? pathname;
}

/**
 * The zone's two Rewrite URL rules (Rules → Transform Rules → Rewrite URL, available on Cloudflare Free). Rule
 * expressions match a request whose Accept header contains text/markdown; the home page maps to /index.md, every
 * other extension-less page path (no trailing slash, not /_next/) to <path>.md. Kept here so a test pins them to
 * `markdownRequestPath`.
 */
// lower() of the header array returns an array, so contains needs the second [*] (W19.1: matches the live zone rules).
const ACCEPTS_MARKDOWN_EXPR = 'any(lower(http.request.headers["accept"][*])[*] contains "text/markdown")';
export const MARKDOWN_REWRITE_RULES = [
  {
    description: "Markdown for agents: home",
    expression: `${ACCEPTS_MARKDOWN_EXPR} and http.request.uri.path eq "/"`,
    rewritePath: { static: "/index.md" },
  },
  {
    description: "Markdown for agents: pages",
    expression: `${ACCEPTS_MARKDOWN_EXPR} and http.request.uri.path ne "/" and not ends_with(http.request.uri.path, "/") and not ends_with(http.request.uri.path, ".md") and not starts_with(http.request.uri.path, "/_next/") and not http.request.uri.path contains "."`,
    rewritePath: { dynamic: 'concat(http.request.uri.path, ".md")' },
  },
] as const;

// --- HTML → Markdown ----------------------------------------------------------------------------------

/** Subtrees that never carry page content (or only interactive controls). */
const SKIP = new Set(["script", "style", "svg", "noscript", "template", "select", "option", "button", "form", "input", "textarea", "iframe", "canvas", "video", "audio", "picture", "img", "head", "dialog"]);
const VOID = new Set(["area", "base", "br", "col", "embed", "hr", "img", "input", "link", "meta", "source", "track", "wbr"]);
const BLOCK = new Set(["p", "div", "section", "article", "aside", "header", "footer", "nav", "main", "ul", "ol", "li", "table", "thead", "tbody", "tfoot", "tr", "h1", "h2", "h3", "h4", "h5", "h6", "blockquote", "figure", "figcaption", "address", "dl", "dt", "dd", "caption", "details", "summary", "fieldset", "legend"]);

function decodeEntities(text: string): string {
  return text
    .replace(/&#x([0-9a-f]+);/gi, (_, h: string) => String.fromCodePoint(parseInt(h, 16)))
    .replace(/&#(\d+);/g, (_, d: string) => String.fromCodePoint(Number(d)))
    .replace(/&nbsp;/g, " ")
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&amp;/g, "&");
}

const attr = (tag: string, name: string) => {
  const m = new RegExp(`\\s${name}="([^"]*)"`, "i").exec(tag);
  return m ? decodeEntities(m[1]) : null;
};

/** Hidden from every reader of the page: `hidden`, `aria-hidden="true"`, `sr-only`, or Tailwind `hidden` with no breakpoint override. */
function isHidden(tag: string): boolean {
  if (/\shidden(=""|\s|>|\/)/.test(tag) || attr(tag, "aria-hidden") === "true") return true;
  const cls = (attr(tag, "class") ?? "").split(/\s+/);
  return cls.includes("sr-only");
}

interface Node {
  tag: string;
  raw: string;
  children: (Node | string)[];
}

function parse(html: string): Node {
  const root: Node = { tag: "#root", raw: "", children: [] };
  const stack: Node[] = [root];
  const re = /<!--[\s\S]*?-->|<\/([a-zA-Z][\w-]*)\s*>|<([a-zA-Z][\w-]*)\b((?:[^>"']|"[^"]*"|'[^']*')*)>|([^<]+)|</g;
  for (let m = re.exec(html); m; m = re.exec(html)) {
    const top = stack[stack.length - 1];
    if (m[0].startsWith("<!--")) continue;
    if (m[1]) {
      const name = m[1].toLowerCase();
      const at = stack.map((n) => n.tag).lastIndexOf(name);
      if (at > 0) stack.length = at;
    } else if (m[2]) {
      const name = m[2].toLowerCase();
      const node: Node = { tag: name, raw: m[0], children: [] };
      top.children.push(node);
      if (!VOID.has(name) && !m[0].endsWith("/>")) {
        if (name === "script" || name === "style") {
          // Raw text elements: skip to the closing tag.
          const end = html.toLowerCase().indexOf(`</${name}`, re.lastIndex);
          re.lastIndex = end === -1 ? html.length : end;
        }
        stack.push(node);
      }
    } else top.children.push(m[4] ?? m[0]);
  }
  return root;
}

function absolute(href: string): string | null {
  if (!href || href.startsWith("#") || /^(javascript|data):/i.test(href)) return null;
  if (/^(https?:|mailto:|tel:)/i.test(href)) return href;
  if (href.startsWith("/")) return `${MARKDOWN_ORIGIN}${href}`;
  return null;
}

const collapse = (s: string) => s.replace(/\s+/g, " ").trim();
const escapeCell = (s: string) => s.replace(/\|/g, "\\|");

function inline(node: Node | string): string {
  if (typeof node === "string") return decodeEntities(node);
  if (SKIP.has(node.tag) || isHidden(node.raw)) return "";
  if (node.tag === "br") return " ";
  const inner = node.children.map(inline).join("");
  if (node.tag === "a") {
    const text = collapse(inner);
    const href = absolute(attr(node.raw, "href") ?? "");
    return text && href ? `[${text}](${href})` : inner;
  }
  if ((node.tag === "strong" || node.tag === "b") && collapse(inner)) return ` **${collapse(inner)}** `;
  // Element boundaries separate words, as on screen (a price and its change sit in sibling spans).
  return ` ${inner} `;
}

function table(node: Node): string {
  const rows: string[][] = [];
  let caption = "";
  const walk = (n: Node) => {
    for (const c of n.children) {
      if (typeof c === "string" || SKIP.has(c.tag) || isHidden(c.raw)) continue;
      if (c.tag === "caption") caption = collapse(inline(c));
      else if (c.tag === "tr") rows.push(c.children.filter((x): x is Node => typeof x !== "string" && (x.tag === "th" || x.tag === "td") && !isHidden(x.raw)).map((cell) => escapeCell(collapse(inline(cell)))));
      else walk(c);
    }
  };
  walk(node);
  if (rows.length === 0) return "";
  const width = Math.max(...rows.map((r) => r.length));
  const pad = (r: string[]) => [...r, ...Array(width - r.length).fill("")];
  const [head, ...body] = rows;
  const lines = [`| ${pad(head).join(" | ")} |`, `| ${Array(width).fill("---").join(" | ")} |`, ...body.map((r) => `| ${pad(r).join(" | ")} |`)];
  return `${caption ? `${caption}\n\n` : ""}${lines.join("\n")}`;
}

function blocks(node: Node, out: string[], listDepth = 0): void {
  let buffer = "";
  const flush = () => {
    const text = collapse(buffer);
    if (text) out.push(text);
    buffer = "";
  };
  for (const child of node.children) {
    if (typeof child === "string") {
      buffer += decodeEntities(child);
      continue;
    }
    if (SKIP.has(child.tag) || isHidden(child.raw)) continue;
    const heading = /^h([1-6])$/.exec(child.tag);
    if (heading) {
      flush();
      const text = collapse(inline(child));
      if (text) out.push(`${"#".repeat(Number(heading[1]))} ${text}`);
    } else if (child.tag === "table") {
      flush();
      const t = table(child);
      if (t) out.push(t);
    } else if (child.tag === "ul" || child.tag === "ol") {
      flush();
      let n = 0;
      const items: string[] = [];
      for (const li of child.children) {
        if (typeof li === "string" || li.tag !== "li" || isHidden(li.raw)) continue;
        const nested: string[] = [];
        const own = { ...li, children: li.children.filter((c) => typeof c === "string" || (c.tag !== "ul" && c.tag !== "ol")) };
        const text = collapse(inline(own));
        for (const sub of li.children) if (typeof sub !== "string" && (sub.tag === "ul" || sub.tag === "ol")) blocks({ tag: "#list", raw: "", children: [sub] }, nested, listDepth + 1);
        if (!text && nested.length === 0) continue;
        n++;
        const indent = "  ".repeat(listDepth);
        items.push(`${indent}${child.tag === "ol" ? `${n}.` : "-"} ${text}`, ...nested);
      }
      if (items.length) out.push(items.join("\n"));
    } else if (BLOCK.has(child.tag)) {
      flush();
      // A block whose content is only inline (a paragraph, a card line) is one paragraph; one with blocks recurses.
      const hasBlock = child.children.some((c) => typeof c !== "string" && BLOCK.has(c.tag) && !SKIP.has(c.tag) && !isHidden(c.raw));
      if (hasBlock) blocks(child, out, listDepth);
      else {
        const text = collapse(inline(child));
        if (text) out.push(text);
      }
    } else buffer += inline(child);
  }
  flush();
}

/** The page's `<main>` as Markdown, under a front matter of its title, canonical URL and language. */
export function htmlToMarkdown(html: string): string {
  const title = collapse(decodeEntities(/<title>([\s\S]*?)<\/title>/i.exec(html)?.[1] ?? ""));
  const canonical = /<link\b[^>]*\brel="canonical"[^>]*>/i.exec(html)?.[0];
  const url = canonical ? attr(canonical, "href") : null;
  const lang = attr(/<html\b[^>]*>/i.exec(html)?.[0] ?? "", "lang");
  const main = /<main\b[^>]*>([\s\S]*)<\/main>/i.exec(html)?.[1] ?? "";
  const out: string[] = [];
  blocks(parse(main), out);
  const front = ["---", `title: ${JSON.stringify(title)}`, ...(url ? [`url: ${url}`] : []), ...(lang ? [`lang: ${lang}`] : []), "---"];
  const body = out.join("\n\n").replace(/[ \t]+([.,،:;!?؛)\]])/g, "$1").replace(/([([]) +/g, "$1");
  return `${front.join("\n")}\n\n${body}\n`;
}

// --- gate -----------------------------------------------------------------------------------------------

/**
 * A Markdown mirror without its link targets: `[text](url)` -> `[text]`. The target is the HTML page's `href`, which no
 * gate reads as visible text (2026-10-16: a cited source's URL is not prose); the link text stays.
 */
export function withoutLinkTargets(markdown: string): string {
  return markdown.replace(/\]\([^)]*\)/g, "]");
}

/** Words of a text, for the "Markdown says nothing the HTML does not" check (link targets and Markdown syntax removed). */
function words(text: string): string[] {
  return withoutLinkTargets(text.replace(/^ *\d+\. /gm, ""))
    .split(/[\s|*#[\]()>`_\\-]+/)
    .map((w) => w.replace(/^[.,،:;!?"'«»؛]+|[.,،:;!?"'«»؛]+$/g, ""))
    .filter(Boolean);
}

/**
 * Artifact gate (W16.7): every `.md` page mirror has its HTML page, and every word of it (front matter included)
 * occurs in that page's visible text — so the per-locale price rules the HTML passed hold for the Markdown too.
 * `visibleText` is the price gate's own (lib/static/price-gate.ts), passed in to keep this module dependency-free.
 */
export function checkMarkdownMirrors(files: ReadonlyArray<{ path: string; content: string }>, visibleText: (html: string) => string): string[] {
  const failures: string[] = [];
  const byPath = new Map(files.map((f) => [f.path, f.content]));
  for (const { path, content } of files) {
    if (!path.endsWith(".md")) continue;
    const html = byPath.get(`${path.slice(0, -".md".length)}.html`);
    if (html === undefined) {
      failures.push(`markdown: ${path} has no HTML page`);
      continue;
    }
    const front = /^---\n([\s\S]*?)\n---\n/.exec(content);
    const body = front ? content.slice(front[0].length) : content;
    const allowed = new Set(words(`${visibleText(html)} ${canonicalAndLang(html)}`));
    const extra = [...new Set(words(`${front ? front[1].replace(/^(title|url|lang): /gm, "") : ""} ${body}`))].filter((w) => !allowed.has(w));
    if (extra.length) failures.push(`markdown: ${path} has text its HTML page does not show: ${extra.slice(0, 5).join(" ")}`);
  }
  return failures;
}

function canonicalAndLang(html: string): string {
  const canonical = /<link\b[^>]*\brel="canonical"[^>]*>/i.exec(html)?.[0];
  return `${canonical ? (attr(canonical, "href") ?? "") : ""} ${attr(/<html\b[^>]*>/i.exec(html)?.[0] ?? "", "lang") ?? ""}`;
}

/**
 * W18.2: the en market-indicators page's mirror. It names the USD/IRR Exchange Center rate and shows reference index
 * values — never an Ahan Asa price (the price gate's rule 4 still checks its HTML for every price amount, copy and
 * name) — so the currency-word and snapshot-amount rules below skip it; the factory/location rule still applies.
 */
export const MARKET_INDICATOR_MARKDOWN: readonly string[] = ["en/market-indicators.md"];

/** Digits of any script as ASCII. */
const asciiDigits = (s: string) => s.replace(/[۰-۹]/g, (d) => String(d.charCodeAt(0) - 0x06f0)).replace(/[٠-٩]/g, (d) => String(d.charCodeAt(0) - 0x0660));
const CURRENCY_WORD = /(?<![\p{L}])(tomans?|rials?|irr|irt|تومان|ریال|ريال|تومن)(?![\p{L}])|﷼/iu;
const normName = (s: string) => s.replace(/ي/g, "ی").replace(/ك/g, "ک").replace(/[\s‌]+/g, " ").trim().toLowerCase();

/**
 * Artifact gate (W16.7) for the agent texts: `llms.txt` / `llms-full.txt` and the en Markdown pages carry no price
 * amount of this run's snapshot (Toman or IRR, any digit script, with or without grouping) and no factory or
 * delivery-location name, and llms.txt and the en pages no currency word (llms-full.txt is llms.txt + those pages); the ar Markdown pages no factory or location name (ar = price + date only).
 */
export function checkAgentTexts(
  files: ReadonlyArray<{ path: string; content: string }>,
  rows: ReadonlyArray<{ price_irr_per_kg: number; factory_name_fa: string; location_fa: string }>,
): string[] {
  const failures: string[] = [];
  const amounts = new Set(rows.flatMap((r) => [r.price_irr_per_kg, Math.round(r.price_irr_per_kg / 10)]).filter((a) => a >= 1000));
  const names = [...new Set(rows.flatMap((r) => [r.factory_name_fa, r.location_fa]).map(normName))].filter((n) => n.length >= 3);
  for (const { path, content } of files) {
    const llms = path === "llms.txt" || path === "llms-full.txt";
    const en = path.endsWith(".md") && (path === "en.md" || path.startsWith("en/"));
    const ar = path.endsWith(".md") && (path === "ar.md" || path.startsWith("ar/"));
    if (!llms && !en && !ar) continue;
    const text = normName(asciiDigits(content));
    for (const n of names) if (text.includes(n)) failures.push(`agent text: ${path} names a factory or delivery location of the price snapshot`);
    if (ar || MARKET_INDICATOR_MARKDOWN.includes(path)) continue;
    // No currency word: llms.txt, and every en page (its .md mirror is the page's visible text).
    if (path !== "llms-full.txt" && CURRENCY_WORD.test(content)) failures.push(`agent text: ${path} mentions a currency`);
    for (const m of asciiDigits(content).matchAll(/\d[\d,٬]*/g)) {
      const value = Number(m[0].replace(/[,٬]/g, ""));
      if (amounts.has(value)) failures.push(`agent text: ${path} has a price amount of the snapshot (${m[0]})`);
    }
  }
  return [...new Set(failures)];
}
