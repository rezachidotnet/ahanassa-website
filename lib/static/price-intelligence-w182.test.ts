import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { validatePricing, type PricingSource } from "../content-pipeline/pricing.ts";
import { validatePricingHistory, withPreviousDay } from "../content-pipeline/pricing-history.ts";
import { validateIndicators } from "../content-pipeline/indicators.ts";
import { buildSnapshot, readSnapshotFile } from "./snapshot-io.ts";
import { priceGateInput, scanPrices } from "./price-gate.ts";
import { indicatorGateInput, scanIndicators } from "./indicator-gate.ts";
import { scanPublication } from "./publication-gate.ts";
import { scanPublicFile } from "./leak-scan.ts";
import { checkAgentTexts } from "./markdown-mirror.ts";
import { buildLlmsTxt } from "./llms-txt.ts";
import { buildRedirectsFile } from "./static-rules.ts";
import { tehranDay } from "../pricing/price-history.ts";
import { priceWindows, windowPoints, type WindowStats } from "../pricing/price-position.ts";
import { PRICE_CHART_COPY, PRICE_DECISION_COPY } from "../pricing/price-charts.ts";
import { formatTomanAmount } from "../pricing/product-page-price.ts";
import { lineGeometry, addDays } from "../charts/line-geometry.ts";
import { bareAttribution, DRIVERS_COPY, driversItems, INDICATOR_COPY, presentIndicator, type Indicator } from "../indicators/presentation.ts";
import { MARKET_INDICATORS_COPY } from "../indicators/page.ts";
import { datasetSchema, jsonLdGraph } from "../seo/schema.ts";
import { buildEvent, funnelPage } from "../analytics/events.ts";

/**
 * W18.2 — price intelligence on the static site: the gates (price gate rule 9, the indicator gate, the leak and
 * agent-text rules), the redirects, llms.txt, JSON-LD and analytics. SYNTHETIC data only (fixtures/pricing,
 * fixtures/indicators); HTML here mirrors the components' markup with the same lib copy and numbers.
 */

const REPO = path.resolve(import.meta.dirname, "../..");
const read = (f: string) => JSON.parse(fs.readFileSync(path.join(REPO, f), "utf8"));
const ok = (body: unknown): PricingSource => ({ status: "ok", http_status: 200, etag: null, body });
const base = readSnapshotFile(path.join(REPO, "fixtures/snapshot/staging-2026-10-01.snapshot.json"));
const current = read("fixtures/pricing/synthetic-pricing-current.json");
const history90 = read("fixtures/pricing/synthetic-pricing-history-90.json");
const indicatorsFixture = read("fixtures/indicators/synthetic-indicators.json");
const templateOf = new Map(base.tables.catalog_products.map((p) => [p.id, p.template_xid]));
const catalog = base.tables.product_variants.filter((v) => v.is_active === 1).map((v) => ({ canonical_id: v.xid, canonical_template_id: templateOf.get(v.product_id) ?? "", sku: v.sku }));
const pricing = validatePricing(ok(current.response), catalog, current.fetched_at);
const history = validatePricingHistory(ok(history90.response), pricing.rows, current.fetched_at);
const indicators = validateIndicators({ fa: ok(indicatorsFixture.responses.fa), en: ok(indicatorsFixture.responses.en), ar: ok(indicatorsFixture.responses.ar) }, indicatorsFixture.fetched_at);
const snapshot = buildSnapshot({ ...base.tables, published_prices: withPreviousDay(pricing.rows, history.previousDay), published_price_history: history.rows, published_indicators: indicators.rows, published_indicator_points: indicators.points }, base.source, base.created_at);
const priceInput = priceGateInput(snapshot);
const indicatorInput = indicatorGateInput(snapshot);
const ALL: Indicator[] = [...indicatorInput.indicators.values()];

