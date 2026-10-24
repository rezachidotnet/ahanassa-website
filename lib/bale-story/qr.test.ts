import { test } from "node:test";
import assert from "node:assert/strict";
import { encodeQr, qrSvg } from "./qr.ts";

/**
 * The reference matrix: `qrencode -l M -8 -m 0` 4.1.1 (libqrencode) for a version-7 story URL (version 7+ carries the
 * version information block), one hex row per module row, 45 modules wide.
 */
const URL = "https://www.ahanassa.com/raw-materials/iron-ore?utm_source=bale&utm_medium=story&utm_campaign=iron-ore-concentrate";
const REFERENCE = [
  "1fcb320bc17f",
  "1047861c1a41",
  "1750cf339a5d",
  "1753ed68a35d",
  "175001fad75d",
  "1053e91cb841",
  "1fd55555557f",
  "001ac3137100",
  "17c67bf8a47c",
  "122b36b1e31f",
  "07f95a56b7e6",
  "0b85cc3f5f3c",
  "1c7e3ed8a081",
  "1bafe04be39f",
  "136505fa365c",
  "1118726b52f5",
  "03c78caaea83",
  "1aaef068e3a9",
  "07c7237f0e8e",
  "00b89c2952fc",
  "09f2cff023f3",
  "11144118fb1f",
  "075ed7543f56",
  "1315bd1df11e",
  "0bf377f447f8",
  "04aaff69e24d",
  "19f55d86370e",
  "1d1650fdda7d",
  "1ed9c82ccc58",
  "07218dead04d",
  "0576ae9c3f22",
  "1c825f299f6f",
  "0a6b3b0020fa",
  "0ca9ebebd301",
  "017849b635be",
  "0f0e0139d7ee",
  "134797f8e1f8",
  "0019e511731d",
  "1fcea3518f56",
  "105cf311931e",
  "1753b9fca7fb",
  "175b1bb8e8d7",
  "17567826afc2",
  "1040c581978c",
  "1fdddafc2642",
];

const refMatrix = () => REFERENCE.map((hex) => [...BigInt(`0x${hex}`).toString(2).padStart(45, "0")].map((b) => b === "1"));

/** The mask a matrix uses, read back from its second format-information copy. */
function maskOf(m: boolean[][]): number {
  const n = m.length;
  let f = 0;
  for (let i = 0; i < 8; i++) if (m[8][n - 1 - i]) f |= 1 << i;
  for (let i = 8; i < 15; i++) if (m[n - 15 + i][8]) f |= 1 << i;
  return ((f ^ 0x5412) >> 10) & 7;
}

test("QR: identical to the reference encoder's matrix (same mask), version 7, level M", () => {
  const ref = refMatrix();
  const mask = maskOf(ref);
  const qr = encodeQr(URL, { mask });
  assert.equal(qr.version, 7);
  assert.equal(qr.modules.length, 45);
  assert.deepEqual(qr.modules, ref);
});

test("QR: the chosen mask is written into both format-information copies", () => {
  const qr = encodeQr(URL);
  assert.equal(maskOf(qr.modules), qr.mask);
  const n = qr.modules.length;
  // First copy (around the top-left finder) equals the second.
  let a = 0;
  for (let i = 0; i <= 5; i++) if (qr.modules[i][8]) a |= 1 << i;
  if (qr.modules[7][8]) a |= 1 << 6;
  if (qr.modules[8][8]) a |= 1 << 7;
  if (qr.modules[8][7]) a |= 1 << 8;
  for (let i = 9; i < 15; i++) if (qr.modules[8][14 - i]) a |= 1 << i;
  assert.equal(((a ^ 0x5412) >> 10) & 7, qr.mask);
  assert.equal(qr.modules[n - 8][8], true, "dark module");
});

test("QR: smallest version that fits; too long is refused", () => {
  assert.equal(encodeQr("hi").version, 1);
  assert.equal(encodeQr("a".repeat(14)).version, 1);
  assert.equal(encodeQr("a".repeat(15)).version, 2);
  assert.equal(encodeQr("a".repeat(213)).version, 10);
  assert.throws(() => encodeQr("a".repeat(214)), /do not fit/);
});

test("QR SVG: a 4-module quiet zone around the modules", () => {
  const qr = encodeQr("https://www.ahanassa.com/request");
  const { size, svg } = qrSvg(qr, 10, 20, 5);
  assert.equal(size, (qr.modules.length + 8) * 5);
  assert.match(svg, /^<rect x="10" y="20"/);
  assert.match(svg, /M30 40h5v5h-5z/, "top-left finder corner at (4,4) modules");
});
