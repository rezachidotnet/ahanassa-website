import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { validatePricing, type PricingSource } from "../content-pipeline/pricing.ts";
import { validatePricingHistory, withPreviousDay } from "../content-pipeline/pricing-history.ts";
import { validateIndicators } from "../content-pipeline/indicators.ts";
import { buildSnapshot, readSnapshotFile } from "../static/snapshot-io.ts";
import { priceGateInput } from "../static/price-gate.ts";
import { indicatorGateInput } from "../static/indicator-gate.ts";
import { shareImageUrls } from "../static/artifact-gate.ts";
import { tehranDay } from "../pricing/price-history.ts";
import { chartSeries, chartShareLinks, chartShareText, PRICE_CHART_COPY } from "../pricing/price-charts.ts";
import { allowedIndicatorTexts, INDICATOR_COPY } from "../indicators/presentation.ts";
import { checkAgentTexts } from "../static/markdown-mirror.ts";
import { ANALYTICS_EVENTS, buildEvent, CHART_SHARE_ATTRIBUTE, chartShareParams, clickEventFor } from "../analytics/events.ts";
import { checkShareImage, indicatorSharePoints, indicatorsShareImage, priceChartShareImage, rtlText, SHARE_IMAGE_COPY, type ShareImage } from "./share-images.ts";
import { chartShareImagePath, indicatorsShareImagePath, SHARE_IMAGE_SIZE } from "./share-image-paths.ts";
import { writeShareImages } from "./write-share-images.ts";