const XID = "CVAR-000031";
const row = pricing.rows.find((r) => r.canonical_variant_id === XID)!;
const DAY = tehranDay(row.published_at)!;
const points = priceInput.history.get(XID)!;
const WINDOWS = priceWindows(points, DAY);
const amount = (n: number) => formatTomanAmount("fa", n);
const T = PRICE_DECISION_COPY;

const svg = (n: number, count = n) => {
  const s = windowPoints(points, DAY, 90).slice(-count);
  const g = lineGeometry(s.map((p) => ({ date: p.day, value: p.price })), addDays(DAY, -89), DAY, 240, 48);
  return `<svg data-aa-price-line="${n}" viewBox="0 0 240 48"><path d="${g.path}" stroke-linejoin="round"></path><path d="M1 1 L1 1"></path></svg>`;
};
const driversHtml = (list: Indicator[] = ALL) =>
  `<p data-aa-indicator-line="${list.map((i) => i.code).join(" ")}"><span>${DRIVERS_COPY.fa.lead}: </span>${driversItems("fa", list).map((d, i) => `<span>${i ? " · " : ""}<bdi>${d.text}</bdi></span>`).join("")}<span>${INDICATOR_COPY.fa.reference}. ${DRIVERS_COPY.fa.sources}: ${list.map((i) => bareAttribution("fa", i.attributions.fa)).join("؛ ")}</span></p>`;
const gaugeHtml = (windows: WindowStats[] = WINDOWS, opts: { xid?: string; line?: string; extra?: string } = {}) =>
  `<section data-aa-price-gauge="${opts.xid ?? XID}"><h2>${T.title}</h2>${windows
    .map((w) => `<p><span>${T.window(w.window)}</span><span>${T.position[w.position]}</span></p><dl><div><dt>${T.min}</dt><dd>${amount(w.min)}</dd></div><div><dt>${T.avg}</dt><dd>${amount(w.avg)}</dd></div><div><dt>${T.max}</dt><dd>${amount(w.max)}</dd></div></dl>`)
    .join("")}<p>${T.today}: <span>${amount(windows[0].today)}</span> ${T.unit}</p><figure><figcaption>${T.trend(90)}</figcaption>${opts.line ?? svg(windowPoints(points, DAY, 90).length)}</figure><p>${T.note}</p>${driversHtml()}<div data-chart-rfq="gauge"><a href="/contact?variant=${XID}&amp;factory=x">${T.cta}</a><a href="/prices/chart/rebar-aj400">${T.chartLink}</a></div>${opts.extra ?? ""}</section>`;
const page = (body: string, h1 = "میلگرد آجدار") => `<html><body><h1>${h1}</h1>${body}</body></html>`;
const cardHtml = (locale: "fa" | "en" | "ar", i: Indicator, extra = "") => {
  const v = presentIndicator(locale, i);
  const t = INDICATOR_COPY[locale];
  return `<div data-aa-indicator="${i.code}"><p>${v.name}</p><span>${t.reference}</span><p><bdi>${v.value}</bdi><span>${v.unit.text}</span></p>${v.change ? `<p>${v.change.glyph ? `<span aria-hidden="true">${v.change.glyph} </span>` : ""}${v.change.word ? `<span class="sr-only">${v.change.word} </span>` : ""}<bdi>${v.change.text}</bdi> ${t.vsPrevious}</p>` : ""}<p><time>${v.stamp}</time>${v.preliminary ? ` · ${t.preliminary}` : ""}</p><a href="${v.sourceHref}">${v.source}</a>${extra}</div>`;
};

test("fixtures: prices, a 90-day history and the indicators are synthetic and give the gauge both windows", () => {
  assert.equal(history90.synthetic && indicatorsFixture.synthetic && current.synthetic, true);
  assert.deepEqual(history.warnings, []);
  assert.deepEqual(WINDOWS.map((w) => w.window), [30, 90]);
  assert.equal(ALL.length, 3);
});

