/**
 * W30 (W29 P1 §2.2–§2.3) — the nginx includes of the domestic copy, rendered from the artifact's OWN `_redirects` and
 * `_headers` (the output of lib/static/static-rules.ts buildRedirectsFile / buildHeadersFile), so the copy on iransrv
 * behaves like the static Worker on www.ahanassa.com for exactly the rules that build shipped.
 *
 *   node scripts/iran/render-nginx.ts --public <public-assets> --out <dir>
 *
 * The output is DATA, never configuration: every file is nothing but nginx `map` entries, plus one file of
 * `add_header … always;` lines. The site templates in deploy/iran/nginx/ wrap them (map blocks, locations, TLS). The
 * root-owned activator on the server (deploy/iran/lib/ahanassa_iran.py) re-checks every line against the same strict
 * grammar before `nginx -t`, so a compromised build can at worst ship a wrong redirect or header, which the smoke and
 * parity tests catch — never `proxy_pass`, `alias`, `include`, `lua` or a variable expansion.
 *
 * Files (all always written, possibly empty):
 *   redirects-301.map … redirects-308.map   "<path>" "<target>";              (exact source)
 *                                           "~^<prefix>(.*)$" "<target>$1";   (a `/prefix/*` splat rule)
 *   cache-control.map                       "<path>" "<one of the fixed Cache-Control values>";
 *   robots.map                              "<path>" | "~^<glob as regex>" → "<one of the fixed X-Robots-Tag values>";
 *   notfound.map                            "~^/<dir>/" "/<dir>/404.html";    (the nearest 404 page, deepest first)
 *   headers.conf                            add_header <Name from a fixed list> "<value>" always;   (the `/*` rule)
 */
import fs from "node:fs";
import path from "node:path";
import { ARVAN_IP_RANGES, ARVAN_IP_RANGES_FETCHED, ARVAN_IP_RANGES_SOURCE } from "../../config/arvan-ip-ranges.ts";
import { DATA_CACHE_CONTROL, IMMUTABLE_CACHE_CONTROL } from "../../lib/static/static-rules.ts";

export const REDIRECT_CODES = [301, 302, 307, 308] as const;
export type RedirectCode = (typeof REDIRECT_CODES)[number];
export const NGINX_INCLUDE_FILES = [...REDIRECT_CODES.map((c) => `redirects-${c}.map`), "cache-control.map", "robots.map", "notfound.map", "headers.conf"] as const;

/** The only Cache-Control values a path rule may set (lib/static/static-rules.ts). Everything else: the template default. */
export const ALLOWED_CACHE_CONTROL = [IMMUTABLE_CACHE_CONTROL, DATA_CACHE_CONTROL] as const;
/** The default the static Worker sends when no rule matches (max-age=0, revalidate every time). */
export const DEFAULT_CACHE_CONTROL = "public, max-age=0, must-revalidate";
export const ALLOWED_ROBOTS = ["noindex", "noindex, nofollow", "nofollow", "none"] as const;
/** Headers the `/*` rule may set (headers.conf). X-Robots-Tag goes through robots.map; Cache-Control through cache-control.map. */
export const ALLOWED_GLOBAL_HEADERS = [
  "X-Content-Type-Options",
  "Referrer-Policy",
  "X-Frame-Options",
  "Permissions-Policy",
  "Content-Security-Policy-Report-Only",
  "Content-Security-Policy",
  "Content-Signal",
  "Vary",
  "Strict-Transport-Security",
  "Cross-Origin-Opener-Policy",
] as const;