/**
 * W18.3 — build-time share images (og:image) of the fa chart pages and the en/ar market indicators page, and the
 * chart pages' WhatsApp/Telegram share links. SYNTHETIC data only (fixtures/pricing, fixtures/indicators).
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
const ALL = [...indicatorGateInput(snapshot).indicators.values()];

const XID = "CVAR-000031";
const PRODUCT = "میلگرد آجدار A3 (Aj400)";
const SIZE = "Ø10";
const row = priceInput.rows.find((r) => r.canonical_variant_id === XID)!;
const DAY = tehranDay(row.published_at)!;
const SERIES = chartSeries(priceInput.history.get(XID)!, DAY);
const TOMAN = Math.round(row.price_irr_per_kg / 10);
const LOGO = `data:image/jpeg;base64,${fs.readFileSync(path.join(REPO, "public/brand/ahan-asa-mark-jpg-512w.jpg")).toString("base64")}`;
const faImage = (over: Partial<Parameters<typeof priceChartShareImage>[0]> = {}) => priceChartShareImage({ productName: PRODUCT, size: SIZE, tomanPerKg: TOMAN, day: DAY, series: SERIES, logoDataUri: LOGO, ...over });
const faCheck = { price: { xid: XID, rows: priceInput.rows, productName: PRODUCT, size: SIZE }, sourceNames: null };
const withText = (image: ShareImage, text: string, indicator: string | null = null): ShareImage => ({ ...image, texts: [...image.texts, { text, indicator }] });

test("fa chart image: product, size, the snapshot's price and day, the 90-day line — and nothing else passes the gate", () => {
  const image = faImage();
  assert.deepEqual(checkShareImage(image, "fa", faCheck), []);
  const texts = image.texts.map((t) => t.text);
  for (const t of [PRICE_CHART_COPY.title(PRODUCT), `${PRICE_CHART_COPY.referenceSize}: ${SIZE}`, SHARE_IMAGE_COPY.brand.fa, SHARE_IMAGE_COPY.domain]) assert.ok(texts.includes(t), t);
  assert.match(image.svg, /^<svg xmlns="http:\/\/www\.w3\.org\/2000\/svg" width="1200" height="630"/);
  assert.ok(image.svg.includes(`href="data:image/jpeg;base64,`), "the logo is embedded (no external fetch)");
  assert.ok(!/<script|https?:\/\/(?!www\.w3\.org)/.test(image.svg.replace(SHARE_IMAGE_COPY.domain, "")), "no script, no external URL");
});

test("fa chart image gate: another amount or day, a factory name or advice text fails", () => {
  const kinds = (image: ShareImage) => checkShareImage(image, "fa", faCheck).join("\n");
  assert.match(kinds(faImage({ tomanPerKg: TOMAN + 100 })), /drawn price is not the snapshot's/);
  assert.match(kinds(faImage({ day: "2026-01-01" })), /drawn date is not the snapshot price's day/);
  assert.match(kinds(withText(faImage(), "ذوب آهن اصفهان")), /text not allowed/);
  assert.match(kinds(withText(faImage(), "الان بخرید")), /text not allowed/);
  assert.match(checkShareImage(faImage(), "fa", { ...faCheck, price: { ...faCheck.price, xid: "CVAR-999999" } }).join(), /no snapshot price row/);
});

test("en/ar indicators images: reference label, every row's value, date and source; no Ahan Asa price, script rules hold", () => {
  for (const locale of ["en", "ar"] as const) {
    const image = indicatorsShareImage(locale, ALL, LOGO);
    assert.deepEqual(checkShareImage(image, locale, { indicators: ALL, sourceNames: null }), [], locale);
    const texts = image.texts.map((t) => t.text).join(" ");
    assert.ok(texts.includes(INDICATOR_COPY[locale].reference), "the «reference index — not an Ahan Asa selling price» label");
    assert.ok(!/تومان|Toman|toman/.test(texts), "no Ahan Asa price unit");
    assert.ok(!/[▲▼]/.test(texts), "no ▲/▼ (Estedad has no glyph; en never shows one)");
    assert.equal(new Set(image.texts.flatMap((t) => (t.indicator ? [t.indicator] : []))).size, ALL.length, "one row per indicator");
  }
  assert.ok(!/[؀-ۿ]/.test(indicatorsShareImage("en", ALL, LOGO).texts.map((t) => t.text).join(" ")), "en: no Arabic script");
  assert.ok(!/[پچژگیک]/.test(indicatorsShareImage("ar", ALL, LOGO).texts.map((t) => t.text).join(" ")), "ar: Arabic letters only");
});

test("en/ar indicators image gate: no label, a foreign row text, an unknown indicator or a missing source fails", () => {
  const en = indicatorsShareImage("en", ALL, LOGO);
  const check = { indicators: ALL, sourceNames: null };
  const noLabel: ShareImage = { ...en, texts: en.texts.filter((t) => t.text !== INDICATOR_COPY.en.reference) };
  assert.match(checkShareImage(noLabel, "en", check).join(), /no «reference index/);
  assert.match(checkShareImage(withText(en, "Good time to buy", ALL[0].code), "en", check).join(), /text not allowed/);
  assert.match(checkShareImage(withText(en, "Ahan Asa price 48,947"), "en", check).join(), /text not allowed/);
  assert.match(checkShareImage(withText(en, "x", "ime_billet"), "en", check).join(), /ime_billet is not in the snapshot/);
  const ar = indicatorsShareImage("ar", ALL, LOGO);
  const noSource: ShareImage = { ...ar, texts: ar.texts.filter((t) => !(t.indicator === ALL[1].code && t.text.startsWith(INDICATOR_COPY.ar.source))) };
  assert.match(checkShareImage(noSource, "ar", check).join(), /iron_ore_wb has no source/);
  assert.match(checkShareImage(withText(ar, "قیمت"), "ar", check).join(), /persian_on_ar/);
});

test("price-source names: a listed name in any drawn text fails, and the failure never repeats the name", () => {
  const names = ["example-market", "samplesteel.test"];
  for (const text of ["Example Market", "examplemarket", "SampleSteel.test"]) {
    const failures = checkShareImage(withText(faImage(), text), "fa", { ...faCheck, sourceNames: names });
    const line = failures.find((f) => f.includes("price source name"));
    assert.ok(line, text);
    assert.ok(!/example|sample/i.test(line!), "redacted to the list index");
  }
  assert.deepEqual(checkShareImage(faImage(), "fa", { ...faCheck, sourceNames: names }), []);
});

test("sparklines: the fa line is the chart page's 90-day series; a daily indicator 90 days, a monthly one 12 months", () => {
  const d = indicatorSharePoints(ALL.find((i) => i.frequency === "daily")!);
  assert.ok(d.points.every((p) => p.date >= d.from) && d.points.length > 30 && d.points.length <= 90);
  const m = indicatorSharePoints(ALL.find((i) => i.frequency === "monthly")!);
  assert.equal(m.points.length, 12);
  // The fa image draws exactly SERIES (one M + L per point in its line path).
  const linePath = /<path d="(M[^"]+)" fill="none"/.exec(faImage().svg)![1];
  assert.equal(linePath.match(/[ML]/g)!.length, SERIES.length);
});

test("rtlText: RLM at both ends, every Latin run isolated (resvg orders «(dmtu)», «CC BY 4.0» like a browser)", () => {
  assert.equal(rtlText("١٠٥٫٦ دولار (dmtu)"), "‏١٠٥٫٦ دولار (⁦dmtu⁩)‏");
  assert.equal(rtlText("رخصة CC BY 4.0"), "‏رخصة ⁦CC BY 4.0⁩‏");
  assert.equal(rtlText("انخفاض ٠٫٧٪"), "‏انخفاض ٠٫٧٪‏");
  assert.equal(rtlText("<&>"), "‏&lt;&amp;&gt;‏");
});

test("writeShareImages: 1200×630 PNG + WebP per chart page and per en/ar, byte-identical across runs; a gate failure writes nothing", async () => {
  const charts = [{ slug: "rebar-aj400", xid: XID, productName: PRODUCT, size: SIZE, tomanPerKg: TOMAN, day: DAY, series: SERIES }];
  const logoFile = path.join(REPO, "public/brand/ahan-asa-mark-jpg-512w.jpg");
  const run = async () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), "w183-"));
    const r = await writeShareImages(dir, { charts, indicators: ALL, snapshot, logoFile, sourceNames: null });
    return { dir, r };
  };
  const a = await run();
  const b = await run();
  assert.deepEqual(a.r.files.map((f) => f.path).sort(), [chartShareImagePath("rebar-aj400", "png"), chartShareImagePath("rebar-aj400", "webp"), indicatorsShareImagePath("ar", "png"), indicatorsShareImagePath("ar", "webp"), indicatorsShareImagePath("en", "png"), indicatorsShareImagePath("en", "webp")].sort());
  for (const f of a.r.files) {
    const bytes = fs.readFileSync(path.join(a.dir, f.path.slice(1)));
    assert.ok(bytes.equals(fs.readFileSync(path.join(b.dir, f.path.slice(1)))), `${f.path} is deterministic`);
    if (f.path.endsWith(".png")) {
      assert.equal(bytes.subarray(1, 4).toString(), "PNG");
      assert.equal(bytes.readUInt32BE(16), SHARE_IMAGE_SIZE.width);
      assert.equal(bytes.readUInt32BE(20), SHARE_IMAGE_SIZE.height);
    } else assert.equal(bytes.subarray(8, 12).toString(), "WEBP");
    assert.ok(f.bytes < 300_000, `${f.path}: ${f.bytes} B`);
  }
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "w183-"));
  await assert.rejects(writeShareImages(dir, { charts: [{ ...charts[0], tomanPerKg: TOMAN + 1 }], indicators: ALL, snapshot, logoFile, sourceNames: null }), /share image gate/);
  assert.deepEqual(fs.readdirSync(dir), [], "nothing written");
  // No indicators in the snapshot: no en/ar image.
  const none = await writeShareImages(fs.mkdtempSync(path.join(os.tmpdir(), "w183-")), { charts: [], indicators: [], snapshot, logoFile, sourceNames: null });
  assert.deepEqual(none.files, []);
});

test("share links: plain wa.me / t.me URLs with the title and URL only (strictly encoded), no price", () => {
  const url = "https://www.ahanassa.com/prices/chart/rebar-aj400";
  const title = PRICE_CHART_COPY.title(PRODUCT);
  const links = chartShareLinks(url, title);
  assert.ok(links.whatsapp.startsWith("https://wa.me/?text="));
  assert.ok(links.telegram.startsWith("https://t.me/share/url?url="));
  assert.equal(decodeURIComponent(links.whatsapp.slice("https://wa.me/?text=".length)), `${title}\n${url}`);
  const tg = new URL(links.telegram);
  assert.equal(tg.searchParams.get("url"), url);
  assert.equal(tg.searchParams.get("text"), title);
  for (const href of Object.values(links)) assert.ok(!/[()!'*\s]/.test(href), `${href}: no bare ( ) — the Markdown mirror's link would end early`);
  assert.ok(!Object.values(links).some((h) => decodeURIComponent(h).includes(String(TOMAN))), "no price in a share text");
});

test("chart_share: its own event (share_method + product_slug), sent instead of whatsapp_click", () => {
  assert.deepEqual(ANALYTICS_EVENTS.chart_share, ["share_method", "product_slug"]);
  assert.deepEqual(chartShareParams("whatsapp", "rebar-aj400"), { share_method: "whatsapp", product_slug: "rebar-aj400" });
  assert.deepEqual(chartShareParams("telegram", null), { share_method: "telegram" });
  assert.equal(chartShareParams("email", "x"), null);
  assert.equal(chartShareParams(null, "x"), null);
  assert.deepEqual(buildEvent("chart_share", { share_method: "telegram", product_slug: "rebar-aj400" }), { event: "chart_share", share_method: "telegram", product_slug: "rebar-aj400" });
  // A share link is a wa.me link: the runtime must check the share mark first.
  assert.equal(clickEventFor(chartShareLinks("https://www.ahanassa.com/x", "t").whatsapp), "whatsapp_click");
  const runtime = fs.readFileSync(path.join(REPO, "components/analytics/analytics-runtime.tsx"), "utf8");
  const handler = runtime.slice(runtime.indexOf("const onClick"));
  assert.ok(handler.indexOf('trackEvent("chart_share"') < handler.indexOf("clickEventFor("), "chart_share is decided before whatsapp_click");
  assert.match(handler, /trackEvent\("chart_share", share\);\n\s*return;/);
  const share = fs.readFileSync(path.join(REPO, "components/prices/chart-share.tsx"), "utf8");
  assert.ok(!share.includes('"use client"'), "server-rendered links, no client component");
  assert.ok(share.includes("CHART_SHARE_ATTRIBUTE") && CHART_SHARE_ATTRIBUTE === "data-chart-share");
  const gtm = fs.readFileSync(path.join(REPO, "docs/analytics/GTM_SETUP.md"), "utf8");
  assert.ok(gtm.includes("| `GA4 - chart_share` | `chart_share` |") && gtm.includes("| `DLV - share_method` | `share_method` |"));
});

test("pages: og:image/twitter:image name the share image (alt without a price); the artifact gate checks it exists", () => {
  const chart = fs.readFileSync(path.join(REPO, "app/[locale]/prices/chart/[slug]/page.tsx"), "utf8");
  assert.match(chart, /image: \{ url: `\$\{siteConfig\.baseUrl\}\$\{chartShareImagePath\(slug, "png"\)\}`, \.\.\.SHARE_IMAGE_SIZE, alt: PRICE_CHART_COPY\.title\(chart\.product\.productName\) \}/);
  assert.match(chart, /<ChartShare slug=\{slug\} url=\{url\} title=\{t\.title\(product\.productName\)\} \/>/);
  const indicatorsPage = fs.readFileSync(path.join(REPO, "app/[locale]/market-indicators/page.tsx"), "utf8");
  assert.match(indicatorsPage, /image: \{ url: `\$\{siteConfig\.baseUrl\}\$\{indicatorsShareImagePath\(locale, "png"\)\}`, \.\.\.SHARE_IMAGE_SIZE, alt: t\.title \}/);
  const head = `<meta property="og:image" content="https://www.ahanassa.com/images/og/prices-chart/a.png"/><meta property="og:image:width" content="1200"/><meta name="twitter:image" content="https://www.ahanassa.com/images/og/prices-chart/a.png"/>`;
  assert.deepEqual(shareImageUrls(head), ["https://www.ahanassa.com/images/og/prices-chart/a.png", "https://www.ahanassa.com/images/og/prices-chart/a.png"]);
  const gate = fs.readFileSync(path.join(REPO, "lib/static/artifact-gate.ts"), "utf8");
  assert.match(gate, /share image not in the artifact/);
  const build = fs.readFileSync(path.join(REPO, "scripts/static/build.ts"), "utf8");
  assert.match(build, /writeShareImages\(publicDir, \{ charts: chartShares, indicators: shareIndicators, snapshot, .*sourceNames: loadSourceNames\(\) \}\)/);
});

test("Bale: no web share URL, so «کپی لینک برای بله» copies the title + link, shows «لینک کپی شد» and sends chart_share (bale)", () => {
  assert.deepEqual(chartShareParams("bale", "rebar-aj400"), { share_method: "bale", product_slug: "rebar-aj400" });
  assert.equal(PRICE_CHART_COPY.shareBale, "کپی لینک برای بله");
  assert.equal(PRICE_CHART_COPY.linkCopied, "لینک کپی شد");
  const url = "https://www.ahanassa.com/prices/chart/rebar-aj400";
  const title = PRICE_CHART_COPY.title(PRODUCT);
  // The same text as the WhatsApp share: title + URL, never a price.
  assert.equal(chartShareText(url, title), `${title}\n${url}`);
  assert.equal(decodeURIComponent(chartShareLinks(url, title).whatsapp.slice("https://wa.me/?text=".length)), chartShareText(url, title));
  const copy = fs.readFileSync(path.join(REPO, "components/prices/chart-copy-link.tsx"), "utf8");
  assert.ok(copy.startsWith('"use client"'));
  assert.match(copy, /\[CHART_SHARE_ATTRIBUTE\]: "bale"/);
  assert.match(copy, /trackEvent\("chart_share", share\)/);
  assert.match(copy, /navigator\.clipboard\.writeText/);
  // The toast: a live region always in the DOM, fixed when shown (no layout shift).
  assert.match(copy, /role="status" className=\{cn\("bg-navy pointer-events-none fixed [^"]*", copied \? "opacity-100" : "opacity-0"\)\}/);
  assert.doesNotMatch(copy, /<a\b/, "a button, not a link: the click listener's link path never sees it");
  const share = fs.readFileSync(path.join(REPO, "components/prices/chart-share.tsx"), "utf8");
  assert.match(share, /<ChartCopyLink slug=\{slug\} text=\{chartShareText\(url, title\)\} label=\{t\.shareBale\} copiedLabel=\{t\.linkCopied\}/);
  const gtm = fs.readFileSync(path.join(REPO, "docs/analytics/GTM_SETUP.md"), "utf8");
  assert.match(gtm, /`share_method`: `whatsapp` \/ `telegram` \/ `bale`/);
});

test("en/ar indicator strip: home (under the hero), /export, /ar/prices; every card links to the locale's market-indicators page", () => {
  const src = (f: string) => fs.readFileSync(path.join(REPO, f), "utf8");
  assert.match(src("app/[locale]/page.tsx"), /<PriceStrip [^\n]*\/>\n[^\n]*\n[^\n]*\n\s*\{locale === "fa" \? <HomeIndicators \/> : isMarketIndicatorsLocale\(locale\) && <MarketIndicatorStrip locale=\{locale\} \/>\}/);
  assert.match(src("app/[locale]/export/page.tsx"), /isMarketIndicatorsLocale\(locale\) && <MarketIndicatorStrip locale=\{locale\} headingId="export-indicators-heading" \/>/);
  assert.match(src("app/[locale]/prices/page.tsx"), /return <IndicatorStrip locale="ar" indicators=\{indicators\} link=\{\{ href: localizedPath\("ar", MARKET_INDICATORS_ROUTE\), label: MARKET_INDICATORS_COPY\.ar\.title \}\} \/>/);
  const strip = src("components/indicators/market-indicator-strip.tsx");
  assert.match(strip, /link=\{\{ href: localizedPath\(locale, MARKET_INDICATORS_ROUTE\), label: MARKET_INDICATORS_COPY\[locale\]\.title \}\}/);
  assert.match(strip, /locale: MarketIndicatorsLocale/, "en/ar only: fa has no market-indicators page");
  const card = src("components/indicators/indicator-card.tsx");
  // The name is the (stretched) link: no new visible text, so the indicator gate's allow-list is unchanged.
  assert.match(card, /<Link href=\{href\} className="[^"]*after:absolute after:inset-0[^"]*">\n\s*\{v\.name\}\n\s*<\/Link>/);
  assert.match(card, /className="hover:text-navy relative z-10 underline/, "the source link stays clickable above the stretched link");
  assert.doesNotMatch(card, /success|danger|text-green|text-red/);
  // en: never a glyph, the change reads +/−; the reference label is the owner's text.
  assert.equal(INDICATOR_COPY.en.reference, "Reference index — not an Ahan Asa selling price");
  assert.equal(INDICATOR_COPY.ar.reference, "مؤشر مرجعي — ليس سعر بيع لدى آهن آسا");
});

test("agent texts: the en strip's own «IRR per USD» is not a currency mention; any other currency word, or a price amount, still is", () => {
  const texts = ALL.flatMap((i) => allowedIndicatorTexts("en", i));
  const usd = ALL.find((i) => i.code === "usd_irr_official_cbi");
  assert.ok(usd && texts.some((t) => t.includes("IRR")), "the fixture's USD/IRR unit names the currency");
  const strip = `- [${usd.names.en}](https://www.ahanassa.com/en/market-indicators) ${INDICATOR_COPY.en.reference} 1,801,719 IRR per USD Date: 7 Oct 2026\n`;
  assert.ok(checkAgentTexts([{ path: "en.md", content: strip }], []).some((f) => /currency/.test(f)), "without the indicator texts it fails");
  assert.deepEqual(checkAgentTexts([{ path: "en.md", content: strip }, { path: "en/export.md", content: strip }], [], texts), []);
  assert.ok(checkAgentTexts([{ path: "en.md", content: `${strip}Rebar from 50,000 rials\n` }], [], texts).some((f) => /currency/.test(f)));
  assert.ok(checkAgentTexts([{ path: "en.md", content: `${strip}Rebar 480,000 today\n` }], [{ price_irr_per_kg: 480_000, factory_name_fa: "x", location_fa: "y" }], texts).some((f) => /price amount/.test(f)));
  // ar is not an en page: the strip texts change nothing there.
  assert.deepEqual(checkAgentTexts([{ path: "ar.md", content: strip }], [], texts), []);
});