test("rule 9: a gauge whose every number is recomputed from the snapshot passes; it never counts as a price outside markup", () => {
  const findings = scanPrices([{ path: "products/rebar-aj400.html", content: page(gaugeHtml()) }], priceInput);
  assert.deepEqual(findings, []);
  assert.deepEqual(scanIndicators([{ path: "products/rebar-aj400.html", content: page(gaugeHtml()) }], indicatorInput), []);
});

test("rule 9: a changed number, a foreign text, an unpriced variant or a wrong line count in a gauge fails", () => {
  const scan = (html: string) => scanPrices([{ path: "products/rebar-aj400.html", content: page(html) }], priceInput).map((f) => f.kind);
  const tampered = WINDOWS.map((w) => ({ ...w, avg: w.avg + 1 }));
  assert.ok(scan(gaugeHtml(tampered)).includes("price_gauge_not_allowed"), "an average the snapshot does not give");
  assert.ok(scan(gaugeHtml(WINDOWS, { extra: "<p>الان بخرید</p>" })).includes("price_gauge_not_allowed"), "advice text");
  assert.ok(scan(gaugeHtml(WINDOWS, { xid: "CVAR-000033" })).includes("price_gauge_not_allowed"), "an on-request variant");
  assert.ok(scan(gaugeHtml(WINDOWS, { line: svg(5) })).includes("price_gauge_not_allowed"), "a line that draws 5 points");
  assert.ok(scan(gaugeHtml() + svg(windowPoints(points, DAY, 90).length)).includes("price_gauge_not_allowed"), "a price line outside a gauge or chart");
  // Without the gauge mark the same numbers are prices outside markup (rule 2 still holds).
  assert.ok(scan(`<p>${amount(row.price_irr_per_kg / 10)}</p>`).includes("price_outside_markup"));
});

test("rule 9: gauges and chart pages are fa only (ar and en never carry them, nor the CTA copy)", () => {
  const ar = scanPrices([{ path: "ar/products/rebar-aj400.html", content: page(gaugeHtml()) }], priceInput).map((f) => f.kind);
  assert.ok(ar.includes("price_fa_field_on_ar_page"));
  const en = scanPrices([{ path: "en/products/rebar-aj400.html", content: page(`<p>${T.cta}</p>`) }], priceInput).map((f) => f.kind);
  assert.ok(en.includes("price_on_en_page"));
});

test("rule 9: a chart page's chart — every day's amount and date from the snapshot, lines of a window's length", () => {
  const product = "میلگرد آجدار";
  const s90 = windowPoints(points, DAY, 90);
  const chart = (rows: { day: string; price: number }[]) =>
    `<div data-aa-price-chart="${XID}"><figure><figcaption>${PRICE_CHART_COPY.chartLabel(product, 90)}</figcaption>${svg(s90.length)}</figure><h2>${PRICE_CHART_COPY.tableTitle}</h2><table><caption>${PRICE_CHART_COPY.tableCaption(product)}</caption><tr><th>${PRICE_CHART_COPY.tableDate}</th><th>${PRICE_CHART_COPY.tableValue}</th></tr>${rows.map((p) => `<tr><th>${new Intl.DateTimeFormat("fa-IR", { dateStyle: "long", timeZone: "Asia/Tehran" }).format(new Date(`${p.day}T12:00:00Z`))}</th><td>${amount(p.price)}</td></tr>`).join("")}</table></div>`;
  const h1 = PRICE_CHART_COPY.title(product);
  assert.deepEqual(scanPrices([{ path: "prices/chart/rebar-aj400.html", content: page(chart(s90), h1) }], priceInput), []);
  const bad = scanPrices([{ path: "prices/chart/rebar-aj400.html", content: page(chart([...s90.slice(0, -1), { ...s90.at(-1)!, price: s90.at(-1)!.price + 7 }]), h1) }], priceInput);
  assert.ok(bad.some((f) => f.kind === "price_gauge_not_allowed"));
});