// --- grammar (kept line-for-line equal to deploy/iran/lib/ahanassa_iran.py; shared cases in deploy/iran/tests/grammar-cases.json)
const PATH_CHARS = `[^\\s"';{}$\\\\?#*\\x00-\\x1f\\x7f]`;
const LITERAL_RE = `(?:[A-Za-z0-9_/-]|\\\\\\.)`;
export const GRAMMAR: Record<string, readonly RegExp[]> = {
  redirect: [
    new RegExp(`^"(/${PATH_CHARS}*)" "((?:/|https://www\\.ahanassa\\.(?:com|ir)/)${PATH_CHARS}*)";$`),
    new RegExp(`^"~\\^(/${LITERAL_RE}*)\\(\\.\\*\\)\\$" "(/${PATH_CHARS}*)\\$1";$`),
  ],
  "cache-control": [new RegExp(`^"(/${PATH_CHARS}*)" "(${ALLOWED_CACHE_CONTROL.map(escapeRegExp).join("|")})";$`)],
  robots: [new RegExp(`^"(/${PATH_CHARS}*|~\\^(?:${LITERAL_RE}|\\.\\*)*\\$?)" "(${ALLOWED_ROBOTS.map(escapeRegExp).join("|")})";$`)],
  notfound: [/^"~\^(\/(?:[A-Za-z0-9_-]+\/)+)" "(\/(?:[A-Za-z0-9_-]+\/)+)404\.html";$/],
  headers: [new RegExp(`^add_header (${ALLOWED_GLOBAL_HEADERS.join("|")}) "([^"\\\\$\\{\\}\\x00-\\x1f\\x7f]*)" always;$`)],
};
const COMMENT_OR_BLANK = /^(?:#[^\x00-\x1f\x7f]*)?$/;
export const MAX_INCLUDE_BYTES = 1_048_576;

function escapeRegExp(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/** Which grammar a file name uses (null = not an allowed file). */
export function grammarFor(file: string): keyof typeof GRAMMAR | null {
  if (/^redirects-(301|302|307|308)\.map$/.test(file)) return "redirect";
  if (file === "cache-control.map") return "cache-control";
  if (file === "robots.map") return "robots";
  if (file === "notfound.map") return "notfound";
  if (file === "headers.conf") return "headers";
  return null;
}

/** Every line of one include file against its grammar; [] = accepted. */
export function checkNginxInclude(file: string, text: string): string[] {
  const kind = grammarFor(file);
  if (!kind) return [`${file}: not an allowed nginx include file`];
  if (Buffer.byteLength(text) > MAX_INCLUDE_BYTES) return [`${file}: larger than ${MAX_INCLUDE_BYTES} bytes`];
  if (text.includes("\r")) return [`${file}: CR characters`];
  const failures: string[] = [];
  text.split("\n").forEach((line, i) => {
    if (COMMENT_OR_BLANK.test(line)) return;
    const m = GRAMMAR[kind].map((re) => re.exec(line)).find(Boolean);
    if (!m) failures.push(`${file}:${i + 1}: line not allowed: ${line.slice(0, 160)}`);
    else if (kind === "notfound" && m[1] !== m[2]) failures.push(`${file}:${i + 1}: 404 page outside its own prefix`);
  });
  return failures;
}

// --- _redirects ----------------------------------------------------------------------------------------------------
export interface RedirectRule {
  source: string;
  target: string;
  code: RedirectCode;
}

/** `_redirects` text → rules, in file order (Cloudflare: the top-most rule for a source wins; comments/blank lines skipped). */
export function parseRedirects(text: string): RedirectRule[] {
  const rules: RedirectRule[] = [];
  for (const raw of text.split("\n")) {
    const line = raw.trim();
    if (!line || line.startsWith("#")) continue;
    const parts = line.split(/\s+/);
    if (parts.length < 2 || parts.length > 3) throw new Error(`_redirects: cannot parse "${line}"`);
    const code = Number(parts[2] ?? 302);
    if (!(REDIRECT_CODES as readonly number[]).includes(code)) throw new Error(`_redirects: status ${parts[2]} has no nginx equivalent here ("${line}")`);
    rules.push({ source: parts[0], target: parts[1], code: code as RedirectCode });
  }
  return rules;
}

const quote = (s: string) => `"${s}"`;

/** Rules → the four redirect maps. Exact sources are map strings, a trailing `/*` splat a regex with `$1`. */
export function renderRedirectMaps(rules: readonly RedirectRule[]): Record<`redirects-${RedirectCode}.map`, string> {
  const out = Object.fromEntries(REDIRECT_CODES.map((c) => [`redirects-${c}.map`, [] as string[]])) as unknown as Record<`redirects-${RedirectCode}.map`, string[]>;
  const exactSeen = new Set<string>();
  const splats: string[] = [];
  for (const r of rules) {
    if (r.source.includes(":")) throw new Error(`_redirects: placeholder rules are not supported on the domestic copy (${r.source})`);
    if (r.target.includes("*") || r.target.includes("?")) throw new Error(`_redirects: target "${r.target}" not supported`);
    const lines = out[`redirects-${r.code}.map`];
    if (r.source.endsWith("/*") && !r.source.slice(0, -1).includes("*")) {
      const prefix = r.source.slice(0, -1);
      if (!/^\/[A-Za-z0-9_./-]*$/.test(prefix)) throw new Error(`_redirects: splat prefix "${prefix}" has characters the domestic copy does not translate`);
      const target = r.target.endsWith(":splat") ? r.target.slice(0, -":splat".length) : null;
      if (target === null || target.includes(":")) throw new Error(`_redirects: a splat rule must end its target in :splat (${r.source} ${r.target})`);
      splats.push(prefix);
      lines.push(`${quote(`~^${prefix.replace(/\./g, "\\.")}(.*)$`)} ${quote(`${target}$1`)};`);
      continue;
    }
    if (r.source.includes("*")) throw new Error(`_redirects: only a trailing /* splat is supported (${r.source})`);
    // nginx checks exact map keys before regexes; Cloudflare takes the top-most rule. Equal only if no EARLIER splat covers it.
    if (splats.some((p) => r.source.startsWith(p))) throw new Error(`_redirects: ${r.source} comes after a splat rule that already matches it`);
    if (exactSeen.has(r.source)) continue;
    exactSeen.add(r.source);
    lines.push(`${quote(r.source)} ${quote(r.target)};`);
  }
  return Object.fromEntries(Object.entries(out).map(([k, v]) => [k, v.length ? `${v.join("\n")}\n` : ""])) as Record<`redirects-${RedirectCode}.map`, string>;
}

// --- _headers ------------------------------------------------------------------------------------------------------
export interface HeaderRule {
  path: string;
  headers: Array<[name: string, value: string]>;
}

export function parseHeaders(text: string): HeaderRule[] {
  const rules: HeaderRule[] = [];
  for (const line of text.split("\n")) {
    if (!line.trim() || line.trim().startsWith("#")) continue;
    if (!/^\s/.test(line)) {
      rules.push({ path: line.trim(), headers: [] });
      continue;
    }
    const current = rules[rules.length - 1];
    if (line.trim().startsWith("!")) throw new Error(`_headers: header removal (${line.trim()}) is not supported on the domestic copy`);
    const m = /^\s+([A-Za-z0-9-]+):\s*(.*)$/.exec(line);
    if (!current || !m) throw new Error(`_headers: cannot parse "${line}"`);
    current.headers.push([m[1], m[2].trim()]);
  }
  return rules;
}

/** A `_headers` path pattern as a map key: a concrete path stays exact, `*` globs become an anchored regex. */
export function headerPathKey(p: string): string {
  if (!p.includes("*")) return quote(p);
  if (!/^\/[A-Za-z0-9_.*/-]*$/.test(p)) throw new Error(`_headers: pattern "${p}" has characters the domestic copy does not translate`);
  const body = p
    .split("*")
    .map((part) => part.replace(/\./g, "\\."))
    .join(".*");
  // A trailing * matches anything after it, so the regex needs no `$` (Cloudflare: "/data/*" = every path under /data/).
  return quote(p.endsWith("*") ? `~^${body.slice(0, -2)}` : `~^${body}$`);
}

export interface RenderedHeaders {
  "headers.conf": string;
  "cache-control.map": string;
  "robots.map": string;
}

export function renderHeaderIncludes(rules: readonly HeaderRule[]): RenderedHeaders {
  const global: string[] = [];
  const cache: string[] = [];
  const robots: string[] = [];
  let globalRobots = false;
  for (const rule of rules) {
    for (const [name, value] of rule.headers) {
      const lower = name.toLowerCase();
      if (/["\\${}\x00-\x1f\x7f]/.test(value)) throw new Error(`_headers: ${rule.path} ${name} value has characters nginx would interpret`);
      if (lower === "x-robots-tag") {
        if (!(ALLOWED_ROBOTS as readonly string[]).includes(value)) throw new Error(`_headers: X-Robots-Tag "${value}" not in the allowed set`);
        if (rule.path === "/*") globalRobots = true;
        robots.push(`${headerPathKey(rule.path)} ${quote(value)};`);
      } else if (lower === "cache-control") {
        if (rule.path.includes("*")) throw new Error(`_headers: Cache-Control on a wildcard rule (${rule.path}) is not supported (the W10.6/W25 gate forbids it too)`);
        if (!(ALLOWED_CACHE_CONTROL as readonly string[]).includes(value)) throw new Error(`_headers: Cache-Control "${value}" on ${rule.path} not in the allowed set`);
        cache.push(`${quote(rule.path)} ${quote(value)};`);
      } else if (rule.path === "/*") {
        const canonical = ALLOWED_GLOBAL_HEADERS.find((h) => h.toLowerCase() === lower);
        if (!canonical) throw new Error(`_headers: /* header ${name} not in the allowed list`);
        global.push(`add_header ${canonical} ${quote(value)} always;`);
      } else {
        throw new Error(`_headers: ${name} on ${rule.path} is not supported on the domestic copy (only Cache-Control / X-Robots-Tag per path)`);
      }
    }
  }
  // Cloudflare joins the values when two rules set the same header on one path; nginx's map would pick one. Refuse that.
  if (globalRobots && robots.length > 1) throw new Error("_headers: X-Robots-Tag on /* and on a path rule — the values would be joined on Cloudflare");
  const text = (lines: string[]) => (lines.length ? `${lines.join("\n")}\n` : "");
  // The global regex comes last: nginx tries regex map keys in order; `/*` must not shadow a narrower rule (refused above anyway).
  return { "headers.conf": text(global), "cache-control.map": text(cache), "robots.map": text(robots) };
}

// --- 404 pages -----------------------------------------------------------------------------------------------------
/** The nearest 404.html (Workers `not_found_handling: "404-page"`): one regex per non-root 404 page, deepest first. */
export function renderNotFoundMap(publicPaths: readonly string[]): string {
  const dirs = publicPaths
    .filter((p) => p.endsWith("/404.html"))
    .map((p) => `/${p.slice(0, -"404.html".length)}`)
    .filter((d) => /^\/(?:[A-Za-z0-9_-]+\/)+$/.test(d))
    .sort((a, b) => b.split("/").length - a.split("/").length || a.localeCompare(b));
  return dirs.map((d) => `${quote(`~^${d}`)} ${quote(`${d}404.html`)};\n`).join("");
}

// --- the whole set ---------------------------------------------------------------------------------------------------
export function renderNginxIncludes(input: { redirects: string; headers: string; publicPaths: readonly string[] }): Record<(typeof NGINX_INCLUDE_FILES)[number], string> {
  const files = {
    ...renderRedirectMaps(parseRedirects(input.redirects)),
    ...renderHeaderIncludes(parseHeaders(input.headers)),
    "notfound.map": renderNotFoundMap(input.publicPaths),
  };
  const failures = Object.entries(files).flatMap(([name, text]) => checkNginxInclude(name, text));
  if (failures.length) throw new Error(`rendered nginx includes break their own grammar:\n${failures.join("\n")}`);
  return files;
}

/** deploy/iran/nginx/snippets/ahanassa-arvan-real-ip.conf: the client address from Arvan's X-Real-IP, trusted only from Arvan's ranges. */
export function renderArvanRealIp(): string {
  return [
    "# GENERATED by scripts/iran/render-nginx.ts from config/arvan-ip-ranges.ts — do not edit; a test keeps them equal.",
    `# Source ${ARVAN_IP_RANGES_SOURCE}, fetched ${ARVAN_IP_RANGES_FETCHED}. Arvan sends the visitor's address in X-Real-IP`,
    "# (never X-Forwarded-For). The firewall admits 80/443 only from these ranges, so every peer is one of them.",
    ...ARVAN_IP_RANGES.map((r) => `set_real_ip_from ${r};`),
    "real_ip_header X-Real-IP;",
    "",
  ].join("\n");
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const args = new Map<string, string>();
  for (let i = 2; i < process.argv.length; i += 2) args.set(process.argv[i].replace(/^--/, ""), process.argv[i + 1]);
  if (args.has("arvan-real-ip")) {
    fs.writeFileSync(args.get("arvan-real-ip")!, renderArvanRealIp());
    process.exit(0);
  }
  const pub = args.get("public");
  const out = args.get("out");
  if (!pub || !out) {
    console.error("usage: render-nginx.ts --public <public-assets> --out <dir> | --arvan-real-ip <file>");
    process.exit(2);
  }
  const { listFiles } = await import("../../lib/static/artifact-gate.ts");
  const files = renderNginxIncludes({ redirects: fs.readFileSync(path.join(pub, "_redirects"), "utf8"), headers: fs.readFileSync(path.join(pub, "_headers"), "utf8"), publicPaths: listFiles(pub) });
  fs.mkdirSync(out, { recursive: true });
  for (const [name, text] of Object.entries(files)) fs.writeFileSync(path.join(out, name), text);
  console.log(`[iran] nginx includes -> ${out}: ${Object.entries(files).map(([n, t]) => `${n} ${t.split("\n").filter(Boolean).length}`).join(", ")}`);
}
