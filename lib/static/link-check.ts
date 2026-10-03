/**
 * Internal link / image / hreflang / sitemap check over a public-assets tree
 * (architecture V1.1 §7.1 step 5, §12; W4). Pure: the caller passes the file
 * list and a reader. Resolution follows the static Worker's Static Assets
 * rules (`html_handling: auto-trailing-slash`) plus the `_redirects` sources.
 *
 * - every internal href/src/srcset/og:image/CSS url() resolves to a file;
 * - canonical and hreflang URLs (production origin) resolve to a page of
 *   this artifact, and every hreflang pair is reciprocal;
 * - the sitemap lists only pages that exist and are not noindex.
 */
export const PRODUCTION_ORIGIN = "https://www.ahanassa.com";

export interface LinkFinding {
  file: string;
  kind: "broken_link" | "broken_image" | "broken_canonical" | "hreflang_not_reciprocal" | "sitemap_bad_url";
  target: string;
}

export function resolvePublicPath(urlPath: string, files: ReadonlySet<string>, redirectSources: ReadonlySet<string> = new Set()): string | null {
  let p = urlPath.split("#")[0].split("?")[0];
  try {
    p = decodeURI(p);
  } catch {
    return null;
  }
  if (!p.startsWith("/")) return null;
  if (redirectSources.has(p) || redirectSources.has(p.replace(/\/$/, ""))) return p;
  const rel = p.slice(1);
  const candidates = rel === "" ? ["index.html"] : p.endsWith("/") ? [`${rel}index.html`, `${rel.slice(0, -1)}.html`] : [rel, `${rel}.html`, `${rel}/index.html`];
  return candidates.find((c) => files.has(c)) ?? null;
}

/** The URL path a page file is served at (fa at the root; `x.html` and `x/index.html` -> `/x`). */
export function pagePathOf(file: string): string {
  const p = `/${file.replace(/\.html$/, "").replace(/(^|\/)index$/, "")}`;
  return p === "/" ? "/" : p.replace(/\/$/, "");
}

export function parseRedirectSources(redirects: string): Set<string> {
  return new Set(
    redirects
      .split("\n")
      .map((l) => l.trim())
      .filter((l) => l && !l.startsWith("#"))
      .map((l) => l.split(/\s+/)[0]),
  );
}

const attr = (tag: string, name: string) => new RegExp(`\\b${name}="([^"]*)"`, "i").exec(tag)?.[1];

function internalPath(url: string): string | null {
  if (url.startsWith(PRODUCTION_ORIGIN)) return url.slice(PRODUCTION_ORIGIN.length) || "/";
  if (url.startsWith("/") && !url.startsWith("//")) return url;
  return null; // external, mailto:, tel:, #, data:, javascript:
}

export function checkLinks(files: readonly string[], read: (file: string) => string): LinkFinding[] {
  const set = new Set(files);
  const findings: LinkFinding[] = [];
  const redirects = set.has("_redirects") ? parseRedirectSources(read("_redirects")) : new Set<string>();
  const alternatesByPage = new Map<string, Map<string, string>>(); // page path -> hreflang -> target path

  for (const file of files) {
    if (file.endsWith(".css")) {
      for (const m of read(file).matchAll(/url\(\s*["']?([^"')]+)["']?\s*\)/g)) {
        const p = internalPath(m[1]);
        if (p && !resolvePublicPath(p, set, redirects)) findings.push({ file, kind: "broken_image", target: m[1] });
      }
      continue;
    }
    if (!file.endsWith(".html")) continue;
    const html = read(file);
    const htmlNoScripts = html.replace(/<script[\s\S]*?<\/script>/gi, " ");
    for (const m of htmlNoScripts.matchAll(/<(a|link|img|script|source|meta)\b[^>]*>/gi)) {
      const tag = m[0];
      const name = m[1].toLowerCase();
      if (name === "link") {
        const rel = (attr(tag, "rel") ?? "").toLowerCase();
        const href = attr(tag, "href");
        if (!href) continue;
        const p = internalPath(href);
        if (rel === "canonical" || rel === "alternate") {
          if (!p || !resolvePublicPath(p, set)) {
            findings.push({ file, kind: "broken_canonical", target: href });
            continue;
          }
          const lang = attr(tag, "hreflang");
          if (rel === "alternate" && lang) {
            const page = pagePathOf(file);
            const map = alternatesByPage.get(page) ?? new Map<string, string>();
            map.set(lang, p.replace(/\/$/, "") || "/");
            alternatesByPage.set(page, map);
          }
          continue;
        }
        if (p && !resolvePublicPath(p, set, redirects)) findings.push({ file, kind: /icon|image/.test(rel) ? "broken_image" : "broken_link", target: href });
        continue;
      }
      if (name === "meta") {
        const prop = (attr(tag, "property") ?? attr(tag, "name") ?? "").toLowerCase();
        const content = attr(tag, "content");
        if (content && /^(og:image|twitter:image)$/.test(prop)) {
          const p = internalPath(content);
          if (p && !resolvePublicPath(p, set)) findings.push({ file, kind: "broken_image", target: content });
        }
        continue;
      }
      const urls = [attr(tag, "href"), attr(tag, "src"), ...(attr(tag, "srcset") ?? "").split(",").map((s) => s.trim().split(/\s+/)[0])].filter((u): u is string => Boolean(u));
      for (const u of urls) {
        const p = internalPath(u);
        if (p && !resolvePublicPath(p, set, redirects)) findings.push({ file, kind: name === "img" || name === "source" ? "broken_image" : "broken_link", target: u });
      }
    }
  }

  // Reciprocal hreflang: if page A lists B as an alternate, B must list A back.
  for (const [page, alternates] of alternatesByPage) {
    for (const [lang, target] of alternates) {
      if (lang === "x-default" || target === page) continue;
      const back = alternatesByPage.get(target);
      if (!back || ![...back.values()].includes(page)) findings.push({ file: page, kind: "hreflang_not_reciprocal", target: `${lang} -> ${target}` });
    }
  }

  // Sitemap: only existing, indexable pages.
  if (set.has("sitemap.xml")) {
    for (const m of read("sitemap.xml").matchAll(/<loc>([^<]+)<\/loc>/g)) {
      const p = internalPath(m[1]);
      const resolved = p ? resolvePublicPath(p, set) : null;
      if (!resolved) findings.push({ file: "sitemap.xml", kind: "sitemap_bad_url", target: m[1] });
      else if (resolved.endsWith(".html") && /<meta[^>]+name="robots"[^>]+content="[^"]*noindex/i.test(read(resolved))) findings.push({ file: "sitemap.xml", kind: "sitemap_bad_url", target: `${m[1]} (noindex page)` });
    }
  }
  return findings;
}
