import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";

/**
 * W10.4 (owner, 2026-10-11): the header's Ahan Asa mark and «آهن آسا» name
 * clearly larger, inside the unchanged white bar (72px mobile, 80px desktop,
 * 68px compact). The mark is the inline BrandMark SVG — the same polygons as
 * the favicon — and the 1024–1279 tier, where the full fa/ar nav leaves no
 * spare width, is never wider than the former 40px JPEG + 10px gap + 15px name.
 */
const ROOT = path.resolve(fileURLToPath(new URL(".", import.meta.url)), "../..");
const read = (p: string) => readFileSync(path.join(ROOT, p), "utf8");
const header = read("components/layout/SiteHeader.tsx");
const mark = read("components/layout/brand-mark.tsx");
const pts = (s: string) => s.trim().split(/\s+/).map((p) => p.split(",").map(Number));

test("BrandMark is the favicon's artwork: the same two polygons and colours, cropped to the mark", () => {
  const navy = mark.match(/BRAND_MARK_NAVY = "([^"]+)"/)![1];
  const copper = mark.match(/BRAND_MARK_COPPER = "([^"]+)"/)![1];
  assert.match(mark, /viewBox="5 15 90 70"/);
  assert.match(mark, /fill="#081A4A" points=\{BRAND_MARK_NAVY\}/);
  assert.match(mark, /fill="#C0572A" points=\{BRAND_MARK_COPPER\}/);
  // app/icon0.svg is the same mark with its 90-unit long side scaled onto the 100-unit canvas, centred.
  const icon = [...read("app/icon0.svg").matchAll(/points="([^"]+)"/g)].map((m) => pts(m[1]));
  const k = 100 / 90;
  for (const [src, fav] of [[pts(navy), icon[0]], [pts(copper), icon[1]]]) {
    assert.equal(src.length, fav.length);
    src.forEach(([x, y], i) => {
      assert.ok(Math.abs((x - 5) * k - fav[i][0]) < 0.01 && Math.abs((y - 15) * k + (100 - 70 * k) / 2 - fav[i][1]) < 0.01, `vertex ${i}`);
    });
  }
});

test("the header shows BrandMark, not the padded square JPEG, and the name on every width", () => {
  assert.match(header, /<BrandMark\b/);
  assert.ok(!/src="\/brand\/ahan-asa-mark\.jpg"/.test(header) && !/from "next\/image"/.test(header));
  const name = header.match(/<span className="([^"]+)">\{siteConfig\.name\}<\/span>/)![1];
  assert.ok(!/\bhidden\b/.test(name), "the name is visible on mobile too");
  assert.match(name, /text-\[19px\]/);
  assert.match(name, /lg:text-\[17px\]/);
  assert.match(name, /xl:text-\[21px\]/);
});

test("the white bar keeps its height: 72px mobile, 80px desktop, 68px compact", () => {
  assert.match(header, /"h-\[72px\] lg:h-20", scrolled && "lg:h-\[68px\]"/);
});

test("mark sizes per tier; the lg tier is never wider than the former logo", () => {
  assert.match(header, /w-\[42px\]/);
  assert.match(header, /scrolled \? "lg:w-\[33px\] xl:w-11" : "lg:w-9 xl:w-12"/);
  assert.match(header, /items-center gap-2 after:absolute after:-inset-0\.5 after:content-\[''\] lg:gap-1\.5 xl:gap-2\.5/);
  // «آهن آسا» at 17px measures 58.7px in the site font (15px: 51.8px) — headless Chrome, W10.4.
  const lg = { top: 36 + 6 + 58.7, compact: 33 + 6 + 58.7 };
  const former = { top: 40 + 10 + 51.8, compact: 36 + 10 + 51.8 };
  assert.ok(lg.top <= former.top && lg.compact <= former.compact);
});
