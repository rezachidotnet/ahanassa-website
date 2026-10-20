import { test } from "node:test";
import assert from "node:assert/strict";
import { planArticleIsolation, withoutArticles } from "./article-isolation.ts";
import type { PublishedArticleRow } from "../contracts/snapshot-articles.ts";
import type { ArticleFinding } from "../static/article-gate.ts";

/** W11.6 — an article the article gate refuses is left out (all its locales); every other gate failure blocks. Synthetic. */
const row = (locale: PublishedArticleRow["locale"], slug: string, translations: Partial<Record<"fa" | "ar" | "en", string>>): PublishedArticleRow =>
  ({ locale, slug, translations_json: JSON.stringify({ fa: null, ar: null, en: null, ...translations, [locale]: slug }) }) as PublishedArticleRow;
const ROWS = [
  row("fa", "rebar-factors", { ar: "rebar-factors", en: "rebar-factors" }),
  row("ar", "rebar-factors", { fa: "rebar-factors", en: "rebar-factors" }),
  row("en", "rebar-factors", { fa: "rebar-factors", ar: "rebar-factors" }),
  row("fa", "beam-guide", { en: "beam-guide-en" }),
  row("en", "beam-guide-en", { fa: "beam-guide" }),
  row("fa", "storage", {}),
];
const finding = (file: string, match = 'en: number 4 in a sentence about prices: "x"'): ArticleFinding => ({ file, kind: "article_price_on_en", match });
const gate = (findings: ArticleFinding[], other: string[] = []) => ({ failures: [...other, ...findings.map((f) => `article ${f.kind} in ${f.file}: ${f.match}`)], articleFindings: findings });

test("a failing en page leaves out the whole article — fa, ar and en — and names the finding", () => {
  const plan = planArticleIsolation(gate([finding("en/articles/rebar-factors.md"), finding("en/articles/rebar-factors.html")]), ROWS);
  assert.ok(plan.ok);
  assert.deepEqual(plan.groups, [
    { articles: ["ar:rebar-factors", "en:rebar-factors", "fa:rebar-factors"], reasons: ['en/articles/rebar-factors.md: en: number 4 in a sentence about prices: "x"', 'en/articles/rebar-factors.html: en: number 4 in a sentence about prices: "x"'] },
  ]);
  // Translations with different slugs, and a failing fa/ar page (external image, JSON-LD), are followed too.
  const two = planArticleIsolation(gate([finding("articles/beam-guide.html"), { file: "ar/articles/rebar-factors.html", kind: "article_place_on_ar", match: "m" }]), ROWS);
  assert.ok(two.ok);
  assert.deepEqual(two.groups.map((g) => g.articles), [["ar:rebar-factors", "en:rebar-factors", "fa:rebar-factors"], ["en:beam-guide-en", "fa:beam-guide"]]);
});

test("not isolated: any other gate failure, a listing/category page, an unknown article, or no article finding — the run stays blocked", () => {
  const leak = planArticleIsolation(gate([finding("en/articles/rebar-factors.md")], ["leak persian_on_en in en/about.html: x"]), ROWS);
  assert.deepEqual(leak, { ok: false, why: "1 failure(s) of other gates (leak, price, publication, source-name, …) — those always block" });
  for (const file of ["en/articles.md", "en/articles/category/market-analysis.html", "en/articles/not-in-snapshot.md"]) {
    const plan = planArticleIsolation(gate([finding(file)]), ROWS);
    assert.equal(plan.ok, false, file);
  }
  assert.equal(planArticleIsolation(gate([], ["price price_on_en_page in en/x.html: y"]), ROWS).ok, false);
});

test("withoutArticles drops exactly the left-out article files (every locale), keeps covers and other articles", () => {
  const files = ["articles/fa/2026/10/rebar-factors.md", "articles/en/2026/10/rebar-factors.md", "articles/ar/2026/10/rebar-factors.md", "articles/fa/2026/10/storage.md", "assets/articles/rebar-factors/cover.svg"].map((path) => ({ path, content: "" }));
  assert.deepEqual(
    withoutArticles(files, new Set(["fa:rebar-factors", "en:rebar-factors", "ar:rebar-factors"])).map((f) => f.path),
    ["articles/fa/2026/10/storage.md", "assets/articles/rebar-factors/cover.svg"],
  );
});
