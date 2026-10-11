import { test } from "node:test";
import assert from "node:assert/strict";
import { validateArticles, articleCheckContext } from "./articles.ts";
import { decreaseFindings } from "./validate.ts";
import type { ArticlesSource } from "./articles-source.ts";
import type { SnapshotV1 } from "../contracts/snapshot-v1.ts";
import { visibleNavLinks, navLinks } from "../content/nav.ts";

/** W11.1 — the article fail-safe (like prices) and the article decrease gate. Synthetic data only. */
const tables = (): SnapshotV1["tables"] => ({
  catalog_public_categories: [],
  catalog_products: [],
  product_variants: [],
  product_seo_contents: [],
  public_processing_groups: [],
  route_redirects: [],
  homepage_product_rank: [],
  catalog_group_labels: [],
  published_prices: [],
  published_price_history: [],
  published_articles: [],
});
const source = (status: ArticlesSource["status"], error?: string): ArticlesSource => ({ status, mode: status === "not_configured" ? null : "token", repo: "owner/content", ref: "main", commit: null, fetched_at: "2026-10-09T08:00:00.000Z", error, files: [] });
const live = { articles_fa: 3, articles_ar: 1, articles_en: 1 };

test("fail-safe: not configured or fetch failed → build without articles (warning) when the live site has none", () => {
  for (const [s, outcome] of [[source("not_configured"), "empty_not_configured"], [source("failed", "HTTP 503"), "empty_fetch_failed"], [undefined, "empty_not_configured"]] as const) {
    const r = validateArticles(s, tables(), { prices_published: 4 });
    assert.equal(r.outcome, outcome);
    assert.deepEqual(r.errors, []);
    assert.match(r.warnings[0], /NO ARTICLES/);
    assert.deepEqual(r.counts, { articles_fa: 0, articles_ar: 0, articles_en: 0 });
  }
  assert.equal(validateArticles(source("failed"), tables(), null).outcome, "empty_fetch_failed", "no active publication = no live articles");
});

test("fail-safe: not configured or fetch failed → BLOCKED when the live site shows articles", () => {
  for (const s of [source("not_configured"), source("failed", "timeout")]) {
    const r = validateArticles(s, tables(), live);
    assert.equal(r.outcome, "blocked");
    assert.match(r.errors[0], /BLOCKED: .* the live site shows 5 article\(s\)/);
  }
});

test("an empty content repository (nothing merged yet) is not an error", () => {
  const r = validateArticles(source("ok"), tables(), null);
  assert.equal(r.outcome, "none_merged");
  assert.deepEqual(r.errors, []);
});

test("article decrease gate: ANY drop of a locale's article count against the live publication stops the run; growth never does", () => {
  const f = decreaseFindings({ articles_fa: 99, articles_ar: 1, articles_en: 0 }, { articles_fa: 100, articles_ar: 1, articles_en: 1 });
  assert.deepEqual(f.map((x) => x.key), ["articles_fa", "articles_en"]);
  assert.deepEqual(decreaseFindings({ articles_fa: 4, articles_ar: 2, articles_en: 1 }, live), []);
  // Other counts keep the 20 % threshold.
  assert.deepEqual(decreaseFindings({ variants_active: 90 }, { variants_active: 100 }), []);
  // A publication from before W11.1 has no article counts: nothing to compare.
  assert.deepEqual(decreaseFindings({ articles_fa: 0 }, { variants_active: 100 }), []);
});

test("check context: links resolve to this snapshot's published product pages, categories and static pages per locale", () => {
  const t = tables();
  t.catalog_products.push({ id: "p1", template_xid: "CTMPL-000001", is_active: 1, is_public: 1 } as never, { id: "p2", template_xid: "CTMPL-000002", is_active: 1, is_public: 0 } as never);
  t.product_seo_contents.push(
    { entity_type: "product", entity_id: "p1", locale: "fa", slug: "rebar-a", content_quality_status: "approved", published_at: "2026-10-01", h1: "x" } as never,
    { entity_type: "product", entity_id: "p1", locale: "en", slug: "rebar-a-en", content_quality_status: "draft", published_at: null, h1: "x" } as never,
    { entity_type: "product", entity_id: "p2", locale: "fa", slug: "hidden", content_quality_status: "approved", published_at: "2026-10-01", h1: "x" } as never,
  );
  t.catalog_public_categories.push({ code: "BOX_SECTION", locale: "ar" } as never);
  const c = articleCheckContext(t, null);
  assert.ok(c.routes.fa.has("/products/rebar-a") && !c.routes.fa.has("/products/hidden") && !c.routes.en.has("/products/rebar-a-en"));
  assert.ok(c.routes.ar.has("/products/category/box-section") && c.routes.ar.has("/prices") && !c.routes.en.has("/prices"));
  assert.ok(c.routes.fa.has("/tools/weight-calculator") && c.routes.fa.has("/contact"));
  assert.ok(c.templates.has("CTMPL-000002"));
});

test("nav: «مقالات» is listed in every locale but shown only where the build publishes articles", () => {
  for (const locale of ["fa", "ar", "en"] as const) {
    assert.ok(navLinks[locale].some((l) => l.path === "/articles"));
    assert.ok(visibleNavLinks(locale, true).some((l) => l.path === "/articles"));
    assert.ok(!visibleNavLinks(locale, false).some((l) => l.path === "/articles"));
    assert.equal(visibleNavLinks(locale, false).length, navLinks[locale].length - 1);
  }
  assert.deepEqual(navLinks.fa.find((l) => l.path === "/articles")?.label, "مقالات");
  assert.deepEqual(navLinks.ar.find((l) => l.path === "/articles")?.label, "المقالات");
  assert.deepEqual(navLinks.en.find((l) => l.path === "/articles")?.label, "Articles");
});
