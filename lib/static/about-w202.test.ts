import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { ABOUT_EVENTS_ANCHOR, ABOUT_EVENTS_COPY, EXPO_1405, EXPO_1405_MEDIA, EXPO_MILESTONE, GROUP_STATEMENT_COPY } from "../content/about-events.ts";
import { isPlausibleIranCoordinate, OFFICE_COORDINATES, OFFICE_MAP_COPY, osmEmbedUrl, ROUTE_APPS, routeUrl } from "../content/office-locations.ts";
import { ABOUT_COPY } from "../content/about.ts";
import { GROUP_COMPANIES } from "../content/company.ts";
import { OPTIMIZED_IMAGE_SOURCES } from "../media/image-sources.ts";
import { IMAGE_VARIANTS } from "../media/image-variants.generated.ts";
import { buildCspReportOnly } from "../security/headers.ts";
import { eventSchema } from "../seo/schema.ts";
import { scanPublicFile } from "./leak-scan.ts";
import { locales } from "../../config/locales.ts";

/** W20.2 — /about: «رویدادها» (Isfahan Buildexpo 1405), office maps, «گروه ما», «مسیر ما». */

const REPO = path.resolve(import.meta.dirname, "../..");
const read = (f: string) => fs.readFileSync(path.join(REPO, f), "utf8");
const code = (f: string) => read(f).replace(/\/\*[\s\S]*?\*\//g, "").replace(/\/\/.*$/gm, "");

function strings(value: unknown): string[] {
  if (typeof value === "string") return [value];
  if (typeof value === "function") return [String((value as (n: number) => string)(1405))];
  if (value && typeof value === "object") return Object.values(value).flatMap(strings);
  return [];
}
function languageFindings(locale: "en" | "ar", texts: string[]) {
  return scanPublicFile(`${locale}/w202-copy.html`, `<p>${texts.join(" | ")}</p>`).filter((f) => f.kind === "persian_on_ar" || f.kind === "persian_on_en");
}

// --- 1. The event ------------------------------------------------------------------------------------

test("expo: the owner's facts — name, 29 Sep–2 Oct 2026 = 7–10 Mehr 1405, Isfahan International Exhibition Center", () => {
  assert.equal(EXPO_1405.name.en, "29th Isfahan Building Industry Exhibition (Isfahan Buildexpo 1405)");
  assert.equal(EXPO_1405.startDate, "2026-09-29");
  assert.equal(EXPO_1405.endDate, "2026-10-02");
  assert.equal(EXPO_1405.dates.fa, "۷ تا ۱۰ مهر ۱۴۰۵");
  assert.equal(EXPO_1405.venue.en, "Isfahan International Exhibition Center");
  for (const l of locales) assert.ok(!strings(ABOUT_EVENTS_COPY[l]).some((s) => /جایزه|award|جائزة|برنده|winner|\d+\s*(visitors|بازدید)/i.test(s)), `${l}: no award or visitor claim was supplied`);
  assert.deepEqual(languageFindings("ar", [...strings(ABOUT_EVENTS_COPY.ar), ...strings(EXPO_1405.name.ar), EXPO_1405.venue.ar, EXPO_1405.dates.ar, ...strings(EXPO_MILESTONE.ar), ...strings(GROUP_STATEMENT_COPY.ar), ...strings(OFFICE_MAP_COPY.ar)]), []);
  assert.deepEqual(languageFindings("en", [...strings(ABOUT_EVENTS_COPY.en), EXPO_1405.name.en, EXPO_1405.venue.en, ...strings(EXPO_MILESTONE.en), ...strings(GROUP_STATEMENT_COPY.en), ...strings(OFFICE_MAP_COPY.en)]), []);
});

test("expo images: through the image pipeline (gallery), alt text in every locale, no phone number left on the poster", async () => {
  for (const key of ["poster", "closing"] as const) {
    const src = EXPO_1405_MEDIA[key].src;
    assert.equal(OPTIMIZED_IMAGE_SOURCES[src], "gallery", src);
    assert.ok(IMAGE_VARIANTS[src], `${src}: variants generated`);
    assert.equal(IMAGE_VARIANTS[src].width, EXPO_1405_MEDIA[key].width);
    assert.equal(IMAGE_VARIANTS[src].height, EXPO_1405_MEDIA[key].height);
  }
  assert.equal(OPTIMIZED_IMAGE_SOURCES[EXPO_1405_MEDIA.video.posterFrame], "gallery");
  for (const l of locales) for (const k of ["posterAlt", "closingAlt"] as const) assert.ok(ABOUT_EVENTS_COPY[l][k].length > 20, `${l} ${k}`);
  // The organiser's phone row (y 1129–1160, x 212–445 of the 884×1280 original) is now plain background: no dark text pixels.
  const sharp = (await import("sharp")).default as unknown as (file: string) => { extract(r: object): { greyscale(): { raw(): { toBuffer(): Promise<Buffer> } } } };
  const px = await sharp(path.join(REPO, "public/_originals/images/about/expo-1405-poster.jpg")).extract({ left: 212, top: 1129, width: 234, height: 32 }).greyscale().raw().toBuffer();
  assert.equal([...px].filter((v) => v < 120).length, 0, "no glyph or icon pixels where the phone row was");
});

test("expo video: H.264 MP4 ≤ 8 MB, faststart, click-to-play with controls, preload none, no autoplay, sized box", () => {
  const file = path.join(REPO, "public", EXPO_1405_MEDIA.video.src);
  const bytes = fs.readFileSync(file);
  assert.ok(bytes.length <= 8 * 1024 * 1024, `${bytes.length} B`);
  assert.ok(bytes.includes(Buffer.from("avc1")), "H.264 (avc1) video track");
  assert.ok(bytes.indexOf(Buffer.from("moov")) < bytes.indexOf(Buffer.from("mdat")), "moov before mdat (faststart)");
  const component = code("components/about/expo-event.tsx");
  assert.match(component, /<video\s+controls\s+preload="none"\s+playsInline/);
  assert.ok(!/autoPlay|autoplay|<track/.test(component), "no autoplay, no caption track");
  assert.match(component, /poster=\{variantPath\(video\.posterFrame, 640, "webp"\)\}/);
  assert.match(component, /aspect-\[9\/16\]/);
});

test("expo JSON-LD: a past offline Event with the real dates and venue, Ahan Assa as attendee", () => {
  const node = eventSchema({ id: "https://x/about#expo-1405", name: EXPO_1405.name.en, description: ABOUT_EVENTS_COPY.en.description, startDate: EXPO_1405.startDate, endDate: EXPO_1405.endDate, venue: EXPO_1405.venue.en, locality: "Isfahan", image: "https://x/p.webp" });
  assert.equal(node["@type"], "Event");
  assert.equal(node.startDate, "2026-09-29");
  assert.equal(node.endDate, "2026-10-02");
  assert.equal(node.eventAttendanceMode, "https://schema.org/OfflineEventAttendanceMode");
  assert.deepEqual(node.location.address, { "@type": "PostalAddress", addressLocality: "Isfahan", addressCountry: "IR" });
  assert.ok(!("organizer" in node) && !("offers" in node));
  assert.match(code("app/[locale]/about/page.tsx"), /<JsonLd\s+data=\{jsonLdGraph\(\[\s*eventSchema\(/);
});

// --- 2. Office maps ----------------------------------------------------------------------------------

test("office coordinates: exactly the owner's, inside Iran; OSM embed and four route links built from them only", () => {
  assert.deepEqual(OFFICE_COORDINATES, { head: { lat: 32.593888, lng: 51.669859 }, tehran: { lat: 35.720067, lng: 51.357633 } });
  for (const c of Object.values(OFFICE_COORDINATES)) assert.ok(c && isPlausibleIranCoordinate(c));
  const head = OFFICE_COORDINATES.head!;
  assert.equal(osmEmbedUrl(head), "https://www.openstreetmap.org/export/embed.html?bbox=51.664859%2C32.588888%2C51.674859%2C32.598888&layer=mapnik&marker=32.593888%2C51.669859");
  assert.deepEqual(ROUTE_APPS, ["neshan", "balad", "google", "waze"]);
  assert.equal(routeUrl("google", head), "https://www.google.com/maps/dir/?api=1&destination=32.593888%2C51.669859");
  assert.equal(routeUrl("waze", head), "https://waze.com/ul?ll=32.593888%2C51.669859&navigate=yes");
  for (const app of ROUTE_APPS) assert.match(routeUrl(app, head), /32\.593888.*51\.669859/, app);
  assert.deepEqual(Object.values(OFFICE_MAP_COPY.fa.apps), ["نشان", "بلد", "Google Maps", "Waze"]);
});

test("office map: click-to-load facade (no iframe until the click), OSM attribution, new-tab links, CSP frame-src: OSM + the live chat's Odoo origin only", () => {
  const map = code("components/about/office-map.tsx");
  assert.match(map, /\{loaded \? \(\s*<iframe/, "the iframe exists only after the click");
  assert.match(map, /useState\(false\)/);
  assert.match(map, /\{t\.attribution\}/);
  assert.ok(!/<img|background-image:\s*url|tile\.openstreetmap/.test(map), "the facade loads nothing from a third party");
  assert.equal((map.match(/rel="noopener noreferrer"/g) ?? []).length, 3);
  assert.match(map, /aspect-video/, "same box before and after loading");
  // W21.3: live chat is ON (config/livechat.ts), so the shipped frame-src is exactly OSM + https://odoo.ahanassa.com
  // (besides 'self' and Turnstile); with live chat off it is OSM only.
  assert.match(buildCspReportOnly(), /frame-src 'self' https:\/\/challenges\.cloudflare\.com https:\/\/www\.openstreetmap\.org https:\/\/odoo\.ahanassa\.com(;|$)/);
  assert.match(buildCspReportOnly([], null), /frame-src 'self' https:\/\/challenges\.cloudflare\.com https:\/\/www\.openstreetmap\.org(;|$)/);
});

// --- 3/4. Group and timeline -------------------------------------------------------------------------

test("group: statement and facts derived from company.ts (5 companies, since 1376); parent spans two columns", () => {
  assert.equal(GROUP_COMPANIES.length, 5);
  assert.equal(Math.min(...GROUP_COMPANIES.map((c) => c.sinceSolar)), 1376);
  assert.equal(GROUP_STATEMENT_COPY.fa.companies(5), "۵ شرکت");
  assert.equal(GROUP_STATEMENT_COPY.fa.since(1376), "فعال از ۱۳۷۶");
  assert.equal(GROUP_STATEMENT_COPY.en.since(1376), "Active since 1376 SH (1997)");
  const page = code("app/[locale]/about/page.tsx");
  assert.match(page, /statement\.companies\(GROUP_COMPANIES\.length\)/);
  assert.match(page, /statement\.since\(groupSince\)/);
  assert.match(page, /c\.url === PARENT_ORGANIZATION\.url && "sm:col-span-2"/);
});

test("timeline: the seven approved milestones, then the 1405 exhibition last, linking to the events section", () => {
  const page = code("app/[locale]/about/page.tsx");
  assert.match(page, /\[\.\.\.t\.timeline, \{ \.\.\.EXPO_MILESTONE\[locale\], href: `#\$\{ABOUT_EVENTS_ANCHOR\}`/);
  assert.equal(ABOUT_EVENTS_ANCHOR, "events");
  for (const l of locales) {
    assert.equal(ABOUT_COPY[l].timeline.length, 7);
    assert.ok(EXPO_MILESTONE[l].year.includes(l === "fa" ? "۱۴۰۵" : "1405"));
  }
  const tl = code("components/about/about-timeline.tsx");
  assert.match(tl, /<ol/);
  assert.match(tl, /lg:grid-cols-2/, "alternating on desktop");
  assert.match(tl, /before:start-\[6px\]/, "vertical line at the reading start on phones (logical, so RTL and LTR)");
  assert.ok(!/animate-|transition/.test(tl), "no motion");
});

test("expo video HLS (Safari: no byte ranges on Workers Static Assets): VOD playlist of fMP4 segments that all exist, listed before the MP4", () => {
  const dir = path.join(REPO, "public", path.dirname(EXPO_1405_MEDIA.video.hls));
  const playlist = fs.readFileSync(path.join(REPO, "public", EXPO_1405_MEDIA.video.hls), "utf8");
  assert.match(playlist, /^#EXTM3U/);
  assert.match(playlist, /#EXT-X-PLAYLIST-TYPE:VOD/);
  assert.match(playlist, /#EXT-X-ENDLIST/);
  const files = [...playlist.matchAll(/^(?!#)(\S+)$/gm)].map((m) => m[1]).concat([...playlist.matchAll(/URI="([^"]+)"/g)].map((m) => m[1]));
  assert.ok(files.length >= 2);
  for (const f of files) {
    assert.match(f, /^[a-z0-9-]+\.(m4s|mp4)$/, `${f}: relative fMP4 file, never .ts (TypeScript tooling)`);
    assert.ok(fs.existsSync(path.join(dir, f)), f);
  }
  assert.deepEqual(fs.readdirSync(dir).sort(), [...files, "index.m3u8"].sort(), "no stray file");
  const sum = fs.readdirSync(dir).reduce((n, f) => n + fs.statSync(path.join(dir, f)).size, 0);
  assert.ok(sum <= 8 * 1024 * 1024, `HLS total ${sum} B`);
  assert.match(code("components/about/expo-event.tsx"), /<source src=\{video\.hls\} type=\{video\.hlsType\} \/>\s*<source src=\{video\.src\} type=\{video\.type\} \/>/);
});