test("indicator gate: each indicator carries the reference label, its source and its date, and only its own texts", () => {
  for (const locale of ["fa", "en", "ar"] as const) {
    const file = locale === "fa" ? "index.html" : `${locale}/market-indicators.html`;
    assert.deepEqual(scanIndicators([{ path: file, content: page(ALL.map((i) => cardHtml(locale, i)).join("")) }], indicatorInput), [], locale);
  }
  const usd = ALL[0];
  const noLabel = cardHtml("en", usd).replace(INDICATOR_COPY.en.reference, "");
  assert.deepEqual(scanIndicators([{ path: "en/market-indicators.html", content: page(noLabel) }], indicatorInput).map((f) => f.kind), ["indicator_label_missing"]);
  const noSource = cardHtml("fa", usd).replace(presentIndicator("fa", usd).source, "");
  assert.ok(scanIndicators([{ path: "index.html", content: page(noSource) }], indicatorInput).some((f) => f.match.includes("no source")));
  const advice = cardHtml("fa", usd, "<p>زمان خوبی برای خرید است</p>");
  assert.ok(scanIndicators([{ path: "index.html", content: page(advice) }], indicatorInput).some((f) => f.kind === "indicator_text_not_allowed"));
  const unknown = `<div data-aa-indicator="ime_billet">x</div>`;
  assert.deepEqual(scanIndicators([{ path: "index.html", content: page(unknown) }], indicatorInput).map((f) => f.kind), ["indicator_unknown"]);
  assert.deepEqual(scanIndicators([{ path: "en/index.html", content: page(driversHtml()) }], indicatorInput).map((f) => f.kind), ["indicator_line_not_allowed"]);
  const lineWithoutSources = driversHtml().replace(bareAttribution("fa", ALL[1].attributions.fa), "");
  assert.ok(scanIndicators([{ path: "index.html", content: page(lineWithoutSources) }], indicatorInput).some((f) => f.match.includes("no source of iron_ore_wb")));
});

test("indicator pages: an index value never trips a price rule (en: no glyph, no price; ar: values in indicator elements)", () => {
  const en = page(ALL.map((i) => cardHtml("en", i)).join(""));
  assert.deepEqual(scanPrices([{ path: "en/market-indicators.html", content: en }], priceInput), []);
  assert.ok(!/[▲▼]/.test(en), "en never shows ▲/▼");
  const ar = page(ALL.map((i) => cardHtml("ar", i)).join(""));
  assert.deepEqual(scanPrices([{ path: "ar/market-indicators.html", content: ar }], priceInput), []);
});

test("leak scan: the en/ar indicator copy is in the page language only (Arabic letters on ar, no Arabic script on en)", () => {
  const arCopy = [...Object.values(INDICATOR_COPY.ar).filter((v): v is string => typeof v === "string"), ...Object.values(MARKET_INDICATORS_COPY.ar).flatMap((v) => (typeof v === "string" ? [v] : typeof v === "object" ? [v.title, ...v.items] : [])), ...ALL.map((i) => cardHtml("ar", i))].join(" ");
  assert.deepEqual(scanPublicFile("ar/market-indicators.html", page(arCopy, MARKET_INDICATORS_COPY.ar.title)).filter((f) => f.kind !== "contact"), []);
  const enCopy = [...Object.values(INDICATOR_COPY.en).filter((v): v is string => typeof v === "string"), ...Object.values(MARKET_INDICATORS_COPY.en).flatMap((v) => (typeof v === "string" ? [v] : typeof v === "object" ? [v.title, ...v.items] : [])), ...ALL.map((i) => cardHtml("en", i))].join(" ");
  assert.deepEqual(scanPublicFile("en/market-indicators.html", page(enCopy, MARKET_INDICATORS_COPY.en.title)), []);
});

