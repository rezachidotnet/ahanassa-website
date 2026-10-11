/**
 * W11.1 — article frontmatter: the YAML subset the content repository writes (its scripts/lib/yaml.mjs
 * documents the same subset). Dependency-free and pure.
 *
 * Supported: block mappings and sequences, sequences of mappings ("- key: v"), a sequence at the same
 * indent as its key, flow sequences of scalars ([a, "b"]), `{}`, block scalars (| and >, with - / +),
 * double-quoted (JSON escapes), single-quoted ('' escape) and plain scalars, null / ~ / true / false /
 * integers / decimals, and # comments. Dates stay strings. Anything else (anchors, aliases, tags, flow
 * mappings, nested flow collections) is an error — an article that uses it is not published.
 */
export class FrontmatterError extends Error {}

type Yaml = string | number | boolean | null | Yaml[] | { [key: string]: Yaml };
interface Line {
  n: number;
  indent: number;
  text: string;
}

const fail = (message: string, n?: number): never => {
  throw new FrontmatterError(n === undefined ? message : `line ${n + 1}: ${message}`);
};
const isSeqItem = (t: string) => t === "-" || t.startsWith("- ");
const KEY_RE = /^("(?:[^"\\]|\\.)*"|'(?:[^']|'')*'|[^\s"'#\-?:,[\]{}&*!|>%@`][^:#]*?|-[^\s:][^:#]*?)\s*:(?:\s+(.*)|\s*)$/;

