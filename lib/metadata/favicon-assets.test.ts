import { test } from "node:test";
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { existsSync, readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";

/**
 * W10.2 favicon set (owner decision 2026-10-08): the logo MARK only, cropped
 * tight (~5% padding on its long side), transparent, original colours; the
 * apple-touch icon on white at ~80%. Served through vinext's file-based
 * metadata (hashed `?<hash>` links); the manifest's own icon URLs carry a
 * `?v=` content hash that must match the files.
 */
const ROOT = path.resolve(fileURLToPath(new URL(".", import.meta.url)), "../..");
const file = (p: string) => readFileSync(path.join(ROOT, p));

/** PNG IHDR: width, height, colour type (6 = RGBA). */
function pngInfo(buf: Buffer) {
  assert.equal(buf.subarray(1, 4).toString("latin1"), "PNG");
  return { width: buf.readUInt32BE(16), height: buf.readUInt32BE(20), colorType: buf[25] };
}

test("the 4500px JPEG favicon is gone; svg, 32px png, ico and apple icon exist", () => {
  assert.ok(!existsSync(path.join(ROOT, "app/icon.jpg")));
  for (const p of ["app/icon0.svg", "app/icon1.png", "app/favicon.ico", "app/apple-icon.png", "app/manifest.webmanifest", "public/icons/icon-192.png", "public/icons/icon-512.png"]) {
    assert.ok(existsSync(path.join(ROOT, p)), p);
  }
});

test("favicon.svg: the two mark polygons only — original navy and copper, no text, no background", () => {
  const svg = file("app/icon0.svg").toString("utf8");
  assert.match(svg, /viewBox="0 0 100 100"/);
  assert.equal((svg.match(/<polygon /g) ?? []).length, 2);
  assert.match(svg, /fill="#081A4A"/);
  assert.match(svg, /fill="#C0572A"/);
  assert.ok(!/<text|<rect|<image/.test(svg), "mark only: no wordmark, no background, no embedded raster");
  // Tight crop: the mark's long side spans 90% of the canvas (5% padding each side).
  const xs = [...svg.matchAll(/(-?[\d.]+),(-?[\d.]+)/g)].map((m) => Number(m[1]));
  assert.equal(Math.min(...xs), 5);
  assert.equal(Math.max(...xs), 95);
});

test("PNG sizes and backgrounds: transparent 32/192/512, white 180 apple-touch icon", () => {
  for (const [p, size] of [["app/icon1.png", 32], ["public/icons/icon-192.png", 192], ["public/icons/icon-512.png", 512]] as const) {
    const info = pngInfo(file(p));
    assert.deepEqual([info.width, info.height], [size, size], p);
    assert.equal(info.colorType, 6, `${p} must be RGBA (transparent background)`);
  }
  const apple = pngInfo(file("app/apple-icon.png"));
  assert.deepEqual([apple.width, apple.height], [180, 180]);
  assert.notEqual(apple.colorType, 6, "iOS fills transparency with black: the apple icon is opaque (white)");
});

test("favicon.ico carries 16, 32 and 48", () => {
  const ico = file("app/favicon.ico");
  assert.equal(ico.readUInt16LE(2), 1, "ICO type");
  const n = ico.readUInt16LE(4);
  const sizes = Array.from({ length: n }, (_, i) => ico[6 + i * 16] || 256).sort((a, b) => a - b);
  assert.deepEqual(sizes, [16, 32, 48]);
});

test("manifest icon URLs carry the content hash of the files they point at (cache-busting)", () => {
  const manifest = JSON.parse(file("app/manifest.webmanifest").toString("utf8")) as { icons: { src: string; sizes: string }[] };
  assert.equal(manifest.icons.length, 2);
  for (const icon of manifest.icons) {
    const [p, query] = icon.src.split("?v=");
    const hash = createHash("sha256").update(file(`public${p}`)).digest("hex").slice(0, 12);
    assert.equal(query, hash, `${icon.src}: update the ?v= hash after regenerating the icon`);
  }
});