test("agent texts: the en indicators mirror may name the rate and show index values; every other en page still may not", () => {
  const md = "# Steel market indicators\n\n1,801,719 IRR per USD\n";
  assert.deepEqual(checkAgentTexts([{ path: "en/market-indicators.md", content: md }], pricing.rows), []);
  assert.ok(checkAgentTexts([{ path: "en/products.md", content: md }], pricing.rows).some((f) => /currency/.test(f)));
  const llms = buildLlmsTxt([
    { file: "prices.html", h1: "قیمت روز" },
    { file: "prices/rebar.html", h1: "قیمت میلگرد" },
    { file: "prices/chart/rebar-aj400.html", h1: "نمودار و روند قیمت میلگرد" },
    { file: "en/market-indicators.html", h1: "Steel market indicators" },
    { file: "ar/market-indicators.html", h1: "مؤشرات سوق الصلب" },
  ]);
  assert.match(llms, /## Price charts \(Persian only\)[\s\S]*\/prices\/chart\/rebar-aj400/);
  assert.match(llms, /\[Steel market indicators \(English\)\]\(https:\/\/www\.ahanassa\.com\/en\/market-indicators\)/);
  assert.doesNotMatch(llms, /chart prices \(Persian\)/, "a chart page is not listed as a family hub");
  assert.deepEqual(checkAgentTexts([{ path: "llms.txt", content: llms }], pricing.rows), []);
});

test("redirects: en/ar chart paths and the fa indicators path go to a page that exists in that language", () => {
  const rules = buildRedirectsFile([], ["rebar-aj400"]).split("\n");
  assert.ok(rules.includes("/en/prices/chart/rebar-aj400 /en/products 302"));
  assert.ok(rules.includes("/ar/prices/chart/rebar-aj400 /ar/prices 302"));
  assert.ok(rules.includes("/market-indicators /prices 302"));
  assert.ok(!rules.some((r) => r.startsWith("/prices/chart/") || r.startsWith("/en/market-indicators") || r.startsWith("/ar/market-indicators")), "the published pages themselves are never redirected");
});

test("JSON-LD: a Dataset (no value, no price) passes the publication gate and the offer rule on any page", () => {
  const url = "https://www.ahanassa.com/prices/chart/rebar-aj400";
  const ld = JSON.stringify(jsonLdGraph([datasetSchema({ url, name: "x", description: "y", temporalCoverage: "2026-07-11/2026-10-08", dateModified: "2026-10-08", variable: "v", unitText: "تومان/کیلوگرم", ownData: true }), datasetSchema({ url, id: "dataset-iron-ore-wb", name: "Iron ore", description: "d", temporalCoverage: "2025-09/2026-08", dateModified: "2026-08-01", variable: "Iron ore", unitText: "USD/dmtu", ownData: false, creditText: "World Bank", isBasedOn: "https://www.worldbank.org/" })]));
  const html = page(`<script type="application/ld+json">${ld}</script>`);
  assert.deepEqual(scanPublication([{ path: "prices/chart/rebar-aj400.html", content: html }], new Set()), []);
  assert.deepEqual(scanPrices([{ path: "en/market-indicators.html", content: html.replace("تومان/کیلوگرم", "x") }], priceInput), []);
  assert.doesNotMatch(ld, /"price"|"value"/);
});

test("analytics: the five W18.2 events carry tokens only; a chart page is a price page for the funnel", () => {
  assert.deepEqual(buildEvent("chart_to_rfq", { cta_location: "gauge", product_slug: "rebar-aj400", product_family: "REBAR" }), { event: "chart_to_rfq", cta_location: "gauge", product_slug: "rebar-aj400", product_family: "REBAR" });
  assert.deepEqual(buildEvent("gauge_view", { gauge_position: "low", gauge_window: "90", product_slug: "میلگرد" }), { event: "gauge_view", gauge_position: "low", gauge_window: "90" });
  assert.deepEqual(buildEvent("chart_range_change", { chart_range: "30", product_slug: "rebar-aj400" }), { event: "chart_range_change", chart_range: "30", product_slug: "rebar-aj400" });
  assert.deepEqual(buildEvent("indicator_page_view", { page_lang: "ar", indicator_count: 3 }), { event: "indicator_page_view", page_lang: "ar", indicator_count: 3 });
  assert.deepEqual(buildEvent("chart_view", { chart_type: "market_indicators" }), { event: "chart_view", chart_type: "market_indicators" });
  assert.equal(funnelPage("/prices/chart/rebar-aj400"), "price");
  assert.equal(funnelPage("/prices/chart/rebar-aj400.html"), "price");
});

test("wiring: the pages and components render the W18.2 surfaces where the owner asked, and nowhere else", () => {
  const src = (f: string) => fs.readFileSync(path.join(REPO, f), "utf8");
  const product = src("app/[locale]/products/[slug]/page.tsx");
  assert.match(product, /<PriceDecision[\s\S]*rfqHref=\{priceRfqHref\("fa", main\.xid, mainPrice\.factoryName\)\}/);
  // W18.3: en/ar get the same cards, linked to their market-indicators page (lib/og/share-images-w183.test.ts).
  assert.match(src("app/[locale]/page.tsx"), /locale === "fa" \? <HomeIndicators \/> : isMarketIndicatorsLocale\(locale\) && <MarketIndicatorStrip locale=\{locale\} \/>/);
  assert.match(src("app/[locale]/prices/page.tsx"), /<MarketIndicators locale=\{locale\} \/>[\s\S]*<ChartLinks locale=\{locale\} \/>/);
  assert.match(src("app/[locale]/prices/chart/[slug]/page.tsx"), /if \(params\.locale !== "fa"\) return \[\];/);
  assert.match(src("app/[locale]/market-indicators/page.tsx"), /MARKET_INDICATORS_LOCALES\.map/);
  assert.match(src("components/products/price-decision.tsx"), /TrackWhenVisible event="gauge_view"/);
  assert.match(src("components/prices/price-chart.tsx"), /TrackOnView event="chart_view"/);
  assert.match(src("components/prices/chart-range-toggle.tsx"), /trackEvent\("chart_range_change"/);
  assert.match(src("components/analytics/analytics-runtime.tsx"), /trackEvent\("chart_to_rfq"/);
  // Owner 2026-10-16: en/ar footer + export page link the indicators page (only when published); never the main nav.
  const footer = src("components/layout/SiteFooter.tsx");
  assert.match(footer, /hasIndicators && isMarketIndicatorsLocale\(locale\)[\s\S]*MARKET_INDICATORS_ROUTE[\s\S]*footerLink/);
  assert.match(src("app/[locale]/layout.tsx"), /hasIndicators=\{indicatorsPublished\}/);
  assert.match(src("app/[locale]/export/page.tsx"), /isMarketIndicatorsLocale\(locale\) && \(await listIndicators\(\)\)\.length > 0[\s\S]*MARKET_INDICATORS_ROUTE/);
  assert.doesNotMatch(src("lib/content/nav.ts"), /market-indicators|MARKET_INDICATORS/);
  assert.deepEqual([MARKET_INDICATORS_COPY.en.footerLink, MARKET_INDICATORS_COPY.ar.footerLink], ["Market indicators", "مؤشرات السوق"]);
  // Owner 2026-10-16: ar keeps the link to /ar/prices; the indicators page never renders an Ahan Asa price.
  const indicatorsPage = src("app/[locale]/market-indicators/page.tsx");
  assert.match(indicatorsPage, /PRICE_PAGE_ROUTE/);
  assert.doesNotMatch(indicatorsPage, /listProductPagePrices|loadPriceTableRows|PriceCellContent|presentPriceCell/);
  // Indicator colours stay neutral: no green/red tone on any indicator surface.
  for (const f of ["components/indicators/indicator-card.tsx", "components/indicators/indicator-section.tsx", "components/indicators/drivers-line.tsx", "components/products/price-gauge.tsx"]) assert.doesNotMatch(src(f), /success|danger|text-green|text-red|priceChangeToneClass/, f);
});