export function parseYaml(src: string): Yaml {
  const raw = src.replace(/\r\n?/g, "\n").replace(/^﻿/, "").split("\n");
  const lines: Line[] = [];
  raw.forEach((text, n) => {
    if (/^\s*(#.*)?$/.test(text)) return;
    if (/^\t/.test(text)) fail("tabs are not allowed for indentation", n);
    const indent = text.length - text.trimStart().length;
    lines.push({ n, indent, text: text.slice(indent) });
  });
  if (!lines.length) return null;
  const [value, next] = parseBlock(raw, lines, 0, lines[0].indent);
  if (next < lines.length) fail("unexpected content (bad indentation?)", lines[next].n);
  return value;
}

function parseBlock(raw: string[], lines: Line[], i: number, indent: number): [Yaml, number] {
  const line = lines[i];
  if (isSeqItem(line.text)) return parseSeq(raw, lines, i, indent);
  if (KEY_RE.test(line.text)) return parseMap(raw, lines, i, indent);
  return [parseScalar(line.text, line.n), i + 1];
}

function parseSeq(raw: string[], lines: Line[], i: number, indent: number): [Yaml[], number] {
  const out: Yaml[] = [];
  while (i < lines.length && lines[i].indent === indent && isSeqItem(lines[i].text)) {
    const line = lines[i];
    const rest = line.text === "-" ? "" : line.text.slice(2).trimStart();
    if (!rest) {
      if (i + 1 < lines.length && lines[i + 1].indent > indent) {
        const [v, next] = parseBlock(raw, lines, i + 1, lines[i + 1].indent);
        out.push(v);
        i = next;
      } else {
        out.push(null);
        i++;
      }
      continue;
    }
    if (KEY_RE.test(rest) && !/^[[{]/.test(rest)) {
      // "- key: value" starts a mapping whose keys sit at the column of "key".
      const col = indent + (line.text.length - rest.length);
      lines[i] = { n: line.n, indent: col, text: rest };
      const [v, next] = parseMap(raw, lines, i, col);
      out.push(v);
      i = next;
      continue;
    }
    if (isSeqItem(rest)) fail("nested inline sequences are not supported", line.n);
    out.push(parseScalar(rest, line.n));
    i++;
  }
  return [out, i];
}

function parseMap(raw: string[], lines: Line[], i: number, indent: number): [{ [key: string]: Yaml }, number] {
  const out: { [key: string]: Yaml } = {};
  while (i < lines.length && lines[i].indent === indent && !isSeqItem(lines[i].text)) {
    const line = lines[i];
    const m = KEY_RE.exec(line.text) ?? fail(`expected "key: value", got "${line.text}"`, line.n);
    let key = m[1];
    if (/^["']/.test(key)) key = String(parseScalar(key, line.n));
    if (Object.prototype.hasOwnProperty.call(out, key)) fail(`duplicate key "${key}"`, line.n);
    const rest = m[2] === undefined ? "" : stripComment(m[2]);
    if (rest === "") {
      const nx = lines[i + 1];
      if (nx && nx.indent > indent) [out[key], i] = parseBlock(raw, lines, i + 1, nx.indent);
      else if (nx && nx.indent === indent && isSeqItem(nx.text)) [out[key], i] = parseSeq(raw, lines, i + 1, indent);
      else {
        out[key] = null;
        i++;
      }
      continue;
    }
    if (/^[|>][+-]?$/.test(rest)) {
      [out[key], i] = parseBlockScalar(raw, lines, i, indent, rest);
      continue;
    }
    if (/^[&*!]/.test(rest)) fail("anchors, aliases and tags are not supported", line.n);
    out[key] = parseScalar(rest, line.n);
    i++;
  }
  return [out, i];
}

function parseBlockScalar(raw: string[], lines: Line[], i: number, indent: number, header: string): [string, number] {
  const startRaw = lines[i].n + 1;
  let j = i + 1;
  while (j < lines.length && lines[j].indent > indent) j++;
  const body = raw.slice(startRaw, j < lines.length ? lines[j].n : raw.length);
  while (body.length && /^\s*$/.test(body[body.length - 1])) body.pop();
  const ind = Math.min(...body.filter((l) => l.trim()).map((l) => l.length - l.trimStart().length));
  const textLines = body.map((l) => l.slice(Number.isFinite(ind) ? ind : 0));
  const text = header[0] === "|" ? textLines.join("\n") : textLines.reduce((acc, l) => (l === "" ? `${acc}\n` : acc && !acc.endsWith("\n") ? `${acc} ${l}` : acc + l), "");
  return [header.endsWith("-") ? text : `${text}\n`, j];
}

function stripComment(s: string): string {
  if (/^["']/.test(s)) return s.trim();
  const k = s.search(/\s#/);
  return (k >= 0 ? s.slice(0, k) : s).trim();
}

function findClose(s: string, q: string): number {
  for (let k = 1; k < s.length; k++) {
    if (s[k] === "\\") {
      k++;
      continue;
    }
    if (s[k] === q) return k;
  }
  return -1;
}

export function parseScalar(input: string, n: number): Yaml {
  const s = stripComment(input);
  if (s.startsWith('"')) {
    const end = findClose(s, '"');
    if (end < 0) fail("unterminated double-quoted string", n);
    if (s.slice(end + 1).trim()) fail("text after a quoted string", n);
    try {
      return JSON.parse(s.slice(0, end + 1)) as string;
    } catch {
      return fail("bad escape in double-quoted string", n);
    }
  }
  if (s.startsWith("'")) {
    const m = /^'((?:[^']|'')*)'\s*$/.exec(s) ?? fail("bad single-quoted string", n);
    return m[1].replace(/''/g, "'");
  }
  if (s.startsWith("[")) return parseFlowSeq(s, n);
  if (s === "{}") return {};
  if (s.startsWith("{")) fail("flow mappings other than {} are not supported", n);
  if (s === "null" || s === "~" || s === "") return null;
  if (s === "true") return true;
  if (s === "false") return false;
  if (/^-?(0|[1-9]\d*)(\.\d+)?$/.test(s)) return Number(s);
  if (/^[&*!]/.test(s)) fail("anchors, aliases and tags are not supported", n);
  return s;
}

function parseFlowSeq(s: string, n: number): Yaml[] {
  if (!s.endsWith("]")) fail("flow sequence must end on the same line", n);
  const inner = s.slice(1, -1).trim();
  if (!inner) return [];
  const items: string[] = [];
  let cur = "";
  let q: string | null = null;
  for (let k = 0; k < inner.length; k++) {
    const c = inner[k];
    if (q) {
      cur += c;
      if (c === "\\" && q === '"') {
        cur += inner[++k];
        continue;
      }
      if (c === q) q = null;
      continue;
    }
    if (c === '"' || c === "'") {
      q = c;
      cur += c;
      continue;
    }
    if (c === "[" || c === "{") fail("nested flow collections are not supported", n);
    if (c === ",") {
      items.push(cur.trim());
      cur = "";
      continue;
    }
    cur += c;
  }
  if (q) fail("unterminated quote in flow sequence", n);
  items.push(cur.trim());
  return items.map((x) => parseScalar(x, n));
}

/** Splits "---\n<yaml>\n---\n<body>" into the parsed frontmatter and the Markdown body. */
export function parseFrontmatter(text: string): { data: unknown; body: string } {
  const t = text.replace(/\r\n?/g, "\n").replace(/^﻿/, "");
  if (!t.startsWith("---\n")) fail("file must start with a --- frontmatter block");
  const end = t.indexOf("\n---\n", 3);
  const close = end < 0 && t.endsWith("\n---") ? t.length - 4 : end;
  if (close < 0) fail("frontmatter is not closed with ---");
  return { data: parseYaml(t.slice(4, close + 1)), body: t.slice(close + 5) };
}
