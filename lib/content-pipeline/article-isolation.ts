import { ARTICLE_LOCALES, type ArticleLocale, type PublishedArticleRow } from "../contracts/snapshot-articles.ts";
import type { ArticleSourceFile } from "../articles/validate.ts";
import { articleSlugOf, type ArticleFinding } from "../static/article-gate.ts";
import { fileLocale } from "../static/leak-scan.ts";

/**
 * W11.6 — article isolation (incident 2026-10-19/20: one daily article's en .md mirror failed the article gate, and
 * the whole content publish, prices included, was refused for two days).
 *
 * When the artifact gate's ONLY failures are article-gate findings (lib/static/article-gate.ts) on article pages,
 * the content pipeline leaves those articles out — every locale of each (its translations) — and builds again;
 * prices and every other page publish. Anything else stays blocking: a leak, a price-source name, a price-gate,
 * publication, agent-text or Markdown-mirror finding, and an article-gate finding on a listing or category page
 * (it names no single article). Pure; scripts/content/export.ts runs it.
 */
export interface DroppedArticleGroup {
  /** `locale:slug` of every locale of the article that is left out. */
  articles: string[];
  /** `file: finding` lines of the gate, each quoting the offending text. */
  reasons: string[];
}

export type IsolationPlan = { ok: true; groups: DroppedArticleGroup[] } | { ok: false; why: string };

const key = (locale: string, slug: string) => `${locale}:${slug}`;

export function planArticleIsolation(gate: { failures: readonly string[]; articleFindings: readonly ArticleFinding[] }, rows: readonly PublishedArticleRow[]): IsolationPlan {
  if (gate.articleFindings.length === 0) return { ok: false, why: "no article-gate finding" };
  const other = gate.failures.length - gate.articleFindings.length;
  if (other > 0) return { ok: false, why: `${other} failure(s) of other gates (leak, price, publication, source-name, …) — those always block` };
  const byKey = new Map(rows.map((r) => [key(r.locale, r.slug), r]));
  const failing = new Map<string, string[]>();
  for (const f of gate.articleFindings) {
    const slug = articleSlugOf(f.file);
    const locale = fileLocale(f.file);
    if (!slug || !locale || !byKey.has(key(locale, slug))) return { ok: false, why: `${f.file} is not the page of one article (a listing or category page) — the finding blocks` };
    failing.set(key(locale, slug), [...(failing.get(key(locale, slug)) ?? []), `${f.file}: ${f.match}`]);
  }
  // Each failing article with all its translations, in both directions (a translation pair is one article).
  const linked = (k: string): string[] => {
    const row = byKey.get(k);
    const out = row ? ARTICLE_LOCALES.map((l) => (JSON.parse(row.translations_json) as Record<ArticleLocale, string | null>)[l]).map((s, i) => (s ? key(ARTICLE_LOCALES[i], s) : null)) : [];
    for (const r of rows) if (Object.entries(JSON.parse(r.translations_json) as Record<string, string | null>).some(([l, s]) => s && key(l, s) === k)) out.push(key(r.locale, r.slug));
    return out.filter((x): x is string => x !== null && byKey.has(x));
  };
  const seen = new Set<string>();
  const groups: DroppedArticleGroup[] = [];
  for (const start of [...failing.keys()].sort()) {
    if (seen.has(start)) continue;
    const group = new Set([start]);
    for (const queue = [start]; queue.length; ) for (const n of linked(queue.pop()!)) if (!group.has(n)) group.add(n), queue.push(n);
    for (const g of group) seen.add(g);
    const articles = [...group].sort();
    groups.push({ articles, reasons: articles.flatMap((a) => failing.get(a) ?? []) });
  }
  return { ok: true, groups };
}

/** The content-repository article files without the dropped articles (`articles/<locale>/YYYY/MM/<slug>.md`); covers stay. */
export function withoutArticles(files: readonly ArticleSourceFile[], dropped: ReadonlySet<string>): ArticleSourceFile[] {
  return files.filter((f) => {
    const m = /^articles\/(fa|ar|en)\/\d{4}\/\d{2}\/([^/]+)\.md$/.exec(f.path);
    return !m || !dropped.has(key(m[1], m[2]));
  });
}
